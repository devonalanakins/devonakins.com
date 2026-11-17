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
  return known(raw)?raw:"home";
};
let current:TabName="home";
// The long-scroll candidate owns same-document history. Other variants keep
// their existing replace-only tab shell and browser scroll behavior.
if(laboratory)history.scrollRestoration="manual";
function show(next:TabName,focus=false,updateUrl=true){
  const changed=next!==current;
  if(laboratory&&updateUrl&&changed){
    history.replaceState({...history.state,laboratoryScrollY:window.scrollY},"");
  }
  current=next;
  for(const panel of panels){
    const selected=panel.dataset.oneView===next;
    panel.hidden=!selected;
    panel.setAttribute("aria-hidden",String(!selected));
    if(selected&&focus)panel.focus({preventScroll:true});
  }
  for(const tab of tabs){
    const selected=tab.dataset.oneTarget===next;
    tab.setAttribute("aria-selected",String(selected));
    tab.tabIndex=selected?0:-1;
    if(selected&&tab.closest(".lab-tabs-mobile"))tab.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
  }
  if(updateUrl){
    const suffix=next==="home"?"":"#"+next;
    const url=location.pathname+location.search+suffix;
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
      delta?(groupNames.indexOf(current)+delta+groupNames.length)%groupNames.length:-1;
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
function restoreLocation(){
  show(currentHash(),laboratory,false);
  if(laboratory){
    const saved=history.state?.laboratoryScrollY;
    window.scrollTo({top:typeof saved==="number"&&Number.isFinite(saved)&&saved>=0?saved:0,behavior:"instant"});
  }
}
window.addEventListener("hashchange",restoreLocation);
window.addEventListener("popstate",restoreLocation);
show(currentHash(),false,false);
