import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const workflow=await readFile(new URL("../.github/workflows/verify.yml",import.meta.url),"utf8");

test("main-push GitHub identity is isolated from every untrusted PR verification job",()=>{
 assert.match(workflow,/^on:\n  push:\n  pull_request:/m);
 assert.doesNotMatch(workflow,/pull_request_target|workflow_run:/);
 const verify=workflow.match(/\n  verify:\n([\s\S]*?)(?=\n  activity_report:)/)?.[1];
 const reporter=workflow.match(/\n  activity_report:\n([\s\S]*?)(?=\n  v5_candidate:)/)?.[1];
 assert.ok(verify,"expected credential-free default verifier");
 assert.ok(reporter,"expected trusted signed CI reporter");
 assert.match(verify,/Run tests without credentialed reporters\n        run: npm test/);
 assert.doesNotMatch(verify,/id-token: write|DEVON_ACTIVITY_GITHUB_OIDC|DEVON_ACTIVITY_SOURCE_TOKEN|secrets\./);
 assert.match(reporter,/if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
 assert.match(reporter,/permissions:\n      contents: read\n      id-token: write/);
 assert.match(reporter,/persist-credentials: false/);
 assert.match(reporter,/DEVON_ACTIVITY_GITHUB_OIDC: "true"/);
 assert.match(reporter,/run: node scripts\/activity-run\.mjs -- npm test/);
 assert.doesNotMatch(reporter,/secrets\.|DEVON_ACTIVITY_SOURCE_TOKEN/);
 assert.equal((workflow.match(/id-token: write/g)||[]).length,1);
 assert.doesNotMatch(workflow,/secrets\.DEVON_ACTIVITY_SOURCE_TOKEN/);
});
