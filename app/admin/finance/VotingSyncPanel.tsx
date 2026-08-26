"use client";

import { useState } from "react";
import { getStoredSession, refreshSession } from "@/lib/supabase-browser";

type Result = {
  contestantCount: number;
  ballotContestantCount: number;
  ballotRosterInspectable: boolean;
  missingBallotContestantNumbers: number[];
  unexpectedBallotContestantNumbers: number[];
  ballotConfigurationSamples?: string[];
  verifiedVotes: number;
  ignoredSubmissions: number;
  unresolvedSubmissions: number;
};

export function VotingSyncPanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function run(mode: "preview" | "sync") {
    let session = getStoredSession();
    if (!session) { setMessage("Sign in with a voting and finance administrator account first."); return; }
    setBusy(true);
    setMessage("");
    if (!session.expires_at || session.expires_at * 1000 <= Date.now() + 60_000) {
      session = await refreshSession();
    }
    if (!session) { setBusy(false); setMessage("Your staff session expired. Please sign in again."); return; }
    const request = (accessToken: string) => fetch("/api/admin/voting/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    let response = await request(session.access_token);
    if (response.status === 403) {
      const renewed = await refreshSession();
      if (renewed) response = await request(renewed.access_token);
    }
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(body.error || "Vote synchronization failed."); return; }
    setResult(body);
    const mismatch = body.missingBallotContestantNumbers?.length || body.unexpectedBallotContestantNumbers?.length;
    setMessage(mismatch ? "Ballot roster mismatch found. Review the missing or unexpected contestant numbers before voting opens." : !body.ballotRosterInspectable ? "Payment reconciliation passed. Jotform is not exposing its disabled payment choices through the API, so verify the visual roster when the ballot opens." : mode === "sync" ? "Verified vote totals synchronized." : "Preview complete. The ballot roster matches and no leaderboard totals were changed.");
  }

  return <div className="panel voting-sync-panel">
    <p className="eyebrow">VERIFIED PAYMENT RECONCILIATION</p>
    <h2>Jotform + Stripe vote synchronization</h2>
    <p>Only successfully paid submissions with a Stripe transaction ID, exact $2.50-per-vote totals, and a recognized contestant number are included. Pending, failed, refunded, disputed, voided, and charged-back payments are excluded.</p>
    <div className="hero-actions"><button className="button button--paper" type="button" disabled={busy} onClick={() => void run("preview")}>Preview reconciliation</button><button className="button button--lipstick" type="button" disabled={busy} onClick={() => void run("sync")}>Synchronize verified votes</button></div>
    {message && <p role="status" className="field-help">{message}</p>}
    {result && <><div className="stat-grid"><div className="stat-card"><strong>{result.contestantCount}</strong><span>accepted contestants</span></div><div className="stat-card"><strong>{result.ballotRosterInspectable ? result.ballotContestantCount : "Closed"}</strong><span>Jotform ballot roster</span></div><div className="stat-card"><strong>{result.verifiedVotes}</strong><span>verified votes</span></div><div className="stat-card"><strong>{result.unresolvedSubmissions}</strong><span>requires staff review</span></div></div>{(result.missingBallotContestantNumbers.length > 0 || result.unexpectedBallotContestantNumbers.length > 0) && <div className="notice"><strong>Ballot roster needs correction.</strong>{result.missingBallotContestantNumbers.length > 0 && <p>Missing: {result.missingBallotContestantNumbers.map((number) => String(number).padStart(3, "0")).join(", ")}</p>}{result.unexpectedBallotContestantNumbers.length > 0 && <p>Unexpected or no longer accepted: {result.unexpectedBallotContestantNumbers.map((number) => String(number).padStart(3, "0")).join(", ")}</p>}{result.ballotConfigurationSamples?.length ? <details><summary>Protected Jotform configuration details</summary><pre>{result.ballotConfigurationSamples.join("\n---\n")}</pre></details> : null}</div>}</>}
  </div>;
}
