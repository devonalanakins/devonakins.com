/** Owner-only Threads OAuth. Meta grants threads_basic, never publish scopes.
 * State and nonce are single-use; long-lived token remains AES-GCM encrypted in
 * the existing private D1. No automatic publication, token export or logging.
 */
import {digest,importEncryptionKey,seal,unseal,secureRandom} from "./listening-crypto.mjs";
import {constantEqual,ownerJson,ownerError,ownerRedirect,readSmallJson,
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
const SAFE_EXCHANGE_DETAIL=/^(?:http-[45][0-9]{2}(?:-meta-[0-9]{1,9}(?:-sub-[0-9]{1,9})?)?|timeout|network|malformed-json|invalid-payload|unreadable-response|configuration|redirect|other)$/;
const failed=(code,detail=null)=>{
  const suffix=code==="exchange" && SAFE_EXCHANGE_DETAIL.test(detail||"")?
    "&detail="+encodeURIComponent(detail):"";
  return ownerRedirect("/owner/presence/?threads="+code+suffix,{"Set-Cookie":clearCookie});
};
const metaErrorNumber=value=>
  typeof value==="number"&&Number.isSafeInteger(value)&&value>=0&&value<=999999999?
    String(value):
    typeof value==="string"&&/^[0-9]{1,9}$/.test(value)?value:null;
// Extract ONLY Meta's bounded numeric error identifiers. Never return, persist
// or log the raw provider response (which may contain tokens or user details).
async function metaExchangeHttpDetail(response){
  const status=Number(response?.status);
  // Manual redirects must fail closed before any Location is followed.
  if(Number.isInteger(status)&&status>=300&&status<400)return "redirect";
  if(!Number.isInteger(status)||status<400||status>599)return "other";
  let detail="http-"+status;
  try {
    const body=await providerJson({
      ok:true,headers:response.headers,body:response.body,
    },2048);
    const code=metaErrorNumber(body?.error?.code);
    const sub=metaErrorNumber(body?.error?.error_subcode);
    if(code)detail+="-meta-"+code+(sub?"-sub-"+sub:"");
  }catch { /* Keep only the safe HTTP status if Meta's error body is unreadable. */ }
  return detail;
}
function exchangeFailureDetail(error){
  if(SAFE_EXCHANGE_DETAIL.test(error?.exchangeDetail||""))return error.exchangeDetail;
  if(error?.name==="TimeoutError"||error?.name==="AbortError")return "timeout";
  if(error?.name==="SyntaxError")return "malformed-json";
  if(error?.message==="Invalid authorization")return "invalid-payload";
  if(error?.message==="Provider unavailable")return "unreadable-response";
  if(error?.message==="Configuration changed")return "configuration";
  if(error instanceof TypeError)return "network";
  return "other";
}
export const threadsAppConfigured=env=>
  typeof env?.THREADS_APP_ID==="string" && /^[0-9]{10,32}$/.test(env.THREADS_APP_ID) &&
  typeof env?.THREADS_APP_SECRET==="string" &&
  env.THREADS_APP_SECRET.length>=20 && env.THREADS_APP_SECRET.length<=512;
const validTimestamp=x=>Number.isSafeInteger(x)&&x>0;
async function accountRow(db) {
  return db.prepare("SELECT revision,token_cipher,username,threads_user_id,connected_at,token_expires_at,verified_at,public_feed_enabled FROM threads_connection WHERE id=1").first();
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
      verifiedAt:row.verified_at,publicFeedEnabled:row.public_feed_enabled===1};
  } catch {return null;}
}
const threadsReleaseApproved=env=>env?.PRESENCE_ENABLED==="true" &&
  env?.PRESENCE_PUBLIC_RELEASE_APPROVED==="true" &&
  env?.THREADS_PUBLIC_RELEASE_APPROVED==="true" &&
  env?.THREADS_PUBLIC_FEED_ENABLED==="true";
export async function storedThreadsStatus(env={},at=Date.now()) {
  const releaseApproved=threadsReleaseApproved(env);
  const unavailable={version:1,appConfigured:threadsAppConfigured(env),
    storageReady:false,connected:false,expiresAt:null,verifiedAt:null,
    revision:null,publicFeedEnabled:false,releaseApproved};
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
        new Date(row.verified_at).toISOString():null,
      revision:row.revision,publicFeedEnabled:valid&&row.public_feed_enabled===1,
      releaseApproved};
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
    // Workers rejects redirect:"error" before sending any request. Manual
    // mode preserves our no-follow policy: every 3xx is rejected below.
    const shortResponse=await fetcher("https://graph.threads.com/oauth/access_token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},
      body:new URLSearchParams({client_id:env.THREADS_APP_ID,
        client_secret:env.THREADS_APP_SECRET,code,grant_type:"authorization_code",
        redirect_uri:CALLBACK}).toString(),redirect:"manual",cache:"no-store",
      signal:AbortSignal.timeout(8000),
    });
    if(!shortResponse?.ok){
      const error=new Error("Meta exchange rejected");
      error.exchangeDetail=await metaExchangeHttpDetail(shortResponse);
      throw error;
    }
    const short=await providerJson(shortResponse);
    if(!short||typeof short!=="object"||Array.isArray(short) ||
       typeof short.access_token!=="string"||short.access_token.length<20||
       short.access_token.length>4096||!metaId(short.user_id))
      throw Error("Invalid authorization");
    // Meta requires the short-lived token and app secret as query parameters
    // for the long-lived exchange. Both go ONLY to Meta's fixed HTTPS origin,
    // never to the browser, application URL, logs or any redirect target.
    stage="extend";
    const exchange=new URL("https://graph.threads.com/access_token");
    exchange.search=new URLSearchParams({grant_type:"th_exchange_token",
      client_secret:env.THREADS_APP_SECRET,access_token:short.access_token}).toString();
    const long=await providerJson(await fetcher(exchange.href,{
      method:"GET",headers:{Accept:"application/json"},cache:"no-store",
      redirect:"manual",signal:AbortSignal.timeout(8000),
    }));
    if(typeof long.access_token!=="string"||long.access_token.length<20||
       long.access_token.length>4096||String(long.token_type||"").toLowerCase()!=="bearer"||
       !Number.isSafeInteger(Number(long.expires_in)) ||
       Number(long.expires_in)<3600 || Number(long.expires_in)>90*86400)
      throw Error("Invalid token lifetime");
    stage="profile";
    const identity=await providerJson(await fetcher(
      "https://graph.threads.com/v1.0/me?fields=id%2Cusername",{
      method:"GET",headers:{Authorization:"Bearer "+long.access_token,
        Accept:"application/json"},cache:"no-store",redirect:"manual",
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
      "connected_at=?,token_expires_at=?,verified_at=?,public_feed_enabled=0 WHERE id=1 AND EXISTS "+
      "(SELECT 1 FROM threads_oauth_attempt WHERE state_hash=? AND nonce_hash=? AND expires_at=0)"
    ).bind(cipher,identity.username,metaId(identity.id),now,until,now,stateHash,attempt.nonce_hash).run();
    if(saved.meta?.changes!==1)return failed("expired");
    return ownerRedirect("/owner/presence/?threads=connected",{"Set-Cookie":clearCookie});
  } catch(error) {
    // An allowlisted, non-sensitive diagnostic is shown only in the private
    // owner redirect. Never expose authorization codes, access tokens or raw
    // Meta errors in a browser URL, logs, or public configuration.
    return failed(stage,stage==="exchange"?exchangeFailureDetail(error):null);
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
  const endpoint=new URL("https://graph.threads.com/refresh_access_token");
  endpoint.search=new URLSearchParams({
    grant_type:"th_refresh_token",access_token:current.token,
  }).toString();
  const result=await providerJson(await fetcher(endpoint.href,{
    method:"GET",headers:{Accept:"application/json"},cache:"no-store",
    redirect:"manual",signal:AbortSignal.timeout(8000),
  }));
  if(typeof result.access_token!=="string" || result.access_token.length<20 ||
     result.access_token.length>4096 ||
     String(result.token_type||"").toLowerCase()!=="bearer" ||
     !Number.isSafeInteger(Number(result.expires_in)) ||
     Number(result.expires_in)<3600 ||
     Number(result.expires_in)>90*86400)
    return ownerError("Threads provider did not renew authorization",503);
  const profile=await providerJson(await fetcher(
    "https://graph.threads.com/v1.0/me?fields=id%2Cusername",{
      method:"GET",
      headers:{Authorization:"Bearer "+result.access_token,Accept:"application/json"},
      cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(8000),
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
    "connected_at=0,token_expires_at=0,verified_at=0,public_feed_enabled=0 WHERE id=1"
  ).run();
  if(row.meta?.changes!==1)return ownerError("Private Threads migration missing",409);
  return ownerJson({version:1,connected:false});
}
/** Owner-only public-post visibility. A stale browser can never re-enable a
 * revoked feed; OFF is idempotent and wins even if its revision is stale. */
async function changePublicVisibility(request,env,at){
  let payload;
  try {payload=await readSmallJson(request);}
  catch {return ownerError("Invalid Threads visibility request",400);}
  if(!payload || typeof payload!=="object" || Array.isArray(payload) ||
     Object.keys(payload).length!==2 ||
     Object.keys(payload).some(k=>!["enabled","revision"].includes(k)) ||
     typeof payload.enabled!=="boolean" ||
     !Number.isSafeInteger(payload.revision) || payload.revision<0)
    return ownerError("Invalid Threads visibility request",400);
  const db=env.LISTENING_DB;
  const row=await accountRow(db);
  if(!row)return ownerError("Private Threads migration required",409);
  if(!payload.enabled){
    const change=await db.prepare(
      // Always advance revision, even when already hidden. This fences
      // a concurrent enable that read the old revision before OFF arrived.
      "UPDATE threads_connection SET public_feed_enabled=0,revision=revision+1 "+
      "WHERE id=1"
    ).run();
    if(change.meta?.changes!==1)
      return ownerError("Visibility update unavailable",503);
    return ownerJson(await storedThreadsStatus(env,at));
  }
  // Owner consent may be saved before a separate protected release. Only
  // the global presence approval is required here; the read-only public
  // reader still needs BOTH independent Threads release flags to publish.
  if(env.PRESENCE_ENABLED!=="true" ||
     env.PRESENCE_PUBLIC_RELEASE_APPROVED!=="true")
    return ownerError("Global public presence is not approved",403);
  if(payload.revision!==row.revision)
    return ownerError("Threads connection changed. Refresh before sharing.",409);
  if(typeof row.token_cipher!=="string" ||
     !HANDLE.test(row.username||"") || !NUMBER.test(row.threads_user_id||"") ||
     !validTimestamp(row.verified_at) || row.token_expires_at<=at+GRACE_MS)
    return ownerError("A verified Threads connection is required",409);
  // Independent global presence opt-in. Read public flags without touching
  // provider credentials or using the incoming browser identity as authority.
  const presence=await db.prepare(
    "SELECT public_enabled,private_work FROM presence_state WHERE id=1"
  ).first();
  if(presence?.public_enabled!==1 || presence?.private_work===1)
    return ownerError("Enable global public presence first",409);
  if(row.public_feed_enabled===1)
    return ownerJson(await storedThreadsStatus(env,at));
  const saved=await db.prepare(
    "UPDATE threads_connection SET public_feed_enabled=1,revision=revision+1 "+
    "WHERE id=1 AND revision=? AND public_feed_enabled=0 "+
    "AND token_cipher=? AND token_expires_at=? AND verified_at=?"
  ).bind(row.revision,row.token_cipher,row.token_expires_at,row.verified_at).run();
  if(saved.meta?.changes!==1)
    return ownerError("Threads connection changed. Refresh before sharing.",409);
  return ownerJson(await storedThreadsStatus(env,at));
}
export function createThreadsOwnerOAuth({fetcher=fetch,clock=Date.now}={}){
  return async (request,env={},ctx={})=>{
    if(!(await isListeningOwner(env,ctx)))
      return ownerError("Owner authentication required",403);
    const path=new URL(request.url).pathname;
    if(!["/api/threads/auth/status","/api/threads/auth/start",
         "/api/threads/auth/callback","/api/threads/auth/disconnect",
         "/api/threads/auth/renew","/api/threads/auth/visibility"].includes(path))
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
      if(path==="/api/threads/auth/visibility")return await changePublicVisibility(request,env,now);
      return ownerError("Method not allowed",405);
    } catch {
      return ownerError("Private Threads connection unavailable");
    }
  };
}
