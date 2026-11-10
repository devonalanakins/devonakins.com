import {initProfessionalSignals} from "./signals.ts";
type Activity = {
  kind: "push" | "pull_request" | "release" | "issue" | "other";
  label: string;
  repo: string;
  at: string;
  url: string;
};
type Snapshot = {
  version: number;
  source: string;
  status: "available" | "empty" | "unavailable";
  checkedAt: string;
  reason: string | null;
  retryAt: string | null;
  events: Activity[];
};
const panels = [...document.querySelectorAll<HTMLElement>("[data-public-github-feed]")];
const filters = [...document.querySelectorAll<HTMLButtonElement>("[data-github-filter]")];
const source = document.querySelector<HTMLElement>("[data-github-source-state]");
const toggle = document.querySelector<HTMLButtonElement>(".p-mobile-toggle");
const mobileNav = document.querySelector<HTMLElement>("#p-mobile-nav");
toggle?.addEventListener("click", () => {
  if (!mobileNav) return;
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  mobileNav.hidden = !open;
});
mobileNav?.querySelectorAll("a").forEach(link =>
  link.addEventListener("click", () => {
    mobileNav.hidden = true;
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Open menu");
  }),
);
let latest: Snapshot | null = null;
let kind = "all";
let busy = false;
let checked = 0;

const eventKinds = ["push", "pull_request", "release", "issue", "other"];
const age = (value: string, now = Date.now()) => {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "Time unavailable";
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  return minutes < 1 ? "just now" : minutes < 60 ? minutes + "m ago" :
    minutes < 1440 ? Math.floor(minutes / 60) + "h ago" :
    Math.floor(minutes / 1440) + "d ago";
};
const valid = (input: unknown): input is Snapshot => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const item = input as Record<string,unknown>;
  if (item.version !== 1 || item.source !== "GitHub public events API" ||
      !["available", "empty", "unavailable"].includes(String(item.status)) ||
      !Array.isArray(item.events) || item.events.length > 32 ||
      typeof item.checkedAt !== "string" ||
      !Number.isFinite(Date.parse(item.checkedAt)) ||
      Date.parse(item.checkedAt) > Date.now()+60000 ||
      Date.parse(item.checkedAt) < Date.now()-4*3600000-60000) return false;
  const events = item.events as unknown[];
  if (item.status === "unavailable" && events.length) return false;
  return events.every(event => {
    if (!event || typeof event !== "object" || Array.isArray(event)) return false;
    const e = event as Record<string,unknown>;
    return eventKinds.includes(String(e.kind)) &&
      typeof e.label === "string" && /^[A-Za-z ]{3,40}$/.test(e.label) &&
      typeof e.repo === "string" &&
      /^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(e.repo) &&
      e.url === "https://github.com/" + e.repo &&
      typeof e.at === "string" &&
      Number.isFinite(Date.parse(e.at)) &&
      Date.parse(e.at) <= Date.now()+60000 &&
      Date.parse(e.at) > Date.now()-90*86400000;
  });
};
const mark = (type: Activity["kind"]) => {
  const span=document.createElement("span");
  span.className="p-event-symbol";
  span.dataset.kind=type;
  const glyph=document.createElement("span");
  glyph.textContent=type === "push" ? "↗" : type === "pull_request" ? "⑂" :
    type === "release" ? "◇" : type === "issue" ? "○" : "·";
  glyph.setAttribute("aria-hidden","true");
  span.append(glyph);
  return span;
};
function paint(){
  const snapshot=latest;
  const now=Date.now();
  for(const panel of panels){
    const list=panel.querySelector<HTMLOListElement>("[data-feed-list]");
    const status=panel.querySelector<HTMLElement>("[data-feed-status]");
    if(!list || !status) continue;
    const max=Math.min(32,Number(panel.dataset.limit)||5);
    const available=snapshot?.status==="available";
    const visible=available
      ? snapshot.events.filter(x=>kind==="all"||x.kind===kind).slice(0,max):[];
    const fragment=document.createDocumentFragment();
    for(const event of visible){
      const li=document.createElement("li");
      const link=document.createElement("a");
      const content=document.createElement("span");
      const heading=document.createElement("strong");
      const detail=document.createElement("small");
      const when=document.createElement("time");
      link.href=event.url;
      link.target="_blank";
      link.rel="noopener noreferrer";
      heading.textContent=event.label;
      detail.textContent=event.repo;
      when.dateTime=event.at;
      when.textContent=age(event.at,now);
      content.append(heading,detail);
      link.append(mark(event.kind),content,when);
      li.append(link);
      fragment.append(li);
    }
    list.replaceChildren(fragment);
    const state=snapshot?.status||"unavailable";
    status.dataset.status=state;
    const stamp=snapshot && Number.isFinite(Date.parse(snapshot.checkedAt))
      ? " · checked "+new Date(snapshot.checkedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})
      : "";
    status.textContent=state==="available"
      ? visible.length+" public event"+(visible.length===1?"":"s")+" in this view"+stamp
      : state==="empty" ? "No qualifying recent public GitHub events"+stamp
      : "Public GitHub feed temporarily unavailable. GitHub may be limiting requests; retrying automatically.";
  }

  const observed=snapshot?.status==="available" ? snapshot.events : [];
  for(const counter of document.querySelectorAll<HTMLElement>("[data-github-count]")){
    const requested=counter.dataset.githubCount;
    counter.textContent=snapshot?.status==="available" || snapshot?.status==="empty"
      ? String(observed.filter(event=>event.kind===requested).length) : "—";
    counter.setAttribute("aria-label",
      counter.textContent==="—" ? "Data unavailable" : counter.textContent+" recorded "+requested+" events");
  }
  const highlights=document.querySelector<HTMLOListElement>("[data-github-highlights]");
  if(highlights){
    const fragment=document.createDocumentFragment();
    for(const event of observed.slice(0,4)){
      const li=document.createElement("li");
      const link=document.createElement("a");
      const label=document.createElement("span");
      const when=document.createElement("time");
      link.href=event.url;
      link.target="_blank";
      link.rel="noopener noreferrer";
      label.textContent=event.label+" · "+event.repo;
      when.dateTime=event.at;
      when.textContent=age(event.at,now);
      link.append(label,when);
      li.append(link);
      fragment.append(li);
    }
    if(fragment.childNodes.length===0){
      const li=document.createElement("li");
      li.textContent=snapshot?.status==="empty"
        ? "No recent qualifying public events."
        : "No verified public events to display.";
      fragment.append(li);
    }
    highlights.replaceChildren(fragment);
  }
  if(source){
    source.textContent=snapshot?.status==="available"
      ? "Public GitHub source responding · checked "+new Date(snapshot.checkedAt).toLocaleString()
      : snapshot?.status==="empty"
      ? "Public source reachable · no qualifying recent events"
      : "Public GitHub source unavailable; no activity inferred.";
  }
}
filters.forEach(filter=>filter.addEventListener("click",()=>{
  const next=filter.dataset.githubFilter;
  if(!next || (next!=="all" && !eventKinds.includes(next)))return;
  kind=next;
  filters.forEach(item=>item.setAttribute("aria-pressed",String(item===filter)));
  paint();
}));
async function refresh(){
  if(busy || document.hidden || panels.length===0)return;
  busy=true;
  checked=Date.now();
  try{
    const response=await fetch("/api/github/public-feed",{
      method:"GET",credentials:"omit",cache:"no-store",
      headers:{Accept:"application/json"},
      signal:AbortSignal.timeout(9000),
    });
    if(!response.ok || !response.headers.get("Content-Type")?.includes("application/json"))
      throw new Error("No source");
    const body:unknown=await response.json();
    if(!valid(body))throw new Error("Invalid source");
    latest=body;
  }catch{
    latest=null;
  }finally{
    busy=false;
    paint();
  }
}
if(panels.length){
  void refresh();
  window.setInterval(()=>{if(!document.hidden)void refresh()},5*60000);
  window.setInterval(()=>{if(!document.hidden&&latest)paint()},60000);
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){
      latest=null;
      paint();
    }else if(Date.now()-checked>=60000)void refresh();
  });
  window.addEventListener("pageshow",event=>{if(event.persisted){latest=null;paint();void refresh()}});
}

initProfessionalSignals();
