export type JotformSubmission = {
  id?: string | number;
  status?: string;
  answers?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ParsedVoteSubmission = {
  eligible: boolean;
  reason: string;
  transactionId: string | null;
  totalCents: number | null;
  votesByContestantNumber: Map<number, number>;
};

export type VoteAggregation = {
  verifiedSubmissions: number;
  ignoredSubmissions: number;
  duplicateTransactions: number;
  unresolvedSubmissions: number;
  votesByContestantNumber: Map<number, number>;
  unresolvedSubmissionIds: string[];
  reasonCounts: Record<string, number>;
};

const SUCCESS_STATUSES = new Set(["APPROVED", "CAPTURED", "COMPLETED", "PAID", "SUCCESS", "SUCCESSFUL"]);
const INELIGIBLE_STATUS_PATTERN = /(CANCEL|CHARGEBACK|DECLIN|DISPUT|FAIL|PENDING|REFUND|REVERSED|VOID)/i;
const CONTESTANT_PATTERN = /contestant\s*#?\s*(\d{1,3})\s*(?:[-–—:]|$)/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function integer(value: unknown) {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
}

function currencyToCents(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const cleaned = String(value).replace(/[$,\sA-Z]/gi, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number.parseFloat(cleaned);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function contestantNumber(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(CONTESTANT_PATTERN);
  if (!match) return null;
  const number = Number.parseInt(match[1], 10);
  return number >= 1 && number <= 999 ? number : null;
}

function quantityFromRecord(record: Record<string, unknown>) {
  for (const key of ["quantity", "qty", "count", "selectedQuantity", "selected_quantity"]) {
    const value = integer(record[key]);
    if (value) return value;
  }
  return 1;
}

function addVote(target: Map<number, number>, number: number, quantity: number) {
  target.set(number, (target.get(number) || 0) + quantity);
}

function hasExplicitQuantity(value: unknown, visited = new Set<object>()): boolean {
  if (Array.isArray(value)) {
    if (visited.has(value)) return false;
    visited.add(value);
    return value.some((item) => hasExplicitQuantity(item, visited));
  }
  const record = asRecord(value);
  if (!record || visited.has(record)) return false;
  visited.add(record);
  for (const [key, child] of Object.entries(record)) {
    if (/^(quantity|qty|count|selected_?quantity)$/i.test(key) && integer(child)) return true;
    if (hasExplicitQuantity(child, visited)) return true;
  }
  return false;
}

function extractProducts(value: unknown, target: Map<number, number>, visited = new Set<object>()) {
  if (Array.isArray(value)) {
    if (visited.has(value)) return;
    visited.add(value);
    for (const item of value) extractProducts(item, target, visited);
    return;
  }

  const record = asRecord(value);
  if (!record) {
    if (typeof value === "string") {
      const number = contestantNumber(value);
      if (number) {
        const quantityMatch = value.match(/(?:quantity|qty|count|\bx)\s*[:=]?\s*(\d+)/i);
        addVote(target, number, quantityMatch ? Number.parseInt(quantityMatch[1], 10) : 1);
      }
    }
    return;
  }

  if (visited.has(record)) return;
  visited.add(record);

  let directProductFound = false;
  for (const key of ["name", "title", "product", "productName", "product_name", "label"]) {
    const number = contestantNumber(record[key]);
    if (!number) continue;
    addVote(target, number, quantityFromRecord(record));
    directProductFound = true;
    break;
  }

  for (const [key, child] of Object.entries(record)) {
    const number = contestantNumber(key);
    if (number) {
      const childRecord = asRecord(child);
      addVote(target, number, childRecord ? quantityFromRecord(childRecord) : integer(child) || 1);
      continue;
    }
    if (directProductFound && ["name", "title", "product", "productName", "product_name", "label", "quantity", "qty", "count", "selectedQuantity", "selected_quantity"].includes(key)) continue;
    extractProducts(child, target, visited);
  }
}

function collectNamedValues(value: unknown, keyPattern: RegExp, output: string[], visited = new Set<object>()) {
  if (Array.isArray(value)) {
    if (visited.has(value)) return;
    visited.add(value);
    for (const item of value) collectNamedValues(item, keyPattern, output, visited);
    return;
  }
  const record = asRecord(value);
  if (!record || visited.has(record)) return;
  visited.add(record);
  for (const [key, child] of Object.entries(record)) {
    if (keyPattern.test(key) && (typeof child === "string" || typeof child === "number")) output.push(String(child));
    collectNamedValues(child, keyPattern, output, visited);
  }
}

function paymentAnswers(submission: JotformSubmission) {
  return Object.values(submission.answers || {}).filter((value) => {
    const record = asRecord(value);
    if (!record) return false;
    return /payment|product|stripe/i.test(String(record.type || "")) || /payment|vote total|verified votes/i.test(String(record.text || ""));
  });
}

function extractStatuses(submission: JotformSubmission, payments: unknown[]) {
  const values: string[] = [];
  collectNamedValues(submission, /^(payment_?status|stripe_?status)$/i, values);
  for (const payment of payments) collectNamedValues(payment, /^(payment_?status|stripe_?status|status)$/i, values);
  return values.map((value) => value.trim().toUpperCase()).filter(Boolean);
}

function extractTransactionId(submission: JotformSubmission, payments: unknown[]) {
  const values: string[] = [];
  const keyPattern = /^(charge_?id|payment_?id|payment_?intent|payment_?transaction_?id|stripe_?transaction_?id|transaction_?id|transaction)$/i;
  collectNamedValues(submission, keyPattern, values);
  for (const payment of payments) collectNamedValues(payment, keyPattern, values);
  return values.map((value) => value.trim()).find((value) => value.length >= 6) || null;
}

function extractTotalCents(valuesToInspect: unknown[]) {
  const values: unknown[] = [];
  const visit = (value: unknown, visited = new Set<object>()) => {
    if (Array.isArray(value)) {
      if (visited.has(value)) return;
      visited.add(value);
      for (const item of value) visit(item, visited);
      return;
    }
    const record = asRecord(value);
    if (!record || visited.has(record)) return;
    visited.add(record);
    for (const [key, child] of Object.entries(record)) {
      if (/^(grand_?total|payment_?total|total|total_?amount|amount_?paid)$/i.test(key)) values.push(child);
      visit(child, visited);
    }
  };
  for (const value of valuesToInspect) visit(value);
  for (const value of values) {
    const cents = currencyToCents(value);
    if (cents != null) return cents;
  }
  return null;
}

function ballotAnswers(submission: JotformSubmission) {
  return Object.values(submission.answers || {}).filter((value) => {
    const record = asRecord(value);
    if (!record) return false;
    return /contestant|vote|quantity|payment|product|stripe/i.test(`${String(record.type || "")} ${String(record.text || "")} ${String(record.name || "")}`);
  });
}

export function parseVoteSubmission(submission: JotformSubmission, pricePerVoteCents = 250): ParsedVoteSubmission {
  if (/DELETED|TRASH/i.test(String(submission.status || ""))) {
    return { eligible: false, reason: "deleted", transactionId: null, totalCents: null, votesByContestantNumber: new Map() };
  }

  const payments = paymentAnswers(submission);
  const ballot = ballotAnswers(submission);
  const statuses = extractStatuses(submission, payments);
  if (statuses.some((status) => INELIGIBLE_STATUS_PATTERN.test(status))) {
    return { eligible: false, reason: "ineligible-payment-status", transactionId: null, totalCents: extractTotalCents([submission, ...payments]), votesByContestantNumber: new Map() };
  }

  const transactionId = extractTransactionId(submission, payments);
  if (!transactionId) {
    return { eligible: false, reason: statuses.some((status) => SUCCESS_STATUSES.has(status)) ? "missing-transaction-id" : "payment-not-confirmed", transactionId: null, totalCents: extractTotalCents([submission, ...payments]), votesByContestantNumber: new Map() };
  }

  const votesByContestantNumber = new Map<number, number>();
  for (const payment of payments) extractProducts(payment, votesByContestantNumber);
  if (!votesByContestantNumber.size) {
    for (const answer of ballot) extractProducts(answer, votesByContestantNumber);
  }
  const totalCents = extractTotalCents([submission, ...payments]);
  const parsedVoteCount = [...votesByContestantNumber.values()].reduce((sum, value) => sum + value, 0);
  if (votesByContestantNumber.size === 1 && parsedVoteCount === 1 && !ballot.some((answer) => hasExplicitQuantity(answer)) && totalCents && totalCents % pricePerVoteCents === 0) {
    const [number] = votesByContestantNumber.keys();
    votesByContestantNumber.set(number, totalCents / pricePerVoteCents);
  }
  const voteCount = [...votesByContestantNumber.values()].reduce((sum, value) => sum + value, 0);
  if (!voteCount) {
    return { eligible: false, reason: "missing-product-quantity", transactionId, totalCents, votesByContestantNumber };
  }

  const expectedCents = voteCount * pricePerVoteCents;
  if (totalCents == null) {
    return { eligible: false, reason: "missing-payment-total", transactionId, totalCents, votesByContestantNumber };
  }
  if (totalCents !== expectedCents) {
    return { eligible: false, reason: "amount-mismatch", transactionId, totalCents, votesByContestantNumber };
  }

  return { eligible: true, reason: "verified", transactionId, totalCents: totalCents ?? expectedCents, votesByContestantNumber };
}

export function aggregateVerifiedVotes(submissions: JotformSubmission[], pricePerVoteCents = 250): VoteAggregation {
  const result: VoteAggregation = {
    verifiedSubmissions: 0,
    ignoredSubmissions: 0,
    duplicateTransactions: 0,
    unresolvedSubmissions: 0,
    votesByContestantNumber: new Map(),
    unresolvedSubmissionIds: [],
    reasonCounts: {},
  };
  const countedTransactionIds = new Set<string>();

  for (const submission of submissions) {
    const parsed = parseVoteSubmission(submission, pricePerVoteCents);
    result.reasonCounts[parsed.reason] = (result.reasonCounts[parsed.reason] || 0) + 1;
    if (!parsed.eligible) {
      if (["deleted", "ineligible-payment-status", "payment-not-confirmed"].includes(parsed.reason)) result.ignoredSubmissions += 1;
      else {
        result.unresolvedSubmissions += 1;
        result.unresolvedSubmissionIds.push(String(submission.id || "unknown"));
      }
      continue;
    }
    if (countedTransactionIds.has(parsed.transactionId!)) {
      result.ignoredSubmissions += 1;
      result.duplicateTransactions += 1;
      continue;
    }
    countedTransactionIds.add(parsed.transactionId!);
    result.verifiedSubmissions += 1;
    for (const [number, votes] of parsed.votesByContestantNumber) addVote(result.votesByContestantNumber, number, votes);
  }

  return result;
}
