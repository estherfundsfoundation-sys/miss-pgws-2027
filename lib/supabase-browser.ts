"use client";

export type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown>; email_confirmed_at?: string | null };
export type AuthSession = { access_token: string; refresh_token: string; expires_in?: number; expires_at?: number; user: AuthUser };
type ApiResult<T> = { data: T | null; error: string | null; status: number };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const storageKey = "miss-pgws-2027-auth";

function configurationError() { return !url || !key ? "Secure accounts are awaiting the site’s Supabase connection." : null; }
function headers(session?: AuthSession | null) { return { apikey: key, "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }; }
async function parse<T>(response: Response): Promise<ApiResult<T>> { const body=await response.json().catch(()=>({})); if(!response.ok) return {data:null,error:body.msg||body.message||body.error_description||body.error||"The request could not be completed.",status:response.status}; return {data:body as T,error:null,status:response.status}; }

export function getStoredSession(): AuthSession | null { if(typeof window==='undefined')return null; const raw=window.localStorage.getItem(storageKey); if(!raw)return null; try{return JSON.parse(raw) as AuthSession;}catch{return null;} }
export function storeSession(session: AuthSession | null) { if(typeof window==='undefined')return; if(session)window.localStorage.setItem(storageKey,JSON.stringify(session));else window.localStorage.removeItem(storageKey); }

export async function signUp(input:{email:string;password:string;fullName:string;phone?:string;school?:string}) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<AuthSession>;
  const redirect=`${window.location.origin}/auth/callback`;
  const result=await parse<AuthSession>(await fetch(`${url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:headers(),body:JSON.stringify({email:input.email,password:input.password,data:{full_name:input.fullName,phone:input.phone||null,school:input.school||null,requested_role:'applicant'}})}));
  if(result.data?.access_token)storeSession(result.data); return result;
}

export async function signIn(email:string,password:string) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<AuthSession>;
  const result=await parse<AuthSession>(await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:headers(),body:JSON.stringify({email,password})}));
  if(result.data)storeSession(result.data); return result;
}

export async function refreshSession() {
  const current=getStoredSession();
  if(!current?.refresh_token||!url||!key){storeSession(null);return null;}
  const result=await parse<AuthSession>(await fetch(`${url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:headers(),body:JSON.stringify({refresh_token:current.refresh_token})}));
  if(result.data?.access_token){storeSession(result.data);return result.data;}
  storeSession(null);return null;
}

export async function requestPasswordReset(email:string) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<Record<string,never>>;
  return parse(await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${window.location.origin}/reset-password`)}`,{method:'POST',headers:headers(),body:JSON.stringify({email})}));
}

export async function updatePassword(password:string,override?:AuthSession|null) {
  const session=override??getStoredSession(); if(!session)return {data:null,error:"Your secure reset session is missing or expired. Request a new link.",status:401} as ApiResult<AuthUser>;
  return parse<AuthUser>(await fetch(`${url}/auth/v1/user`,{method:'PUT',headers:headers(session),body:JSON.stringify({password})}));
}

export async function signOut(){const session=getStoredSession();if(session&&url&&key)await fetch(`${url}/auth/v1/logout`,{method:'POST',headers:headers(session)}).catch(()=>null);storeSession(null);}

export function acceptSessionFromUrl(): AuthSession | null {
  if(typeof window==='undefined')return null;
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
  const access=hash.get('access_token');const refresh=hash.get('refresh_token');
  if(!access||!refresh)return null;
  const payload=JSON.parse(atob(access.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  const session:AuthSession={access_token:access,refresh_token:refresh,expires_at:Number(hash.get('expires_at'))||undefined,expires_in:Number(hash.get('expires_in'))||undefined,user:{id:payload.sub,email:payload.email,user_metadata:payload.user_metadata}};
  storeSession(session);return session;
}

export async function rest<T>(path:string,init:RequestInit={}) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<T>;
  let session=getStoredSession(); if(!session)return {data:null,error:"Please sign in to continue.",status:401} as ApiResult<T>;
  const request=(active:AuthSession)=>fetch(`${url}/rest/v1/${path}`,{...init,headers:{...headers(active),Prefer:'return=representation',...(init.headers||{})}});
  let response=await request(session);
  if(response.status===401){const renewed=await refreshSession();if(!renewed)return {data:null,error:"Your session expired. Please sign in again.",status:401} as ApiResult<T>;session=renewed;response=await request(session);}
  return parse<T>(response);
}

export async function publicRest<T>(path:string) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<T>;
  return parse<T>(await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,"Content-Type":"application/json"},cache:"no-store"}));
}

export async function createPrivateFileUrl(objectPath:string,expiresIn=900) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<{signedURL:string}>;
  let session=getStoredSession(); if(!session)return {data:null,error:"Please sign in to view private files.",status:401} as ApiResult<{signedURL:string}>;
  const request=(active:AuthSession)=>fetch(`${url}/storage/v1/object/sign/pgws-private/${objectPath.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:headers(active),body:JSON.stringify({expiresIn})});
  let response=await request(session);
  if(response.status===401){const renewed=await refreshSession();if(!renewed)return {data:null,error:"Your session expired. Please sign in again.",status:401} as ApiResult<{signedURL:string}>;session=renewed;response=await request(session);}
  const result=await parse<{signedURL:string}>(response);
  if(result.data?.signedURL&&!result.data.signedURL.startsWith('http'))result.data.signedURL=`${url}/storage/v1${result.data.signedURL}`;
  return result;
}

export function publicFileUrl(objectPath:string){return `${url}/storage/v1/object/public/pgws-public/${objectPath.split('/').map(encodeURIComponent).join('/')}`;}

export async function uploadPublicFile(objectPath:string,file:File) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<{Key:string}>;
  let session=getStoredSession(); if(!session)return {data:null,error:"Please sign in to upload files.",status:401} as ApiResult<{Key:string}>;
  const request=(active:AuthSession)=>fetch(`${url}/storage/v1/object/pgws-public/${objectPath.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${active.access_token}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
  let response=await request(session);
  if(response.status===401){const renewed=await refreshSession();if(!renewed)return {data:null,error:"Your session expired. Please sign in again.",status:401} as ApiResult<{Key:string}>;session=renewed;response=await request(session);}
  return parse<{Key:string}>(response);
}

export async function uploadPrivateFile(objectPath:string,file:File,upsert=false) {
  const missing=configurationError(); if(missing)return {data:null,error:missing,status:503} as ApiResult<{Key:string}>;
  let session=getStoredSession(); if(!session)return {data:null,error:"Please sign in to upload files.",status:401} as ApiResult<{Key:string}>;
  const request=(active:AuthSession)=>fetch(`${url}/storage/v1/object/pgws-private/${objectPath.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${active.access_token}`,'Content-Type':file.type||'application/octet-stream','x-upsert':upsert?'true':'false'},body:file});
  let response=await request(session);
  if(response.status===401){const renewed=await refreshSession();if(!renewed)return {data:null,error:"Your session expired. Please sign in again.",status:401} as ApiResult<{Key:string}>;session=renewed;response=await request(session);}
  return parse<{Key:string}>(response);
}
