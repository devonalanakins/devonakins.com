import {LABORATORY_ROUTES,laboratoryViewForPath} from "./laboratory-routes.mjs";
/**
 * Shared section navigation for the viewport shell and long-scroll candidate; GitHub
 * and Spotify/GPT rendering remain the existing independent, consent-aware
 * professional clients. No telemetry or owner state is written here.
 */
type TabName="systems"|"portfolio"|"home"|"experience"|"work"|"activity"|"writing"|"contact";
const laboratory=document.body.classList.contains("lab-body");
const names:TabName[]=laboratory?
  ["home","experience","systems","work","portfolio","activity","writing","contact"]:
  ["home","experience","work","activity","writing","contact"];
const primaryForView=(view:TabName):TabName=>!laboratory?view:
  view==="systems"||view==="portfolio"||view==="activity"?"work":
  view==="writing"?"experience":view==="contact"?"home":view;
const tabs=[...document.querySelectorAll<HTMLButtonElement>("[data-one-target]")];
const buttons=[...document.querySelectorAll<HTMLButtonElement|HTMLAnchorElement>("[data-one-go]")];
const panels=[...document.querySelectorAll<HTMLElement>("[data-one-view]")];
// A fixed viewport cannot show an unbounded list. Match the public event
// summary to the number of rows the visible panel can actually accommodate.
// The full recent public history remains accessible from the GitHub profile.
const homeFeed=document.getElementById("one-home-github");
const activityFeed=document.getElementById("one-activity-github");
/** Refit the same verified public event snapshot when a phone rotates.
 * Never fetch new events or infer ongoing work solely from viewport changes. */
function fitGitHubFeedToViewport(){
  const width=window.innerWidth;
  const height=window.innerHeight;
  const narrowShort=width<=400&&height<=700;
  const mobile=width<=760;
  const shortWide=width>760&&height<=470;
  const compactDesktop=width>760&&height>470&&height<=800;
  const homeLimit=narrowShort||shortWide?1:mobile||compactDesktop?2:4;
  const activityLimit=narrowShort||shortWide?2:mobile||compactDesktop?4:6;
  let changed=false;
  for(const [node,limit] of [[homeFeed,homeLimit],[activityFeed,activityLimit]] as const){
    if(node && node.dataset.limit!==String(limit)){
      node.dataset.limit=String(limit);
      changed=true;
    }
  }
  if(changed)window.dispatchEvent(new Event("one-screen-feed-layout"));
}
fitGitHubFeedToViewport();
window.addEventListener("resize",fitGitHubFeedToViewport);
const known=(value:string|null|undefined):value is TabName=>!!value&&names.includes(value as TabName);
const currentHash=():TabName=>{
  let raw=location.hash.slice(1).toLowerCase();
  if(laboratory){
    raw=raw.replace(/^one-panel-/,"");
    raw=({research:"experience",projects:"work",fieldnotes:"writing"} as Record<string,string>)[raw]||raw;
  }
  const route=laboratory?laboratoryViewForPath(location.pathname):null;
  return known(raw)?raw:known(route)?route:laboratory&&known(document.body.dataset.labInitial)?document.body.dataset.labInitial:"home";
};
let current:TabName="home";
// The long-scroll candidate owns same-document history. Other variants keep
// their existing replace-only tab shell and browser scroll behavior.
if(laboratory)history.scrollRestoration="manual";
function show(next:TabName,focus=false,updateUrl=true){
  if(laboratory&&updateUrl&&document.body.dataset.labNative==='true'){
    location.assign(LABORATORY_ROUTES[next]+location.search);return;
  }
  const changed=next!==current;
  if(laboratory&&updateUrl&&changed){
    history.replaceState({...history.state,laboratoryScrollY:window.scrollY},"");
  }
  current=next;
  if(laboratory&&document.body.dataset.labNative!=='true'){
    const label=({home:'Home',experience:'Research',systems:'Systems',work:'Work',portfolio:'Portfolio',activity:'Activity',writing:'Fieldnotes',contact:'Contact'} as Record<TabName,string>)[next];
    const title=next==='home'?'Devon Alan Akins — CEO, Software Engineering & Research':label+' — Devon Alan Akins';
    document.title=title;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content',title);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href','https://devonakins.com'+LABORATORY_ROUTES[next]);
  }
  for(const panel of panels){
    const selected=panel.dataset.oneView===next;
    panel.hidden=!selected;
    panel.setAttribute("aria-hidden",String(!selected));
    if(selected&&focus)panel.focus({preventScroll:true});
  }
  for(const tab of tabs){
    const selected=tab.dataset.oneTarget===primaryForView(next);
    tab.setAttribute("aria-selected",String(selected));
    tab.tabIndex=selected?0:-1;
    if(selected&&tab.closest(".lab-tabs-mobile"))tab.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
  }
  if(updateUrl){
    const suffix=next==="home"?"":"#"+next;
    const url=laboratory?LABORATORY_ROUTES[next]+location.search:location.pathname+location.search+suffix;
    if(laboratory){
      if(changed)history.pushState({laboratoryScrollY:0},"",url);
      else history.replaceState(history.state,"",url);
      window.scrollTo({top:0,behavior:"instant"});
    }else history.replaceState(null,"",url);
  }
}
tabs.forEach(tab=>{
  tab.addEventListener("click",()=>{
    const next=tab.dataset.oneTarget||"";
    if(known(next))show(next,false);
  });
  tab.addEventListener("keydown",event=>{
    const group=tab.closest<HTMLElement>(".one-tabs");
    const groupNames=[...group?.querySelectorAll<HTMLElement>("[data-one-target]")||[]].map(t=>t.dataset.oneTarget).filter(known);
    const delta=event.key==="ArrowRight"||event.key==="ArrowDown"?1:
      event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:0;
    const target=event.key==="Home"?0:event.key==="End"?groupNames.length-1:
      delta?(groupNames.indexOf(primaryForView(current))+delta+groupNames.length)%groupNames.length:-1;
    if(target<0)return;
    event.preventDefault();
    show(groupNames[target]);
    group?.querySelector<HTMLButtonElement>('[data-one-target="'+groupNames[target]+'"]')?.focus();
  });
});
buttons.forEach(button=>button.addEventListener("click",event=>{
  if(button instanceof HTMLAnchorElement&&event instanceof MouseEvent&&
      (event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0))return;
  const next=button.dataset.oneGo||"";
  if(known(next)){event.preventDefault();show(next,true);}
}));
let historyFrame=0;
function restoreLocation(){
  const next=currentHash();
  show(next,false,false);
  if(laboratory){
    const saved=history.state?.laboratoryScrollY;
    const top=typeof saved==="number"&&Number.isFinite(saved)&&saved>=0?saved:0;
    cancelAnimationFrame(historyFrame);
    historyFrame=requestAnimationFrame(()=>{
      if(currentHash()!==next)return;
      document.querySelector<HTMLElement>('[data-one-view="'+next+'"]')?.focus({preventScroll:true});
      window.scrollTo({top,behavior:"instant"});
    });
  }
}
window.addEventListener("hashchange",restoreLocation);
window.addEventListener("popstate",restoreLocation);
if(laboratory){
  window.addEventListener("pagehide",()=>history.replaceState({...history.state,laboratoryScrollY:window.scrollY},""));
  window.addEventListener("pageshow",event=>{
    if(event.persisted||typeof history.state?.laboratoryScrollY==="number")restoreLocation();
  });
}
show(currentHash(),false,false);
