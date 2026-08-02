import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NATIONALS = "nationals@estherfundsinc.org";
const GROUP_CHAT_URL = "https://groupme.com/join_group/115921498/tk7wjcpw";
const ACTION_SENT = "community_groupchat_invitation_2026_sent";
const ACTION_FAILED = "community_groupchat_invitation_2026_failed";
const STAFF_ROLES = ["competition_admin", "super_admin"];

type AppRow = { id: string; user_id: string };
type ProfileRow = {
  user_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  email: string | null;
};
type AuditRow = { new_value: { recipient?: string } | null };
type Recipient = {
  applicationId: string;
  email: string;
  firstName: string;
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
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(init.headers ?? {}),
    },
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
      `${url}/rest/v1/pgws_applications?select=id,user_id&order=updated_at.desc&limit=5000`,
      headers,
    ),
    fetchJson<ProfileRow[]>(
      `${url}/rest/v1/pgws_profiles?select=user_id,legal_name,preferred_name,email&order=created_at.desc&limit=5000`,
      headers,
    ),
    fetchJson<AuditRow[]>(
      `${url}/rest/v1/pgws_audit_log?action=eq.${ACTION_SENT}&select=new_value&limit=5000`,
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
    const name =
      profile?.preferred_name?.trim() || profile?.legal_name?.trim() || "Applicant";
    recipients.push({
      applicationId: application.id,
      email,
      firstName: name.split(/\s+/)[0],
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
        reason: "Authorized Miss PGWS community group-chat invitation.",
      }),
    },
  );
}

async function sendOne(actorId: string, recipient: Recipient) {
  const { resend } = configured();
  const subject = "Join the official Miss PGWS 2027 community group chat";
  const html = `<div style="margin:0;background:#f8f2ee;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:#2b1d24">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadde2;border-radius:18px;overflow:hidden">
    <div style="background:#7d1738;color:#ffffff;padding:22px 30px"><p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Esther Funds Foundation · Miss PGWS</p></div>
    <div style="padding:34px 30px">
      <p style="margin:0 0 16px">Hello ${escapeHtml(recipient.firstName)},</p>
      <h1 style="margin:0 0 18px;color:#7d1738;font-family:Georgia,serif;font-size:30px;line-height:1.15">Join the Miss PGWS community.</h1>
      <p style="font-size:16px;line-height:1.7">You are invited to join the official Miss Pretty Girls Who Serve 2027 community group chat. This is where applicants can receive community updates, connect, and stay close to official announcements.</p>
      <p style="margin:26px 0"><a href="${GROUP_CHAT_URL}" style="display:inline-block;background:#b82f52;color:#ffffff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:800">Join the official GroupMe</a></p>
      <p style="font-size:15px;line-height:1.7"><strong>Direct link:</strong><br /><a href="${GROUP_CHAT_URL}" style="color:#7d1738">${GROUP_CHAT_URL}</a></p>
      <div style="margin:24px 0;padding:20px;background:#fff7f2;border-left:4px solid #b82f52"><p style="margin:0;font-size:14px;line-height:1.7">Joining the chat does not mean that an application has been submitted or accepted, and it does not guarantee selection, a title, scholarship, or award. Continue using the official applicant portal and email for required application actions.</p></div>
      <p style="font-size:13px;line-height:1.6;color:#6c5b62">Please keep the community respectful and never post passwords, verification codes, Social Security numbers, or private financial-account information.</p>
      <p style="margin:28px 0 0;line-height:1.6">With excitement,<br /><strong>Esther Funds Foundation</strong><br />Miss PGWS Team · Every Future Fulfilled</p>
    </div>
  </div>
</div>`;
  const text = `Hello ${recipient.firstName},

You are invited to join the official Miss Pretty Girls Who Serve 2027 community group chat. This is where applicants can receive community updates, connect, and stay close to official announcements.

Join here: ${GROUP_CHAT_URL}

Joining the chat does not mean that an application has been submitted or accepted, and it does not guarantee selection, a title, scholarship, or award. Continue using the official applicant portal and email for required application actions.

Please keep the community respectful and never post passwords, verification codes, Social Security numbers, or private financial-account information.

With excitement,
Esther Funds Foundation
Miss PGWS Team · Every Future Fulfilled`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.EMAIL_FROM ??
        "Esther Funds Foundation <notifications@estherfundsinc.org>",
      to: [recipient.email],
      cc: [NATIONALS],
      reply_to: NATIONALS,
      subject,
      html,
      text,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body?.message ?? `Email provider returned HTTP ${response.status}.`;
    await audit(actorId, recipient, ACTION_FAILED, { error }).catch(() => undefined);
    return { ok: false, error };
  }
  await audit(actorId, recipient, ACTION_SENT, { provider_id: body?.id ?? null });
  return { ok: true };
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
      invalid: data.invalid,
      duplicates: data.duplicates,
      alreadySent: data.recipients.length - pending.length,
      pending: pending.length,
    };
    if (dryRun) return NextResponse.json(summary);

    const batch = pending.slice(0, limit);
    const results: Array<{ ok: boolean; error?: string }> = [];
    for (let index = 0; index < batch.length; index += 2) {
      results.push(
        ...(await Promise.all(
          batch.slice(index, index + 2).map((recipient) => sendOne(actor.id, recipient)),
        )),
      );
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
    const message = error instanceof Error ? error.message : "The invitation batch failed.";
    const status = /sign-in|required|administrator/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
