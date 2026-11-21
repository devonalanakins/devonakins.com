import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHandler} from '../src/worker.mjs';
import {renderResearchFacilityHome} from '../src/professional/research-facility.mjs';
import {renderCreatorPage} from '../src/professional/creator-pages.mjs';
import {approvedPublicProjects} from '../src/publication-manifest.mjs';
import {LABORATORY_ROUTES,LABORATORY_REDIRECTS} from '../src/professional/laboratory-routes.mjs';
import {validatePublicAnalytics} from '../scripts/validate-public-analytics.mjs';
const asset=(body,type='text/html')=>({type,etag:'"test"',gzip:gzipSync(body).toString('base64')});
const assets={'/watch/index.html':asset('<html lang="en"><main>Watch</main></html>'),'/live/index.html':asset('<html lang="en"><main>Live</main></html>'),'/podcast/index.html':asset('<html lang="en"><main>Podcast</main></html>'),'/about/index.html':asset(renderCreatorPage('/about/')),'/index.html':asset(renderResearchFacilityHome()),'/gpt/index.html':asset('historical source'),'/gpt/snapshots/test.json':asset('{"history":true}','application/json'),'/v2/usage-snapshot.json':asset('{}','application/json'),'/v2/index.html':asset('legacy page'),'/v2/gpt-owner.js':asset('/* protected owner controller */','text/javascript'),'/404/index.html':asset('not found')};
const make=laboratory=>createHandler(assets,{version:'test',commit:'test'},{laboratoryCandidate:laboratory,githubFetch:async()=>new Response('[]',{headers:{'content-type':'application/json'}})});
const get=(site,path)=>site.fetch(new Request('https://devonakins.com'+path));

test('ongoing anonymous smoke requires retired analytics absent only on the serving cinematic variant',()=>{
 const snapshot={state:'snapshot',metric:'profile_7d_tokens',count:12,asOf:'2026-11-10T00:00:00Z',sourceUpdatedAt:null,freshness:'historical'};
 assert.doesNotThrow(()=>validatePublicAnalytics({}, {variant:'laboratory'}));
 for(const gpt of [null,{state:'disconnected',count:null},snapshot])
  assert.throws(()=>validatePublicAnalytics({gpt},{variant:'laboratory'}),/omit retired analytics/);
 assert.doesNotThrow(()=>validatePublicAnalytics({gpt:snapshot},{}));
 assert.doesNotThrow(()=>validatePublicAnalytics({gpt:{state:'disconnected',count:null}},{}));
 assert.throws(()=>validatePublicAnalytics({},{}));
 assert.throws(()=>validatePublicAnalytics({gpt:{...snapshot,count:-1}},{}));
});

test('release retirement is reversible and preserves private owner resources',async()=>{
 const site=make(true),baseline=make(false);
 for(const [from,to] of Object.entries(LABORATORY_REDIRECTS)){
  const r=await get(site,from+'?keep=query');assert.equal(r.status,308);assert.equal(new URL(r.headers.get('location')).pathname,to);assert.equal(new URL(r.headers.get('location')).search,'?keep=query');assert.equal(r.headers.get('cache-control'),'no-store');
 }
 for(const path of ['/gpt/snapshots/test.json','/g%70t/snapshots/test.json','/v2/usage-snapshot.json','/v2/'])assert.equal((await get(site,path)).status,404,path);
 assert.equal((await get(baseline,'/gpt/')).status,200);assert.equal((await get(baseline,'/gpt/snapshots/test.json')).status,200);
 assert.equal((await get(site,'/v2/gpt-owner.js')).status,200);
 assert.equal((await get(site,'/owner/gpt/')).status,403);
 const publicSignal=await(await get(site,'/api/activity/v4')).json();assert.equal(Object.hasOwn(publicSignal,'gpt'),false);
 const oldSignal=await(await get(baseline,'/api/activity/v4')).json();assert.equal(Object.hasOwn(oldSignal,'gpt'),true);
 const response=await get(site,'/');assert.match(response.headers.get('content-security-policy'),/connect-src 'self' https:\/\/api\.github\.com;/);
 assert.doesNotMatch((await get(baseline,'/')).headers.get('content-security-policy'),/api\.github\.com/);
});
test('About is a genuine public page, not an alias for the older portfolio',async()=>{
 const site=make(true);
 assert.equal(Object.hasOwn(LABORATORY_REDIRECTS,'/about/'),false);
 assert.equal(LABORATORY_ROUTES.portfolio,'/portfolio/');
 const response=await get(site,'/about/');
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/<title>About — Devon Alan Akins<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/devonakins\.com\/about\/"/);
 assert.match(html,/href="\/about\/" aria-current="page">About<\/a>/);
});

test('video frame permissions apply only to approved Watch routes, never to unrelated pages',async()=>{
 const site=make(true),baseline=make(false);
 const watch=await get(site,'/watch/');
 assert.equal(watch.status,200);
 const policy=watch.headers.get('content-security-policy')||'';
 assert.match(policy,/(?:^|;\s*)frame-src https:\/\/iframe\.videodelivery\.net(?:;|$)/);
 assert.match(policy,/connect-src 'self' https:\/\/api\.github\.com;/);
 for(const path of ['/','/podcast/','/live/','/watch/unapproved/']){
   const response=await get(site,path);
   assert.doesNotMatch(response.headers.get('content-security-policy')||'',/frame-src|iframe\.videodelivery\.net/,path);
 }
 assert.doesNotMatch((await get(baseline,'/watch/')).headers.get('content-security-policy')||'',/frame-src|videodelivery/);
});
test('all public routes render their selected section and projects require explicit publication approval',()=>{
 for(const [view,path]of Object.entries(LABORATORY_ROUTES)){
  const html=renderResearchFacilityHome({initialView:view,canonicalPath:path});
  assert.match(html,new RegExp('data-lab-initial="'+view+'"'));
  assert.match(html,new RegExp('rel="canonical" href="https://devonakins.com'+path+'"'));
  assert.match(html,new RegExp('id="one-panel-'+view+'"[^>]+tabindex="-1">'));
  assert.doesNotMatch(html,/href="\/gpt\/"|data-public-gpt/);
 }
 assert.throws(()=>renderResearchFacilityHome({project:{title:'UNAPPROVED'}}),/not approved/);
 for(const project of approvedPublicProjects){const html=renderResearchFacilityHome({initialView:'portfolio',project,canonicalPath:'/work/'+project.slug+'/'});assert.match(html,/lab-case-study/);assert.match(html,/What is not claimed/);assert.doesNotMatch(html,/href="\/gpt\/"/);}
});
