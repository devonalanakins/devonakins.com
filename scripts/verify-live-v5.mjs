#!/usr/bin/env node
/**
 * Independent read-only production acceptance for an explicitly released
 * Living Mind V5. A green build is not deployment proof: health must serve
 * the exact commit, the public V5 routes must be real, and the V4 opt-in
 * source/privacy contracts and legacy functional routes must survive.
 *
 * Does not connect accounts, expose private records, or grant permissions.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { V5_PUBLIC_ROUTES } from "../src/v5/public-routes.mjs";
import { publicNotes } from "../src/v5/public-notes.mjs";
import { projects } from "../src/content.mjs";

export const v5ReleaseRoutes = Object.freeze([
  ...Object.values(V5_PUBLIC_ROUTES),
  ...publicNotes.map(note => "/knowledge/" + note.slug + "/"),
  ...projects.map(project => "/work/" + project.slug + "/"),
]);
const legacyRoutes = Object.freeze(["/studio/", "/listening/", "/gpt/", "/contact/", "/source/"]);
const delay = ms => new Promise(r => setTimeout(r, ms));

export async function verifyV5Production({
  origin = "https://devonakins.com",
  release,
  expectedCommit,
  fetchImpl = fetch,
  attempts = 10,
  pause = delay,
} = {}) {
  assert.match(expectedCommit || "", /^[a-f0-9]{40}$/, "Exact expected release commit required");
  assert.equal(release?.commit, expectedCommit, "Built Worker artifact must match release SHA");
  assert.match(release?.version || "", /^\d+\.\d+\.\d+$/, "Built Worker version required");
  assert.equal(v5ReleaseRoutes.length, 22, "Do not silently add new repositories to the V5 cutover");
  const endpoint = origin.replace(/\/+$/, "");
  assert.match(endpoint, /^https:\/\/[a-z0-9.-]+$/i, "HTTPS origin required");
  const get = (path, init = {}) => fetchImpl(endpoint + path, {
    cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15000), ...init,
  });
  let serving = false;
  for (let i = 0; i < attempts; i++) {
    try {
      const h = await get("/_health");
      if (h.status === 200) {
        const json = await h.json();
        if (json.commit === expectedCommit && json.version === release.version) {
          serving = true;
          break;
        }
      }
    } catch {}
    if (i + 1 < attempts) await pause(4000);
  }
  assert.ok(serving, "Cloudflare is not serving the exact V5 release SHA and version");

  for (const path of v5ReleaseRoutes) {
    const response = await get(path);
    assert.equal(response.status, 200, "V5 route unavailable: " + path);
    assert.match(response.headers.get("content-type") || "", /text\/html/i, path);
    assert.match(response.headers.get("content-security-policy") || "",
      /frame-ancestors 'none'/i, path + " must retain frame protection");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
    const html = await response.text();
    assert.match(html, /data-v5-signal-mode="released-v5"/, "V5 release marker missing: " + path);
    assert.doesNotMatch(html, /__v5_preview__|DESIGN PREVIEW|noindex/i,
      "Preview content leaked into public V5: " + path);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, path + " semantic title");
    if (path === "/") {
      assert.match(html, /data-v5-exact-reference="2026-11-07"/, "Owner-approved hero missing");
      assert.match(html, /v5-locked-portrait/, "Approved portrait missing");
      assert.match(html, /data-v5-work-summary/, "Source-qualified work state missing");
      assert.match(html, /rel="canonical" href="https:\/\/devonakins\.com\/"/);
    }
    if (path === "/work/vesper/") {
      assert.doesNotMatch(html,
        /href="https:\/\/github\.com\/devonalanakins\/vesper(?:["\/?#])/,
        "Private Vesper source link must not ship in V5");
    }
    if (path === "/signal-field/") {
      assert.match(html, /data-v5-atlas-revision="8"/, "Approved historical graph missing");
      assert.match(html, /data-v5-atlas-node-id="publication:mizvo\/public-portfolio-source"/);
      assert.match(response.headers.get("cache-control") || "", /no-store/i);
    }
  }
  for (const path of legacyRoutes) {
    const response = await get(path);
    assert.equal(response.status, 200, "Working V4 route was lost: " + path);
    assert.match(response.headers.get("content-type") || "", /text\/html/i, path);
  }
  for (const [day, revision] of [["2026-11-03", "0"], ["2026-11-06", "8"]]) {
    const response = await get("/signal-field/?asOf=" + day);
    assert.equal(response.status, 200, "Dated archive route " + day);
    assert.match(response.headers.get("cache-control") || "", /no-store/i);
    assert.match(response.headers.get("content-security-policy") || "",
      /form-action 'self'/i);
    const body = await response.text();
    assert.ok(body.includes('value="' + day + '"'), "UTC archive date mismatch");
    assert.ok(body.includes('data-v5-atlas-revision="' + revision + '"'),
      "History revision mismatch on " + day);
  }
  assert.equal((await get("/__v5_preview__/")).status, 404,
    "Development preview must remain fenced from production");
  assert.equal((await get("/signal-field/", {method:"POST"})).status, 405,
    "Public date replay must be read-only");
  const head = await get("/signal-field/", {method:"HEAD"});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "", "HEAD must not return a document body");

  const source = await get("/api/activity/v4");
  assert.equal(source.status, 200, "Consent-filtered V4 source must remain available");
  assert.match(source.headers.get("cache-control") || "", /no-store/i);
  const packet = await source.json();
  assert.equal(packet?.version, 4);
  assert.ok(["hidden", "public"].includes(packet.work?.visibility));
  assert.ok(["hidden", "public"].includes(packet.remote?.visibility));
  assert.ok(Array.isArray(packet.remote?.tasks) && packet.remote.tasks.length <= 16);
  if (packet.remote.visibility === "hidden") assert.deepEqual(packet.remote.tasks, []);
  assert.ok(!packet.remote.tasks.some(task => task?.project === "Vesper"),
    "Private Vesper work cannot be included in the public task projection");
  assert.doesNotMatch(JSON.stringify(packet),
    /refresh_cipher|access_token|client_secret|oauth_verifier|private_client/i,
    "Public API must not contain credential or private source material");

  return { commit: expectedCommit, version: release.version,
    v5Routes: v5ReleaseRoutes.length, legacyRoutes: legacyRoutes.length,
    source: "existing consent-filtered V4 public snapshot" };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const release = JSON.parse(await readFile(
      new URL("../.release/release.json", import.meta.url), "utf8"));
    const result = await verifyV5Production({
      release, expectedCommit: process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA,
      origin: process.env.VERIFY_ORIGIN || "https://devonakins.com",
    });
    console.log("Verified deployed Living Mind V5 at " + result.commit +
      " (" + result.v5Routes + " reviewed routes; optional sources remain consent-gated).");
  } catch (error) {
    console.error("V5 exact-commit production acceptance failed: " + error.message);
    process.exitCode = 1;
  }
}
