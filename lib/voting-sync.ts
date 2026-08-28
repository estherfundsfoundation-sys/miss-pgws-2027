import { aggregateVerifiedVotes, type JotformSubmission } from "./voting-sync-core";

type Row = Record<string, unknown>;
type ContestantRow = { id: string; contestant_number: number | null; public_name: string | null };

const DEFAULT_FORM_ID = "262258169740160";
const PRICE_PER_VOTE_CENTS = 250;
const AUTHORITATIVE_PRODUCT_SNAPSHOT_AT = Date.parse("2026-08-27T20:39:58-04:00");
const AUTHORITATIVE_PRODUCT_SNAPSHOT = new Map<number, number>([
  [49, 222], [120, 115], [16, 93], [29, 58], [73, 39], [70, 35], [116, 33], [114, 31],
  [2, 17], [82, 16], [30, 16], [109, 11], [71, 11], [103, 11], [19, 10], [50, 6],
  [92, 5], [91, 5], [3, 5], [140, 4], [143, 3], [61, 2], [142, 2], [33, 2], [25, 1],
  [10, 1], [11, 1], [51, 1], [46, 1],
]);

function submissionTime(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return Number.NaN;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw) ? `${raw.replace(" ", "T")}-04:00` : raw;
  return Date.parse(normalized);
}

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

async function jotformJsonRequest(path: string, apiKey: string, body: unknown) {
  const url = new URL(`https://api.jotform.com${path}`);
  let response = await fetch(url, {
    method: "PUT",
    headers: { APIKEY: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    url.searchParams.set("apiKey", apiKey);
    response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  }
  const result = await response.json().catch(() => null) as { content?: unknown; message?: string; responseCode?: number } | null;
  if (!response.ok || !result || (result.responseCode && result.responseCode >= 400)) throw new Error(result?.message || `Jotform request failed (${response.status}).`);
  return result.content;
}

async function jotformFormState(formId: string, apiKey: string) {
  const [form, properties] = await Promise.all([
    jotformRequest(`/form/${formId}`, apiKey) as Promise<Record<string, unknown>>,
    jotformRequest(`/form/${formId}/properties`, apiKey) as Promise<Record<string, unknown>>,
  ]);
  return {
    formStatus: String(form?.status || "").toUpperCase(),
    propertyStatus: String(properties?.status || ""),
    disabled: String(properties?.disabled || ""),
    expireDate: String(properties?.expireDate || ""),
    expiredDate: String(properties?.expiredDate || ""),
    messageOfLimitedForm: String(properties?.messageOfLimitedForm || ""),
  };
}

export async function getJotformVotingFormState() {
  const { apiKey, formId } = jotformConfig();
  return { formId, ...(await jotformFormState(formId, apiKey)) };
}

export async function getJotformVotingProductSchema() {
  const { apiKey, formId } = jotformConfig();
  const questions = await jotformRequest(`/form/${formId}/questions`, apiKey) as Record<string, Record<string, unknown>>;
  const payment = Object.values(questions || {}).find((question) => String(question?.type || "").includes("stripe"));
  if (!payment) return { questionFound: false };
  const rawProducts = payment.products;
  let products: unknown = rawProducts;
  if (typeof rawProducts === "string") {
    try { products = JSON.parse(rawProducts); } catch { /* retain raw string */ }
  }
  const entries = Array.isArray(products) ? products : products && typeof products === "object" ? Object.values(products as Record<string, unknown>) : [];
  return {
    questionFound: true,
    qid: String(payment.qid || ""),
    questionKeys: Object.keys(payment),
    productsType: typeof rawProducts,
    productCount: entries.length,
    sample: entries[0] || null,
  };
}

export async function setJotformVotingFormStatus(status: "Enabled" | "Disabled") {
  const { apiKey, formId } = jotformConfig();
  const body = new URLSearchParams();
  body.set("properties[status]", status);
  body.set("properties[disabled]", status);
  await jotformFormRequest(`/form/${formId}/properties`, apiKey, body);
  let state = await jotformFormState(formId, apiKey);
  const expected = status.toUpperCase();
  if (state.formStatus !== expected) {
    await jotformJsonRequest(`/form/${formId}/properties`, apiKey, { properties: { status, disabled: status } });
    state = await jotformFormState(formId, apiKey);
  }
  if (state.formStatus !== expected) {
    throw new Error(`Jotform ballot status did not change to ${status}.`);
  }
  return { formId, status, ...state, updatedAt: new Date().toISOString() };
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
  return await databaseFetch("pgws_contestants?contestant_number=not.is.null&select=id,contestant_number,public_name,pgws_applications!inner(status)&pgws_applications.status=eq.accepted&order=contestant_number.asc") as ContestantRow[];
}

async function fetchVotingBallotConfiguration() {
  const { apiKey, formId } = jotformConfig();
  const [questions, properties, form] = await Promise.all([
    jotformRequest(`/form/${formId}/questions`, apiKey),
    jotformRequest(`/form/${formId}/properties`, apiKey),
    jotformRequest(`/form/${formId}`, apiKey),
  ]);
  return JSON.stringify({ questions, properties, form });
}

export async function setPlatformVotingOpen(votingOpen: boolean) {
  await databaseFetch("pgws_platform_settings?singleton=eq.true", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ voting_open: votingOpen }),
  });
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
  const [submissions, contestants, ballotConfiguration] = await Promise.all([fetchVotingSubmissions(), contestantRows(), fetchVotingBallotConfiguration()]);
  if (!contestants.length) throw new Error("No numbered contestants are available for voting synchronization.");
  const postSnapshotSubmissions = submissions.filter((submission) => submissionTime(submission.created_at) > AUTHORITATIVE_PRODUCT_SNAPSHOT_AT);
  const aggregation = aggregateVerifiedVotes(postSnapshotSubmissions, PRICE_PER_VOTE_CENTS);
  for (const [number, votes] of AUTHORITATIVE_PRODUCT_SNAPSHOT) {
    aggregation.votesByContestantNumber.set(number, (aggregation.votesByContestantNumber.get(number) || 0) + votes);
  }
  const knownNumbers = new Set(contestants.map((row) => Number(row.contestant_number)));
  const ballotNumbers = new Set<number>();
  for (const match of ballotConfiguration.matchAll(/\bContestant\s*#?\s*(\d{1,3})\b/gi)) ballotNumbers.add(Number(match[1]));
  const normalizedBallot = ballotConfiguration.toLocaleLowerCase();
  for (const contestant of contestants) {
    if (contestant.public_name && normalizedBallot.includes(contestant.public_name.toLocaleLowerCase())) ballotNumbers.add(Number(contestant.contestant_number));
  }
  const ballotRosterInspectable = ballotNumbers.size > 0;
  const missingBallotContestantNumbers = ballotRosterInspectable ? [...knownNumbers].filter((number) => !ballotNumbers.has(number)).sort((a, b) => a - b) : [];
  const unexpectedBallotContestantNumbers = ballotRosterInspectable ? [...ballotNumbers].filter((number) => !knownNumbers.has(number)).sort((a, b) => a - b) : [];
  const ballotConfigurationSamples = ["control_stripe", '"products"', ...missingBallotContestantNumbers.map((number) => `Contestant ${String(number).padStart(3, "0")}`), ...unexpectedBallotContestantNumbers.map((number) => `Contestant ${String(number).padStart(3, "0")}`)].map((needle) => {
    const index = ballotConfiguration.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
    return index < 0 ? null : ballotConfiguration.slice(Math.max(0, index - 240), Math.min(ballotConfiguration.length, index + 420));
  }).filter((sample): sample is string => Boolean(sample));
  const unmatchedContestantNumbers = [...aggregation.votesByContestantNumber.keys()].filter((number) => !knownNumbers.has(number)).sort((a, b) => a - b);
  for (const number of unmatchedContestantNumbers) aggregation.votesByContestantNumber.delete(number);

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
    ballotContestantCount: ballotNumbers.size,
    ballotRosterInspectable,
    missingBallotContestantNumbers,
    unexpectedBallotContestantNumbers,
    ballotConfigurationSamples,
    submissionCount: submissions.length,
    postSnapshotSubmissionCount: postSnapshotSubmissions.length,
    authoritativeSnapshotVotes: [...AUTHORITATIVE_PRODUCT_SNAPSHOT.values()].reduce((sum, votes) => sum + votes, 0),
    verifiedSubmissions: aggregation.verifiedSubmissions,
    ignoredSubmissions: aggregation.ignoredSubmissions,
    duplicateTransactions: aggregation.duplicateTransactions,
    unresolvedSubmissions: aggregation.unresolvedSubmissions,
    unresolvedSubmissionIds: aggregation.unresolvedSubmissionIds.slice(0, 25),
    reasonCounts: aggregation.reasonCounts,
    verifiedVotes,
    verifiedAmountCents: verifiedVotes * PRICE_PER_VOTE_CENTS,
    unmatchedContestantNumbers,
    syncedAt,
  };
}

export async function getVotingLeaderboard() {
  const [contestants, totals, settings] = await Promise.all([
    databaseFetch("pgws_contestants?contestant_number=not.is.null&select=id,public_slug,public_name,college,contestant_number,headshot_public_path,public_profile_status,pgws_applications!inner(status)&pgws_applications.status=eq.accepted&order=contestant_number.asc"),
    databaseFetch("pgws_vote_totals?select=contestant_id,verified_votes,verified_amount_cents,provisional_rank,last_synced_at,audit_status&order=verified_votes.desc"),
    databaseFetch("pgws_platform_settings?singleton=eq.true&select=voting_open&limit=1"),
  ]) as [Row[], Row[], Row[]];
  const totalsByContestant = new Map(totals.map((row) => [String(row.contestant_id), row]));
  const ranked = contestants.map((contestant) => ({
    id: contestant.id,
    public_slug: contestant.public_slug,
    public_name: contestant.public_name,
    college: contestant.college,
    contestant_number: contestant.contestant_number,
    headshot_public_path: contestant.headshot_public_path,
    public_profile_status: contestant.public_profile_status,
    verified_votes: Number(totalsByContestant.get(String(contestant.id))?.verified_votes || 0),
    verified_amount_cents: Number(totalsByContestant.get(String(contestant.id))?.verified_amount_cents || 0),
    provisional_rank: null as number | null,
    last_synced_at: totalsByContestant.get(String(contestant.id))?.last_synced_at ?? null,
    audit_status: totalsByContestant.get(String(contestant.id))?.audit_status || "provisional",
  })).filter((contestant) => contestant.verified_votes > 0)
    .sort((a, b) => b.verified_votes - a.verified_votes || Number(a.contestant_number || 999) - Number(b.contestant_number || 999));
  let priorVotes: number | null = null;
  let priorRank: number | null = null;
  ranked.forEach((contestant, index) => {
    contestant.provisional_rank = contestant.verified_votes === priorVotes ? priorRank : index + 1;
    priorVotes = contestant.verified_votes;
    priorRank = contestant.provisional_rank;
  });
  return {
    adminVotingOpen: Boolean(settings[0]?.voting_open),
    rows: ranked,
  };
}
