"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import content from "../../content/application-content.json";
import { getStoredSession, rest, uploadPrivateFile } from "@/lib/supabase-browser";

type Question = { key:string; label:string; type:string; required:boolean|null; options?:unknown; wordLimit?:number|null };
type Section = { id:string; title:string; questions:Question[] };
type Answers = Record<string, string | boolean>;

function Field({ question, value, onChange, onFile }: { question: Question; value: string | boolean | undefined; onChange: (value: string | boolean) => void; onFile?: (file:File)=>Promise<void> }) {
  const required = question.required === true;
  const isLong = question.type === "long-text";
  const isCheck = ["checkbox", "consent"].includes(question.type);
  if (question.type === "review-status") return null;
  if (question.type === "agreement") return <div className="notice field--wide"><span>◆</span><div><strong>{question.label}</strong><br />Open the clean 42-section agreement, initial the 15 required sections, then sign before final submission.<div style={{marginTop:14}}><Link className="button button--ink button--small" href="/agreement">Open agreement</Link></div></div></div>;
  if (isCheck) return <label className="checkbox-row field--wide"><input type="checkbox" checked={Boolean(value)} required={required} onChange={(event)=>onChange(event.target.checked)} /><span>{question.label}{required && <b className="required"> *</b>}</span></label>;
  if (question.type === "file") return <div className="field field--wide"><label htmlFor={question.key}>{question.label}{required && <span className="required"> *</span>}</label><input id={question.key} type="file" required={required&&!value} accept="image/*,.pdf,.doc,.docx,.mp4,.mov" onChange={async(event)=>{const file=event.target.files?.[0];if(file&&onFile)await onFile(file);}} /><span className="field-help">{value?'Uploaded securely. Choose a new file only if you want to replace it.':'Files are securely attached to your verified account after upload.'}</span></div>;
  const common = { id: question.key, name: question.key, required, value: typeof value === 'string' ? value : '', onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  if (isLong) return <div className="field field--wide"><label htmlFor={question.key}>{question.label}{required && <span className="required"> *</span>}</label><textarea {...common} /><span className="field-help">Use your own voice. Thoughtful, honest responses matter more than perfect wording.</span></div>;
  const inputType = question.type === "date" ? "date" : question.type === "email" ? "email" : question.type === "tel" ? "tel" : question.type === "number" ? "number" : question.type.includes("url") ? "url" : "text";
  return <div className={`field ${['address','contact','repeatable-text','repeatable-url'].includes(question.type) ? 'field--wide' : ''}`}><label htmlFor={question.key}>{question.label}{required && <span className="required"> *</span>}</label><input {...common} type={inputType} /></div>;
}

export function ApplicationForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saved, setSaved] = useState(false);
  const [applicationId,setApplicationId]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const [submitted,setSubmitted]=useState(false);
  const [applicationsOpen,setApplicationsOpen]=useState(false);
  const sections = content.application.sections as Section[];
  const current = sections[step];
  const progress = Math.round(((step + 1) / sections.length) * 100);
  const visibleQuestions = useMemo(()=>current.questions.filter((q)=>q.type !== 'review-status'),[current]);

  useEffect(()=>{ async function load(){const draft=window.localStorage.getItem('miss-pgws-application-draft');if(draft){try{setAnswers(JSON.parse(draft));}catch{/* ignore invalid local draft */}}const session=getStoredSession();if(!session)return;const result=await rest<{id:string;answers:Answers}[]>(`pgws_applications?user_id=eq.${session.user.id}&select=id,answers&limit=1`);if(result.data?.[0]){setApplicationId(result.data[0].id);setAnswers(result.data[0].answers||{});}}load(); },[]);
  useEffect(()=>{void rest<{applications_open:boolean}[]>('pgws_platform_settings?singleton=eq.true&select=applications_open&limit=1').then((result)=>setApplicationsOpen(Boolean(result.data?.[0]?.applications_open)));},[]);
  async function saveDraft(){ window.localStorage.setItem('miss-pgws-application-draft',JSON.stringify(answers));const session=getStoredSession();if(session&&applicationId){const answered=Object.values(answers).filter(Boolean).length;const total=sections.flatMap(s=>s.questions).filter(q=>!['review-status','agreement'].includes(q.type)).length;const completion=Math.min(99,Math.round(answered/Math.max(total,1)*100));const result=await rest(`pgws_applications?id=eq.${applicationId}`,{method:'PATCH',body:JSON.stringify({answers,completion_percent:completion})});if(result.error)setNotice(result.error);else setNotice('Your private draft is saved to your account.');}else setNotice('Draft saved on this device. Sign in to save it securely across devices.');setSaved(true);window.setTimeout(()=>setSaved(false),2500); }
  async function upload(question:Question,file:File){const session=getStoredSession();if(!session||!applicationId){setNotice('Please sign in before uploading private files.');return;}const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const path=`${session.user.id}/${applicationId}/${question.key}/${Date.now()}-${safe}`;const result=await uploadPrivateFile(path,file);if(result.error){setNotice(result.error);return;}await rest('pgws_application_files',{method:'POST',body:JSON.stringify({application_id:applicationId,user_id:session.user.id,field_key:question.key,object_path:path,original_name:file.name,content_type:file.type,byte_size:file.size})});update(question.key,path);setNotice(`${question.label} uploaded securely.`);}
  async function submitApplication(){const session=getStoredSession();if(!session||!applicationId){setNotice('Please sign in before submitting your application.');return;}const profiles=await rest<{email_verified:boolean}[]>(`pgws_profiles?user_id=eq.${session.user.id}&select=email_verified&limit=1`);if(!profiles.data?.[0]?.email_verified){setNotice('Verify your email before final submission. Your draft will remain saved.');return;}const applications=await rest<{agreement_status:string}[]>(`pgws_applications?id=eq.${applicationId}&select=agreement_status&limit=1`);if(applications.data?.[0]?.agreement_status!=='signed'){setNotice('Read and sign the official agreement before submitting your application.');return;}const required=sections.flatMap(s=>s.questions).filter(q=>!['review-status','agreement'].includes(q.type)&&q.required===true);const missing=required.filter(q=>!answers[q.key]);if(missing.length){setNotice(`Complete ${missing.length} remaining required response${missing.length===1?'':'s'} before submitting.`);return;}const result=await rest(`pgws_applications?id=eq.${applicationId}`,{method:'PATCH',body:JSON.stringify({answers,status:'submitted',completion_percent:100,submitted_at:new Date().toISOString(),locked_at:new Date().toISOString()})});if(result.error)setNotice(result.error);else{setSubmitted(true);setNotice('Your application was submitted successfully. Staff can now review your verified record.');}}
  function update(key:string,value:string|boolean){ setAnswers((old)=>({...old,[key]:value})); }

  if(!applicationsOpen)return <section className="section section--paper preview-lock"><p className="eyebrow">APPLICATION STATUS</p><h1>Applications are currently closed.</h1><p className="lede">A national super administrator controls the official application window. You may join the interest community and review the dates while the application is closed.</p><div className="hero-actions"><a className="button button--lipstick" href={content.meta.urls.interestGroupMe} target="_blank" rel="noreferrer">Join the interest chat ↗</a><Link className="button button--paper" href="/timeline">Review competition dates</Link></div></section>;

  if(submitted)return <section className="section section--paper preview-lock"><p className="eyebrow">APPLICATION RECEIVED</p><h1>You are officially submitted.</h1><p className="lede">Your signed agreement, responses, and uploaded materials are now in the Staff Command Center for review. Sign in to your portal anytime to follow your application status.</p><div className="hero-actions"><a className="button button--lipstick" href={content.meta.urls.interestGroupMe} target="_blank" rel="noreferrer">Join the interest chat ↗</a><Link className="button button--ink" href="/portal">Open applicant portal</Link></div></section>;

  return <div className="form-layout">
    <aside className="form-rail">
      <p className="form-rail-title">Application progress</p>
      <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}} /></div>
      <p><strong>{progress}%</strong> · Section {step+1} of {sections.length}</p>
      <div className="form-step-list">{sections.map((section,index)=><button type="button" className="form-step" aria-current={index===step?'step':undefined} key={section.id} onClick={()=>setStep(index)}><b>{String(index+1).padStart(2,'0')}.</b> {section.title}</button>)}</div>
      <button type="button" className="button button--paper button--wide button--small" onClick={saveDraft}>Save draft</button>
      {saved && <p className="field-help" role="status" style={{textAlign:'center',marginBottom:0}}>{notice||'Draft saved.'}</p>}
    </aside>
    <section className="form-card">
      <p className="eyebrow">SECTION {String(step+1).padStart(2,'0')}</p>
      <h1>{current.title}</h1>
      <p className="form-card-intro">Complete this section in your own voice. Your work saves with your applicant account once the secure database is connected.</p>
      <form onSubmit={(event)=>{event.preventDefault(); if(step<sections.length-1)setStep(step+1);}}>
        <div className="form-grid">{visibleQuestions.map((question)=><Field key={question.key} question={question} value={answers[question.key]} onChange={(value)=>update(question.key,value)} onFile={(file)=>upload(question,file)} />)}</div>
        <div className="form-actions"><button type="button" className="button button--paper" disabled={step===0} onClick={()=>setStep(step-1)}>← Previous</button>{step<sections.length-1?<button className="button button--lipstick" type="submit" onClick={()=>void saveDraft()}>Save & continue →</button>:<button className="button button--lipstick" type="button" onClick={submitApplication}>Submit official application</button>}</div>
        {notice&&<div className="notice" role="status" style={{marginTop:18}}>{notice}</div>}
      </form>
    </section>
  </div>;
}

