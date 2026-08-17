export const VOTING_OPENS_AT = "2026-08-27T16:00:00.000Z";
export const VOTING_CLOSES_AT = "2026-09-04T03:59:59.999Z";

export function isVotingWindowOpen(now = new Date()) {
  const timestamp = now.getTime();
  return timestamp >= Date.parse(VOTING_OPENS_AT) && timestamp <= Date.parse(VOTING_CLOSES_AT);
}

export function desiredJotformVotingStatus(now = new Date()) {
  return isVotingWindowOpen(now) ? "Enabled" : "Disabled";
}
