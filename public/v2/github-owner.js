// Access-owner inventory. Repository names never enter public page assets.
const endpoint = "/api/presence/owner?channel=github";
const projects = {
  merit: "Merit",
  rhen: "Rhen",
  mizvo: "Mizvo",
  devonstation: "DevonStation",
  squelch: "Squelch",
  anevum: "Anevum",
  brandicade: "Brandicade",
  vesper: "Vesper",
  knowledge: "Knowledge",
  "devonakins-com": "DevonAkins.com",
};
const el = (id) => document.getElementById(id);
let busy = false,
  currentData = null;
function setBusy(value) {
  busy = value;
  document.querySelectorAll("button").forEach((b) => (b.disabled = value));
  el("github-discover").disabled =
    value || !currentData?.enabled || !currentData?.configured;
}
const say = (value) => {
  el("github-status").textContent = value;
};
async function request(method = "GET", body) {
  const r = await fetch(endpoint, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.headers.get("Content-Type")?.includes("application/json"))
    throw Error("Owner session unavailable. Sign in and reload.");
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Repository connection unavailable.");
  return data;
}
function render(data) {
  currentData = data;
  el("github-readiness").textContent = data.enabled
    ? data.configured
      ? "The selected-installation App is configured. Repositories still require independent approval."
      : "App credentials are incomplete. Existing connections do not establish a working central App."
    : "Central reporting is disabled. A selected-repository App must be configured before discovery or events can be accepted.";
  el("github-discover").disabled = busy || !data.enabled || !data.configured;
  const list = el("github-repositories");
  list.replaceChildren();
  for (const r of Array.isArray(data.repositories) ? data.repositories : []) {
    if (
      !Number.isSafeInteger(r.id) ||
      typeof r.fullName !== "string" ||
      !Number.isSafeInteger(r.revision)
    )
      continue;
    const row = document.createElement("article");
    row.className = "github-repository";
    const info = document.createElement("div"),
      title = document.createElement("h3"),
      state = document.createElement("p"),
      observed = document.createElement("p");
    title.textContent = r.fullName;
    state.className = observed.className = "fine";
    state.textContent =
      (r.private
        ? "Private repository"
        : r.authorized
          ? "Authorized repository"
          : "Access removed") +
      " · " +
      (r.recognizedProject
        ? "Recognized as " + projects[r.recognizedProject]
        : "Unclassified") +
      " · " +
      (r.connected ? "Connected" : "Disconnected") +
      " · " +
      (r.sharing ? "Sharing enabled" : "Not sharing");
    observed.textContent =
      "Last verified event: " +
      (r.observedAt && Number.isFinite(Date.parse(r.observedAt))
        ? new Date(r.observedAt).toLocaleString()
        : "None") +
      (r.connected
        ? " · " +
          (r.health === "reporting"
            ? "Recent workflow event"
            : "No recent workflow event")
        : "");
    info.append(title, state, observed);
    row.append(info);
    if (!r.private && r.authorized) {
      const controls = document.createElement("div"),
        label = document.createElement("label"),
        select = document.createElement("select");
      select.id = "github-project-" + r.id;
      label.htmlFor = select.id;
      label.textContent = "Public project identity";
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Choose a project";
      select.append(empty);
      for (const [slug, name] of Object.entries(projects)) {
        const option = document.createElement("option");
        option.value = slug;
        option.textContent = name;
        select.append(option);
      }
      select.value = r.projectSlug || r.recognizedProject || "";
      const shareLabel = document.createElement("label"),
        share = document.createElement("input");
      shareLabel.className = "github-sharing";
      share.type = "checkbox";
      share.checked = r.sharing === true;
      shareLabel.append(
        share,
        document.createTextNode("Share verified workflow status"),
      );
      const actions = document.createElement("div");
      actions.className = "actions";
      const connect = document.createElement("button");
      connect.type = "button";
      connect.textContent = r.connected
        ? "Update connection"
        : "Connect this repository";
      connect.onclick = () => {
        if (!select.value) {
          say("Choose the approved project identity first.");
          return;
        }
        if (
          share.checked &&
          !window.confirm(
            "Publish fixed workflow states under " +
              projects[select.value] +
              " when public sharing is enabled? Repository metadata and workflow titles stay private.",
          )
        )
          return;
        mutate("POST", {
          action: "connect",
          id: r.id,
          revision: r.revision,
          projectSlug: select.value,
          enabled: share.checked,
        });
      };
      actions.append(connect);
      if (r.approved) {
        const revoke = document.createElement("button");
        revoke.type = "button";
        revoke.className = "secondary";
        revoke.textContent = "Revoke connection";
        revoke.onclick = () =>
          mutate("DELETE", { id: r.id, revision: r.revision });
        actions.append(revoke);
      }
      controls.append(label, select, shareLabel, actions);
      row.append(controls);
    }
    list.append(row);
  }
  say(
    list.children.length
      ? list.children.length +
          " privately discovered repositories. Review their connection and sharing separately."
      : "No repositories discovered yet.",
  );
}
async function load() {
  if (busy) return;
  setBusy(true);
  try {
    render(await request());
  } catch (e) {
    say(e.message);
  } finally {
    setBusy(false);
  }
}
async function mutate(method, body) {
  if (busy) return;
  setBusy(true);
  try {
    await request(method, body);
    render(await request());
    say("Connection settings saved.");
  } catch (e) {
    say(e.message);
  } finally {
    setBusy(false);
  }
}
el("github-reload").onclick = load;
el("github-discover").onclick = () => mutate("POST", { action: "discover" });
void load();
