/** No credentials stored here. Cloudflare Access authenticates same-origin requests. */
const el = (id) => document.getElementById(id);
let state = null;
let busy = false;
let pending = 0;
let operationSequence = 0;
let confirmedStopOperation = 0;
let cloudState = null;
let cloudGeneration = 0;
let threadsChecking = false;
let threadsAuthState = null;
let threadsAuthBusy = false;
function notice(text) {
  el("presence-notice").textContent = text;
}
/** Read-only owner display; no API call, credential reveal or publication toggle. */
function renderSourceReadiness(sources) {
  const root=el("owner-source-readiness");
  if (!root) return;
  if (!sources || sources.version!==1) {
    const item=document.createElement("li");
    item.textContent="Provider configuration is unavailable.";
    root.replaceChildren(item);
    return;
  }
  const t=sources.threads||{},sp=sources.spotify||{},
    gh=sources.github||{},ed=sources.editor||{},
    tasks=sources.tasks||{},gpt=sources.gpt||{};
  const localObservation = value => {
    if (typeof value!=="string") return null;
    const parsed=Date.parse(value);
    return Number.isFinite(parsed) && new Date(parsed).toISOString()===value
      ? new Date(parsed).toLocaleString() : null;
  };
  const lastEditor=localObservation(ed.lastObservedAt);
  const lastTask=localObservation(tasks.lastAcceptedAt);
  const rows=[
    ["Threads",t.privateConnected
      ? "Private Meta authorization stored. Public Threads posts remain a separate opt-in."
      : t.configured
      ? "Configured for public read; use the private test to verify the account."
      : !t.authorizationConfigured
        ? "Meta authorization not configured. Read-only feed stays disconnected."
        : "Credentials configured; account, global sharing and publication gates still require approval."],
    ["Spotify",sp.connection==="authorization-stored"
      ? "Authorization stored; current playback not verified. Use Spotify connection to test sharing."
      : sp.connection==="reauthorization-required"
        ? "Reauthorization required before playback sharing."
        : sp.appConfigured
          ? "App configured; account playback connection not confirmed."
          : "Spotify application not configured."],
    ["GitHub",(gh.appIntegrationEnabled && gh.authorizationConfigured
      ? (gh.approvedRepositoryCount===0
          ? "GitHub App configured, but no public repositories are approved. Connect/review the repository inventory."
          : "GitHub App configured; "+gh.approvedRepositoryCount+
            " approved public repository connection(s). A live event still requires provider evidence.")
      : "Public GitHub history reader exists; authenticated GitHub App connection is not configured. "+
        (gh.approvedRepositoryCount===0?"No repositories in the approved App inventory.":""))+
      (gh.signedCiReceiverEnabled
        ? " Signed main-branch CI receiver enabled; a real accepted workflow event is still required."
        : " Signed CI receiver not yet activated.")],
    ["Editor",!ed.serverEnabled ? "Editor receiver not enabled."
      : ed.paired===false
        ? "Receiver enabled, but no editor credential is paired. Open the editor controls to pair VS Code."
        : ed.paired===true
          ? (ed.ownerSharingSelected
              ? "Editor sharing is approved, but pairing is not proof of a live editor. "+
                (lastEditor?"Last accepted edit: "+lastEditor+".":"No accepted edit is recorded.")+
                " Resume sharing in VS Code and edit an approved local Git file."
              : "Editor credential paired; public sharing is not selected.")
          : "Editor receiver enabled; pairing has not been verified."],
    ["Remote tasks",!tasks.reportersSupported ? "Task reporting unavailable."
      : Number.isSafeInteger(tasks.connectedSourceCount)
        ? (tasks.connectedSourceCount===0
            ? "No registered reporter credentials. Connect a trusted runner for real task checkpoints."
            : tasks.connectedSourceCount+" registered reporter credential(s); "+
              tasks.publicSourceCount+" approved for sharing. "+
              (lastTask?"Last accepted task signal: "+lastTask+". ":"No task signal has been accepted. ")+
              "Registration does not mean a reporter is currently running.")
        : "Participating task reporters supported; current connections not verified."],
    ["GPT / Codex",gpt.captureToolAvailable
      ? "Owner-recorded, dated captures supported; automatic account telemetry not available."
      : "Capture storage not configured."],
    ["Instagram / Facebook","Instagram profile link only; Facebook destination unverified. No authenticated social feed is asserted."],
  ];
  // Direct navigation uses existing owner-approved controls. This map
  // cannot authorize an integration or enable public sharing by itself.
  const actions={
    "Threads":["https://developers.meta.com/","Open Meta developer setup"],
    "Spotify":["/owner/listening/","Manage Spotify connection"],
    "GitHub":["/owner/github/","Manage repository connections"],
    "Editor":["#editor-title","Pair or review VS Code editor"],
    "Remote tasks":["#reporters-title","Connect a trusted workspace"],
    "GPT / Codex":["/owner/gpt/","Record dated measurements"],
  };
  root.replaceChildren(...rows.map(([name,description])=>{
    const item=document.createElement("li");
    const title=document.createElement("strong");
    const detail=document.createElement("span");
    title.textContent=name;
    detail.textContent=description;
    item.append(title,detail);
    const action=actions[name];
    if(action){
      const link=document.createElement("a");
      link.href=action[0];
      link.textContent=action[1];
      link.className="source-readiness-action";
      if(link.protocol==="https:" && link.origin!==location.origin){
        link.target="_blank";
        link.rel="noopener noreferrer";
      }
      item.append(link);
    }
    return item;
  }));
}
function lock(value) {
  document.querySelectorAll("button,input,select").forEach((node) => {
    // Concurrent workspace controls own their request lock and disclosure gate.
    if (node.closest('[aria-labelledby="reporters-title"]')) return;
    node.disabled = value;
  });
  if (!value && state && !state.publishingAllowed)
    el("presence-enabled").disabled = true;
  if (!value && (!cloudState || !cloudState.publishingAllowed))
    el("cloud-enabled").disabled = true;
  // Emergency stop stays available while a slower ordinary save is pending.
  if (!value) el("threads-check").disabled = threadsChecking ||
    !state?.sources?.threads?.authorizationConfigured ||
    !state?.sources?.threads?.usernameConfigured;
  if (!value) {
    el("threads-connect").disabled = !threadsAuthState?.appConfigured ||
      !threadsAuthState?.storageReady || !!threadsAuthState?.connected ||
      threadsAuthBusy;
    el("threads-disconnect").disabled = !threadsAuthState?.connected ||
      threadsAuthBusy;
    const last=Date.parse(threadsAuthState?.verifiedAt||"");
    const expires=Date.parse(threadsAuthState?.expiresAt||"");
    el("threads-renew").disabled = !threadsAuthState?.connected ||
      threadsAuthBusy || !Number.isFinite(last) ||
      !Number.isFinite(expires) ||
      Date.now()-last < 24*60*60_000 ||
      expires<=Date.now()+60_000;
  }
  if (state) el("presence-off").disabled = false;
}
function render(data) {
  if (state && data.revision < state.revision) return false;
  state = data;
  renderSourceReadiness(data.sources);
  const project = el("presence-project");
  project.replaceChildren(new Option("No public project", ""));
  const catalog =
    data.projectCatalog ||
    Object.fromEntries(data.projects.map((slug) => [slug, slug]));
  for (const slug of data.projects)
    project.add(new Option(catalog[slug] || slug, slug));
  const choices = el("presence-project-choices");
  const policyWarning = el("project-policy-warning");
  if (policyWarning) policyWarning.hidden = data.projectChoicesNeedReview !== true;
  choices.replaceChildren();
  for (const [slug, label] of Object.entries(catalog)) {
    const item = document.createElement("label");
    item.className = "setting";
    const text = document.createElement("span");
    text.textContent = label;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.value = slug;
    check.checked = data.projects.includes(slug);
    check.dataset.publicProject = "true";
    item.append(text, check);
    choices.append(item);
  }
  project.value = data.projectSlug || "";
  el("presence-enabled").checked = data.enabled;
  el("presence-private").checked = data.privateWork;
  el("presence-music").checked = data.shareListening;
  el("presence-editor-enabled").checked = data.editorEnabled === true;
  const preview = data.preview;
  el("presence-preview").textContent =
    (preview.state === "custom"
      ? preview.label
      : preview.state.replaceAll("-", " ")) +
    (preview.project ? " · " + preview.project : "") +
    " · " +
    preview.source;
  el("manual-expiry").textContent = data.manualExpiresAt ? "Status expires " + new Date(data.manualExpiresAt).toLocaleString() : "No temporary status.";
  el("session-expiry").textContent = data.sessionExpiresAt
    ? (data.paused ? "Paused. " : "") +
      "Expires " +
      new Date(data.sessionExpiresAt).toLocaleTimeString()
    : "No active session.";
  return true;
}
async function load() {
  const response = await fetch("/api/presence/owner", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (
    !response.ok ||
    !response.headers.get("Content-Type")?.includes("application/json")
  )
    throw new Error(
      "Private controls unavailable. Check owner sign-in and deployment setup.",
    );
  render(await response.json());
}
async function mutate(action, extra = {}) {
  if ((busy && action !== "off") || !state) return;
  const operation = ++operationSequence;
  pending++;
  busy = true;
  lock(true);
  notice(action === "off" ? "Stopping broadcasting…" : "Saving…");
  try {
    const response = await fetch("/api/presence/owner", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ action, revision: state.revision, ...extra }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.headers.get("Content-Type")?.includes("application/json"))
      throw new Error(
        "Owner sign-in may have expired. Reload and sign in again.",
      );
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 409) await load();
      throw new Error(data.error || "Change was not saved.");
    }
    const current = render(data);
    if (current && action === "projects") {
      // The independent runner panel rechecks the server-approved choices;
      // no credentials or project selections are supplied by this event.
      document.dispatchEvent(new Event("presence-projects-saved"));
    }
    if (current && action === "off") {
      confirmedStopOperation = Math.max(confirmedStopOperation, operation);
      cloudGeneration++;
      clearCloudCode();
      cloudState = null;
      el("cloud-preview").textContent =
        "Task disconnected by Stop all broadcasting.";
      el("cloud-confirmed").textContent = "No current task signal.";
      el("cloud-enabled").checked = false;
    }
    if (current && operation >= confirmedStopOperation)
      notice(
        action === "off"
          ? "Broadcasting stopped. Presence and Spotify are hidden."
          : "Saved.",
      );
  } catch (error) {
    if (operation >= confirmedStopOperation)
      notice(error.message || "Change was not saved.");
  } finally {
    pending--;
    busy = pending > 0;
    lock(busy || !state);
  }
}
const session = () => ({
  projectSlug: el("presence-project").value || null,
  minutes: Number(el("presence-duration").value),
});
el("session-start").onclick = () => mutate("start", session());
el("session-resume").onclick = () => mutate("resume", session());
el("session-pause").onclick = () => mutate("pause");
el("session-end").onclick = () => mutate("end");
el("manual-set").onclick = () =>
  mutate("manual", {
    status: el("presence-manual").value,
    minutes: Number(el("presence-manual-duration").value),
    ...(el("presence-manual").value === "custom"
      ? {
          label: el("presence-custom-label").value,
          labelApproved: el("presence-label-approved").checked,
        }
      : {}),
  });
el("presence-manual").onchange = () => {
  const custom = el("presence-manual").value === "custom";
  el("custom-status-fields").hidden = !custom;
  const duration = el("presence-manual-duration");
  for (const option of duration.options) option.disabled = !custom && Number(option.value) > 30;
  if (!custom && Number(duration.value) > 30) duration.value = "30";
  if (custom && Number(duration.value) <= 30) duration.value = "1440";
};
el("presence-manual").dispatchEvent(new Event("change"));
el("projects-save").onclick = () =>
  mutate("projects", {
    projects: [
      ...document.querySelectorAll("[data-public-project]:checked"),
    ].map((input) => input.value),
  });
el("manual-clear").onclick = () => mutate("clear-manual");
el("presence-save").onclick = () =>
  mutate("settings", {
    enabled: el("presence-enabled").checked,
    privateWork: el("presence-private").checked,
    shareListening: el("presence-music").checked,
    editorEnabled: el("presence-editor-enabled").checked,
  });
el("presence-off").onclick = () => mutate("off");
/** Explicit request only. The token is kept in Cloudflare; never entered in
 * this page, included in a URL, or returned in the response. */
async function checkThreadsConnection() {
  const ready=state?.sources?.threads;
  if (busy || threadsChecking || !ready?.authorizationConfigured ||
      !ready?.usernameConfigured) return;
  threadsChecking=true;
  const status=el("threads-check-result");
  el("threads-check").disabled=true;
  status.textContent="Checking the authorized Threads account…";
  try {
    const response=await fetch("/api/presence/owner?channel=threads",{
      method:"POST",credentials:"same-origin",cache:"no-store",
      headers:{Accept:"application/json"},
      signal:AbortSignal.timeout(10000),
    });
    if(!response.ok ||
      !response.headers.get("Content-Type")?.includes("application/json"))
      throw Error("Private provider check unavailable. Check your owner sign-in.");
    const result=await response.json();
    if(result?.version!==1)throw Error("Invalid provider check.");
    const messages={
      verified:"Official Threads account verified. This check did not enable public sharing.",
      "account-mismatch":"This Threads token belongs to a different account. No posts were shared.",
      denied:"Meta rejected the token. Reauthorize with read-only threads_basic access.",
      unavailable:"The Meta connection could not be verified. No sharing was changed.",
      "not-configured":"The private Threads account credentials are not configured.",
    };
    status.textContent=messages[result.connection] ||
      "The Threads connection could not be verified.";
  } catch(error) {
    status.textContent=error?.message || "Threads connection check unavailable.";
  } finally {
    threadsChecking=false;
    el("threads-check").disabled=busy ||
      !state?.sources?.threads?.authorizationConfigured ||
      !state?.sources?.threads?.usernameConfigured;
  }
}
el("threads-check").onclick=checkThreadsConnection;

/** No Meta credentials enter the browser. Only the owner click starts OAuth. */
function renderThreadsAuthorization(data) {
  if(!data || data.version!==1)throw Error("Invalid Threads status.");
  threadsAuthState=data;
  const nextRenewal=Date.parse(data.verifiedAt||"")+24*60*60_000;
  const message=data.connected
    ? "Official Threads authorization securely stored. Expires " +
      new Date(data.expiresAt).toLocaleDateString() +
      (Number.isFinite(nextRenewal) ? ". Renewal available after " +
        new Date(nextRenewal).toLocaleString() : "") +
      ". Public posts are not enabled."
    : !data.appConfigured
      ? "Meta Threads App ID and secret are not configured on the Worker."
      : !data.storageReady
        ? "Private Threads database migration is pending."
        : "No authorized Threads account connected. Public sharing is off.";
  el("threads-connection-status").textContent=message;
  lock(busy || threadsAuthBusy || !state);
}
async function loadThreadsAuthorization() {
  try {
    const response=await fetch("/api/threads/auth/status",{
      credentials:"same-origin",cache:"no-store",
      headers:{Accept:"application/json"},signal:AbortSignal.timeout(10000),
    });
    if(!response.ok || !response.headers.get("Content-Type")?.includes("application/json"))
      throw Error("Private connection status unavailable.");
    renderThreadsAuthorization(await response.json());
    // The OAuth callback never returns tokens in a query string.
    const result=new URLSearchParams(location.search).get("threads");
    if(result==="connected")
      el("threads-connection-status").textContent=
        "Meta account authorized privately. Posts remain disconnected.";
    else if(result && ["callback","expired","reused","authorization"].includes(result))
      el("threads-connection-status").textContent=
        "Meta authorization was not completed. No sharing was changed.";
  } catch(error) {
    threadsAuthState=null;
    el("threads-connection-status").textContent=
      error?.message || "Private Threads connection unavailable.";
    lock(busy || !state);
  }
}
async function changeThreadsAuthorization(action) {
  if(busy || threadsAuthBusy || !threadsAuthState?.storageReady ||
     (action==="start" && (!threadsAuthState.appConfigured || threadsAuthState.connected)) ||
     (action==="disconnect" && !threadsAuthState.connected) ||
     (action==="renew" && (!threadsAuthState.connected ||
       !Number.isFinite(Date.parse(threadsAuthState.verifiedAt||"")) ||
       Date.now()-Date.parse(threadsAuthState.verifiedAt||"") < 24*60*60_000)))
    return;
  threadsAuthBusy=true;
  lock(true);
  el("threads-connection-status").textContent=
    action==="start"?"Preparing secure Meta authorization…" :
      action==="renew"?"Renewing the private Threads credential…" :
      "Removing locally stored Threads authorization…";
  try {
    const response=await fetch("/api/threads/auth/"+action,{
      method:"POST",credentials:"same-origin",cache:"no-store",
      headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000),
    });
    if(!response.headers.get("Content-Type")?.includes("application/json"))
      throw Error("Owner sign-in required.");
    const data=await response.json();
    if(!response.ok)throw Error(data?.error || "Private Threads request unavailable.");
    if(action==="start"){
      const target=new URL(data.authorizeUrl);
      if(!["threads.net","www.threads.net"].includes(target.hostname) ||
         target.protocol!=="https:" || target.pathname!=="/oauth/authorize" ||
         target.searchParams.get("scope")!=="threads_basic" ||
         !target.searchParams.get("state"))
        throw Error("Meta authorization destination was rejected.");
      window.location.assign(target.href);
    } else {
      await Promise.all([loadThreadsAuthorization(),load()]);
      el("threads-check-result").textContent=action==="renew"
        ? "Private Threads authorization renewed. No posts shared."
        : "Local Threads token removed. Revoke app access in Meta separately. Public posts remain off.";
    }
  } catch(error) {
    el("threads-connection-status").textContent=
      error?.message || "Private Threads operation unavailable.";
  } finally {
    threadsAuthBusy=false;
    lock(busy || !state);
  }
}
el("threads-connect").onclick=()=>changeThreadsAuthorization("start");
el("threads-disconnect").onclick=()=>changeThreadsAuthorization("disconnect");
el("threads-renew").onclick=()=>changeThreadsAuthorization("renew");

lock(true);
load()
  .then(() => {
    lock(false);
    void loadThreadsAuthorization();
    notice(
      state.publishingAllowed
        ? "Controls ready. Public sharing requires your opt-in."
        : "Controls ready. Public release approval is still disabled.",
    );
  })
  .catch((error) => notice(error.message));

async function editorPairing(method) {
  if (busy) return;
  busy = true;
  lock(true);
  el("editor-code-wrap").hidden = true;
  el("editor-pair-code").value = "";
  try {
    const response = await fetch("/api/presence/editor/pairing", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (
      !response.ok ||
      !response.headers.get("Content-Type")?.includes("application/json")
    )
      throw Error(
        "Editor pairing is unavailable until private setup is complete.",
      );
    const data = await response.json();
    if (method === "POST" && typeof data.pairCode === "string") {
      el("editor-pair-code").value = data.pairCode;
      el("editor-code-wrap").hidden = false;
      el("editor-pair-code").focus();
      el("editor-pair-code").select();
      el("editor-pair-status").textContent =
        "Paste this code only into the VS Code pairing command. It expires in five minutes.";
      window.setTimeout(() => {
        el("editor-code-wrap").hidden = true;
        el("editor-pair-code").value = "";
      }, 300000);
    } else el("editor-pair-status").textContent = "Editor disconnected.";
  } catch (error) {
    el("editor-pair-status").textContent = error.message;
  } finally {
    busy = false;
    lock(!state);
  }
}
el("editor-pair").onclick = () => editorPairing("POST");
el("editor-unpair").onclick = () => editorPairing("DELETE");

const cloudEndpoint = "/api/presence/owner?channel=cloud";
function clearCloudCode() {
  el("cloud-code-wrap").hidden = true;
  el("cloud-pair-code").value = "";
}
function renderCloud(data) {
  cloudState = data;
  el("cloud-enabled").checked = data.enabled;
  el("cloud-enabled").disabled = busy || !data.publishingAllowed;
  const view = data.privatePreview;
  const names = {
    running: "Task running",
    waiting: "Waiting for input",
    completed: "Task completed",
    failed: "Task failed",
    cancelled: "Task cancelled",
    unknown: "Signal expired — task state unknown",
    "no-signal": "No current task signal",
  };
  const source =
    view.source === "codex"
      ? "Codex"
      : view.source === "chatgpt-work"
        ? "ChatGPT Work"
        : null;
  const fresh = view.expiresAt && Date.parse(view.expiresAt) > Date.now();
  el("cloud-preview").textContent =
    (view.expiresAt && !fresh
      ? names.unknown
      : names[view.state] || names["no-signal"]) +
    (fresh && source ? " · " + source : "") +
    (fresh && view.project ? " · " + view.project : "");
  el("cloud-confirmed").textContent =
    (view.asOf
      ? "Last confirmed " + new Date(view.asOf).toLocaleTimeString() + ". "
      : "") +
    (fresh && view.checkpoint
      ? "Task-reported checkpoint: " +
        view.checkpoint.replaceAll("-", " ") +
        ". "
      : "") +
    "Task reports are separate from verified test results and your own presence.";
  el("cloud-notice").textContent = data.paired
    ? "Task paired. Public sharing " +
      (data.enabled && data.publishingAllowed
        ? "selected; global visibility also applies."
        : "off.")
    : "No cloud task is connected.";
}
async function cloudRequest(method = "GET", body) {
  if (busy && method !== "GET") return;
  const generation = cloudGeneration;
  if (method !== "GET") {
    pending++;
    busy = true;
    lock(true);
    clearCloudCode();
  }
  try {
    const response = await fetch(cloudEndpoint, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.headers.get("Content-Type")?.includes("application/json"))
      throw Error("Reload and sign in to use cloud controls.");
    const data = await response.json();
    if (!response.ok)
      throw Error(data.error || "Cloud connection unavailable.");
    if (generation !== cloudGeneration) return;
    if (data.pairCode) {
      el("cloud-pair-code").value = data.pairCode;
      el("cloud-code-wrap").hidden = false;
      el("cloud-pair-code").focus();
      el("cloud-pair-code").select();
      const code = data.pairCode;
      window.setTimeout(() => {
        if (el("cloud-pair-code").value === code) clearCloudCode();
      }, 300000);
    }
    if (method === "GET") renderCloud(data);
    else await cloudRequest();
  } catch (error) {
    if (generation === cloudGeneration)
      el("cloud-notice").textContent =
        error.message || "Cloud connection unavailable.";
  } finally {
    if (method !== "GET") {
      pending--;
      busy = pending > 0;
      lock(busy || !state);
    }
  }
}
el("cloud-pair").onclick = () =>
  cloudRequest("POST", { action: "pair", source: el("cloud-source").value });
el("cloud-disconnect").onclick = () => {
  cloudGeneration++;
  return cloudRequest("DELETE");
};
el("cloud-refresh").onclick = () => cloudRequest();
el("cloud-save").onclick = () =>
  cloudState &&
  cloudRequest("POST", {
    action: "settings",
    enabled: el("cloud-enabled").checked,
    revision: cloudState.revision,
  });
void cloudRequest();
window.setInterval(() => {
  if (cloudState) renderCloud(cloudState);
  if (!document.hidden && !busy) void cloudRequest();
}, 30000);
