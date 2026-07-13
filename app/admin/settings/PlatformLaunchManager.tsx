"use client";

import { useCallback, useEffect, useState } from "react";
import { rest } from "@/lib/supabase-browser";

type Settings = { public_mode:"preview"|"live"; applications_open:boolean; voting_open:boolean; legal_review_completed:boolean; scholarship_terms_approved:boolean; voting_rules_approved:boolean; processing_fee_terms_approved:boolean };
const defaults: Settings = { public_mode:"preview", applications_open:false, voting_open:false, legal_review_completed:false, scholarship_terms_approved:false, voting_rules_approved:false, processing_fee_terms_approved:false };

export function PlatformLaunchManager() {
  const [settings,setSettings]=useState(defaults); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const result=await rest<Settings[]>("pgws_platform_settings?singleton=eq.true&select=*");if(result.data?.[0])setSettings(result.data[0]);else if(result.error)setMessage(`${result.error} Run database migration 002 before using launch controls.`);},[]);
  useEffect(()=>{void load();},[load]);
  async function save(next:Partial<Settings>){setBusy(true);setMessage("");const result=await rest<Settings[]>("pgws_platform_settings?singleton=eq.true",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(next)});if(result.error)setMessage(result.error);else{setSettings(result.data?.[0]??{...settings,...next});setMessage("Launch controls updated.");}setBusy(false);}
  return <section className="panel launch-manager"><div><p className="eyebrow">PUBLIC LAUNCH CONTROL</p><h2>{settings.public_mode==="live"?"Live operations":"Applications currently closed"}</h2><p>Super administrators may open real applications now. Every opening is recorded in the permanent audit log.</p></div><div className="notice" style={{marginBottom:18}}><span>◆</span><div><strong>Internal advisory — nonblocking.</strong><br />External legal review is still recommended. This advisory does not prevent account creation, agreement signing, application submission, uploads, or staff review.</div></div><div className="launch-readiness">
    <label><input type="checkbox" checked={settings.legal_review_completed} onChange={(e)=>void save({legal_review_completed:e.target.checked})}/> External legal review completed</label>
    <label><input type="checkbox" checked={settings.scholarship_terms_approved} onChange={(e)=>void save({scholarship_terms_approved:e.target.checked})}/> Scholarship amounts and terms approved</label>
    <label><input type="checkbox" checked={settings.voting_rules_approved} onChange={(e)=>void save({voting_rules_approved:e.target.checked})}/> Voting, scoring, audit, and refund rules approved</label>
    <label><input type="checkbox" checked={settings.processing_fee_terms_approved} onChange={(e)=>void save({processing_fee_terms_approved:e.target.checked})}/> Processing-fee treatment approved and disclosed</label>
  </div><div className="launch-switches"><button type="button" className={`button ${settings.applications_open?"button--ink":"button--paper"}`} disabled={busy} onClick={()=>void save({applications_open:!settings.applications_open})}>{settings.applications_open?"Close applications":"Open real applications"}</button><button type="button" className={`button ${settings.voting_open?"button--ink":"button--paper"}`} disabled={busy} onClick={()=>void save({voting_open:!settings.voting_open})}>{settings.voting_open?"Close voting":"Open live voting"}</button></div>{message&&<p className="notice" role="status">{message}</p>}</section>;
}
