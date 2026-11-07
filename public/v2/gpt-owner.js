// Protected owner-only GPT measurements; values originate from an explicit owner entry.
const endpoint = "/api/gpt/owner";
const labels = {
  profile_7d_tokens: ["7-day tokens", "Owner-visible personal profile", true],
  profile_lifetime_tokens_approx: ["Approximate lifetime tokens", "Owner-visible personal profile", true],
  profile_7d_messages: ["7-day messages", "Owner-visible personal profile", true],
  profile_streak_days: ["Streak days", "Owner-visible personal profile", true],
  work_codex_credits_remaining: ["Work/Codex credits remaining", "Usage & billing", false],
  work_codex_credits_used: ["Work/Codex credits used", "Usage & billing", false],
  business_7d_messages: ["My 7-day messages", "Business member usage row", true],
  business_7d_credits_used: ["My 7-day credits", "Business member usage row", false],
};
const byId = (name) => document.getElementById(name);
let busy = false;
let generation = 0;
const say = (message) => { byId("gpt-owner-status").textContent = message; };
async function request(method = "GET", body) {
  const r = await fetch(endpoint, {
    method, cache: "no-store", credentials: "same-origin",
    headers: {"Content-Type":"application/json",Accept:"application/json"},
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.headers.get("Content-Type")?.includes("application/json"))
    throw Error("Owner session is unavailable.");
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Analytics unavailable.");
  return data;
}
function render(data) {
  const list=byId("gpt-owner-records");
  list.replaceChildren();
  const observations=Array.isArray(data.observations)?data.observations:[];
  if (!observations.length) {say("No private observations saved. Use the form above to record one.");return;}
  for (const r of observations) {
    if (!Object.hasOwn(labels,r.metric) || typeof r.value !== "number") continue;
    const row=document.createElement("article");
    row.className="gpt-record-row";
    const title=document.createElement("div");
    title.className="gpt-record-value";
    const label=document.createElement("strong");
    label.textContent=labels[r.metric][0];
    const amount=document.createElement("span");
    amount.textContent=new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(r.value)+" "+r.unit;
    title.append(label,amount);
    const meta=document.createElement("p");
    meta.className="fine";
    const date=Number.isFinite(Date.parse(r.asOf))?new Date(r.asOf).toLocaleString():"Unknown";
    meta.textContent=labels[r.metric][1]+" · Recorded "+date+" · "+(r.freshness==="historical"?"Historical":"Recent");
    const controls=document.createElement("div");
    controls.className="gpt-record-actions";
    const toggle=document.createElement("button");
    toggle.type="button";
    toggle.className="secondary";
    toggle.disabled=!data.publishingAllowed;
    toggle.textContent=r.shared?"Stop publishing":"Share this metric";
    toggle.onclick=async()=>{
      if(!r.shared && !window.confirm("Publish this metric and its future owner-recorded updates when Live Signal broadcasting is enabled?"))return;
      await mutate("POST",{action:"sharing",metric:r.metric,enabled:!r.shared,revision:r.revision});
    };
    const remove=document.createElement("button");
    remove.type="button";
    remove.className="secondary";
    remove.textContent="Delete";
    remove.onclick=async()=>{
      if(!window.confirm("Permanently remove this recorded metric from the private database?"))return;
      await mutate("DELETE",{metric:r.metric});
    };
    controls.append(toggle,remove);
    row.append(title,meta,controls);
    list.append(row);
  }
  say(observations.length+" recorded metric"+(observations.length===1?"":"s")+
    ". "+(data.publishingAllowed?"Public metric release is available but opt-in.":"All observations remain private; public release gate is off."));
}
async function refresh() {
  if (busy || document.hidden) return;
  busy=true;
  const current=generation;
  try {const data=await request();if(current===generation)render(data);}
  catch(e){if(current===generation)say(e.message);}
  finally {busy=false;}
}
async function mutate(method,body) {
  if(busy)return;
  busy=true;
  generation++;
  byId("gpt-save").disabled=true;
  say("Saving…");
  try {
    await request(method,body);
    say("Saved securely. Rechecking private records…");
  } catch(e){say(e.message);}
  finally {busy=false;byId("gpt-save").disabled=false;void refresh();}
}
const metric=byId("gpt-metric");
function updateHelp() {
  const data=labels[metric.value];
  byId("gpt-value").step=data?.[2]?"1":"any";
  byId("gpt-value").value="";
  byId("gpt-source-help").textContent=
    (data?.[1]||"Choose a known source")+
    ". Enter only your own visible number. Recorded time means capture time, not the provider's refresh time.";
}
metric.addEventListener("change",updateHelp);
updateHelp();
byId("gpt-record-form").addEventListener("submit",(event)=>{
  event.preventDefault();
  const raw=byId("gpt-value").value.trim();
  if(raw==="")return;
  const value=Number(raw);
  const spec=labels[metric.value];
  if(!spec || !Number.isFinite(value) || value<0 || (spec[2]&&!Number.isSafeInteger(value))){
    say("Enter a valid nonnegative number for the selected metric.");return;
  }
  void mutate("POST",{action:"record",metric:metric.value,value});
});
byId("gpt-reload").onclick=()=>void refresh();
document.addEventListener("visibilitychange",()=>{
  generation++;
  if(!document.hidden)void refresh();
});
window.setInterval(()=>{if(!document.hidden)void refresh();},300_000);
void refresh();
