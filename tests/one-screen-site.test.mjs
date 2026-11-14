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
  assert.match(html,/mailto:hello@devonakins\.com/);
  assert.doesNotMatch(html,/headshot-concept\.webp|one-portrait/,"No portrait imagery or placeholders in the one-screen homepage");
});
test("one-screen presentation remains first-party, motion-aware and viewport contained",async()=>{
  const css=await readFile(new URL("../src/professional/one-screen.css",import.meta.url),"utf8");
  const js=await readFile(new URL("../src/professional/one-screen.ts",import.meta.url),"utf8");
  const page=await readFile(new URL("../scripts/pages.mjs",import.meta.url),"utf8");
  assert.match(css,/height:100dvh/);
  assert.match(css,/overflow:hidden/);
  assert.match(css,/\.one-home-layout\{height:100%;display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.07fr\)/);
  assert.doesNotMatch(css,/\.one-portrait/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/@import|https:\/\/fonts\./);
  assert.match(js,/aria-selected/);
  assert.match(js,/ArrowRight/);
  assert.match(js,/hashchange/);
  assert.match(js,/addEventListener\("resize",fitGitHubFeedToViewport\)/);
  assert.match(js,/one-screen-feed-layout/);
  const client=await readFile(new URL("../src/professional/client.ts",import.meta.url),"utf8");
  assert.match(client,/addEventListener\("one-screen-feed-layout"/);
  assert.match(client,/if\(latest\)paint\(\)/);
  assert.match(page,/ONE_SCREEN_SITE_CANDIDATE/);
  assert.match(page,/oneScreenCandidate \? renderOneScreenHome\(\{datedCapture:datedGptCapture,motionAssetAvailable\}\) : professionalCandidate/);
});

const datedCapture=JSON.parse(await readFile(new URL("../public/gpt/snapshots/2026-11-10.json",import.meta.url),"utf8"));
test("redesigned home presents new dated GPT metrics without erasing the older profile",()=>{
  const output=renderOneScreenHome({datedCapture});
  for(const value of ["≈3.3B","526.3M","308 MESSAGES","190 PLUGINS","126 SKILLS","Nov 10, 2026"]){
    assert.ok(output.includes(value),"Missing November 10 metric "+value);
  }
  assert.match(output,/PROFILE LIFETIME/);
  assert.match(output,/LAST 7 DAYS/);
  assert.match(output,/Owner recording · dated, not live/);
  assert.match(output,/href="\/gpt\/"/);
  assert.doesNotMatch(output,/Showcase Sites|Sites by you|estimated daily activity/i);
  assert.match(output,/data-public-spotify/);
  assert.match(output,/data-public-github-feed/);
});
