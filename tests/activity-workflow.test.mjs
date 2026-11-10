import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/verify.yml", import.meta.url), "utf8");

test("signed GitHub job identity reports only from trusted main pushes, never pull requests", () => {
  assert.match(workflow, /^on:\n  push:\n  pull_request:/m);
  assert.doesNotMatch(workflow, /pull_request_target|workflow_run:/);
  assert.match(workflow, /persist-credentials: false/);
  const reporting = workflow.match(
    /      - name: Test and report private CI activity \(trusted main push\)\n([\s\S]*?)(?=      - name:|\n\s*$)/,
  )?.[1];
  assert.ok(reporting, "expected dedicated guarded reporting step");
  assert.match(
    reporting,
    /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
    "only the trusted main push can receive the secret",
  );
  assert.match(reporting, /DEVON_ACTIVITY_GITHUB_OIDC: "true"/);
  assert.match(workflow, /id-token: write/);
  assert.doesNotMatch(reporting, /secrets\.|DEVON_ACTIVITY_SOURCE_TOKEN/);
  assert.match(reporting, /run: node scripts\/activity-run\.mjs -- npm test/);

  const fallback = workflow.match(
    /      - name: Test without reporter credentials \(PRs and other branches\)\n([\s\S]*?)(?=      - name:|\n\s*$)/,
  )?.[1];
  assert.ok(fallback, "expected ordinary credential-free tests for untrusted refs");
  assert.match(fallback, /if: github\.event_name != 'push' \|\| github\.ref != 'refs\/heads\/main'/);
  assert.match(fallback, /run: npm test/);
  assert.doesNotMatch(fallback, /secrets\.|DEVON_ACTIVITY_SOURCE_TOKEN|activity-run\.mjs/);
  assert.doesNotMatch(workflow, /secrets\.DEVON_ACTIVITY_SOURCE_TOKEN/,
    "a reusable CI reporter token must not be needed");
  assert.match(workflow, /permissions:\n      contents: read\n      id-token: write/);
});
