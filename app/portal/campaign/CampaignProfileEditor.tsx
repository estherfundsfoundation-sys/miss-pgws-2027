"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { campaignDates, campaignGuideDownload, campaignQuestion, rubric } from "@/lib/competition";
import { getStoredSession, publicFileUrl, rest, uploadPublicFile } from "@/lib/supabase-browser";

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
  public_profile_status: string;
};
type Score = { category: string; points: number; max_points: number };
type VoteTotal = { verified_votes: number; audit_status: string };

const clean = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
const completeUrl = (value: string) => /^https?:\/\//i.test(value.trim());
const platformDraftStorageKey = "miss-pgws-2027-platform-generator-draft";

export function CampaignProfileEditor() {
  const [profile, setProfile] = useState<Contestant | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [votes, setVotes] = useState<VoteTotal | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [scripture, setScripture] = useState("");
  const [platform, setPlatform] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestedPlatformDraft, setSuggestedPlatformDraft] = useState("");

  useEffect(() => {
    void (async () => {
      const session = getStoredSession();
      if (!session) { setMessage("Please sign in to open your contestant workspace."); return; }
      const result = await rest<Contestant[]>(`pgws_contestants?user_id=eq.${session.user.id}&select=*&limit=1`);
      const row = result.data?.[0] ?? null;
      if (!row) { setMessage("This workspace opens after competition staff accepts your application."); return; }
      setProfile(row);
      setName(row.public_name || "");
      setBio(row.biography || "");
      setScripture(row.scripture || "");
      setPlatform(row.platform || "");
      setVideoUrl(row.campaign_video_url || "");
      setInstagramUrl(row.instagram_url || "");
      setSuggestedPlatformDraft(window.localStorage.getItem(platformDraftStorageKey) || "");
      const [scoreResult, voteResult] = await Promise.all([
        rest<Score[]>(`pgws_performance_scores?contestant_id=eq.${row.id}&select=category,points,max_points`),
        rest<VoteTotal[]>(`pgws_vote_totals?contestant_id=eq.${row.id}&select=verified_votes,audit_status&limit=1`),
      ]);
      setScores(scoreResult.data || []);
      setVotes(voteResult.data?.[0] || null);
    })();
  }, []);

  const checks = useMemo(() => [
    { label: "Public name", ready: name.trim().length >= 2 },
    { label: "Biography (40+ characters)", ready: bio.trim().length >= 40 },
    { label: "Service platform (40+ characters)", ready: platform.trim().length >= 40 },
    { label: "Signature scripture", ready: scripture.trim().length >= 2 },
    { label: "Official headshot", ready: Boolean(headshot || profile?.headshot_public_path) },
    { label: "Campaign video link", ready: Boolean(video || completeUrl(videoUrl)) },
    { label: "Instagram campaign post", ready: completeUrl(instagramUrl) },
  ], [bio, headshot, instagramUrl, name, platform, profile?.headshot_public_path, scripture, video, videoUrl]);
  const completion = Math.round((checks.filter((item) => item.ready).length / checks.length) * 100);
  const studioFinished = completion === 100 && profile?.public_profile_status === "published";
  const scoreByCategory = new Map(scores.map((score) => [score.category, score]));
  const awarded = rubric.reduce((sum, item) => sum + Number(scoreByCategory.get(item.key)?.points || 0), 0);

  async function uploadSelectedFiles(sessionUserId: string) {
    let headshotPath = profile?.headshot_public_path || "";
    let savedVideoUrl = videoUrl.trim();
    if (headshot) {
      headshotPath = `${sessionUserId}/profile/${Date.now()}-${clean(headshot.name)}`;
      const uploaded = await uploadPublicFile(headshotPath, headshot);
      if (uploaded.error) throw new Error(uploaded.error);
    }
    if (video) {
      const videoPath = `${sessionUserId}/campaign/${Date.now()}-${clean(video.name)}`;
      const uploaded = await uploadPublicFile(videoPath, video);
      if (uploaded.error) throw new Error(uploaded.error);
      savedVideoUrl = publicFileUrl(videoPath);
      setVideoUrl(savedVideoUrl);
    }
    return { headshotPath, savedVideoUrl };
  }

  async function save(publish: boolean) {
    const session = getStoredSession();
    if (!session || !profile) return;
    setBusy(true);
    setMessage(publish ? "Publishing your campaign profile…" : "Saving your private draft…");
    try {
      const { headshotPath, savedVideoUrl } = await uploadSelectedFiles(session.user.id);
      const endpoint = publish ? "rpc/pgws_publish_campaign_profile" : "rpc/pgws_save_campaign_draft";
      const saved = await rest<Contestant[]>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          p_public_name: name,
          p_biography: bio,
          p_scripture: scripture,
          p_platform: platform,
          p_headshot_public_path: headshotPath,
          p_campaign_video_url: savedVideoUrl,
          p_instagram_url: instagramUrl,
        }),
      });
      if (saved.error) throw new Error(saved.error);
      setProfile(saved.data?.[0] ?? {
        ...profile,
        public_name: name,
        biography: bio,
        scripture,
        platform,
        headshot_public_path: headshotPath,
        campaign_video_url: savedVideoUrl,
        instagram_url: instagramUrl,
        public_profile_status: publish ? "published" : profile.public_profile_status,
      });
      setHeadshot(null);
      setVideo(null);
      setMessage(publish
        ? "Your Contestant Studio is finished and live! Review your public profile, then celebrate this milestone."
        : "Draft saved. Nothing new is public until you choose Publish profile.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Your profile could not be saved.");
    } finally { setBusy(false); }
  }

  if (!profile) return <div className="panel"><h2>Campaign profile access</h2><p>{message || "Loading your accepted-contestant record…"}</p></div>;

  return <div className="campaign-studio">
    <section className="campaign-cover-card">
      <img src="/new-beauty-issue-hero.png" alt="The World Has a Beauty Issue — Find Your Pretty in Christ" />
      <div><p className="eyebrow">YOUR OFFICIAL CAMPAIGN PROMPT</p><h2>Make this unmistakably you.</h2><blockquote>{campaignQuestion}</blockquote><p>There is no required minimum or maximum length. Be creative. A focused 90-second to 3-minute story is only a helpful recommendation—not a rule.</p><a className="button button--paper button--small" href={campaignGuideDownload} target="_blank">Open campaign guide ↗</a></div>
    </section>

    {studioFinished ? <section className="campaign-finished-card" aria-live="polite">
      <span className="campaign-finished-card__seal" aria-hidden="true">✓</span>
      <div><p className="eyebrow eyebrow--light">STUDIO COMPLETE</p><h2>You finished your Contestant Studio!</h2><p>Every required item is complete and your public profile is published. Review it once like a supporter, keep your links public, and return only when you need to make an update.</p></div>
      <Link className="button button--paper" href={`/contestants#${profile.public_slug || profile.id}`}>View my finished profile</Link>
    </section> : completion === 100 ? <section className="campaign-ready-card">
      <span aria-hidden="true">✦</span><div><p className="eyebrow">ONE FINAL STEP</p><h2>Your Studio is ready to finish.</h2><p>All seven readiness checks are complete. Review your information once, then select <b>Finish &amp; publish my Studio</b> below.</p></div>
    </section> : null}

    <div className="campaign-studio-grid">
      <section className="panel campaign-progress-card">
        <div className="record-heading"><div><p className="eyebrow">PUBLICATION READINESS</p><h2>{studioFinished ? "Studio finished" : `${completion}% ready`}</h2></div><span className={`status ${profile.public_profile_status === "published" ? "status--green" : ""}`}>{studioFinished ? "complete" : profile.public_profile_status.replace(/_/g, " ")}</span></div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${completion}%` }} /></div>
        <div className="readiness-list">{checks.map((item) => <div key={item.label}><span aria-hidden>{item.ready ? "✓" : "○"}</span><span>{item.label}</span></div>)}</div>
        {message && <div className={message.includes("live") || message.includes("saved") ? "notice notice--success" : "notice"} role="status">{message}</div>}
      </section>

      <section className="panel campaign-score-card">
        <div className="record-heading"><div><p className="eyebrow">YOUR POINTS</p><h2>{awarded}/100</h2></div><span className="status status--gold">{votes?.verified_votes ?? 0} verified votes</span></div>
        <p className="field-help">Points appear after staff records each category. Voting remains provisional until the official audit.</p>
        <div className="score-list">{rubric.map((item) => { const score = scoreByCategory.get(item.key); return <div key={item.key}><span>{item.label}</span><strong>{score ? `${Number(score.points)}/${item.max}` : `Pending / ${item.max}`}</strong></div>; })}</div>
      </section>
    </div>

    <section className="panel campaign-editor-panel" id="campaign-profile">
      <div className="record-heading"><div><p className="eyebrow">CAMPAIGN PROFILE STUDIO</p><h2>Build your cover story</h2></div><span className="campaign-school">{profile.college || "College not listed"}</span></div>
      <div className="notice"><span>◆</span><div><strong>Public means public.</strong><br />Use your public-facing name and do not include a home address, student ID, private phone number, password, or other sensitive information.</div></div>
      <div className="form-grid">
        <label className="field"><span>Public name</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label className="field field--wide"><span>Biography</span><textarea rows={7} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Share your faith, story, leadership, service, and the woman you are becoming." required /><small>{bio.length} characters · minimum 40</small></label>
        {suggestedPlatformDraft && <div className="platform-draft-import field--wide"><div><p className="eyebrow">PLATFORM PLAN READY</p><strong>Your Platform Points Generator draft followed you here.</strong><p>Review it before adding it. Your current Studio text will not change unless you choose to use the draft.</p></div><div><button className="button button--lipstick button--small" type="button" onClick={() => { setPlatform(suggestedPlatformDraft); setSuggestedPlatformDraft(""); window.localStorage.removeItem(platformDraftStorageKey); }}>Add plan to my platform</button><button className="button button--paper button--small" type="button" onClick={() => { setSuggestedPlatformDraft(""); window.localStorage.removeItem(platformDraftStorageKey); }}>Dismiss</button></div></div>}
        <label className="field field--wide"><span>Service and advocacy platform</span><textarea rows={10} value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="What issue will you advocate for, and what action do you want others to take?" required /><small>{platform.length} characters · minimum 40</small><Link className="field-help-link" href="/road-to-the-crown#platform-lab">Need help? Open the Platform Points Generator →</Link></label>
        <label className="field field--wide"><span>Signature scripture</span><input value={scripture} onChange={(event) => setScripture(event.target.value)} placeholder="Example: Psalm 139:14 — I am fearfully and wonderfully made." required /></label>
        <label className="field"><span>Official headshot</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setHeadshot(event.target.files?.[0] || null)} /><small>JPG, PNG, or WebP. Portrait orientation; no private information.</small></label>
        <label className="field"><span>Optional direct video upload</span><input type="file" accept="video/mp4,video/quicktime" onChange={(event) => setVideo(event.target.files?.[0] || null)} /><small>MP4 or MOV, up to 250 MB. A pasted link also works.</small></label>
        <label className="field field--wide"><span>Campaign video link</span><input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://…" /><small>Paste your YouTube, Vimeo, or direct video link. Confirm viewers do not need permission.</small></label>
        <label className="field field--wide"><span>Instagram campaign post link</span><input type="url" value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="https://www.instagram.com/…" /><small>Post your campaign video on Instagram, then paste the public post or Reel link here.</small></label>
      </div>
      <div className="campaign-publish-actions">
        <button className="button button--paper" disabled={busy || name.trim().length < 2} onClick={() => void save(false)}>{busy ? "Working…" : "Save private draft"}</button>
        <button className="button button--lipstick" disabled={busy || completion < 100} onClick={() => void save(true)}>{busy ? "Working…" : profile.public_profile_status === "published" ? "Update finished Studio" : "Finish & publish my Studio"}</button>
        {profile.public_profile_status === "published" && <Link className="button button--ink" href={`/contestants#${profile.public_slug || profile.id}`}>View live profile</Link>}
      </div>
    </section>

    <section className="panel"><p className="eyebrow">YOUR CAMPAIGN CLOCK</p><h2>Every deadline in one place</h2><div className="deadline-list">{campaignDates.map(([label, date]) => <div className="deadline-item" key={label}><b>{label}</b><span>{date}</span></div>)}</div></section>
  </div>;
}
