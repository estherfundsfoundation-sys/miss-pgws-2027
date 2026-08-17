"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { publicFileUrl } from "@/lib/supabase-browser";

type Contestant = {
  id: string;
  public_slug: string | null;
  public_name: string | null;
  college: string | null;
  contestant_number: number | null;
  headshot_public_path: string | null;
};

type VoteTotal = {
  contestant_id: string;
  verified_votes: number;
  verified_amount_cents: number;
  provisional_rank: number | null;
  last_synced_at: string | null;
  audit_status: "provisional" | "under_audit" | "final";
};

type Leader = Contestant & VoteTotal & { display_rank: number };
type LeaderboardResponse = { rows?: Array<Contestant & VoteTotal>; votingOpen?: boolean; error?: string };

function profileHref(row: Contestant) {
  return `/contestants#${row.public_slug || row.id}`;
}

function formatSync(value: string | null) {
  if (!value) return "Awaiting first verified payment";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function LeaderboardClient() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [totals, setTotals] = useState<VoteTotal[]>([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    const response = await fetch("/api/voting/leaderboard", { cache: "no-store" });
    const result = await response.json().catch(() => ({})) as LeaderboardResponse;
    const rows = result.rows || [];
    setContestants(rows);
    setTotals(rows.map((row) => ({ contestant_id: row.id, verified_votes: row.verified_votes, verified_amount_cents: row.verified_amount_cents, provisional_rank: row.provisional_rank, last_synced_at: row.last_synced_at, audit_status: row.audit_status })));
    setVotingOpen(Boolean(result.votingOpen));
    setError(response.ok ? "" : result.error || "The live totals could not load.");
    setLastRefresh(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const leaders = useMemo<Leader[]>(() => {
    const byContestant = new Map(totals.map((row) => [row.contestant_id, row]));
    return contestants
      .map((row) => ({
        ...row,
        ...(byContestant.get(row.id) || {
          contestant_id: row.id,
          verified_votes: 0,
          verified_amount_cents: 0,
          provisional_rank: null,
          last_synced_at: null,
          audit_status: "provisional" as const,
        }),
      }))
      .sort((a, b) => b.verified_votes - a.verified_votes || (a.contestant_number || 999) - (b.contestant_number || 999) || (a.public_name || "").localeCompare(b.public_name || ""))
      .map((row) => ({ ...row, display_rank: row.provisional_rank || 0 }));
  }, [contestants, totals]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leaders;
    return leaders.filter((row) => `${row.public_name || ""} ${row.college || ""} ${row.contestant_number || ""}`.toLowerCase().includes(query));
  }, [leaders, search]);

  if (loading) return <div className="leaderboard-state">Opening the verified leaderboard…</div>;

  return <div className="live-leaderboard">
    <div className={`leaderboard-status ${votingOpen ? "leaderboard-status--live" : ""}`}>
      <div><span className="live-dot" aria-hidden="true" /><strong>{votingOpen ? "LIVE VERIFIED VOTING" : "PREVIEW MODE"}</strong><small>{votingOpen ? "Totals refresh automatically every 60 seconds." : "The board will begin ranking contestants when official voting opens."}</small></div>
      <button type="button" onClick={() => void load(true)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh totals"}</button>
    </div>

    {error && <div className="notice"><span>◆</span><div><strong>The live totals could not load.</strong><br />{error}</div></div>}

    <div className="leaderboard-tools">
      <div><p className="eyebrow">OFFICIAL CONTESTANT RANKINGS</p><h2>{leaders.length || 142} women. One purpose.</h2></div>
      <label className="field"><span>Find a contestant, number, or school</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the leaderboard…" /></label>
    </div>

    {!leaders.length ? <div className="leaderboard-state"><strong>Contestant profiles are preparing for publication.</strong><span>The official roster will connect here as profiles are approved.</span></div> : <div className="leaderboard-list">
      {visible.map((row) => <article className="leader-row leader-row--live" key={row.id}>
        <div className="leader-rank" aria-label={row.display_rank ? `Rank ${row.display_rank}` : "Not ranked yet"}>{row.display_rank || "—"}</div>
        <Link className="leader-photo" href={profileHref(row)} aria-label={`Open ${row.public_name || "contestant"} profile`}>
          {row.headshot_public_path ? <img src={publicFileUrl(row.headshot_public_path)} alt="" /> : <span>PGWS</span>}
        </Link>
        <div className="leader-name">
          <small>{row.contestant_number ? `CONTESTANT #${String(row.contestant_number).padStart(3, "0")}` : "MISS PGWS 2027"}</small>
          <Link href={profileHref(row)}><strong>{row.public_name || "Official contestant"}</strong></Link>
          <span>{row.college || "College profile publishing soon"}</span>
        </div>
        <div className="leader-votes"><strong>{row.verified_votes.toLocaleString()}</strong><span>verified votes</span></div>
        <div className="leader-audit"><span>{row.audit_status.replace("_", " ")}</span><small>{formatSync(row.last_synced_at)}</small></div>
      </article>)}
    </div>}

    {leaders.length > 0 && !visible.length && <div className="leaderboard-state">No contestant matches that search.</div>}
    <p className="leaderboard-refresh-note">Last page refresh: {lastRefresh ? lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}. Rankings remain provisional until the September 4 audit.</p>
  </div>;
}
