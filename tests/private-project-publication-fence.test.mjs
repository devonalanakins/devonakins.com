import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readdirSync,readFileSync} from "node:fs";
import {join} from "node:path";
import {projects} from "../src/content.mjs";
import {PUBLIC_REPOSITORIES,validActivityHistory} from "../src/activity-history.mjs";
import {PUBLIC_PRESENCE_PROJECTS} from "../src/presence-model.mjs";
const slug="brandicade";
test("withdrawn private project has no public catalog or activity approval",()=>{
  assert.equal(projects.some(p=>p.slug===slug),false);
  assert.equal(Object.hasOwn(PUBLIC_REPOSITORIES,slug),false);
  assert.equal(Object.hasOwn(PUBLIC_PRESENCE_PROJECTS,slug),false);
  const events=[{project:"Brandicade",projectSlug:slug,kind:"Commit",at:"2026-11-08T20:00:00.000Z",url:"https://github.com/devonalanakins/"+slug}];
  assert.deepEqual(validActivityHistory(events,Date.parse("2026-11-08T20:00:30.000Z")),[]);
});
function* walk(root){for(const e of readdirSync(root,{withFileTypes:true})){
  const path=join(root,e.name);if(e.isDirectory())yield* walk(path);
  else if(e.isFile())yield path;
}}
test("public build contains no private project assets, route, sitemap or client bundle strings",()=>{
  assert.ok(existsSync("dist"),"Run the build before privacy tests");
  assert.equal(existsSync("dist/work/"+slug+"/index.html"),false);
  assert.equal(existsSync("dist/v2/identity/"+slug+".svg"),false);
  const suffixes=[".html",".js",".css",".xml",".json",".svg",".txt"];
  let count=0;
  for(const path of walk("dist")){
    count++;
    assert.ok(!path.toLowerCase().includes(slug),"Private path: "+path);
    if(!suffixes.some(ext=>path.toLowerCase().endsWith(ext)))continue;
    assert.ok(!readFileSync(path,"utf8").toLowerCase().includes(slug),"Private project in public artifact: "+path);
  }
  assert.ok(count>10,"Public build unexpectedly empty");
});