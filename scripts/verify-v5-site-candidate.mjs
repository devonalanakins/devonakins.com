/** Read-only local Worker acceptance for the opt-in full-site candidate. */
import assert from "node:assert/strict";
import assets from "../.release/assets.mjs";
import { createHandler } from "../.release/handler.mjs";
import { V5_PUBLIC_ROUTES } from "../src/v5/public-routes.mjs";
import { publicNotes } from "../src/v5/public-notes.mjs";
import { projects } from "../src/content.mjs";
const handler = createHandler(assets, {
  version: "candidate-test",
  commit: "synthetic",
});
const request = (path, init = {}) =>
  handler.fetch(new Request("https://devonakins.com" + path, init), {});
const routes = [
  ...Object.values(V5_PUBLIC_ROUTES),
  ...publicNotes.map((n) => "/knowledge/" + n.slug + "/"),
  ...projects.map((p) => "/work/" + p.slug + "/"),
];
for (const path of routes) {
  const r = await request(path);
  assert.equal(r.status, 200, path);
  const html = await r.text();
  assert.match(html, /data-v5-signal-mode="released-v5"/, path);
  assert.doesNotMatch(html, /__v5_preview__|DESIGN PREVIEW|noindex/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
  // Every navigation target resolves to a real published local document or
  // allowlisted functional legacy surface, never a private/preview route.
  for (const match of html.matchAll(/href="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
    const target = match[1];
    if (target.startsWith("/assets/")) continue;
    assert.ok(
      assets[target] || assets[target + "index.html"],
      path + " links to missing " + target,
    );
  }
}
for (const path of [
  "/studio/",
  "/listening/",
  "/gpt/",
  "/contact/",
  "/source/",
]) {
  assert.equal((await request(path)).status, 200, path);
}
for (const date of ["2026-11-05", "2026-11-06"]) {
  const r = await request("/signal-field/?asOf=" + date);
  assert.equal(r.headers.get("Cache-Control"), "no-store");
  assert.match(r.headers.get("Content-Security-Policy"), /form-action 'self'/);
  const html = await r.text();
  assert.ok(html.includes('value="' + date + '"'));
  assert.doesNotMatch(html, /__v5_preview__/);
}
assert.equal((await request("/__v5_preview__/")).status, 404);
assert.equal((await request("/signal-field/", { method: "POST" })).status, 405);
assert.equal(
  await (await request("/signal-field/", { method: "HEAD" })).text(),
  "",
);
console.log(
  `Whole-site candidate Worker acceptance passed: ${routes.length} V5 routes, links, legacy surfaces, no-JS date replay, CSP, HEAD/POST and preview fence.`,
);
