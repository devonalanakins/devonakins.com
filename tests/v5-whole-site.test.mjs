import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import {
  renderV5PublicPage,
  renderV5ProjectPage,
  renderV5Preview,
} from "../src/v5/shell.mjs";
import { V5_PUBLIC_ROUTES } from "../src/v5/public-routes.mjs";
import { publicNotes } from "../src/v5/public-notes.mjs";
import { projects } from "../src/content.mjs";
import { createHandler } from "../src/worker.mjs";
import { renderPublishedField } from "../src/v5/field-response.mjs";
const asset = (html) => ({
  type: "text/html; charset=utf-8",
  etag: '"test"',
  gzip: gzipSync(html).toString("base64"),
});
const NOW = new Date("2026-11-08T04:00:00.000Z");
test("full-site candidate publishes real sections and a dedicated atlas without preview paths", () => {
  for (const [key, path] of Object.entries(V5_PUBLIC_ROUTES)) {
    const html = renderV5PublicPage(key);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, key);
    assert.ok(
      html.includes(`rel="canonical" href="https://devonakins.com${path}"`),
    );
    assert.doesNotMatch(
      html,
      /__v5_preview__|DESIGN PREVIEW|noindex|in preparation/,
    );
    assert.match(html, /data-v5-signal-mode="released-v5"/);
    assert.ok(html.includes('property="og:url" content="https://devonakins.com' + path + '"'),
      key + " social canonical must match its published route");
    assert.ok(html.includes('property="og:image" content="https://devonakins.com/da-social-2400.png"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.match(html, /property="og:title"/);
  }
  const fullHome = renderV5PublicPage("home");
  // A complete V5 release must never strand homepage navigation on V4.
  for (const href of ["/knowledge/", "/writing/", "/signal-field/"]) {
    assert.ok(fullHome.includes('href="' + href + '"'), href);
  }
  const railStart = fullHome.indexOf('<nav class="v5-locked-rail"');
  const railEnd = fullHome.indexOf("</nav>", railStart);
  assert.ok(railStart >= 0 && railEnd > railStart,
    "The approved homepage must retain its navigation rail");
  const rail = fullHome.slice(railStart, railEnd);
  for (const href of ["/knowledge/", "/writing/"])
    assert.ok(rail.includes('href="' + href + '"'), "V5 primary rail: " + href);
  assert.ok(!rail.includes('href="/source/"') &&
    !rail.includes('href="/work/writing/"'),
    "Only the V5 primary rail must avoid the old V4 fallbacks; legacy crosslinks may remain");
  const knowledge = renderV5PublicPage("knowledge");
  for (const n of publicNotes)
    assert.ok(knowledge.includes("/knowledge/" + n.slug + "/"));
  assert.match(renderV5PublicPage("research"), /RESEARCH PROTOTYPE/);
  const research = renderV5PublicPage("research");
  assert.doesNotMatch(research, /href="undefined"|href="https:\/\/github\.com\/devonalanakins\/vesper"/,
    "Public research must not link to missing or private source");
  assert.match(research, /Source repository is private/);
  assert.match(
    renderV5PublicPage("writing"),
    /Future works are not presented as released books/,
  );
  assert.throws(() => renderV5PublicPage("unknown"));
});
test("curated public topics have source context and working related/backlink targets", () => {
  const slugs = new Set(publicNotes.map((n) => n.slug));
  for (const n of publicNotes) {
    const html = renderV5PublicPage("knowledge", {
      topic: n.slug,
      publicPath: "/knowledge/" + n.slug + "/",
    });
    assert.ok(html.includes(n.title));
    assert.match(html, /Inspect the source/);
    assert.match(html, /Referenced by/);
    assert.doesNotMatch(
      html,
      /__v5_preview__|in preparation|\/api\/|\/owner\//,
    );
    for (const related of n.related) assert.ok(slugs.has(related));
    assert.ok(n.sources.every(([, path]) => !path.includes("..")));
  }
  assert.doesNotMatch(
    renderV5Preview("knowledge", { topic: "<script>secret</script>" }),
    /<script>secret|secret<\/script>/,
  );
});
test("all already-public portfolio entries preserve their actual scope and links", () => {
  for (const p of projects) {
    const html = renderV5ProjectPage(p.slug);
    for (const text of [p.title, p.status, p.summary, p.detail, p.boundary]) {
      const escaped = text.replaceAll("&", "&amp;").replaceAll("'", "&#39;");
      assert.ok(html.includes(escaped), p.slug + ": " + text);
    }
    if (p.url) assert.ok(html.includes('href="' + p.url + '"'));
    assert.ok(html.includes('property="og:url" content="https://devonakins.com/work/' + p.slug + '/"'));
    assert.ok(html.includes('property="og:title" content="' +
      p.title.replaceAll("&", "&amp;").replaceAll("'", "&#39;") + ' — Devon Alan Akins"'));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.doesNotMatch(html, /__v5_preview__/);
  }
  assert.throws(() => renderV5ProjectPage("private-unapproved"));
  // The approved IdeaFlow vector is ideaflow-mark.svg. A dynamically
  // constructed ideaflow.svg path silently produced a 404 on the real V5
  // Work page despite passing the navigation-only candidate tests.
  const ideaFlow = renderV5ProjectPage("ideaflow");
  assert.ok(ideaFlow.includes('src="/v2/identity/ideaflow-mark.svg"'),
    "V5 must retain the existing IdeaFlow vector asset");
  assert.ok(!ideaFlow.includes('src="/v2/identity/ideaflow.svg"'));
});
test("built field template supports real HTTP no-JS date replay with no-store and same-origin form CSP", async () => {
  const assets = {
    "/signal-field/index.html": asset(renderV5PublicPage("field")),
    "/404/index.html": asset("not found"),
  };
  const site = createHandler(
    assets,
    { version: "test", commit: "test" },
    { now: () => NOW },
  );
  const request = (query = "", method = "GET", headers = {}) =>
    site.fetch(
      new Request("https://devonakins.com/signal-field/" + query, {
        method,
        headers,
      }),
    );
  for (const date of ["2026-11-06", "2026-11-07"]) {
    const r = await request("?asOf=" + date);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("Cache-Control"), "no-store");
    assert.equal(r.headers.get("ETag"), null);
    assert.match(
      r.headers.get("Content-Security-Policy"),
      /form-action 'self'/,
    );
    const html = await r.text();
    assert.ok(html.includes('value="' + date + '"'));
    assert.match(html, /action="\/signal-field\/"/);
    assert.doesNotMatch(html, /__v5_preview__/);
    assert.ok(html.includes(date + "T23:59:59.999Z"));
  }
  for (const date of [
    "2099-01-01",
    "2026-02-30",
    "<script>alert(1)</script>",
  ]) {
    const html = await (
      await request("?asOf=" + encodeURIComponent(date))
    ).text();
    assert.match(html, /Choose a valid UTC date/);
    assert.doesNotMatch(html, /<script>alert/);
  }
  assert.equal(await (await request("?asOf=2026-11-06", "HEAD")).text(), "");
  assert.equal((await request("?asOf=2026-11-06", "POST")).status, 405);
  assert.equal(
    (await request("?asOf=2026-11-06", "GET", { "If-None-Match": '"test"' }))
      .status,
    200,
  );
});
test("V4 assets and preview templates cannot activate dynamic public field rendering", async () => {
  assert.equal(
    renderPublishedField(renderV5Preview("field"), null, NOW.getTime()),
    null,
  );
  assert.equal(
    renderPublishedField("<html>not a release</html>", null, NOW.getTime()),
    null,
  );
  const site = createHandler(
    { "/404/index.html": asset("not found") },
    {},
    { now: () => NOW },
  );
  assert.equal(
    (
      await site.fetch(
        new Request("https://devonakins.com/signal-field/?asOf=2026-11-06"),
      )
    ).status,
    404,
  );
});
