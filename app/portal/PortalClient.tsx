"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredSession, rest } from "@/lib/supabase-browser";

type Application = { id: string; status: string; completion_percent: number; agreement_status: string; updated_at: string };

export function PortalClient() {
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const session = getStoredSession();

  useEffect(() => {
    void (async () => {
      if (!session) { setLoading(false); return; }
      const result = await rest<Application[]>(`pgws_applications?user_id=eq.${session.user.id}&select=id,status,completion_percent,agreement_status,updated_at&limit=1`);
      if (result.error && result.status !== 404) setError(result.error);
      setApplication(result.data?.[0] ?? null);
      setLoading(false);
    })();
  }, [session?.user.id]);

  if (loading) return <div className="panel">Loading your secure workspace…</div>;
  if (!session) return <div className="panel"><h2>Please sign in</h2><p>Your application and documents are private.</p><Link className="button button--lipstick" href="/login">Sign in</Link></div>;

  const completion = application?.completion_percent ?? 0;
  const status = application?.status ?? "Draft not started";
  const accepted = application?.status === "accepted";

  return <>
    <div className="notice notice--success"><span>◆</span><div><strong>Signed in as {session.user.email}</strong><br />Your account keeps one continuous record from applicant to contestant—no second account is needed.</div></div>
    {error && <div className="notice" style={{ marginTop: 16 }}>{error}</div>}
    <div className="stat-grid" style={{ marginTop: 24 }}>
      <div className="stat-card"><strong>{completion}%</strong><span>application complete</span></div>
      <div className="stat-card"><strong>{application?.agreement_status === "signed" ? "15" : "0"}/15</strong><span>required initials</span></div>
      <div className="stat-card"><strong>{status}</strong><span>current status</span></div>
      <div className="stat-card"><strong>ET</strong><span>official timezone</span></div>
    </div>
    <section className="panel">
      <p className="eyebrow">YOUR NEXT STEP</p>
      <h2>{accepted ? "Step into your contestant studio" : application ? "Review your application record" : "Begin your application"}</h2>
      <p>{accepted ? "Create the campaign profile supporters will see, add your video and Instagram post, follow your points, and publish when every item is ready." : "Complete all seven sections, upload your materials, read the entire agreement, and review every deadline."}</p>
      <div className="hero-actions">{accepted ? <Link className="button button--lipstick" href="/portal/campaign">Open contestant studio</Link> : <Link className="button button--lipstick" href="/application">Open application</Link>}<Link className="button button--paper" href="/timeline">View official calendar</Link></div>
    </section>
    {accepted && <section className="panel campaign-access"><p className="eyebrow">ACCEPTED CONTESTANT</p><h2>The world has a beauty issue—and your voice belongs in it.</h2><p>Your live studio includes the official campaign question, profile-readiness checklist, publication button, scoring breakdown, and campaign deadlines.</p><Link className="button button--lipstick" href="/portal/campaign">Build and publish my profile</Link></section>}
    <section className="panel"><h2>Your competition workspace</h2><div className="editorial-grid" style={{ marginTop: 18 }}>
      <article className="editorial-card" data-number="01"><h3>Application</h3><p>Your original application and acceptance record stay safely connected to this account.</p><Link href="/application">Open application →</Link></article>
      <article className="editorial-card" data-number="02"><h3>Contestant studio</h3><p>Headshot, story, platform, campaign video, Instagram link, points, and publication.</p><Link href="/portal/campaign">Open studio →</Link></article>
      <article className="editorial-card editorial-card--accent" data-number="03"><h3>Calendar</h3><p>Training, profile, voting, audit, and crowning dates all use Eastern Time.</p><Link href="/timeline">View official timeline →</Link></article>
    </div></section>
  </>;
}
