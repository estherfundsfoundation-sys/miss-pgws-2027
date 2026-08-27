import { NextResponse } from "next/server";
import { getJotformVotingFormState } from "@/lib/voting-sync";
import { isVotingWindowOpen } from "@/lib/voting-window";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await getJotformVotingFormState();
    return NextResponse.json({ healthy: state.formStatus === "ENABLED" && state.disabled.toUpperCase() === "ENABLED", windowOpen: isVotingWindowOpen(), ...state });
  } catch {
    return NextResponse.json({ healthy: false, error: "Ballot health check failed." }, { status: 503 });
  }
}
