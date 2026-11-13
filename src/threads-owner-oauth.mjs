/** Owner-only Threads OAuth. Meta grants threads_basic, never publish scopes.
 * State and nonce are single-use; long-lived token remains AES-GCM encrypted in
 * the existing private D1. No automatic publication, token export or logging.
 */
import {digest,importEncryptionKey,seal,unseal,secureRandom} from "./listening-crypto.mjs";
import {constantEqual,ownerJson,ownerError,ownerRedirect,
  isListeningOwner,validOwnerOrigin,boundDatabase} from "./listening-owner-core.mjs";

const CALLBACK="https://devonakins.com/api/threads/auth/callback";
const COOKIE="__Host-threads_oauth";
const SCOPE="threads_basic";
const HANDLE=/^[A-Za-z0-9._]{1,30}$/;
const NUMBER=/^[0-9]{4,32}$/;
// Reject unsafe JSON number IDs; converting a rounded 64-bit Meta ID to text
// could associate a callback or stored grant with the wrong account.
const metaId=value=>typeof value==="string"&&NUMBER.test(value)?value:
  typeof value==="number"&&Number.isSafeInteger(value)&&NUMBER.test(String(value))?
    String(value):null;
// Meta may represent an opaque, 17+ digit account ID as a JSON number.
// Preserve its exact lexical digits BEFORE JavaScript rounds the Number.
// If the reviver source context is unavailable, unsafe IDs still fail closed.
function preserveProviderId(key,value,context){
  if((key==="id"||key==="user_id") && typeof value==="number" &&
     typeof context?.source==="string" && NUMBER.test(context.source))
    return context.source;
  return value;
}
const STR=/^[A-Za-z0-9_-]{43}$/;
const GRACE_MS=60_000;
const REFRESH_MIN_AGE_MS=24*60*60_000;
const clearCookie=COOKIE+"=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax";
const makeCookie=value=>COOKIE+"="+value+"; Path=/; Max-Age=300; Secure; HttpOnly; SameSite=Lax";
const cookieValue=header=>(header||"").split(";").map(p=>p.trim())
  .find(p=>p.startsWith(COOKIE+"="))?.slice(COOKIE.length+1)||"";
const failed=code=>ownerRedirect("/owner/presence/?threads="+code,{"Set-Cookie":clearCookie});
export const threadsAppConfigured=env=>
  typeof env?.THREADS_APP_ID==="string" && /^[0-9]{10,32}$/.test(env.THREADS_APP_ID) &&
  typeof env?.THREADS_APP_SECRET==="string" &&
  env.THREADS_APP_SECRET.length>=20 && env.THREADS_APP_SECRET.length<=512;
const validTimestamp=x=>Number.isSafeInteger(x)&&x>0;
async function accountRow(db) {
  return db.prepare("SELECT revision,token_cipher,username,threads_user_id,connected_at,token_expires_at,verified_at FROM threads_connection WHERE id=1").first();
}
export async function storedThreadsCredential(env={},at=Date.now()) {
  if(!boundDatabase(env)||typeof env.LISTENING_TOKEN_KEY!=="string")return null;
  try {
    const row=await accountRow(env.LISTENING_DB);
    if(!row || typeof row.token_cipher!=="string" ||
       !HANDLE.test(row.username||"") || !NUMBER.test(row.threads_user_id||"") ||
       !validTimestamp(row.token_expires_at) ||
       row.token_expires_at<=at+GRACE_MS)return null;
    const key=await importEncryptionKey(env.LISTENING_TOKEN_KEY);
    const token=await unseal(row.token_cipher,key,"threads-long-lived-access");
    if(typeof token!=="string"||token.length<20||token.length>4096)return null;
    return {token,username:row.username,userId:row.threads_user_id,revision:row.revision,
      expiresAt:row.token_expires_at,cipher:row.token_cipher,
      verifiedAt:row.verified_at};
  } catch {return null;}
}
export async function storedThreadsStatus(env={},at=Date.now()) {
  const unavailable={version:1,appConfigured:threadsAppConfigured(env),
    storageReady:false,connected:false,expiresAt:null,verifiedAt:null};
  if(!boundDatabase(env)||typeof env.LISTENING_TOKEN_KEY!=="string")return unavailable;
  try {
    const row=await accountRow(env.LISTENING_DB);
    if(!row)return unavailable;
    const valid=typeof row.token_cipher==="string" &&
      HANDLE.test(row.username||"") && NUMBER.test(row.threads_user_id||"") &&
      validTimestamp(row.token_expires_at) &&
      row.token_expires_at>at+GRACE_MS;
    return {version:1,appConfigured:threadsAppConfigured(env),storageReady:true,
      connected:valid,expiresAt:valid?new Date(row.token_expires_at).toISOString():null,
      verifiedAt:valid&&validTimestamp(row.verified_at)?
        new Date(row.verified_at).toISOString():null};
  } catch {return unavailable;}
}
async function providerJson(response,max=4096) {
  if(!response?.ok)throw Error("Provider unavailable");
  const len=Number(response.headers?.get("Content-Length")||0);
  if(!Number.isFinite(len)||len>max)throw Error("Provider unavailable");
  const reader=response.body?.getReader();
  if(!reader)throw Error("Provider unavailable");
  const parts=[];let size=0;
  try {
    while(true){
      const part=await reader.read();
      if(part.done)break;
      size+=part.value.byteLength;
      if(size>max){await reader.cancel();throw Error("Provider unavailable");}
      parts.push(part.value);
    }
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes),preserveProviderId);
}
async function begin(env,now) {
  if(!threadsAppConfigured(env))return ownerError("Meta Threads app is not configured",409);
  if(!boundDatabase(env)||typeof env.LISTENING_TOKEN_KEY!=="string")
    return ownerError("Private integration unavailable");
  const row=await accountRow(env.LISTENING_DB);
  if(!row)return ownerError("Private Threads migration missing",409);
  const state=secureRandom(32),nonce=secureRandom(32);
  const [stateHash,nonceHash]=await Promise.all([digest(state),digest(nonce)]);
  await env.LISTENING_DB.prepare("DELETE FROM threads_oauth_attempt").run();
  await env.LISTENING_DB.prepare(
    "INSERT INTO threads_oauth_attempt(state_hash,nonce_hash,expires_at) VALUES(?,?,?)"
  ).bind(stateHash,nonceHash,now+300_000).run();
  // Open Meta's current canonical Threads host directly; avoid a legacy
  // threads.net -> threads.com redirect dropping OAuth query parameters.
  const url=new URL("https://threads.com/oauth/authorize");
  url.search=new URLSearchParams({client_id:env.THREADS_APP_ID,
    redirect_uri:CALLBACK,scope:SCOPE,response_type:"code",state}).toString();
  return ownerJson({authorizeUrl:url.href},200,{"Set-Cookie":makeCookie(nonce)});
}
async function finish(request,env,now,fetcher){
  const url=new URL(request.url);
  const state=url.searchParams.get("state"),code=url.searchParams.get("code");
  const nonce=cookieValue(request.headers.get("Cookie"));
  if(url.origin!=="https://devonakins.com" ||
     url.searchParams.getAll("state").length!==1 ||
     url.searchParams.getAll("code").length!==1 ||
     !STR.test(state||"")||!STR.test(nonce)||!code||code.length>4096||
     /[\u0000-\u001f\u007f]/.test(code))return failed("callback");
  const stateHash=await digest(state);
  const db=env.LISTENING_DB;
  const attempt=await db.prepare(
    "SELECT nonce_hash,expires_at FROM threads_oauth_attempt WHERE state_hash=?"
  ).bind(stateHash).first();
  if(!attempt||attempt.expires_at<=now||
     !constantEqual(await digest(nonce),attempt.nonce_hash))
    return failed("expired");
  const claimed=await db.prepare(
    "UPDATE threads_oauth_attempt SET expires_at=0 WHERE state_hash=? AND nonce_hash=? AND expires_at>? RETURNING state_hash"
  ).bind(stateHash,attempt.nonce_hash,now).first();
  if(!claimed)return failed("reused");
  let stage="exchange";
  try {
    if(!threadsAppConfigured(env))throw Error("Configuration changed");
    const short=await providerJson(await fetcher("https://graph.threads.net/oauth/access_token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},
      body:new URLSearchParams({client_id:env.THREADS_APP_ID,
        client_secret:env.THREADS_APP_SECRET,code,grant_type:"authorization_code",
        redirect_uri:CALLBACK}).toString(),redirect:"error",cache:"no-store",
      signal:AbortSignal.timeout(8000),
    }));
    if(typeof short.access_token!=="string"||short.access_token.length<20||
       short.access_token.length>4096||!metaId(short.user_id))
      throw Error("Invalid authorization");
    // Meta requires the short-lived token and app secret as query parameters
    // for the long-lived exchange. Both go ONLY to Meta's fixed HTTPS origin,
    // never to the browser, application URL, logs or any redirect target.
    stage="extend";
    const exchange=new URL("https://graph.threads.net/access_token");
    exchange.search=new URLSearchParams({grant_type:"th_exchange_token",
      client_secret:env.THREADS_APP_SECRET,access_token:short.access_token}).toString();
    const long=await providerJson(await fetcher(exchange.href,{
      method:"GET",headers:{Accept:"application/json"},cache:"no-store",
      redirect:"error",signal:AbortSignal.timeout(8000),
    }));
    if(typeof long.access_token!=="string"||long.access_token.length<20||
       long.access_token.length>4096||String(long.token_type||"").toLowerCase()!=="bearer"||
       !Number.isSafeInteger(Number(long.expires_in)) ||
       Number(long.expires_in)<3600 || Number(long.expires_in)>90*86400)
      throw Error("Invalid token lifetime");
    stage="profile";
    const identity=await providerJson(await fetcher(
      "https://graph.threads.net/v1.0/me?fields=id%2Cusername",{
      method:"GET",headers:{Authorization:"Bearer "+long.access_token,
        Accept:"application/json"},cache:"no-store",redirect:"error",
      signal:AbortSignal.timeout(8000),
    }));
    if(!metaId(identity.id) ||
       metaId(identity.id)!==metaId(short.user_id) ||
       typeof identity.username!=="string"||!HANDLE.test(identity.username) ||
       (typeof env.THREADS_PUBLIC_USERNAME==="string" &&
        identity.username.toLowerCase()!==env.THREADS_PUBLIC_USERNAME.toLowerCase()))
      throw Error("Wrong account");
    const key=await importEncryptionKey(env.LISTENING_TOKEN_KEY);
    stage="storage";
    const cipher=await seal(long.access_token,key,"threads-long-lived-access");
    const until=now+Number(long.expires_in)*1000;
    // A Stop/disconnect or newer attempt deletes this marker; a delayed
    // provider response can never reestablish a revoked connection.
    const saved=await db.prepare(
      "UPDATE threads_connection SET revision=revision+1,token_cipher=?,username=?,threads_user_id=?,"+
      "connected_at=?,token_expires_at=?,verified_at=? WHERE id=1 AND EXISTS "+
      "(SELECT 1 FROM threads_oauth_attempt WHERE state_hash=? AND nonce_hash=? AND expires_at=0)"
    ).bind(cipher,identity.username,metaId(identity.id),now,until,now,stateHash,attempt.nonce_hash).run();
    if(saved.meta?.changes!==1)return failed("expired");
    return ownerRedirect("/owner/presence/?threads=connected",{"Set-Cookie":clearCookie});
  } catch {
    // Stage-only owner diagnostic: never include provider body, token or code.
    return failed(stage);
  } finally {
    await db.prepare(
      "DELETE FROM threads_oauth_attempt WHERE state_hash=? AND nonce_hash=? AND expires_at=0"
    ).bind(stateHash,attempt.nonce_hash).run();
  }
}
/** Explicit owner-only refresh of an unexpired, >=24-hour-old Threads token.
 * The current revision, ciphertext and issue metadata are optimistic guards.
 * A disconnect or newer OAuth grant wins over this delayed provider request.
 */
async function renew(env,now,fetcher){
  const current=await storedThreadsCredential(env,now);
  if(!current)return ownerError("Reconnect Threads to renew authorization",409);
  if(!Number.isSafeInteger(current.verifiedAt) ||
     current.verifiedAt<=0 || current.verifiedAt>now ||
     now-current.verifiedAt<REFRESH_MIN_AGE_MS)
    return ownerError("Threads authorization is not ready for renewal",429);
  // Meta requires the current unexpired long-lived credential in a query.
  // Fixed HTTPS host, no redirect or logging; never return it to owner JS.
  const endpoint=new URL("https://graph.threads.net/refresh_access_token");
  endpoint.search=new URLSearchParams({
    grant_type:"th_refresh_token",access_token:current.token,
  }).toString();
  const result=await providerJson(await fetcher(endpoint.href,{
    method:"GET",headers:{Accept:"application/json"},cache:"no-store",
    redirect:"error",signal:AbortSignal.timeout(8000),
  }));
  if(typeof result.access_token!=="string" || result.access_token.length<20 ||
     result.access_token.length>4096 ||
     String(result.token_type||"").toLowerCase()!=="bearer" ||
     !Number.isSafeInteger(Number(result.expires_in)) ||
     Number(result.expires_in)<3600 ||
     Number(result.expires_in)>90*86400)
    return ownerError("Threads provider did not renew authorization",503);
  const profile=await providerJson(await fetcher(
    "https://graph.threads.net/v1.0/me?fields=id%2Cusername",{
      method:"GET",
      headers:{Authorization:"Bearer "+result.access_token,Accept:"application/json"},
      cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000),
    }));
  if(!metaId(profile.id) ||
     typeof profile.username!=="string" ||
     !HANDLE.test(profile.username) ||
     metaId(profile.id)!==current.userId ||
     profile.username.toLowerCase()!==current.username.toLowerCase())
    return ownerError("Renewed Threads account did not match",409);
  const key=await importEncryptionKey(env.LISTENING_TOKEN_KEY);
  const cipher=await seal(result.access_token,key,"threads-long-lived-access");
  const expires=now+Number(result.expires_in)*1000;
  const saved=await env.LISTENING_DB.prepare(
    "UPDATE threads_connection SET revision=revision+1,token_cipher=?,"+
    "token_expires_at=?,verified_at=? WHERE id=1 AND revision=? "+
    "AND token_cipher=? AND token_expires_at=? AND verified_at=?"
  ).bind(cipher,expires,now,current.revision,
    current.cipher,current.expiresAt,current.verifiedAt).run();
  if(saved.meta?.changes!==1)
    return ownerError("Threads connection changed during renewal",409);
  return ownerJson({version:1,connection:"renewed",
    expiresAt:new Date(expires).toISOString(),checkedAt:new Date(now).toISOString()});
}
async function disconnect(env){
  const db=env.LISTENING_DB;
  await db.prepare("DELETE FROM threads_oauth_attempt").run();
  const row=await db.prepare(
    "UPDATE threads_connection SET revision=revision+1,token_cipher=NULL,username=NULL,threads_user_id=NULL,"+
    "connected_at=0,token_expires_at=0,verified_at=0 WHERE id=1"
  ).run();
  if(row.meta?.changes!==1)return ownerError("Private Threads migration missing",409);
  return ownerJson({version:1,connected:false});
}
export function createThreadsOwnerOAuth({fetcher=fetch,clock=Date.now}={}){
  return async (request,env={},ctx={})=>{
    if(!(await isListeningOwner(env,ctx)))
      return ownerError("Owner authentication required",403);
    const path=new URL(request.url).pathname;
    if(!["/api/threads/auth/status","/api/threads/auth/start",
         "/api/threads/auth/callback","/api/threads/auth/disconnect",
         "/api/threads/auth/renew"].includes(path))
      return ownerError("Not found",404);
    if(path==="/api/threads/auth/status"&&request.method==="GET")
      return ownerJson(await storedThreadsStatus(env,clock()));
    if(!boundDatabase(env)||typeof env.LISTENING_TOKEN_KEY!=="string")
      return ownerError("Private integration unavailable");
    try {
      const now=clock();
      if(path==="/api/threads/auth/callback"&&request.method==="GET")
        return await finish(request,env,now,fetcher);
      if(request.method!=="POST")return ownerError("Method not allowed",405);
      if(!validOwnerOrigin(request))return ownerError("Cross-site operation denied",403);
      if(path==="/api/threads/auth/start")return await begin(env,now);
      if(path==="/api/threads/auth/disconnect")return await disconnect(env);
      if(path==="/api/threads/auth/renew")return await renew(env,now,fetcher);
      return ownerError("Method not allowed",405);
    } catch {
      return ownerError("Private Threads connection unavailable");
    }
  };
}
