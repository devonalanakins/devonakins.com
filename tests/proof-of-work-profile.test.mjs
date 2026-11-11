import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderOneScreenHome} from '../src/professional/one-screen.mjs';
import {qualityGates} from '../src/professional/working-standard.mjs';
const html=renderOneScreenHome();
test('proof-of-work explorer exposes four independent acceptance gates without claiming they all passed',()=>{
  assert.equal(qualityGates.length,4);
  for(const gate of qualityGates){
    assert.match(html,new RegExp('data-method-select="'+gate.key+'"'));
    assert.match(html,new RegExp('data-method-panel="'+gate.key+'"'));
    assert.ok(gate.proof.startsWith('Acceptance:'));
  }
  assert.match(html,/FINISHED/);
  assert.match(html,/supported by evidence/);
  assert.match(html,/href="\/src\/professional\/working-standard.ts"/);
  assert.doesNotMatch(html,/100% complete|all checks passed|Nona Neuropsychology/);
});
test('activity workstation filters verified events and supports explicit refresh',async()=>{
  for(const kind of ['all','push','pull_request','issue','release'])
    assert.match(html,new RegExp('data-github-filter="'+kind+'"'));
  assert.match(html,/data-github-refresh/);
  const client=await readFile(new URL('../src/professional/client.ts',import.meta.url),'utf8');
  assert.match(client,/snapshot.events.filter\(x=>kind==="all"\|\|x.kind===kind\)/);
  assert.match(client,/refreshButtons.forEach\(button=>button.addEventListener/);
  assert.match(client,/button.disabled=true/);
  assert.match(client,/button.disabled=false/);
  assert.match(client,/readBrowserGithubFallback/);
});
test('quality interaction is source-isolated and keyboard accessible',async()=>{
  const code=await readFile(new URL('../src/professional/working-standard.ts',import.meta.url),'utf8');
  assert.match(code,/aria-pressed/);
  assert.match(code,/ArrowRight/);
  assert.match(code,/ArrowLeft/);
  assert.match(code,/Home/);
  assert.match(code,/End/);
  assert.doesNotMatch(code,/fetch\(|localStorage|sessionStorage/);
  const css=await readFile(new URL('../src/professional/prestige-profile.css',import.meta.url),'utf8');
  assert.match(css,/\.one-method-workbench/);
  assert.match(css,/\.one-activity-tools/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
