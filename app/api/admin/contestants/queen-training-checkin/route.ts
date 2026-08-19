import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NATIONALS = "nationals@estherfundsinc.org";
const CAMPAIGN = "queen_training_checkin_2026_08_19";
const ACTION_SENT = `${CAMPAIGN}_sent`;
const ACTION_FAILED = `${CAMPAIGN}_failed`;
const CHECK_IN_URL = "https://misspgws.estherfundsfoundation.org/sister-check-in";
const STAFF_ROLES = ["competition_admin", "super_admin"];

type ContestantRow = { id: string; user_id: string; public_name: string | null };
type ProfileRow = { user_id: string; legal_name: string | null; preferred_name: string | null; email: string | null };
type AuditRow = { new_value: { recipient?: string } | null };
type Recipient = { contestantId: string; email: string; firstName: string };

function configured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!url || !publicKey || !secret || !resend) throw new Error("Production contestant communications are not configured.");
  return { url, publicKey, secret, resend };
}

async function fetchJson<T>(url: string, headers: Record<string, string>, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...headers, ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message ?? body?.error_description ?? body?.error ?? "The request failed.");
  return body as T;
}

function serviceHeaders() { const { secret } = configured(); return { apikey: secret, Authorization: `Bearer ${secret}` }; }
function userHeaders(token: string) { const { publicKey } = configured(); return { apikey: publicKey, Authorization: `Bearer ${token}` }; }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/(^|[.@+_-])(test|example|fake|noreply|no-reply)([.@+_-]|$)/i.test(value); }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function firstName(value: string) { return value.trim().split(/\s+/)[0]?.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ' -]/g, "").slice(0, 32) || "Pretty Sister"; }

async function authorize(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Staff sign-in required.");
  const { url } = configured();
  const user = await fetchJson<{ id: string }>(`${url}/auth/v1/user`, userHeaders(token));
  const roles = await fetchJson<Array<{ role: string }>>(`${url}/rest/v1/pgws_user_roles?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=role`, userHeaders(token));
  if (!roles.some((row) => STAFF_ROLES.includes(row.role))) throw new Error("Competition administrator access required.");
  return user;
}

async function roster() {
  const { url } = configured();
  const headers = serviceHeaders();
  const [contestants, profiles, audits] = await Promise.all([
    fetchJson<ContestantRow[]>(`${url}/rest/v1/pgws_contestants?select=id,user_id,public_name&order=created_at.asc&limit=5000`, headers),
    fetchJson<ProfileRow[]>(`${url}/rest/v1/pgws_profiles?select=user_id,legal_name,preferred_name,email&limit=5000`, headers),
    fetchJson<AuditRow[]>(`${url}/rest/v1/pgws_audit_log?action=eq.${ACTION_SENT}&select=new_value&limit=5000`, headers),
  ]);
  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const sentEmails = new Set(audits.map((audit) => audit.new_value?.recipient?.trim().toLowerCase()).filter((email): email is string => Boolean(email)));
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  let invalid = 0, duplicates = 0;
  for (const contestant of contestants) {
    const profile = profileByUser.get(contestant.user_id);
    const email = profile?.email?.trim().toLowerCase() ?? "";
    if (!validEmail(email)) { invalid += 1; continue; }
    if (seen.has(email)) { duplicates += 1; continue; }
    seen.add(email);
    const name = profile?.preferred_name?.trim() || profile?.legal_name?.trim() || contestant.public_name?.trim() || "Pretty Sister";
    recipients.push({ contestantId: contestant.id, email, firstName: firstName(name) });
  }
  return { sourceContestants: contestants.length, recipients, sentEmails, invalid, duplicates };
}

function checkInLink(name: string) { return `${CHECK_IN_URL}?name=${encodeURIComponent(name)}`; }

function emailFor(recipient: Recipient) {
  const name = escapeHtml(recipient.firstName);
  const link = checkInLink(recipient.firstName);
  const subject = `Hey, Pretty Sister ${recipient.firstName} — you’ve got this!`;
  const html = `<div style="margin:0;background:#f8e1e9;padding:30px 14px;font-family:Arial,Helvetica,sans-serif;color:#2b1d24">
  <div style="max-width:650px;margin:0 auto;overflow:hidden;border:1px solid #ead0da;border-radius:24px;background:#fffdfc;box-shadow:0 22px 60px rgba(91,35,55,.16)">
    <div style="padding:24px 30px;background:linear-gradient(135deg,#7d1738,#b82f52);color:#fff;text-align:center"><p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.18em">MISS PRETTY GIRLS WHO SERVE · THE NEW BEAUTY ISSUE</p></div>
    <div style="padding:40px 32px;text-align:center"><p style="margin:0 0 6px;color:#a94f6e;font-family:Georgia,serif;font-size:22px;font-style:italic">A little love note for</p><h1 style="margin:0;color:#7d1738;font-family:Georgia,serif;font-size:38px;line-height:1.08">Hey, Pretty Sister ${name}!</h1>
      <p style="margin:24px 0 0;font-size:16px;line-height:1.75;text-align:left">It has been a few days since Queen Training, and we wanted to check on you. If you need clarity, encouragement, help with your contestant profile, headshot, platform, campaign video—or simply someone to talk to—please reply to this email. We are here for you.</p>
      <div style="margin:28px 0;padding:24px;border:1px solid #ead0da;border-radius:16px;background:#fff5f8"><p style="margin:0;font-family:Georgia,serif;font-size:21px;line-height:1.55">“Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.”</p><p style="margin:12px 0 0;color:#a94f6e;font-size:11px;font-weight:800;letter-spacing:.12em">PHILIPPIANS 1:6 · KJV</p></div>
      <p style="margin:0 0 26px;font-weight:800;color:#7d1738">You are called. You are capable. You’ve got this.</p>
      <a href="${link}" style="display:inline-block;padding:15px 23px;border-radius:999px;background:#b82f52;color:#fff;text-decoration:none;font-size:13px;font-weight:800">Open your personalized sister check-in</a>
      <p style="margin:28px 0 0;font-size:15px;line-height:1.7">With love,<br><strong>Your PGWS Sisters</strong><br>Esther Funds Foundation</p>
    </div>
  </div></div>`;
  const text = `Hey, Pretty Sister ${recipient.firstName}!\n\nIt has been a few days since Queen Training, and we wanted to check on you. If you need clarity, encouragement, help with your contestant profile, headshot, platform, campaign video—or simply someone to talk to—please reply to this email. We are here for you.\n\n“Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.” — Philippians 1:6 (KJV)\n\nYou are called. You are capable. You’ve got this.\n\nOpen your personalized sister check-in: ${link}\n\nWith love,\nYour PGWS Sisters\nEsther Funds Foundation`;
  return { subject, html, text, link };
}

async function sendTest(email: string) {
  const { resend } = configured();
  const recipient = { contestantId: "test", email, firstName: "Shayna" };
  const copy = emailFor(recipient);
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json", "Idempotency-Key": `${CAMPAIGN}_test_${createHash("sha256").update(email).digest("hex").slice(0,16)}` }, body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Esther Funds Foundation <notifications@estherfundsinc.org>", to: [email], reply_to: NATIONALS, subject: copy.subject, html: copy.html, text: copy.text }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message ?? `Email provider returned HTTP ${response.status}.`);
  return { sent: 1, recipient: email, link: copy.link };
}

async function auditBatch(actorId: string, recipients: Recipient[], action: string, providerIds: Array<string | null>, reason: string) {
  if (!recipients.length) return;
  const { url } = configured();
  const rows = recipients.map((recipient, index) => ({ actor_id: actorId, action, entity_type: "contestant", entity_id: recipient.contestantId, new_value: { recipient: recipient.email, personalized_link: checkInLink(recipient.firstName), provider_id: providerIds[index] ?? null }, reason }));
  await fetchJson(`${url}/rest/v1/pgws_audit_log`, { ...serviceHeaders(), Prefer: "return=minimal" }, { method: "POST", body: JSON.stringify(rows) });
}

async function sendAll(actorId: string, recipients: Recipient[]) {
  const { resend } = configured();
  const from = process.env.EMAIL_FROM ?? "Esther Funds Foundation <notifications@estherfundsinc.org>";
  let sent = 0;
  const failures: string[] = [];
  for (let offset = 0; offset < recipients.length; offset += 100) {
    const batch = recipients.slice(offset, offset + 100);
    const messages = batch.map((recipient) => { const copy = emailFor(recipient); return { from, to: [recipient.email], reply_to: NATIONALS, subject: copy.subject, html: copy.html, text: copy.text }; });
    const hash = createHash("sha256").update(batch.map((recipient) => recipient.email).join("|")).digest("hex").slice(0, 18);
    const response = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json", "Idempotency-Key": `${CAMPAIGN}_${hash}` }, body: JSON.stringify(messages) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.message ?? `Email provider returned HTTP ${response.status}.`;
      failures.push(message);
      await auditBatch(actorId, batch, ACTION_FAILED, batch.map(() => null), `Authorized Queen Training follow-up failed: ${message}`).catch(() => undefined);
      continue;
    }
    const ids: Array<string | null> = Array.isArray(body?.data) ? body.data.map((item: { id?: string }) => item.id ?? null) : batch.map(() => null);
    await auditBatch(actorId, batch, ACTION_SENT, ids, "Authorized personalized Queen Training contestant check-in.");
    sent += batch.length;
  }
  return { sent, failed: recipients.length - sent, failureMessages: [...new Set(failures)] };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await authorize(request);
    const input = await request.json().catch(() => ({}));
    if (input.mode === "test") {
      const email = String(input.testEmail ?? "").trim().toLowerCase();
      if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid test email." }, { status: 400 });
      return NextResponse.json(await sendTest(email));
    }
    const data = await roster();
    const pending = data.recipients.filter((recipient) => !data.sentEmails.has(recipient.email));
    const summary = { sourceContestants: data.sourceContestants, eligible: data.recipients.length, invalid: data.invalid, duplicates: data.duplicates, alreadySent: data.recipients.length - pending.length, pending: pending.length };
    if (input.mode !== "send") return NextResponse.json(summary);
    if (input.confirm !== "SEND QUEEN TRAINING CHECKIN") return NextResponse.json({ error: "Bulk-send confirmation is missing." }, { status: 400 });
    const result = await sendAll(actor.id, pending);
    return NextResponse.json({ ...summary, ...result, remaining: Math.max(0, pending.length - result.sent) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The contestant check-in campaign failed.";
    const status = /sign-in|required|administrator/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
