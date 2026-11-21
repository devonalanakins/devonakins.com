import {localWorkerRequest} from './local-worker-request.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import site from '../.release/worker.mjs';
import {LABORATORY_ROUTES,LABORATORY_REDIRECTS} from '../src/professional/laboratory-routes.mjs';
import {CREATOR_ROUTES,CREATOR_GEAR} from '../src/professional/creator-pages.mjs';
import {approvedPublicProjects} from '../src/publication-manifest.mjs';
const runtime=process.env.LABORATORY_VERIFY_ORIGIN;
if(runtime)assert.match(runtime,/^https:\/\/127\.0\.0\.1:\d+$/);
const get=path=>runtime?localWorkerRequest(runtime,path):site.fetch(new Request('https://devonakins.com'+path));
const health=await(await get('/_health')).json();
assert.equal(health.variant,'laboratory');
for(const [view,path] of Object.entries(LABORATORY_ROUTES)){
 const response=await get(path);assert.equal(response.status,200,path);
 const html=await response.text();
 assert.match(html,new RegExp('data-lab-initial="'+view+'"'));
 assert.match(html,new RegExp('rel="canonical" href="https://devonakins.com'+path+'"'));
 assert.match(html,/lab-destinations/);
 assert.doesNotMatch(html,/data-public-gpt|GPT analytics|\/gpt\/|headshot-concept\.webp|SYNTHETIC QA FIXTURE/);
 assert.match(response.headers.get('content-security-policy'),/connect-src 'self' https:\/\/api\.github\.com;/);
}
// The creator pages must be packaged as first-party HTML, not merely generated source.
for(const path of Object.values(CREATOR_ROUTES)){
 const response=await get(path);
 assert.equal(response.status,200,path);
 assert.match(response.headers.get('content-type')||'',/^text\/html\b/);
 const html=await response.text();
 assert.match(html,new RegExp('rel="canonical" href="https://devonakins.com'+path+'"'));
 assert.match(html,/href="\/podcast\/"/);
 assert.match(html,/href="\/setup\/"/);
 assert.doesNotMatch(html,/<iframe|<form|<script[^>]+src="https?:/);
}
const setupPage=await(await get(CREATOR_ROUTES.setup)).text();
assert.equal((setupPage.match(/class="pc-product"/g)||[]).length,CREATOR_GEAR.length);
assert.match(setupPage,/Ownership unverified/);
assert.match(setupPage,/None configured/);
const podcastPage=await(await get(CREATOR_ROUTES.podcast)).text();
assert.match(podcastPage,/IN DEVELOPMENT · NO EPISODES RELEASED/);
assert.match(podcastPage,/NO PUBLIC EPISODES YET/);
for(const path of Object.values(CREATOR_ROUTES)){
 const redirectResponse=await get(path.slice(0,-1));
 assert.equal(redirectResponse.status,308,path);
 assert.equal(new URL(redirectResponse.headers.get('location')).pathname,path);
}

// The owner-approved portrait must be part of the exact packaged Worker, not
// merely a link in rendered HTML or a local-only build artifact.
const portraitHome=await(await get('/')).text();
assert.match(portraitHome,/class="lab-personal"/);
assert.match(portraitHome,/src="\/professional\/devon-portrait\.avif"/);
assert.doesNotMatch(portraitHome,/\/professional\/cinematic\/[^"]+\.webp/);
const portrait=await get('/professional/devon-portrait.avif');
assert.equal(portrait.status,200,'Approved portrait must be present');
assert.match(portrait.headers.get('content-type')||'',/^image\/avif\b/);
const portraitBytes=new Uint8Array(await portrait.arrayBuffer());
assert.ok(portraitBytes.length>2000&&portraitBytes.length<220000);
assert.equal(new TextDecoder().decode(portraitBytes.slice(4,8)),'ftyp');

// Removed artwork must not be accessible from the new two-dimensional release.
for(const old of ['/professional/cinematic/chamber-wide.webp','/professional/cinematic/chamber-mobile.webp','/professional/cinematic/research.webp','/professional/cinematic/systems.webp','/professional/cinematic/projects.webp','/professional/cinematic/portfolio.webp','/professional/cinematic/fieldnotes.webp']){
 assert.equal((await get(old)).status,404,'Legacy generated image must not be served: '+old);
}
for(const p of approvedPublicProjects){
 const response=await get('/work/'+p.slug+'/');assert.equal(response.status,200,p.slug);
 const html=await response.text();assert.match(html,/lab-case-study/);assert.ok(html.includes(p.title.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")));
 assert.doesNotMatch(html,/data-public-gpt|\/gpt\//);
}
for(const [from,to]of Object.entries(LABORATORY_REDIRECTS)){
 const response=await get(from+'?keep=query');assert.equal(response.status,308,from);
 assert.equal(new URL(response.headers.get('location')).pathname,to);assert.equal(new URL(response.headers.get('location')).search,'?keep=query');
 assert.equal(response.headers.get('cache-control'),'no-store');
}
for(const path of ['/gpt/snapshots/2026-11-10.json','/g%70t/snapshots/2026-11-10.json','/v2/','/v2/usage-snapshot.json','/not-a-real-laboratory-page-404/'])assert.equal((await get(path)).status,404,path);
for(const path of ['/v2/listening-owner.css','/v2/gpt-owner.js','/v2/presence-owner.js'])assert.equal((await get(path)).status,200,'Owner resource preserved: '+path);
const publicSignal=await(await get('/api/activity/v4')).json();assert.equal(Object.hasOwn(publicSignal,'gpt'),false);
assert.equal((await get('/owner/gpt/')).status,403);
const worker=await readFile('.release/worker.mjs','utf8');assert.match(worker,/professionalCandidate:false,laboratoryCandidate:true/);
const sitemap=await(await get('/sitemap.xml')).text();assert.doesNotMatch(sitemap,/\/gpt\//);
console.log('Cinematic packaged Worker: public routes, approved cases, reversible redirects, approved AVIF portrait, retired analytics, owner resources, CSP and exact variant passed.');
