import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Exercise the actual first-party TypeScript client without adding a DOM vendor.
const source = await readFile(new URL("../src/listening-collections-client.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { startCollections } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

const playlist = {
  version: 1, status: "available", checkedAt: new Date().toISOString(),
  playlists: [{
    id: "1234567890123456789012", title: "Synthetic playlist",
    url: "https://open.spotify.com/playlist/1234567890123456789012", image: null,
  }],
};
const response = value => new Response(JSON.stringify(value), {
  headers: { "Content-Type": "application/json" },
});
async function until(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail("Client did not perform required queued refresh");
}
function element() {
  return {
    hidden: true, textContent: "", children: [],
    append(child) { this.children.push(child); },
    replaceChildren(fragment) {
      this.children = fragment ? [...fragment.children] : [];
    },
  };
}

test("visibility changes coalesce busy playlist requests and never expose a stale response", async () => {
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    fetch: globalThis.fetch,
  };
  const list = element(), note = element(), state = element();
  const listeners = new Map();
  const nodes = new Map([
    ["#listening-playlists", list],
    ["#listening-playlist-note", note],
    ["#listening-playlist-state", state],
  ]);
  const pending = [];
  globalThis.document = {
    hidden: false,
    querySelector: selector => nodes.get(selector) ?? null,
    createDocumentFragment: element,
    createElement: element,
    addEventListener: (name, fn) => listeners.set(name, fn),
  };
  globalThis.window = {
    setInterval: () => 1,
    addEventListener: (name, fn) => listeners.set(name, fn),
  };
  globalThis.fetch = () => new Promise(resolve => pending.push(resolve));

  const change = () => listeners.get("visibilitychange")();
  try {
    startCollections();
    assert.equal(pending.length, 1);
    // The original request is held while an owner-sharing refresh is requested.
    change();
    assert.equal(list.hidden, true);
    assert.equal(pending.length, 1);
    pending[0](response({ version: 1, status: "hidden" }));
    await until(() => pending.length === 2);
    assert.equal(list.children.length, 0);

    pending[1](response(playlist));
    await until(() => list.children.length === 1);
    assert.equal(list.hidden, false);
    assert.equal(list.children[0].href, playlist.playlists[0].url);

    // Two fast visibility transitions: ignore an obsolete available payload,
    // then honour a fresh revocation. No stale playlist may flash publicly.
    change();
    assert.equal(list.hidden, true);
    assert.equal(pending.length, 3);
    change();
    assert.equal(pending.length, 3);
    pending[2](response(playlist));
    await until(() => pending.length === 4);
    assert.equal(list.hidden, true);
    assert.equal(list.children.length, 0);
    pending[3](response({ version: 1, status: "hidden" }));
    await until(() => state.textContent === "NOT SHARING");
    assert.equal(list.children.length, 0);
    assert.equal(list.hidden, true);
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete globalThis[key];
      else globalThis[key] = saved[key];
    }
  }
});
