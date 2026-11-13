import { publicV5Playback } from "../v5/public-playback.mjs";
import { publicV5GptCapture, formatPublicGptValue, publicGptCapturedAt } from "../v5/public-gpt-capture.mjs";
import { publicV5Threads, threadsPublicDate } from "../v5/public-threads.mjs";
import { THREADS_PROFILE_URL } from "./social-presence.mjs";

/**
 * Presentation-only clients of existing privacy-consented public projections.
 * No Spotify/GPT/Threads credentials, raw API calls to third parties, browser
 * persistence, audio autoplay, fake work sessions or synthetic counters.
 */
type UnknownJson = Record<string, unknown>;
const listeningCards=[...document.querySelectorAll<HTMLElement>("[data-public-spotify]")];
const workCards=[...document.querySelectorAll<HTMLElement>("[data-public-work]")];
const gptCards=[...document.querySelectorAll<HTMLElement>("[data-public-gpt]")];
const threadsCards=[...document.querySelectorAll<HTMLElement>("[data-public-threads]")];
const ribbon=document.querySelector<HTMLElement>("[data-spotify-ribbon]");
const sourceStatus=document.querySelector<HTMLElement>("[data-spotify-source-state]");
const playlistPanel=document.querySelector<HTMLElement>("[data-public-playlists]");
let lastListening:unknown=null;
let publicSnapshot:unknown=null;
let listeningBusy=false;
let activityBusy=false;
let playlistsBusy=false;
let atListening=0;
let atActivity=0;
const update=(root:HTMLElement,selector:string,value:string)=>{
  const el=root.querySelector<HTMLElement>(selector);
  if(el)el.textContent=value;
};
/**
 * Devon's declared rule is: when Spotify is publicly shown as playing, he is
 * coding. This is his personal convention, NOT an editor-verified observation.
 * Respect status-only sharing: no track metadata is required or exposed.
 */
function ownerCodingFromSpotify(value:unknown,at=Date.now()):boolean{
  const detailed=publicV5Playback(value,at);
  if(detailed.state==="playing")return true;
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const p=value as UnknownJson;
  if(p.version!==1||p.mode!=="playing"||p.detailsVisible!==false||
     typeof p.updatedAt!=="string")return false;
  const seen=Date.parse(p.updatedAt);
  return Number.isFinite(seen)&&new Date(seen).toISOString()===p.updatedAt&&
    seen<=at+10000&&at-seen<120000;
}
function renderListening(value:unknown){
  const now=Date.now();
  const p=publicV5Playback(value,now);
  const track=p.state==="playing";
  const inZone=ownerCodingFromSpotify(value,now);
  const privateState=!inZone&&p.state==="private";
  const offAir=p.state==="off_air";
  const status=inZone?"IN THE ZONE":privateState?"PRIVATE":offAir?"OFF AIR":"UNAVAILABLE";
  const title=track?p.title:inZone?"Coding with music":privateState?"Playback not shared":offAir?"No active playback":"Playback unavailable";
  const artist=track?p.artist:inZone?"Spotify playing · track details not shared":privateState?"Spotify sharing is off":
    offAir?"Paused or stopped":"No verified track from Spotify";
  if(ribbon)ribbon.textContent=inZone?"In the Zone · Coding"+(track?" · "+title:""):privateState?"Spotify private":offAir?"Not playing":"Spotify unavailable";
  if(sourceStatus){
    sourceStatus.textContent=inZone?"In the Zone · Coding (owner-defined)":
      privateState?"Playback not shared":
      offAir?"No active public playback":"Public playback source unavailable";
    sourceStatus.dataset.spotifyMode=inZone?"playing":privateState?"private":offAir?"off_air":"unavailable";
  }
  for(const card of listeningCards){
    card.dataset.spotifyMode=inZone?"playing":p.state;
    update(card,"[data-spotify-state]",status);
    update(card,"[data-spotify-title]",title);
    update(card,"[data-spotify-artist]",artist);
    update(card,"[data-spotify-note]",inZone
      ?"In the Zone is Devon's owner-defined coding signal from public Spotify playback; editor activity is a separate observation."
      :"Only owner-approved Spotify playback is displayed. No audio streams here; silence does not mean Devon stopped coding.");
    const link=card.querySelector<HTMLAnchorElement>("[data-spotify-link]");
    if(link){
      link.href=track?p.href:"/listening/";
      if(track){
        link.textContent="Open track in Spotify ↗";
        link.target="_blank";
        link.rel="noopener noreferrer";
      }else{
        link.textContent="About listening ↗";
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    }
    const art=card.querySelector<HTMLImageElement>("[data-spotify-cover]");
    if(art){
      if(track&&p.image){
        if(art.getAttribute("src")!==p.image)art.src=p.image;
        art.hidden=false;
      }else{
        art.hidden=true;
        art.removeAttribute("src");
      }
    }
    const progress=card.querySelector<HTMLProgressElement>("[data-spotify-progress]");
    if(progress){
      const validProgress=track ? p.progress : null;
      progress.hidden=!validProgress;
      progress.value=validProgress?.value ?? 0;
      progress.max=validProgress?.max ?? 1;
    }
  }
  // Spotify and V4 arrive independently. Reconcile the current work card as
  // soon as either approved source changes; never retain a revoked signal.
  renderWork(publicSnapshot);
}
function renderWork(snapshot:unknown){
  const at=Date.now();
  let label="No verified active session";
  let explanation="Public GitHub events are recorded work, not evidence that an editor or agent is currently active.";
  let state="NO ACTIVE SIGNAL";
  const inZone=ownerCodingFromSpotify(lastListening,at);
  const p=typeof snapshot==="object"&&snapshot!==null&&!Array.isArray(snapshot)
    ? snapshot as UnknownJson : null;
  const timestamp=typeof p?.asOf==="string" ? Date.parse(p.asOf) : NaN;
  const fresh=Number.isFinite(timestamp)&&timestamp<=at+10000&&at-timestamp<65000;
  const w=fresh && p?.version===4 && typeof p.work==="object" && p.work!==null
    ? p.work as UnknownJson : null;
  const time=typeof w?.asOf==="string"?Date.parse(w.asOf):NaN;
  const active=Number.isFinite(time)&&time<=at+10000&&at-time<120000;
  if(w?.visibility==="public"&&active&&
      (w.state==="developing"||w.state==="in-the-zone")&&
      (w.source==="editor-heartbeat"||w.source==="owner-declared")){
    state=w.source==="editor-heartbeat"?"EDITOR OBSERVED":"OWNER DECLARED";
    label=inZone?"In the Zone — Coding":w.source==="editor-heartbeat"?"Development session observed":"Work session declared";
    explanation="Recent authorized "+(w.source==="editor-heartbeat"?"editor":"owner-declared")+
      " work signal, checked "+new Date(time).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})+
      (inZone?". Spotify independently indicates Devon's owner-defined coding mode.":".");
  }else if(inZone){
    state="SPOTIFY SIGNAL";
    label="In the Zone — Coding";
    explanation="Devon's owner-defined rule: Spotify playing means he's coding. Source: recent public playback; editor activity has not been independently observed.";
  }
  for(const card of workCards){
    update(card,"[data-work-state]",state);
    update(card,"[data-work-title]",label);
    update(card,"[data-work-detail]",explanation);
    card.dataset.workMode=state==="NO ACTIVE SIGNAL"?"idle":"active";
  }
}
function renderGpt(snapshot:unknown){
  const at=Date.now();
  const s=typeof snapshot==="object"&&snapshot!==null&&!Array.isArray(snapshot)
    ? snapshot as UnknownJson : null;
  const stamp=typeof s?.asOf==="string"?Date.parse(s.asOf):NaN;
  const fresh=s?.version===4&&Number.isFinite(stamp)&&stamp<=at+10000&&at-stamp<65000;
  const projection=publicV5GptCapture(fresh?s?.gpt:null,at);
  const item=projection.available?projection.headline:null;
  const date=item?publicGptCapturedAt(item.asOf):null;
  for(const card of gptCards){
    update(card,"[data-gpt-state]",item?"CAPTURED":projection.available?"OTHER METRICS":"NOT SHARED");
    update(card,"[data-gpt-value]",item?formatPublicGptValue(item,true):"—");
    update(card,"[data-gpt-unit]",item?"tokens":"");
    update(card,"[data-gpt-label]",item?"Owner-recorded 7-day personal-profile tokens. Not a live usage meter.":
      projection.available?"Other approved observations exist; no shared 7-day token figure.":
      "No public owner-approved usage capture currently available.");
    const time=card.querySelector<HTMLTimeElement>("[data-gpt-time]");
    if(time){time.hidden=!date;if(date){time.dateTime=item.asOf;time.textContent="Captured "+date;}
      else {time.textContent="";time.removeAttribute("datetime");}}
  }
}
function renderThreads(snapshot:unknown){
  const feed=publicV5Threads(snapshot,Date.now());
  const first=feed.connected?feed.posts[0]:null;
  for(const card of threadsCards){
    card.dataset.threadsConnected=String(feed.connected);
    update(card,"[data-threads-state]",feed.connected?"CONNECTED":"SOURCE UNAVAILABLE");
    const preview=!!card.querySelector("[data-threads-posts]");
    update(card,"[data-threads-summary]",preview
      ?feed.connected
        ?feed.posts.length+" approved public "+(feed.posts.length===1?"update":"updates")+
          " from Threads. Each post links to its original."
        :"Approved Threads posts appear here only while sharing and the source are available."
      :first?(first.text.length>152?first.text.slice(0,149).trimEnd()+"…":first.text):
        feed.connected?"No recent approved public posts.":
        "Posts are not shared on this site yet. View my Threads profile directly.");
    const a=card.querySelector<HTMLAnchorElement>("[data-threads-link]");
    if(a){
      a.href=first?first.href:THREADS_PROFILE_URL;
      a.textContent=first?"View original post ↗":"Open Threads profile ↗";
    }
    const list=card.querySelector<HTMLOListElement>("[data-threads-posts]");
    if(list){
      const signature=feed.connected
        ?feed.posts.map(post=>
            post.href+"|"+post.publishedAt+"|"+post.text+"|"+(post.media?"media":"text")
          ).join(";")
        :"unavailable";
      // Do not replace focused links at every timer tick; do clear revoked or
      // expired snapshots immediately. There are at most three vetted posts.
      if(card.dataset.threadsRenderId!==signature){
        list.replaceChildren();
        for(const post of feed.posts){
          const item=document.createElement("li");
          const link=document.createElement("a");
          link.href=post.href;
          link.target="_blank";
          link.rel="noopener noreferrer";
          link.referrerPolicy="no-referrer";
          link.textContent=post.text;
          link.setAttribute("aria-label","Read public Threads post published "+threadsPublicDate(post.publishedAt));
          const published=document.createElement("time");
          published.dateTime=post.publishedAt;
          published.textContent=threadsPublicDate(post.publishedAt);
          item.append(link,published);
          if(post.media){
            const media=document.createElement("span");
            media.className="one-threads-media";
            media.textContent="Includes media";
            item.append(media);
          }
          list.append(item);
        }
        card.dataset.threadsRenderId=signature;
      }
      update(card,"[data-threads-checked]",feed.connected&&feed.checkedAt
        ?"Provider checked "+threadsPublicDate(feed.checkedAt)+" · Posts are dated history."
        :"Source unavailable or sharing disabled · no account or posts inferred.");
    }
  }
}
function renderActivity(snapshot:unknown){
  renderWork(snapshot);
  renderGpt(snapshot);
  renderThreads(snapshot);
}
function validPlaylistCollection(value:unknown):value is {
  version:number;status:string;playlists:Array<{id:string;title:string;url:string;image:string|null}>
}{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const v=value as UnknownJson;
  if(v.version!==1||!["hidden","empty","unavailable","available"].includes(String(v.status))||
    !Array.isArray(v.playlists)||v.playlists.length>12)return false;
  if(v.status!=="available"&&v.playlists.length>0)return false;
  const ids=new Set();
  return v.playlists.every((p:unknown)=>{
    if(!p||typeof p!=="object"||Array.isArray(p))return false;
    const v=p as UnknownJson;
    if(typeof v.id!=="string"||!/^[A-Za-z0-9]{22}$/.test(v.id)||
      ids.has(v.id)||typeof v.title!=="string"||!v.title.trim()||
      v.title.length>200||v.url!=="https://open.spotify.com/playlist/"+v.id||
      !(v.image===null||typeof v.image==="string"&&
        /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(v.image)))return false;
    ids.add(v.id);
    return true;
  });
}
function renderPlaylists(value:unknown){
  if(!playlistPanel)return;
  const state=validPlaylistCollection(value)?value:null;
  const status=playlistPanel.querySelector<HTMLElement>("[data-playlists-status]");
  const list=playlistPanel.querySelector<HTMLUListElement>("[data-playlist-list]");
  if(!list)return;
  const nodes=document.createDocumentFragment();
  if(state?.status==="available"){
    for(const entry of state.playlists){
      const li=document.createElement("li");
      const a=document.createElement("a");
      a.href=entry.url;a.target="_blank";a.rel="noopener noreferrer";
      if(entry.image){
        const img=document.createElement("img");
        img.src=entry.image;img.alt="";img.referrerPolicy="no-referrer";
        img.loading="lazy";img.decoding="async";a.append(img);
      }
      const caption=document.createElement("strong");
      caption.textContent=entry.title;
      a.append(caption);li.append(a);nodes.append(li);
    }
  }
  list.replaceChildren(nodes);
  if(status)status.textContent=state?.status==="available"
    ? state.playlists.length+" owner-approved public playlist"+(state.playlists.length===1?"":"s")
    : state?.status==="empty"?"No public playlists selected yet."
    : state?.status==="hidden"?"Public playlists are not shared."
    :"Public playlist source unavailable.";
}
async function sourceJSON(path:string,timeout=8500):Promise<unknown>{
  const res=await fetch(path,{
    method:"GET",credentials:"omit",cache:"no-store",
    headers:{Accept:"application/json"},signal:AbortSignal.timeout(timeout),
  });
  if(!res.ok||!res.headers.get("Content-Type")?.includes("application/json"))
    throw Error("Public source unavailable");
  const len=Number(res.headers.get("Content-Length")||0);
  if(!Number.isFinite(len)||len>100000)throw Error("Unexpected public source size");
  const raw=await res.text();
  if(raw.length>100000)throw Error("Unexpected public source size");
  return JSON.parse(raw) as unknown;
}
async function refreshListening(){
  if(listeningBusy||document.hidden||(!listeningCards.length&&!ribbon))return;
  listeningBusy=true;atListening=Date.now();
  try{lastListening=await sourceJSON("/api/listening/now");}
  catch{lastListening=null;}
  finally{listeningBusy=false;renderListening(lastListening);}
}
async function refreshActivity(){
  if(activityBusy||document.hidden||!([workCards,gptCards,threadsCards].some(x=>x.length)))return;
  activityBusy=true;atActivity=Date.now();
  try{publicSnapshot=await sourceJSON("/api/activity/v4");}
  catch{publicSnapshot=null;}
  finally{activityBusy=false;renderActivity(publicSnapshot);}
}
async function refreshPlaylists(){
  if(playlistsBusy||document.hidden||!playlistPanel)return;
  playlistsBusy=true;
  try{renderPlaylists(await sourceJSON("/api/listening/collections"));}
  catch{renderPlaylists(null);}
  finally{playlistsBusy=false;}
}
export function initProfessionalSignals(){
  if(listeningCards.length||ribbon)void refreshListening();
  if(workCards.length||gptCards.length||threadsCards.length)void refreshActivity();
  if(playlistPanel)void refreshPlaylists();
  window.setInterval(()=>{
    if(document.hidden)return;
    void refreshListening();
    void refreshActivity();
    if(playlistPanel)void refreshPlaylists();
  },60000);
  window.setInterval(()=>{
    if(!document.hidden&&lastListening!==null)renderListening(lastListening);
    if(!document.hidden&&publicSnapshot!==null)renderActivity(publicSnapshot);
  },10000);
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){
      lastListening=null;
      publicSnapshot=null;
      renderListening(null);
      renderActivity(null);
      renderPlaylists(null);
    }else{
      void refreshListening();
      void refreshActivity();
      void refreshPlaylists();
    }
  });
  window.addEventListener("pageshow",event=>{
    if(event.persisted){
      lastListening=null;publicSnapshot=null;
      renderListening(null);renderActivity(null);renderPlaylists(null);
      void refreshListening();void refreshActivity();void refreshPlaylists();
    }
  });
}
