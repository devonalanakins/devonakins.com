/** Trusted Git metadata stays local; only an owner-approved project slug and edit time leave the editor. */
const vscode = require("vscode");
const ORIGIN = "https://devonakins.com";
const SECRET = "devon-presence-pairing-v1";
let cleanup;
function createCompanion(
  api,
  context,
  {
    fetcher = fetch,
    clock = Date.now,
    setTimer = setInterval,
    clearTimer = clearInterval,
  } = {},
) {
  let token = null,
    expires = 0,
    lastEdit = 0,
    lastSent = 0,
    lastSharedEdit = 0,
    enabled = false,
    inFlight = null,
    generation = 0,
    lastObserved = 0,
    forgetting = false,
    disposed = false,
    secretOperations = Promise.resolve(),
    project = null,
    automaticProject = true,
    gitApi = null,
    projects = [],
    repositoryCatalog = new Map(),
    catalogExpires = 0,
    catalogInFlight = null;
  const status = api.window.createStatusBarItem(
    api.StatusBarAlignment.Right,
    1,
  );
  status.command = "devonPresence.project";
  status.text = "Presence: paused";
  status.show();
  const say = (text) => {
    if (!disposed) status.text = "Presence: " + text;
  };
  // Keep a delayed credential save ahead of a later Forget Pairing deletion.
  const changeSecret = (operation) => {
    const next = secretOperations.then(operation);
    secretOperations = next.catch(() => {});
    return next;
  };
  async function post(path, body, bearer, method = "POST") {
    const response = await fetcher(ORIGIN + path, {
      method,
      credentials: "omit",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(8000),
    });
    if (
      !response.ok ||
      !response.headers.get("Content-Type")?.includes("application/json")
    )
      throw Error("Presence request declined");
    return response.json();
  }
  async function send(active) {
    const currentGeneration = generation;
    const bearer = token;
    // A stop must follow a pending active request. Aborting it does not prove
    // that the server did not accept it, and skipping it leaves activity live.
    if (!active) while (inFlight) await inFlight;
    if (
      disposed ||
      currentGeneration !== generation ||
      token !== bearer ||
      !token ||
      expires <= clock() ||
      (active &&
        (!enabled ||
          inFlight ||
          !project ||
          catalogExpires <= clock() ||
          !lastEdit ||
          lastEdit <= Math.max(lastSharedEdit, lastObserved)))
    )
      return false;
    // The server rejects replayed timestamps, including a pause in the same
    // millisecond as the last edit. Only stop signals may advance by one ms.
    const observed = active ? lastEdit : Math.max(clock(), lastObserved + 1);
    lastObserved = observed;
    // Throttle failed active requests as well as successful ones. A disconnected
    // source must not retry once per keystroke; stop signals remain immediate.
    if (active) lastSent = clock();
    const current = () =>
      !disposed && generation === currentGeneration && token === bearer;
    const request = (async () => {
      try {
        await post(
          "/api/presence/editor/heartbeat",
          {
            version: 1,
            active,
            projectSlug: project,
            observedAt: new Date(observed).toISOString(),
          },
          bearer,
        );
        if (current()) {
          lastSent = clock();
          if (active) lastSharedEdit = observed;
          say(active ? "editor active" : "paused");
        }
        return true;
      } catch {
        if (current()) say("not connected");
        return false;
      }
    })();
    inFlight = request;
    try {
      return await request;
    } finally {
      if (inFlight === request) inFlight = null;
    }
  }
  async function refreshCatalog() {
    if (catalogInFlight) return catalogInFlight;
    const bearer = token;
    if (!bearer || disposed || expires <= clock()) return false;
    const request = (async () => {
      try {
        const data = await post("/api/presence/editor/catalog", undefined, bearer, "GET");
        const until = Date.parse(data.expiresAt);
        if (data.version !== 1 || !Array.isArray(data.repositories) ||
            data.repositories.length > 500 || !Number.isFinite(until) ||
            until <= clock() || until > clock() + 310000)
          throw Error("Invalid approved repository catalog");
        const next = new Map();
        for (const entry of data.repositories) {
          if (!entry || typeof entry.owner !== "string" ||
              !/^[a-z0-9](?:[a-z0-9-]{0,38})$/.test(entry.owner) ||
              typeof entry.name !== "string" || !/^[a-z0-9_.-]{1,100}$/.test(entry.name) ||
              typeof entry.projectSlug !== "string" || !/^[a-z0-9-]{1,40}$/.test(entry.projectSlug))
            throw Error("Invalid approved repository catalog");
          const identity = entry.owner + "/" + entry.name;
          if (next.has(identity)) throw Error("Ambiguous approved repository catalog");
          next.set(identity, entry.projectSlug);
        }
        if (disposed || token !== bearer) return false;
        repositoryCatalog = next;
        catalogExpires = until;
        return true;
      } catch {
        if (!disposed && token === bearer) {
          repositoryCatalog = new Map();
          catalogExpires = 0;
          if (enabled) suspendUnknownProject("repository catalog unavailable; not sharing");
        }
        return false;
      }
    })();
    catalogInFlight = request;
    try { return await request; }
    finally { if (catalogInFlight === request) catalogInFlight = null; }
  }
  async function initializeGit() {
    // The presence extension can activate before the built-in Git extension.
    // Wait for its documented API instead of silently treating every edit as
    // generic public activity when Git has not activated yet.
    try {
      const extension = api.extensions?.getExtension("vscode.git");
      if (!extension) return;
      const exported = extension.isActive === false
        ? await extension.activate()
        : extension.exports;
      if (!disposed) gitApi = exported?.getAPI(1) || null;
    } catch {
      gitApi = null;
    }
  }
  function detectedProject(event) {
    try {
      if (api.workspace.isTrusted === false || !gitApi || catalogExpires <= clock()) return null;
      const uri = event.document?.uri;
      // Untitled buffers, SCM inputs and virtual documents are not repo edits.
      if (!uri || !["file", "vscode-remote"].includes(uri.scheme)) return null;
      const repo = gitApi.getRepository(uri);
      const remotes = repo?.state?.remotes;
      if (!Array.isArray(remotes)) return null;
      const origin = remotes.filter((remote) => remote.name === "origin");
      if (origin.length !== 1) return null;
      const remote = origin[0].fetchUrl;
      if (typeof remote !== "string") return null;
      const match =
        /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([a-z0-9-]+)\/([a-z0-9_.-]+?)(?:\.git)?$/i.exec(remote);
      return match ? repositoryCatalog.get((match[1] + "/" + match[2]).toLowerCase()) || null : null;
    } catch {
      return null;
    }
  }
  function suspendUnknownProject(message = "private repository; not sharing") {
    const hadActivity = !!lastEdit || !!inFlight;
    generation++;
    project = null;
    lastEdit = 0;
    say(message);
    if (hadActivity) void send(false);
  }
  const actions = {
    async pair() {
      if (disposed || forgetting) return;
      const currentGeneration = ++generation;
      enabled = false;
      lastEdit = 0;
      say("pairing, paused");
      await send(false);
      if (disposed || generation !== currentGeneration) return;
      const code = await api.window.showInputBox({
        prompt: "Paste the one-time code from your private presence controls",
        password: true,
        ignoreFocusOut: true,
      });
      if (disposed || generation !== currentGeneration) return;
      if (!code) {
        say(token ? "paired, paused" : "pairing required");
        return;
      }
      if (!/^[A-Za-z0-9_-]{43}$/.test(code)) {
        await api.window.showErrorMessage("Invalid pairing code.");
        return;
      }
      try {
        const data = await post("/api/presence/editor/claim", {
          pairCode: code,
        });
        if (disposed || generation !== currentGeneration) return;
        if (
          typeof data.token !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(data.token) ||
          !Array.isArray(data.projects)
        )
          throw Error("Invalid pairing");
        const nextExpires = Date.parse(data.expiresAt);
        const nextProjects = data.projects.filter(
          (v) => typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v),
        );
        if (!Number.isFinite(nextExpires) || nextExpires <= clock())
          throw Error("Expired pairing");
        await changeSecret(() => {
          if (disposed || generation !== currentGeneration) return;
          return context.secrets.store(
            SECRET,
            JSON.stringify({
              token: data.token,
              expires: nextExpires,
              projects: nextProjects,
            }),
          );
        });
        if (disposed || generation !== currentGeneration) return;
        token = data.token;
        expires = nextExpires;
        projects = nextProjects;
        if (!projects.includes(project)) project = null;
        enabled = false;
        await changeSecret(() =>
          context.globalState.update("sharingEnabled", false),
        );
        if (disposed || generation !== currentGeneration) return;
        lastSharedEdit = 0;
        lastObserved = 0;
        repositoryCatalog = new Map();
        catalogExpires = 0;
        await refreshCatalog();
        if (disposed || generation !== currentGeneration) return;
        say("paired, paused");
        await api.window.showInformationMessage(
          "Paired. Enable editor activity in the private website controls, then choose Resume Sharing here.",
        );
      } catch {
        if (disposed || generation !== currentGeneration) return;
        token = null;
        enabled = false;
        say("pairing failed");
        await api.window.showErrorMessage(
          "Pairing failed or expired. Create a new code in the private controls.",
        );
      }
    },
    async project() {
      const choice = await api.window.showQuickPick(
        [
          { label: "Automatic from approved GitHub repository", slug: "auto" },
          { label: "Keep all repository edits private", slug: null },
        ],
        { placeHolder: "Only edits in an approved GitHub repository can be shared." },
      );
      if (choice) {
        automaticProject = choice.slug === "auto";
        await context.globalState.update("automaticProject", automaticProject);
        // Remove a legacy project-name override; it cannot establish repo identity.
        await context.globalState.update("publicProject", undefined);
        suspendUnknownProject();
      }
    },
    async resume() {
      if (disposed || forgetting || !token || expires <= clock()) {
        say("pairing required");
        return;
      }
      const currentGeneration = ++generation;
      try {
        await changeSecret(() =>
          context.globalState.update("sharingEnabled", true),
        );
      } catch {
        say("could not save sharing preference");
        return;
      }
      if (disposed || forgetting || generation !== currentGeneration || !token)
        return;
      const catalogReady = await refreshCatalog();
      if (disposed || forgetting || generation !== currentGeneration || !token) return;
      enabled = true;
      lastEdit = 0;
      say(catalogReady ? "waiting for approved repository edit" : "repository catalog unavailable; not sharing");
    },
    async pause() {
      if (disposed || forgetting) return;
      const currentGeneration = ++generation;
      enabled = false;
      lastEdit = 0;
      say("paused");
      const stop = send(false);
      try {
        await changeSecret(() =>
          context.globalState.update("sharingEnabled", false),
        );
      } catch {
        say("paused; could not save startup preference");
      }
      await stop;
      if (generation === currentGeneration)
        say("paused; public signal expires within two minutes if disconnected");
    },
    async disconnect() {
      if (disposed || forgetting) return;
      forgetting = true;
      generation++;
      enabled = false;
      lastEdit = 0;
      say("forgetting pairing");
      await send(false);
      token = null;
      expires = 0;
      repositoryCatalog = new Map();
      catalogExpires = 0;
      try {
        await changeSecret(() =>
          context.globalState.update("sharingEnabled", false),
        );
        await changeSecret(() => context.secrets.delete(SECRET));
        say("pairing forgotten");
      } catch {
        say("pairing removal failed");
        await api.window.showErrorMessage(
          "Could not remove the saved pairing. Try Forget Pairing again.",
        );
      } finally {
        forgetting = false;
      }
    },
  };
  const subscriptions = Object.entries(actions).map(([name, fn]) =>
    api.commands.registerCommand("devonPresence." + name, fn),
  );
  subscriptions.push(
    api.workspace.onDidChangeTextDocument((event) => {
      // Metadata stays local: map the edited document to an approved remote. Never inspect text or send paths.
      if (!enabled || !api.window.state.focused || !event.contentChanges.length) return;
      const detected = automaticProject ? detectedProject(event) : null;
      if (!detected) {
        suspendUnknownProject();
        return;
      }
      project = detected;
      lastEdit = clock();
      if (clock() - lastSent >= 60000) void send(true);
    }),
  );
  const timer = setTimer(() => {
    if (!enabled) return;
    if (expires <= clock()) {
      generation++;
      enabled = false;
      token = null;
      say("pairing expired");
      return;
    }
    if (catalogExpires <= clock()) {
      if (lastEdit) suspendUnknownProject();
      void refreshCatalog();
      return;
    }
    if (catalogExpires - clock() <= 60000) void refreshCatalog();
    if (
      lastEdit &&
      api.window.state.focused &&
      clock() - lastEdit < 120000 &&
      clock() - lastSent >= 60000
    )
      void send(true);
    else if (
      lastEdit &&
      (!api.window.state.focused || clock() - lastEdit >= 120000)
    ) {
      lastEdit = 0;
      void send(false);
    }
  }, 60000);
  async function restore() {
    const currentGeneration = generation;
    try {
      const data = JSON.parse((await context.secrets.get(SECRET)) || "null");
      if (disposed || generation !== currentGeneration) return;
      if (
        data &&
        typeof data.token === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(data.token) &&
        data.expires > clock() &&
        Array.isArray(data.projects)
      ) {
        token = data.token;
        expires = data.expires;
        projects = data.projects;
        automaticProject =
          context.globalState.get("automaticProject") !== false;
        // Previous versions allowed an arbitrary selected project. Identity is
        // now always established by the edited document's Git repository.
        project = null;
        enabled = context.globalState.get("sharingEnabled") === true;
        lastEdit = 0;
        await refreshCatalog();
        if (disposed || generation !== currentGeneration) return;
        say(enabled ? "waiting for approved repository edit" : "paired, paused");
      }
    } catch {
      if (generation === currentGeneration) say("pairing required");
    }
  }
  const dispose = () => {
    disposed = true;
    generation++;
    enabled = false;
    clearTimer(timer);
    for (const s of subscriptions) s.dispose();
    status.dispose();
  };
  context.subscriptions.push({ dispose });
  return { actions, ready: Promise.all([restore(), initializeGit()]), dispose };
}
exports.createCompanion = createCompanion;
exports.activate = (context) => {
  const companion = createCompanion(vscode, context);
  cleanup = companion.dispose;
  return companion.ready;
};
exports.deactivate = () => {
  if (cleanup) cleanup();
};
