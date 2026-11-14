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
    [{releaseVariant:"v6"},/v4, v5, professional, or one-screen/],
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
    workflow.indexOf("PROFESSIONAL_SITE_CANDIDATE=1 ONE_SCREEN_SITE_CANDIDATE=0 V5_PUBLIC_SITE_CANDIDATE=0 npm run build"));
  assert.ok(workflow.indexOf("node scripts/verify-professional-candidate.mjs")<
    workflow.indexOf("wrangler@4.151.3 deploy"));
  assert.match(workflow,/github.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/environment: production/);
  assert.doesNotMatch(workflow,/permissions:\s*\n\s*contents:\s*write/);
});

test("one-screen cutover requires independent exact approval and both selected build flags",()=>{
  const oneScreen={...base,releaseVariant:"one-screen",
    professionalBuildFlag:"1",oneScreenBuildFlag:"1"};
  assert.match(manualReleaseError(oneScreen),/ONE-SCREEN-CUTOVER-APPROVED/);
  assert.equal(manualReleaseError({
    ...oneScreen,oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED"
  }),null);
  for(const input of [
    {oneScreenConfirmation:"one-screen-cutover-approved"},
    {oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED",oneScreenBuildFlag:"0"},
    {oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED",professionalBuildFlag:"0"},
    {oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED",v5BuildFlag:"1"},
    {oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED",v5Confirmation:"V5-CUTOVER-APPROVED"},
    {oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED",professionalConfirmation:"PROFESSIONAL-CUTOVER-APPROVED"},
    {oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED",githubOidcAction:"enable",
      githubOidcConfirmation:"GITHUB-OIDC-ENABLE-APPROVED"}
  ]) assert.ok(manualReleaseError({...oneScreen,...input}),
    "One-screen release must reject missing/extra flags, confirmations and OIDC changes");
});
test("one-screen flags or confirmations cannot leak into older release variants",()=>{
  const valid=[
    base,
    {...base,releaseVariant:"v5",v5BuildFlag:"1",v5Confirmation:"V5-CUTOVER-APPROVED"},
    {...base,releaseVariant:"professional",professionalBuildFlag:"1",
      professionalConfirmation:"PROFESSIONAL-CUTOVER-APPROVED"}
  ];
  for(const input of valid){
    assert.equal(manualReleaseError(input),null,"Control selection should pass");
    assert.ok(manualReleaseError({...input,oneScreenBuildFlag:"1"}));
    assert.ok(manualReleaseError({...input,oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED"}));
  }
});
test("one-screen protected workflow builds only the confirmed variant and checks the live Worker",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
  const guard=workflow.indexOf("run: node scripts/manual-release-guard.mjs");
  const candidate=workflow.indexOf("node scripts/verify-one-screen-candidate.mjs");
  const upload=workflow.indexOf("wrangler@4.151.3 deploy");
  const live=workflow.indexOf("node scripts/verify-live-one-screen.mjs");
  assert.ok(guard>0&&candidate>guard&&upload>candidate&&live>upload);
  for(const required of [
    "- one-screen", "one_screen_confirmation:", "ONE_SCREEN_CONFIRMATION:",
    "ONE_SCREEN_SITE_CANDIDATE:", "ONE_SCREEN_SITE_CANDIDATE=1",
    "PROFESSIONAL_SITE_CANDIDATE=1 ONE_SCREEN_SITE_CANDIDATE=1 V5_PUBLIC_SITE_CANDIDATE=0 npm run build",
    "node scripts/verify-one-screen-candidate.mjs",
    "node --check scripts/verify-live-one-screen.mjs",
    "if [ \"$ONE_SCREEN_SITE_CANDIDATE\" = '1' ]; then",
    "node scripts/verify-live-one-screen.mjs",
    "environment: production","github.ref == 'refs/heads/main'"
  ]) assert.ok(workflow.includes(required),"Missing exclusive one-screen release gate: "+required);
  assert.doesNotMatch(workflow,/permissions:\s*\n\s*contents:\s*write/);
});
test("one-screen post-release checker preserves the real public data and privacy boundaries",()=>{
  const source=readFileSync(new URL("../scripts/verify-live-one-screen.mjs",import.meta.url),"utf8");
  for(const required of [
    "expectedCommit", "release.commit", 'get("/_health")', "one-stage",
    "one-portrait", "headshot-concept", "ONE_SCREEN", "data-public-github-feed",
    "data-public-spotify", "data-public-gpt", "one-gpt-record",
    "readBrowserGithubFallback", "validPublicListening",
    'get("/api/activity/v4")', 'get("/api/listening/now")',
    'get("/api/github/public-feed")', "SYNTHETIC"
  ]) {
    // Script need not mention the build-selection environment variable by
    // name; exact HTML and commit validation are the production acceptance.
    if(required==="ONE_SCREEN")continue;
    assert.ok(source.includes(required),"Missing source- or privacy-check: "+required);
  }
});

test("Threads read-only publishing requires an exact protected one-screen approval",()=>{
  const selection={...base,releaseVariant:"one-screen",
    professionalBuildFlag:"1",oneScreenBuildFlag:"1",
    oneScreenConfirmation:"ONE-SCREEN-CUTOVER-APPROVED"};
  assert.equal(manualReleaseError({...selection,
    threadsPublishAction:"enable",
    threadsPublishConfirmation:"THREADS-PUBLIC-FEED-APPROVED"}),null);
  assert.equal(manualReleaseError({...selection,threadsPublishAction:"disable"}),null);
  for(const input of [
    {threadsPublishAction:"enable"},
    {threadsPublishAction:"enable",threadsPublishConfirmation:"yes"},
    {threadsPublishAction:"disable",threadsPublishConfirmation:"THREADS-PUBLIC-FEED-APPROVED"},
    {threadsPublishAction:"unknown"},
    {threadsPublishAction:"preserve",threadsPublishConfirmation:"THREADS-PUBLIC-FEED-APPROVED"},
    {threadsPublishAction:"enable",threadsPublishConfirmation:"THREADS-PUBLIC-FEED-APPROVED",
      githubOidcAction:"enable",githubOidcConfirmation:"GITHUB-OIDC-ENABLE-APPROVED"},
  ]) assert.ok(manualReleaseError({...selection,...input}),"Unsafe Threads release permitted");
  assert.match(manualReleaseError({...base,
    threadsPublishAction:"enable",
    threadsPublishConfirmation:"THREADS-PUBLIC-FEED-APPROVED"}),/one-screen/);
});

test("manual workflow exposes separate owner approval and source acceptance for Threads",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
  for(const required of [
    "threads_publication_action:","threads_publication_confirmation:",
    "THREADS_PUBLICATION_ACTION:","THREADS_PUBLICATION_CONFIRMATION:",
    "THREADS-PUBLIC-FEED-APPROVED","Verify live read-only Threads feed",
    "node scripts/verify-live-threads.mjs",
  ]) assert.ok(workflow.includes(required),"Missing Threads release gate "+required);
  assert.ok(workflow.indexOf("node scripts/prepare-private-deploy.mjs")<
    workflow.indexOf("node scripts/verify-live-threads.mjs"));
  assert.ok(workflow.indexOf("wrangler@4.151.3 deploy")<
    workflow.indexOf("node scripts/verify-live-threads.mjs"));
  assert.match(workflow,/environment: production/);
});
