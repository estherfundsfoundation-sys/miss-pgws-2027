"use client";

import { useEffect, useMemo, useState } from "react";
import { rubric } from "@/lib/competition";
import { getStoredSession, rest } from "@/lib/supabase-browser";

type Role = { role: string; active: boolean };
type Contestant = { id: string; public_name: string | null; college: string | null; public_profile_status: string };
type Score = { contestant_id: string; category: string; points: number; max_points: number };

export function ScoringWorkspace() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const session = getStoredSession();

  useEffect(() => {
    void (async () => {
      if (!session) { setLoading(false); return; }
      const roles = await rest<Role[]>(`pgws_user_roles?user_id=eq.${session.user.id}&active=eq.true&select=role,active`);
      if (!roles.data?.some((item) => ["reviewer", "competition_admin", "super_admin"].includes(item.role))) { setMessage("Authorized reviewer access is required."); setLoading(false); return; }
      const [contestantResult, scoreResult] = await Promise.all([
        rest<Contestant[]>("pgws_contestants?public_profile_status=neq.archived&select=id,public_name,college,public_profile_status&order=public_name.asc"),
        rest<Score[]>("pgws_performance_scores?select=contestant_id,category,points,max_points"),
      ]);
      setContestants(contestantResult.data || []); setScores(scoreResult.data || []); setMessage(contestantResult.error || scoreResult.error || ""); setLoading(false);
    })();
  }, [session?.user.id]);

  const selectedScores = useMemo(() => new Map(scores.filter((score) => score.contestant_id === selectedId).map((score) => [score.category, score])), [scores, selectedId]);
  const values = Object.fromEntries(rubric.map((item) => [item.key, draft[item.key] ?? Number(selectedScores.get(item.key)?.points || 0)]));
  const total = rubric.reduce((sum, item) => sum + Number(values[item.key] || 0), 0);

  function selectContestant(id: string) { setSelectedId(id); setDraft({}); setReason(""); setMessage(""); }

  async function saveScores() {
    if (!selectedId || reason.trim().length < 5) { setMessage("Select a contestant and enter a scoring note of at least 5 characters."); return; }
    setBusy(true); setMessage("Saving all seven rubric categories…");
    const results = await Promise.all(rubric.map((item) => rest<Score[]>("rpc/pgws_staff_save_performance_score", { method: "POST", body: JSON.stringify({ p_contestant_id: selectedId, p_category: item.key, p_points: Number(values[item.key] || 0), p_reason: reason }) })));
    const error = results.find((result) => result.error)?.error;
    if (error) setMessage(error);
    else {
      const saved = results.flatMap((result) => result.data || []);
      setScores((items) => [...items.filter((item) => item.contestant_id !== selectedId), ...saved]);
      setMessage("Scores saved and now visible to the contestant in her private profile.");
    }
    setBusy(false);
  }

  if (loading) return <div className="panel">Loading the official scoring workspace…</div>;

  return <div className="scoring-workspace">
    {message && <div className={message.includes("saved") ? "notice notice--success" : "notice"} role="status">{message}</div>}
    <section className="panel scoring-selector"><label className="field"><span>Accepted contestant</span><select value={selectedId} onChange={(event) => selectContestant(event.target.value)}><option value="">Choose a contestant…</option>{contestants.map((item) => <option value={item.id} key={item.id}>{item.public_name || "Accepted contestant"} — {item.college || "School not listed"}</option>)}</select></label>{selectedId && <div className="scoring-total"><strong>{total}/100</strong><span>performance points · contributes {(total * 0.15).toFixed(2)} of 15 final-score points</span></div>}</section>
    <section className="panel"><div className="record-heading"><div><p className="eyebrow">OFFICIAL PERFORMANCE RUBRIC</p><h2>Score with evidence</h2></div><span className="status status--gold">15% of final placement</span></div><p className="field-help">Verified voting contributes the other 85%. Enter only supported scores; every save is attributed and audited.</p><div className="scoring-grid">{rubric.map((item) => <label className="score-input" key={item.key}><span>{item.label}</span><div><input type="number" min="0" max={item.max} step="0.5" disabled={!selectedId} value={values[item.key]} onChange={(event) => setDraft((current) => ({ ...current, [item.key]: Math.max(0, Math.min(item.max, Number(event.target.value))) }))} /><strong>/ {item.max}</strong></div></label>)}</div><label className="field scoring-reason"><span>Scoring note / evidence</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Video reviewed against the published four-part criteria; training roster verified." /></label><button className="button button--lipstick" disabled={!selectedId || busy || reason.trim().length < 5} onClick={() => void saveScores()}>{busy ? "Saving…" : "Save all scores"}</button></section>
  </div>;
}
