"use client";

import { useState } from "react";
import { getStoredSession } from "@/lib/supabase-browser";

type Candidate = { applicationId: string; name: string; email: string };
type Skipped = Candidate & { reasons: string[] };
type Result = { eligible: Candidate[]; skipped: Skipped[]; submitted?: Candidate[]; failed?: Array<Candidate & { error: string }> };

async function request(mode: "preview" | "submit") {
  const session = getStoredSession();
  if (!session?.access_token) throw new Error("Your staff session expired. Sign in again.");
  const response = await fetch("/api/admin/recover-submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ mode }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The recovery check could not be completed.");
  return payload as Result;
}

export function SubmissionRecovery({ onSubmitted }: { onSubmitted: () => void }) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function preview() {
    setBusy(true); setError("");
    try { setResult(await request("preview")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Preview failed."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!result?.eligible.length) return;
    const confirmed = window.confirm(`Submit ${result.eligible.length} verified complete application${result.eligible.length === 1 ? "" : "s"}? This administrative recovery does not accept or decline anyone.`);
    if (!confirmed) return;
    setBusy(true); setError("");
    try {
      const next = await request("submit");
      setResult(next);
      if (next.submitted?.length && !next.failed?.length) onSubmitted();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Submission recovery failed."); }
    finally { setBusy(false); }
  }

  return <section className="panel">
    <p className="eyebrow">SUBMISSION RECOVERY</p>
    <h2>Recover complete signed drafts</h2>
    <p className="field-help">Preview checks the current application form, verified email, signed agreement, every required answer, and every required upload. It never scores, accepts, or declines an applicant.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button className="button button--paper button--small" type="button" disabled={busy} onClick={preview}>{busy ? "Checking…" : "Preview eligible applications"}</button>
      {result && result.eligible.length > 0 && <button className="button button--lipstick button--small" type="button" disabled={busy} onClick={submit}>Submit {result.eligible.length} verified application{result.eligible.length === 1 ? "" : "s"}</button>}
    </div>
    {result && <div style={{marginTop:18}}>
      <p><strong>{result.eligible.length}</strong> eligible; <strong>{result.skipped.length}</strong> skipped.</p>
      {result.eligible.length > 0 && <details open><summary>Eligible applicants</summary><ul>{result.eligible.map((item) => <li key={item.applicationId}>{item.name} ({item.email})</li>)}</ul></details>}
      {result.skipped.length > 0 && <details><summary>Skipped applicants and reasons</summary><ul>{result.skipped.map((item) => <li key={item.applicationId}>{item.name} ({item.email}): {item.reasons.join("; ")}</li>)}</ul></details>}
      {result.submitted && <p className="notice"><strong>{result.submitted.length}</strong> application{result.submitted.length === 1 ? " was" : "s were"} submitted by recovery.</p>}
      {result.failed && result.failed.length > 0 && <div className="notice" role="alert"><strong>{result.failed.length} failed:</strong><ul>{result.failed.map((item) => <li key={item.applicationId}>{item.name}: {item.error}</li>)}</ul></div>}
    </div>}
  </section>;
}
