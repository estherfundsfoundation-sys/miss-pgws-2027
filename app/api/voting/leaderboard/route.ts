import { NextResponse } from "next/server";
import { getVotingLeaderboard } from "@/lib/voting-sync";
import { isVotingWindowOpen, VOTING_CLOSES_AT, VOTING_OPENS_AT } from "@/lib/voting-window";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getVotingLeaderboard();
    return NextResponse.json({
      ...result,
      votingOpen: isVotingWindowOpen(),
      votingOpensAt: VOTING_OPENS_AT,
      votingClosesAt: VOTING_CLOSES_AT,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "The live leaderboard is unavailable." }, { status: 500 });
  }
}
