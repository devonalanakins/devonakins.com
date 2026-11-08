import test from "node:test";
import assert from "node:assert/strict";
import { projects as editorialProjects } from "../src/content.mjs";
import {
  PUBLICATION_POLICY,
  approvedPublicProjects,
  projectPublicPortfolio,
  publicProjectBySlug,
} from "../src/publication-manifest.mjs";
import { publicAtlasProfiles } from "../src/v5/atlas-public-profiles.mjs";
import { projectV5Atlas } from "../src/v5/atlas-layout.mjs";
import { replayPublicGraphHistory } from "../src/v5/public-graph-history.mjs";

test("current twelve reviewed editorial identities remain public without accidental auto-discovery", () => {
  assert.equal(approvedPublicProjects.length, 12);
  assert.deepEqual(approvedPublicProjects.map(p => p.slug),
    editorialProjects.map(p => p.slug));
  assert.ok(approvedPublicProjects.every(p => Object.isFrozen(p) &&
    p.publication.publishApproved === true));
  assert.equal(Object.keys(PUBLICATION_POLICY).length, 12);
  assert.equal(publicProjectBySlug("vesper")?.publication.stage, "research");
  assert.equal(publicProjectBySlug("nonpublic-experiment"), null);
  assert.equal(projectPublicPortfolio(null).length, 0);
  assert.ok(Object.isFrozen(approvedPublicProjects));
});

test("new public repositories, unreviewed concepts and duplicated project ids never publish themselves", () => {
  const unknown = {...editorialProjects[0], slug:"new-private-client",
    title:"Private Client", url:"https://github.com/devonalanakins/new-private-client"};
  const projected=projectPublicPortfolio([
    unknown, editorialProjects[0], editorialProjects[0],
    null, {...editorialProjects[0],slug:"INVALID_SLUG"}, ...editorialProjects.slice(1),
  ]);
  assert.equal(projected.length,12);
  assert.ok(!JSON.stringify(projected).includes("Private Client"));
  assert.deepEqual(projected.map(p=>p.slug), editorialProjects.map(p=>p.slug));
});

test("public concept and repo/source activity have three independent approval boundaries", () => {
  const v=publicProjectBySlug("vesper");
  assert.ok(v);
  assert.equal(v.publication.publishApproved,true);
  assert.equal(v.publication.sourceLinkApproved,false);
  assert.equal(v.publication.activitySharingApproved,false);
  assert.equal(v.url,undefined);
  const forged = editorialProjects.map(p => p.slug === "vesper"
    ? {...p,url:"https://github.com/devonalanakins/vesper",
      urlLabel:"Private repository"} : p);
  const safe=projectPublicPortfolio(forged);
  const found=safe.find(p=>p.slug==="vesper");
  assert.ok(found);
  assert.equal(found.url,undefined);
  assert.equal(found.urlLabel,undefined);
  assert.ok(!JSON.stringify(safe).includes("https://github.com/devonalanakins/vesper\""));
  assert.ok(!JSON.stringify(PUBLICATION_POLICY).includes("private-client"));
});

test("external links must match exact owner-approved destinations to remain public", () => {
  const tampered=editorialProjects.map(p=>p.slug==="merit"
    ? {...p,url:"https://evil.example/steal"}:p);
  const merit=projectPublicPortfolio(tampered).find(p=>p.slug==="merit");
  assert.ok(merit);
  assert.equal(merit.url,undefined);
  assert.equal(merit.urlLabel,undefined);
  assert.equal(publicProjectBySlug("anevum").url,"https://anevum.com");
  assert.equal(publicProjectBySlug("rhen").publication.activitySharingApproved,false);
});

test("published V5 systems atlas cannot resurrect a private source destination", () => {
  const at=Date.parse("2026-11-08T18:00:00.000Z");
  const layout=projectV5Atlas(replayPublicGraphHistory([],at));
  const profiles=publicAtlasProfiles(layout);
  const vesper=profiles.find(p=>p.id==="project:vesper");
  assert.equal(vesper?.url,null);
});
