import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NATIONAL_ADMIN_EMAIL = "nationals@estherfundsinc.org";
const REQUEST_WINDOW_MS = 60_000;
const STAFF_ROLES = ["reviewer", "competition_admin", "finance_admin", "super_admin"];

type ProfileRow = { user_id: string; email: string };
type RoleRow = { role: string; active: boolean };
type LoginRequestRow = { last_requested_at: string; request_count: number };
type GenerateLinkResponse = {
  email_otp?: string;
  properties?: { email_otp?: string };
  action_properties?: { email_otp?: string };
};

function configured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!supabaseUrl || !supabaseSecret || !resendKey) {
    throw new Error("National passwordless login is not configured.");
  }
  return { supabaseUrl, supabaseSecret, resendKey };
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { supabaseUrl, supabaseSecret } = configured();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: supabaseSecret,
      Authorization: `Bearer ${supabaseSecret}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      body?.message ?? body?.error_description ?? body?.error ?? "The secure request failed.";
    throw new Error(detail);
  }
  return body as T;
}

async function ensureAuthorizedNationalAccount(email: string) {
  const profiles = await supabaseFetch<ProfileRow[]>(
    `/rest/v1/pgws_profiles?email=eq.${encodeURIComponent(email)}&select=user_id,email&limit=1`,
  );
  const profile = profiles[0];
  if (!profile) throw new Error("The approved national staff account is not ready.");

  const roles = await supabaseFetch<RoleRow[]>(
    `/rest/v1/pgws_user_roles?user_id=eq.${encodeURIComponent(profile.user_id)}&active=eq.true&select=role,active`,
  );
  if (!roles.some((row) => STAFF_ROLES.includes(row.role))) {
    throw new Error("The approved national account does not have an active staff role.");
  }
}

async function enforceRequestWindow(email: string) {
  const threshold = new Date(Date.now() - REQUEST_WINDOW_MS).toISOString();
  const records = await supabaseFetch<LoginRequestRow[]>(
    `/rest/v1/pgws_admin_login_requests?email=eq.${encodeURIComponent(email)}&select=last_requested_at,request_count&limit=1`,
  );
  const current = records[0];
  if (current && current.last_requested_at > threshold) {
    const waitSeconds = Math.max(
      1,
      Math.ceil(
        (new Date(current.last_requested_at).getTime() + REQUEST_WINDOW_MS - Date.now()) / 1000,
      ),
    );
    return { allowed: false, waitSeconds } as const;
  }

  const now = new Date().toISOString();
  await supabaseFetch<unknown>("/rest/v1/pgws_admin_login_requests?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      email,
      last_requested_at: now,
      request_count: (current?.request_count ?? 0) + 1,
      updated_at: now,
    }),
  });
  return { allowed: true, waitSeconds: 0 } as const;
}

function codeEmail(code: string) {
  const html = `<div style="margin:0;background:#f8f2ee;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:#2b1d24">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #eadde2;border-radius:18px;overflow:hidden">
    <div style="background:#7d1738;color:#ffffff;padding:22px 30px">
      <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Esther Funds Foundation &middot; Miss PGWS</p>
    </div>
    <div style="padding:34px 30px">
      <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7d1738">National staff access</p>
      <h1 style="margin:0 0 18px;color:#2b1d24;font-family:Georgia,serif;font-size:30px;line-height:1.15">Your secure login code</h1>
      <p style="font-size:16px;line-height:1.7">Enter this one-time code on the Miss PGWS staff sign-in page:</p>
      <div style="margin:26px 0;padding:22px;border:1px solid #eadde2;border-radius:12px;background:#fff7f2;text-align:center">
        <strong style="color:#7d1738;font-size:38px;letter-spacing:.22em">${code}</strong>
      </div>
      <p style="font-size:14px;line-height:1.65;color:#6c5b62">This code expires soon and can be used only once. If you did not request it, no action is needed. Never forward or share a verification code.</p>
      <p style="margin:28px 0 0;line-height:1.6">Esther Funds Foundation<br /><strong>Miss PGWS National Team</strong></p>
    </div>
  </div>
</div>`;
  const text = `Your Miss PGWS national staff login code is ${code}.\n\nThis code expires soon and can be used only once. Never forward or share a verification code.`;
  return { html, text };
}

async function sendCode(email: string, code: string) {
  const { resendKey } = configured();
  const { html, text } = codeEmail(code);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.EMAIL_FROM ??
        "Esther Funds Foundation <notifications@estherfundsinc.org>",
      to: [email],
      reply_to: NATIONAL_ADMIN_EMAIL,
      subject: `${code} is your Miss PGWS national login code`,
      html,
      text,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message ?? "The email provider rejected the login code.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await request.json().catch(() => ({}));
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (email !== NATIONAL_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Use the approved national account." }, { status: 400 });
    }

    await ensureAuthorizedNationalAccount(email);
    const window = await enforceRequestWindow(email);
    if (!window.allowed) {
      return NextResponse.json(
        { error: `Please wait ${window.waitSeconds} seconds before requesting another code.` },
        { status: 429, headers: { "Retry-After": String(window.waitSeconds) } },
      );
    }

    const generated = await supabaseFetch<GenerateLinkResponse>("/auth/v1/admin/generate_link", {
      method: "POST",
      body: JSON.stringify({ type: "magiclink", email }),
    });
    const code =
      generated.email_otp ??
      generated.properties?.email_otp ??
      generated.action_properties?.email_otp;
    if (!code || !/^\d{6}$/.test(code)) {
      throw new Error("The authentication provider did not create a valid login code.");
    }

    await sendCode(email, code);
    return NextResponse.json({
      message: "A secure login code was sent. Check the national inbox and spam folder.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The login code could not be sent.";
    console.error("Miss PGWS national login code request failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
