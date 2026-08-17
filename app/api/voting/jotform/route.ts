import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncVerifiedVotes } from "@/lib/voting-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

function secureMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const expected = process.env.VOTING_SYNC_SECRET?.trim();
  const provided = request.nextUrl.searchParams.get("token")?.trim() || request.headers.get("x-voting-sync-token")?.trim() || "";
  if (!expected || !secureMatch(provided, expected)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ success: true, ...(await syncVerifiedVotes()) });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Vote synchronization failed." }, { status: 500 });
  }
}
