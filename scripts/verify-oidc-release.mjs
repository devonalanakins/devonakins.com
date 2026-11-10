#!/usr/bin/env node
/** Read-only proof that the public OIDC feature gate matches the reviewed
 * protected deployment. Never request a JWT or create an activity task. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RECEIVER = "https://devonakins.com/api/activity/tasks/github-oidc-start";

export async function verifyOidcRelease({
  env = process.env,
  fetcher = fetch,
  read = readFile,
} = {}) {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!/^[a-f0-9]{32}$/.test(account || "") || !token)
    throw Error("Dedicated production read credentials required");
  const text = await read("wrangler.deploy.jsonc", "utf8");
  const config = JSON.parse(text.replace(/,\s*([}\]])/g, "$1"));
  const expected = config.vars?.GITHUB_OIDC_ACTIVITY_ENABLED;
  if (!["true", "false"].includes(expected) ||
      config.name !== "devonakins-personal" ||
      config.d1_databases?.length !== 1 ||
      config.d1_databases[0].binding !== "LISTENING_DB")
    throw Error("Reviewed release configuration unavailable");
  if (env.GITHUB_OIDC_ACTION === "enable" && expected !== "true" ||
      env.GITHUB_OIDC_ACTION === "disable" && expected !== "false")
    throw Error("Selected receiver action does not match release configuration");

  async function get(path) {
    const response = await fetcher(
      "https://api.cloudflare.com/client/v4/accounts/" + account + path, {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
    if (!response.ok) throw Error("Cloudflare deployment read rejected");
    const data = await response.json();
    if (data?.success !== true || !data.result)
      throw Error("Cloudflare deployment read unavailable");
    return data.result;
  }
  const script = "/workers/scripts/devonakins-personal";
  const deployments = await get(script + "/deployments");
  const deployed = deployments?.deployments?.[0];
  if (deployed?.versions?.length !== 1 || deployed.versions[0].percentage !== 100)
    throw Error("Production Worker version split");
  const version = await get(script + "/versions/" + deployed.versions[0].version_id);
  if (version.id !== deployed.versions[0].version_id)
    throw Error("Wrong serving Worker version");
  const bindings = version.resources?.bindings;
  if (!Array.isArray(bindings) ||
      !bindings.some(b => b.type === "secret_text" && b.name === "LISTENING_TOKEN_KEY") ||
      bindings.filter(b => b.type === "d1").length !== 1 ||
      !bindings.some(b => b.type === "d1" && b.name === "LISTENING_DB" &&
        b.id === config.d1_databases[0].database_id))
    throw Error("Production security bindings differ");
  const actual = Object.fromEntries(bindings
    .filter(b => b.type === "plain_text").map(b => [b.name, b.text]));
  // Strictly compare all owner-approved plain-text variables without logging them.
  assert.deepEqual(actual, config.vars,
    "Production release flags and private configuration differ");
  const response = await fetcher(RECEIVER, {
    method: "POST",
    redirect: "error",
    credentials: "omit",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ version: 1, projectSlug: "devonakins-com" }),
    signal: AbortSignal.timeout(10000),
  });
  // Authentication must fail even when the receiver is enabled. A missing
  // feature intentionally looks like 404 to anonymous clients.
  assert.equal(response.status, expected === "true" ? 401 : 404,
    "Unsigned request must fail closed under the selected production gate");
  return { enabled: expected === "true", unsignedDenied: true };
}
if (process.argv[1] &&
    fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  verifyOidcRelease().then(result => {
    console.log("Verified signed receiver gate: " +
      (result.enabled ? "enabled" : "disabled") +
      "; unsigned task creation denied.");
  }).catch(() => {
    // No private values or raw provider responses leave GitHub Actions.
    console.error("Production signed receiver gate verification failed.");
    process.exitCode = 1;
  });
}
