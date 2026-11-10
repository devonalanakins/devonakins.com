import test from "node:test";
import assert from "node:assert/strict";
import { verifyOidcRelease } from "../scripts/verify-oidc-release.mjs";

const account = "a".repeat(32);
const db = "00000000-0000-0000-0000-000000000001";
const version = "11111111-1111-4111-8111-111111111111";
const environment = action => ({
  CLOUDFLARE_ACCOUNT_ID: account,
  CLOUDFLARE_API_TOKEN: "synthetic-test-token",
  GITHUB_OIDC_ACTION: action,
});
function scenario({
  enabled = false, action = "preserve", unsigned,
  missingEncryption = false, databaseId = db, split = false,
  actualFlag = enabled ? "true" : "false",
} = {}) {
  const config = JSON.stringify({
    name:"devonakins-personal",
    d1_databases:[{binding:"LISTENING_DB",database_id:db}],
    vars:{GITHUB_OIDC_ACTIVITY_ENABLED:enabled?"true":"false",PRESENCE_ENABLED:"true"},
  });
  const seen = [];
  const fetcher = async (url, options = {}) => {
    seen.push({url,options});
    if(url.endsWith("/deployments"))
      return Response.json({success:true,result:{deployments:[{
        versions:split?[{version_id:version,percentage:50}]:[
          {version_id:version,percentage:100}],
      }]}});
    if(url.endsWith("/versions/"+version))
      return Response.json({success:true,result:{
        id:version,resources:{bindings:[
          {name:"LISTENING_DB",type:"d1",id:databaseId},
          ...missingEncryption?[]:[{name:"LISTENING_TOKEN_KEY",type:"secret_text"}],
          {name:"GITHUB_OIDC_ACTIVITY_ENABLED",type:"plain_text",text:actualFlag},
          {name:"PRESENCE_ENABLED",type:"plain_text",text:"true"},
        ]},
      }});
    if(url.endsWith("/github-oidc-start"))
      return new Response("",{status:unsigned ?? (enabled?401:404)});
    throw Error("Unexpected provider route");
  };
  return { config,seen,fetcher,env:environment(action) };
}
test("reviewed disabled state retains private bindings and rejects unsigned requests", async () => {
  const sample=scenario();
  assert.deepEqual(await verifyOidcRelease({
    env:sample.env,read:async()=>sample.config,fetcher:sample.fetcher,
  }),{enabled:false,unsignedDenied:true});
  assert.equal(sample.seen.length,3);
  assert.equal(sample.seen[2].options.credentials,"omit");
  assert.equal(sample.seen[2].options.method,"POST");
  assert.equal(sample.seen[2].options.headers.Authorization,undefined);
});
test("reviewed enabled state must reject unsigned create even after feature activation", async () => {
  const sample=scenario({enabled:true,action:"enable"});
  assert.deepEqual(await verifyOidcRelease({
    env:sample.env,read:async()=>sample.config,fetcher:sample.fetcher,
  }),{enabled:true,unsignedDenied:true});
});
test("production acceptance fails closed on release config, binding, or auth drift", async () => {
  for (const sample of [
    scenario({enabled:true,action:"enable",unsigned:200}),
    scenario({enabled:true,action:"enable",actualFlag:"false"}),
    scenario({enabled:false,action:"enable"}),
    scenario({enabled:true,missingEncryption:true}),
    scenario({databaseId:"99999999-9999-4999-8999-999999999999"}),
    scenario({split:true}),
  ]) await assert.rejects(verifyOidcRelease({
    env:sample.env,read:async()=>sample.config,fetcher:sample.fetcher,
  }));
});
