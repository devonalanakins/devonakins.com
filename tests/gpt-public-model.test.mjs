import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicGptReadings, featuredPublicGpt, publicGptMetrics} from '../src/gpt-public-model.mjs';
import {renderPublicGptProfile} from '../src/gpt-profile.mjs';
const at=Date.parse('2026-11-07T18:00:00.000Z');
const row=(metric,value=15)=>({metric,...publicGptMetrics[metric],value,asOf:new Date(at-1000).toISOString(),sourceUpdatedAt:null,freshness:'recent'});

test('public approved readings retain scope and source dates in stable metric order',()=>{
  const readings=publicGptReadings([row('business_7d_messages'),row('work_codex_credits_used',1.5),row('profile_7d_tokens')],at);
  assert.deepEqual(readings.map(r=>r.metric),['profile_7d_tokens','work_codex_credits_used','business_7d_messages']);
  assert.equal(readings[0].asOf,new Date(at-1000).toISOString());
  assert.equal(readings[1].value,1.5);
  const old=row('profile_7d_tokens');old.asOf=new Date(at-86400001).toISOString();
  assert.equal(publicGptReadings([old],at)[0].freshness,'historical','client ages a reading even before the next server poll');
});

test('fixed headline never substitutes credits, messages, streak or lifetime tokens',()=>{
  for(const metric of Object.keys(publicGptMetrics)) {
    const data={...row(metric),state:'snapshot',count:15};
    assert.equal(featuredPublicGpt(data,at)?.metric||null,metric==='profile_7d_tokens'?metric:null);
  }
  assert.equal(featuredPublicGpt({state:'disconnected',count:null,observations:[row('profile_7d_tokens')]},at),null);
});

test('malformed and duplicate observations fail closed; labels are contract-owned',()=>{
  const valid=row('profile_7d_messages');
  for(const mutate of [r=>r.metric='private',r=>r.value='15',r=>r.value=-1,r=>r.value=1.2,
    r=>r.value=1e20,r=>r.source='api-verified',r=>r.scope='work-codex',r=>r.unit='credits',
    r=>r.asOf=new Date(at+60001).toISOString(),r=>r.asOf='invalid',r=>r.sourceUpdatedAt=r.asOf]) {
    const bad={...valid};mutate(bad);
    assert.deepEqual(publicGptReadings([bad],at),[]);
  }
  assert.deepEqual(publicGptReadings([valid,valid],at),[]);
  assert.deepEqual(publicGptReadings(Array(9).fill(valid),at),[]);
  assert.deepEqual(publicGptReadings(undefined,at),[]);
  assert.equal(publicGptReadings([{...valid,label:'<img onerror=alert(1)>',privateText:'secret'}],at)[0].label,'7-day messages');
  assert.ok(!JSON.stringify(publicGptReadings([{...valid,privateText:'secret'}],at)).includes('secret'));
});

test('modern GPT readings precede a clearly dated, independently preserved archive',()=>{
  const snapshot=JSON.parse(readFileSync(new URL('../public/v2/usage-snapshot.json',import.meta.url)));
  const html=renderPublicGptProfile(snapshot);
  assert.ok(html.indexOf('id="gpt-v4-snapshot-panel"')<html.indexOf('id="gpt-archive-heading"'));
  assert.ok(html.indexOf('Historical archive.')<html.indexOf('≈2.7B'));
  assert.match(html,/PERSONAL PROFILE \/ 7-DAY TOKENS/);
  assert.match(html,/id="gpt-v4-observations"[^>]*role="list"/);
  assert.equal((html.match(/id="gpt-public-development-heading"/g)||[]).length,1);
  assert.equal((html.match(/id="gpt-public-activity"/g)||[]).length,1);
  assert.match(html,/November 4 capture is preserved/);
});
