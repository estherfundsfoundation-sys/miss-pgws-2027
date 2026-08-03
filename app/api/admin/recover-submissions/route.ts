import { NextRequest, NextResponse } from "next/server";
import applicationContent from "@/content/application-content.json";

export const runtime = "nodejs";

type Row = Record<string, unknown>;
type Candidate = { applicationId: string; userId: string; name: string; email: string };
type Evaluation = { eligible: Candidate[]; skipped: Array<Candidate & { reasons: string[] }> };

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server database configuration is unavailable.");
  return { url, key };
}

async function serviceFetch(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) throw new Error((await response.text()) || `Database request failed (${response.status}).`);
  if (response.status === 204) return [];
  return response.json();
}

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Staff sign-in required.");
  const { url, key } = config();
  const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!auth.ok) throw new Error("Your staff session is invalid or expired.");
  const user = await auth.json();
  const roles = await serviceFetch(`/rest/v1/pgws_user_roles?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=role`);
  if (!(roles as Row[]).some((row) => ["competition_admin", "super_admin"].includes(String(row.role)))) throw new Error("Competition administrator access is required.");
  return user as { id: string; email?: string };
}

function filled(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length > 0;
  return value != null && typeof value === "object" && Object.keys(value as object).length > 0;
}

async function evaluate(): Promise<Evaluation> {
  const applications = await serviceFetch("/rest/v1/pgws_applications?agreement_status=eq.signed&status=eq.draft&submitted_at=is.null&select=id,user_id,answers,status,agreement_status,submitted_at");
  const rows = applications as Row[];
  if (!rows.length) return { eligible: [], skipped: [] };
  const userIds = rows.map((row) => String(row.user_id));
  const appIds = rows.map((row) => String(row.id));
  const profiles = await serviceFetch(`/rest/v1/pgws_profiles?user_id=in.(${userIds.map(encodeURIComponent).join(",")})&select=user_id,legal_name,preferred_name,email,email_verified`);
  const files = await serviceFetch(`/rest/v1/pgws_application_files?application_id=in.(${appIds.map(encodeURIComponent).join(",")})&select=application_id,field_key,object_path`);
  const profileByUser = new Map((profiles as Row[]).map((row) => [String(row.user_id), row]));
  const filesByApp = new Map<string, Row[]>();
  for (const file of files as Row[]) {
    const key = String(file.application_id);
    filesByApp.set(key, [...(filesByApp.get(key) || []), file]);
  }
  const sections = applicationContent.application.sections as unknown as Array<{ questions: Array<{ key: string; label: string; type: string; required?: boolean | null }> }>;
  const questions = sections.flatMap((section) => section.questions).filter((question) => question.required === true && !["agreement", "review-status"].includes(question.type));
  const eligible: Candidate[] = [];
  const skipped: Evaluation["skipped"] = [];
  for (const application of rows) {
    const applicationId = String(application.id);
    const userId = String(application.user_id);
    const profile = profileByUser.get(userId) || {};
    const answers = application.answers && typeof application.answers === "object" ? application.answers as Record<string, unknown> : {};
    const candidate = { applicationId, userId, name: String(profile.preferred_name || profile.legal_name || "Applicant"), email: String(profile.email || "No email") };
    const reasons: string[] = [];
    if (profile.email_verified !== true) reasons.push("email is not verified");
    for (const question of questions) {
      const answer = answers[question.key];
      if (!filled(answer)) { reasons.push(`missing required field: ${question.label}`); continue; }
      if (question.type === "file") {
        const matched = (filesByApp.get(applicationId) || []).some((file) => String(file.field_key) === question.key && String(file.object_path) === String(answer));
        if (!matched) reasons.push(`required upload is not stored: ${question.label}`);
      }
    }
    if (reasons.length) skipped.push({ ...candidate, reasons }); else eligible.push(candidate);
  }
  return { eligible, skipped };
}

async function insert(path: string, body: object) {
  return serviceFetch(path, { method: "POST", body: JSON.stringify(body) });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await authorize(request);
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode;
    if (!(["preview", "submit"] as const).includes(mode)) return NextResponse.json({ error: "Mode must be preview or submit." }, { status: 400 });
    const evaluation = await evaluate();
    if (mode === "preview") return NextResponse.json(evaluation);
    const submitted: Candidate[] = [];
    const failed: Array<Candidate & { error: string }> = [];
    for (const candidate of evaluation.eligible) {
      try {
        const now = new Date().toISOString();
        const updated = await serviceFetch(`/rest/v1/pgws_applications?id=eq.${encodeURIComponent(candidate.applicationId)}&status=eq.draft&submitted_at=is.null`, {
          method: "PATCH",
          body: JSON.stringify({ status: "submitted", completion_percent: 100, submitted_at: now, locked_at: now, updated_at: now }),
        });
        if (!(updated as Row[]).length) throw new Error("The record changed after preview; no update was made.");
        await insert("/rest/v1/pgws_status_history", { application_id: candidate.applicationId, from_status: "draft", to_status: "submitted", changed_by: actor.id, reason: "Staff recovery of a verified complete signed draft after applicant submission difficulty." });
        await insert("/rest/v1/pgws_audit_log", { actor_user_id: actor.id, action: "application_submitted_by_staff_recovery", entity_type: "pgws_application", entity_id: candidate.applicationId, metadata: { source: "admin_submission_recovery", applicant_user_id: candidate.userId } });
        submitted.push(candidate);
      } catch (reason) {
        failed.push({ ...candidate, error: reason instanceof Error ? reason.message : "Unknown error" });
      }
    }
    return NextResponse.json({ ...evaluation, submitted, failed });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Submission recovery failed.";
    const status = /sign-in|session|access/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
