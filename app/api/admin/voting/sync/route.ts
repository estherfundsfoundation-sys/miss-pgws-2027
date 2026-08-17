import { NextRequest, NextResponse } from "next/server";
import { syncVerifiedVotes } from "@/lib/voting-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type Row = Record<string, unknown>;

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server database configuration is unavailable.");
  return { url, key };
}

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Staff sign-in required.");
  const { url, key } = config();
  const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!auth.ok) throw new Error("Your staff session is invalid or expired.");
  const user = await auth.json();
  const rolesResponse = await fetch(`${url}/rest/v1/pgws_user_roles?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=role`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!rolesResponse.ok) throw new Error("Staff permissions could not be verified.");
  const roles = await rolesResponse.json() as Row[];
  if (!roles.some((row) => ["finance_admin", "super_admin"].includes(String(row.role)))) throw new Error("Voting and finance administrator access is required.");
}

export async function POST(request: NextRequest) {
  try {
    await authorize(request);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, ...(await syncVerifiedVotes({ dryRun: body?.mode !== "sync" })) });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Vote synchronization failed.";
    return NextResponse.json({ error: message }, { status: /sign-in|session|access|required/i.test(message) ? 403 : 500 });
  }
}
