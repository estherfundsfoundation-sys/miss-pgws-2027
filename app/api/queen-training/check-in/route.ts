import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Row = Record<string, unknown>;

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Queen Training check-in is temporarily unavailable.");
  return { url, key };
}

async function serviceFetch(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.hint || body?.error || "Check-in could not be completed.");
  return body;
}

function safeSearch(value: string) {
  return value.trim().replace(/[%*(),]/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const query = safeSearch(request.nextUrl.searchParams.get("q") || "");
    if (query.length < 2) return NextResponse.json({ contestants: [] });
    const contestants = (await serviceFetch(
      `pgws_contestants?public_name=ilike.*${encodeURIComponent(query)}*&select=id,application_id,public_name,college&order=public_name.asc&limit=20`,
    )) as Row[];
    if (!contestants.length) return NextResponse.json({ contestants: [] });
    const appIds = contestants.map((row) => String(row.application_id));
    const accepted = (await serviceFetch(
      `pgws_applications?id=in.(${appIds.map(encodeURIComponent).join(",")})&status=eq.accepted&select=id`,
    )) as Row[];
    const acceptedIds = new Set(accepted.map((row) => String(row.id)));
    return NextResponse.json({
      contestants: contestants
        .filter((row) => acceptedIds.has(String(row.application_id)))
        .map((row) => ({ id: row.id, name: row.public_name || "Accepted contestant", college: row.college || "College or university not listed" })),
    });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Search is unavailable." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const contestantId = String(body.contestantId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(contestantId) || !email.includes("@")) {
      return NextResponse.json({ error: "Choose your name and enter the email used on your application." }, { status: 400 });
    }
    const contestants = (await serviceFetch(
      `pgws_contestants?id=eq.${encodeURIComponent(contestantId)}&select=id,user_id,public_name&limit=1`,
    )) as Row[];
    const contestant = contestants[0];
    if (!contestant) return NextResponse.json({ error: "Contestant record not found." }, { status: 404 });
    const profiles = (await serviceFetch(
      `pgws_profiles?user_id=eq.${encodeURIComponent(String(contestant.user_id))}&select=email&limit=1`,
    )) as Row[];
    const savedEmail = String(profiles[0]?.email || "").trim().toLowerCase();
    if (!savedEmail || savedEmail !== email) {
      return NextResponse.json({ error: "That email does not match the selected application. Please try again." }, { status: 400 });
    }
    const result = await serviceFetch("rpc/pgws_record_queen_training_checkin", {
      method: "POST",
      body: JSON.stringify({ p_contestant_id: contestantId, p_event_key: "queen-training-2026" }),
    });
    return NextResponse.json({ success: true, ...(result || {}) });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Check-in could not be completed." }, { status: 500 });
  }
}
