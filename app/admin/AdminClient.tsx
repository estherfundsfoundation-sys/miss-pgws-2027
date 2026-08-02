"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStoredSession, rest } from "@/lib/supabase-browser";

type Role = { role: string; active: boolean };
type Application = {
  id: string;
  user_id: string;
  status: string;
  completion_percent: number;
  agreement_status: string;
  submitted_at: string | null;
  updated_at: string;
};
type Profile = {
  user_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  email: string;
  phone: string | null;
  college: string | null;
  email_verified: boolean;
};
type BulkAction = "submitted_confirmation" | "move_under_review" | "resend_current";
type BulkResult = { kind: "success" | "error"; message: string } | null;

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("submitted_confirmation");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult>(null);
  const session = getStoredSession();

  useEffect(() => {
    async function load() {
      if (!session) {
        setLoading(false);
        return;
      }
      const roles = await rest<Role[]>(
        `pgws_user_roles?user_id=eq.${session.user.id}&active=eq.true&select=role,active`,
      );
      const ok = Boolean(
        roles.data?.some((row) =>
          ["reviewer", "competition_admin", "finance_admin", "super_admin"].includes(row.role),
        ),
      );
      setAuthorized(ok);
      if (ok) {
        const [apps, applicantProfiles] = await Promise.all([
          rest<Application[]>(
            "pgws_applications?select=id,user_id,status,completion_percent,agreement_status,submitted_at,updated_at&order=updated_at.desc",
          ),
          rest<Profile[]>(
            "pgws_profiles?select=user_id,legal_name,preferred_name,email,phone,college,email_verified&order=created_at.desc",
          ),
        ]);
        if (apps.error || applicantProfiles.error) {
          setError(apps.error || applicantProfiles.error || "Applicant records could not be loaded.");
        }
        setApplications(apps.data ?? []);
        setProfiles(applicantProfiles.data ?? []);
      } else if (roles.error) {
        setError(roles.error);
      }
      setLoading(false);
    }
    void load();
  }, [session?.user.id]);

  const profilesByUser = useMemo(
    () => new Map(profiles.map((profile) => [profile.user_id, profile])),
    [profiles],
  );

  const visibleApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      if (statusFilter === "submitted_any" && !application.submitted_at) return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "submitted_any" &&
        application.status !== statusFilter
      ) return false;
      if (!query) return true;
      const profile = profilesByUser.get(application.user_id);
      return [
        profile?.legal_name,
        profile?.preferred_name,
        profile?.email,
        profile?.college,
        application.id,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [applications, profilesByUser, search, statusFilter]);

  const visibleSelectableIds = useMemo(
    () =>
      visibleApplications
        .filter((application) =>
          Boolean(application.submitted_at && profilesByUser.get(application.user_id)?.email),
        )
        .map((application) => application.id),
    [profilesByUser, visibleApplications],
  );

  const allVisibleSelected =
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => selectedIds.includes(id));

  function showSubmittedApplications() {
    setSearch("");
    setStatusFilter("submitted_any");
    setBulkResult(null);
    window.setTimeout(() => {
      document.getElementById("applicant-records")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function toggleApplication(applicationId: string) {
    setSelectedIds((current) =>
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId],
    );
    setBulkResult(null);
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleSelectableIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleSelectableIds]));
    });
    setBulkResult(null);
  }

  async function massNotifySelected() {
    if (!session || selectedIds.length === 0) return;

    const selectedApplications = applications.filter((application) =>
      selectedIds.includes(application.id),
    );
    const actionLabels: Record<BulkAction, string> = {
      submitted_confirmation: "send an application-received confirmation to",
      move_under_review: "move into review and notify",
      resend_current: "resend the current status update to",
    };
    const confirmed = window.confirm(
      `This will ${actionLabels[bulkAction]} ${selectedApplications.length} applicant${
        selectedApplications.length === 1 ? "" : "s"
      }. Esther Funds Foundation will be copied on every email. Continue?`,
    );
    if (!confirmed) return;

    setBulkBusy(true);
    setBulkResult(null);
    setError("");
    const failedIds: string[] = [];
    let sentCount = 0;

    for (let index = 0; index < selectedApplications.length; index += 4) {
      const batch = selectedApplications.slice(index, index + 4);
      const results = await Promise.all(
        batch.map(async (application) => {
          const status =
            bulkAction === "move_under_review"
              ? "under_review"
              : bulkAction === "submitted_confirmation"
                ? "submitted"
                : application.status;
          try {
            const response = await fetch(`/api/admin/applications/${application.id}/status`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status,
                reason:
                  bulkAction === "move_under_review"
                    ? "Selected submitted application moved into formal staff review."
                    : "",
                customMessage: bulkMessage.trim(),
                notifyOnly: bulkAction !== "move_under_review",
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(body.error || "The notification could not be sent.");
            }
            return { id: application.id, ok: true };
          } catch {
            return { id: application.id, ok: false };
          }
        }),
      );

      results.forEach((result) => {
        if (result.ok) sentCount += 1;
        else failedIds.push(result.id);
      });
    }

    if (bulkAction === "move_under_review" && sentCount > 0) {
      const successfulIds = new Set(
        selectedApplications
          .map((application) => application.id)
          .filter((id) => !failedIds.includes(id)),
      );
      setApplications((current) =>
        current.map((application) =>
          successfulIds.has(application.id)
            ? { ...application, status: "under_review", updated_at: new Date().toISOString() }
            : application,
        ),
      );
    }

    setSelectedIds(failedIds);
    setBulkBusy(false);
    if (failedIds.length === 0) {
      setBulkResult({
        kind: "success",
        message: `${sentCount} personalized notification${
          sentCount === 1 ? " was" : "s were"
        } sent successfully. nationals@estherfundsinc.org was copied on each one.`,
      });
      setBulkMessage("");
    } else {
      setBulkResult({
        kind: "error",
        message: `${sentCount} sent successfully. ${failedIds.length} could not be sent and remain selected so you can try again or open their records.`,
      });
    }
  }

  async function exportApplicantContacts() {
    setError("");
    setExporting(true);
    try {
      const headings = [
        "Applicant name",
        "Preferred name",
        "Email",
        "Phone",
        "College",
        "Email verified",
        "Application status",
        "Completion percent",
        "Agreement status",
        "Submitted",
        "Last activity",
        "Applicant ID",
      ];
      const rows = applications.map((application) => {
        const profile = profilesByUser.get(application.user_id);
        return [
          profile?.legal_name ?? "",
          profile?.preferred_name ?? "",
          profile?.email ?? "",
          profile?.phone ?? "",
          profile?.college ?? "",
          profile?.email_verified ? "Yes" : "No",
          application.status,
          application.completion_percent,
          application.agreement_status,
          application.submitted_at ? new Date(application.submitted_at).toISOString() : "",
          new Date(application.updated_at).toISOString(),
          application.id,
        ];
      });
      const csv = [headings, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `miss-pgws-applicant-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The authorized CSV could not be created.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="panel">Checking your approved staff role…</div>;
  if (!session) {
    return (
      <div className="panel">
        <h2>Staff sign-in required</h2>
        <Link className="button button--lipstick" href="/admin/login">Staff sign in</Link>
      </div>
    );
  }
  if (!authorized) {
    return (
      <div className="panel">
        <h2>Access not assigned</h2>
        <p>
          Your account is signed in, but it does not have an active PGWS staff role.
          Administrative access is tied to your verified user ID—not just an email address.
        </p>
        <a
          className="button button--ink"
          href="mailto:nationals@estherfundsinc.org?subject=PGWS%20staff%20access"
        >
          Request staff activation
        </a>
      </div>
    );
  }

  const submitted = applications.filter((application) => application.submitted_at).length;
  const ready = applications.filter((application) => application.agreement_status === "signed").length;

  return (
    <>
      {error && <div className="notice" role="alert">{error}</div>}
      <div className="stat-grid">
        <div className="stat-card"><strong>{applications.length}</strong><span>total applicants</span></div>
        <button
          className="stat-card stat-card--interactive"
          type="button"
          onClick={showSubmittedApplications}
          aria-label={`Show all ${submitted} submitted applications`}
        >
          <strong>{submitted}</strong>
          <span>submitted applications · view everyone</span>
        </button>
        <div className="stat-card"><strong>{ready}</strong><span>signed agreements</span></div>
        <div className="stat-card"><strong>{applications.filter((application) => application.status === "accepted").length}</strong><span>accepted contestants</span></div>
      </div>

      <section className="panel" id="applicant-records">
        <div className="applicant-list-heading">
          <div>
            <p className="eyebrow">APPLICATION REVIEW</p>
            <h2>All applicant records</h2>
            <p className="field-help">
              Open any applicant to change her status and send a personalized notification in one step.
            </p>
          </div>
          <button
            className="button button--paper button--small"
            type="button"
            disabled={exporting || applications.length === 0}
            onClick={() => void exportApplicantContacts()}
          >
            {exporting ? "Preparing CSV…" : "Export applicant contacts CSV"}
          </button>
        </div>

        <div className="applicant-list-tools">
          <label className="field">
            <span>Find an applicant</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, school, or applicant ID"
            />
          </label>
          <label className="field">
            <span>Filter by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="submitted_any">All submitted applications</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted · awaiting review</option>
              <option value="under_review">Under review</option>
              <option value="correction_requested">Action needed</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Not selected</option>
            </select>
          </label>
        </div>

        <div className="bulk-notify-panel">
          <div className="bulk-notify-heading">
            <div>
              <p className="eyebrow">MASS NOTIFY</p>
              <h3>{selectedIds.length} submitted applicant{selectedIds.length === 1 ? "" : "s"} selected</h3>
              <p className="field-help">
                Select submitted applicants below. Every message is personalized and copies
                nationals@estherfundsinc.org.
              </p>
            </div>
            <button
              className="button button--paper button--small"
              type="button"
              disabled={visibleSelectableIds.length === 0}
              onClick={toggleAllVisible}
            >
              {allVisibleSelected ? "Clear visible selection" : "Select all visible submissions"}
            </button>
          </div>

          <div className="bulk-notify-grid">
            <label className="field">
              <span>Choose a safe group action</span>
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value as BulkAction)}
                disabled={bulkBusy}
              >
                <option value="submitted_confirmation">Confirm application received</option>
                <option value="move_under_review">Move to under review + notify</option>
                <option value="resend_current">Resend each applicant’s current update</option>
              </select>
            </label>
            <label className="field field--wide">
              <span>Optional note added to every selected email</span>
              <textarea
                value={bulkMessage}
                onChange={(event) => setBulkMessage(event.target.value)}
                maxLength={2000}
                disabled={bulkBusy}
                placeholder="Add one shared reminder or encouraging note, or leave this blank."
              />
              <small className="field-help">{bulkMessage.length}/2,000 characters</small>
            </label>
          </div>

          {bulkResult && (
            <div
              className={`notice ${bulkResult.kind === "success" ? "notice--success" : ""}`}
              role="status"
            >
              {bulkResult.message}
            </div>
          )}

          <div className="bulk-notify-actions">
            <p className="field-help">
              Acceptance, waitlist, correction, and non-selection decisions remain individual review actions.
            </p>
            <button
              className="button button--lipstick"
              type="button"
              disabled={bulkBusy || selectedIds.length === 0}
              onClick={() => void massNotifySelected()}
            >
              {bulkBusy
                ? "Sending personalized emails…"
                : `Notify ${selectedIds.length || ""} selected applicant${selectedIds.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="selection-cell">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    disabled={visibleSelectableIds.length === 0}
                    aria-label="Select all submitted applicants in this view"
                  />
                </th>
                <th>Applicant</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Agreement</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleApplications.length ? (
                visibleApplications.map((application) => {
                  const profile = profilesByUser.get(application.user_id);
                  const selectable = Boolean(application.submitted_at && profile?.email);
                  return (
                    <tr key={application.id}>
                      <td className="selection-cell">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(application.id)}
                          onChange={() => toggleApplication(application.id)}
                          disabled={!selectable || bulkBusy}
                          aria-label={`Select ${profile?.legal_name || profile?.preferred_name || "applicant"}`}
                          title={
                            selectable
                              ? "Select for a mass notification"
                              : "Only submitted applicants with an email can be selected"
                          }
                        />
                      </td>
                      <td>
                        <strong>{profile?.legal_name || profile?.preferred_name || "Applicant"}</strong>
                        <br />
                        <span className="applicant-email">
                          {profile?.email || `${application.id.slice(0, 8)}…`}
                        </span>
                      </td>
                      <td><span className="status">{application.status.replaceAll("_", " ")}</span></td>
                      <td>{application.completion_percent}%</td>
                      <td>
                        <span className={`status ${application.agreement_status === "signed" ? "status--green" : ""}`}>
                          {application.agreement_status}
                        </span>
                      </td>
                      <td>{application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : "—"}</td>
                      <td>
                        <Link
                          className="button button--lipstick button--small"
                          href={`/admin/applications/${application.id}`}
                        >
                          Review + notify
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7}>No applicant records match this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
