import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderV5Preview } from "../src/v5/shell.mjs";
import { renderV5Atlas } from "../src/v5/atlas-markup.mjs";

const now = Date.parse("2026-11-07T20:00:00.000Z");
const stylesheet = readFileSync(new URL("../src/v5/shell.css", import.meta.url), "utf8");

test("reference-scaled page class applies to the Signal Field and no other V5 page", () => {
  const field = renderV5Preview("field", { now });
  assert.match(field, /<body class="v5-page-field">/);
  assert.match(field, /<header class="v5-page-heading">/);
  assert.match(field, /id="v5-title"/);
  assert.match(field, /aria-label="Reviewed public systems atlas"/);
  assert.match(field, /data-v5-graph-revision="8"/);
  assert.match(field, /noindex,nofollow,noarchive/);
  for (const page of ["home", "projects", "writing", "research", "knowledge", "about"]) {
    assert.doesNotMatch(renderV5Preview(page, { now }), /v5-page-field/, page);
  }
  assert.match(renderV5Preview("home", { now }), /data-v5-exact-reference="2026-11-07"/);
});

test("desktop styling scopes layout to field and keeps accessible native source evidence", () => {
  assert.match(stylesheet, /\.v5-page-field \.v5-atlas-shell/);
  assert.match(stylesheet, /grid-template-columns: minmax\(215px, 15\.5%\) minmax\(0, 1fr\) minmax\(300px, 23%\)/);
  assert.match(stylesheet, /@media \(max-width: 1100px\)/);
  assert.match(stylesheet, /@media \(max-width: 600px\)/);
  assert.match(stylesheet, /\.v5-page-field \.v5-page-heading/);
  const atlas = renderV5Atlas({ now });
  assert.match(atlas, /data-v5-atlas-node-id="project:mizvo"/);
  assert.match(atlas, /role="status"/);
  assert.equal((atlas.match(/data-v5-atlas-select=/g) || []).length, 8);
  assert.equal((atlas.match(/<details data-v5-atlas-node-id=/g) || []).length, 12);
  assert.match(atlas, /<summary>Mizvo portfolio source<\/summary>/);
});

test("full-bleed layout introduces no public source connections, fabricated statistics or telemetry", () => {
  const field = renderV5Preview("field", { now });
  assert.match(field, /Decorative towers, halos and points are artwork/);
  assert.match(field, /Mizvo portfolio source/);
  assert.match(field, /Squelch portfolio source/);
  assert.match(field, /Publication review/);
  assert.match(field, /Portfolio descriptions are not live activity/);
  assert.doesNotMatch(field, /PRIVATE_CLIENT|THREADS_USER_ACCESS_TOKEN|all systems healthy/i);
  assert.doesNotMatch(field, /<iframe|fetch\(|setInterval/);
});

test("dated graph source links, relationships and timeline have 44px hit boxes and keyboard focus", () => {
  const rule = stylesheet.match(
    /\.v5-graph-proof a, \.v5-graph-relations a, \.v5-graph-timeline a \{([^}]+)\}/
  );
  assert.ok(rule, "The three evidence link types must share an accessible hit-target rule");
  assert.match(rule[1], /display:\s*inline-flex/);
  assert.match(rule[1], /min-height:\s*44px/);
  assert.match(rule[1], /align-items:\s*center/);
  for (const selector of [
    ".v5-graph-proof a:focus-visible",
    ".v5-graph-relations a:focus-visible",
    ".v5-graph-timeline a:focus-visible",
  ]) assert.ok(stylesheet.includes(selector), selector + " needs visible keyboard focus");

  const field = renderV5Preview("field", { now });
  assert.match(field, /class="v5-graph-proof"/);
  assert.match(field, /class="v5-graph-relations"/);
  assert.match(field, /class="v5-graph-timeline"/);
  assert.match(field, />Publication review<\/a>/);
  assert.match(field, />Source evidence<\/a>/);
  assert.match(field, />Review evidence<\/a>/);
  assert.match(field, />Review #8<\/a>/);
});
