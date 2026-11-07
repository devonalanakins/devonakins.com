#!/usr/bin/env node
/** Actual local workerd/D1; signed synthetic events only, no hosted integration. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createGithubIntegration } from "../src/github-integration.mjs";
const { Miniflare, convertV4MiniflareOptions } = await import(
  pathToFileURL(
    resolve(process.env.GPT_MINIFLARE_ROOT, "miniflare/dist/src/index.js"),
  )
);
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default {fetch(){return new Response("fixture")}}',
    compatibilityDate: "2026-10-29",
    d1Databases: { DB: "github-fixture" },
  }),
);
try {
  const db = await mf.getD1Database("DB");
  for (const file of [
    "0002_presence.sql",
    "0003_presence_preferences.sql",
    "0004_editor_pairing.sql",
    "0007_activity_tasks.sql",
    "0010_github_integration.sql",
  ]) {
    const sql = (
      await readFile(new URL("../migrations/" + file, import.meta.url), "utf8")
    ).replace(/^--.*$/gm, "");
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await db.prepare(statement).run();
  }
  let at = Date.parse("2026-11-07T18:00:00Z");
  const secret = "s".repeat(64);
  const env = {
    LISTENING_DB: db,
    PRESENCE_ENABLED: "true",
    GITHUB_INTEGRATION_ENABLED: "true",
    GITHUB_INSTALLATION_ID: "55",
    GITHUB_WEBHOOK_SECRET: secret,
    LISTENING_ACCESS_AUD: "test",
    LISTENING_OWNER_EMAIL: "fixture@example.test",
  };
  const identity = {
    access: {
      aud: "test",
      getIdentity: async () => ({ email: "fixture@example.test" }),
    },
  };
  const api = createGithubIntegration({ clock: () => at });
  await db
    .prepare(
      "INSERT INTO github_repositories(repo_id,full_name,default_branch,private,discovered_at) VALUES(101,'devonalanakins/merit','main',0,?)",
    )
    .bind(at)
    .run();
  const connected = await api(
    new Request("https://example.test/api/presence/owner?channel=github", {
      method: "POST",
      headers: {
        Origin: "https://example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "connect",
        id: 101,
        revision: 0,
        projectSlug: "merit",
        enabled: false,
      }),
    }),
    env,
    identity,
  );
  assert.equal(connected.status, 200);
  const send = async (action, status, conclusion = null) => {
    const data = {
      action,
      installation: { id: 55 },
      repository: {
        id: 101,
        name: "merit",
        full_name: "devonalanakins/merit",
        owner: { login: "devonalanakins" },
        private: false,
        default_branch: "main",
      },
      workflow_run: {
        id: 999,
        run_attempt: 1,
        head_repository: { id: 101 },
        head_branch: "main",
        event: "push",
        status,
        conclusion,
        updated_at: new Date(at).toISOString(),
      },
    };
    const body = JSON.stringify(data),
      key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
    const signature = [
      ...new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
      ),
    ]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    return api(
      new Request("https://example.test/api/activity/github/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Delivery": crypto.randomUUID(),
          "X-GitHub-Event": "workflow_run",
          "X-Hub-Signature-256": "sha256=" + signature,
        },
        body,
      }),
      env,
    );
  };
  assert.deepEqual(
    (
      await Promise.all([
        send("in_progress", "in_progress"),
        send("in_progress", "in_progress"),
      ])
    ).map((r) => r.status),
    [200, 200],
  );
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM activity_tasks").first()).n,
    1,
  );
  at += 1000;
  assert.equal((await send("completed", "completed", "success")).status, 200);
  assert.equal(
    (await db.prepare("SELECT state FROM activity_tasks").first()).state,
    "completed",
  );
  at -= 500;
  assert.equal((await send("in_progress", "in_progress")).status, 200);
  assert.equal(
    (await db.prepare("SELECT state FROM activity_tasks").first()).state,
    "completed",
  );
  assert.equal(
    (await db.prepare("SELECT terminal FROM github_workflow_runs").first())
      .terminal,
    1,
  );
  console.log(
    "Central GitHub real workerd/D1: signed event, concurrent replay, source-scoped task and terminal-state fences passed.",
  );
} finally {
  await mf.dispose();
}
