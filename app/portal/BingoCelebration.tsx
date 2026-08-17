"use client";

import { useEffect, useState } from "react";
import { createPrivateFileUrl, getStoredSession, rest, uploadPrivateFile } from "@/lib/supabase-browser";

type Contestant = { id: string; public_name: string | null };
type BingoSubmission = {
  id: string;
  contestant_id: string;
  object_path: string;
  original_name: string;
  content_type: string;
  byte_size: number;
  status: "submitted" | "winner" | "ineligible";
  bonus_points: number;
  submitted_at: string;
};

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const clean = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");

export function BingoCelebration() {
  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [submission, setSubmission] = useState<BingoSubmission | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [privateUrl, setPrivateUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = getStoredSession();
      if (!session) return;
      const contestantResult = await rest<Contestant[]>(`pgws_contestants?user_id=eq.${session.user.id}&select=id,public_name&limit=1`);
      const row = contestantResult.data?.[0] ?? null;
      setContestant(row);
      if (!row) return;
      const bingoResult = await rest<BingoSubmission[]>(`pgws_bingo_submissions?contestant_id=eq.${row.id}&select=id,contestant_id,object_path,original_name,content_type,byte_size,status,bonus_points,submitted_at&limit=1`);
      const bingo = bingoResult.data?.[0] ?? null;
      setSubmission(bingo);
      if (bingo) {
        const signed = await createPrivateFileUrl(bingo.object_path);
        setPrivateUrl(signed.data?.signedURL || "");
      }
    })();
  }, []);

  function chooseFile(selected: File | null) {
    setMessage("");
    if (!selected) { setFile(null); return; }
    if (!allowedTypes.has(selected.type)) { setFile(null); setMessage("Upload a JPG, PNG, WebP, or PDF Bingo sheet."); return; }
    if (selected.size > 15 * 1024 * 1024) { setFile(null); setMessage("Your Bingo sheet must be 15 MB or smaller."); return; }
    setFile(selected);
  }

  async function submitBingo() {
    const session = getStoredSession();
    if (!session || !contestant || !file || !confirmed) return;
    setBusy(true);
    setMessage("Uploading your completed Bingo sheet…");
    try {
      const objectPath = `${session.user.id}/bingo/${contestant.id}/${Date.now()}-${clean(file.name)}`;
      const uploaded = await uploadPrivateFile(objectPath, file);
      if (uploaded.error) throw new Error(uploaded.error);
      const saved = await rest<BingoSubmission[]>("rpc/pgws_submit_bingo_sheet", {
        method: "POST",
        body: JSON.stringify({
          p_object_path: objectPath,
          p_original_name: file.name,
          p_content_type: file.type,
          p_byte_size: file.size,
          p_integrity_confirmed: true,
        }),
      });
      if (saved.error) throw new Error(saved.error);
      const row = saved.data?.[0] ?? null;
      setSubmission(row);
      setFile(null);
      setConfirmed(false);
      if (row) {
        const signed = await createPrivateFileUrl(row.object_path);
        setPrivateUrl(signed.data?.signedURL || "");
      }
      setMessage("Bingo complete! Your participation bonus and Starbucks drawing entry are confirmed.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Your Bingo sheet could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (!contestant) return null;

  return <section className="panel bingo-celebration" id="bingo-celebration">
    <div className="bingo-celebration__heading">
      <div><p className="eyebrow">QUEEN TRAINING BINGO CELEBRATION</p><h2>Complete it. Upload it. Celebrate it.</h2><p>After the Bingo review, upload one clear photo or PDF of your completed sheet. A valid submission earns your participation bonus and enters you into the random Starbucks gift-card drawing.</p></div>
      <div className={`bingo-bonus-seal ${submission ? "bingo-bonus-seal--earned" : ""}`}><span>{submission ? "+5" : "5"}</span><b>{submission ? "BONUS EARNED" : "BONUS POINTS"}</b></div>
    </div>

    {submission && <div className={`bingo-submission-status ${submission.status === "winner" ? "bingo-submission-status--winner" : ""}`}>
      <span aria-hidden="true">{submission.status === "winner" ? "★" : "✓"}</span>
      <div><strong>{submission.status === "winner" ? "You are a Starbucks gift-card winner!" : "Your Bingo entry is confirmed."}</strong><p>{submission.original_name} · submitted {new Date(submission.submitted_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></div>
      {privateUrl && <a className="button button--paper button--small" href={privateUrl} target="_blank" rel="noreferrer">View my sheet ↗</a>}
    </div>}

    <div className="bingo-upload-grid">
      <label className="bingo-dropzone">
        <span aria-hidden="true">＋</span>
        <strong>{file ? file.name : submission ? "Replace my Bingo sheet" : "Choose my completed Bingo sheet"}</strong>
        <small>JPG, PNG, WebP, or PDF · maximum 15 MB</small>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
      </label>
      <div className="bingo-upload-actions">
        <label className="checkbox-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I confirm this is my own completed Queen Training Bingo sheet.</span></label>
        <button className="button button--lipstick" type="button" disabled={!file || !confirmed || busy} onClick={() => void submitBingo()}>{busy ? "Saving my entry…" : submission ? "Replace sheet and keep my entry" : "Submit for +5 bonus points"}</button>
        <small>The five-point engagement bonus is displayed separately from the official 100-point performance rubric. Staff can review uploaded sheets before awarding gift cards.</small>
      </div>
    </div>
    {message && <div className={message.includes("complete") || message.includes("confirmed") ? "notice notice--success" : "notice"} role="status">{message}</div>}
  </section>;
}
