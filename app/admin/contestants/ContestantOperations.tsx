"use client";

import { useEffect, useMemo, useState } from "react";
import { rubric } from "@/lib/competition";
import { getStoredSession, publicFileUrl, rest } from "@/lib/supabase-browser";

type Role = { role: string; active: boolean };
type Contestant = { id: string; user_id: string; public_slug: string | null; public_name: string | null; college: string | null; headshot_public_path: string | null; campaign_video_url: string | null; instagram_url?: string | null; public_profile_status: string; updated_at: string };
type Profile = { user_id: string; legal_name: string | null; preferred_name: string | null; email: string; college: string | null };
type Operation = { contestant_id: string; training_registered: boolean; training_attended: boolean; training_participation_complete: boolean; service_complete: boolean; instagram_video_posted: boolean; announcement_graphic_sent: boolean; voting_graphic_sent: boolean; recommendation_letter_ready: boolean; verified_service_hours: number; internal_notes: string | null };
type Score = { contestant_id: string; category: string; points: number };
type Vote = { contestant_id: string; verified_votes: number; audit_status: string };

const defaultOperation = (contestantId: string): Operation => ({ contestant_id: contestantId, training_registered: false, training_attended: false, training_participation_complete: false, service_complete: false, instagram_video_posted: false, announcement_graphic_sent: false, voting_graphic_sent: false, recommendation_letter_ready: false, verified_service_hours: 0, internal_notes: null });
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function ContestantOperations() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const session = getStoredSession();

  useEffect(() => {
    void (async () => {
      if (!session) { setLoading(false); return; }
      const roles = await rest<Role[]>(`pgws_user_roles?user_id=eq.${session.user.id}&active=eq.true&select=role,active`);
      const ok = Boolean(roles.data?.some((item) => ["reviewer", "competition_admin", "super_admin"].includes(item.role)));
      setAuthorized(ok);
      if (!ok) { setMessage(roles.error || "Competition administrator access is required."); setLoading(false); return; }
      const [contestantResult, profileResult, operationResult, scoreResult, voteResult] = await Promise.all([
        rest<Contestant[]>("pgws_contestants?public_profile_status=neq.archived&select=*&order=public_name.asc"),
        rest<Profile[]>("pgws_profiles?select=user_id,legal_name,preferred_name,email,college&order=legal_name.asc"),
        rest<Operation[]>("pgws_contestant_operations?select=*"),
        rest<Score[]>("pgws_performance_scores?select=contestant_id,category,points"),
        rest<Vote[]>("pgws_vote_totals?select=contestant_id,verified_votes,audit_status"),
      ]);
      setContestants(contestantResult.data || []);
      setProfiles(profileResult.data || []);
      setOperations(operationResult.data || []);
      setScores(scoreResult.data || []);
      setVotes(voteResult.data || []);
      setMessage(contestantResult.error || operationResult.error || scoreResult.error || voteResult.error || "");
      setLoading(false);
    })();
  }, [session?.user.id]);

  const profileByUser = useMemo(() => new Map(profiles.map((item) => [item.user_id, item])), [profiles]);
  const operationByContestant = useMemo(() => new Map(operations.map((item) => [item.contestant_id, item])), [operations]);
  const scoreByContestant = useMemo(() => {
    const result = new Map<string, number>();
    for (const score of scores) result.set(score.contestant_id, (result.get(score.contestant_id) || 0) + Number(score.points));
    return result;
  }, [scores]);
  const voteByContestant = useMemo(() => new Map(votes.map((item) => [item.contestant_id, item])), [votes]);
  const filtered = contestants.filter((item) => {
    const profile = profileByUser.get(item.user_id);
    const haystack = `${item.public_name || ""} ${item.college || ""} ${profile?.email || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase().trim()) && (statusFilter === "all" || item.public_profile_status === statusFilter);
  });

  async function updateOperation(contestantId: string, field: keyof Operation, value: boolean | number | string | null) {
    const current = operationByContestant.get(contestantId) || defaultOperation(contestantId);
    const next = { ...current, [field]: value };
    setOperations((items) => [...items.filter((item) => item.contestant_id !== contestantId), next]);
    setBusyId(contestantId);
    const result = await rest<Operation[]>("rpc/pgws_staff_update_contestant_operations", { method: "POST", body: JSON.stringify({ p_contestant_id: contestantId, p_updates: { [field]: value }, p_reason: "Updated accepted contestant tracker." }) });
    setBusyId("");
    if (result.error) { setMessage(result.error); setOperations((items) => [...items.filter((item) => item.contestant_id !== contestantId), current]); }
    else setMessage("Tracker saved.");
  }

  async function setPublication(contestantId: string, publish: boolean) {
    setBusyId(contestantId);
    const result = await rest<Contestant[]>("rpc/pgws_staff_publish_profile", { method: "POST", body: JSON.stringify({ p_contestant_id: contestantId, p_publish: publish, p_reason: publish ? "Staff verified campaign profile readiness." : "Staff hid profile for correction or safety review." }) });
    setBusyId("");
    if (result.error) { setMessage(result.error); return; }
    const updated = result.data?.[0];
    if (updated) setContestants((items) => items.map((item) => item.id === updated.id ? updated : item));
    setMessage(publish ? "Profile published." : "Profile hidden from the public gallery.");
  }

  function exportVotingRoster() {
    const headings = ["Contestant ID", "Public name", "Legal name", "Email", "School", "Headshot URL", "Profile status", "Video link", "Instagram link", "Performance points", "Verified votes"];
    const rows = contestants.map((item) => { const profile = profileByUser.get(item.user_id); return [item.id, item.public_name, profile?.legal_name, profile?.email, item.college || profile?.college, item.headshot_public_path ? publicFileUrl(item.headshot_public_path) : "", item.public_profile_status, item.campaign_video_url, item.instagram_url, scoreByContestant.get(item.id) || 0, voteByContestant.get(item.id)?.verified_votes || 0]; });
    const blob = new Blob(["\uFEFF", [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `miss-pgws-voting-roster-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
  }

  if (loading) return <div className="panel">Loading the accepted contestant command center…</div>;
  if (!session || !authorized) return <div className="panel"><h2>Authorized staff access required</h2><p>{message}</p></div>;

  const published = contestants.filter((item) => item.public_profile_status === "published").length;
  const videoReady = contestants.filter((item) => item.campaign_video_url).length;
  const trainingRegistered = operations.filter((item) => item.training_registered).length;

  return <>
    {message && <div className={message.includes("saved") || message.includes("published") ? "notice notice--success" : "notice"} role="status">{message}</div>}
    <div className="stat-grid">
      <div className="stat-card"><strong>{contestants.length}</strong><span>active accepted contestants</span></div>
      <div className="stat-card"><strong>{published}</strong><span>profiles published</span></div>
      <div className="stat-card"><strong>{videoReady}</strong><span>campaign videos ready</span></div>
      <div className="stat-card"><strong>{trainingRegistered}</strong><span>training registrations tracked</span></div>
    </div>
    <section className="panel">
      <div className="command-bar"><div><p className="eyebrow">ACCEPTED COHORT ONLY</p><h2>Contestant command center</h2><p className="field-help">Non-accepted application records remain safely preserved outside this active workspace.</p></div><button className="button button--ink button--small" onClick={exportVotingRoster}>Export Jotform & Stripe roster</button></div>
      <div className="command-filters"><label className="field"><span>Search name, school, or email</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…" /></label><label className="field"><span>Profile status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All active</option><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="hidden">Hidden</option></select></label></div>
      <div className="table-wrap"><table className="data-table operations-table"><thead><tr><th>Contestant</th><th>Profile</th><th>Video / IG</th><th>Training</th><th>Service</th><th>Graphics</th><th>Points</th><th>Votes</th><th>Action</th></tr></thead><tbody>{filtered.map((item) => { const profile = profileByUser.get(item.user_id); const operation = operationByContestant.get(item.id) || defaultOperation(item.id); return <tr key={item.id}><td><strong>{item.public_name || profile?.preferred_name || profile?.legal_name || "Accepted contestant"}</strong><small>{item.college || profile?.college || "School missing"}</small><small>{profile?.email || "Email unavailable"}</small></td><td><span className={`status ${item.public_profile_status === "published" ? "status--green" : ""}`}>{item.public_profile_status}</span></td><td><span className={item.campaign_video_url ? "tracker-yes" : "tracker-no"}>{item.campaign_video_url ? "Video ✓" : "Video ○"}</span><span className={item.instagram_url ? "tracker-yes" : "tracker-no"}>{item.instagram_url ? "IG ✓" : "IG ○"}</span></td><td><label className="mini-check"><input type="checkbox" checked={operation.training_registered} onChange={(event) => void updateOperation(item.id, "training_registered", event.target.checked)} />Registered</label><label className="mini-check"><input type="checkbox" checked={operation.training_attended} onChange={(event) => void updateOperation(item.id, "training_attended", event.target.checked)} />Attended</label></td><td><label className="mini-check"><input type="checkbox" checked={operation.service_complete} onChange={(event) => void updateOperation(item.id, "service_complete", event.target.checked)} />Complete</label><label className="mini-hours">Hours <input type="number" min="0" max="500" step="0.5" value={operation.verified_service_hours} onChange={(event) => void updateOperation(item.id, "verified_service_hours", Number(event.target.value))} /></label></td><td><label className="mini-check"><input type="checkbox" checked={operation.announcement_graphic_sent} onChange={(event) => void updateOperation(item.id, "announcement_graphic_sent", event.target.checked)} />Announce</label><label className="mini-check"><input type="checkbox" checked={operation.voting_graphic_sent} onChange={(event) => void updateOperation(item.id, "voting_graphic_sent", event.target.checked)} />Voting</label></td><td><strong>{scoreByContestant.get(item.id) || 0}/100</strong><small>{rubric.length} categories</small></td><td><strong>{voteByContestant.get(item.id)?.verified_votes || 0}</strong><small>{voteByContestant.get(item.id)?.audit_status || "provisional"}</small></td><td><button className="button button--paper button--small" disabled={busyId === item.id} onClick={() => void setPublication(item.id, item.public_profile_status !== "published")}>{busyId === item.id ? "Saving…" : item.public_profile_status === "published" ? "Hide" : "Publish"}</button></td></tr>; })}</tbody></table></div>
      {!filtered.length && <p>No accepted contestants match these filters.</p>}
    </section>
  </>;
}
