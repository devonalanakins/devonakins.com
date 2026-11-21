import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CREATOR_ROUTES,CREATOR_CATEGORIES,CREATOR_GEAR,renderCreatorPage} from "../src/professional/creator-pages.mjs";
import {renderResearchFacilityHome} from "../src/professional/research-facility.mjs";

const podcast=renderCreatorPage(CREATOR_ROUTES.podcast);
const setup=renderCreatorPage(CREATOR_ROUTES.setup);

test("the proposed podcast has its own meaningful public route and no fictional release claims",()=>{
  assert.equal(CREATOR_ROUTES.podcast,"/podcast/");
  assert.match(podcast,/<title>The Mark They Make — Devon Alan Akins<\/title>/);
  assert.match(podcast,/rel="canonical" href="https:\/\/devonakins\.com\/podcast\/"/);
  assert.match(podcast,/<h1 id="pc-title">The Mark<br><em>They Make\.<\/em><\/h1>/);
  assert.match(podcast,/IN DEVELOPMENT · NO EPISODES RELEASED/);
  assert.match(podcast,/NO PUBLIC EPISODES YET/);
  assert.match(podcast,/First episode is still ahead/);
  assert.match(podcast,/href="\/setup\/"/);
  assert.match(podcast,/href="#pc-format"/);
  assert.match(podcast,/href="#pc-main"/);
  assert.doesNotMatch(podcast,/<iframe|<audio|<video|autoplay|data-guest-name|data-episode-player|apple-podcasts\.com|spotify\.com\/show/i);
  assert.doesNotMatch(podcast,/premiered|new episodes every|subscribe on spotify|recorded with/i);
});

test("the setup page is an honest catalog with one entry per proposed product",()=>{
  assert.equal(CREATOR_ROUTES.setup,"/setup/");
  assert.match(setup,/rel="canonical" href="https:\/\/devonakins\.com\/setup\/"/);
  assert.match(setup,/No purchases, product quantities, installs or affiliate relationships have been verified/);
  assert.match(setup,/OWNED \/ VERIFIED/);
  assert.match(setup,/Not inventoried/);
  assert.match(setup,/None configured/);
  assert.deepEqual(CREATOR_CATEGORIES.map(x=>x.id),["field","stage","control","lab"]);
  assert.equal(CREATOR_GEAR.length,8);
  assert.equal(new Set(CREATOR_GEAR.map(x=>x.id)).size,CREATOR_GEAR.length);
  assert.deepEqual(CREATOR_GEAR.map(x=>x.status).filter(x=>x!=="candidate"),["future"]);
  assert.equal((setup.match(/class="pc-product"/g)||[]).length,8);
  assert.equal((setup.match(/data-gear-status="candidate"/g)||[]).length,7);
  assert.equal((setup.match(/data-gear-status="future"/g)||[]).length,1);
  assert.equal((setup.match(/Ownership unverified/g)||[]).length,8);
  for(const category of CREATOR_CATEGORIES){
    assert.match(setup,new RegExp('id="pc-cat-'+category.id+'"'));
    assert.match(setup,new RegExp('href="#'+category.id+'"'));
  }
  for(const product of CREATOR_GEAR){
    assert.match(setup,new RegExp('data-gear-id="'+product.id+'"'));
    assert.ok(product.url.startsWith("https://"));
    assert.ok(!/[?&](?:utm_|tag=)/.test(product.url));
    assert.ok(!Object.hasOwn(product,"affiliateUrl"));
    assert.ok(!Object.hasOwn(product,"price"));
  }
  assert.match(setup,/Portable and studio workflows may use the same microphones and headphones/);
  assert.match(setup,/Nothing selected for this section yet/);
  assert.doesNotMatch(setup,/affiliate disclosure applies|commission earned|As an Amazon Associate|Buy now|In stock|\$\d/);
});

test("creator pages remain accessible, first-party, and wholly distinct from clinical operations",()=>{
  for(const html of [podcast,setup]){
    assert.match(html,/<html lang="en" class="lab-html"/);
    assert.match(html,/<main id="pc-main">/);
    assert.match(html,/aria-label="Primary navigation"/);
    assert.match(html,/aria-current="page"/);
    assert.match(html,/href="\/podcast\/"/);
    assert.match(html,/href="\/setup\/"/);
    assert.match(html,/\/src\/professional\/creator-pages\.css/);
    assert.match(html,/src="\/laboratory-theme\.js"/);
    assert.match(html,/target="_blank" rel="noopener noreferrer"|href="#pc-format"/);
    assert.doesNotMatch(html,/<script[^>]+src="https?:/);
    assert.doesNotMatch(html,/<form|password|PHI|patient record|Nona Workspace/i);
  }
  assert.throws(()=>renderCreatorPage("/unknown/"),/Unknown creator path/);
});

test("laboratory shell links to creator pages without changing its eight tab panels",()=>{
  const home=renderResearchFacilityHome();
  assert.equal((home.match(/role="tabpanel"/g)||[]).length,8);
  assert.equal((home.match(/aria-label="Primary pages"/g)||[]).length,2);
  assert.match(home,/href="\/podcast\/">The Mark They Make/);
  assert.match(home,/href="\/podcast\/">Podcast/);
  assert.match(home,/href="\/setup\/">My Setup/);
});

test("creator routes are build-gated and styling supports small screens and system dark mode",async()=>{
  const [pages,vite,css]=await Promise.all([
    readFile(new URL("../scripts/pages.mjs",import.meta.url),"utf8"),
    readFile(new URL("../vite.config.mjs",import.meta.url),"utf8"),
    readFile(new URL("../src/professional/creator-pages.css",import.meta.url),"utf8")
  ]);
  assert.match(pages,/laboratoryCandidate && Object\.values\(CREATOR_ROUTES\)\.includes\(path\)/);
  assert.match(pages,/\.\.\.Object\.values\(CREATOR_ROUTES\)/);
  assert.match(vite,/process\.env\.LABORATORY_SITE_CANDIDATE === "1"/);
  assert.match(vite,/\.\.\.Object\.values\(CREATOR_ROUTES\)/);
  assert.match(css,/html\.lab-html\[data-theme="dark"\]/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:focus-visible/);
  assert.doesNotMatch(css,/@import|https:\/\/fonts\.|url\(\s*https?:/);
});
