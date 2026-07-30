"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  createPrivateFileUrl,
  getStoredSession,
  rest,
} from "@/lib/supabase-browser";
import { StatusNotificationManager } from "./StatusNotificationManager";

type RecordData = {
  id: string;
  user_id: string;
  status: string;
  completion_percent: number;
  agreement_status: string;
  answers: Record<string, unknown>;
  submitted_at: string | null;
  updated_at: string;
};

type Profile = {
  legal_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  college: string | null;
  email_verified: boolean;
};

type AppFile = {
  id: string;
  field_key: string;
  object_path: string;
  original_name: string;
  content_type: string | null;
  review_status: string;
  url?: string;
};

type Contestant = {
  id: string;
  public_profile_status: string;
  public_name: string | null;
};

const rubric = [
  ["application_quality", "Application quality", 15],
  ["faith_and_mission", "Faith and mission alignment", 20],
  ["leadership", "Leadership", 20],
  ["service", "Service", 20],
  ["platform", "Platform and advocacy", 15],
  ["communication", "Communication", 10],
] as const;

export function ApplicationRecord({ id }: { id: string }) {
  const [data, setData] = useState<RecordData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"note" | "rubric" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [recommendation, setRecommendation] = useState("accept");
  const [scores, setScores] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const session = getStoredSession();
    if (!session) {
      setMessage("Staff sign-in required.");
      return;
    }
    const roles = await rest<{ role: string }[]>(
      `pgws_user_roles?user_id=eq.${session.user.id}&active=eq.true&select=role`,
    );
    if (!roles.data?.some((row) => ["reviewer", "competition_admin", "super_admin"].includes(row.role))) {
      setMessage("Your account is not authorized to open applicant records.");
      return;
    }

    const app = await rest<RecordData[]>(
      `pgws_applications?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    );
    const row = app.data?.[0] ?? null;
    setData(row);
    if (!row) {
      setMessage(app.error || "Application not found.");
      return;
    }

    const [profileResult, filesResult, contestantResult] = await Promise.all([
      rest<Profile[]>(
        `pgws_profiles?user_id=eq.${row.user_id}&select=legal_name,preferred_name,email,phone,college,email_verified&limit=1`,
      ),
      rest<AppFile[]>(
        `pgws_application_files?application_id=eq.${row.id}&select=id,field_key,object_path,original_name,content_type,review_status&order=uploaded_at.desc`,
      ),
      rest<Contestant[]>(
        `pgws_contestants?application_id=eq.${row.id}&select=id,public_profile_status,public_name&limit=1`,
      ),
    ]);

    setProfile(profileResult.data?.[0] ?? null);
    setContestant(contestantResult.data?.[0] ?? null);
    const withUrls = await Promise.all(
      (filesResult.data || []).map(async (file) => {
        const signed = await createPrivateFileUrl(file.object_path);
        return { ...file, url: signed.data?.signedURL };
      }),
    );
    setFiles(withUrls);
    setMessage(app.error || "");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(path: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMessage("");
    const result = await rest(path, { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(success);
    setPanel(null);
    setReason("");
    setNote("");
    await load();
  }

  async function addNote() {
    await run(
      "rpc/pgws_staff_add_note",
      { p_application_id: id, p_body: note, p_visibility: "competition_admin" },
      "Private note saved.",
    );
  }

  async function saveReview() {
    await run(
      "rpc/pgws_staff_save_review",
      {
        p_application_id: id,
        p_scores: scores,
        p_recommendation: recommendation,
        p_reason: reason,
      },
      "Review rubric saved to the audit record.",
    );
  }

  async function publishProfile() {
    if (!contestant) return;
    await run(
      "rpc/pgws_staff_publish_profile",
      {
        p_contestant_id: contestant.id,
        p_publish: contestant.public_profile_status !== "published",
        p_reason: reason,
      },
      contestant.public_profile_status === "published"
        ? "Public profile hidden."
        : "Public contestant profile published.",
    );
  }

  if (!data && !message) return <div className="panel">Loading protected applicant record…</div>;
  if (!data) return <div className="notice">{message}</div>;

  const applicantName =
    profile?.preferred_name || profile?.legal_name || "Applicant";

  return (
    <>
      <section className="panel">
        <div className="record-heading">
          <div>
            <p className="eyebrow">APPLICANT</p>
            <h2>{profile?.legal_name || profile?.preferred_name || "Applicant record"}</h2>
            <p>
              {profile?.college || "College not listed"} · {profile?.email || "Email not listed"}
              <br />
              {profile?.email_verified ? "Verified email" : "Verification pending"}
            </p>
          </div>
          <div>
            <span className="status">{data.status.replaceAll("_", " ")}</span>
            <p>
              {data.completion_percent}% complete
              <br />
              {data.agreement_status} agreement
            </p>
          </div>
        </div>
      </section>

      {message && (
        <div className="notice" role="status" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      <StatusNotificationManager
        applicationId={id}
        currentStatus={data.status}
        applicantEmail={profile?.email}
        applicantName={applicantName}
        onCompleted={load}
      />

      <section className="panel">
        <h2>Submitted photos and files</h2>
        {files.length ? (
          <div className="admin-file-grid">
            {files.map((file) => (
              <article key={file.id}>
                <div className="admin-file-preview">
                  {file.url && file.content_type?.startsWith("image/") ? (
                    <img src={file.url} alt={file.field_key.replaceAll("_", " ")} />
                  ) : file.url && file.content_type?.startsWith("video/") ? (
                    <video src={file.url} controls preload="metadata" />
                  ) : (
                    <span>PRIVATE FILE</span>
                  )}
                </div>
                <b>{file.field_key.replaceAll("_", " ")}</b>
                <small>
                  {file.original_name} · {file.review_status}
                </small>
                {file.url && (
                  <a
                    className="button button--paper button--small"
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open full file ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p>No uploaded files are attached to this application.</p>
        )}
      </section>

      <section className="panel">
        <h2>Application responses</h2>
        <div className="form-grid">
          {Object.entries(data.answers || {}).map(([key, value]) => (
            <div className="field field--wide" key={key}>
              <label>{key.replaceAll("_", " ")}</label>
              <div className="response-box">
                {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value || "—")}
              </div>
            </div>
          ))}
        </div>
      </section>

      {contestant && (
        <section className="panel">
          <h2>Contestant profile publication</h2>
          <div className="notice">
            <span>◆</span>
            <div>
              A publication action requires a reason and is written to the permanent audit log.
            </div>
          </div>
          <label className="field" style={{ marginTop: 18 }}>
            <span>Required publication reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why the public profile is being published or hidden."
            />
          </label>
          <div className="hero-actions">
            <button
              disabled={busy || reason.trim().length < 5}
              className="button button--ink"
              onClick={() => void publishProfile()}
            >
              {contestant.public_profile_status === "published"
                ? "Hide public profile"
                : "Publish public profile"}
            </button>
          </div>
          <p className="field-help">
            Profile status: {contestant.public_profile_status}. Contestants manage their public
            story and campaign video from their portal; staff controls publication.
          </p>
        </section>
      )}

      <section className="panel">
        <h2>Internal review tools</h2>
        <p>These actions do not email the applicant.</p>
        <div className="hero-actions">
          <button
            className="button button--paper"
            onClick={() => setPanel(panel === "note" ? null : "note")}
          >
            Add private note
          </button>
          <button
            className="button button--lipstick"
            onClick={() => setPanel(panel === "rubric" ? null : "rubric")}
          >
            Open review rubric
          </button>
        </div>

        {panel === "note" && (
          <div className="action-panel">
            <h3>Add a private staff note</h3>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="This note is never shown publicly."
            />
            <button
              disabled={busy || note.trim().length < 5}
              className="button button--lipstick"
              onClick={() => void addNote()}
            >
              Save private note
            </button>
          </div>
        )}

        {panel === "rubric" && (
          <div className="action-panel">
            <h3>2027 application review rubric</h3>
            <div className="rubric-grid">
              {rubric.map(([key, label, max]) => (
                <label key={key}>
                  <span>
                    {label} / {max}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={max}
                    value={scores[key] ?? ""}
                    onChange={(event) =>
                      setScores((old) => ({ ...old, [key]: Number(event.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
            <label className="field">
              <span>Recommendation</span>
              <select
                value={recommendation}
                onChange={(event) => setRecommendation(event.target.value)}
              >
                <option value="accept">Accept</option>
                <option value="waitlist">Waitlist</option>
                <option value="decline">Decline</option>
                <option value="needs_correction">Needs correction</option>
              </select>
            </label>
            <label className="field">
              <span>Required review reason</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button
              disabled={busy || reason.trim().length < 5}
              className="button button--lipstick"
              onClick={() => void saveReview()}
            >
              Save completed review
            </button>
          </div>
        )}
      </section>

      <Link href="/admin/applications">← Back to applicants</Link>
    </>
  );
}
