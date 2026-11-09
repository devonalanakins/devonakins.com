import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projects as editorialProjects } from "../src/content.mjs";
import { approvedPublicProjects, PUBLICATION_POLICY,
  projectPublicPortfolio } from "../src/publication-manifest.mjs";
import { PUBLIC_REPOSITORIES, validActivityHistory } from "../src/activity-history.mjs";
import { PUBLIC_PRESENCE_PROJECTS } from "../src/presence-model.mjs";
import { publicV5ProjectEvidence } from "../src/v5/public-evidence.mjs";
import { publicHomepageSourceSummary } from "../src/v5/homepage-source-summary.mjs";
import { renderV5PublicPage, renderV5ProjectPage } from "../src/v5/shell.mjs";

const privateSlug = "brandicade";
const privateTitle = "Brandicade";
const privateRepo = "https://github.com/devonalanakins/" + privateSlug;
const now = Date.parse("2026-11-08T23:00:00Z");
const iso = (ms) => new Date(now + ms).toISOString();

test("private personal work never re-enters reviewed public project discovery", () => {
  assert.equal(editorialProjects.some(p => p.slug === privateSlug), false);
  assert.equal(approvedPublicProjects.some(p => p.slug === privateSlug), false);
  assert.equal(Object.hasOwn(PUBLICATION_POLICY, privateSlug), false);
  assert.equal(Object.hasOwn(PUBLIC_REPOSITORIES, privateSlug), false);
  assert.equal(Object.hasOwn(PUBLIC_PRESENCE_PROJECTS, privateSlug), false);
  assert.equal(projectPublicPortfolio([{
    slug: privateSlug, title: privateTitle, url: privateRepo,
  }]).length, 0, "Discovered repositories never override publication approval");
  assert.throws(() => renderV5ProjectPage(privateSlug), /Unknown public project/);
  for (const html of [renderV5PublicPage("projects"), renderV5PublicPage("home"),
    renderV5PublicPage("research"), renderV5PublicPage("field")]) {
    assert.ok(!html.toLowerCase().includes(privateSlug),
      "Private project leaked through published V5 page");
  }
});

test("forged fresh editor, agent and GitHub readings cannot resurrect private project activity", () => {
  const value = {
    version: 4, asOf: iso(-1000),
    work: { visibility:"public",source:"editor-heartbeat",state:"developing",
      project:privateTitle,asOf:iso(-1000) },
    remote: { visibility:"public",tasks:[{
      project:privateTitle,source:"codex",state:"running",
      checkpoint:null,asOf:iso(-1500),expiresAt:iso(100000),
    }]},
    recent: [{
      project:privateTitle,projectSlug:privateSlug,kind:"Commit",
      at:iso(-2000),url:privateRepo,
    }],
  };
  assert.deepEqual(validActivityHistory(value.recent,now),[]);
  const projected = publicV5ProjectEvidence(value,now);
  assert.equal(projected.available,true);
  assert.equal(Object.hasOwn(projected.nodes, privateSlug),false);
  assert.equal(projected.recent.length,0);
  const summary=publicHomepageSourceSummary(projected,now);
  assert.equal(summary.events.length,0);
  assert.equal(summary.focus,null);
  assert.equal(summary.tasks,"No current shared tasks");
  assert.ok(!JSON.stringify(summary).toLowerCase().includes(privateSlug));
});

function* publicFiles(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const full=join(directory,entry.name);
    if(entry.isDirectory()) yield* publicFiles(full);
    else if(entry.isFile()) yield full;
  }
}

test("production build does not contain the private project's identity, page or metadata", () => {
  assert.ok(existsSync("dist"),"Build dist before running the disclosure gate");
  const files=Array.from(publicFiles("dist"));
  assert.ok(files.length>10,"Public build must not be empty");
  for(const filename of files){
    assert.ok(!filename.toLowerCase().includes(privateSlug),
      "A private project file must not be served: "+filename);
    if(!/\.(?:html|js|css|xml|svg|json|txt)$/i.test(filename))continue;
    const value=readFileSync(filename,"utf8");
    assert.ok(!value.toLowerCase().includes(privateSlug),
      "A public HTML, metadata, image or bundle reveals private work: "+filename);
  }
  assert.ok(!existsSync("dist/work/"+privateSlug+"/index.html"));
  assert.ok(!existsSync("dist/v2/identity/"+privateSlug+".svg"));
});
