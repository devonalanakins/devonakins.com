import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyV5Production, v5ReleaseRoutes } from "../scripts/verify-live-v5.mjs";

const sha = "a".repeat(40);
const release = {commit: sha, version: "1.3.0"};
const doc = (path, bad=false) => {
  const archived = path.includes("asOf=2026-11-03");
  const revision = archived ? "0" : "8";
  return '<html lang="en" data-v5-signal-mode="' + (bad ? 'preview' : 'released-v5') + '">' +
    '<link rel="canonical" href="https://devonakins.com/">' +
    '<main data-v5-exact-reference="2026-11-07">' +
    '<h1>Living Mind</h1><div class="v5-locked-portrait"></div>' +
    '<span data-v5-work-summary>Unavailable</span>' +
    '<div data-v5-atlas-revision="' + revision + '"' +
    ' data-v5-atlas-node-id="publication:mizvo/public-portfolio-source"></div>' +
    '<input value="' + (archived ? '2026-11-03' : '2026-11-06') + '">' +
    '</main></html>';
};
function fixture({badV5=false,badCommit=false,badArchive=false,missingCsp=false,leaked=false}={}) {
  const requests=[];
  const htmlHeaders = {
    "content-type":"text/html; charset=utf-8",
    "content-security-policy":missingCsp ? "default-src 'self'" :
      "default-src 'self'; frame-ancestors 'none'; form-action 'self'",
    "x-content-type-options":"nosniff",
    "cache-control":"no-store",
  };
  const fetchImpl = async (url, options={}) => {
    requests.push({url,options});
    const path=new URL(url).pathname+new URL(url).search;
    if(path==="/_health")return Response.json({
      site:"devonakins.com",commit:badCommit?"b".repeat(40):sha,version:"1.3.0",
    });
    if(path==="/api/activity/v4")return Response.json({
      version:4,work:{visibility:"hidden"},remote:{visibility:"hidden",tasks:[]},
      ...(leaked?{access_token:"synthetic-secret"}:{}),
    },{headers:{"cache-control":"no-store"}});
    if(path.startsWith("/__v5_preview__/"))return new Response("",{status:404});
    if(path.startsWith("/signal-field/")&&options.method==="POST")
      return new Response("",{status:405});
    if(path.startsWith("/signal-field/")&&options.method==="HEAD")
      return new Response(null,{status:200,headers:htmlHeaders});
    if(path.includes("asOf=2026-11-03")&&badArchive)return new Response(
      doc("/signal-field/?asOf=2026-11-06"),{status:200,headers:htmlHeaders});
    return new Response(doc(path,badV5 && path==="/"),{status:200,headers:htmlHeaders});
  };
  return {fetchImpl,requests};
}
test("manual V5 release path stays opt-in, exact-commit gated and preserves V4 default",()=> {
  const workflow=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
  const v5Expression="$"+"{{ inputs.release_variant == 'v5' && '1' || '0' }}";
  for(const expected of [
    "default: v4",
    "release_variant:",
    "V5-CUTOVER-APPROVED",
    "V5_PUBLIC_SITE_CANDIDATE: "+v5Expression,
    "node scripts/verify-v5-site-candidate.mjs",
    "node scripts/verify-live-v5.mjs",
    "node scripts/verify-live.mjs",
    "github.ref == 'refs/heads/main'",
    "wrangler@4.151.3 deploy",
  ]) assert.ok(workflow.includes(expected),"Protected deployment missing: "+expected);
  // The production V5 workflow must run legacy V4 regression assertions on
  // a V4-built artifact, then rebuild and inspect the actual V5 artifact.
  // Running all tests against V5 silently turned 13 V4-only checks into
  // false failures; skipping legacy tests would conceal real regressions.
  const legacyBuild=workflow.indexOf("V5_PUBLIC_SITE_CANDIDATE=0 npm run build");
  const legacyTest=workflow.indexOf("V5_PUBLIC_SITE_CANDIDATE=0 npm test");
  const v5Build=workflow.indexOf("V5_PUBLIC_SITE_CANDIDATE=1 npm run build");
  const v5Acceptance=workflow.indexOf("node scripts/verify-v5-site-candidate.mjs");
  assert.ok(legacyBuild>=0&&legacyBuild<legacyTest&&legacyTest<v5Build&&v5Build<v5Acceptance,
    "V5 cutover must verify V4 first and then the selected V5 build");
  assert.match(workflow,/if \[ "\$V5_PUBLIC_SITE_CANDIDATE" = '1' \]; then/,
    "V5 rebuild must remain behind explicit variant selection");
  assert.equal(v5ReleaseRoutes.length,22,"new repositories stay outside first V5 release");
});
test("V5 read-only production verifier attests exact SHA, public routes and historical replay",async()=>{
  const f=fixture();
  const result=await verifyV5Production({origin:"https://devonakins.com",release,expectedCommit:sha,
    fetchImpl:f.fetchImpl,attempts:1,pause:async()=>{}});
  assert.equal(result.commit,sha);
  assert.equal(result.v5Routes,22);
  assert.ok(f.requests.some(x=>x.url.endsWith("/signal-field/?asOf=2026-11-03")));
  assert.ok(f.requests.some(x=>x.url.endsWith("/signal-field/?asOf=2026-11-06")));
  assert.ok(f.requests.every(x=>x.options.redirect==="manual"&&x.options.cache==="no-store"));
});
test("V5 release refuses the wrong build, stale runtime, preview markup or private response",async()=>{
  for(const [label,sample] of [
    ["wrong-build",{release:{commit:"b".repeat(40),version:"1.3.0"}}],
    ["old-worker",{fixture:{badCommit:true}}],
    ["wrong-home",{fixture:{badV5:true}}],
    ["invalid-history",{fixture:{badArchive:true}}],
    ["no-CSP",{fixture:{missingCsp:true}}],
    ["private-packet",{fixture:{leaked:true}}],
  ]){
    const f=fixture(sample.fixture);
    await assert.rejects(
      verifyV5Production({origin:"https://devonakins.com",release:sample.release||release,
        expectedCommit:sha,fetchImpl:f.fetchImpl,attempts:1,pause:async()=>{}}),
      undefined,label+" must fail closed",
    );
  }
});
