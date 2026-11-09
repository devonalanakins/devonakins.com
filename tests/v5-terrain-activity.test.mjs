import test from "node:test";
import assert from "node:assert/strict";
import { terrainPublicSlugs, publicV5TerrainStates } from "../src/v5/field-terrain-state.mjs";

test("terrain catalog matches the eight fixed visible public anchors", () => {
  assert.deepEqual(terrainPublicSlugs, [
    "devonstation", "mizvo", "knowledge-overview", "anevum",
    "rhen-language", "merit", "vesper", "squelch",
  ]);
  assert.ok(Object.isFrozen(terrainPublicSlugs));
});
test("only verified current editor and remote work can light public terrain nodes", () => {
  const projection = {
    available: true,
    nodes: {
      mizvo: { active: { kind: "editor" } },
      merit: { active: { kind: "remote" } },
      vesper: { active: { kind: "remote" }, lastEvent: { kind: "Pull request" } },
      "knowledge-overview": { active: { kind: "editor" } },
      "private-client": { active: { kind: "remote" } },
      anevum: { active: { kind: "historical" } },
    },
  };
  assert.deepEqual({ ...publicV5TerrainStates(projection) }, {
    mizvo: "editor", merit: "remote",
  });
});
test("source revocation, expiry and malformed projections clear the terrain", () => {
  for (const projection of [
    null, undefined, { available: false, nodes: { mizvo: { active: { kind: "editor" } } } },
    { available: true, nodes: [] },
    { available: true, nodes: null },
    { available: true, nodes: { mizvo: { active: { kind: "completed" } } } },
    { available: true, nodes: { mizvo: { active: { kind: "secret" } } } },
  ]) {
    assert.deepEqual(Object.keys(publicV5TerrainStates(projection)), []);
  }
});
test("returned state dictionary cannot be contaminated through prototype names", () => {
  const value = publicV5TerrainStates({
    available: true,
    nodes: JSON.parse('{"__proto__":{"active":{"kind":"editor"}},"rhen-language":{"active":{"kind":"editor"}}}'),
  });
  assert.equal(Object.getPrototypeOf(value), null);
  assert.deepEqual(Object.keys(value), ["rhen-language"]);
});
