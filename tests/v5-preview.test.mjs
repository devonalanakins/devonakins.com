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
    assert.match(html, /<html lang="en" data-v5-signal-mode="preview">/);
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
  assert.match(home, /cap-hero-desktop\.webp/);
  assert.match(home, /cap-hero-mobile\.webp/);
  assert.match(home, /<picture><source media="\(max-width: 600px\)"/);
  assert.match(home, /Cinematic portrait of Devon Akins wearing a backward cap/);
  assert.doesNotMatch(home, /crossed-arms\.webp/);
  assert.match(
    home,
    /Static project composition · no activity or dependency claims/,
  );
  assert.doesNotMatch(home, /696464828|2700000000|all systems healthy/i);
  assert.throws(() => renderV5Preview("../owner"));
});
test("V5 field history date works through server-side GET without JavaScript or provider calls", async () => {
  const get = middleware("1");
  const archived = await get(PREVIEW_ROOT + "field/?asOf=2026-11-06");
  assert.equal(archived.statusCode, 200);
  assert.match(archived.headers["Cache-Control"], /no-store/);
  assert.match(archived.headers["X-Robots-Tag"], /noindex/);
  assert.match(archived.body, /value="2026-11-06"/);
  assert.match(archived.body, /data-v5-graph-revision="8"/);
  assert.match(archived.body, /Mizvo portfolio source/);
  assert.match(archived.body, /Squelch portfolio source/);
  const beforeMerges = await get(PREVIEW_ROOT + "field/?asOf=2026-11-03");
  assert.equal(beforeMerges.statusCode, 200);
  assert.match(beforeMerges.body, /data-v5-graph-revision="0"/);
  assert.match(beforeMerges.body, /No reviewed structural events yet/);
  assert.doesNotMatch(archived.body, /fetch\(|\/api\/activity\/v4|private-client/);
  const malformed = await get(PREVIEW_ROOT + "field/?asOf=%3Cscript%3E");
  assert.equal(malformed.statusCode, 200);
  assert.match(malformed.body, /Choose a valid UTC date/);
  assert.doesNotMatch(malformed.body, /<script>/);
  assert.equal((await middleware("0")(PREVIEW_ROOT + "field/?asOf=2026-11-06")).statusCode, 404);
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
    !Object.keys(assets).some((path) => /__v5_preview__|\/v5\/|cap-hero-(desktop|mobile)/.test(path)),
    "Development-only portrait must not enter compiled production output",
  );
  const response = await site.fetch(new Request("https://devonakins.com/"));
  const html = await response.text();
  assert.match(html, /data-signal-work/);
  assert.doesNotMatch(html, /__v5_preview__|v5-shell|DESIGN PREVIEW/);
});
