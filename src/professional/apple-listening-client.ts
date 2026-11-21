/** Public anonymous Apple Music / owner Shortcut reporting view. Never read secret data. */
type View = "hidden"|"unavailable"|"empty"|"stale"|"off"|"reported";
type Payload = Record<string,unknown>;
const roots=[...document.querySelectorAll<HTMLElement>("[data-public-apple-listening]")];
const allowed=new Set<View>(["hidden","unavailable","empty","stale","off","reported"]);
const moods=new Set(["Sleep","Chill","Productivity","Wellbeing"]);
let pending=false;
function setText(root:HTMLElement,key:string,value:string){
  const el=root.querySelector<HTMLElement>(key);
  if(el)el.textContent=value;
}
function validLink(value:unknown):string|null{
  if(typeof value!=="string")return null;
  try{
    const u=new URL(value);
    if(u.protocol!=="https:"||u.hostname!=="music.apple.com"||u.username||u.password||
       u.hash||u.href.length>460)return null;
    for(const key of u.searchParams.keys())if(key!=="i")return null;
    return u.href;
  }catch{return null}
}
function readableTime(value:unknown):string|null{
  if(typeof value!=="string")return null;
  const ms=Date.parse(value),at=Date.now();
  if(!Number.isFinite(ms)||new Date(ms).toISOString()!==value||ms>at+5000||
     at-ms<0||at-ms>100000)return null;
  const seconds=Math.max(0,Math.floor((at-ms)/1000));
  return seconds<10?"just now":seconds<60?seconds+" seconds ago":Math.floor(seconds/60)+" minute ago";
}
function render(value:unknown){
  const v=value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Payload:{};
  let state:View=allowed.has(v.state as View)&&v.source==="owner-shortcut"&&v.version===1?v.state as View:"unavailable";
  const since=readableTime(v.reportedAt);
  if((state==="off"||state==="reported")&&!since)state="stale";
  let status="NOT SHARED", title="Listening is private", detail="Only listening updates I choose to share appear here.";
  let note="No music audio or listening history is streamed from this site.";
  let link:string|null=null;
  if(state==="unavailable"){status="SOURCE UNAVAILABLE";title="No verified source";detail="The listening signal cannot be checked right now.";}
  if(state==="empty"){status="NO REPORT";title="Nothing reported yet";detail="My iPhone hasn't sent an approved listening report.";}
  if(state==="stale"){status="STALE";title="No recent report";detail="The previous owner report has expired. Nothing here implies playback has stopped.";}
  if(state==="off"){status="OWNER REPORTED";title="Playback stopped — reported";detail="Last reported "+since+".";note="An owner update, not automatic iPhone playback monitoring.";}
  if(state==="reported"){
    const song=v.kind==="song",ambient=v.kind==="ambient"&&moods.has(v.mood as string);
    if(!song&&!ambient){status="SOURCE UNAVAILABLE";title="Invalid listening report";detail="The source returned unsupported playback information.";}
    else if(ambient){
      status="AMBIENT / REPORTED";title="Ambient Music · "+String(v.mood);
      detail="Mode selected by Devon · reported "+since+".";
      note="Ambient mood is owner-declared, not automatically detected by iOS.";
    }else{
      const show=v.detailsVisible===true&&typeof v.title==="string"&&
        v.title.trim().length>0&&v.title.length<=160&&
        typeof v.artist==="string"&&v.artist.trim().length>0&&v.artist.length<=160;
      status="MUSIC / REPORTED";
      title=show?String(v.title):"Apple Music · listening reported";
      detail=show?String(v.artist)+" · reported "+since:"Track details private · reported "+since;
      note="Last owner report, not continuous system-wide playback tracking.";
      link=show?validLink(v.url):null;
    }
  }
  for(const root of roots){
    root.dataset.appleListeningState=state;
    setText(root,"[data-apple-listening-state]",status);
    setText(root,"[data-apple-listening-title]",title);
    setText(root,"[data-apple-listening-detail]",detail);
    setText(root,"[data-apple-listening-note]",note);
    const anchor=root.querySelector<HTMLAnchorElement>("[data-apple-listening-link]");
    if(anchor){
      if(link){anchor.href=link;anchor.textContent="Open in Apple Music ↗";anchor.hidden=false;anchor.target="_blank";anchor.rel="noopener noreferrer";}
      else{anchor.removeAttribute("href");anchor.hidden=true;anchor.removeAttribute("target");anchor.removeAttribute("rel");}
    }
  }
}
async function refresh(){
  if(document.hidden||pending||!roots.length)return;
  pending=true;
  try{
    const response=await fetch("/api/listening/apple",{method:"GET",credentials:"omit",cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(6000)});
    if(!response.ok||!response.headers.get("Content-Type")?.includes("application/json")){render(null);return}
    const body=await response.text();
    if(body.length>2000)throw Error("Unexpected listening payload");
    render(JSON.parse(body));
  }catch{render(null)}
  finally{pending=false}
}
if(roots.length){
  render({version:1,source:"owner-shortcut",state:"hidden"});
  void refresh();
  window.setInterval(()=>{void refresh()},45000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refresh()});
  window.addEventListener("pageshow",event=>{if(event.persisted)void refresh()});
}
