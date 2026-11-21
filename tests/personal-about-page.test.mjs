import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {LABORATORY_REDIRECTS, LABORATORY_ROUTES} from "../src/professional/laboratory-routes.mjs";
import {creatorPaths, renderCreatorPage} from "../src/professional/creator-pages.mjs";
import {PERSONAL_ABOUT_ROUTE, renderPersonalAbout} from "../src/professional/about-page.mjs";

const page = renderCreatorPage(PERSONAL_ABOUT_ROUTE);

test("About has its own canonical, source-generated destination without losing Portfolio", () => {
  assert.equal(PERSONAL_ABOUT_ROUTE, "/about/");
  assert.ok(creatorPaths.includes(PERSONAL_ABOUT_ROUTE));
  assert.equal(Object.hasOwn(LABORATORY_REDIRECTS, PERSONAL_ABOUT_ROUTE), false);
  assert.equal(LABORATORY_ROUTES.portfolio, "/portfolio/");
  assert.match(page, /<title>About — Devon Alan Akins<\/title>/);
  assert.match(page, /rel="canonical" href="https:\/\/devonakins\.com\/about\/"/);
  assert.match(page, /href="\/about\/" aria-current="page">About<\/a>/);
  assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length, 1);
  assert.match(page, /<article class="pc-wrap pc-about" aria-labelledby="pc-title">/);
  assert.equal((renderPersonalAbout().match(/<section/g)||[]).length, 6);
  for(const id of ["pc-about-build","pc-about-publish","pc-about-teach","pc-about-boundaries","pc-about-principles-title","pc-about-contact-title"])
    assert.match(page,new RegExp('id="'+id+'"'));
});

test("About tells a human, truthful story without leaking private identity systems or pretending releases", () => {
  for(const s of ["independent software developer", "writer, interviewer and lifelong student",
    "I am also a father", "not represented as a current App Store release",
    "Episodes will appear only after real recording",
    "still taking shape", "clinical judgments remain with licensed professionals",
    "Dadog is my developing private AI counterpart", "No"] .slice(0,-1)) assert.ok(page.includes(s),s);
  assert.match(page,/not proof of Apple Developer Program membership/);
  assert.match(page,/home walk-through/);
  assert.match(page,/Do not send medical records/);
  assert.match(page,/rel="noopener noreferrer"/);
  assert.doesNotMatch(page,/<iframe|<audio|<video|<form|secret key|social security|private conversation|patient record|Nona Workspace/i);
});

test("About typography and layouts support responsive and print reading without remote fonts", async () => {
  const css=await readFile(new URL("../src/professional/creator-pages.css", import.meta.url),"utf8");
  assert.match(css,/\.pc-about-grid\s*\{\s*display:\s*grid/);
  assert.match(css,/@media \(max-width: 800px\)/);
  assert.match(css,/@media \(max-width: 420px\)/);
  assert.match(css,/@media print/);
  assert.match(css,/:focus-visible/);
  assert.doesNotMatch(css,/@import|https:\/\/fonts\.|url\(\s*https?:/);
});
