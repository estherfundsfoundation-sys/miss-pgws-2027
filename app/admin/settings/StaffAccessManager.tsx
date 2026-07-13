"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getStoredSession, rest } from "@/lib/supabase-browser";

type StaffRole = "reviewer" | "competition_admin" | "finance_admin" | "super_admin";
type RoleRow = { user_id: string; role: string; active: boolean; created_at: string };
type ProfileRow = { user_id: string; email: string; legal_name: string | null; email_verified: boolean };
type StaffRow = RoleRow & { email: string; name: string; verified: boolean };

const roleLabels: Record<StaffRole, string> = {
  reviewer: "Application reviewer",
  competition_admin: "Competition administrator",
  finance_admin: "Voting & finance administrator",
  super_admin: "National super administrator",
};

export function StaffAccessManager() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("competition_admin");
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const currentUserId = useMemo(() => getStoredSession()?.user.id ?? "", []);

  const loadStaff = useCallback(async () => {
    const [rolesResult, profilesResult] = await Promise.all([
      rest<RoleRow[]>("pgws_user_roles?role=neq.applicant&select=user_id,role,active,created_at&order=created_at.desc"),
      rest<ProfileRow[]>("pgws_profiles?select=user_id,email,legal_name,email_verified"),
    ]);
    if (rolesResult.error) { setMessage(rolesResult.error); return; }
    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
    setStaff((rolesResult.data ?? []).map((item) => {
      const profile = profiles.get(item.user_id);
      return { ...item, email: profile?.email ?? "Account unavailable", name: profile?.legal_name ?? "Staff member", verified: Boolean(profile?.email_verified) };
    }));
  }, []);

  useEffect(() => { void loadStaff(); }, [loadStaff]);

  async function grantAccess(event: FormEvent) {
    event.preventDefault(); setMessage(""); setBusy(true);
    try {
      const normalized = email.trim().toLowerCase();
      const profileResult = await rest<ProfileRow[]>(`pgws_profiles?email=eq.${encodeURIComponent(normalized)}&select=user_id,email,legal_name,email_verified&limit=1`);
      const profile = profileResult.data?.[0];
      if (!profile) throw new Error("No account was found for that email. Ask the staff member to create and verify an account first.");
      if (!profile.email_verified) throw new Error("That account exists but its email is not verified yet.");
      const session = getStoredSession();
      const result = await rest<RoleRow[]>("pgws_user_roles?on_conflict=user_id,role", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ user_id: profile.user_id, role, active: true, granted_by: session?.user.id ?? null }),
      });
      if (result.error) throw new Error(result.error);
      setEmail(""); setMessage(`${profile.email} now has ${roleLabels[role]} access.`); await loadStaff();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Staff access could not be updated."); }
    finally { setBusy(false); }
  }

  async function setActive(item: StaffRow, active: boolean) {
    if (item.user_id === currentUserId && !active) { setMessage("You cannot deactivate your own active staff role from this screen."); return; }
    setBusy(true); setMessage("");
    const result = await rest(`pgws_user_roles?user_id=eq.${item.user_id}&role=eq.${item.role}`, { method: "PATCH", body: JSON.stringify({ active, revoked_at: active ? null : new Date().toISOString(), revoked_by: active ? null : currentUserId }) });
    setMessage(result.error ?? `${item.email} was ${active ? "reactivated" : "deactivated"}.`); await loadStaff(); setBusy(false);
  }

  return <div className="staff-access-manager">
    <div className="panel staff-access-form">
      <div><p className="eyebrow">STAFF ACCESS MANAGER</p><h2>Add verified staff</h2><p>Staff members must create and verify their own account first. Access is then tied to their immutable user ID—not trusted from email alone.</p></div>
      <form onSubmit={grantAccess}>
        <label className="field"><span>Verified account email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@estherfundsinc.org" /></label>
        <label className="field"><span>Access level</span><select value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="button button--lipstick" disabled={busy} type="submit">{busy ? "Updating…" : "Grant staff access"}</button>
      </form>
      {message && <p className="notice" role="status">{message}</p>}
    </div>

    <div className="panel"><h2>Current staff access</h2><p>Deactivate access immediately when someone no longer needs competition records.</p><div className="table-wrap"><table className="data-table"><thead><tr><th>Staff member</th><th>Role</th><th>Email verified</th><th>Status</th><th>Control</th></tr></thead><tbody>{staff.length ? staff.map((item) => <tr key={`${item.user_id}-${item.role}`}><td><strong>{item.name}</strong><br /><span>{item.email}</span></td><td>{roleLabels[item.role as StaffRole] ?? item.role}</td><td>{item.verified ? "Verified" : "Not verified"}</td><td><span className={`status ${item.active ? "status--green" : ""}`}>{item.active ? "Active" : "Inactive"}</span></td><td><button className="button button--small button--paper" type="button" disabled={busy || (item.user_id === currentUserId && item.active)} onClick={() => void setActive(item, !item.active)}>{item.active ? "Deactivate" : "Reactivate"}</button></td></tr>) : <tr><td colSpan={5}>No additional staff roles are assigned yet.</td></tr>}</tbody></table></div></div>
  </div>;
}
