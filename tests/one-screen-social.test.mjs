import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {renderOneScreenHome} from "../src/professional/one-screen.mjs";
import {renderSocialChannels,renderThreadsPreview} from "../src/professional/social-presence.mjs";
import {publicV5Threads} from "../src/v5/public-threads.mjs";

test("one-screen social rail uses only established addresses and a working in-page Threads destination",()=>{
  const html=renderOneScreenHome();
  assert.match(html,/aria-label="Social profiles and updates"/);
  assert.match(html,/href="https:\/\/github\.com\/devonalanakins"/);
  assert.match(html,/href="https:\/\/www\.instagram\.com\/devonalanakins\/"/);
  assert.match(html,/data-one-go="contact" aria-label="View public Threads updates/);
  assert.match(html,/Facebook · link pending/);
  assert.match(html,/Threads · feed status at right/);
  assert.doesNotMatch(html,/href="https:\/\/(?:www\.)?(?:threads\.com|threads\.net|facebook\.com)\//);
  assert.equal((html.match(/role="tabpanel"/g)||[]).length,6);
  assert.equal((html.match(/data-public-threads/g)||[]).length,1);
  assert.match(html,/data-threads-posts/);
  assert.match(html,/href="\/src\/professional\/social-presence\.css"/);
  assert.doesNotMatch(html,/<iframe|<script[^>]+(?:threads|facebook)\.com/);
});
test("social channels never create guessed profile links",()=>{
  const full=renderSocialChannels();
  const compact=renderSocialChannels(true);
  assert.match(full,/Facebook · link pending/);
  assert.match(full,/Threads · feed status at right/);
  assert.match(compact,/data-one-go="contact"/);
  assert.match(renderThreadsPreview(),/Public source not yet verified/);
  for(const markup of [full,compact]){
    assert.doesNotMatch(markup,/https:\/\/(?:www\.)?(?:threads|facebook)\./);
    assert.match(markup,/rel="noopener noreferrer"/);
  }
});
test("Threads preview consumes the existing fail-closed public projection, not scraped content",async()=>{
  const src=await readFile(new URL("../src/professional/signals.ts",import.meta.url),"utf8");
  assert.match(src,/publicV5Threads\(snapshot,Date\.now\(\)\)/);
  assert.match(src,/card\.querySelector<HTMLOListElement>\("\[data-threads-posts\]"\)/);
  assert.match(src,/link\.textContent=post\.text/);
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
