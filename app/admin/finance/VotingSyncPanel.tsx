"use client";

import { useState } from "react";
import { getStoredSession, refreshSession } from "@/lib/supabase-browser";

type Result = {
  contestantCount: number;
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
    setMessage(mode === "sync" ? "Verified vote totals synchronized." : "Preview complete. No leaderboard totals were changed.");
  }

  return <div className="panel voting-sync-panel">
    <p className="eyebrow">VERIFIED PAYMENT RECONCILIATION</p>
    <h2>Jotform + Stripe vote synchronization</h2>
    <p>Only successfully paid submissions with a Stripe transaction ID, exact $2.50-per-vote totals, and a recognized contestant number are included. Pending, failed, refunded, disputed, voided, and charged-back payments are excluded.</p>
    <div className="hero-actions"><button className="button button--paper" type="button" disabled={busy} onClick={() => void run("preview")}>Preview reconciliation</button><button className="button button--lipstick" type="button" disabled={busy} onClick={() => void run("sync")}>Synchronize verified votes</button></div>
    {message && <p role="status" className="field-help">{message}</p>}
    {result && <div className="stat-grid"><div className="stat-card"><strong>{result.contestantCount}</strong><span>numbered contestants</span></div><div className="stat-card"><strong>{result.verifiedVotes}</strong><span>verified votes</span></div><div className="stat-card"><strong>{result.ignoredSubmissions}</strong><span>ineligible payments</span></div><div className="stat-card"><strong>{result.unresolvedSubmissions}</strong><span>requires staff review</span></div></div>}
  </div>;
}
