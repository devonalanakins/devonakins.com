import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderOneScreenHome} from '../src/professional/one-screen.mjs';
const html=renderOneScreenHome({motionAssetAvailable:true});
test('concept fidelity: hero, sourced workstation, quality, process, projects and activity ribbon exist',()=>{
  for(const marker of ['concept-intro','concept-visual','concept-live','concept-signal-band',
    'concept-process','concept-quality','concept-featured','concept-focus','concept-activity-ribbon'])
      assert.match(html,new RegExp('class="[^"]*'+marker));
  assert.equal((html.match(/data-process-step=/g)||[]).length,6);
  assert.equal((html.match(/data-concept-gate=/g)||[]).length,4);
  assert.match(html,/data-github-highlights/);
  assert.match(html,/concept-feed-filters/);
  for(const filter of ['all','push','pull_request']) assert.match(html,new RegExp('data-github-filter="'+filter+'"')); 
  assert.match(html,/data-github-count="push"/);
  assert.match(html,/data-github-spark/);
  assert.match(html,/data-public-github-feed/);
  assert.match(html,/data-public-spotify/);
  assert.match(html,/data-public-work data-work-mode="idle"/);
  assert.match(html,/data-public-gpt/);
  assert.doesNotMatch(html,/99\.9%|100% Operational|actively developing|live coding confirmed|Nona PR/i);
});
test('new navigation stays a six-view viewport, with no external dependencies',async()=>{
  assert.equal((html.match(/role="tabpanel"/g)||[]).length,6);
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,6);
  assert.match(html,/concept-console\.css/);
  assert.match(html,/concept-console\.ts/);
  const css=await readFile(new URL('../src/professional/concept-console.css',import.meta.url),'utf8');
  const ts=await readFile(new URL('../src/professional/concept-console.ts',import.meta.url),'utf8');
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
  assert.match(ts,/ArrowRight/);
  assert.match(ts,/Home/);
  assert.doesNotMatch(ts,/fetch\(|localStorage|sessionStorage|Date\.now/);
});
test('public event filters remain synchronized in homepage and the Activity panel',async()=>{
  const client=await readFile(new URL('../src/professional/client.ts',import.meta.url),'utf8');
  assert.match(client,/item\.dataset\.githubFilter===kind/);
  assert.doesNotMatch(client,/item===filter/);
  assert.match(html,/data-github-refresh/);
  assert.match(html,/data-github-highlights/);
});

test('observed activity visualization is data-backed and clears on source outage',async()=>{
  const client=await readFile(new URL('../src/professional/client.ts',import.meta.url),'utf8');
  assert.match(client,/function paintPublicEventSpark/);
  assert.match(client,/snapshot\.events/);
  assert.match(client,/graph\.replaceChildren\(\)/);
  assert.match(client,/No activity inferred|no activity inferred/);
  assert.doesNotMatch(client.slice(client.indexOf('function paintPublicEventSpark'),client.indexOf('function paint(){')),/Math\.random|setInterval|fake activity/i);
});

test('work-feed indicator is neutral without observed public events and chart matches push count',async()=>{
  const css=await readFile(new URL('../src/professional/concept-console.css',import.meta.url),'utf8');
  const client=await readFile(new URL('../src/professional/client.ts',import.meta.url),'utf8');
  assert.match(css,/concept-activity-ribbon\[data-source="observed"\]/);
  assert.match(client,/ribbon\.dataset\.source=observed\.length>0/);
  assert.match(client,/event\.kind!=="push"/);
  assert.match(client,/observed public push event/);
});

test('reduced-motion homepage retains the approved still neural-cosmos focal image',async()=>{
  const css=await readFile(new URL('../src/professional/concept-console.css',import.meta.url),'utf8');
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.one-body \.concept-visual\s*\{/);
  assert.match(css,/url\('\/professional\/living-atmosphere\.png'\)/);
  assert.doesNotMatch(css,/url\(['"]?https?:/i);
});
