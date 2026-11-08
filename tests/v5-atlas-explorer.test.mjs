import test from "node:test";
import assert from "node:assert/strict";
import { publicAtlasVisibleSlice, ATLAS_DISPLAY_LAYERS } from "../src/v5/atlas-explorer-model.mjs";
import { projectV5Atlas } from "../src/v5/atlas-layout.mjs";
import { replayPublicGraphHistory } from "../src/v5/public-graph-history.mjs";

const at = Date.parse("2026-11-07T20:00:00.000Z");
const graph = projectV5Atlas(replayPublicGraphHistory([], at));

test("unfiltered public catalog includes exactly approved eight structural roots and no invented relationships", () => {
  const slice = publicAtlasVisibleSlice(graph);
  assert.equal(slice.count, 8);
  assert.equal(slice.linkIndexes.length, 0);
  assert.equal(slice.nodeIds.includes("section:knowledge-overview"), true);
  assert.equal(slice.nodeIds.some(id=>id.includes("private")), false);
  assert.deepEqual(ATLAS_DISPLAY_LAYERS, ["projects", "sections", "reviewed", "relationships"]);
});

test("project and public-section layers can be independently hidden", () => {
  const projects = publicAtlasVisibleSlice(graph, { sections: false });
  assert.equal(projects.count, 7);
  assert.equal(projects.nodeIds.includes("section:knowledge-overview"), false);
  const section = publicAtlasVisibleSlice(graph, { projects: false });
  assert.deepEqual(section.nodeIds, ["section:knowledge-overview"]);
  assert.equal(publicAtlasVisibleSlice(graph, { projects: false, sections: false }).count, 0);
});

test("case-insensitive search matches approved public title only", () => {
  assert.deepEqual(publicAtlasVisibleSlice(graph, { search: "MiZvO" }).nodeIds, ["project:mizvo"]);
  assert.deepEqual(publicAtlasVisibleSlice(graph, { search: "know" }).nodeIds, ["section:knowledge-overview"]);
  assert.equal(publicAtlasVisibleSlice(graph, { search: "private-client" }).count, 0);
  assert.equal(publicAtlasVisibleSlice(graph, { search: "<script>secret</script>" }).count, 0);
});

test("reviewed relationships are separately filterable and cannot be inferred from catalog membership", () => {
  const rel = { from: "project:mizvo", to: "project:merit", type: "documents",
    evidence: "reviewed-public-relation" };
  const authored = { from: "project:mizvo", to: "project:anevum", type: "ambient",
    evidence: "catalog-membership" };
  const augmented = { ...graph, links: [rel, authored] };
  assert.deepEqual(publicAtlasVisibleSlice(augmented).linkIndexes, [0]);
  assert.deepEqual(publicAtlasVisibleSlice(augmented, { relationships: false }).linkIndexes, []);
  assert.deepEqual(publicAtlasVisibleSlice(augmented, { search: "Mizvo" }).linkIndexes, []);
  assert.deepEqual(publicAtlasVisibleSlice(augmented, { projects: false }).linkIndexes, []);
});

test("invalid, oversized or foreign projections fail closed", () => {
  for (const source of [null, undefined, {}, { ...graph, valid: false },
    { ...graph, nodes: Array(97).fill(graph.nodes[0]) },
    { ...graph, links: Array(257).fill(graph.links[0]) }]) {
    assert.deepEqual(publicAtlasVisibleSlice(source), { nodeIds: [], linkIndexes: [], count: 0 });
  }
});
