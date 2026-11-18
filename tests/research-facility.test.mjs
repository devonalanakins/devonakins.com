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
    assert.match(page,new RegExp('data-one-target="'+key+'"'));
  }
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
  assert.equal((page.match(/data-lab-destination="/g)||[]).length,5);
  assert.equal((page.match(/class="lab-focus-card /g)||[]).length,3);
  assert.match(page,/Nona Neuropsychology/);
  assert.match(page,/Build what matters/);
  assert.match(page,/class="lab-hero-field"/);
  assert.doesNotMatch(page,/<picture|class="lab-scene"|\/professional\/cinematic\/[^"']+\.webp/);
  assert.match(page,/data-lab-scene-canvas/);
  assert.match(page,/src="\/src\/professional\/cinematic-environment\.ts"/);
  for(const key of ['experience','systems','work','portfolio','writing']){
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
  assert.match(portfolioStyle,/\.lab-live-scene/);
  const identityStyle=await readFile(new URL('../src/professional/research-identity.css',import.meta.url),'utf8');
  assert.match(identityStyle,/\.lab-focus-grid/);
  assert.match(identityStyle,/\.lab-field-reticle/);
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
  assert.match(stylesheet,/\/professional\/laboratory-chamber\.svg/);
  const chamber=await readFile(new URL('../public/professional/laboratory-chamber.svg',import.meta.url),'utf8');
  assert.match(chamber,/viewBox="0 0 960 1240"/);
  assert.doesNotMatch(chamber,/<script|<image|href="https?:|data:image\//i);
  assert.match(client,/data-lab-axis/);
  assert.match(client,/data-lab-curve/);
  assert.match(client,/Math\.sin/);
  assert.match(client,/data-lab-motion/);
  assert.doesNotMatch(client,/fetch\(|localStorage|sessionStorage|innerHTML/);
  assert.match(generator,/LABORATORY_SITE_CANDIDATE/);
  assert.match(generator,/laboratoryCandidate \? renderResearchFacilityHome/);
  assert.match(generator,/oneScreenCandidate \? renderOneScreenHome/);
  assert.match(page,/mailto:hello@devonakins\.com/);
  assert.doesNotMatch(page,/<script[^>]*src="https?:/);
});
