import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { setJotformVotingFormStatus } from "@/lib/voting-sync";
import { desiredJotformVotingStatus, VOTING_CLOSES_AT, VOTING_OPENS_AT } from "@/lib/voting-window";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const expected = (process.env.CRON_SECRET || process.env.VOTING_SYNC_SECRET || "").trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return Boolean(expected) && left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const status = desiredJotformVotingStatus();
    return NextResponse.json({
      success: true,
      ...(await setJotformVotingFormStatus(status)),
      votingOpensAt: VOTING_OPENS_AT,
      votingClosesAt: VOTING_CLOSES_AT,
    });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Voting form status synchronization failed." }, { status: 500 });
  }
}
