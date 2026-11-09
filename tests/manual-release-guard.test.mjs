import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { manualReleaseError } from "../scripts/manual-release-guard.mjs";

const sha = "a".repeat(40);
const base = Object.freeze({
  expectedSha: sha,
  checkoutSha: sha,
  releaseVariant: "v4",
  v5BuildFlag: "0",
  v5Confirmation: "",
  workerConfig: '{"name": "devonakins-personal"}',
});

test("tested main commit may release V4 without V5 approval", () => {
  assert.equal(manualReleaseError(base), null);
});

test("V5 selection for a V4 hotfix fails with an actionable message", () => {
  const error = manualReleaseError({
    ...base, releaseVariant: "v5", v5BuildFlag: "1",
  });
  assert.match(error, /V5 cutover is not authorized/);
  assert.match(error, /privacy hotfix select v4/);
  assert.match(error, /V5-CUTOVER-APPROVED/);
});

test("V5 requires exact confirmation and explicit V5 build flag", () => {
  assert.match(manualReleaseError({
    ...base, releaseVariant: "v5", v5BuildFlag: "0",
    v5Confirmation: "V5-CUTOVER-APPROVED",
  }), /V5 build is not selected/);
  assert.match(manualReleaseError({
    ...base, releaseVariant: "v5", v5BuildFlag: "1",
    v5Confirmation: "v5-cutover-approved",
  }), /V5 cutover is not authorized/);
  assert.equal(manualReleaseError({
    ...base, releaseVariant: "v5", v5BuildFlag: "1",
    v5Confirmation: "V5-CUTOVER-APPROVED",
  }), null);
});

test("wrong branch, partial SHA, wrong worker, or inconsistent V4 flag fail closed", () => {
  for (const [input, message] of [
    [{expectedSha:"abc"},/40-character/],
    [{expectedSha:"A".repeat(40)},/40-character/],
    [{checkoutSha:"b".repeat(40)},/does not match/],
    [{workerConfig:'{"name": "another-worker"}'},/devonakins-personal/],
    [{releaseVariant:"v6"},/v4 or v5/],
    [{v5BuildFlag:"1"},/V4 build/],
  ]) assert.match(manualReleaseError({...base,...input}),message);
});

test("protected GitHub deployment runs the tested release guard before building or uploading", () => {
  const workflow=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
  const guard=workflow.indexOf("run: node scripts/manual-release-guard.mjs");
  const build=workflow.indexOf("- name: Build and validate Worker");
  const deploy=workflow.indexOf("wrangler@4.151.3 deploy");
  assert.ok(guard>0 && build>guard && deploy>build);
  for(const required of [
    "run-name:", "environment: production", "github.ref == 'refs/heads/main'",
    "EXPECTED_SHA:", "RELEASE_VARIANT:", "V5_CONFIRMATION:",
    "V5_PUBLIC_SITE_CANDIDATE:", "permissions:\n  contents: read",
  ]) assert.ok(workflow.includes(required),"Missing release safeguard: "+required);
  assert.doesNotMatch(workflow,/permissions:\s*\n\s*contents:\s*write/);
});
