import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncVerifiedVotes } from "@/lib/voting-sync";

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
    const result = await syncVerifiedVotes();
    console.info("[voting-reconcile]", JSON.stringify({
      submissionCount: result.submissionCount,
      verifiedSubmissions: result.verifiedSubmissions,
      verifiedVotes: result.verifiedVotes,
      unresolvedSubmissions: result.unresolvedSubmissions,
      reasonCounts: result.reasonCounts,
      supporterAlertsSent: result.supporterAlertsSent,
      supporterAlertsSkipped: result.supporterAlertsSkipped,
      supporterAlertsFailed: result.supporterAlertsFailed,
    }));
    return NextResponse.json({ success: true, ...result });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Vote reconciliation failed." }, { status: 500 });
  }
}
