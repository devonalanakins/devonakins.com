import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  validGithubActivityClaims,
  verifyGithubActionsIdentity,
  GITHUB_ACTIVITY_AUDIENCE,
} from "../src/github-actions-oidc.mjs";

const subtle = webcrypto.subtle;
const time = Date.parse("2026-11-10T15:00:00.000Z");
const nowSec = Math.floor(time / 1000);
const commit = "a".repeat(40);
const claims = () => ({
  iss: "https://token.actions.githubusercontent.com",
  aud: GITHUB_ACTIVITY_AUDIENCE,
  sub: "repository_id:1439132762:repository_owner_id:324676006:ref:refs/heads/main",
  jti: "unique-test-oidc-request",
  repository: "devonalanakins/devonakins.com",
  repository_id: "1439132762",
  repository_owner_id: "324676006",
  repository_visibility: "public",
  ref: "refs/heads/main",
  ref_type: "branch",
  event_name: "push",
  workflow_ref: "devonalanakins/devonakins.com/.github/workflows/verify.yml@refs/heads/main",
  runner_environment: "github-hosted",
  sha: commit,
  run_id: "42837407732",
  iat: nowSec - 20,
  nbf: nowSec - 20,
  exp: nowSec + 300,
});
const to64 = v => Buffer.from(JSON.stringify(v)).toString("base64url");
const signature64 = bytes => Buffer.from(new Uint8Array(bytes)).toString("base64url");

const fixture = async () => {
  const kp = await subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"],
  );
  const jwk = await subtle.exportKey("jwk", kp.publicKey);
  const issue = async (payload = claims(), { kid = "kid-test" } = {}) => {
    const content = to64({ alg: "RS256", typ: "JWT", kid }) + "." + to64(payload);
    const sig = await subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, Buffer.from(content));
    return content + "." + signature64(sig);
  };
  return { issue, jwk: { kid: "kid-test", kty: "RSA", alg: "RS256",
    use: "sig", n: jwk.n, e: jwk.e } };
};
const githubRun = () => ({
  id: 42837407732,
  status: "in_progress",
  event: "push",
  head_branch: "main",
  head_sha: commit,
  path: ".github/workflows/verify.yml",
  name: "Verify website",
  repository: { id: 1439132762 },
});
function provider(key, run = githubRun(), opts = {}) {
  const requested = [];
  const fetcher = async (url, options) => {
    requested.push({ url, method: options?.method });
    if (opts.providerFailure) throw Error("synthetic upstream outage: PRIVATE");
    if (url === "https://token.actions.githubusercontent.com/.well-known/jwks")
      return Response.json({ keys: opts.keys ?? [key] });
    if (String(url).endsWith("/42837407732"))
      return Response.json(run);
    throw Error("Unexpected provider URL");
  };
  return { fetcher, requested };
}

test("real RSA signature with immutable repository claims authenticates only running GitHub workflow", async () => {
  const f = await fixture();
  const issued = await f.issue();
  assert.equal(validGithubActivityClaims(claims(), time), true);
  const p = provider(f.jwk);
  const verified = await verifyGithubActionsIdentity(issued, {
    fetcher: p.fetcher, clock: () => time,
  });
  assert.deepEqual(verified, { projectSlug: "devonakins-com" });
  assert.deepEqual(p.requested.map(x => x.method), ["GET", "GET"]);
  assert.ok(p.requested.every(x => !JSON.stringify(x).includes(issued)));
  assert.equal(Object.isFrozen(verified), true);
});

test("untrusted OIDC claims fail before any provider request", async () => {
  const f = await fixture();
  const invalid = [
    { aud: "https://attacker.invalid" },
    { iss: "https://attacker.invalid" },
    { repository: "devonalanakins/private-client" },
    { repository_id: "9876543210" },
    { repository_owner_id: "9876543210" },
    { repository_visibility: "private" },
    { ref: "refs/heads/feature" },
    { ref_type: "tag" },
    { event_name: "pull_request" },
    { workflow_ref: "devonalanakins/devonakins.com/.github/workflows/other.yml@refs/heads/main" },
    { runner_environment: "self-hosted" },
    { sha: "z".repeat(40) },
    { run_id: "bad" },
    { exp: nowSec - 1 },
    { nbf: nowSec + 100 },
    { iat: nowSec - 1000 },
    { sub: null },
    { jti: null },
  ];
  for (const override of invalid) {
    const payload = { ...claims(), ...override };
    assert.equal(validGithubActivityClaims(payload, time), false, JSON.stringify(override));
    const p = provider(f.jwk);
    assert.equal(await verifyGithubActionsIdentity(await f.issue(payload), {
      fetcher: p.fetcher, clock: () => time,
    }), null);
    assert.equal(p.requested.length, 0);
  }
});

test("valid-looking payload with modified bytes is rejected by RSA verification", async () => {
  const f = await fixture();
  const issued = await f.issue();
  const [header, , signature] = issued.split(".");
  const modified = header + "." + to64({ ...claims(), jti: "different-jti" }) + "." + signature;
  const p = provider(f.jwk);
  assert.equal(await verifyGithubActionsIdentity(modified, {
    fetcher: p.fetcher, clock: () => time,
  }), null);
  assert.equal(p.requested.length, 1, "tampered JWT never reaches live workflow verification");
});

test("run must still be running, on the expected SHA and exact workflow", async () => {
  const f = await fixture();
  const token = await f.issue();
  for (const run of [
    { ...githubRun(), status: "completed" },
    { ...githubRun(), status: "queued" },
    { ...githubRun(), event: "pull_request" },
    { ...githubRun(), path: ".github/workflows/publish.yml" },
    { ...githubRun(), head_sha: "b".repeat(40) },
    { ...githubRun(), repository: { id: 111111111 } },
    { ...githubRun(), name: "other workflow" },
  ]) {
    const p = provider(f.jwk, run);
    assert.equal(await verifyGithubActionsIdentity(token, {
      fetcher: p.fetcher, clock: () => time,
    }), null);
  }
});

test("wrong key, missing kid and provider outage are never considered active source", async () => {
  const f = await fixture();
  const token = await f.issue();
  const different = await fixture();
  for (const p of [
    provider(different.jwk),
    provider(f.jwk, githubRun(), { keys: [] }),
    provider(f.jwk, githubRun(), { providerFailure: true }),
  ]) {
    assert.equal(await verifyGithubActionsIdentity(token, {
      fetcher: p.fetcher, clock: () => time,
    }), null);
  }
  const p = provider(f.jwk);
  for (const bad of ["", "bad", "x".repeat(9000), "a.b.c"]) {
    assert.equal(await verifyGithubActionsIdentity(bad, {
      fetcher: p.fetcher, clock: () => time,
    }), null);
  }
  assert.equal(p.requested.length, 0);
});

test("bundler includes only trusted GitHub identity verifier from source", async () => {
  const { readFileSync } = await import("node:fs");
  const script = readFileSync(new URL("../scripts/build-worker.mjs", import.meta.url), "utf8");
  assert.match(script, /"github-actions-oidc"/);
  const source = readFileSync(new URL("../src/activity-tasks.mjs", import.meta.url), "utf8");
  assert.match(source, /GITHUB_OIDC_ACTIVITY_ENABLED/);
  assert.match(source, /verifyGithubIdentity/);
  assert.doesNotMatch(source, /JSON\.stringify\(auth\)/);
});
