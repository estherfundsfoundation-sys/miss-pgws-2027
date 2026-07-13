"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { acceptSessionFromUrl, requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/supabase-browser";

type Mode='login'|'create'|'forgot'|'reset'|'staff';
const copy={login:{eyebrow:'APPLICANT & CONTESTANT ACCESS',title:'Welcome back.',button:'Sign in'},create:{eyebrow:'CREATE YOUR APPLICANT ACCOUNT',title:'Step into the issue.',button:'Create account'},forgot:{eyebrow:'SECURE ACCOUNT RECOVERY',title:'Reset your password.',button:'Send reset link'},reset:{eyebrow:'CHOOSE A NEW PASSWORD',title:'Start fresh.',button:'Update password'},staff:{eyebrow:'AUTHORIZED STAFF ONLY',title:'Command center.',button:'Staff sign in'}} as const;

export function AuthPanel({mode}:{mode:Mode}){
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
      else {const r=await signIn(form.email,form.password);if(r.error)throw new Error(r.error);window.location.href=mode==='staff'?'/admin':'/portal';}
    }catch(reason){setError(reason instanceof Error?reason.message:'We could not complete that request.');}finally{setBusy(false);}
  }
  const c=copy[mode];
  return <div className="auth-card"><Link className="wordmark" href="/"><span className="wordmark-mark">✦</span><span><b>MISS PRETTY GIRLS WHO SERVE</b><small>THE NEW BEAUTY ISSUE · 2027</small></span></Link><p className="eyebrow" style={{marginTop:42}}>{c.eyebrow}</p><h1>{c.title}</h1>
    {mode==='create'&&<p className="form-card-intro">Your verified account saves your application, agreement, files, messages, and future contestant record in one place.</p>}
    {mode==='staff'&&<p className="form-card-intro">Your account must have an approved competition staff role. An email address alone never grants administrative access.</p>}
    {message&&<div className="notice notice--success" role="status">{message}</div>}{error&&<div className="notice" role="alert"><strong>{error}</strong></div>}
    <form className="auth-form" onSubmit={submit}>
      {mode==='create'&&<><div className="field"><label htmlFor="fullName">Full legal name</label><input id="fullName" value={form.fullName} onChange={e=>set('fullName',e.target.value)} required autoComplete="name" /></div><div className="field"><label htmlFor="school">College or university</label><input id="school" value={form.school} onChange={e=>set('school',e.target.value)} required /></div><div className="field"><label htmlFor="phone">Mobile phone</label><input id="phone" type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} required autoComplete="tel" /></div></>}
      {mode!=='reset'&&<div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" value={form.email} onChange={e=>set('email',e.target.value)} required autoComplete="email" /></div>}
      {!['forgot'].includes(mode)&&<><div className="field"><label htmlFor="password">{mode==='reset'?'New password':'Password'}</label><input id="password" type="password" value={form.password} onChange={e=>set('password',e.target.value)} required minLength={10} autoComplete={mode==='create'?'new-password':'current-password'} /></div>{['create','reset'].includes(mode)&&<div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" type="password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} required minLength={10} autoComplete="new-password" /></div>}</>}
      <button className="button button--lipstick button--wide" disabled={busy}>{busy?'Working…':c.button}</button>
    </form>
    <div className="auth-meta" style={{marginTop:20}}>{mode==='login'&&<><Link href="/forgot-password">Forgot password?</Link><Link href="/create-account">Create account</Link></>}{mode==='staff'&&<><Link href="/forgot-password">Forgot password?</Link><Link href="/help-signing-in">Need help?</Link></>}{mode==='create'&&<><span>Already registered?</span><Link href="/login">Sign in</Link></>}{mode==='forgot'&&<><span>Remembered it?</span><Link href="/login">Return to sign in</Link></>}{mode==='reset'&&<><span>Password updated?</span><Link href="/login">Go to sign in</Link></>}</div>
  </div>;
}
