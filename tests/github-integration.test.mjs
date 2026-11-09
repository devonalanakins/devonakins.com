import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  createGithubIntegration,
  createGithubEditorCatalog,
} from "../src/github-integration.mjs";
import {
  githubAppJwt,
  discoverGithubRepositories,
} from "../src/github-integration-auth.mjs";
import {
  activityTasks,
  createActivityTasksApi,
} from "../src/activity-tasks.mjs";
import { digest } from "../src/listening-crypto.mjs";
const START = Date.parse("2026-11-07T18:00:00.000Z");
const identity = {
  access: {
    aud: "fixture",
    getIdentity: async () => ({ email: "owner@example.test" }),
  },
};
const secret = "a".repeat(64);
const repo = (name = "merit", id = 101, privateRepo = false) => ({
  id,
  name,
  full_name: "devonalanakins/" + name,
  owner: { login: "devonalanakins" },
  private: privateRepo,
  default_branch: "main",
});
function fixture({ githubFetch } = {}) {
  const sql = new DatabaseSync(":memory:");
  for (const file of [
    "0002_presence.sql",
    "0003_presence_preferences.sql",
    "0004_editor_pairing.sql",
    "0007_activity_tasks.sql",
    "0010_github_integration.sql",
  ])
    sql.exec(
      readFileSync(new URL("../migrations/" + file, import.meta.url), "utf8"),
    );
  let at = START,
    hook = null;
  const db = {
    prepare(query) {
      const stmt = sql.prepare(query);
      let values = [];
      return {
        query,
        bind(...v) {
          values = v;
          return this;
        },
        sync() {
          return { meta: { changes: Number(stmt.run(...values).changes) } };
        },
        async run() {
          return this.sync();
        },
        async first() {
          const r = stmt.get(...values) || null;
          if (hook) await hook(query);
          return r;
        },
        async all() {
          const r = { results: stmt.all(...values) };
          if (hook) await hook(query);
          return r;
        },
      };
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const result = statements.map((s) => s.sync());
        sql.exec("COMMIT");
        return result;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const env = {
    PRESENCE_ENABLED: "true",
    PRESENCE_EDITOR_ENABLED: "true",
    GITHUB_INTEGRATION_ENABLED: "true",
    GITHUB_INSTALLATION_ID: "55",
    GITHUB_WEBHOOK_SECRET: secret,
    LISTENING_DB: db,
    LISTENING_ACCESS_AUD: "fixture",
    LISTENING_OWNER_EMAIL: "owner@example.test",
    PRESENCE_PUBLIC_RELEASE_APPROVED: "true",
  };
  const clock = () => at,
    api = createGithubIntegration({ clock, githubFetch }),
    catalog = createGithubEditorCatalog({ clock });
  const admin = (
    body,
    method = "POST",
    ctx = identity,
    origin = "https://devonakins.com",
  ) =>
    api(
      new Request("https://devonakins.com/api/presence/owner?channel=github", {
        method,
        headers: { Origin: origin, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      ctx,
    );
  const install = (r) =>
    sql
      .prepare(
        "INSERT INTO github_repositories(repo_id,full_name,default_branch,private,discovered_at) VALUES(?,?,?,?,?)",
      )
      .run(r.id, r.full_name, r.default_branch, Number(r.private), at);
  const connect = async (r = repo(), enabled = true) => {
    install(r);
    const response = await admin({
      action: "connect",
      id: r.id,
      revision: 0,
      projectSlug: "merit",
      enabled,
    });
    assert.equal(response.status, 200, await response.text());
  };
  const payload = (options = {}) => ({
    action: options.action || "in_progress",
    installation: { id: 55 },
    repository: repo(),
    workflow_run: {
      id: 555,
      run_attempt: 1,
      status: "in_progress",
      conclusion: null,
      event: "push",
      head_branch: "main",
      head_repository: { id: 101 },
      updated_at: new Date(at).toISOString(),
      ...options.run,
    },
    ...options.payload,
  });
  const webhook = async (p, headers = {}) => {
    const body = JSON.stringify(p),
      key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
    const signature = Array.from(
      new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
      ),
      (x) => x.toString(16).padStart(2, "0"),
    ).join("");
    return api(
      new Request("https://devonakins.com/api/activity/github/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Delivery": crypto.randomUUID(),
          "X-GitHub-Event": "workflow_run",
          "X-Hub-Signature-256": "sha256=" + signature,
          ...headers,
        },
        body,
      }),
      env,
    );
  };
  return {
    sql,
    db,
    env,
    clock,
    api,
    admin,
    install,
    connect,
    payload,
    webhook,
    catalog,
    advance: (ms) => {
      at += ms;
    },
    hook: (fn) => {
      hook = fn;
    },
  };
}
test("owner readiness requires Access and mutation origin; discovery is not approval or connection", async () => {
  const f = fixture();
  assert.equal((await f.admin(null, "GET", {})).status, 403);
  assert.equal(
    (
      await f.admin(
        { action: "discover" },
        "POST",
        identity,
        "https://evil.test",
      )
    ).status,
    403,
  );
  assert.equal((await f.webhook(f.payload())).status, 200);
  const data = await (await f.admin(null, "GET")).json();
  assert.equal(data.repositories[0].recognizedProject, "merit");
  assert.equal(data.repositories[0].approved, false);
  assert.equal(data.repositories[0].connected, false);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    0,
  );
  assert.match(
    (await f.admin(null, "GET")).headers.get("Cache-Control"),
    /private.*no-store/,
  );
  f.env.GITHUB_INTEGRATION_ENABLED = "false";
  assert.equal((await f.webhook(f.payload())).status, 404);
});
test("signed workflow evidence enters concurrent source scoped V4, with no provider text or identifiers", async () => {
  const f = fixture();
  await f.connect();
  f.sql.exec("UPDATE presence_state SET public_enabled=1");
  const p = f.payload();
  p.workflow_run.display_title = "PRIVATE";
  p.workflow_run.head_commit = { message: "SECRET" };
  assert.equal((await f.webhook(p)).status, 200);
  const tasks = await activityTasks(f.env, f.clock());
  assert.equal(tasks.tasks.length, 1);
  assert.equal(tasks.tasks[0].project, "Merit");
  assert.equal(tasks.tasks[0].source, "github-actions");
  assert.ok(!JSON.stringify(tasks).includes("SECRET"));
  assert.ok(!JSON.stringify(tasks).includes("555"));
  assert.ok(!JSON.stringify(tasks).includes("PRIVATE"));
  f.advance(30000);
  assert.equal(
    (
      await f.webhook(
        f.payload({
          action: "completed",
          run: { status: "completed", conclusion: "failure" },
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await activityTasks(f.env, f.clock())).tasks[0].state,
    "failed",
  );
  f.advance(30000);
  assert.equal((await f.webhook(f.payload())).status, 200);
  assert.equal(
    (await activityTasks(f.env, f.clock())).tasks[0].state,
    "failed",
  );
  f.advance(120000);
  assert.equal((await activityTasks(f.env, f.clock())).tasks.length, 0);
});
test("signature tampering, installation spoofing, stale evidence, fork/PR/nondefault-branch runs fail closed", async () => {
  const f = fixture();
  await f.connect();
  assert.equal(
    (
      await f.webhook(f.payload(), {
        "X-Hub-Signature-256": "sha256=" + "0".repeat(64),
      })
    ).status,
    401,
  );
  assert.equal(
    (await f.webhook(f.payload({ payload: { installation: { id: 99 } } })))
      .status,
    401,
  );
  for (const run of [
    { updated_at: new Date(START - 120000).toISOString() },
    { updated_at: new Date(START + 11000).toISOString() },
    { head_repository: { id: 99 } },
    { event: "pull_request" },
    { head_branch: "feature" },
  ])
    assert.equal((await f.webhook(f.payload({ run }))).status, 400);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    0,
  );
});
test("delivery id changes cannot replay an authenticated body; concurrent first deliveries create one task", async () => {
  const f = fixture();
  await f.connect();
  const p = f.payload();
  const responses = await Promise.all([
    f.webhook(p),
    f.webhook(p),
    f.webhook({
      ...p,
      workflow_run: { ...p.workflow_run, display_title: "ignored" },
    }),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200, 200],
  );
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    1,
  );
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM github_workflow_runs").get().n,
    1,
  );
  const revision = f.sql
    .prepare("SELECT revision FROM activity_tasks")
    .get().revision;
  await f.webhook(p);
  assert.equal(
    f.sql.prepare("SELECT revision FROM activity_tasks").get().revision,
    revision,
  );
});
test("independent runs and attempts stay distinct; old waiting cannot downgrade a running signal", async () => {
  const f = fixture();
  await f.connect();
  await f.webhook(f.payload());
  await f.webhook(
    f.payload({ action: "requested", run: { status: "queued" } }),
  );
  assert.equal(
    f.sql.prepare("SELECT state FROM activity_tasks").get().state,
    "running",
  );
  await f.webhook(f.payload({ run: { id: 556 } }));
  await f.webhook(f.payload({ run: { run_attempt: 2 } }));
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    3,
  );
});
test("private repos, wrong owner, classifications, source revocation and Stop all cannot publish", async () => {
  const f = fixture();
  const r = repo("client-work", 202, true);
  f.install(r);
  assert.equal(
    (
      await f.admin({
        action: "connect",
        id: 202,
        revision: 0,
        projectSlug: "merit",
        enabled: true,
      })
    ).status,
    409,
  );
  await f.connect();
  f.sql.exec("UPDATE presence_state SET public_enabled=1");
  await f.webhook(f.payload());
  await f.admin({ id: 101, revision: 1 }, "DELETE");
  assert.equal((await activityTasks(f.env, f.clock())).tasks.length, 0);
  assert.equal((await f.webhook(f.payload())).status, 200);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    1,
  );
  f.sql.exec(
    "UPDATE presence_state SET editor_generation=editor_generation+1,revision=revision+1",
  );
  assert.equal((await f.webhook(f.payload({ run: { id: 1000 } }))).status, 200);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    1,
  );
  const changed = f.payload({
    payload: { repository: { ...repo(), private: true } },
  });
  assert.equal((await f.webhook(changed)).status, 409);
  assert.equal(
    f.sql
      .prepare("SELECT authorized FROM github_repositories WHERE repo_id=101")
      .get().authorized,
    0,
  );
});
test("catalog requires paired bearer, includes approved static projects and private-default dynamic discoveries", async () => {
  const f = fixture(),
    token = "b".repeat(43);
  const request = () =>
    new Request("https://devonakins.com/api/presence/editor/catalog", {
      headers: { Authorization: "Bearer " + token },
    });
  assert.equal((await f.catalog(request(), f.env)).status, 401);
  f.sql
    .prepare("UPDATE presence_editor SET token_hash=?,token_until=? WHERE id=1")
    .run(await digest(token), START + 3600000);
  f.install(repo("new-research", 203));
  f.install(repo("private-client", 204, true));
  let data = await (await f.catalog(request(), f.env)).json();
  assert.equal(data.repositories.length, 9);
  assert.equal(
    data.repositories.find((r) => r.name === "anevum-web").projectSlug,
    "anevum",
  );
  assert.ok(!JSON.stringify(data).includes("private-client"));
  f.sql.exec(
    "UPDATE github_repositories SET approved=1,project_slug='merit' WHERE repo_id=203",
  );
  data = await (await f.catalog(request(), f.env)).json();
  assert.equal(data.repositories.length, 10);
  assert.equal(Date.parse(data.expiresAt), START + 300000);
  f.sql.exec(
    "UPDATE presence_state SET public_projects_json='[\"rhen\"]',revision=revision+1",
  );
  data = await (await f.catalog(request(), f.env)).json();
  assert.deepEqual(data.repositories, [
    { owner: "devonalanakins", name: "rhen", projectSlug: "rhen" },
  ]);
  f.sql.exec("UPDATE presence_state SET editor_generation=editor_generation+1");
  assert.equal((await f.catalog(request(), f.env)).status, 401);
});
test("catalog refuses a repository permission revocation during asynchronous reads", async () => {
  const f = fixture(),
    token = "b".repeat(43);
  f.sql
    .prepare("UPDATE presence_editor SET token_hash=?,token_until=? WHERE id=1")
    .run(await digest(token), START + 3600000);
  f.install(repo("new-research", 203));
  f.sql.exec(
    "UPDATE github_repositories SET approved=1,project_slug='merit' WHERE repo_id=203",
  );
  let changed = false;
  f.hook((q) => {
    if (
      !changed &&
      q.startsWith("SELECT * FROM github_repositories ORDER BY")
    ) {
      changed = true;
      f.sql.exec(
        "UPDATE github_repositories SET approved=0,revision=revision+1 WHERE repo_id=203",
      );
    }
  });
  assert.equal(
    (
      await f.catalog(
        new Request("https://devonakins.com/api/presence/editor/catalog", {
          headers: { Authorization: "Bearer " + token },
        }),
        f.env,
      )
    ).status,
    409,
  );
  assert.equal(changed, true);
});
test("App JWT is RS256, bounded, and discovery requests selected installation metadata/actions read only", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const env = {
    GITHUB_APP_ID: "123",
    GITHUB_INSTALLATION_ID: "55",
    GITHUB_APP_PRIVATE_KEY: privateKey.export({ format: "pem", type: "pkcs8" }),
  };
  const jwt = await githubAppJwt(env, START),
    parts = jwt.split(".");
  assert.equal(
    verify(
      "RSA-SHA256",
      Buffer.from(parts.slice(0, 2).join(".")),
      publicKey,
      Buffer.from(parts[2], "base64url"),
    ),
    true,
  );
  const claims = JSON.parse(Buffer.from(parts[1], "base64url"));
  assert.equal(claims.exp - claims.iat, 600);
  assert.equal(claims.iss, "123");
  const calls = [];
  const result = await discoverGithubRepositories(
    env,
    START,
    async (url, init) => {
      calls.push({ url, init });
      if (calls.length === 1)
        return Response.json({
          id: 55,
          account: { login: "devonalanakins" },
          suspended_at: null,
        });
      if (calls.length === 2)
        return Response.json({
          token: "ghs_test123",
          expires_at: new Date(START + 3600000).toISOString(),
        });
      return Response.json({ total_count: 1, repositories: [repo()] });
    },
  );
  assert.equal(result.length, 1);
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    permissions: { metadata: "read", actions: "read" },
  });
  assert.ok(calls.every((c) => c.init.redirect === "error"));
  assert.ok(calls.every((c) => c.url.startsWith("https://api.github.com/")));
});
test("repository sync is atomic, preserves publication choices, revokes removed/renamed metadata, and keeps new repos private", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let repositories = [repo(), repo("client-work", 202, true)];
  const f = fixture({
    githubFetch: async (url) =>
      url.endsWith("/55")
        ? Response.json({ id: 55, account: { login: "devonalanakins" } })
        : url.endsWith("/access_tokens")
          ? Response.json({
              token: "ghs_test123",
              expires_at: new Date(START + 3600000).toISOString(),
            })
          : Response.json({ total_count: repositories.length, repositories }),
  });
  Object.assign(f.env, {
    GITHUB_APP_ID: "123",
    GITHUB_APP_PRIVATE_KEY: privateKey.export({ format: "pem", type: "pkcs8" }),
  });
  assert.equal((await f.admin({ action: "discover" })).status, 200);
  let data = await (await f.admin(null, "GET")).json();
  assert.equal(data.repositories.length, 2);
  assert.equal(
    data.repositories.every((r) => !r.approved && !r.connected),
    true,
  );
  assert.equal(
    (
      await f.admin({
        action: "connect",
        id: 101,
        revision: 0,
        projectSlug: "merit",
        enabled: true,
      })
    ).status,
    200,
  );
  assert.equal((await f.admin({ action: "discover" })).status, 200);
  assert.equal(
    f.sql
      .prepare("SELECT approved FROM github_repositories WHERE repo_id=101")
      .get().approved,
    1,
  );
  repositories = [repo("renamed-merit", 101), repo("new-project", 203)];
  assert.equal((await f.admin({ action: "discover" })).status, 200);
  assert.equal(
    f.sql
      .prepare("SELECT approved FROM github_repositories WHERE repo_id=101")
      .get().approved,
    0,
  );
  assert.equal(
    f.sql.prepare("SELECT revoked FROM activity_sources").get().revoked,
    1,
  );
  assert.equal(
    f.sql
      .prepare("SELECT authorized FROM github_repositories WHERE repo_id=202")
      .get().authorized,
    0,
  );
  assert.equal(
    f.sql
      .prepare("SELECT approved FROM github_repositories WHERE repo_id=203")
      .get().approved,
    0,
  );
  const before = f.sql
    .prepare("SELECT discovered_at FROM github_integration_state")
    .get().discovered_at;
  repositories = [{ ...repo(), owner: { login: "attacker" } }];
  assert.equal((await f.admin({ action: "discover" })).status, 503);
  assert.equal(
    f.sql.prepare("SELECT discovered_at FROM github_integration_state").get()
      .discovered_at,
    before,
  );
});
test("a database failure midway through discovery rolls back inventory and health together", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const f = fixture({
    githubFetch: async (url) =>
      url.endsWith("/55")
        ? Response.json({ id: 55, account: { login: "devonalanakins" } })
        : url.endsWith("/access_tokens")
          ? Response.json({
              token: "ghs_test123",
              expires_at: new Date(START + 3600000).toISOString(),
            })
          : Response.json({
              total_count: 2,
              repositories: [repo(), repo("new-repo", 202)],
            }),
  });
  Object.assign(f.env, {
    GITHUB_APP_ID: "123",
    GITHUB_APP_PRIVATE_KEY: privateKey.export({ format: "pem", type: "pkcs8" }),
  });
  f.sql.exec(
    "CREATE TRIGGER reject_repo BEFORE INSERT ON github_repositories WHEN NEW.repo_id=202 BEGIN SELECT RAISE(ABORT,'fixture');END",
  );
  assert.equal((await f.admin({ action: "discover" })).status, 503);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM github_repositories").get().n,
    0,
  );
  assert.equal(
    f.sql.prepare("SELECT revision FROM github_integration_state").get()
      .revision,
    0,
  );
});
test("renewal reuses source capacity without relabeling previous tasks; live stop fences delayed webhook writes", async () => {
  const f = fixture();
  await f.connect();
  await f.webhook(f.payload());
  assert.equal(
    (
      await f.admin({
        action: "connect",
        id: 101,
        revision: 1,
        projectSlug: "rhen",
        enabled: false,
      })
    ).status,
    200,
  );
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_sources").get().n,
    1,
  );
  assert.equal(
    f.sql.prepare("SELECT revoked FROM activity_tasks").get().revoked,
    1,
  );
  let changed = false;
  f.hook((q) => {
    if (!changed && q === "SELECT * FROM activity_sources WHERE id=?") {
      changed = true;
      f.sql.exec(
        "UPDATE presence_state SET editor_generation=editor_generation+1,revision=revision+1",
      );
    }
  });
  assert.equal((await f.webhook(f.payload({ run: { id: 777 } }))).status, 200);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    1,
  );
});
test("owner page is protected, no-store, and independent from whether the App is configured", async () => {
  const f = fixture();
  f.env.GITHUB_INTEGRATION_ENABLED = "false";
  const req = () => new Request("https://devonakins.com/owner/github/");
  assert.equal((await f.api(req(), f.env, {})).status, 403);
  const response = await f.api(req(), f.env, identity);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control"), /private.*no-store/);
  assert.match(await response.text(), /Repository inventory/);
});
test("legacy V4 ephemeral cleanup remains compatible with central inventory and run links", async () => {
  const f = fixture();
  await f.connect();
  await f.webhook(f.payload());
  await f.admin({ id: 101, revision: 1 }, "DELETE");
  const api = createActivityTasksApi({ clock: f.clock });
  const response = await api(
    new Request("https://devonakins.com/api/presence/owner?channel=tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://devonakins.com",
      },
      body: JSON.stringify({
        action: "connect",
        source: "codex",
        projectSlug: "rhen",
      }),
    }),
    f.env,
    identity,
  );
  assert.equal(response.status, 200);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_sources").get().n,
    1,
  );
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM activity_tasks").get().n,
    0,
  );
  assert.equal(
    (await (await f.admin(null, "GET")).json()).repositories[0].connected,
    false,
  );
});
test("known-private built-in repository is omitted from the paired-editor catalog", async () => {
  const f = fixture(),
    token = "b".repeat(43);
  f.install(repo("merit", 101, true));
  f.sql
    .prepare("UPDATE presence_editor SET token_hash=?,token_until=? WHERE id=1")
    .run(await digest(token), START + 3600000);
  const data = await (
    await f.catalog(
      new Request("https://devonakins.com/api/presence/editor/catalog", {
        headers: { Authorization: "Bearer " + token },
      }),
      f.env,
    )
  ).json();
  assert.ok(!data.repositories.some((r) => r.name === "merit"));
  assert.equal(data.repositories.length, 8);
});

test("an older concurrent running callback cannot revive an already completed workflow", async () => {
  const f = fixture();
  await f.connect();
  await f.webhook(
    f.payload({ action: "requested", run: { status: "queued" } }),
  );
  f.advance(1000);
  const older = f.payload();
  let delivered = false;
  f.hook(async (query) => {
    if (
      !delivered &&
      query.startsWith("SELECT * FROM github_workflow_runs WHERE repo_id=")
    ) {
      delivered = true;
      f.advance(1000);
      assert.equal(
        (
          await f.webhook(
            f.payload({
              action: "completed",
              run: { status: "completed", conclusion: "success" },
            }),
          )
        ).status,
        200,
      );
    }
  });
  assert.equal((await f.webhook(older)).status, 200);
  const task = f.sql
    .prepare("SELECT state,observed_at FROM activity_tasks")
    .get();
  const run = f.sql
    .prepare("SELECT terminal,observed_at FROM github_workflow_runs")
    .get();
  assert.equal(task.state, "completed");
  assert.equal(run.terminal, 1);
  assert.equal(task.observed_at, run.observed_at);
});
test("discovering a known public repository still requires explicit classification for the editor", async () => {
  const f = fixture(),
    token = "b".repeat(43);
  f.install(repo());
  f.sql
    .prepare("UPDATE presence_editor SET token_hash=?,token_until=? WHERE id=1")
    .run(await digest(token), START + 3600000);
  const request = () =>
    new Request("https://devonakins.com/api/presence/editor/catalog", {
      headers: { Authorization: "Bearer " + token },
    });
  let result = await (await f.catalog(request(), f.env)).json();
  assert.ok(!result.repositories.some((r) => r.name === "merit"));
  await f.admin({
    action: "connect",
    id: 101,
    revision: 0,
    projectSlug: "merit",
    enabled: false,
  });
  result = await (await f.catalog(request(), f.env)).json();
  assert.ok(result.repositories.some((r) => r.name === "merit"));
});
test("actual Worker routing protects inventory and exposes only authenticated editor catalog", async () => {
  const { createHandler } = await import("../src/worker.mjs");
  const f = fixture();
  f.env.GITHUB_INTEGRATION_ENABLED = "false";
  const app = createHandler(
    {},
    { version: "fixture" },
    { now: () => new Date(START) },
  );
  for (const path of ["/owner/github/", "/api/presence/owner?channel=github"]) {
    assert.equal(
      (await app.fetch(new Request("https://devonakins.com" + path), f.env, {}))
        .status,
      403,
    );
    const allowed = await app.fetch(
      new Request("https://devonakins.com" + path),
      f.env,
      identity,
    );
    assert.equal(allowed.status, 200);
    assert.match(allowed.headers.get("Cache-Control"), /no-store/);
  }
  assert.equal(
    (
      await app.fetch(
        new Request("https://devonakins.com/api/activity/github/webhook", {
          method: "POST",
        }),
        f.env,
        {},
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await app.fetch(
        new Request("https://devonakins.com/api/presence/editor/catalog"),
        f.env,
        {},
      )
    ).status,
    401,
  );
});
