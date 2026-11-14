/**
 * Instagram API with Instagram Login — PUBLIC READ-ONLY contract.
 *
 * Independent from Threads and Facebook, and INACTIVE until an owner-only
 * Instagram OAuth grant, encrypted D1 storage, opt-in and release are verified.
 * This module does not fetch Meta, read credentials or publish a feed.
 */
export const INSTAGRAM_READ_SCOPE="instagram_business_basic";
export const INSTAGRAM_AUTH_CALLBACK="https://devonakins.com/api/instagram/auth/callback";
export const INSTAGRAM_GRAPH_HOST="https://graph.instagram.com";
const IG_LOGIN_HOST="https://www.instagram.com/oauth/authorize";
const PERMALINK_HOSTS=new Set(["instagram.com","www.instagram.com"]);
const MEDIA_TYPE=new Set(["IMAGE","VIDEO","CAROUSEL_ALBUM"]);
const PERMALINK_PATH=/^\/(?:p|reel|tv)\/[A-Za-z0-9_-]{3,48}\/?$/;
const IG_ID=/^[0-9]{8,32}$/;
const EMPTY=Object.freeze({version:1,state:"hidden",checkedAt:null,posts:[]});
export const hiddenInstagram=()=>({...EMPTY,posts:[]});

export function instagramBusinessAuthorizeUrl({appId,state}={}){
  if(typeof appId!=="string"||!IG_ID.test(appId))
    throw new TypeError("Instagram App ID must be an exact numeric string");
  if(typeof state!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(state))
    throw new TypeError("Instagram OAuth requires a 43-character CSRF state");
  const url=new URL(IG_LOGIN_HOST);
  url.search=new URLSearchParams({
    client_id:appId,
    redirect_uri:INSTAGRAM_AUTH_CALLBACK,
    response_type:"code",
    scope:INSTAGRAM_READ_SCOPE,
    state,
    enable_fb_login:"false",
  }).toString();
  return url.href;
}

/**
 * Every public surface requires owner-approved global presence AND separate
 * Instagram publication flags. OAuth alone is never public consent.
 */
export function instagramPublicEnabled(env){
  return env?.PRESENCE_ENABLED==="true"&&
    env?.PRESENCE_PUBLIC_RELEASE_APPROVED==="true"&&
    env?.INSTAGRAM_PUBLIC_RELEASE_APPROVED==="true"&&
    env?.INSTAGRAM_PUBLIC_FEED_ENABLED==="true";
}

function trustedUrl(raw,hosts,path){
  if(typeof raw!=="string"||raw.length>2048)return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:"||url.username||url.password||url.port||
      url.hash||!hosts(url.hostname)||!path(url.pathname))return null;
    return url.href;
  }catch{return null;}
}

function permalink(raw){
  return trustedUrl(raw,host=>PERMALINK_HOSTS.has(host),
    path=>PERMALINK_PATH.test(path) && !path.includes("//")) &&
    (()=>{const url=new URL(raw);return url.search?"":url.href;})()||null;
}

function mediaURL(raw){
  const value=trustedUrl(raw,host=>host.endsWith(".cdninstagram.com")||
    host.endsWith(".fbcdn.net"),path=>path.startsWith("/")&&!path.includes("//"));
  if(!value)return null;
  const url=new URL(value);
  for(const name of ["access_token","client_secret","authorization","code"])
    if(url.searchParams.has(name))return null;
  return value;
}

function timestamp(raw,now){
  if(typeof raw!=="string"||raw.length>40)return null;
  const ms=Date.parse(raw);
  if(!Number.isFinite(ms)||ms<=0||ms>now+60_000)return null;
  return new Date(ms).toISOString();
}

/**
 * Sanitize official /me/media JSON into a bounded, source-qualified public
 * projection. This is NOT a scraper, token reader or publication grant.
 * Images are optional: unknown CDN hosts simply produce text/permalink cards.
 */
export function projectInstagramMedia(payload,{now=Date.now(),username}={}){
  if(!Number.isFinite(now)||!payload||!Array.isArray(payload.data)||
     payload.data.length>12||
     typeof username!=="string"||!/^[A-Za-z0-9._]{1,30}$/.test(username))
    return hiddenInstagram();
  const posts=[],seen=new Set();
  for(const raw of payload.data.slice(0,3)){
    const link=permalink(raw?.permalink);
    const date=timestamp(raw?.timestamp,now);
    if(!IG_ID.test(String(raw?.id||""))||!link||!date||
       !MEDIA_TYPE.has(raw?.media_type)||seen.has(link)||
       (raw?.username!==undefined && raw.username!==username)||
       (raw?.caption!==undefined&&
         (typeof raw.caption!=="string"||raw.caption.length>10000)))
      return hiddenInstagram();
    seen.add(link);
    const description=(raw.caption||"").trim().slice(0,280);
    const image=mediaURL(raw.media_type==="VIDEO"?
      raw.thumbnail_url||raw.media_url:raw.media_url);
    posts.push({permalink:link,publishedAt:date,mediaType:raw.media_type,
      caption:description,imageUrl:image});
  }
  return {version:1,state:"connected",checkedAt:new Date(now).toISOString(),posts};
}
