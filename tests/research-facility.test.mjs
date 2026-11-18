import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LABORATORY_ROUTES} from '../src/professional/laboratory-routes.mjs';
import {renderResearchFacilityHome,lissajousPath} from '../src/professional/research-facility.mjs';

const page=renderResearchFacilityHome();

test('laboratory candidate is independently navigable, semantic and source-honest',()=>{
  assert.equal((page.match(/role="tabpanel"/g)||[]).length,8);
  assert.equal((page.match(/role="tablist"/g)||[]).length,2);
  assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,8);
  for(const key of ['home','experience','systems','work','portfolio','activity','writing','contact']){
    assert.match(page,new RegExp('id="one-panel-'+key+'"'));
  }
  for(const key of ['home','work','experience']){
    assert.equal((page.match(new RegExp('data-one-target="'+key+'"','g'))||[]).length,2);
  }
  for(const key of ['systems','portfolio','activity','writing','contact']){
    assert.doesNotMatch(page,new RegExp('data-one-target="'+key+'"'));
  }
  assert.equal(LABORATORY_ROUTES.work,'/work/');
  assert.match(page,/class="lab-work-feature"/);
  assert.match(page,/class="lab-work-method"/);
  assert.match(page,/class="lab-research-journal"/);
  for(const term of ['Devon Alan Akins','MATHEMATICS','PHYSICS','COMPUTATIONAL NEUROSCIENCE',
    'Independent','Build what matters.','ANALYTIC MODEL',
    'NO MEASURED DATA','EXPERIMENT','PROPOSED','scientific computing']){
    assert.ok(page.toLowerCase().includes(term.toLowerCase()),term);
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
  assert.match(page,/Build what matters/);
  assert.match(page,/class="lab-hero-field"/);
  assert.doesNotMatch(page,/<picture|class="lab-scene"|\/professional\/cinematic\/[^"']+\.webp/);
  assert.match(page,/class="lab-field-traces"/);
  assert.equal((page.match(/class="lab-card-print"/g)||[]).length,2);
  assert.doesNotMatch(page,/data-lab-scene-canvas|cinematic-environment\.ts|lab-field-reticle|lab-card-geometry|WebGLRenderer/i);
  for(const key of ['work','experience']){
    assert.match(page,new RegExp('href="'+LABORATORY_ROUTES[key]+'" data-one-go="'+key+'" data-lab-destination="'+key+'"'));
  }
  assert.equal((page.match(/class="lab-signal-tile /g)||[]).length,2);
  assert.match(page,/INDEPENDENT SOFTWARE DEVELOPMENT/i);
  assert.match(page,/class="lab-explore-heading"/);
  assert.match(page,/THE PUBLIC RECORD/);
  assert.match(page,/class="lab-signal-tile lab-signal-github"/);
  assert.match(page,/class="lab-signal-tile lab-signal-spotify"/);
  assert.match(page,/one-social-icon--threads/);
  assert.doesNotMatch(page,/Recent authorized public Threads posts|No verified editor session/);
  assert.match(page,/Public events only/);
  assert.doesNotMatch(page,/GPU speedup: \d+|active neural network|trained model deployed|LIVE NOW/i);
  assert.doesNotMatch(page,/<iframe|headshot-concept\.webp|Patient:|access_token|private repository/i);
});
test('approved portrait section renders only when a real first-party image is packaged',()=>{
  assert.doesNotMatch(page,/class="lab-personal"|devon-portrait\.avif/,
    'No empty portrait card or broken image may appear in the default candidate');
  const approved=renderResearchFacilityHome({portraitAvailable:true});
  assert.equal((approved.match(/class="lab-personal"/g)||[]).length,1);
  assert.match(approved,/<figure class="lab-personal-portrait"><img src="\/professional\/devon-portrait\.avif"/);
  assert.match(approved,/alt="Devon outdoors wearing a backwards dark cap and gray T-shirt"/);
  assert.match(approved,/loading="lazy" decoding="async"/);
  assert.match(approved,/Independent by design\./);
  assert.match(approved,/THE PERSON BEHIND THE WORK/);
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
  assert.match(page,/href="\/src\/professional\/research-identity.css"/);
  assert.match(stylesheet,/\.lab-header \.lab-tabs-desktop\{display:none\}/);
  assert.match(stylesheet,/\.lab-body>\.lab-tabs-mobile \.one-tablist\{display:grid/);
  assert.doesNotMatch(stylesheet,/\.lab-header \.one-tabs-desktop|\.lab-body>\.one-tabs-mobile/);
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
