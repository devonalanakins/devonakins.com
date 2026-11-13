#!/usr/bin/env node
/** Isolated workerd compatibility proof: no Meta requests, credentials, or D1. */
import assert from "node:assert/strict";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const modulePath=resolve(process.env.GPT_MINIFLARE_ROOT||
  "/tmp/devon-d1-tools/node_modules","miniflare/dist/src/index.js");
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(modulePath));
const source=`export default {
  fetch() {
    let legacyError=null;
    try {
      new Request("https://graph.threads.com/oauth/access_token",{
        method:"POST",redirect:"error",body:"grant_type=authorization_code"
      });
    } catch(error) { legacyError=error.name; }
    const manual=new Request("https://graph.threads.com/oauth/access_token",{
      method:"POST",redirect:"manual",body:"grant_type=authorization_code"
    });
    return Response.json({legacyError,manualRedirect:manual.redirect,
      manualDestination:new URL(manual.url).origin});
  }
};`;
const mf=new Miniflare(convertV4MiniflareOptions({
  modules:true,script:source,compatibilityDate:"2026-10-29",
}));
try {
  const response=await mf.dispatchFetch("https://fixture.example/");
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.legacyError,"TypeError",
    "Real workerd must reject redirect:error before a Meta network request");
  assert.equal(result.manualRedirect,"manual");
  assert.equal(result.manualDestination,"https://graph.threads.com");
  console.log("Workerd redirect compatibility verified without upstream requests.");
} finally {
  await mf.dispose();
}
