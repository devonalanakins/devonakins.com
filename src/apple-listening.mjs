/**
 * Apple Music / iPhone Shortcuts: owner-reported listening metadata.
 * NOT a server-side Apple Music "currently playing" API and NOT an audio feed.
 * Default privacy is OFF. Single replaceable D1 row, short public freshness.
 */
import {constantEqual, readSmallJson} from "./listening-owner-core.mjs";

export const APPLE_LISTENING_PUBLIC_PATH = "/api/listening/apple";
export const APPLE_LISTENING_INGEST_PATH = "/api/listening/apple/ingest";
export const APPLE_LISTENING_FRESH_MS = 100_000;
const moods = new Set(["Sleep", "Chill", "Productivity", "Wellbeing"]);
const hidden = () => ({version:1,source:"owner-shortcut",state:"hidden"});
const unavailable = () => ({version:1,source:"owner-shortcut",state:"unavailable"});
const header = Object.freeze({
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"private, no-store, max-age=0",
  "CDN-Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer",
});
function result(request, data, status=200, more={}) {
  return new Response(request.method==="HEAD" ? null : JSON.stringify(data),{
    status,headers:{...header,...more}
  });
}
function safeText(value,max=160) {
  return typeof value==="string"&&value.trim().length>0&&value.trim().length<=max&&
    !/[\u0000-\u001f\u007f]/.test(value) ? value.trim() : null;
}
function validMusicLink(raw) {
  if(raw===undefined||raw===null||raw==="")return null;
  if(typeof raw!=="string"||raw.length>450)return false;
  try {
    const url=new URL(raw);
    if(url.protocol!=="https:"||url.hostname!=="music.apple.com"||
       url.username||url.password||url.hash||!url.pathname.startsWith("/"))return false;
    for(const k of url.searchParams.keys())if(k!=="i")return false;
    if(url.searchParams.has("i")&&!/^\d{4,20}$/.test(url.searchParams.get("i")||""))return false;
    return url.href;
  }catch{return false}
}
export function validateAppleListeningInput(data) {
  if(!data||typeof data!=="object"||Array.isArray(data)||
     !["song","ambient","off"].includes(data.kind)||
     Object.keys(data).some(k=>!["kind","title","artist","album","url","mood"].includes(k)))return null;
  if(data.kind==="off") {
    if(Object.keys(data).length!==1)return null;
    return {kind:"off",title:null,artist:null,album:null,appleUrl:null,mood:null};
  }
  if(data.kind==="ambient") {
    if(!moods.has(data.mood)||Object.keys(data).some(k=>!["kind","mood"].includes(k)))return null;
    return {kind:"ambient",title:null,artist:null,album:null,appleUrl:null,mood:data.mood};
  }
  const title=safeText(data.title);
  const artist=safeText(data.artist);
  const album=data.album===undefined?null:safeText(data.album);
  const appleUrl=validMusicLink(data.url);
  if(!title||!artist||(data.album!==undefined&&!album)||appleUrl===false||data.mood!==undefined)return null;
  return {kind:"song",title,artist,album,appleUrl,mood:null};
}
const dbReady = env => env.LISTENING_DB && typeof env.LISTENING_DB.prepare==="function";
export async function readPublicAppleListening(request,env={},clock=Date.now){
  if(!["GET","HEAD"].includes(request.method))
    return result(request,{error:"Method not allowed"},405,{"Allow":"GET, HEAD"});
  if(env.APPLE_LISTENING_PUBLIC_ENABLED!=="true")return result(request,hidden());
  if(!dbReady(env))return result(request,unavailable());
  try {
    const row=await env.LISTENING_DB.prepare(
      "SELECT kind,title,artist,album,apple_url,mood,reported_at FROM apple_listening_status WHERE id=1"
    ).first();
    if(!row)return result(request,{version:1,source:"owner-shortcut",state:"empty"});
    const now=clock();
    if(!Number.isSafeInteger(row.reported_at)||row.reported_at>now+5_000||
       now-row.reported_at<0||now-row.reported_at>APPLE_LISTENING_FRESH_MS)
      return result(request,{version:1,source:"owner-shortcut",state:"stale"});
    if(row.kind==="off")return result(request,{version:1,source:"owner-shortcut",state:"off",reportedAt:new Date(row.reported_at).toISOString()});
    if(row.kind==="ambient"&&moods.has(row.mood))
      return result(request,{version:1,source:"owner-shortcut",state:"reported",kind:"ambient",
        mood:row.mood,reportedAt:new Date(row.reported_at).toISOString()});
    const link=validMusicLink(row.apple_url);
    if(row.kind!=="song"||!safeText(row.title)||!safeText(row.artist)||link===false)
      return result(request,unavailable());
    const details=env.APPLE_LISTENING_TRACK_DETAILS_PUBLIC==="true";
    return result(request,{
      version:1,source:"owner-shortcut",state:"reported",kind:"song",
      reportedAt:new Date(row.reported_at).toISOString(),
      ...(details?{title:row.title,artist:row.artist,
        ...(safeText(row.album)?{album:row.album}:{}),
        ...(link?{url:link}:{})}:{}),
      detailsVisible:details,
    });
  }catch{return result(request,unavailable())}
}
export async function ingestAppleListening(request,env={},clock=Date.now){
  // Native Shortcuts can send a bearer token, not an Access browser cookie.
  // This secret only allows replacing the ONE listening row; no other authority.
  if(env.APPLE_LISTENING_INGEST_ENABLED!=="true"||!dbReady(env)||
     typeof env.APPLE_LISTENING_INGEST_TOKEN!=="string"||
     env.APPLE_LISTENING_INGEST_TOKEN.length<32)
    return result(request,{error:"Not found"},404);
  if(request.method!=="POST")
    return result(request,{error:"Method not allowed"},405,{"Allow":"POST"});
  const origin=request.headers.get("Origin");
  if(origin&&origin!==new URL(request.url).origin)
    return result(request,{error:"Forbidden"},403);
  const token=request.headers.get("Authorization")||"";
  if(!constantEqual(token,"Bearer "+env.APPLE_LISTENING_INGEST_TOKEN))
    return result(request,{error:"Forbidden"},403);
  let item;
  try{item=validateAppleListeningInput(await readSmallJson(request))}
  catch{return result(request,{error:"Invalid report"},400)}
  if(!item)return result(request,{error:"Invalid report"},400);
  try{
    await env.LISTENING_DB.prepare(
      "INSERT INTO apple_listening_status(id,kind,title,artist,album,apple_url,mood,reported_at) VALUES(1,?,?,?,?,?,?,?) "+
      "ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,title=excluded.title,artist=excluded.artist,"+
      "album=excluded.album,apple_url=excluded.apple_url,mood=excluded.mood,reported_at=excluded.reported_at"
    ).bind(item.kind,item.title,item.artist,item.album,item.appleUrl,item.mood,clock()).run();
    return result(request,{accepted:true});
  }catch{return result(request,{error:"Unavailable"},503)}
}
