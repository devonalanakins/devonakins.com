import {CREATOR_ROUTES,creatorPaths} from "../src/professional/creator-pages.mjs";
import {FIELDNOTES} from "../src/professional/fieldnotes.mjs";
/** Read-only post-release acceptance; never changes a provider, token or owner preference. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LABORATORY_ROUTES,LABORATORY_REDIRECTS} from '../src/professional/laboratory-routes.mjs';
import {approvedPublicProjects} from '../src/publication-manifest.mjs';
import {validPublicListening} from './validate-public-listening.mjs';
const origin=(process.env.VERIFY_ORIGIN||'https://devonakins.com').replace(/\/+$/,'');
const expected=process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA;
assert.match(origin,/^https:\/\/[a-z0-9.-]+$/i);assert.match(expected||'',/^[a-f0-9]{40}$/);
const release=JSON.parse(await readFile('.release/release.json','utf8'));assert.equal(release.commit,expected);assert.equal(release.variant,'laboratory');
const get=(path,init={})=>fetch(origin+path,{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000),...init});
let serving=false;
for(let i=0;i<10;i++){
 try{const r=await get('/_health');const h=await r.json();if(r.status===200&&h.commit===expected&&h.variant==='laboratory'){serving=true;break}}catch{}
 if(i<9)await new Promise(resolve=>setTimeout(resolve,4000));
}
assert.ok(serving,'Expected cinematic commit is not serving');
const paths=[...Object.values(LABORATORY_ROUTES),'/listening/',...Object.keys(FIELDNOTES),...approvedPublicProjects.map(p=>'/work/'+p.slug+'/')];
for(const path of paths){
 const r=await get(path);assert.equal(r.status,200,path);const html=await r.text();
 assert.match(html,/lab-body/);assert.match(html,new RegExp('rel="canonical" href="https://devonakins.com'+path+'"'));
 assert.doesNotMatch(html,/data-public-gpt|\/gpt\/|GPT analytics|SYNTHETIC QA FIXTURE|TEST FIXTURE/);
 assert.equal(r.headers.get('x-content-type-options'),'nosniff');
 assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
 assert.match(r.headers.get('content-security-policy')||'',/connect-src 'self' https:\/\/api\.github\.com;/);
}
for (const path of creatorPaths) {
 const response = await get(path);
 assert.equal(response.status, 200, path);
 assert.match(response.headers.get('content-security-policy') || '', /media-src 'self'/);
 const html = await response.text();
 assert.ok(html.includes('href="https://devonakins.com' + path + '"'), path);
 assert.doesNotMatch(html, /<iframe|autoplay|TEST FIXTURE/);
 if (path === CREATOR_ROUTES.podcast) assert.match(html, /<title>Devon Alan Akins — Podcast<\/title>/);
}
for(const [from,to]of Object.entries(LABORATORY_REDIRECTS)){
 const r=await get(from);assert.equal(r.status,308,from);assert.equal(new URL(r.headers.get('location'),origin).pathname,to);
}
for(const path of ['/gpt/snapshots/2026-11-10.json','/v2/','/v2/usage-snapshot.json','/not-a-real-route/'])assert.equal((await get(path)).status,404,path);
assert.doesNotMatch(await(await get('/sitemap.xml')).text(),/\/gpt\//);
// Production must serve the actual approved original portrait with the
// correct MIME, not a missing image or a rendered placeholder.
const home=await(await get('/')).text();
assert.match(home,/class="lab-personal"/);
assert.match(home,/src="\/professional\/devon-portrait\.avif"/);
assert.doesNotMatch(home,/\/professional\/cinematic\/[^"]+\.webp|data-lab-scene-canvas|cinematic-environment\.ts/);
// Ensure social scrapers and installed PWA clients receive the intended new identity.
assert.ok(home.includes('property="og:image" content="https://devonakins.com/social-card.jpg"'),'Open Graph image is declared');
assert.ok(home.includes('name="twitter:card" content="summary_large_image"'),'Twitter large card is declared');
assert.ok(home.includes('rel="apple-touch-icon" href="/apple-touch-icon.png"'),'iOS icon is declared');
assert.ok(home.includes('rel="manifest" href="/manifest.webmanifest"'),'PWA manifest is declared');
const shareImage=await get('/social-card.jpg');
assert.equal(shareImage.status,200,'Social preview image exists');
assert.match(shareImage.headers.get('content-type')||'',/^image\/jpeg/);
const shareBytes=new Uint8Array(await shareImage.arrayBuffer());
assert.ok(shareBytes.length>12000&&shareBytes.length<300000,'Social image is complete and optimized');
assert.equal(shareBytes[0],0xff);
assert.equal(shareBytes[1],0xd8);
for(const route of ['/favicon.svg','/favicon-32.png','/apple-touch-icon.png','/icon-192.png','/icon-512.png','/icon-maskable-512.png']){
 const asset=await get(route);
 assert.equal(asset.status,200,'Required branded asset '+route);
 assert.equal(asset.headers.get('x-content-type-options'),'nosniff',route);
}
const favicon=await(await get('/favicon.svg')).text();
assert.match(favicon,/#2948d3/i);
assert.match(favicon,/>da\.<\/text>/);
const appManifest=await(await get('/manifest.webmanifest')).json();
assert.equal(appManifest.theme_color,'#f3f1e9');
assert.equal(appManifest.background_color,'#f3f1e9');
const photo=await get('/professional/devon-portrait.avif');
assert.equal(photo.status,200,'Approved portrait asset');
assert.match(photo.headers.get('content-type')||'',/^image\/avif\b/);
assert.equal(photo.headers.get('x-content-type-options'),'nosniff');
const image=new Uint8Array(await photo.arrayBuffer());
assert.ok(image.length>2000&&image.length<220000,'Portrait transfer is complete and optimized');
assert.equal(new TextDecoder().decode(image.slice(4,8)),'ftyp');
// Removed artwork must not be accessible from the new two-dimensional release.
for(const old of ['/professional/cinematic/chamber-wide.webp','/professional/cinematic/chamber-mobile.webp','/professional/cinematic/research.webp','/professional/cinematic/systems.webp','/professional/cinematic/projects.webp','/professional/cinematic/portfolio.webp','/professional/cinematic/fieldnotes.webp']){
 assert.equal((await get(old)).status,404,'Legacy generated image must not be served: '+old);
}
const listening=await get('/api/listening/now');assert.equal(listening.status,200);assert.ok(validPublicListening(await listening.json()));
const signal=await get('/api/activity/v4');assert.equal(signal.status,200);const data=await signal.json();assert.equal(Object.hasOwn(data,'gpt'),false);
const github=await get('/api/github/public-feed');assert.equal(github.status,200);assert.ok(['available','empty','unavailable'].includes((await github.json()).status));
assert.equal((await get('/api/github/public-feed',{method:'POST'})).status,405);
for(const path of ['/owner/gpt/','/owner/listening/','/owner/presence/','/owner/github/']){
 const r=await get(path);assert.ok([302,303,403].includes(r.status),path);
 assert.doesNotMatch(r.headers.get('content-security-policy')||'',/api\.github\.com/);
}
const www=await fetch('https://www.devonakins.com/',{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(www.status,308);assert.equal(new URL(www.headers.get('location')).hostname,'devonakins.com');
console.log('LIVE verified cinematic portfolio at '+expected+': exact Worker, all public routes/cases and the approved portrait asset, retired analytics, sourced playback/history, owner protections, security headers and www redirect.');
