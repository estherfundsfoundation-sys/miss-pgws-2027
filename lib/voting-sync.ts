import { aggregateVerifiedVotes, type JotformSubmission } from "./voting-sync-core";

type Row = Record<string, unknown>;
type ContestantRow = { id: string; contestant_number: number | null; public_name: string | null };

const DEFAULT_FORM_ID = "262258169740160";
const PRICE_PER_VOTE_CENTS = 250;

function databaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server database configuration is unavailable.");
  return { url, key };
}

async function databaseFetch(path: string, init: RequestInit = {}) {
  const { url, key } = databaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.hint || body?.error || `Database request failed (${response.status}).`);
  return body;
}

function jotformConfig() {
  const apiKey = process.env.JOTFORM_API_KEY?.trim();
  const formId = (process.env.JOTFORM_VOTING_FORM_ID || DEFAULT_FORM_ID).trim();
  if (!apiKey) throw new Error("Jotform synchronization is not configured.");
  if (!/^\d+$/.test(formId)) throw new Error("The Jotform voting form ID is invalid.");
  return { apiKey, formId };
}

async function jotformRequest(path: string, apiKey: string) {
  const url = new URL(`https://api.jotform.com${path}`);
  let response = await fetch(url, { headers: { APIKEY: apiKey }, cache: "no-store" });
  if (response.status === 401 || response.status === 403) {
    url.searchParams.set("apiKey", apiKey);
    response = await fetch(url, { cache: "no-store" });
  }
  const body = await response.json().catch(() => null) as { content?: unknown; message?: string } | null;
  if (!response.ok || !body) throw new Error(body?.message || `Jotform request failed (${response.status}).`);
  return body.content;
}

async function jotformFormRequest(path: string, apiKey: string, body: URLSearchParams) {
  const url = new URL(`https://api.jotform.com${path}`);
  let response = await fetch(url, {
    method: "POST",
    headers: { APIKEY: apiKey, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    url.searchParams.set("apiKey", apiKey);
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  }
  const result = await response.json().catch(() => null) as { content?: unknown; message?: string; responseCode?: number } | null;
  if (!response.ok || !result || (result.responseCode && result.responseCode >= 400)) throw new Error(result?.message || `Jotform request failed (${response.status}).`);
  return result.content;
}

export async function setJotformVotingFormStatus(status: "Enabled" | "Disabled") {
  const { apiKey, formId } = jotformConfig();
  const body = new URLSearchParams();
  body.set("properties[disabled]", status);
  await jotformFormRequest(`/form/${formId}/properties`, apiKey, body);
  return { formId, status, updatedAt: new Date().toISOString() };
}

export async function fetchVotingSubmissions() {
  const { apiKey, formId } = jotformConfig();
  const submissions: JotformSubmission[] = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const content = await jotformRequest(`/form/${formId}/submissions?limit=${limit}&offset=${offset}&orderby=created_at`, apiKey);
    const page = Array.isArray(content) ? content as JotformSubmission[] : [];
    submissions.push(...page);
    if (page.length < limit) break;
  }
  return submissions;
}

async function contestantRows() {
  return await databaseFetch("pgws_contestants?contestant_number=not.is.null&select=id,contestant_number,public_name&order=contestant_number.asc") as ContestantRow[];
}

function rankedRows(contestants: ContestantRow[], votes: Map<number, number>, syncedAt: string) {
  const ordered = contestants.map((contestant) => ({
    contestant_id: contestant.id,
    contestant_number: Number(contestant.contestant_number),
    verified_votes: votes.get(Number(contestant.contestant_number)) || 0,
  })).sort((a, b) => b.verified_votes - a.verified_votes || a.contestant_number - b.contestant_number);
  let previousVotes: number | null = null;
  let previousRank: number | null = null;
  return ordered.map((row, index) => {
    const rank = row.verified_votes > 0 ? (row.verified_votes === previousVotes ? previousRank : index + 1) : null;
    if (row.verified_votes > 0) {
      previousVotes = row.verified_votes;
      previousRank = rank;
    }
    return {
      contestant_id: row.contestant_id,
      verified_votes: row.verified_votes,
      verified_amount_cents: row.verified_votes * PRICE_PER_VOTE_CENTS,
      provisional_rank: rank,
      last_synced_at: syncedAt,
      audit_status: "provisional",
    };
  });
}

export async function syncVerifiedVotes({ dryRun = false }: { dryRun?: boolean } = {}) {
  const [submissions, contestants] = await Promise.all([fetchVotingSubmissions(), contestantRows()]);
  if (!contestants.length) throw new Error("No numbered contestants are available for voting synchronization.");
  const aggregation = aggregateVerifiedVotes(submissions, PRICE_PER_VOTE_CENTS);
  const knownNumbers = new Set(contestants.map((row) => Number(row.contestant_number)));
  const unmatchedContestantNumbers = [...aggregation.votesByContestantNumber.keys()].filter((number) => !knownNumbers.has(number)).sort((a, b) => a - b);
  if (unmatchedContestantNumbers.length) throw new Error(`Paid votes reference unknown contestant numbers: ${unmatchedContestantNumbers.map((number) => String(number).padStart(3, "0")).join(", ")}.`);

  const syncedAt = new Date().toISOString();
  const rows = rankedRows(contestants, aggregation.votesByContestantNumber, syncedAt);
  if (!dryRun) {
    await databaseFetch("pgws_vote_totals?on_conflict=contestant_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }

  const verifiedVotes = [...aggregation.votesByContestantNumber.values()].reduce((sum, value) => sum + value, 0);
  return {
    dryRun,
    formId: process.env.JOTFORM_VOTING_FORM_ID || DEFAULT_FORM_ID,
    contestantCount: contestants.length,
    submissionCount: submissions.length,
    verifiedSubmissions: aggregation.verifiedSubmissions,
    ignoredSubmissions: aggregation.ignoredSubmissions,
    duplicateTransactions: aggregation.duplicateTransactions,
    unresolvedSubmissions: aggregation.unresolvedSubmissions,
    unresolvedSubmissionIds: aggregation.unresolvedSubmissionIds.slice(0, 25),
    verifiedVotes,
    verifiedAmountCents: verifiedVotes * PRICE_PER_VOTE_CENTS,
    unmatchedContestantNumbers,
    syncedAt,
  };
}

export async function getVotingLeaderboard() {
  const [contestants, totals, settings] = await Promise.all([
    databaseFetch("pgws_contestants?contestant_number=not.is.null&public_profile_status=eq.published&select=id,public_slug,public_name,college,contestant_number,headshot_public_path,public_profile_status&order=contestant_number.asc"),
    databaseFetch("pgws_vote_totals?select=contestant_id,verified_votes,verified_amount_cents,provisional_rank,last_synced_at,audit_status&order=verified_votes.desc"),
    databaseFetch("pgws_platform_settings?singleton=eq.true&select=voting_open&limit=1"),
  ]) as [Row[], Row[], Row[]];
  const totalsByContestant = new Map(totals.map((row) => [String(row.contestant_id), row]));
  return {
    adminVotingOpen: Boolean(settings[0]?.voting_open),
    rows: contestants.map((contestant) => ({
      id: contestant.id,
      public_slug: contestant.public_slug,
      public_name: contestant.public_name,
      college: contestant.college,
      contestant_number: contestant.contestant_number,
      headshot_public_path: contestant.headshot_public_path,
      public_profile_status: contestant.public_profile_status,
      verified_votes: Number(totalsByContestant.get(String(contestant.id))?.verified_votes || 0),
      verified_amount_cents: Number(totalsByContestant.get(String(contestant.id))?.verified_amount_cents || 0),
      provisional_rank: totalsByContestant.get(String(contestant.id))?.provisional_rank ?? null,
      last_synced_at: totalsByContestant.get(String(contestant.id))?.last_synced_at ?? null,
      audit_status: totalsByContestant.get(String(contestant.id))?.audit_status || "provisional",
    })),
  };
}
