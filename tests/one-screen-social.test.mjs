import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {renderOneScreenHome} from "../src/professional/one-screen.mjs";
import {renderSocialChannels,renderThreadsPreview,renderHomeSocialHub,renderHomeThreadsSignal,THREADS_PROFILE_URL,FACEBOOK_PROFILE_URL} from "../src/professional/social-presence.mjs";
import {publicV5Threads} from "../src/v5/public-threads.mjs";

test("verified social profiles and Threads signal appear on the initial Living Studio viewport",()=>{
  const html=renderOneScreenHome();
  assert.match(html,/aria-label="Social profiles and updates"/);
  assert.match(html,/href="https:\/\/github\.com\/devonalanakins"/);
  assert.match(html,/href="https:\/\/www\.instagram\.com\/devonalanakins\/"/);
  assert.match(html,/href="https:\/\/www\.threads\.com\/@devonalanakins"/);
  assert.match(html,/href="https:\/\/fb\.com\/devonalanakins"/);
  assert.doesNotMatch(html,/Facebook · pending/);
  assert.equal((html.match(/role="tabpanel"/g)||[]).length,6);
  assert.equal((html.match(/data-public-threads/g)||[]).length,2);
  assert.match(html,/class="studio-social-dock"/);
  assert.match(html,/class="studio-threads-inline"/);
  assert.match(html,/data-one-go="contact" aria-label="View all approved Threads updates"/);
  assert.match(html,/data-threads-posts/);
  assert.match(html,/href="\/src\/professional\/social-presence\.css"/);
  assert.doesNotMatch(html,/<iframe|<script[^>]+(?:threads|facebook)\.com/);
  assert.ok(html.indexOf('class="studio-social-dock"') < html.indexOf('id="one-panel-experience"'));
  assert.ok(html.indexOf('class="studio-threads-inline"') < html.indexOf('id="one-panel-experience"'));
});
test("public social profiles are separate from approved post display",()=>{
  const full=renderSocialChannels();
  const compact=renderSocialChannels(true);
  const home=renderHomeSocialHub();
  const signal=renderHomeThreadsSignal();
  assert.equal(THREADS_PROFILE_URL,"https://www.threads.com/@devonalanakins");
  assert.equal(FACEBOOK_PROFILE_URL,"https://fb.com/devonalanakins");
  for(const markup of [full,compact,home,signal,renderThreadsPreview()]){
    assert.match(markup,/https:\/\/www\.threads\.com\/@devonalanakins/);
    if(markup!==signal && markup!==renderThreadsPreview()) assert.match(markup,/https:\/\/fb\.com\/devonalanakins/);
    assert.doesNotMatch(markup,/access_token|client_secret|private grant|bearer/i);
  }
  assert.doesNotMatch(full,/Facebook · pending/);
  assert.doesNotMatch(compact,/FB · pending/);
  assert.match(full,/aria-label="Open Facebook profile in a new tab"/);
  assert.match(signal,/Public post sharing has not been enabled/);
  assert.match(signal,/CHECKING SOURCE/);
  assert.match(signal,/data-public-threads/);
  assert.match(signal,/data-threads-summary/);
  assert.match(signal,/data-threads-link/);
  assert.match(renderThreadsPreview(),/Public source not yet verified/);
});
test("Threads preview consumes the existing fail-closed public projection, not scraped content",async()=>{
  const src=await readFile(new URL("../src/professional/signals.ts",import.meta.url),"utf8");
  assert.match(src,/publicV5Threads\(snapshot,Date\.now\(\)\)/);
  assert.match(src,/card\.querySelector<HTMLOListElement>\("\[data-threads-posts\]"\)/);
  assert.match(src,/link\.textContent=post\.text/);
  assert.match(src,/a\.href=first\?first\.href:THREADS_PROFILE_URL/);
  assert.match(src,/link\.rel="noopener noreferrer"/);
  assert.match(src,/list\.replaceChildren\(\)/);
  assert.match(src,/\/api\/activity\/v4/);
  assert.doesNotMatch(src,/graph\.threads\.com|threads\.com\/oauth|localStorage|sessionStorage/);
});
test("authorized, fresh posts are public; revoked, forged and stale snapshots fail closed",()=>{
  const now=Date.parse("2026-11-12T22:10:00.000Z");
  const post={href:"https://www.threads.com/@verified/post/ABCd1234",
    text:"Source-backed engineering update",publishedAt:"2026-11-12T21:56:00.000Z",media:false};
  const input={version:4,asOf:"2026-11-12T22:09:58.000Z",
    threads:{version:1,state:"connected",checkedAt:"2026-11-12T22:09:58.000Z",posts:[post]}};
  assert.equal(publicV5Threads(input,now).posts.length,1);
  assert.equal(publicV5Threads({...input,threads:{...input.threads,state:"hidden"}},now).connected,false);
  assert.equal(publicV5Threads({...input,threads:{...input.threads,posts:[{...post,href:"https://evil.example/"}]}},now).connected,false);
  assert.equal(publicV5Threads(input,now+70000).connected,false);
});
test("social section respects compact viewports and first-party security boundaries",async()=>{
  const css=await readFile(new URL("../src/professional/social-presence.css",import.meta.url),"utf8");
  assert.match(css,/@media\s*\(max-width:760px\)/);
  assert.match(css,/max-height:730px/);
  assert.match(css,/overflow:auto/);
  assert.match(css,/focus-visible/);
  assert.doesNotMatch(css,/@import|https:\/\/fonts\.|url\(https?:/);
});
