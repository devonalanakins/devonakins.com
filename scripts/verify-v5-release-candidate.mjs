// Evidence gate for an intentional CI-only V5 homepage candidate build.
// This script never deploys; it exercises the actual generated Worker asset
// bundle and preserves all V4 deep links and consent restrictions.
import assert from "node:assert/strict";
import assets from "../.release/assets.mjs";
import { createHandler } from "../src/worker.mjs";

const handler = createHandler(assets, { version: "v5-candidate-test", commit: "synthetic" });
const visit = (path, init = {}) => handler.fetch(new Request("https://devonakins.com" + path, init), {});
const page = await visit("/");
assert.equal(page.status, 200);
assert.match(page.headers.get("Content-Type") ?? "", /text\/html/);
assert.match(page.headers.get("Content-Security-Policy") ?? "", /default-src 'self'/);
assert.match(page.headers.get("Cache-Control") ?? "", /max-age=0/);
const html = await page.text();
assert.match(html, /data-v5-signal-mode="released-v5"/);
assert.match(html, /data-v5-exact-reference="2026-11-07"/);
assert.match(html, /name="robots" content="index,follow,max-image-preview:large"/);
assert.doesNotMatch(html, /__v5_preview__|DESIGN PREVIEW|data-v5-preview-connect|noindex/i);
assert.match(html, /Systems Map/);
assert.match(html, /No fresh, verified work session/);
assert.match(html, /No verified inter-project dependencies are published here/);
assert.match(html, /<script type="module" crossorigin src="\/assets\//);
const published = Object.keys(assets);
assert.ok(published.some((p) => /^\/assets\/.*\.js$/.test(p)), "no built V5 client");
assert.ok(published.some((p) => /^\/assets\/.*\.css$/.test(p)), "no built V5 styles");
assert.ok(published.some((p) => /cap-hero-desktop\.webp/.test(p)), "approved desktop cap portrait missing");
assert.ok(published.some((p) => /cap-hero-mobile\.webp/.test(p)), "approved mobile cap portrait missing");
assert.ok(!published.some((p) => /__v5_preview__|\/owner\/|private-patient/.test(p)),
  "preview or private artifacts in public asset package");
for (const path of [
  "/work/", "/source/", "/work/writing/", "/about/", "/studio/",
  "/listening/", "/gpt/", "/work/anevum/", "/work/mizvo/",
]) {
  const response = await visit(path);
  assert.equal(response.status, 200, path);
  const text = await response.text();
  assert.doesNotMatch(text, /data-v5-signal-mode="released-v5"/, path + " should retain V4 until migrated");
}
for(const path of ["/__v5_preview__/", "/__v5_preview__/field/"]) {
  const response = await visit(path);
  assert.equal(response.status, 404, path);
}
const head = await visit("/", {method:"HEAD"});
assert.equal(head.status, 200);
assert.equal(await head.text(),"");
const original = await visit("/", {headers: {"If-None-Match":page.headers.get("ETag")}});
assert.equal(original.status,304);
const health=await visit("/_health");
assert.equal(health.status,200);
console.log("V5 public-home candidate Worker gate passed: screenshot layout, first-party assets, private preview fence, V4 deep links, security headers, HEAD, 304 and health.");
