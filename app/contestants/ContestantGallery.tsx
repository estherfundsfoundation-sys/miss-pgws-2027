"use client";

import { useEffect, useMemo, useState } from "react";
import content from "../../content/application-content.json";
import { publicFileUrl, publicRest } from "@/lib/supabase-browser";

type Contestant = {
  id: string;
  public_slug: string | null;
  public_name: string | null;
  college: string | null;
  biography: string | null;
  scripture: string | null;
  platform: string | null;
  headshot_public_path: string | null;
  campaign_video_url: string | null;
  instagram_url?: string | null;
  contestant_number: number | null;
};

function voteUrl(row: Contestant) {
  const query = new URLSearchParams({
    contestant_id: row.id,
    contestant_number: row.contestant_number ? String(row.contestant_number) : "",
    contestant_name: row.public_name || "",
    school: row.college || "",
  });
  return `${content.voting.jotformUrl}?${query.toString()}`;
}

function isDirectVideo(url: string) { return /\.(mp4|mov)(?:\?|$)/i.test(url); }

export function ContestantGallery() {
  const [rows, setRows] = useState<Contestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void (async () => {
      const result = await publicRest<Contestant[]>("pgws_contestants?public_profile_status=eq.published&select=id,public_slug,public_name,college,biography,scripture,platform,headshot_public_path,campaign_video_url,instagram_url,contestant_number&order=contestant_number.asc");
      setRows(result.data || []);
      setError(result.error || "");
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((row) => `${row.public_name || ""} ${row.college || ""} ${row.platform || ""}`.toLowerCase().includes(search.toLowerCase().trim())), [rows, search]);

  if (loading) return <div className="panel">Loading the official contestant class…</div>;
  if (error) return <div className="notice">{error}</div>;
  if (!rows.length) return <div className="contestant-coming-soon"><span>COMING NEXT</span><h2>The official contestant class will appear here.</h2><p>Accepted contestants publish their completed campaign profiles beginning August 22.</p></div>;

  return <>
    <div className="contestant-gallery-tools"><div><p className="eyebrow">THE NEW BEAUTY ISSUE</p><h2>{rows.length} published cover stories</h2></div><label className="field"><span>Find a contestant or school</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…" /></label></div>
    <div className="contestant-directory">{filtered.map((row) => <details className="contestant-directory-row" id={row.public_slug || row.id} key={row.id}>
      <summary><span className="contestant-directory-photo">{row.headshot_public_path ? <img src={publicFileUrl(row.headshot_public_path)} alt={`${row.public_name || "Contestant"} official headshot`} /> : <span>PGWS</span>}</span><span className="contestant-directory-identity"><small>{row.contestant_number ? `CONTESTANT #${String(row.contestant_number).padStart(3, "0")}` : "MISS PGWS 2027 CONTESTANT"}</small><strong>{row.public_name}</strong><span>{row.college || "University not listed"}</span></span><span className="contestant-directory-platform">{row.platform || "Open her profile to learn about her platform."}</span><span className="contestant-directory-open">View full profile <b aria-hidden>↓</b></span></summary>
      <div className="contestant-directory-details"><div>{row.platform && <><h3>Her platform</h3><p>{row.platform}</p></>}{row.biography && <><h3>Meet her</h3><p>{row.biography}</p></>}{row.scripture && <blockquote>{row.scripture}</blockquote>}</div><aside>{row.campaign_video_url && <div className="campaign-video"><p className="eyebrow">WATCH HER CAMPAIGN</p>{isDirectVideo(row.campaign_video_url) ? <video controls preload="metadata" src={row.campaign_video_url}>Your browser cannot play this campaign video.</video> : <a className="button button--paper button--wide" href={row.campaign_video_url} target="_blank" rel="noreferrer">Watch her campaign video ↗</a>}</div>}<div className="contestant-card-actions">{row.instagram_url && <a className="button button--paper" href={row.instagram_url} target="_blank" rel="noreferrer">Instagram ↗</a>}<a className="button button--lipstick" href={voteUrl(row)} target="_blank" rel="noreferrer">Vote with purpose ↗</a></div><p className="field-help">Each eligible $2.50 vote is a donation supporting the scholarship competition and mission. Final totals require verification and audit.</p></aside></div>
    </details>)}</div>
    {!filtered.length && <div className="panel">No published profile matches that search.</div>}
  </>;
}
