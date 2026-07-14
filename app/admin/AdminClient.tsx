"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const session = getStoredSession();

  useEffect(() => {
    async function load() {
      if (!session) { setLoading(false); return; }
      const roles = await rest<Role[]>(`pgws_user_roles?user_id=eq.${session.user.id}&active=eq.true&select=role,active`);
      const ok = Boolean(roles.data?.some((r) => ["reviewer", "competition_admin", "finance_admin", "super_admin"].includes(r.role)));
      setAuthorized(ok);
      if (ok) {
        const apps = await rest<Application[]>("pgws_applications?select=id,user_id,status,completion_percent,agreement_status,submitted_at,updated_at&order=updated_at.desc");
        if (apps.error) setError(apps.error);
        setApplications(apps.data ?? []);
      } else if (roles.error) setError(roles.error);
      setLoading(false);
    }
    load();
  }, [session?.user.id]);

  async function exportApplicantContacts() {
    setError("");
    setExporting(true);
    try {
      const profiles = await rest<Profile[]>("pgws_profiles?select=user_id,legal_name,preferred_name,email,phone,college,email_verified&order=created_at.desc");
      if (profiles.error) throw new Error(profiles.error);
      const byUser = new Map((profiles.data ?? []).map((profile) => [profile.user_id, profile]));
      const headings = ["Applicant name", "Preferred name", "Email", "Phone", "College", "Email verified", "Application status", "Completion percent", "Agreement status", "Submitted", "Last activity", "Applicant ID"];
      const rows = applications.map((application) => {
        const profile = byUser.get(application.user_id);
        return [
          profile?.legal_name ?? "", profile?.preferred_name ?? "", profile?.email ?? "", profile?.phone ?? "", profile?.college ?? "",
          profile?.email_verified ? "Yes" : "No", application.status, application.completion_percent, application.agreement_status,
          application.submitted_at ? new Date(application.submitted_at).toISOString() : "", new Date(application.updated_at).toISOString(), application.id,
        ];
      });
      const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
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
  if (!session) return <div className="panel"><h2>Staff sign-in required</h2><Link className="button button--lipstick" href="/admin/login">Staff sign in</Link></div>;
  if (!authorized) return <div className="panel"><h2>Access not assigned</h2><p>Your account is signed in, but it does not have an active PGWS staff role. Administrative access is tied to your verified user ID—not just an email address.</p><a className="button button--ink" href="mailto:nationals@estherfundsinc.org?subject=PGWS%20staff%20access">Request staff activation</a></div>;

  const submitted = applications.filter((application) => application.submitted_at).length;
  const ready = applications.filter((application) => application.agreement_status === "signed").length;

  return <>
    {error && <div className="notice" role="alert">{error}</div>}
    <div className="stat-grid">
      <div className="stat-card"><strong>{applications.length}</strong><span>total applicants</span></div>
      <div className="stat-card"><strong>{submitted}</strong><span>submitted applications</span></div>
      <div className="stat-card"><strong>{ready}</strong><span>signed agreements</span></div>
      <div className="stat-card"><strong>{applications.filter((application) => application.status === "accepted").length}</strong><span>accepted contestants</span></div>
    </div>
    <section className="panel">
      <div style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",flexWrap:"wrap"}}>
        <div><p className="eyebrow">APPLICATION REVIEW</p><h2>All applicant records</h2><p className="field-help">The authorized contact export includes names, emails, progress, and status only. It excludes answers, signatures, and uploaded files.</p></div>
        <button className="button button--paper button--small" type="button" disabled={exporting || applications.length === 0} onClick={exportApplicantContacts}>{exporting ? "Preparing CSV…" : "Export applicant contacts CSV"}</button>
      </div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Applicant ID</th><th>Status</th><th>Progress</th><th>Agreement</th><th>Submitted</th><th>Action</th></tr></thead><tbody>{applications.length ? applications.map((application) => <tr key={application.id}><td>{application.id.slice(0,8)}…</td><td><span className="status">{application.status}</span></td><td>{application.completion_percent}%</td><td><span className={`status ${application.agreement_status === "signed" ? "status--green" : ""}`}>{application.agreement_status}</span></td><td>{application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : "—"}</td><td><Link href={`/admin/applications/${application.id}`}>Open →</Link></td></tr>) : <tr><td colSpan={6}>No applicant records yet.</td></tr>}</tbody></table></div>
    </section>
  </>;
}
"use client";
import Link from "next/link";import{useEffect,useState}from"react";import{getStoredSession,rest}from"@/lib/supabase-browser";
type Role={role:string;active:boolean};type Application={id:string;user_id:string;status:string;completion_percent:number;agreement_status:string;submitted_at:string|null;updated_at:string};
export function AdminClient(){const[loading,setLoading]=useState(true);const[authorized,setAuthorized]=useState(false);const[applications,setApplications]=useState<Application[]>([]);const[error,setError]=useState('');const session=getStoredSession();
useEffect(()=>{async function load(){if(!session){setLoading(false);return;}const roles=await rest<Role[]>(`pgws_user_roles?user_id=eq.${session.user.id}&active=eq.true&select=role,active`);const ok=Boolean(roles.data?.some(r=>['reviewer','competition_admin','finance_admin','super_admin'].includes(r.role)));setAuthorized(ok);if(ok){const apps=await rest<Application[]>('pgws_applications?select=id,user_id,status,completion_percent,agreement_status,submitted_at,updated_at&order=updated_at.desc');if(apps.error)setError(apps.error);setApplications(apps.data??[]);}else if(roles.error)setError(roles.error);setLoading(false);}load();},[session?.user.id]);
if(loading)return <div className="panel">Checking your approved staff role…</div>;if(!session)return <div className="panel"><h2>Staff sign-in required</h2><Link className="button button--lipstick" href="/admin/login">Staff sign in</Link></div>;if(!authorized)return <div className="panel"><h2>Access not assigned</h2><p>Your account is signed in, but it does not have an active PGWS staff role. Administrative access is tied to your verified user ID—not just an email address.</p><a className="button button--ink" href="mailto:nationals@estherfundsinc.org?subject=PGWS%20staff%20access">Request staff activation</a></div>;
const submitted=applications.filter(a=>a.submitted_at).length;const ready=applications.filter(a=>a.agreement_status==='signed').length;
return <>{error&&<div className="notice">{error}</div>}<div className="stat-grid"><div className="stat-card"><strong>{applications.length}</strong><span>total applicants</span></div><div className="stat-card"><strong>{submitted}</strong><span>submitted applications</span></div><div className="stat-card"><strong>{ready}</strong><span>signed agreements</span></div><div className="stat-card"><strong>{applications.filter(a=>a.status==='accepted').length}</strong><span>accepted contestants</span></div></div><section className="panel"><div style={{display:'flex',justifyContent:'space-between',gap:18,alignItems:'center'}}><div><p className="eyebrow">APPLICATION REVIEW</p><h2>All applicant records</h2></div><button className="button button--paper button--small">Export authorized CSV</button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Applicant ID</th><th>Status</th><th>Progress</th><th>Agreement</th><th>Submitted</th><th>Action</th></tr></thead><tbody>{applications.length?applications.map(app=><tr key={app.id}><td>{app.id.slice(0,8)}…</td><td><span className="status">{app.status}</span></td><td>{app.completion_percent}%</td><td><span className={`status ${app.agreement_status==='signed'?'status--green':''}`}>{app.agreement_status}</span></td><td>{app.submitted_at?new Date(app.submitted_at).toLocaleDateString():'—'}</td><td><Link href={`/admin/applications/${app.id}`}>Open →</Link></td></tr>):<tr><td colSpan={6}>No applicant records yet. New verified accounts will appear after the database migration is connected.</td></tr>}</tbody></table></div></section></>;
}
