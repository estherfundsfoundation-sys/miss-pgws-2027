import { NextResponse } from "next/server";
import { getJotformVotingFormState, getJotformVotingProductSchema } from "@/lib/voting-sync";
import { isVotingWindowOpen } from "@/lib/voting-window";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [state, productSchema] = await Promise.all([getJotformVotingFormState(), getJotformVotingProductSchema()]);
    return NextResponse.json({ healthy: state.formStatus === "ENABLED", windowOpen: isVotingWindowOpen(), ...state, productSchema });
  } catch {
    return NextResponse.json({ healthy: false, error: "Ballot health check failed." }, { status: 503 });
  }
}
