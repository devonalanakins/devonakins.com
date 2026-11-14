import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {renderOneScreenHome} from "../src/professional/one-screen.mjs";

const publicAddress="hello@devonakins.com";
const formerAddress=["devon","anevum.com"].join("@");
const publicSources=[
  "src/views.mjs","src/main.ts","src/terminal.ts",
  "src/immersive-routes.mjs","src/professional/site.mjs",
  "src/professional/one-screen.mjs","v2/index.html",
];

test("all supported public site variants and copy controls use the same contact address",async()=>{
  for(const path of publicSources){
    const body=await readFile(new URL("../"+path,import.meta.url),"utf8");
    assert.ok(body.includes(publicAddress),path+" must expose current address");
    assert.ok(!body.includes(formerAddress),path+" must not expose retired contact address");
  }
});

test("one-screen homepage displays a working public mailto without touching owner sign-in",()=>{
  const html=renderOneScreenHome();
  assert.ok(html.includes('href="mailto:'+publicAddress+'"'));
  assert.ok(html.includes('>'+publicAddress+' <span aria-hidden="true">'));
  assert.ok(!html.includes(formerAddress));
  assert.ok(!html.includes('mailto:id@devonakins.com'));
});
