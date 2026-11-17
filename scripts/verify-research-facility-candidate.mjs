import assert from 'node:assert/strict';
import assets from '../.release/assets.mjs';
import {createHandler} from '../src/worker.mjs';

const site=createHandler(assets,{version:'computational-laboratory-candidate',commit:'candidate'},{professionalCandidate:false});
const get=path=>site.fetch(new Request('https://devonakins.com'+path));
const html=await(await get('/')).text();
assert.match(html,/Devon Alan Akins — Computational Laboratory/);
assert.match(html,/lab-overview/);
assert.match(html,/Mathematical Field/);
assert.match(html,/data-public-github-feed/);
assert.match(html,/data-public-spotify/);
assert.match(html,/data-public-gpt/);
assert.doesNotMatch(html,/headshot-concept\.webp|PRIVATE REPO CONTENT|fictional live work/i);
for(const route of ['/work/','/about/','/gpt/','/contact/']){
  const response=await get(route);
  assert.equal(response.status,200,route);
  assert.match(await response.text(),/<html/i,route);
}
const missing=await get('/not-a-real-laboratory-page-404/');
assert.equal(missing.status,404);
const headers=await get('/');
assert.match(headers.headers.get('content-type')||'','text/html');
const worker=await(await import('node:fs/promises')).readFile('.release/worker.mjs','utf8');
assert.match(worker,/professionalCandidate:false/);
console.log('Laboratory candidate: source-qualified landing, retained deep links, 404 and packaged Worker passed.');
