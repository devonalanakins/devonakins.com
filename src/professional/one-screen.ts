/**
 * One-viewport client. This controls only the visual tab shell; live GitHub
 * and Spotify/GPT rendering remain the existing independent, consent-aware
 * professional clients. No telemetry or owner state is written here.
 */
type TabName="home"|"experience"|"work"|"activity"|"writing"|"contact";
const names:TabName[]=["home","experience","work","activity","writing","contact"];
const tabs=[...document.querySelectorAll<HTMLButtonElement>("[data-one-target]")];
const buttons=[...document.querySelectorAll<HTMLButtonElement>("[data-one-go]")];
const panels=[...document.querySelectorAll<HTMLElement>("[data-one-view]")];
// A fixed viewport cannot show an unbounded list. Match the public event
// summary to the number of rows the visible panel can actually accommodate.
// The full recent public history remains accessible from the GitHub profile.
const width=window.innerWidth;
const height=window.innerHeight;
const narrowShort=width<=400&&height<=700;
const mobile=width<=760;
const shortWide=width>760&&height<=470;
const compactDesktop=width>760&&height>470&&height<=800;
const homeLimit=narrowShort||shortWide?1:mobile||compactDesktop?2:4;
const activityLimit=narrowShort||shortWide?2:mobile||compactDesktop?4:6;
const homeFeed=document.getElementById("one-home-github");
const activityFeed=document.getElementById("one-activity-github");
if(homeFeed)homeFeed.dataset.limit=String(homeLimit);
if(activityFeed)activityFeed.dataset.limit=String(activityLimit);
const known=(value:string|null):value is TabName=>!!value&&names.includes(value as TabName);
const currentHash=():TabName=>{
  const raw=location.hash.slice(1).toLowerCase();
  return known(raw)?raw:"home";
};
let current:TabName="home";
function show(next:TabName,focus=false,updateUrl=true){
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
  }
  if(updateUrl){
    const suffix=next==="home"?"":"#"+next;
    history.replaceState(null,"",location.pathname+location.search+suffix);
  }
}
tabs.forEach(tab=>{
  tab.addEventListener("click",()=>{
    const next=tab.dataset.oneTarget||"";
    if(known(next))show(next,false);
  });
  tab.addEventListener("keydown",event=>{
    const delta=event.key==="ArrowRight"||event.key==="ArrowDown"?1:
      event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:0;
    const target=event.key==="Home"?0:event.key==="End"?names.length-1:
      delta?(names.indexOf(current)+delta+names.length)%names.length:-1;
    if(target<0)return;
    event.preventDefault();
    show(names[target]);
    const group=tab.closest<HTMLElement>(".one-tabs");
    group?.querySelector<HTMLButtonElement>('[data-one-target="'+names[target]+'"]')?.focus();
  });
});
buttons.forEach(button=>button.addEventListener("click",()=>{
  const next=button.dataset.oneGo||"";
  if(known(next))show(next,true);
}));
window.addEventListener("hashchange",()=>show(currentHash(),false,false));
window.addEventListener("popstate",()=>show(currentHash(),false,false));
show(currentHash(),false,false);
