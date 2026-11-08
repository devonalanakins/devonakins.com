import test from "node:test";
import assert from "node:assert/strict";
import { fitPublicAtlasCamera } from "../src/v5/atlas-camera-fit.mjs";
import { replayPublicGraphHistory } from "../src/v5/public-graph-history.mjs";
import { projectV5Atlas } from "../src/v5/atlas-layout.mjs";

const layout = projectV5Atlas(replayPublicGraphHistory([], Date.parse("2026-11-07T20:00:00Z")));
const roots = layout.nodes;
const rad = Math.PI / 180;

function ndc(point, fit, aspect) {
  const slope = fit.pitch;
  const sin = slope / Math.sqrt(1+slope*slope);
  const cos = 1 / Math.sqrt(1+slope*slope);
  const depth = fit.distance / cos - (point[1]*sin + point[2]*cos);
  const tan = Math.tan(22*rad);
  return { x: point[0] / (depth*tan*aspect),
    y: (point[1]*cos - point[2]*sin) / (depth*tan) };
}

test("fit all eight approved public roots in the narrow desktop 3-column viewport", () => {
  assert.equal(layout.valid, true);
  assert.equal(roots.length, 8);
  const fit = fitPublicAtlasCamera(roots, 520, 700);
  assert.ok(fit.distance > 13.2);
  for (const node of roots) {
    const p = ndc(node.position, fit, 520/700);
    assert.ok(Math.abs(p.x) < .85 && Math.abs(p.y) < .85, node.id);
  }
});

test("responsive framing stays deterministic across common phone and desktop widths", () => {
  const phone = fitPublicAtlasCamera(roots, 390, 330);
  const desktop = fitPublicAtlasCamera(roots, 520, 700);
  const wide = fitPublicAtlasCamera(roots, 900, 580);
  assert.deepEqual(fitPublicAtlasCamera(roots, 520, 700), desktop);
  assert.ok(phone.distance >= 13.2 && phone.distance < desktop.distance);
  assert.ok(wide.distance >= 13.2 && wide.distance < desktop.distance);
  assert.ok(desktop.distance <= 60);
});

test("bad sizes and hostile coordinates revert to the fixed safe camera", () => {
  const fallback = { distance: 13.2, pitch: .24 };
  for (const bad of [null, {}, [], roots.slice(1),
    [...roots, ...Array(100).fill(roots[0])],
    roots.map((r,i) => i===0 ? { ...r, position:[Infinity,1,2] } : r),
    roots.map((r,i) => i===0 ? { ...r, position:[100,1,2] } : r)]) {
    assert.deepEqual(fitPublicAtlasCamera(bad, 520, 700), fallback);
  }
  assert.deepEqual(fitPublicAtlasCamera(roots, 0, 700), fallback);
  assert.deepEqual(fitPublicAtlasCamera(roots, 520, NaN), fallback);
});
