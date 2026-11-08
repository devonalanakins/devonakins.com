import test from "node:test";
import assert from "node:assert/strict";
import { publicAtlasProfiles } from "../src/v5/atlas-public-profiles.mjs";
import { projectV5Atlas } from "../src/v5/atlas-layout.mjs";
import { replayPublicGraphHistory } from "../src/v5/public-graph-history.mjs";
import { renderV5Atlas } from "../src/v5/atlas-markup.mjs";
import { projects } from "../src/content.mjs";

const NOW = Date.parse("2026-11-07T20:00:00.000Z");
const layout = projectV5Atlas(replayPublicGraphHistory([], NOW));
const profiles = publicAtlasProfiles(layout);

test("inspector exposes exactly the eight reviewed public catalog identities", () => {
  assert.equal(profiles.length, 8);
  assert.deepEqual(profiles.map(p => p.id), layout.nodes.map(n => n.id));
  for (const profile of profiles) {
    assert.ok(profile.title.length > 0);
    assert.ok(profile.summary.length > 15);
    assert.ok(profile.boundary.length > 10);
    assert.ok(profile.status.length > 8);
    assert.ok(Object.isFrozen(profile));
  }
  assert.ok(Object.isFrozen(profiles));
});

test("project overviews are derived from existing public editorial content, not live source inference", () => {
  for (const profile of profiles.filter(p => p.id.startsWith("project:"))) {
    const slug = profile.id.replace(/^project:/, "");
    const source = projects.find(project => project.slug === slug);
    assert.ok(source, slug);
    assert.equal(profile.title, source.title);
    assert.equal(profile.status, source.status);
    assert.equal(profile.summary, source.summary);
    assert.equal(profile.boundary, source.boundary);
  }
  const mizvo = profiles.find(p => p.id === "project:mizvo");
  assert.match(mizvo.status, /not deployed/);
  const knowledge = profiles.find(p => p.id === "section:knowledge-overview");
  assert.equal(knowledge.url, "/__v5_preview__/knowledge/");
  assert.match(knowledge.boundary, /No private Knowledge pages/);
  assert.ok(!profiles.some(p => p.url?.includes("/api/")));
});

test("external links are restricted to explicit public project destinations", () => {
  const approved = new Set([
    "https://github.com/devonalanakins/mizvo",
    "https://github.com/devonalanakins/rhen",
    "https://github.com/devonalanakins/merit",
    "https://github.com/devonalanakins/vesper",
    "https://github.com/devonalanakins/squelch",
    "https://anevum.com",
    "/__v5_preview__/knowledge/",
  ]);
  for (const profile of profiles) {
    if (profile.url) assert.ok(approved.has(profile.url), profile.url);
  }
  assert.equal(profiles.find(p=>p.id==="project:devonstation").url, null);
});

test("forged or malformed public structural identity cannot produce profiles", () => {
  for (const forged of [
    null, { ...layout, valid: false },
    { ...layout, nodes: layout.nodes.slice(0, 7) },
    { ...layout, nodes: [...layout.nodes, layout.nodes[0]] },
    { ...layout, nodes: layout.nodes.map(n =>
      n.id === "project:mizvo" ? { ...n, label: "Private Client" } : n) },
    { ...layout, nodes: layout.nodes.map(n =>
      n.id === "project:merit" ? { ...n, state: "published" } : n) },
    { ...layout, nodes: layout.nodes.map(n =>
      n.id === "section:knowledge-overview" ? { ...n, type: "project" } : n) },
  ]) assert.deepEqual(publicAtlasProfiles(forged), []);
});

test("gated atlas markup includes source-qualified contextual inspector and no-JS summaries", () => {
  const html = renderV5Atlas({ now: NOW });
  assert.match(html, /data-v5-atlas-spotlight/);
  assert.match(html, /aria-labelledby="v5-atlas-spotlight-heading"/);
  assert.equal((html.match(/<template data-v5-atlas-profile=/g) || []).length, 8);
  assert.equal((html.match(/class="v5-atlas-native-summary"/g) || []).length, 8);
  assert.match(html, /data-v5-atlas-profile="project:mizvo"/);
  assert.match(html, /AGPL review build/);
  assert.match(html, /CURATED PORTFOLIO STATUS · NOT LIVE TELEMETRY/);
  assert.match(html, /No private Knowledge pages/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /<script|fetch\(|THREADS_USER_ACCESS_TOKEN|PRIVATE_CLIENT|Bearer /);
});
