import test from "node:test";
import assert from "node:assert/strict";
import { publicV5ActivationMode } from "../src/v5/source-activation.mjs";
import { renderV5Preview } from "../src/v5/shell.mjs";

test("only explicitly released home and Signal Field may start the public reader", () => {
  assert.equal(publicV5ActivationMode("/", "released-v5"), "automatic");
  assert.equal(publicV5ActivationMode("/signal-field/", "released-v5"), "automatic");
  for (const [path, marker] of [
    ["/", undefined], ["/", ""], ["/", "preview"],
    ["/signal-field/", undefined], ["/signal-field/", ""], ["/signal-field/", "preview"],
    ["/signal-field/?asOf=2026-11-07", "released-v5"],
    ["/__v5_preview__/field/", "preview"],
    ["/__v5_preview__/", "released-v5"],
    ["/__v5_preview__/projects/", "released-v5"],
    ["/__v5_preview__/", undefined],
    ["/work/mizvo/", "released-v5"],
    ["/projects/", "released-v5"],
    ["/?v5=live", "released-v5"],
    ["//", "released-v5"],
  ]) assert.notEqual(publicV5ActivationMode(path, marker), "automatic");
});
test("the real preview always declares manual source activation, never release", () => {
  for (const page of ["home", "projects", "field"]) {
    const html = renderV5Preview(page);
    assert.match(html, /data-v5-signal-mode="preview"/);
    assert.doesNotMatch(html, /data-v5-signal-mode="released-v5"/);
  }
  assert.equal(publicV5ActivationMode("/__v5_preview__/", "preview"), "manual-preview");
});
