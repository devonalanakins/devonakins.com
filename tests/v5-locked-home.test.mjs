import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderReferenceHomepage } from "../src/v5/reference-home.mjs";
import { renderV5Preview } from "../src/v5/shell.mjs";

test("locked V5 screenshot modules occupy one semantic preview home", () => {
  const body = renderReferenceHomepage();
  assert.match(body, /data-v5-exact-reference="2026-11-07"/);
  assert.match(body, /<h1 id="v5-title">Devon Alan Akins<\/h1>/);
  assert.equal((body.match(/<h1\b/g) || []).length, 1);
  for (const name of [
    "Activity", "Work status", "Selected projects",
    "GitHub Activity", "Threads Feed", "GPT Analytics", "Systems Map",
  ]) assert.ok(body.includes(name), name);
  for (const name of ["Mizvo", "Rhen", "Merit", "Vesper", "Squelch"])
    assert.ok(body.includes(name), name);
  for (const source of ["work", "spotify", "gpt"])
    assert.ok(body.includes('data-v5-signal="' + source + '"'), source);
  assert.ok(body.includes("Static project composition"));
  assert.equal((body.match(/data-v5-field-node(?: |\>)/g) || []).length, 8);
  assert.equal((body.match(/aria-controls="v5-field-inspector"/g) || []).length, 8);
  assert.match(body, /No verified inter-project dependencies are published here/);
  assert.match(body, /data-v5-field-evidence hidden/);
  assert.match(body, /data-v5-work-summary/);
  assert.match(body, /data-v5-github-summary/);
  assert.match(body, /data-v5-threads-status/);
  assert.match(body, /data-v5-threads-empty/);
  assert.match(body, /data-v5-threads-feed hidden/);
  assert.match(body, /data-v5-threads-posts/);
  assert.match(body, /Official Threads API/);
  assert.match(body, /data-v5-gpt-empty/);
  assert.match(body, /data-v5-gpt-capture hidden/);
  assert.match(body, /data-v5-gpt-primary/);
  assert.match(body, /data-v5-gpt-time/);
  assert.match(body, /data-v5-gpt-readings/);
  assert.match(body, /Owner-captured · Not live provider telemetry/);
  assert.match(body, /Public Knowledge section preview/);
  assert.match(body, /Approved public project catalog/);
  assert.match(body, /data-v5-field-slug="rhen-language"/);
  assert.ok(body.includes("CHECK DATES &amp; SOURCES"));
  assert.match(body, /portrait-anevum-transcosmic\.webp/);
  assert.match(body, /portrait-anevum-transcosmic-mobile\.webp/);
  assert.equal((body.match(/class="v5-hero-atmosphere"/g) || []).length, 1);
  assert.equal((body.match(/class="v5-portrait-source-atmosphere"/g) || []).length, 1);
  assert.equal((body.match(/class="v5-hero-veil"/g) || []).length, 1);
  assert.equal((body.match(/class="v5-hero-smoke /g) || []).length, 3);
  assert.match(body, /data-v5-ambient-motion/);
  assert.match(body, /class="v5-hero-streams"/);
  assert.equal((body.match(/class="v5-hero-clouds"/g) || []).length, 1);
  assert.equal((body.match(/class="v5-hero-cloud v5-hero-cloud--/g) || []).length, 3);
  assert.equal((body.match(/id="v5-cloud-curl"/g) || []).length, 1);
  assert.ok(body.includes('aria-hidden="true" data-v5-ambient-motion'));
  assert.doesNotMatch(body, /<video|<iframe|<foreignObject|<animate[\s>]/);

  assert.match(body, /aria-hidden="true" data-v5-ambient-motion/);

  assert.doesNotMatch(body, /crossed-arms\.webp/);
  assert.equal((body.match(/class="v5-lock-project-art"/g) || []).length, 5);
  assert.equal((body.match(/class="v5-lock-project-brand"/g) || []).length, 5);
  assert.equal((body.match(/class="v5-lock-project-mark"/g) || []).length, 5);
  assert.equal((body.match(/class="v5-lock-wordmark"/g) || []).length, 5);
  for (let i = 0; i < 5; i++) {
    assert.ok(body.includes('id="v5art-a-' + i + '"'));
    assert.ok(body.includes('id="v5art-b-' + i + '"'));
  }

  assert.doesNotMatch(body, /143\.2M|2\.7B|3\.19B|99\.98%|all core services healthy|42(?:\/42)? tests passed/i);
});
test("locked screenshot home remains confined to dev-only preview and source-safe", () => {
  const document = renderV5Preview("home");
  assert.match(document, /reference-home\.css/);
  assert.match(document, /<main id="v5-main" tabindex="-1">/);
  assert.match(document, /noindex,nofollow,noarchive/);
  assert.match(document, /data-mobile-menu/);
  assert.match(document, /data-v5-preview-connect hidden/);
  assert.ok(document.indexOf('class="v5-preview-banner"') > document.indexOf("</footer>"), "homepage preview notice must not displace live-first viewport");
  assert.match(document, /Not loaded|not loaded|not verified|NOT VERIFIED/);
  assert.doesNotMatch(document, /<iframe|<canvas|<script[^>]+src="https:|fetch\(|\/owner\/|\/api\//);
  for (const key of ["projects", "writing", "knowledge"]) {
    const secondary = renderV5Preview(key);
    assert.doesNotMatch(secondary, /reference-home\.css/);
    assert.doesNotMatch(secondary, /data-v5-exact-reference/);
  }
});
test("locked CSS includes responsive screenshot geometry and reduced-motion guard", () => {
  const css = readFileSync(new URL("../src/v5/reference-home.css", import.meta.url), "utf8");
  assert.match(css, /\.v5-locked-hero\s*\{/);
  assert.match(css, /\.v5-locked-rail\s*\{/);
  assert.match(css, /\.v5-lock-triple\s*\{/);
  assert.match(css, /\.v5-lock-terrain\s*\{/);
  assert.match(css, /max-width:600px/);
  assert.match(css, /max-width:340px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /v5-lock-terrain-canvas/);
  assert.match(css, /v5-lock-project-art/);
  assert.match(css, /svg\.v5-lock-project-art\s*\{/);
  assert.match(css, /v5-lock-project-brand/);
  assert.ok(css.includes("clip-path: polygon("), "Portrait must clip without a bundled mask URL");
  assert.match(css, /v5-portrait-source-atmosphere/);
  assert.match(css, /mix-blend-mode: screen/);
  assert.match(css, /mask-image: radial-gradient/);
  assert.match(css, /v5-smoke-cyan/);
  assert.match(css, /v5-smoke-violet/);
  assert.match(css, /v5-smoke-amber/);
  assert.match(css, /v5-cloud-drift-cyan/);
  assert.match(css, /v5-cloud-drift-violet/);
  assert.match(css, /v5-cloud-drift-ember/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /\.v5-hero-cloud \{ filter: blur\(12px\) !important; \}/);

  assert.match(css, /prefers-reduced-motion: reduce/);
  const matte = readFileSync(new URL("../src/v5/assets/portrait-cutout-mask.svg", import.meta.url), "utf8");
  assert.match(matte, /viewBox="0 0 1122 1402"/);
  assert.match(matte, /<path fill="#fff" d="M/);
  assert.ok(!matte.includes("<image") && !matte.includes("<script") && !matte.includes("href="), "Cutout mask must contain no remote image/script references");

  assert.match(css, /v5-field-inspector\[hidden\]/);
  assert.match(css, /v5-lock-beam-link/);
});
