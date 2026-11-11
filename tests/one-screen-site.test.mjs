import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {renderOneScreenHome} from "../src/professional/one-screen.mjs";

const html=renderOneScreenHome();
test("one-screen candidate is a single semantic page with six switchable panels",()=>{
  assert.match(html,/<main id="one-stage"/);
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,6,"one heading per switchable panel");
  assert.equal((html.match(/role="tabpanel"/g)||[]).length,6);
  assert.equal((html.match(/role="tablist"/g)||[]).length,2);
  for(const name of ["home","experience","work","activity","writing","contact"]){
    assert.ok(html.includes('id="one-panel-'+name+'"'),name);
    assert.ok(html.includes('data-one-target="'+name+'"'),name);
  }
  assert.match(html,/one-panel-experience[^>]* hidden/);
  assert.match(html,/href="#one-stage"/);
  assert.match(html,/name="viewport"/);
});
test("existing consent-filtered public sources appear without invented live claims",()=>{
  assert.match(html,/data-public-github-feed/);
  assert.match(html,/data-public-spotify/);
  assert.match(html,/data-public-gpt/);
  assert.match(html,/Public GitHub events only/);
  assert.match(html,/not a claim of coding now/);
  assert.doesNotMatch(html,/Pushed \d+ commits|Playing: .* by .*|LIVE NOW|Active editor session/i);
  assert.match(html,/mailto:devon@anevum\.com/);
  assert.match(html,/headshot-concept\.webp/);
});
test("one-screen presentation remains first-party, motion-aware and viewport contained",async()=>{
  const css=await readFile(new URL("../src/professional/one-screen.css",import.meta.url),"utf8");
  const js=await readFile(new URL("../src/professional/one-screen.ts",import.meta.url),"utf8");
  const page=await readFile(new URL("../scripts/pages.mjs",import.meta.url),"utf8");
  assert.match(css,/height:100dvh/);
  assert.match(css,/overflow:hidden/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/@import|https:\/\/fonts\./);
  assert.match(js,/aria-selected/);
  assert.match(js,/ArrowRight/);
  assert.match(js,/hashchange/);
  assert.match(page,/ONE_SCREEN_SITE_CANDIDATE/);
  assert.match(page,/oneScreenCandidate \? renderOneScreenHome\(\) : professionalCandidate/);
});
