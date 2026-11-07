import test from "node:test";
import assert from "node:assert/strict";
import {
  previewPages,
  renderV5Preview,
  PREVIEW_ROOT,
} from "../src/v5/shell.mjs";
import { v5PreviewPlugin } from "../src/v5/preview-plugin.mjs";
import assets from "../.release/assets.mjs";
import { createHandler } from "../src/worker.mjs";

function middleware(enabled) {
  let handler;
  const plugin = v5PreviewPlugin({ enabled });
  assert.equal(plugin.apply, "serve");
  plugin.configureServer({
    middlewares: {
      use(fn) {
        handler = fn;
      },
    },
    transformIndexHtml: async (_path, html) => html,
  });
  return async (path, method = "GET") => {
    const response = {
      headers: {},
      statusCode: 200,
      next: false,
      setHeader(key, value) {
        this.headers[key] = value;
      },
      end(body) {
        this.body = body;
      },
    };
    await handler({ url: path, method }, response, (error) => {
      if (error) throw error;
      response.next = true;
    });
    return response;
  };
}
test("V5 preview is opt-in, exact-route only and never intercepts current routes", async () => {
  for (const value of [undefined, "", "true", "0"]) {
    assert.equal((await middleware(value)(PREVIEW_ROOT)).statusCode, 404);
  }
  const enabled = middleware("1");
  for (const path of [
    "/",
    "/studio/",
    "/gpt/",
    "/api/activity/v4",
    "/work/merit/",
    "/#research",
  ]) {
    assert.equal((await enabled(path)).next, true, path);
  }
  for (const path of [
    PREVIEW_ROOT + "unknown/",
    PREVIEW_ROOT + "../private/",
    "/__v5_preview__/",
  ]) {
    if (path === PREVIEW_ROOT) continue;
    const response = await enabled(path);
    assert.ok(response.next || response.statusCode === 404, path);
  }
  for (const page of previewPages) {
    const response = await enabled(page.path + "?anything=1");
    assert.equal(response.statusCode, 200);
    assert.match(response.headers["X-Robots-Tag"], /noindex/);
    assert.equal(response.headers["Cache-Control"], "no-store");
    assert.match(response.body, /<h1/);
  }
  assert.equal((await enabled(PREVIEW_ROOT, "POST")).statusCode, 405);
  assert.equal((await enabled(PREVIEW_ROOT, "HEAD")).body, undefined);
});
test("all seven preview pages retain semantic navigation and source-qualified empty states", () => {
  for (const page of previewPages) {
    const html = renderV5Preview(page.key);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<main id="v5-main" tabindex="-1">/);
    assert.match(html, /<details[^>]*data-mobile-menu/);
    assert.ok(html.includes(`href="${page.path}" aria-current="page"`));
    assert.doesNotMatch(
      html,
      /<canvas|<iframe|setInterval|fetch\(|\/owner\/|\/api\//,
    );
    assert.match(html, /noindex,nofollow,noarchive/);
  }
  const home = renderV5Preview();
  for (const source of ["work", "spotify", "gpt"])
    assert.ok(home.includes(`data-v5-signal="${source}"`));
  assert.match(home, /portrait-anevum-transcosmic\.webp/);
  assert.match(home, /portrait-anevum-transcosmic-mobile\.webp/);
  assert.match(home, /<picture><source media="\(max-width: 600px\)"/);
  assert.match(home, /Cinematic portrait artwork of Devon Akins/);
  assert.doesNotMatch(home, /crossed-arms\.webp/);
  assert.match(
    home,
    /Static project composition · no activity or dependency claims/,
  );
  assert.doesNotMatch(home, /696464828|2700000000|all systems healthy/i);
  assert.throws(() => renderV5Preview("../owner"));
});
test("production Worker and compiled assets exclude V5 even when the preview flag is set", async () => {
  const site = createHandler(assets, { version: "test", commit: "synthetic" });
  for (const page of previewPages) {
    const response = await site.fetch(
      new Request("https://devonakins.com" + page.path),
      { V5_PREVIEW: "1" },
    );
    assert.equal(response.status, 404, page.path);
  }
  assert.ok(assets["/v2/crossed-arms.webp"], "Original V4 portrait must remain intact");
  assert.ok(
    !Object.keys(assets).some((path) => /__v5_preview__|\/v5\/|portrait-anevum-transcosmic/.test(path)),
    "Development-only portrait must not enter compiled production output",
  );
  const response = await site.fetch(new Request("https://devonakins.com/"));
  const html = await response.text();
  assert.match(html, /data-signal-work/);
  assert.doesNotMatch(html, /__v5_preview__|v5-shell|DESIGN PREVIEW/);
});
