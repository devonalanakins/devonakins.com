import {initProfessionalSignals} from "./signals";
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
  if (item.version !== 1 || !["GitHub public events API", "GitHub public Atom feed"].includes(String(item.source)) ||
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
// Original concept palette, implemented with deterministic first-party SVGs.
// Event labels remain provider-projected text; no commit body or PR title is used.
type EventVariant = "push" | "merged" | "opened" | "review" | "release" | "issue" | "other";
const eventVariant = (event:Activity):EventVariant =>
  event.kind==="pull_request"
    ? event.label==="Merged a pull request"?"merged"
      :event.label==="Opened a pull request"?"opened":"review"
    :event.kind;
const EVENT_ICONS:Record<EventVariant,string> = {
  push:"M6 3v12a4 4 0 0 0 4 4h4 M6 3a2 2 0 1 0 0 4a2 2 0 0 0 0-4 M6 13a2 2 0 1 0 0 4a2 2 0 0 0 0-4 M18 15a2 2 0 1 0 0 4a2 2 0 0 0 0-4",
  merged:"M6 6v12 M6 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4 M6 18a2 2 0 1 0 0 4a2 2 0 0 0 0-4 M18 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4 M18 6v5a7 7 0 0 1-7 7H8",
  opened:"M6 6v12 M6 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4 M6 18a2 2 0 1 0 0 4a2 2 0 0 0 0-4 M18 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4 M18 6v6a6 6 0 0 1-6 6H9",
  review:"M6 6v12 M6 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4 M6 18a2 2 0 1 0 0 4a2 2 0 0 0 0-4 M18 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4 M18 6v6a6 6 0 0 1-6 6H9",
  release:"M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z M7.5 7.5h.01",
  issue:"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18 M12 7v6 M12 17h.01",
  other:"M12 3l9 5-9 5-9-5 9-5 M3 13l9 5 9-5 M3 18l9 5 9-5",
};
const EVENT_CHIPS:Record<EventVariant,string> = {
  push:"PUSH",merged:"MERGED",opened:"PULL REQUEST",review:"REVIEW",
  release:"RELEASE",issue:"ISSUE",other:"ACTIVITY",
};
const SVG_NS="http://www.w3.org/2000/svg";
const eventIcon=(variant:EventVariant)=>{
  const svg=document.createElementNS(SVG_NS,"svg");
  svg.setAttribute("viewBox","0 0 24 24");
  svg.setAttribute("fill","none");
  svg.setAttribute("stroke","currentColor");
  svg.setAttribute("stroke-width","1.65");
  svg.setAttribute("stroke-linecap","round");
  svg.setAttribute("stroke-linejoin","round");
  svg.setAttribute("aria-hidden","true");
  const path=document.createElementNS(SVG_NS,"path");
  path.setAttribute("d",EVENT_ICONS[variant]);
  svg.append(path);
  return svg;
};
const mark=(event:Activity)=>{
  const variant=eventVariant(event);
  const span=document.createElement("span");
  span.className="p-event-symbol";
  span.dataset.kind=event.kind;
  span.dataset.variant=variant;
  span.append(eventIcon(variant));
  return span;
};
const chip=(event:Activity)=>{
  const variant=eventVariant(event);
  const span=document.createElement("span");
  span.className="p-event-chip";
  span.dataset.variant=variant;
  span.textContent=EVENT_CHIPS[variant];
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
      const meta=document.createElement("span");
      meta.className="p-event-meta";
      meta.append(detail,chip(event));
      when.dateTime=event.at;
      when.textContent=age(event.at,now);
      content.append(heading,meta);
      link.append(mark(event),content,when);
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
      li.dataset.variant=eventVariant(event);
      li.append(mark(event),link);
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
    }else void refresh(); // Hidden state clears the feed, so restore it immediately.
  });
  window.addEventListener("pageshow",event=>{if(event.persisted){latest=null;paint();void refresh()}});
}

initProfessionalSignals();
