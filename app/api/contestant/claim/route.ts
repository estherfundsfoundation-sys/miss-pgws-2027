import { NextResponse } from "next/server";

const base = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceHeaders = () => ({ apikey: serviceKey() || "", Authorization: `Bearer ${serviceKey() || ""}`, "Content-Type": "application/json" });

export async function POST(request: Request) {
  const url = base(), key = serviceKey(), token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key) return NextResponse.json({ error: "Contestant account repair is temporarily unavailable." }, { status: 503 });
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!userResponse.ok) return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
  const user = await userResponse.json() as { id: string };
  const applicationResponse = await fetch(`${url}/rest/v1/pgws_applications?user_id=eq.${encodeURIComponent(user.id)}&status=eq.accepted&select=id,user_id,answers&order=updated_at.desc&limit=1`, { headers: serviceHeaders(), cache: "no-store" });
  const application = (await applicationResponse.json() as Array<{ id: string; user_id: string; answers: Record<string, string | null> }>)[0];
  if (!application) return NextResponse.json({ error: "No accepted contestant application is linked to this signed-in email." }, { status: 404 });
  const existingResponse = await fetch(`${url}/rest/v1/pgws_contestants?application_id=eq.${application.id}&select=*&limit=1`, { headers: serviceHeaders(), cache: "no-store" });
  const existing = (await existingResponse.json() as Array<Record<string, unknown>>)[0];
  const answers = application.answers || {};
  const profile = { application_id: application.id, user_id: user.id, public_slug: existing?.public_slug || `contestant-${application.id.replaceAll("-", "").slice(0, 12)}`, public_name: existing?.public_name || answers.preferred_name || answers.full_legal_name || "Accepted contestant", college: existing?.college || answers.college_university || answers.college || null, biography: existing?.biography || answers.biography || answers.short_biography || null, scripture: existing?.scripture || answers.signature_scripture || answers.scripture || null, platform: existing?.platform || answers.platform || answers.advocacy_platform || null, campaign_video_url: existing?.campaign_video_url || null, headshot_public_path: existing?.headshot_public_path || null, instagram_url: existing?.instagram_url || null, public_profile_status: existing?.public_profile_status || "draft", contestant_number: existing?.contestant_number || null };
  const saveResponse = await fetch(`${url}/rest/v1/pgws_contestants?on_conflict=application_id`, { method: "POST", headers: { ...serviceHeaders(), Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(profile) });
  const saved = await saveResponse.json();
  if (!saveResponse.ok) return NextResponse.json({ error: saved.message || "The contestant workspace could not be linked." }, { status: 500 });
  return NextResponse.json({ contestant: saved[0] });
}
