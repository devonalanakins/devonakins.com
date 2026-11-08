import test from "node:test";
import assert from "node:assert/strict";
import { replayPublicGraphHistory } from "../src/v5/public-graph-history.mjs";
import { projectV5Atlas } from "../src/v5/atlas-layout.mjs";
import { publicAtlasVisibleSlice } from "../src/v5/atlas-explorer-model.mjs";
import {
  projectPublicAtlasArchitecture,
  PUBLIC_ATLAS_ARCHITECTURE_VERSION,
  PUBLIC_ATLAS_ROOT_COLORS,
} from "../src/v5/atlas-architecture.mjs";

const date = Date.parse("2026-11-07T20:00:00.000Z");
const graph = projectV5Atlas(replayPublicGraphHistory([], date));
const visual = projectPublicAtlasArchitecture(graph);

test("adds exactly one decorative sculpture for each approved public catalog root", () => {
  assert.equal(visual.valid, true);
  assert.equal(visual.version, PUBLIC_ATLAS_ARCHITECTURE_VERSION);
  assert.equal(visual.clusters.length, 8);
  assert.deepEqual(visual.clusters.map(c => c.id),
    graph.nodes.filter(n => n.parent === null).map(n => n.id));
  assert.equal(Object.keys(PUBLIC_ATLAS_ROOT_COLORS).length, 8);
  assert.equal(graph.links.length, 0);
  assert.equal(graph.revision, 0);
  assert.ok(visual.clusters.every(c => c.facets.length === 9));
});

test("all visual facets are bounded, deterministic and visually local to their existing root", () => {
  const again = projectPublicAtlasArchitecture(graph);
  assert.deepEqual(again, visual);
  for (const c of visual.clusters) {
    const node = graph.nodes.find(n => n.id === c.id);
    assert.deepEqual(c.position, node.position);
    assert.equal(c.color, PUBLIC_ATLAS_ROOT_COLORS[c.id]);
    assert.ok(Object.isFrozen(c));
    assert.ok(Object.isFrozen(c.facets));
    for (const f of c.facets) {
      assert.ok(Object.isFrozen(f));
      assert.equal(f.offset.length, 3);
      assert.equal(f.scale.length, 3);
      assert.ok(f.offset.every(Number.isFinite));
      assert.ok(f.offset.every(n => Math.abs(n) < 1));
      assert.ok(f.scale.every(n => n > 0 && n < 1));
    }
  }
});

test("visual sculptures contain no semantic nodes, links, status, metrics or invented activity", () => {
  assert.deepEqual(Object.keys(visual).sort(), ["clusters", "valid", "version"]);
  for (const c of visual.clusters) {
    assert.deepEqual(Object.keys(c).sort(), ["color", "facets", "id", "position"]);
    assert.doesNotMatch(JSON.stringify(c), /PRIVATE_CLIENT|dependency|featureCount|lastSeen|activity|reporter|services/);
  }
  const filtered = publicAtlasVisibleSlice(graph, { search: "Mizvo" });
  assert.deepEqual(filtered.nodeIds, ["project:mizvo"]);
  assert.equal(graph.nodes.length, 8, "decorative geometry must never become a semantic node");
});

test("invalid or forged root catalogs fail closed rather than generating private sculptures", () => {
  const bad = [
    null, undefined, {},
    { ...graph, valid: false },
    { ...graph, nodes: graph.nodes.slice(1) },
    { ...graph, nodes: [...graph.nodes, graph.nodes[0]] },
    { ...graph, nodes: graph.nodes.map((n,i) =>
      i===0 ? { ...n, id: "project:private-client" } : n) },
    { ...graph, nodes: graph.nodes.map((n,i) =>
      i===0 ? { ...n, position: [Infinity,0,0] } : n) },
    { ...graph, nodes: graph.nodes.map((n,i) =>
      i===0 ? { ...n, state: "active" } : n) },
  ];
  for (const input of bad) {
    const result = projectPublicAtlasArchitecture(input);
    assert.equal(result.valid,false);
    assert.deepEqual(result.clusters, []);
  }
});
