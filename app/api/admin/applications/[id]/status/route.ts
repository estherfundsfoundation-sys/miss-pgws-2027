import { NextRequest, NextResponse } from "next/server";
import {
  applicantStatusCopy,
  applicantStatusLabels,
  displayApplicantName,
  isApplicantStatus,
} from "@/lib/pgws-status-email";

type ApplicationRow = {
  id: string;
  user_id: string;
  status: string;
};

type ProfileRow = {
  legal_name: string | null;
  preferred_name: string | null;
  email: string | null;
  notification_preferences: { email?: boolean } | null;
};

function configured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("The secure applicant database is not configured.");
  return { supabaseUrl, supabaseKey };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function supabaseFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const { supabaseUrl, supabaseKey } = configured();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message ?? body?.error_description ?? body?.error ?? "The request could not be completed.";
    throw new Error(message);
  }
  return body as T;
}

async function recordDeliveryAudit(input: {
  actorId: string;
  applicationId: string;
  status: string;
  recipient: string;
  deliveryStatus: "sent" | "failed";
  providerId?: string | null;
  reason: string;
}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!serviceKey || !supabaseUrl) return;
  await fetch(`${supabaseUrl}/rest/v1/pgws_audit_log`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      actor_id: input.actorId,
      action: `application_status_email_${input.deliveryStatus}`,
      entity_type: "application",
      entity_id: input.applicationId,
      new_value: {
        status: input.status,
        recipient: input.recipient,
        delivery_status: input.deliveryStatus,
        provider_id: input.providerId ?? null,
      },
      reason: input.reason,
    }),
  }).catch(() => undefined);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!accessToken) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });

  try {
    const { id } = await params;
    const input = await request.json();
    const status = input.status;
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    const customMessage = typeof input.customMessage === "string" ? input.customMessage.trim() : "";
    const notifyOnly = input.notifyOnly === true;

    if (!isApplicantStatus(status)) {
      return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
    }
    if (!notifyOnly && reason.length < 5) {
      return NextResponse.json({ error: "Add a short internal reason for the status change." }, { status: 400 });
    }
    if (customMessage.length > 2000) {
      return NextResponse.json({ error: "Keep the applicant note under 2,000 characters." }, { status: 400 });
    }

    const user = await supabaseFetch<{ id: string }>("/auth/v1/user", accessToken);
    const roles = await supabaseFetch<Array<{ role: string }>>(
      `/rest/v1/pgws_user_roles?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=role`,
      accessToken,
    );
    if (!roles.some((row) => ["competition_admin", "super_admin"].includes(row.role))) {
      return NextResponse.json({ error: "Competition administrator access required." }, { status: 403 });
    }

    const applications = await supabaseFetch<ApplicationRow[]>(
      `/rest/v1/pgws_applications?id=eq.${encodeURIComponent(id)}&select=id,user_id,status&limit=1`,
      accessToken,
    );
    const application = applications[0];
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const profiles = await supabaseFetch<ProfileRow[]>(
      `/rest/v1/pgws_profiles?user_id=eq.${encodeURIComponent(application.user_id)}&select=legal_name,preferred_name,email,notification_preferences&limit=1`,
      accessToken,
    );
    const profile = profiles[0];
    if (!profile?.email) {
      return NextResponse.json({ error: "This applicant record does not have an email address." }, { status: 400 });
    }

    if (!notifyOnly) {
      if (status === "correction_requested") {
        if (customMessage.length < 10) {
          return NextResponse.json(
            { error: "Explain the requested correction to the applicant in at least 10 characters." },
            { status: 400 },
          );
        }
        await supabaseFetch(
          "/rest/v1/rpc/pgws_staff_request_correction",
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              p_application_id: id,
              p_message: customMessage,
              p_fields: [],
            }),
          },
        );
      } else {
        await supabaseFetch(
          "/rest/v1/rpc/pgws_staff_update_application_status",
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              p_application_id: id,
              p_status: status,
              p_reason: reason,
            }),
          },
        );
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      await recordDeliveryAudit({
        actorId: user.id,
        applicationId: id,
        status,
        recipient: profile.email,
        deliveryStatus: "failed",
        reason: "Status saved, but applicant email delivery is not configured.",
      });
      return NextResponse.json(
        {
          error: "The status was saved, but the applicant email could not be sent because delivery is not configured.",
          statusUpdated: !notifyOnly,
          emailSent: false,
        },
        { status: 502 },
      );
    }

    const copy = applicantStatusCopy[status];
    const firstName = displayApplicantName(profile.preferred_name, profile.legal_name);
    const safeName = escapeHtml(firstName);
    const safeCustomMessage = customMessage ? escapeHtml(customMessage).replaceAll("\n", "<br />") : "";
    const portalUrl = "https://misspgws.estherfundsfoundation.org/portal";
    const emailFrom =
      process.env.EMAIL_FROM ??
      "Esther Funds Foundation <notifications@estherfundsinc.org>";
    const nationals = "nationals@estherfundsinc.org";

    const html = `<div style="margin:0;background:#f8f2ee;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:#2b1d24">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadde2;border-radius:18px;overflow:hidden">
    <div style="background:#7d1738;color:#ffffff;padding:22px 30px">
      <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Esther Funds Foundation · Miss PGWS</p>
    </div>
    <div style="padding:34px 30px">
      <p style="margin:0 0 16px">Hello ${safeName},</p>
      <h1 style="margin:0 0 18px;color:#7d1738;font-family:Georgia,serif;font-size:30px;line-height:1.15">${escapeHtml(copy.headline)}</h1>
      <p style="font-size:16px;line-height:1.7">${escapeHtml(copy.introduction)}</p>
      <div style="margin:24px 0;padding:20px;background:#fff7f2;border-left:4px solid #b82f52">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7d1738">Things to know</p>
        <ul style="margin:0;padding-left:20px;line-height:1.7">${copy.details.map((item) => `<li style="margin:7px 0">${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      ${safeCustomMessage ? `<div style="margin:22px 0;padding:18px;border:1px solid #eadde2;border-radius:10px"><p style="margin:0 0 8px;font-weight:800;color:#7d1738">A note from the Miss PGWS team</p><p style="margin:0;line-height:1.7">${safeCustomMessage}</p></div>` : ""}
      <p style="font-size:16px;line-height:1.7">${escapeHtml(copy.encouragement)}</p>
      <p style="margin:26px 0"><a href="${portalUrl}" style="display:inline-block;background:#b82f52;color:#ffffff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:800">Open my applicant portal</a></p>
      <p style="font-size:13px;line-height:1.6;color:#6c5b62">Questions? Reply to this email or contact <a href="mailto:${nationals}" style="color:#7d1738">${nationals}</a>. Never email passwords, verification codes, Social Security numbers, or full financial-account details.</p>
      <p style="margin:28px 0 0;line-height:1.6">With encouragement,<br /><strong>Esther Funds Foundation</strong><br />Miss PGWS Team · Every Future Fulfilled</p>
    </div>
  </div>
</div>`;

    const text = `Hello ${firstName},

${copy.headline}

${copy.introduction}

Things to know:
${copy.details.map((item) => `- ${item}`).join("\n")}

${customMessage ? `A note from the Miss PGWS team:\n${customMessage}\n\n` : ""}${copy.encouragement}

Applicant portal: ${portalUrl}

Questions? Reply to this email or contact ${nationals}.
Never email passwords, verification codes, Social Security numbers, or full financial-account details.

With encouragement,
Esther Funds Foundation
Miss PGWS Team · Every Future Fulfilled`;

    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [profile.email],
        cc: [nationals],
        reply_to: nationals,
        subject: copy.subject,
        html,
        text,
      }),
    });
    const sentBody = await sent.json().catch(() => ({}));
    if (!sent.ok) {
      const deliveryError = sentBody?.message ?? "The email provider rejected the message.";
      await recordDeliveryAudit({
        actorId: user.id,
        applicationId: id,
        status,
        recipient: profile.email,
        deliveryStatus: "failed",
        reason: deliveryError,
      });
      return NextResponse.json(
        {
          error: `The status was saved, but the applicant email failed: ${deliveryError}`,
          statusUpdated: !notifyOnly,
          emailSent: false,
        },
        { status: 502 },
      );
    }

    await recordDeliveryAudit({
      actorId: user.id,
      applicationId: id,
      status,
      recipient: profile.email,
      deliveryStatus: "sent",
      providerId: sentBody?.id ?? null,
      reason: notifyOnly
        ? `Staff resent the ${applicantStatusLabels[status]} notification.`
        : `Staff updated the application to ${applicantStatusLabels[status]} and notified the applicant.`,
    });

    return NextResponse.json({
      statusUpdated: !notifyOnly,
      emailSent: true,
      recipient: profile.email,
      copied: nationals,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The status update could not be completed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

