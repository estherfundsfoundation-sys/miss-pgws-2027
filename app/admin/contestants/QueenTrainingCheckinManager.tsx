"use client";

import { useState } from "react";
import { getStoredSession } from "@/lib/supabase-browser";

type Summary = { sourceContestants?: number; eligible?: number; invalid?: number; duplicates?: number; alreadySent?: number; pending?: number; sent?: number; failed?: number; remaining?: number; recipient?: string; error?: string };

export function QueenTrainingCheckinManager() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Preview the verified contestant roster before sending.");
  const [summary, setSummary] = useState<Summary | null>(null);

  async function run(mode: "dry_run" | "test" | "send") {
    const session = getStoredSession();
    if (!session?.access_token) { setMessage("Please sign in again before sending contestant communications."); return; }
    if (mode === "send" && !window.confirm("Send the personalized Queen Training check-in to every verified pending contestant now?")) return;
    setBusy(true); setMessage(mode === "send" ? "Sending personalized emails…" : mode === "test" ? "Sending Shayna’s test email…" : "Checking the roster…");
    try {
      const response = await fetch("/api/admin/contestants/queen-training-checkin", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(mode === "test" ? { mode, testEmail: "shaynavincent24@outlook.com" } : mode === "send" ? { mode, confirm: "SEND QUEEN TRAINING CHECKIN" } : { mode }) });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("The live email service is temporarily unavailable. No messages were sent.");
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The request failed.");
      setSummary(body);
      setMessage(mode === "test" ? `Test sent to ${body.recipient}.` : mode === "send" ? `Sent ${body.sent} personalized emails. ${body.remaining ?? 0} remain.` : `${body.eligible} verified contestants; ${body.pending} are pending this check-in.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The request failed."); }
    finally { setBusy(false); }
  }

  return <div className="panel" style={{marginTop:24}}>
    <p className="eyebrow">QUEEN TRAINING FOLLOW-UP</p><h2>Pretty Sister check-in</h2>
    <p>Send each verified contestant a personalized encouragement email, Philippians 1:6, and an animated page that opens with her first name.</p>
    <div className="hero-actions" style={{marginTop:18}}><button className="button button--paper" type="button" disabled={busy} onClick={()=>void run("dry_run")}>Verify contestant count</button><button className="button button--paper" type="button" disabled={busy} onClick={()=>void run("test")}>Send Shayna’s test</button><button className="button button--lipstick" type="button" disabled={busy} onClick={()=>void run("send")}>Send to all pending contestants</button></div>
    <div className="notice notice--success" style={{marginTop:18}}><span>♡</span><div><strong>{busy ? "Working…" : "Campaign status"}</strong><br />{message}</div></div>
    {summary?.eligible !== undefined && <div className="stat-grid" style={{marginTop:18}}><div className="stat-card"><strong>{summary.eligible}</strong><span>verified contestants</span></div><div className="stat-card"><strong>{summary.alreadySent ?? 0}</strong><span>already sent</span></div><div className="stat-card"><strong>{summary.pending ?? summary.remaining ?? 0}</strong><span>pending before action</span></div><div className="stat-card"><strong>{summary.invalid ?? 0}</strong><span>missing/invalid emails</span></div></div>}
  </div>;
}
