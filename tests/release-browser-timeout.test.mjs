import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8",
);

test("manual cinematic release bounds slow dependency mirrors and retains every protected gate", () => {
  const minutes = Number(workflow.match(/^    timeout-minutes: (\d+)$/m)?.[1]);
  assert.ok(minutes >= 60 && minutes <= 90,
    "production release must accommodate bounded Ubuntu dependency installation");
  assert.match(workflow,
    /timeout -k 60s 45m python3 -m playwright install --with-deps chromium webkit/);
  assert.match(workflow,
    /timeout -k 60s 10m env LABORATORY_RUNTIME_BROWSER_CHECK=1 node scripts\/verify-laboratory-runtime\.mjs/);
  const steps = [
    "Guard exact commit, target Worker and release selection",
    "Verify exact-main cinematic release in pinned browsers before deployment",
    "Preserve approved private runtime configuration",
    "Deploy only devonakins-personal Worker",
    "Verify actual public deployment",
    "Verify live signed receiver gate and reject unsigned requests",
  ];
  const positions = steps.map(name => workflow.indexOf("- name: " + name));
  assert.ok(positions.every(p => p >= 0), "protected release steps must remain mandatory");
  assert.deepEqual(positions, [...positions].sort((a,b) => a-b),
    "preflight must precede deployment and post-deployment verification");
});
