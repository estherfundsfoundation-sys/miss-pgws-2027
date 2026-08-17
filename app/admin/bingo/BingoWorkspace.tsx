"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPrivateFileUrl, getStoredSession, rest } from "@/lib/supabase-browser";

type Role = { role: string; active: boolean };
type Contestant = { id: string; public_name: string | null; college: string | null };
type Submission = {
  id: string;
  contestant_id: string;
  object_path: string;
  original_name: string;
  status: "submitted" | "winner" | "ineligible";
  bonus_points: number;
  submitted_at: string;
  url?: string;
};

export function BingoWorkspace() {
  const [authorized, setAuthorized] = useState(false);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [winnerCount, setWinnerCount] = useState(3);
  const [reason, setReason] = useState("Queen Training Bingo Starbucks gift-card drawing.");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const session = getStoredSession();

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const roles = await rest<Role[]>(`pgws_user_roles?user_id=eq.${session.user.id}&active=eq.true&select=role,active`);
    const canManage = roles.data?.some((item) => ["competition_admin", "super_admin"].includes(item.role)) ?? false;
    setAuthorized(canManage);
    if (!canManage) { setMessage("Competition administrator access is required."); setLoading(false); return; }
    const [contestantResult, submissionResult] = await Promise.all([
      rest<Contestant[]>("pgws_contestants?select=id,public_name,college&order=public_name.asc"),
      rest<Submission[]>("pgws_bingo_submissions?select=id,contestant_id,object_path,original_name,status,bonus_points,submitted_at&order=submitted_at.asc"),
    ]);
    const withUrls = await Promise.all((submissionResult.data || []).map(async (item) => {
      const signed = await createPrivateFileUrl(item.object_path);
      return { ...item, url: signed.data?.signedURL || "" };
    }));
    setContestants(contestantResult.data || []);
    setSubmissions(withUrls);
    setMessage(contestantResult.error || submissionResult.error || "");
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => { void load(); }, [load]);

  const contestantById = useMemo(() => new Map(contestants.map((item) => [item.id, item])), [contestants]);
  const eligibleCount = submissions.filter((item) => item.status === "submitted").length;
  const winnerTotal = submissions.filter((item) => item.status === "winner").length;
  const bonusTotal = submissions.reduce((sum, item) => sum + Number(item.bonus_points || 0), 0);

  async function drawWinners() {
    if (!authorized || winnerCount < 1 || winnerCount > Math.min(20, eligibleCount) || reason.trim().length < 5) return;
    setBusy(true);
    setMessage("Running the secure random drawing…");
    const result = await rest<Submission[]>("rpc/pgws_staff_draw_bingo_winners", {
      method: "POST",
      body: JSON.stringify({ p_winner_count: winnerCount, p_reason: reason }),
    });
    if (result.error) setMessage(result.error);
    else {
      const winnerIds = new Set((result.data || []).map((item) => item.id));
      setSubmissions((items) => items.map((item) => winnerIds.has(item.id) ? { ...item, status: "winner" } : item));
      const winnerNames = (result.data || []).map((item) => contestantById.get(item.contestant_id)?.public_name || "Contestant");
      setMessage(`Drawing complete! Starbucks winners: ${winnerNames.join(", ")}.`);
    }
    setBusy(false);
  }

  if (loading) return <div className="panel">Loading Bingo Celebration entries…</div>;
  if (!session) return <div className="panel"><h2>Staff sign-in required</h2><p>Sign in through the protected administrator portal to manage the drawing.</p></div>;
  if (!authorized) return <div className="panel"><h2>Access not assigned</h2><p>{message}</p></div>;

  return <div className="bingo-admin-workspace">
    {message && <div className={message.includes("complete") ? "notice notice--success" : "notice"} role="status">{message}</div>}
    <div className="stat-grid">
      <div className="stat-card"><strong>{submissions.length}</strong><span>Bingo uploads</span></div>
      <div className="stat-card"><strong>{eligibleCount}</strong><span>eligible for next draw</span></div>
      <div className="stat-card"><strong>{winnerTotal}</strong><span>gift-card winners</span></div>
      <div className="stat-card"><strong>{bonusTotal}</strong><span>bonus points awarded</span></div>
    </div>

    <section className="panel bingo-draw-panel">
      <div><p className="eyebrow">FAIR RANDOM DRAW</p><h2>Generate Starbucks winners</h2><p>Only valid submitted sheets that have not already won are included. The draw order and staff action are saved to the audit record.</p></div>
      <label className="field"><span>Number of winners</span><input type="number" min="1" max={Math.min(20, Math.max(1, eligibleCount))} value={winnerCount} onChange={(event) => setWinnerCount(Math.max(1, Math.min(20, Number(event.target.value))))} /></label>
      <label className="field"><span>Drawing note</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <button className="button button--lipstick" type="button" disabled={busy || eligibleCount < winnerCount || reason.trim().length < 5} onClick={() => void drawWinners()}>{busy ? "Drawing…" : `Draw ${winnerCount} winner${winnerCount === 1 ? "" : "s"}`}</button>
      {eligibleCount < winnerCount && <small>Wait until at least {winnerCount} eligible sheets have been submitted.</small>}
    </section>

    <section className="panel">
      <div className="record-heading"><div><p className="eyebrow">SUBMITTED SHEETS</p><h2>Celebration entry roster</h2></div><span className="status status--gold">+5 each</span></div>
      {submissions.length ? <div className="bingo-entry-grid">{submissions.map((item) => {
        const contestant = contestantById.get(item.contestant_id);
        return <article className={item.status === "winner" ? "bingo-entry-card bingo-entry-card--winner" : "bingo-entry-card"} key={item.id}>
          <span aria-hidden="true">{item.status === "winner" ? "★" : "✓"}</span>
          <div><strong>{contestant?.public_name || "Accepted contestant"}</strong><small>{contestant?.college || "School not listed"}<br />{new Date(item.submitted_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small></div>
          <b>{item.status === "winner" ? "STARBUCKS WINNER" : `+${item.bonus_points} BONUS`}</b>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer">Review sheet ↗</a>}
        </article>;
      })}</div> : <p>No Bingo sheets have been uploaded yet. This list will update as contestants submit from their portals.</p>}
    </section>
  </div>;
}
