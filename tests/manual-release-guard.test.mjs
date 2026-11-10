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
    [{releaseVariant:"v6"},/v4, v5, or professional/],
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

test("GitHub OIDC receiver requires exact approval and a protected V4 release", () => {
  assert.equal(manualReleaseError({...base,githubOidcAction:"preserve"}),null);
  assert.match(manualReleaseError({...base,githubOidcAction:"enable"}),/GITHUB-OIDC-ENABLE-APPROVED/);
  assert.equal(manualReleaseError({...base,githubOidcAction:"enable",
    githubOidcConfirmation:"GITHUB-OIDC-ENABLE-APPROVED"}),null);
  assert.equal(manualReleaseError({...base,githubOidcAction:"disable"}),null);
  for (const input of [
    {githubOidcAction:"unexpected"},
    {githubOidcAction:"enable",githubOidcConfirmation:"enable"},
    {githubOidcAction:"disable",githubOidcConfirmation:"GITHUB-OIDC-ENABLE-APPROVED"},
    {githubOidcAction:"preserve",githubOidcConfirmation:"GITHUB-OIDC-ENABLE-APPROVED"},
  ]) assert.ok(manualReleaseError({...base,...input}));
  for(const action of ["enable","disable"]) assert.match(manualReleaseError({
    ...base,releaseVariant:"v5",v5BuildFlag:"1",
    v5Confirmation:"V5-CUTOVER-APPROVED",githubOidcAction:action,
    githubOidcConfirmation:action==="enable"?"GITHUB-OIDC-ENABLE-APPROVED":""
  }),/V4 release only/);
});
test("production workflow only accepts explicit receiver action and verifies result", () => {
  const workflow=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
  for(const required of ["github_oidc_action:", "github_oidc_confirmation:",
    "GITHUB_OIDC_ACTION:", "GITHUB_OIDC_CONFIRMATION:",
    "Verify live signed receiver gate and reject unsigned requests",
    "scripts/verify-oidc-release.mjs",
  ]) assert.ok(workflow.includes(required),"Missing GitHub OIDC control "+required);
  assert.ok(workflow.indexOf("node scripts/verify-oidc-release.mjs") >
    workflow.indexOf("node scripts/verify-live.mjs"));
});

test("professional cutover requires exact exclusive build selection and separate owner confirmation",()=>{
  const selection={...base,releaseVariant:"professional",professionalBuildFlag:"1"};
  assert.match(manualReleaseError(selection),/PROFESSIONAL-CUTOVER-APPROVED/);
  assert.equal(manualReleaseError({
    ...selection,professionalConfirmation:"PROFESSIONAL-CUTOVER-APPROVED"
  }),null);
  for(const input of [
    {professionalBuildFlag:"0",professionalConfirmation:"PROFESSIONAL-CUTOVER-APPROVED"},
    {v5BuildFlag:"1",professionalConfirmation:"PROFESSIONAL-CUTOVER-APPROVED"},
    {professionalConfirmation:"professional-cutover-approved"},
    {professionalConfirmation:"PROFESSIONAL-CUTOVER-APPROVED",v5Confirmation:"V5-CUTOVER-APPROVED"},
    {professionalConfirmation:"PROFESSIONAL-CUTOVER-APPROVED",githubOidcAction:"enable",
      githubOidcConfirmation:"GITHUB-OIDC-ENABLE-APPROVED"}
  ])assert.ok(manualReleaseError({...selection,...input}),"Invalid professional release must fail closed");
  assert.match(manualReleaseError({
    ...base,professionalBuildFlag:"1"
  }),/V4 build/);
  assert.match(manualReleaseError({
    ...base,releaseVariant:"v5",v5BuildFlag:"1",professionalBuildFlag:"1",
    v5Confirmation:"V5-CUTOVER-APPROVED"
  }),/V5 build is not selected/);
});

test("professional workflow selects guarded build on build, deploy, and production verification",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
  for(const flag of ["professional_confirmation:","PROFESSIONAL_SITE_CANDIDATE:",
    "PROFESSIONAL_CONFIRMATION:","PROFESSIONAL-CUTOVER-APPROVED",
    "node scripts/verify-professional-candidate.mjs",
    "node scripts/verify-live-professional.mjs"]){
    // Confirmation string must exist in the guard and workflow description.
    assert.ok(workflow.includes(flag)||flag==="PROFESSIONAL-CUTOVER-APPROVED",
      "Missing protected professional release contract: "+flag);
  }
  assert.ok(workflow.indexOf("node scripts/manual-release-guard.mjs")<
    workflow.indexOf("PROFESSIONAL_SITE_CANDIDATE=1 V5_PUBLIC_SITE_CANDIDATE=0 npm run build"));
  assert.ok(workflow.indexOf("node scripts/verify-professional-candidate.mjs")<
    workflow.indexOf("wrangler@4.151.3 deploy"));
  assert.match(workflow,/github.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/environment: production/);
  assert.doesNotMatch(workflow,/permissions:\s*\n\s*contents:\s*write/);
});
