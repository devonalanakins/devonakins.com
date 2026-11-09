/**
 * Official Threads API -> tightly scoped public read-only projection.
 * No OAuth flow or token refresh is initiated here. A separately reviewed
 * owner connection must provide the server-side access token. Absence,
 * revocation, malformed content or provider errors always fail closed.
 *
 * Requires threads_basic, an owner-approved public account, a separately
 * enabled public feed, and global publication permission in the caller.
 */
const DISCONNECTED=Object.freeze({version:1,state:"disconnected",checkedAt:null,posts:[]});
export const disconnectedThreads=()=>({...DISCONNECTED,posts:[]});
const expectedHost=new Set(["www.threads.net","threads.net","www.threads.com","threads.com"]);
const USERNAME=/^[A-Za-z0-9._]{1,30}$/;
const ID=/^[0-9]{4,32}$/;
const MEDIA=new Set(["TEXT_POST","IMAGE","VIDEO","CAROUSEL_ALBUM"]);
const SOURCE="https://graph.threads.net/v1.0/me/threads";
const FIELDS="id,text,username,media_type,permalink,timestamp";
const TTL=5*60_000;

export function threadsApproved(env) {
  return env?.PRESENCE_ENABLED==="true" &&
    env?.PRESENCE_PUBLIC_RELEASE_APPROVED==="true" &&
    env?.THREADS_PUBLIC_RELEASE_APPROVED==="true" &&
    env?.THREADS_PUBLIC_FEED_ENABLED==="true" &&
    typeof env?.THREADS_USER_ACCESS_TOKEN==="string" &&
    env.THREADS_USER_ACCESS_TOKEN.length>=20 &&
    typeof env?.THREADS_PUBLIC_USERNAME==="string" &&
    USERNAME.test(env.THREADS_PUBLIC_USERNAME);
}
/** Owner-only configuration status; a token's presence is not an API observation.
 * Never return the credential, username, provider account ID or private posts. */
export function ownerThreadsReadiness(env={}) {
  return {
    provider:"threads",
    readOnly:true,
    usernameConfigured:typeof env.THREADS_PUBLIC_USERNAME==="string" &&
      USERNAME.test(env.THREADS_PUBLIC_USERNAME),
    authorizationConfigured:typeof env.THREADS_USER_ACCESS_TOKEN==="string" &&
      env.THREADS_USER_ACCESS_TOKEN.length>=20,
    publicationApproved:env.THREADS_PUBLIC_RELEASE_APPROVED==="true",
    feedEnabled:env.THREADS_PUBLIC_FEED_ENABLED==="true",
    globallyEnabled:env.PRESENCE_ENABLED==="true" &&
      env.PRESENCE_PUBLIC_RELEASE_APPROVED==="true",
    configured:threadsApproved(env),
    providerObserved:false,
    observedAt:null,
  };
}
function validLink(value,username) {
  if(typeof value!=="string" || value.length>300)return null;
  try{
    const url=new URL(value);
    if(url.protocol!=="https:" || !expectedHost.has(url.hostname) ||
       url.username || url.password || url.port || url.search || url.hash)return null;
    const match=url.pathname.match(/^\/@([A-Za-z0-9._]{1,30})\/post\/([A-Za-z0-9_-]{4,50})\/?$/i);
    if(!match || match[1].toLowerCase()!==username.toLowerCase())return null;
    return url.origin+url.pathname;
  }catch{return null;}
}
function date(value,now) {
  if(typeof value!=="string" || value.length>40)return null;
  const at=Date.parse(value);
  return Number.isFinite(at) && at>0 && at<=now+60_000
    ? new Date(at).toISOString():null;
}
/** Never export provider IDs, attachments, insights, token, cursor, or replies. */
export function publicThreadsPosts(payload,username,now=Date.now()) {
  if(!USERNAME.test(username??"") || !Number.isFinite(now) ||
      !payload || !Array.isArray(payload.data) || payload.data.length>10)return null;
  const output=[],seen=new Set();
  for(const post of payload.data) {
    if(!post || typeof post!=="object" || Array.isArray(post) ||
       !ID.test(post.id??"") || seen.has(post.id) ||
       typeof post.username!=="string" ||
       post.username.toLowerCase()!==username.toLowerCase() ||
       !MEDIA.has(post.media_type))return null;
    const href=validLink(post.permalink,username);
    const publishedAt=date(post.timestamp,now);
    if(!href || !publishedAt)return null;
    seen.add(post.id);
    if(typeof post.text!=="string" || post.text.length>2200)return null;
    const cleaned=post.text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,"").trim();
    const media=post.media_type!=="TEXT_POST";
    if(!cleaned && !media)continue;
    const chars=Array.from(cleaned);
    const excerpt=chars.length>280?chars.slice(0,280).join("")+"…":cleaned;
    output.push({href,text:excerpt || "Media post on Threads",publishedAt,media});
  }
  // The provider's own list is newest-first; never infer popularity from order.
  return output.slice(0,3);
}
export function createPublicThreadsReader({
  fetchImpl=fetch,clock=Date.now,
}={}) {
  let memo=null,pending=null;
  return async (env={})=>{
    if(!threadsApproved(env)) {
      memo=null;
      return disconnectedThreads();
    }
    const now=clock(),username=env.THREADS_PUBLIC_USERNAME;
    const token=env.THREADS_USER_ACCESS_TOKEN;
    if(!Number.isFinite(now))return disconnectedThreads();
    if(memo && memo.token===token && memo.username===username &&
       memo.expiresAt>now) return memo.data;
    if(pending && pending.token===token && pending.username===username)
      return pending.task;
    const task=(async()=>{
      try{
        const endpoint=new URL(SOURCE);
        endpoint.searchParams.set("fields",FIELDS);
        endpoint.searchParams.set("limit","5");
        const response=await fetchImpl(endpoint.toString(),{
          method:"GET",
          headers:{Authorization:"Bearer "+token,Accept:"application/json"},
          signal:AbortSignal.timeout(3500),
          redirect:"error",
        });
        if(!response?.ok)return disconnectedThreads();
        const contentLength=Number(response.headers?.get?.("Content-Length") || 0);
        if(contentLength>32_768)return disconnectedThreads();
        const raw=await response.text();
        if(raw.length>32_768)return disconnectedThreads();
        const posts=publicThreadsPosts(JSON.parse(raw),username,clock());
        if(!posts)return disconnectedThreads();
        // Source-specific revocation or token rollover while an upstream
        // request is in flight must not publish a response from old authority.
        if(!threadsApproved(env) || env.THREADS_USER_ACCESS_TOKEN!==token ||
           env.THREADS_PUBLIC_USERNAME!==username) {
          memo=null;
          return disconnectedThreads();
        }
        const checkedAt=new Date(clock()).toISOString();
        const data={version:1,state:"connected",checkedAt,posts};
        // Key includes current credentials, but neither the key nor token is
        // ever sent to the browser, log, cache storage or a third-party host.
        memo={token,username,expiresAt:clock()+TTL,data};
        return data;
      }catch{return disconnectedThreads();}
    })();
    pending={token,username,task};
    try{return await task;}
    finally{if(pending?.task===task)pending=null;}
  };
}
