"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredSession } from "@/lib/supabase-browser";
import {
  applicantStatusCopy,
  applicantStatusLabels,
  applicantStatusReasons,
  applicantStatuses,
  type ApplicantStatus,
} from "@/lib/pgws-status-email";

type Props = {
  applicationId: string;
  currentStatus: string;
  applicantEmail: string | null | undefined;
  applicantName: string;
  onCompleted: () => Promise<void>;
};

export function StatusNotificationManager({
  applicationId,
  currentStatus,
  applicantEmail,
  applicantName,
  onCompleted,
}: Props) {
  const initialStatus = applicantStatuses.includes(currentStatus as ApplicantStatus)
    ? (currentStatus as ApplicantStatus)
    : "under_review";
  const [status, setStatus] = useState<ApplicantStatus>(initialStatus);
  const [reason, setReason] = useState(applicantStatusReasons[initialStatus]);
  const [customMessage, setCustomMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [lastActionFailed, setLastActionFailed] = useState(false);
  const copy = useMemo(() => applicantStatusCopy[status], [status]);

  useEffect(() => {
    const nextStatus = applicantStatuses.includes(currentStatus as ApplicantStatus)
      ? (currentStatus as ApplicantStatus)
      : "under_review";
    setStatus(nextStatus);
    setReason(applicantStatusReasons[nextStatus]);
  }, [currentStatus]);

  function chooseStatus(next: ApplicantStatus) {
    setStatus(next);
    setReason(applicantStatusReasons[next]);
    setCustomMessage("");
    setResult("");
    setLastActionFailed(false);
  }

  async function submit(notifyOnly = false) {
    const session = getStoredSession();
    if (!session) {
      setResult("Your staff session expired. Sign in again before changing an application.");
      return;
    }
    setBusy(true);
    setResult("");
    setLastActionFailed(false);
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, reason, customMessage, notifyOnly }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLastActionFailed(body?.statusUpdated === true);
        throw new Error(body?.error ?? "The update could not be completed.");
      }
      setResult(
        notifyOnly
          ? `Email resent to ${body.recipient}; ${body.copied} was copied.`
          : `Status updated to ${applicantStatusLabels[status]}. Email sent to ${body.recipient}; ${body.copied} was copied.`,
      );
      setCustomMessage("");
      await onCompleted();
    } catch (error) {
      setResult(error instanceof Error ? error.message : "The update could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel status-notification-manager">
      <div className="status-manager-heading">
        <div>
          <p className="eyebrow">ONE-STEP APPLICANT UPDATE</p>
          <h2>Change status + send the email</h2>
          <p>
            Choose the new stage, add an optional personal note, and send. The applicant is
            notified automatically and <strong>nationals@estherfundsinc.org</strong> is copied.
          </p>
        </div>
        <span className="delivery-pill">Automatic email</span>
      </div>

      <div className="status-choice-grid" role="group" aria-label="Application status">
        {applicantStatuses.map((value) => (
          <button
            key={value}
            type="button"
            className={`status-choice ${status === value ? "status-choice--active" : ""}`}
            aria-pressed={status === value}
            onClick={() => chooseStatus(value)}
          >
            {applicantStatusLabels[value]}
          </button>
        ))}
      </div>

      <div className="status-manager-grid">
        <div className="status-manager-fields">
          <label className="field">
            <span>Internal reason <small>saved to the audit record</small></span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className="field">
            <span>Personal note to {applicantName} <small>optional</small></span>
            <textarea
              rows={7}
              value={customMessage}
              onChange={(event) => setCustomMessage(event.target.value)}
              placeholder={
                status === "correction_requested"
                  ? "Explain exactly what needs to be corrected and where to make the change."
                  : "Add encouragement or a specific next step. Leave blank to use the polished standard email."
              }
            />
            <span className="field-help">{customMessage.length}/2,000 characters</span>
          </label>
        </div>

        <aside className="email-preview" aria-label="Applicant email preview">
          <p className="eyebrow">EMAIL PREVIEW</p>
          <small>To: {applicantEmail || "No applicant email on file"}</small>
          <small>CC: nationals@estherfundsinc.org</small>
          <h3>{copy.subject}</h3>
          <p><strong>{copy.headline}</strong></p>
          <p>{copy.introduction}</p>
          <p className="preview-label">Things to know</p>
          <ul>{copy.details.map((item) => <li key={item}>{item}</li>)}</ul>
          {customMessage && <div className="preview-note"><strong>Your note</strong><br />{customMessage}</div>}
          <p>{copy.encouragement}</p>
        </aside>
      </div>

      {result && (
        <div className={`notice ${lastActionFailed ? "" : "notice--success"}`} role="status">
          <span>{lastActionFailed ? "!" : "✓"}</span>
          <div>{result}</div>
        </div>
      )}

      <div className="status-manager-actions">
        <button
          type="button"
          className="button button--lipstick"
          disabled={
            busy ||
            !applicantEmail ||
            reason.trim().length < 5 ||
            customMessage.length > 2000 ||
            (status === "correction_requested" && customMessage.trim().length < 10)
          }
          onClick={() => void submit(false)}
        >
          {busy ? "Updating + sending…" : `Update to ${applicantStatusLabels[status]} + send email`}
        </button>
        <button
          type="button"
          className="button button--paper button--small"
          disabled={busy || !applicantEmail}
          onClick={() => void submit(true)}
        >
          Resend this email only
        </button>
      </div>
      <p className="field-help">
        If email delivery fails after the status changes, the page will say so clearly and you can
        use “Resend this email only” without changing the status again.
      </p>
    </section>
  );
}
