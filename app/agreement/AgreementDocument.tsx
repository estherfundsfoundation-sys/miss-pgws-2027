"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import agreement from "../../content/agreement-content.json";
import { getStoredSession, rest, uploadPrivateFile } from "@/lib/supabase-browser";

function Inline({ text }: { text: string }) {
  const pieces = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{pieces.map((piece,index)=>piece.startsWith('**')&&piece.endsWith('**')?<strong key={index}>{piece.slice(2,-2)}</strong>:<Fragment key={index}>{piece}</Fragment>)}</>;
}

function Markdown({ value }: { value: string }) {
  const blocks = value.trim().split(/\n\s*\n/);
  return <>{blocks.map((block,index)=>{
    const lines=block.split('\n');
    if(lines.every((line)=>line.startsWith('* '))) return <ul key={index}>{lines.map((line)=><li key={line}><Inline text={line.slice(2)} /></li>)}</ul>;
    if(lines.every((line)=>/^\d+\. /.test(line))) return <ol key={index}>{lines.map((line)=><li key={line}><Inline text={line.replace(/^\d+\. /,'')} /></li>)}</ol>;
    if(block.startsWith('## ')) return <h3 key={index}>{block.slice(3)}</h3>;
    return <p key={index}><Inline text={block.replace(/\n/g,' ')} /></p>;
  })}</>;
}

function SignaturePad({ onChange }: { onChange: (present:boolean,dataUrl?:string)=>void }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const drawing=useRef(false);
  function point(event:React.PointerEvent<HTMLCanvasElement>){ const canvas=canvasRef.current!; const rect=canvas.getBoundingClientRect(); return {x:(event.clientX-rect.left)*(canvas.width/rect.width),y:(event.clientY-rect.top)*(canvas.height/rect.height)}; }
  function start(event:React.PointerEvent<HTMLCanvasElement>){ drawing.current=true; const canvas=canvasRef.current!; canvas.setPointerCapture(event.pointerId); const ctx=canvas.getContext('2d')!; const p=point(event); ctx.beginPath();ctx.moveTo(p.x,p.y); }
  function move(event:React.PointerEvent<HTMLCanvasElement>){ if(!drawing.current)return; const ctx=canvasRef.current!.getContext('2d')!; const p=point(event);ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#181416';ctx.lineTo(p.x,p.y);ctx.stroke(); }
  function stop(){if(!drawing.current)return;drawing.current=false;const canvas=canvasRef.current!;onChange(true,canvas.toDataURL('image/png'));}
  function clear(){const canvas=canvasRef.current!;canvas.getContext('2d')!.clearRect(0,0,canvas.width,canvas.height);onChange(false);}
  return <div><canvas ref={canvasRef} width={720} height={170} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} style={{width:'100%',height:150,border:'1px solid #9f8e94',background:'#fff',touchAction:'none'}} aria-label="Draw your electronic signature" /><button type="button" className="text-link" onClick={clear} style={{border:0,background:'none',color:'var(--lipstick)',padding:'8px 0',cursor:'pointer'}}>Clear signature</button></div>;
}

export function AgreementDocument() {
  const requiredSections=agreement.initialRequirements.map((item)=>item.sectionNumber);
  const [initials,setInitials]=useState<Record<number,string>>({});
  const [acks,setAcks]=useState<Record<number,boolean>>({});
  const [fields,setFields]=useState<Record<string,string>>({});
  const [signaturePresent,setSignaturePresent]=useState(false);
  const [signatureData,setSignatureData]=useState('');
  const [finalChecked,setFinalChecked]=useState(false);
  const [submitMessage,setSubmitMessage]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const completed=requiredSections.filter((n)=>initials[n]?.trim().length>=2).length+agreement.finalAcknowledgments.filter((_,i)=>acks[i]).length+(signaturePresent?1:0)+(finalChecked?1:0);
  const total=requiredSections.length+agreement.finalAcknowledgments.length+2;
  const progress=Math.round(completed/total*100);
  const requiredFieldLabels=['Full Legal Name','Applicant Email','College or University','Date of Birth','Type Full Legal Name'];
  const canSubmit=completed===total&&requiredFieldLabels.every((label)=>fields[label]?.trim());
  const preamble=agreement.preambleMarkdown.replace(/^#.*$/gm,'').replace(/^\*\*Agreement Version:.*$/gm,'').replace(/^\*\*Effective Date:.*$/gm,'').replace(/^\*\*Competition Year:.*$/gm,'').trim();

  function download(){const current=[`# ${agreement.metadata.title}`,`## ${agreement.metadata.subtitle}`,agreement.metadata.documentType,'**Agreement Version:** 2027.07.13-current','**Effective Date:** July 13, 2026',agreement.preambleMarkdown,...agreement.sections.map((section)=>`# ${section.number}. ${section.heading}\n\n${section.bodyMarkdown}`),'# FINAL ACKNOWLEDGMENTS',...agreement.finalAcknowledgments.map((item)=>`* ${item}`)].join('\n\n');const blob=new Blob([current],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Miss-PGWS-2027-Applicant-Contestant-Agreement.md';a.click();URL.revokeObjectURL(url);}
  async function signAgreement(){setSubmitMessage('');setSubmitting(true);try{const session=getStoredSession();if(!session)throw new Error('Please sign in before signing the agreement.');const versions=await rest<{id:string;version_label:string;source_sha256:string}[]>('pgws_agreement_versions?active=eq.true&select=id,version_label,source_sha256&limit=1');const version=versions.data?.[0];if(!version)throw new Error('Staff must publish an active current agreement version before signatures can be accepted.');const applications=await rest<{id:string}[]>(`pgws_applications?user_id=eq.${session.user.id}&select=id&limit=1`);const applicationId=applications.data?.[0]?.id;if(!applicationId)throw new Error('Your application record is not ready. Sign out, sign back in, and try again.');if(!signatureData)throw new Error('Draw your signature before continuing.');const signatureBlob=await(await fetch(signatureData)).blob();const signatureFile=new File([signatureBlob],'electronic-signature.png',{type:'image/png'});const objectPath=`${session.user.id}/${applicationId}/agreement/${version.id}/signature.png`;const upload=await uploadPrivateFile(objectPath,signatureFile);if(upload.error)throw new Error(upload.error);const initialRows=requiredSections.map(section_number=>({application_id:applicationId,agreement_version_id:version.id,user_id:session.user.id,section_number,initials:initials[section_number].trim().toUpperCase()}));const initialsResult=await rest('pgws_agreement_initials',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(initialRows)});if(initialsResult.error)throw new Error(initialsResult.error);const signedAt=new Date().toISOString();const applicantSnapshot={full_legal_name:fields['Full Legal Name'],email:fields['Applicant Email'],college:fields['College or University'],date_of_birth:fields['Date of Birth'],typed_legal_name:fields['Type Full Legal Name'],signed_at:signedAt,agreement_version:version.version_label,source_sha256:version.source_sha256};const snapshot=JSON.stringify({applicantSnapshot,acknowledgments:agreement.finalAcknowledgments,initials:initialRows.map(r=>({section:r.section_number,initials:r.initials}))});const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot));const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');const signatureResult=await rest('rpc/pgws_sign_agreement',{method:'POST',body:JSON.stringify({p_application_id:applicationId,p_agreement_version_id:version.id,p_applicant_snapshot:applicantSnapshot,p_acknowledgment_snapshot:{items:agreement.finalAcknowledgments,accepted:true},p_signature_object_path:objectPath,p_signature_method:'drawn',p_user_agent:navigator.userAgent,p_immutable_record_hash:hash})});if(signatureResult.error)throw new Error(signatureResult.error);setSubmitMessage('Your agreement was signed and attached to your application. Return to the application and submit when ready. Use Print / save PDF to retain your copy.');}catch(reason){const message=reason instanceof Error?reason.message:'The agreement could not be signed.';setSubmitMessage(message.includes('row-level security')?'Your application is still saved. Please refresh this page, sign in again if prompted, and retry. If this message returns, contact nationals@estherfundsinc.org.':message);}finally{setSubmitting(false);}}

  return <div className="legal-layout">
    <aside className="legal-rail no-print">
      <p className="form-rail-title">Agreement progress</p>
      <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}} /></div>
      <p><strong>{progress}%</strong> · {completed} of {total} actions</p>
      <div style={{display:'grid',gap:8}}><button type="button" className="button button--ink button--small button--wide" onClick={()=>window.print()}>Print / save PDF</button><button type="button" className="button button--paper button--small button--wide" onClick={download}>Download agreement</button></div>
      <nav aria-label="Agreement sections">{agreement.sections.map((section)=><a href={`#section-${section.number}`} key={section.number}>{section.number}. {section.heading}</a>)}</nav>
    </aside>
    <article className="legal-document">
      <header className="legal-masthead"><p><strong>{agreement.metadata.title}</strong></p><h1>{agreement.metadata.subtitle}</h1><p>{agreement.metadata.documentType}</p></header>
      <div className="legal-meta"><div><b>Agreement Version</b><br />2027.07.13-current</div><div><b>Effective Date</b><br />July 13, 2026</div><div><b>Competition Year</b><br />{agreement.metadata.competitionYear}</div></div>
      <div className="notice no-print" style={{marginTop:18}}><span>◆</span><div><strong>Current agreement notice.</strong><br />External legal review remains recommended. Section 41 explains how later material revisions will be handled, including notice and re-acknowledgment where appropriate or required. This notice does not prevent signing or submitting.</div></div>
      <div className="legal-preamble"><Markdown value={preamble} /></div>
      {agreement.sections.map((section)=>{
        const body=section.bodyMarkdown.replace(/\*\*(Applicant|Contestant) Initials: ______\*\*/g,'').trim();
        return <section className="legal-section" id={`section-${section.number}`} key={section.number}>
          <h2>{section.number}. {section.heading}</h2>
          <Markdown value={body} />
          {section.initialRequirement&&<div className="initial-box"><label htmlFor={`initial-${section.number}`}>{section.initialRequirement.role} initials required after reading this section</label><input id={`initial-${section.number}`} maxLength={4} value={initials[section.number]||''} onChange={(event)=>setInitials((old)=>({...old,[section.number]:event.target.value}))} aria-label={`${section.initialRequirement.role} initials for section ${section.number}`} /></div>}
        </section>;
      })}
      <section className="legal-section" id="final-signature">
        <h2>Final acknowledgments</h2>
        <div className="ack-list">{agreement.finalAcknowledgments.map((text,index)=><label key={text}><input type="checkbox" checked={Boolean(acks[index])} onChange={(event)=>setAcks((old)=>({...old,[index]:event.target.checked}))} /><span>{text}</span></label>)}</div>
        <h2>Applicant information & electronic signature</h2>
        <div className="signature-grid">{agreement.signature.fields.filter((field)=>!['Draw or Upload Signature','Date Signed','Time Signed','Agreement Version'].includes(field.label)).map((field)=><div className="field" key={field.label}><label htmlFor={`signature-${field.label}`}>{field.label} <span className="required">*</span></label><input id={`signature-${field.label}`} type={field.label==='Applicant Email'?'email':field.label==='Date of Birth'?'date':'text'} value={fields[field.label]||''} onChange={(event)=>setFields((old)=>({...old,[field.label]:event.target.value}))} /></div>)}</div>
        <div className="field" style={{marginTop:22}}><label>Draw your signature <span className="required">*</span></label><SignaturePad onChange={(present,dataUrl)=>{setSignaturePresent(present);setSignatureData(dataUrl||'');}} /><span className="field-help">Your drawn signature is stored privately with the frozen agreement version and signed record.</span></div>
        <label className="checkbox-row" style={{marginTop:18}}><input type="checkbox" checked={finalChecked} onChange={(event)=>setFinalChecked(event.target.checked)} /><span>{agreement.signature.finalCheckbox}</span></label>
        <div className="legal-submit"><p><strong>Signed date, time, version, account, and application ID are recorded automatically at final submission.</strong></p><button type="button" className="button button--lipstick button--wide" disabled={!canSubmit||submitting} onClick={signAgreement}>{submitting?'Securing signed record…':'Sign & attach to application'}</button>{!canSubmit&&<p className="field-help" style={{textAlign:'center'}}>Complete every required initial, acknowledgment, applicant field, signature, and final checkbox to continue.</p>}{submitMessage&&<p role="status" style={{textAlign:'center'}}>{submitMessage}</p>}</div>
      </section>
    </article>
  </div>;
}
