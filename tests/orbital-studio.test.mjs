import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {renderStudioOrbitalTree} from "../src/professional/orbital-tree.mjs";
import {renderOneScreenHome} from "../src/professional/one-screen.mjs";

test("orbital-tree is a deterministic first-party visual, never a telemetry source",()=>{
  const one=renderStudioOrbitalTree(),two=renderStudioOrbitalTree();
  assert.equal(one,two);
  assert.match(one,/class="studio-orbital-art" aria-hidden="true"/);
  assert.match(one,/viewBox="0 0 616 610"/);
  assert.match(one,/studio-orbit--outer/);
  assert.match(one,/studio-orbit--inner/);
  assert.match(one,/studio-orbit--cross/);
  assert.ok((one.match(/<path /g)||[]).length>=35);
  assert.ok((one.match(/<circle /g)||[]).length>=180);
  assert.doesNotMatch(one.replace('xmlns="http://www.w3.org/2000/svg"',""),/https?:\/\/|<script|<iframe|access_token|github|spotify|gpt|analytics/i);
});
test("Living Studio hero integrates the orbital visual without duplicating provider cards",()=>{
  const page=renderOneScreenHome();
  assert.match(page,/Independent thinking/);
  assert.match(page,/Living systems/);
  assert.match(page,/Software engineering · Product design · Operations/);
  assert.match(page,/href="\/src\/professional\/orbital-studio.css"/);
  assert.equal((page.match(/class="studio-orbital-art"/g)||[]).length,1);
  assert.equal((page.match(/data-public-spotify/g)||[]).length,1);
  assert.equal((page.match(/data-public-github-feed/g)||[]).length,2);
  assert.equal((page.match(/data-public-threads/g)||[]).length,1);
  assert.equal((page.match(/role="tabpanel"/g)||[]).length,6);
});
test("motion respects OS reduced-motion and site pause, with no remote visual dependency",async()=>{
  const css=await readFile(new URL("../src/professional/orbital-studio.css",import.meta.url),"utf8");
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.one-world\[data-motion="off"\]/);
  assert.match(css,/animation-play-state:paused/);
  assert.match(css,/\.studio-orbital-tree/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.doesNotMatch(css,/@import|url\(\s*['"]?https?:\/\/|https:\/\/fonts\./);
});
