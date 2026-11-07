/** Central, opt-in GitHub App ingress. Only fixed status fields reach V4 tasks. */
import { digest, secureRandom } from "./listening-crypto.mjs";
import {
  isListeningOwner,
  validOwnerOrigin,
  readSmallJson,
  ownerJson,
  ownerError,
} from "./listening-owner-core.mjs";
import { PUBLIC_REPOSITORIES } from "./activity-history.mjs";
import { PUBLIC_PRESENCE_PROJECTS } from "./presence-model.mjs";
import { approvedProjects } from "./presence-preferences.mjs";
import {
  configuredGithubApp,
  discoverGithubRepositories,
  positiveId,
} from "./github-integration-auth.mjs";
import { renderGithubIntegrationOwner } from "./github-integration-page.mjs";

const OWNER = "devonalanakins";
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).sort().join("|") === [...keys].sort().join("|");
const all = async (s) => (await s.all()).results || [];
const owner = (db) =>
  db.prepare("SELECT * FROM presence_state WHERE id=1").first();
const activeSource = (s, o, at) =>
  !!s &&
  !s.revoked &&
  s.source === "github-actions" &&
  s.token_until > at &&
  s.generation === o?.editor_generation &&
  approvedProjects(o).includes(s.project_slug);
const source = (db) => (id) =>
  db.prepare("SELECT * FROM activity_sources WHERE id=?").bind(id).first();
const recognized = (name) =>
  PUBLIC_REPOSITORIES[name.split("/")[1]?.toLowerCase()] || null;
const iso = (t) => (t > 0 ? new Date(t).toISOString() : null);
const validRepo = (r) =>
  positiveId(r?.id) &&
  typeof r.name === "string" &&
  /^[A-Za-z0-9_.-]{1,100}$/.test(r.name) &&
  r.owner?.login === OWNER &&
  r.full_name === OWNER + "/" + r.name &&
  typeof r.private === "boolean" &&
  typeof r.default_branch === "string" &&
  r.default_branch.length > 0 &&
  r.default_branch.length <= 255;
const config = (env) =>
  env.PRESENCE_ENABLED === "true" &&
  env.GITHUB_INTEGRATION_ENABLED === "true" &&
  !!env.LISTENING_DB;
const syncGate =
  "EXISTS(SELECT 1 FROM github_integration_state WHERE id=1 AND sync_nonce=?)";

/** Catalog is private to the paired editor; only explicitly public mappings are returned. */
export function createGithubEditorCatalog({ clock = Date.now } = {}) {
  return async (request, env = {}) => {
    if (new URL(request.url).pathname !== "/api/presence/editor/catalog")
      return ownerError("Not found", 404);
    if (request.method !== "GET") return ownerError("Method not allowed", 405);
    if (
      env.PRESENCE_ENABLED !== "true" ||
      env.PRESENCE_EDITOR_ENABLED !== "true" ||
      !env.LISTENING_DB
    )
      return ownerError("Not found", 404);
    try {
      const token = request.headers.get("Authorization") || "";
      if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(token))
        return ownerError("Editor authentication required", 401);
      const db = env.LISTENING_DB,
        at = clock(),
        o = await owner(db);
      const before = await db
        .prepare("SELECT * FROM presence_editor WHERE id=1")
        .first();
      const hash = await digest(token.slice(7));
      if (
        !o ||
        before?.token_hash !== hash ||
        before.token_until <= at ||
        before.generation !== o.editor_generation
      )
        return ownerError("Editor authentication required", 401);
      const projects = approvedProjects(o),
        repositories = Object.entries(PUBLIC_REPOSITORIES)
          .filter(([, s]) => projects.includes(s))
          .map(([name, projectSlug]) => ({ owner: OWNER, name, projectSlug }));
      let discovered = [];
      if (config(env)) {
        discovered = await all(
          db.prepare(
            "SELECT * FROM github_repositories ORDER BY repo_id LIMIT 501",
          ),
        );
        if (discovered.length > 500)
          return ownerError("Repository catalog limit exceeded");
        // A repository known to have become private or lost authorized access
        // cannot retain recognition merely through the historical catalog.
        for (let i = repositories.length - 1; i >= 0; i--) {
          const record = discovered.find(
            (r) =>
              r.full_name?.toLowerCase() === OWNER + "/" + repositories[i].name,
          );
          if (
            record &&
            (record.private !== 0 ||
              record.authorized !== 1 ||
              record.approved !== 1)
          )
            repositories.splice(i, 1);
        }
        for (const r of discovered) {
          if (r.private !== 0 || r.authorized !== 1 || r.approved !== 1)
            continue;
          if (
            !projects.includes(r.project_slug) ||
            !r.full_name?.startsWith(OWNER + "/")
          )
            continue;
          const name = r.full_name.slice(OWNER.length + 1).toLowerCase();
          if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) continue;
          const old = repositories.find((x) => x.name === name);
          if (old) old.projectSlug = r.project_slug;
          else
            repositories.push({
              owner: OWNER,
              name,
              projectSlug: r.project_slug,
            });
        }
      }
      if (repositories.length > 500)
        return ownerError("Repository catalog limit exceeded");
      // One final read fences owner/editor revocation AND the exact inventory
      // revision set. No separate async check can reopen either boundary.
      const inventoryRevision = discovered
        .map((r) => [r.repo_id, r.revision])
        .sort((a, b) => a[0] - b[0])
        .map(([id, revision]) => id + ":" + revision)
        .join(",");
      const after = await db
        .prepare(
          "SELECT p.revision,p.editor_generation,e.token_hash,e.generation,e.token_until" +
            (config(env)
              ? ",(SELECT COALESCE(group_concat(stamp,','),'') FROM (SELECT repo_id || ':' || revision AS stamp FROM github_repositories ORDER BY repo_id LIMIT 501)) AS inventory_revision"
              : "") +
            " FROM presence_state p JOIN presence_editor e ON p.id=e.id WHERE p.id=1",
        )
        .first();
      if (config(env) && after?.inventory_revision !== inventoryRevision)
        return ownerError("Repository catalog changed", 409);
      const credential = after;
      if (
        after?.revision !== o.revision ||
        after?.editor_generation !== o.editor_generation ||
        credential?.token_hash !== before.token_hash ||
        credential?.generation !== before.generation ||
        credential?.token_until <= at
      )
        return ownerError("Editor state changed", 409);
      return ownerJson({
        version: 1,
        repositories,
        expiresAt: iso(Math.min(at + 300000, before.token_until)),
      });
    } catch {
      return ownerError("Editor catalog unavailable");
    }
  };
}

async function syncInventory(db, repositories, at) {
  if (
    repositories.length > 500 ||
    repositories.some((r) => !validRepo(r)) ||
    new Set(repositories.map((r) => r.id)).size !== repositories.length
  )
    throw Error("Invalid repository inventory");
  const state = await db
    .prepare("SELECT * FROM github_integration_state WHERE id=1")
    .first();
  if (!state) throw Error("Migration required");
  const nonce = secureRandom(16),
    ids = repositories.map((r) => r.id),
    keep = ids.length ? ids.map(() => "?").join(",") : "NULL";
  const batch = [
    db
      .prepare(
        "UPDATE github_integration_state SET revision=revision+1,sync_nonce=?,discovered_at=? WHERE id=1 AND revision=?",
      )
      .bind(nonce, at, state.revision),
  ];
  // Removed/renamed/private repositories lose their source before inventory changes.
  batch.push(
    db
      .prepare(
        "UPDATE activity_sources SET revoked=1,public_enabled=0,revision=revision+1 WHERE id IN (SELECT source_id FROM github_repositories WHERE repo_id NOT IN (" +
          keep +
          ")) AND " +
          syncGate,
      )
      .bind(...ids, nonce),
  );
  batch.push(
    db
      .prepare(
        "UPDATE github_repositories SET authorized=0,approved=0,revision=revision+1 WHERE repo_id NOT IN (" +
          keep +
          ") AND " +
          syncGate,
      )
      .bind(...ids, nonce),
  );
  for (const r of repositories) {
    batch.push(
      db
        .prepare(
          "UPDATE activity_sources SET revoked=1,public_enabled=0,revision=revision+1 WHERE id IN (SELECT source_id FROM github_repositories WHERE repo_id=? AND (full_name<>? OR private<>? OR default_branch<>?)) AND " +
            syncGate,
        )
        .bind(r.id, r.full_name, Number(r.private), r.default_branch, nonce),
    );
    batch.push(
      db
        .prepare(
          "INSERT INTO github_repositories(repo_id,full_name,default_branch,private,discovered_at) SELECT ?,?,?,?,? WHERE " +
            syncGate +
            " ON CONFLICT(repo_id) DO UPDATE SET full_name=excluded.full_name,default_branch=excluded.default_branch,private=excluded.private,authorized=1,approved=CASE WHEN github_repositories.full_name<>excluded.full_name OR github_repositories.private<>excluded.private OR github_repositories.default_branch<>excluded.default_branch THEN 0 ELSE github_repositories.approved END,revision=github_repositories.revision+1",
        )
        .bind(
          r.id,
          r.full_name,
          r.default_branch,
          Number(r.private),
          at,
          nonce,
        ),
    );
  }
  const results = await db.batch(batch);
  return results[0].meta?.changes === 1;
}

async function readWebhook(request, secret) {
  const signature = request.headers.get("X-Hub-Signature-256") || "";
  if (
    typeof secret !== "string" ||
    secret.length < 32 ||
    secret.length > 512 ||
    !/^sha256=[a-f0-9]{64}$/.test(signature) ||
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("Content-Type") || "",
    )
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 262144) {
        await reader.cancel();
        return null;
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sig = Uint8Array.from(signature.slice(7).match(/../g), (x) =>
    parseInt(x, 16),
  );
  if (!(await crypto.subtle.verify("HMAC", key, sig, bytes))) return null;
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
function workflowSignal(payload, at) {
  const r = payload.workflow_run;
  if (
    !r ||
    !positiveId(r.id) ||
    !positiveId(r.run_attempt) ||
    r.run_attempt > 1000 ||
    r.head_repository?.id !== payload.repository.id ||
    r.head_branch !== payload.repository.default_branch ||
    !["push", "workflow_dispatch"].includes(r.event)
  )
    return null;
  const observed = Date.parse(r.updated_at);
  if (
    !Number.isFinite(observed) ||
    observed <= at - 120000 ||
    observed > at + 10000
  )
    return null;
  if (
    payload.action === "requested" &&
    ["queued", "requested", "waiting", "pending"].includes(r.status)
  )
    return { state: "waiting", terminal: 0, observed, rank: 0 };
  if (payload.action === "in_progress" && r.status === "in_progress")
    return { state: "running", terminal: 0, observed, rank: 1 };
  if (payload.action === "completed" && r.status === "completed") {
    const state =
      r.conclusion === "success"
        ? "completed"
        : r.conclusion === "cancelled"
          ? "cancelled"
          : [
                "failure",
                "timed_out",
                "action_required",
                "startup_failure",
                "stale",
              ].includes(r.conclusion)
            ? "failed"
            : null;
    return state ? { state, terminal: 1, observed, rank: 2 } : null;
  }
  return null;
}

export function createGithubIntegration({
  clock = Date.now,
  githubFetch = fetch,
} = {}) {
  return async (request, env = {}, ctx = {}) => {
    const url = new URL(request.url),
      page = ["/owner/github", "/owner/github/"].includes(url.pathname),
      admin =
        page ||
        (url.pathname === "/api/presence/owner" &&
          url.search === "?channel=github");
    if (!admin && url.pathname !== "/api/activity/github/webhook")
      return ownerError("Not found", 404);
    // Owner readiness is inspectable before activation; public ingress stays disabled.
    if (admin && !(await isListeningOwner(env, ctx)))
      return ownerError("Owner authentication required", 403);
    if (page) {
      if (!["GET", "HEAD"].includes(request.method))
        return ownerError("Method not allowed", 405);
      return new Response(
        request.method === "HEAD" ? null : renderGithubIntegrationOwner(),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "CDN-Cache-Control": "no-store",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }
    if (admin && request.method !== "GET" && !validOwnerOrigin(request))
      return ownerError("Cross-site operation denied", 403);
    if (admin && request.method === "GET" && !config(env))
      return ownerJson({
        version: 1,
        configured: configuredGithubApp(env),
        enabled: false,
        repositories: [],
        discoveredAt: null,
      });
    if (!config(env)) return ownerError("Not found", 404);
    if (
      !["GET", "POST", "DELETE"].includes(request.method) ||
      (!admin && request.method !== "POST")
    )
      return ownerError("Method not allowed", 405);
    try {
      const db = env.LISTENING_DB,
        at = clock(),
        o = await owner(db);
      if (!o || !Number.isSafeInteger(at) || at < 1)
        return ownerError("Integration unavailable");
      if (admin && request.method === "GET") {
        const inventory = await all(
          db.prepare(
            "SELECT * FROM github_repositories ORDER BY full_name LIMIT 500",
          ),
        );
        const sources = await all(
          db.prepare("SELECT * FROM activity_sources LIMIT 32"),
        );
        const state = await db
          .prepare("SELECT * FROM github_integration_state WHERE id=1")
          .first();
        return ownerJson({
          version: 1,
          enabled: true,
          configured: configuredGithubApp(env),
          discoveredAt: iso(state?.discovered_at),
          repositories: inventory.map((r) => {
            const s = sources.find((s) => s.id === r.source_id),
              connected =
                activeSource(s, o, at) &&
                r.authorized === 1 &&
                r.approved === 1 &&
                r.private === 0;
            return {
              id: r.repo_id,
              fullName: r.full_name,
              private: r.private === 1,
              authorized: r.authorized === 1,
              recognizedProject: recognized(r.full_name),
              projectSlug: r.project_slug,
              approved: r.approved === 1,
              connected,
              sharing: connected && s.public_enabled === 1,
              revision: r.revision,
              observedAt: iso(r.observed_at),
              expiresAt: connected ? iso(s.token_until) : null,
              health: connected
                ? at - r.observed_at < 120000
                  ? "reporting"
                  : "no-recent-event"
                : "disconnected",
            };
          }),
        });
      }
      if (admin) {
        let data;
        try {
          data = await readSmallJson(request);
        } catch {
          return ownerError("Invalid owner request", 400);
        }
        if (
          request.method === "POST" &&
          exact(data, ["action"]) &&
          data.action === "discover"
        ) {
          const repos = await discoverGithubRepositories(env, at, githubFetch);
          return (await syncInventory(db, repos, at))
            ? ownerJson({ saved: true, discovered: repos.length })
            : ownerError("Inventory changed. Refresh and retry.", 409);
        }
        if (
          request.method === "POST" &&
          exact(data, ["action", "id", "revision", "projectSlug", "enabled"]) &&
          data.action === "connect" &&
          positiveId(data.id) &&
          Number.isSafeInteger(data.revision) &&
          typeof data.enabled === "boolean" &&
          Object.hasOwn(PUBLIC_PRESENCE_PROJECTS, data.projectSlug) &&
          approvedProjects(o).includes(data.projectSlug)
        ) {
          if (data.enabled && env.PRESENCE_PUBLIC_RELEASE_APPROVED !== "true")
            return ownerError("Public release not approved", 403);
          const r = await db
            .prepare("SELECT * FROM github_repositories WHERE repo_id=?")
            .bind(data.id)
            .first();
          if (!r || r.revision !== data.revision || !r.authorized || r.private)
            return ownerError("Repository unavailable or changed", 409);
          const id = r.source_id || secureRandom(16),
            hash = await digest(secureRandom(32)),
            until = at + 30 * 86400000;
          const results = await db.batch([
            db
              .prepare(
                "INSERT INTO activity_sources(id,source,project_slug,generation,token_hash,token_until,created_at,public_enabled) SELECT ?,'github-actions',?,?,?,?,?,? WHERE ((SELECT COUNT(*) FROM activity_sources)<32 OR EXISTS(SELECT 1 FROM activity_sources WHERE id=?)) AND EXISTS(SELECT 1 FROM github_repositories WHERE repo_id=? AND revision=? AND authorized=1 AND private=0) AND EXISTS(SELECT 1 FROM presence_state WHERE id=1 AND editor_generation=? AND revision=?) ON CONFLICT(id) DO UPDATE SET project_slug=excluded.project_slug,generation=excluded.generation,token_hash=excluded.token_hash,token_until=excluded.token_until,public_enabled=excluded.public_enabled,revoked=0,revision=activity_sources.revision+1",
              )
              .bind(
                id,
                data.projectSlug,
                o.editor_generation,
                hash,
                until,
                at,
                Number(data.enabled),
                id,
                data.id,
                data.revision,
                o.editor_generation,
                o.revision,
              ),
            // Renewals never relabel or revive the prior source's tasks.
            db
              .prepare(
                "UPDATE activity_tasks SET revoked=1,revision=revision+1 WHERE source_id=? AND EXISTS(SELECT 1 FROM activity_sources WHERE id=? AND token_hash=?)",
              )
              .bind(id, id, hash),
            db
              .prepare(
                "UPDATE github_repositories SET project_slug=?,approved=1,source_id=?,revision=revision+1 WHERE repo_id=? AND revision=? AND EXISTS(SELECT 1 FROM activity_sources WHERE id=? AND token_hash=?)",
              )
              .bind(data.projectSlug, id, data.id, data.revision, id, hash),
          ]);
          return results[2].meta?.changes === 1
            ? ownerJson({ saved: true, expiresAt: iso(until) })
            : ownerError("Source limit or state changed", 409);
        }
        if (
          request.method === "DELETE" &&
          exact(data, ["id", "revision"]) &&
          positiveId(data.id) &&
          Number.isSafeInteger(data.revision)
        ) {
          const results = await db.batch([
            db
              .prepare(
                "UPDATE activity_sources SET revoked=1,public_enabled=0,revision=revision+1 WHERE id IN (SELECT source_id FROM github_repositories WHERE repo_id=? AND revision=?)",
              )
              .bind(data.id, data.revision),
            db
              .prepare(
                "UPDATE github_repositories SET approved=0,revision=revision+1 WHERE repo_id=? AND revision=?",
              )
              .bind(data.id, data.revision),
          ]);
          return results[1].meta?.changes === 1
            ? ownerJson({ revoked: true })
            : ownerError("Repository changed", 409);
        }
        return ownerError("Invalid owner request", 400);
      }
      const deliveryHeader = request.headers.get("X-GitHub-Delivery") || "",
        event = request.headers.get("X-GitHub-Event");
      if (
        !/^[a-f0-9-]{36}$/i.test(deliveryHeader) ||
        !["workflow_run", "installation", "installation_repositories"].includes(
          event,
        )
      )
        return ownerError("Unsupported delivery", 400);
      const p = await readWebhook(request, env.GITHUB_WEBHOOK_SECRET);
      if (
        !p ||
        !positiveId(Number(env.GITHUB_INSTALLATION_ID)) ||
        p.installation?.id !== Number(env.GITHUB_INSTALLATION_ID)
      )
        return ownerError("Webhook authentication required", 401);
      // GitHub delivery headers are not signed. Dedupe authenticated content,
      // so replaying a signed body under another delivery ID remains a no-op.
      const delivery = await digest(event + "\n" + JSON.stringify(p));
      if (event !== "workflow_run") {
        if (
          (event === "installation_repositories" && p.action === "added") ||
          (event === "installation" &&
            ["created", "unsuspend"].includes(p.action))
        ) {
          const repositories = await discoverGithubRepositories(
            env,
            at,
            githubFetch,
          );
          return (await syncInventory(db, repositories, at))
            ? ownerJson({ accepted: true, discovered: repositories.length })
            : ownerError("Repository inventory changed", 409);
        }
        // Lifecycle events can revoke immediately, but never create public sources.
        const removed =
          event === "installation" && ["deleted", "suspend"].includes(p.action)
            ? null
            : event === "installation_repositories" &&
                p.action === "removed" &&
                Array.isArray(p.repositories_removed)
              ? p.repositories_removed.map((r) => r.id)
              : undefined;
        if (removed === undefined)
          return ownerJson({ accepted: true, ignored: true });
        if (
          removed !== null &&
          (removed.length > 500 || removed.some((id) => !positiveId(id)))
        )
          return ownerError("Invalid repository removal", 400);
        const where =
          removed === null
            ? "1=1"
            : "repo_id IN (" +
              (removed.map(() => "?").join(",") || "NULL") +
              ")";
        const nonce = secureRandom(16),
          receipt =
            "EXISTS(SELECT 1 FROM github_deliveries WHERE delivery_id=? AND nonce=?)";
        await db.batch([
          db
            .prepare("DELETE FROM github_deliveries WHERE received_at<=?")
            .bind(at - 7 * 86400000),
          db
            .prepare(
              "INSERT INTO github_deliveries(delivery_id,nonce,received_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM github_deliveries)<10000 ON CONFLICT(delivery_id) DO NOTHING",
            )
            .bind(delivery, nonce, at),
          db
            .prepare(
              "UPDATE activity_sources SET revoked=1,public_enabled=0,revision=revision+1 WHERE id IN (SELECT source_id FROM github_repositories WHERE " +
                where +
                ") AND " +
                receipt,
            )
            .bind(...(removed || []), delivery, nonce),
          db
            .prepare(
              "UPDATE github_repositories SET authorized=0,approved=0,revision=revision+1 WHERE " +
                where +
                " AND " +
                receipt,
            )
            .bind(...(removed || []), delivery, nonce),
        ]);
        return ownerJson({ accepted: true });
      }
      if (!validRepo(p.repository))
        return ownerError("Repository scope unavailable", 400);
      const signal = workflowSignal(p, at);
      if (!signal)
        return ownerError("Stale or unsupported workflow evidence", 400);
      const previous = await db
        .prepare("SELECT * FROM github_repositories WHERE repo_id=?")
        .bind(p.repository.id)
        .first();
      // Discovery through a signed, fresh installed-repo event remains private.
      if (!previous) {
        await db
          .prepare(
            "INSERT INTO github_repositories(repo_id,full_name,default_branch,private,discovered_at,observed_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM github_repositories)<500 ON CONFLICT(repo_id) DO NOTHING",
          )
          .bind(
            p.repository.id,
            p.repository.full_name,
            p.repository.default_branch,
            Number(p.repository.private),
            at,
            signal.observed,
          )
          .run();
        return ownerJson({ accepted: true, discovered: true });
      }
      if (
        previous.full_name !== p.repository.full_name ||
        previous.private !== Number(p.repository.private) ||
        previous.default_branch !== p.repository.default_branch
      ) {
        await db.batch([
          db
            .prepare(
              "UPDATE activity_sources SET revoked=1,public_enabled=0,revision=revision+1 WHERE id=?",
            )
            .bind(previous.source_id),
          db
            .prepare(
              "UPDATE github_repositories SET approved=0,authorized=0,revision=revision+1 WHERE repo_id=?",
            )
            .bind(previous.repo_id),
        ]);
        return ownerError("Repository classification changed", 409);
      }
      const s = await source(db)(previous.source_id);
      if (
        !previous.authorized ||
        !previous.approved ||
        previous.private ||
        !activeSource(s, o, at)
      )
        return ownerJson({ accepted: true, ignored: true });
      const oldRun = await db
        .prepare(
          "SELECT * FROM github_workflow_runs WHERE repo_id=? AND run_id=? AND attempt=?",
        )
        .bind(previous.repo_id, p.workflow_run.id, p.workflow_run.run_attempt)
        .first();
      const task = oldRun
        ? await db
            .prepare("SELECT * FROM activity_tasks WHERE id=?")
            .bind(oldRun.task_id)
            .first()
        : null;
      if (
        oldRun &&
        (oldRun.terminal ||
          signal.observed < oldRun.observed_at ||
          (signal.observed === oldRun.observed_at &&
            signal.rank <= oldRun.rank) ||
          task?.source_id !== s.id)
      )
        return ownerJson({ accepted: true, ignored: true });
      const nonce = secureRandom(16),
        taskId = task?.id || secureRandom(16),
        tokenHash = task?.token_hash || (await digest(secureRandom(32)));
      const receipt =
        "EXISTS(SELECT 1 FROM github_deliveries WHERE delivery_id=? AND nonce=?)";
      const fence =
        "EXISTS(SELECT 1 FROM presence_state WHERE id=1 AND revision=? AND editor_generation=?) AND EXISTS(SELECT 1 FROM activity_sources WHERE id=? AND revision=? AND revoked=0 AND token_until>?) AND EXISTS(SELECT 1 FROM github_repositories WHERE repo_id=? AND revision=? AND authorized=1 AND approved=1 AND private=0)";
      const fenceValues = [
        o.revision,
        o.editor_generation,
        s.id,
        s.revision,
        at,
        previous.repo_id,
        previous.revision,
      ];
      const batch = [
        db
          .prepare(
            "DELETE FROM github_workflow_runs WHERE observed_at<=? OR NOT EXISTS(SELECT 1 FROM activity_tasks WHERE id=github_workflow_runs.task_id AND token_until>?)",
          )
          .bind(at - 86400000, at),
        db
          .prepare("DELETE FROM github_deliveries WHERE received_at<=?")
          .bind(at - 7 * 86400000),
        db
          .prepare(
            "INSERT INTO github_deliveries(delivery_id,nonce,received_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM github_deliveries)<10000 ON CONFLICT(delivery_id) DO NOTHING",
          )
          .bind(delivery, nonce, at),
      ];
      if (task) {
        // A prior async read of the run can be older than the task read. Fence
        // BOTH records in SQL, otherwise delayed in_progress can revive a run
        // that another delivery has already completed.
        const runFence =
          "EXISTS(SELECT 1 FROM github_workflow_runs WHERE repo_id=? AND run_id=? AND attempt=? AND task_id=? AND observed_at=? AND rank=? AND terminal=0)";
        const runValues = [
          previous.repo_id,
          p.workflow_run.id,
          p.workflow_run.run_attempt,
          oldRun.task_id,
          oldRun.observed_at,
          oldRun.rank,
        ];
        batch.push(
          db
            .prepare(
              "UPDATE activity_tasks SET state=?,checkpoint=NULL,observed_at=?,received_at=?,sequence=sequence+1,revision=revision+1 WHERE id=? AND revision=? AND revoked=0 AND token_until>? AND " +
                receipt +
                " AND " +
                fence +
                " AND " +
                runFence,
            )
            .bind(
              signal.state,
              signal.observed,
              at,
              taskId,
              task.revision,
              at,
              delivery,
              nonce,
              ...fenceValues,
              ...runValues,
            ),
        );
        batch.push(
          db
            .prepare(
              "UPDATE github_workflow_runs SET observed_at=?,terminal=?,rank=? WHERE repo_id=? AND run_id=? AND attempt=? AND observed_at<=? AND terminal=0 AND EXISTS(SELECT 1 FROM activity_tasks WHERE id=? AND revision=? AND state=?) AND " +
                receipt +
                " AND " +
                fence +
                " AND " +
                runFence,
            )
            .bind(
              signal.observed,
              signal.terminal,
              signal.rank,
              previous.repo_id,
              p.workflow_run.id,
              p.workflow_run.run_attempt,
              signal.observed,
              taskId,
              task.revision + 1,
              signal.state,
              delivery,
              nonce,
              ...fenceValues,
              ...runValues,
            ),
        );
      } else {
        batch.push(
          db
            .prepare(
              "DELETE FROM activity_tasks WHERE token_until<=? AND source_id IN(SELECT source_id FROM github_repositories)",
            )
            .bind(at),
        );
        batch.push(
          db
            .prepare(
              "INSERT INTO activity_tasks(id,source_id,token_hash,token_until,state,observed_at,received_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM activity_tasks)<64 AND NOT EXISTS(SELECT 1 FROM github_workflow_runs WHERE repo_id=? AND run_id=? AND attempt=?) AND " +
                receipt +
                " AND " +
                fence,
            )
            .bind(
              taskId,
              s.id,
              tokenHash,
              Math.min(at + 86400000, s.token_until),
              signal.state,
              signal.observed,
              at,
              previous.repo_id,
              p.workflow_run.id,
              p.workflow_run.run_attempt,
              delivery,
              nonce,
              ...fenceValues,
            ),
        );
        batch.push(
          db
            .prepare(
              "INSERT INTO github_workflow_runs(repo_id,run_id,attempt,task_id,observed_at,terminal,rank) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM activity_tasks WHERE id=?) AND " +
                receipt +
                " ON CONFLICT(repo_id,run_id,attempt) DO NOTHING",
            )
            .bind(
              previous.repo_id,
              p.workflow_run.id,
              p.workflow_run.run_attempt,
              taskId,
              signal.observed,
              signal.terminal,
              signal.rank,
              taskId,
              delivery,
              nonce,
            ),
        );
      }
      batch.push(
        db
          .prepare(
            "UPDATE github_repositories SET observed_at=? WHERE repo_id=? AND observed_at<=? AND " +
              receipt +
              " AND " +
              fence,
          )
          .bind(
            signal.observed,
            previous.repo_id,
            signal.observed,
            delivery,
            nonce,
            ...fenceValues,
          ),
      );
      await db.batch(batch);
      return ownerJson({ accepted: true });
    } catch {
      return ownerError("GitHub integration unavailable");
    }
  };
}
