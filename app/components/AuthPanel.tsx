"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { acceptSessionFromUrl, requestAdminLoginCode, requestPasswordReset, signIn, signUp, updatePassword, verifyEmailOtp } from "@/lib/supabase-browser";

type Mode='login'|'create'|'forgot'|'reset'|'staff';
const copy={login:{eyebrow:'APPLICANT & CONTESTANT ACCESS',title:'Welcome back.',button:'Sign in'},create:{eyebrow:'CREATE YOUR APPLICANT ACCOUNT',title:'Step into the issue.',button:'Create account'},forgot:{eyebrow:'SECURE ACCOUNT RECOVERY',title:'Reset your password.',button:'Send reset link'},reset:{eyebrow:'CHOOSE A NEW PASSWORD',title:'Start fresh.',button:'Update password'},staff:{eyebrow:'AUTHORIZED STAFF ONLY',title:'Command center.',button:'Staff sign in'}} as const;
const nationalAdminEmail='nationals@estherfundsinc.org';

function StaffAuthPanel(){
  const[email]=useState(nationalAdminEmail);
  const[code,setCode]=useState('');
  const[codeSent,setCodeSent]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);

  async function sendCode(){
    setError('');setMessage('');setBusy(true);
    try{
      const result=await requestAdminLoginCode(email);
      if(result.error)throw new Error(result.error);
      setCodeSent(true);
      setMessage(result.data?.message||'A secure login code was sent. Check your inbox and spam folder.');
    }catch(reason){setError(reason instanceof Error?reason.message:'The login code could not be sent.');}
    finally{setBusy(false);}
  }

  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(!codeSent){await sendCode();return;}
    setError('');setMessage('');setBusy(true);
    try{
      const token=code.replace(/\D/g,'');
      if(token.length!==6)throw new Error('Enter the six-digit code from the email.');
      const result=await verifyEmailOtp(email,token);
      if(result.error)throw new Error(result.error);
      window.location.href='/admin';
    }catch(reason){setError(reason instanceof Error?reason.message:'The login code could not be verified.');}
    finally{setBusy(false);}
  }

  return <div className="auth-card"><Link className="wordmark" href="/"><span className="wordmark-mark">&#10022;</span><span><b>MISS PRETTY GIRLS WHO SERVE</b><small>THE NEW BEAUTY ISSUE &middot; 2027</small></span></Link><p className="eyebrow" style={{marginTop:42}}>AUTHORIZED STAFF ONLY</p><h1>Command center.</h1>
    <p className="form-card-intro">No password is needed. We will email a one-time code to the approved national account. The code and an active staff role are both required.</p>
    {message&&<div className="notice notice--success" role="status">{message}</div>}{error&&<div className="notice" role="alert"><strong>{error}</strong></div>}
    <form className="auth-form" onSubmit={submit}>
      <div className="field"><label htmlFor="staff-email">Email address</label><input id="staff-email" type="email" value={email} readOnly autoComplete="email" /></div>
      {codeSent&&<div className="field"><label htmlFor="staff-code">Six-digit login code</label><input id="staff-code" type="text" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} required inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} placeholder="000000" /><span className="field-help">Check nationals@estherfundsinc.org, including Spam or Promotions. Never share this code.</span></div>}
      <button className="button button--lipstick button--wide" disabled={busy}>{busy?'Working...':codeSent?'Verify code and sign in':'Email me a code'}</button>
    </form>
    <div className="auth-meta" style={{marginTop:20}}>{codeSent?<button className="auth-link-button" type="button" disabled={busy} onClick={()=>void sendCode()}>Send a new code</button>:<span>Passwordless national access</span>}<Link href="/help-signing-in">Need help?</Link></div>
  </div>;
}

export function AuthPanel({mode}:{mode:Mode}){
  if(mode==='staff')return <StaffAuthPanel/>;
  const [form,setForm]=useState({fullName:'',school:'',phone:'',email:'',password:'',confirm:''});
  const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{if(mode==='reset')acceptSessionFromUrl();},[mode]);
  function set(name:keyof typeof form,value:string){setForm(old=>({...old,[name]:value}));}
  async function submit(event:React.FormEvent){event.preventDefault();setError('');setMessage('');setBusy(true);
    try{
      if((mode==='create'||mode==='reset')&&form.password!==form.confirm)throw new Error('The passwords do not match.');
      if((mode==='create'||mode==='reset')&&form.password.length<10)throw new Error('Use at least 10 characters for your password.');
      if(mode==='create'){const r=await signUp({email:form.email,password:form.password,fullName:form.fullName,phone:form.phone,school:form.school});if(r.error)throw new Error(r.error);setMessage('Your account was created. Check your inbox and spam folder for the verification email before continuing.');}
      else if(mode==='forgot'){const r=await requestPasswordReset(form.email);if(r.error&&r.status!==404)throw new Error(r.error);setMessage('If an account exists for that email address, password-reset instructions have been sent. Please check your inbox and spam folder.');}
      else if(mode==='reset'){const r=await updatePassword(form.password);if(r.error)throw new Error(r.error);setMessage('Your password was changed. You can now return to sign in.');}
      else {const r=await signIn(form.email,form.password);if(r.error)throw new Error(r.error);window.location.href='/portal';}
    }catch(reason){setError(reason instanceof Error?reason.message:'We could not complete that request.');}finally{setBusy(false);}
  }
  const c=copy[mode];
  return <div className="auth-card"><Link className="wordmark" href="/"><span className="wordmark-mark">✦</span><span><b>MISS PRETTY GIRLS WHO SERVE</b><small>THE NEW BEAUTY ISSUE · 2027</small></span></Link><p className="eyebrow" style={{marginTop:42}}>{c.eyebrow}</p><h1>{c.title}</h1>
    {mode==='create'&&<p className="form-card-intro">Your verified account saves your application, agreement, files, messages, and future contestant record in one place.</p>}
    {message&&<div className="notice notice--success" role="status">{message}</div>}{error&&<div className="notice" role="alert"><strong>{error}</strong></div>}
    <form className="auth-form" onSubmit={submit}>
      {mode==='create'&&<><div className="field"><label htmlFor="fullName">Full legal name</label><input id="fullName" value={form.fullName} onChange={e=>set('fullName',e.target.value)} required autoComplete="name" /></div><div className="field"><label htmlFor="school">College or university</label><input id="school" value={form.school} onChange={e=>set('school',e.target.value)} required /></div><div className="field"><label htmlFor="phone">Mobile phone</label><input id="phone" type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} required autoComplete="tel" /></div></>}
      {mode!=='reset'&&<div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" value={form.email} onChange={e=>set('email',e.target.value)} required autoComplete="email" /></div>}
      {!['forgot'].includes(mode)&&<><div className="field"><label htmlFor="password">{mode==='reset'?'New password':'Password'}</label><input id="password" type="password" value={form.password} onChange={e=>set('password',e.target.value)} required minLength={10} autoComplete={mode==='create'?'new-password':'current-password'} /></div>{['create','reset'].includes(mode)&&<div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" type="password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} required minLength={10} autoComplete="new-password" /></div>}</>}
      <button className="button button--lipstick button--wide" disabled={busy}>{busy?'Working…':c.button}</button>
    </form>
    <div className="auth-meta" style={{marginTop:20}}>{mode==='login'&&<><Link href="/forgot-password">Forgot password?</Link><Link href="/create-account">Create account</Link></>}{mode==='create'&&<><span>Already registered?</span><Link href="/login">Sign in</Link></>}{mode==='forgot'&&<><span>Remembered it?</span><Link href="/login">Return to sign in</Link></>}{mode==='reset'&&<><span>Password updated?</span><Link href="/login">Go to sign in</Link></>}</div>
  </div>;
}
