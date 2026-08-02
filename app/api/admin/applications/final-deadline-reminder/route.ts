import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NATIONALS = "nationals@estherfundsinc.org";
const ACTION_SENT = "final_deadline_reminder_2026_08_02_sent";
const ACTION_FAILED = "final_deadline_reminder_2026_08_02_failed";
const PORTAL_URL = "https://misspgws.estherfundsfoundation.org/portal";
const STAFF_ROLES = ["competition_admin", "super_admin"];

type AppRow = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string | null;
};
type ProfileRow = {
  user_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  email: string | null;
};
type AuditRow = { entity_id: string; new_value: { recipient?: string } | null };
type Recipient = {
  applicationId: string;
  email: string;
  firstName: string;
  submitted: boolean;
};

function configured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!url || !publicKey || !secret || !resend) {
    throw new Error("Production applicant communications are not configured.");
  }
  return { url, publicKey, secret, resend };
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...headers, ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.message ?? body?.error_description ?? body?.error ?? "The request failed.",
    );
  }
  return body as T;
}

function serviceHeaders() {
  const { secret } = configured();
  return { apikey: secret, Authorization: `Bearer ${secret}` };
}

function userHeaders(token: string) {
  const { publicKey } = configured();
  return { apikey: publicKey, Authorization: `Bearer ${token}` };
}

function validEmail(value: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  return !/(^|[.@+_-])(test|example|fake|noreply|no-reply|donotreply|do-not-reply)([.@+_-]|$)/i.test(
    value,
  );
}

function isSubmitted(application: AppRow) {
  return (
    Boolean(application.submitted_at) ||
    [
      "submitted",
      "under_review",
      "correction_requested",
      "waitlisted",
      "accepted",
      "declined",
    ].includes(application.status)
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailCopy(recipient: Recipient) {
  const subject = recipient.submitted
    ? "Miss PGWS application received — final review begins soon"
    : "Final reminder: Miss PGWS application closes tonight at 11:59 PM ET";
  const opening = recipient.submitted
    ? "We received your submitted Miss Pretty Girls Who Serve 2027 application. No additional submission is needed unless the Miss PGWS team contacts you about a correction."
    : "Thank you for beginning your Miss Pretty Girls Who Serve 2027 application. Our records show that your application has not yet been submitted.";
  const next = recipient.submitted
    ? "The final application deadline is tonight, August 2, 2026, at 11:59 PM Eastern Time. After the deadline, the team will move into final review and decisions will be communicated soon. Please continue monitoring your inbox and spam folder for official updates."
    : "Today, August 2, 2026, is the final application deadline. Please sign in, complete every required section, upload any required materials, sign the agreement, and submit by 11:59 PM Eastern Time tonight. Saving a draft does not submit the application; confirm that your portal shows a submitted status.";
  const html = `<div style="margin:0;background:#f8f2ee;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:#2b1d24">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadde2;border-radius:18px;overflow:hidden">
    <div style="background:#7d1738;color:#ffffff;padding:22px 30px"><p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Esther Funds Foundation · Miss PGWS</p></div>
    <div style="padding:34px 30px">
      <p style="margin:0 0 16px">Hello ${escapeHtml(recipient.firstName)},</p>
      <h1 style="margin:0 0 18px;color:#7d1738;font-family:Georgia,serif;font-size:30px;line-height:1.15">${escapeHtml(subject)}</h1>
      <p style="font-size:16px;line-height:1.7">${escapeHtml(opening)}</p>
      <div style="margin:24px 0;padding:20px;background:#fff7f2;border-left:4px solid #b82f52"><p style="margin:0;font-size:16px;line-height:1.7">${escapeHtml(next)}</p></div>
      <p style="font-size:15px;line-height:1.7">Submitting an application does not guarantee selection, a title, a scholarship, or an award.</p>
      <p style="margin:26px 0"><a href="${PORTAL_URL}" style="display:inline-block;background:#b82f52;color:#ffffff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:800">Open my applicant portal</a></p>
      <p style="font-size:13px;line-height:1.6;color:#6c5b62">If you experience a technical problem, reply with the exact error message and a redacted screenshot. Never email passwords, verification codes, Social Security numbers, or full financial-account information.</p>
      <p style="margin:28px 0 0;line-height:1.6">With encouragement,<br /><strong>Esther Funds Foundation</strong><br />Miss PGWS Team · Every Future Fulfilled</p>
    </div>
  </div>
</div>`;
  const text = `Hello ${recipient.firstName},

${opening}

${next}

Submitting an application does not guarantee selection, a title, a scholarship, or an award.

Applicant portal: ${PORTAL_URL}

If you experience a technical problem, reply with the exact error message and a redacted screenshot. Never email passwords, verification codes, Social Security numbers, or full financial-account information.

With encouragement,
Esther Funds Foundation
Miss PGWS Team · Every Future Fulfilled`;
  return { subject, html, text };
}

async function authorize(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Staff sign-in required.");
  const { url } = configured();
  const user = await fetchJson<{ id: string }>(
    `${url}/auth/v1/user`,
    userHeaders(token),
  );
  const roles = await fetchJson<Array<{ role: string }>>(
    `${url}/rest/v1/pgws_user_roles?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=role`,
    userHeaders(token),
  );
  if (!roles.some((row) => STAFF_ROLES.includes(row.role))) {
    throw new Error("Competition administrator access required.");
  }
  return user;
}

async function roster() {
  const { url } = configured();
  const headers = serviceHeaders();
  const [apps, profiles, sentAudits] = await Promise.all([
    fetchJson<AppRow[]>(
      `${url}/rest/v1/pgws_applications?select=id,user_id,status,submitted_at&order=updated_at.desc&limit=5000`,
      headers,
    ),
    fetchJson<ProfileRow[]>(
      `${url}/rest/v1/pgws_profiles?select=user_id,legal_name,preferred_name,email&order=created_at.desc&limit=5000`,
      headers,
    ),
    fetchJson<AuditRow[]>(
      `${url}/rest/v1/pgws_audit_log?action=eq.${ACTION_SENT}&select=entity_id,new_value&limit=5000`,
      headers,
    ),
  ]);
  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const sentEmails = new Set(
    sentAudits
      .map((audit) => audit.new_value?.recipient?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  let invalid = 0;
  let duplicates = 0;
  for (const application of apps) {
    const profile = profileByUser.get(application.user_id);
    const email = profile?.email?.trim().toLowerCase() ?? "";
    if (!validEmail(email)) {
      invalid += 1;
      continue;
    }
    if (seen.has(email)) {
      duplicates += 1;
      continue;
    }
    seen.add(email);
    const name = profile?.preferred_name?.trim() || profile?.legal_name?.trim() || "Applicant";
    recipients.push({
      applicationId: application.id,
      email,
      firstName: name.split(/\s+/)[0],
      submitted: isSubmitted(application),
    });
  }
  return { apps, profiles, recipients, sentEmails, invalid, duplicates };
}

async function audit(
  actorId: string,
  recipient: Recipient,
  action: string,
  detail: Record<string, unknown>,
) {
  const { url } = configured();
  await fetchJson(
    `${url}/rest/v1/pgws_audit_log`,
    { ...serviceHeaders(), Prefer: "return=minimal" },
    {
      method: "POST",
      body: JSON.stringify({
        actor_id: actorId,
        action,
        entity_type: "application",
        entity_id: recipient.applicationId,
        new_value: { recipient: recipient.email, ...detail },
        reason: "Authorized Miss PGWS final-deadline applicant communication.",
      }),
    },
  );
}

async function sendOne(actorId: string, recipient: Recipient) {
  const { resend } = configured();
  const copy = emailCopy(recipient);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:
        process.env.EMAIL_FROM ??
        "Esther Funds Foundation <notifications@estherfundsinc.org>",
      to: [recipient.email],
      cc: [NATIONALS],
      reply_to: NATIONALS,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body?.message ?? `Email provider returned HTTP ${response.status}.`;
    await audit(actorId, recipient, ACTION_FAILED, { error }).catch(() => undefined);
    return { ok: false, email: recipient.email, error };
  }
  await audit(actorId, recipient, ACTION_SENT, {
    provider_id: body?.id ?? null,
    submitted: recipient.submitted,
  });
  return { ok: true, email: recipient.email };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await authorize(request);
    const input = await request.json().catch(() => ({}));
    const dryRun = input.dryRun !== false;
    const limit = Math.max(1, Math.min(25, Number(input.limit) || 20));
    const data = await roster();
    const pending = data.recipients.filter(
      (recipient) => !data.sentEmails.has(recipient.email),
    );
    const summary = {
      sourceApplications: data.apps.length,
      sourceProfiles: data.profiles.length,
      eligible: data.recipients.length,
      submitted: data.recipients.filter((recipient) => recipient.submitted).length,
      unfinished: data.recipients.filter((recipient) => !recipient.submitted).length,
      invalid: data.invalid,
      duplicates: data.duplicates,
      alreadySent: data.recipients.length - pending.length,
      pending: pending.length,
    };
    if (dryRun) return NextResponse.json(summary);

    const batch = pending.slice(0, limit);
    const results: Array<{ ok: boolean; email: string; error?: string }> = [];
    for (let index = 0; index < batch.length; index += 2) {
      results.push(...(await Promise.all(batch.slice(index, index + 2).map((recipient) => sendOne(actor.id, recipient)))));
      if (index + 2 < batch.length) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }
    const sent = results.filter((result) => result.ok).length;
    const failures = results.filter((result) => !result.ok);
    return NextResponse.json({
      ...summary,
      attempted: batch.length,
      sent,
      failed: failures.length,
      failureMessages: [...new Set(failures.map((failure) => failure.error))],
      remaining: Math.max(0, pending.length - sent),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The reminder batch failed.";
    const status = /sign-in|required|administrator/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
