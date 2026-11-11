#!/usr/bin/env node
/**
 * Read-only external acceptance. A GitHub-hosted runner verifies that
 * the public API actually replies to the site's Origin with CORS enabled,
 * and that the same sanitized browser projection returns usable data.
 * No tokens, raw GitHub event payloads, or visitor data are logged.
 */
import assert from "node:assert/strict";
import {
  BROWSER_GITHUB_SOURCE,readBrowserGithubFallback,
} from "../src/professional/github-browser-fallback.mjs";
const expectedOrigin="https://devonakins.com";
let corsHeader=null;
const result=await readBrowserGithubFallback({
  fetcher:async(url,options)=>{
    const response=await fetch(url,{
      ...options,
      headers:{...options.headers,Origin:expectedOrigin},
    });
    corsHeader=response.headers.get("access-control-allow-origin");
    return response;
  },
});
assert.ok(corsHeader==="*"||corsHeader===expectedOrigin,
  "Public GitHub endpoint did not advertise browser CORS permission");
assert.ok(result?.source===BROWSER_GITHUB_SOURCE &&
  ["available","empty"].includes(result.status),
  "GitHub public API must provide a valid owner-only browser projection");
console.log("Verified real public GitHub API CORS and owner-only browser projection; status="+result.status+
  "; approved events="+result.events.length);
