import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LABORATORY_ROUTES} from '../src/professional/laboratory-routes.mjs';
import {SITE_PRIMARY_LINKS, SITE_CONTEXT_LINKS, selectedPrimaryHref} from '../src/professional/site-navigation.mjs';
import {renderResearchFacilityHome,lissajousPath} from '../src/professional/research-facility.mjs';
import {approvedPublicProjects} from '../src/publication-manifest.mjs';

const page=renderResearchFacilityHome();

test('laboratory candidate is independently navigable, semantic and source-honest',()=>{
  assert.equal((page.match(/data-one-view=/g)||[]).length,8);
  assert.match(page,/aria-label="Primary navigation"/);
  assert.match(page,/aria-label="More destinations"/);
  assert.doesNotMatch(page,/role="tab(?:list|panel)?"/);
  assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,8);
  for(const key of ['home','experience','systems','work','portfolio','activity','writing','contact']){
    assert.match(page,new RegExp('id="one-panel-'+key+'"'));
  }
  assert.equal(LABORATORY_ROUTES.work,'/work/');
  assert.match(page,/class="lab-work-feature"/);
  assert.match(page,/class="lab-work-method"/);
  assert.match(page,/class="lab-research-journal"/);
  for(const term of ['Devon Alan Akins','MATHEMATICS','PHYSICS','COMPUTATIONAL NEUROSCIENCE',
    'Independent','ANEVUM Open Institute proposal','ANALYTIC MODEL',
    'NO MEASURED DATA','unmerged','Historical curriculum prototype','scientific computing']){
    assert.ok(page.replace(/<[^>]*>/g,' ').toLowerCase().includes(term.toLowerCase()),term);
  }
  assert.match(page,/data-public-github-feed/);
  assert.match(page,/data-public-spotify/);
  assert.match(page,/<img data-spotify-cover[^>]+referrerpolicy="no-referrer"/);
  assert.doesNotMatch(page,/data-public-work|data-work-presentation="editor"/);
  assert.doesNotMatch(page,/data-public-threads|data-threads-summary|data-threads-posts/);
  assert.doesNotMatch(page,/data-public-gpt|\/gpt\/|GPT analytics|token counts|GPT · CAPTURED/i);
  assert.equal((page.match(/data-lab-destination="/g)||[]).length,2);
  assert.equal((page.match(/class="lab-focus-card /g)||[]).length,3);
  assert.match(page,/Nona Neuropsychology/);
  assert.match(page,/02 \/ CREATIVE STUDIO/);
  assert.match(page,/<strong>ANEVUM<\/strong><p>A family creative studio/);
  assert.match(page,/earlier ANEVUM Open Institute proposal/);
  assert.match(page,/Devon<br>Alan Akins/);
  assert.match(page,/Own the model/);
  assert.match(page,/rhen\/pull\/1/);
  assert.match(page,/merit\/blob\/main\/lib\/assess.mjs/);
  assert.doesNotMatch(page,/RESEARCH \/ PROGRAM 001|Nonlinear dynamics|Excitable systems|Accelerated methods|LABORATORY ONLINE|SCHEMATIC \/ NOT MEASURED DATA/);
  assert.doesNotMatch(page,/class="lab-hero-field"/);
  assert.doesNotMatch(page,/<picture|class="lab-scene"|\/professional\/cinematic\/[^"']+\.webp/);
  assert.match(page,/class="da-directions"/);
  assert.equal((page.match(/class="lab-card-print"/g)||[]).length,2);
  assert.doesNotMatch(page,/data-lab-scene-canvas|cinematic-environment\.ts|lab-field-reticle|lab-card-geometry|WebGLRenderer/i);
  for(const key of ['work','experience']){
    assert.match(page,new RegExp('href="'+LABORATORY_ROUTES[key]+'" data-one-go="'+key+'" data-lab-destination="'+key+'"'));
  }
  assert.equal((page.match(/class="lab-signal-tile /g)||[]).length,2);
  assert.match(page,/INDEPENDENT SOFTWARE DEVELOPER/i);
  assert.match(page,/class="lab-explore-heading"/);
  assert.match(page,/Selected public sources/);
  assert.match(page,/class="lab-signal-tile lab-signal-github"/);
  assert.match(page,/class="lab-signal-tile lab-signal-spotify"/);
  assert.match(page,/one-social-icon--threads/);
  assert.doesNotMatch(page,/Recent authorized public Threads posts|No verified editor session/);
  assert.match(page,/Public events only/);
  assert.doesNotMatch(page,/GPU speedup: \d+|active neural network|trained model deployed|LIVE NOW/i);
  assert.doesNotMatch(page,/<iframe|headshot-concept\.webp|Patient:|access_token|private repository/i);
  const unknown=renderResearchFacilityHome({notFound:true});
  assert.match(unknown,/Explore the work or return to the homepage\./);
  assert.doesNotMatch(unknown,/return to the laboratory/i);
});
test('site links drive the Laboratory panels and mark canonical destinations',()=>{
  const navigation=(html,kind)=>html.match(new RegExp(`<nav class="site-${kind}-nav"[^>]*>(.*?)</nav>`))?.[1];
  const hrefs=markup=>[...markup.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
  const selected=markup=>[...markup.matchAll(/href="([^"]+)" aria-current="page"/g)].map(match=>match[1]);
  assert.deepEqual(hrefs(navigation(page,'primary')),SITE_PRIMARY_LINKS.map(link=>link.href));
  assert.deepEqual(hrefs(navigation(page,'secondary')),SITE_CONTEXT_LINKS.map(link=>link.href));
  assert.deepEqual(selected(navigation(page,'primary')),[]);
  assert.ok(page.includes('<a href="/" class="site-brand" aria-current="page" data-one-go="home"'));
  assert.doesNotMatch(page,/role="tab(?:list|panel)?"/);
  assert.match(navigation(page,'primary'),/href="\/work\/" data-one-go="work"/);
  assert.match(navigation(page,'secondary'),/href="\/research\/" data-one-go="experience"/);
  for(const [path,view,primary,secondary] of [
    ["/work/","work",["/work/"],[]], ["/portfolio/","portfolio",["/work/"],[]],
    ["/fieldnotes/","writing",["/fieldnotes/"],[]], ["/research/","experience",[],["/research/"]],
  ]){
    const html=renderResearchFacilityHome({initialView:view,canonicalPath:path});
    assert.deepEqual(selected(navigation(html,'primary')),primary,path);
    assert.deepEqual(selected(navigation(html,'secondary')),secondary,path);
  }
  assert.equal(selectedPrimaryHref('/work/merit/'),'/work/');
  assert.equal(selectedPrimaryHref('/courses/man-of-the-house/start/'),'/courses/');
});

test('Nona executive case study is public, nonclinical, and isolated to its approved project',()=>{
  const entry=approvedPublicProjects.find(p=>p.slug==='operations');
  const other=approvedPublicProjects.find(p=>p.slug==='merit');
  assert.ok(entry && other);
  const nona=renderResearchFacilityHome({project:entry,initialView:'portfolio'});
  const merit=renderResearchFacilityHome({project:other,initialView:'portfolio'});
  assert.match(nona,/Nona Neuropsychology — Operations/);
  assert.match(nona,/Nonclinical operations &amp; technology/);
  assert.match(nona,/PUBLIC OPERATING BRIEF \/ NONCLINICAL/);
  assert.equal((nona.match(/class="da-nona-stream-head"/g)||[]).length,4);
  for(const phrase of ['The first response matters','Make the next step visible',
    'Give work a clear owner','Protect what matters',
    'MEASUREMENT IN PROGRESS','Clinical authority &amp; privacy',
    'Licensed clinicians control evaluations']) assert.ok(nona.includes(phrase),phrase);
  assert.doesNotMatch(nona,/\b(?:reduced|improved) wait times by \d+%|payer contracts signed|patient testimonial/i);
  assert.doesNotMatch(nona, /<script[^>]+src="https?:/);
  assert.doesNotMatch(merit,/da-nona-brief|PUBLIC OPERATING BRIEF/);
  assert.doesNotMatch(page,/da-nona-brief/);
});

test('owner leadership and proven delivery remain first-class without clinical or invented performance claims',()=>{
  assert.match(page,/I build software\. I tell stories\. I ask questions\./);
  const hero=page.match(/<section class="lab-portfolio-hero"[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero,'creator-first hero remains a directly readable semantic section');
  assert.match(hero,/independent software developer, writer and interviewer/);
  assert.doesNotMatch(hero,/Nona Neuropsychology/);
  assert.equal((hero.match(/class="lab-action/g)||[]).length,2,'hero has exactly two visitor actions');
  assert.match(hero,/href="\/work\//);
  assert.match(hero,/href="\/watch\//);
  const discovery=page.match(/<nav class="lab-editorial-links" aria-label="Explore Devon’s work and content">([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(discovery,'the homepage has a direct creator discovery map');
  assert.deepEqual([...discovery.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),
    ['/work/','/watch/','/podcast/','/courses/','/fieldnotes/']);
  assert.match(page,/<strong>Nona Neuropsychology<\/strong><p>I lead nonclinical operations and technology/);
  assert.match(page,/CURRENT PROFESSIONAL FOCUS/);
  assert.match(page,/Clinical decisions remain with licensed professionals\./);
  assert.match(page,/founder of ANEVUM/);
  assert.match(page,/02 \/ PRODUCTION WEB ENGINEERING/);
  assert.match(page,/Live personal website · deployment verified November 2026/);
  assert.match(page,/github\.com\/devonalanakins\/devonakins\.com\/actions\/runs\/44384435946/);
  assert.match(page,/Test Chromium and WebKit/);
  assert.match(page,/Deploy and verify the exact commit/);
  assert.match(page,/\/work\/squelch\//);
  assert.doesNotMatch(page,/improved client outcomes by|\$[\d,]+ in savings|trained foundational model/i);
});

test('Apple platform work links to honestly labeled archived source',()=>{
  assert.match(page,/class="lab-focus-card lab-focus-card--engineering" href="\/work\/"/);
  assert.match(page,/id="apple-development"/);
  assert.match(page,/Apple platforms/);
  assert.match(page,/Historical source · archived client, not a current release/);
  assert.match(page,/https:\/\/github\.com\/devonalanakins\/anevum-web\/tree\/main\/native\/iren-ios/);
  assert.doesNotMatch(page,/Dadog.{0,80}(?:available|download|App Store)/i);
});

test('approved portrait section renders only when a real first-party image is packaged',()=>{
  assert.doesNotMatch(page,/class="lab-personal"|devon-portrait\.avif/,
    'No empty portrait card or broken image may appear in the default candidate');
  const approved=renderResearchFacilityHome({portraitAvailable:true});
  assert.equal((approved.match(/class="lab-personal"/g)||[]).length,1);
  assert.match(approved,/<figure class="lab-personal-portrait"><img src="\/professional\/devon-portrait\.avif"/);
  assert.match(approved,/alt="Devon outdoors wearing a backward dark cap and a gray graphic hoodie with green trim"/);
  assert.match(approved,/loading="lazy" decoding="async"/);
  assert.match(approved,/Father\. Builder\. Writer\./);
  assert.match(approved,/ABOUT ME/);
  assert.match(approved,/Nonclinical operations/);
  assert.doesNotMatch(approved,/data:image\/|src="https?:\/\/[^\"]+\.(?:jpg|png|webp|avif)"/);
  assert.throws(()=>renderResearchFacilityHome({portraitAvailable:'yes'}),TypeError);
});

test('the mathematical figure is deterministic, bounded, and derived from its stated formula',()=>{
  const path=lissajousPath(3,4);
  assert.equal(path,lissajousPath(3,4));
  assert.match(path,/^M/);
  assert.equal((path.match(/[ML]/g)||[]).length,301);
  for(const token of path.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)){
    assert.ok(Number(token[1])>=154&&Number(token[1])<=486);
    assert.ok(Number(token[2])>=85&&Number(token[2])<=375);
  }
  for(const pair of [[0,4],[1,7],[2.5,4],[2,3,Infinity]]){
    assert.throws(()=>lissajousPath(...pair),RangeError);
  }
});
test('the candidate uses first-party interactions and an explicit build gate',async()=>{
  const stylesheet=await readFile(new URL('../src/professional/research-facility.css',import.meta.url),'utf8');
  const client=await readFile(new URL('../src/professional/research-facility.ts',import.meta.url),'utf8');
  const generator=await readFile(new URL('../scripts/pages.mjs',import.meta.url),'utf8');
  assert.match(stylesheet,/@media\s*\(max-width:\s*760px\)/);
  assert.match(stylesheet,/prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet,/focus-visible/);
  const portfolioStyle=await readFile(new URL('../src/professional/research-portfolio.css',import.meta.url),'utf8');
  assert.match(portfolioStyle,/\.lab-destinations/);
  assert.match(portfolioStyle,/\.lab-portfolio-signal-grid/);
  assert.match(portfolioStyle,/\.lab-explore-heading/);
  assert.match(portfolioStyle,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(portfolioStyle,/\.lab-live-scene|perspective\(|rotateX\(|rotateY\(|transform-style:preserve-3d/);
  const identityStyle=await readFile(new URL('../src/professional/research-identity.css',import.meta.url),'utf8');
  assert.match(identityStyle,/\.lab-focus-grid/);
  assert.match(identityStyle,/\.lab-personal-inner/);
  assert.match(identityStyle,/\.lab-personal-portrait img/);
  assert.match(identityStyle,/@media\(max-width:760px\)/);
  assert.match(identityStyle,/\.lab-work-feature/);
  assert.match(identityStyle,/\.lab-research-notes/);
  assert.match(identityStyle,/\.lab-field-traces/);
  assert.match(identityStyle,/@keyframes lab-ink-flow/);
  assert.doesNotMatch(identityStyle,/\.lab-field-reticle|\.lab-card-geometry|perspective\(|rotateX\(|rotateY\(/);
  assert.doesNotMatch(stylesheet,/perspective\(|rotateX\(|rotateY\(/);
  assert.doesNotMatch(identityStyle,/\.webp|url\(\s*['"]?https?:/);
  assert.match(portfolioStyle,/prefers-reduced-motion/);
  assert.match(portfolioStyle,/@media\(max-width:760px\)/);
  assert.doesNotMatch(portfolioStyle,/@import|url\(\s*["']?https?:|https:\/\/fonts\./);
  assert.match(page,/href="\/src\/professional\/research-portfolio.css"/);
  assert.doesNotMatch(page,/href="\/src\/professional\/research-identity.css"/);
  const studioStyle=await readFile(new URL('../src/professional/research-studio.css',import.meta.url),'utf8');
  assert.doesNotMatch(studioStyle,/perspective\(|rotateX\(|rotateY\(|translate3d\(|preserve-3d|WebGLRenderer|@import|url\(/);
  assert.match(studioStyle,/prefers-reduced-motion/);
  assert.match(page,/href="\/src\/professional\/research-studio.css"/);
  assert.match(page,/href="\/src\/professional\/research-theme.css"/);
  assert.match(page,/<script src="\/laboratory-theme\.js"><\/script>/);
  assert.match(page,/<meta name="color-scheme" content="light dark">/);
  assert.equal((page.match(/data-lab-theme-select/g)||[]).length,1);
  assert.match(page,/href="\/src\/professional\/site-navigation.css"/);
  assert.doesNotMatch(stylesheet,/@import|url\(\s*["']?https?:|https:\/\/fonts\./);
  assert.doesNotMatch(stylesheet,/laboratory-chamber\.svg|perspective\(|rotateX\(|rotateY\(/);
  assert.doesNotMatch(portfolioStyle,/translate3d\(|preserve-3d|WebGLRenderer/);
  assert.match(client,/data-lab-axis/);
  assert.match(client,/data-lab-curve/);
  assert.match(client,/Math\.sin/);
  assert.match(client,/data-lab-motion/);
  assert.doesNotMatch(client,/fetch\(|localStorage|sessionStorage|innerHTML/);
  assert.match(generator,/LABORATORY_SITE_CANDIDATE/);
  assert.match(generator,/laboratoryPortraitAvailable/);
  assert.match(generator,/Invalid first-party portrait asset: expected optimized AVIF/);
  assert.match(generator,/bytes\.length>220_000/);
  assert.match(generator,/existsSync\('public\/professional\/devon-portrait\.avif'\)/);
  assert.match(generator,/laboratoryCandidate \? renderResearchFacilityHome/);
  assert.match(generator,/oneScreenCandidate \? renderOneScreenHome/);
  assert.match(page,/mailto:hello@devonakins\.com/);
  assert.doesNotMatch(page,/<script[^>]*src="https?:/);
});
