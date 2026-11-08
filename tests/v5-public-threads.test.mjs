import test from "node:test";
import assert from "node:assert/strict";
import {publicV5Threads,threadsPublicDate} from "../src/v5/public-threads.mjs";
const now=Date.parse("2026-11-07T20:00:00.000Z");
const t=new Date(now-2000).toISOString();
const post={href:"https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V",
 text:"Documented development update",publishedAt:t,media:false};
const packet={version:4,asOf:t,threads:{version:1,state:"connected",checkedAt:t,posts:[post]}};
test("shows sanitized approved public Threads posts only for recent source evidence",()=>{
 const s=publicV5Threads(packet,now);
 assert.equal(s.connected,true);
 assert.deepEqual(s.posts,[post]);
 assert.equal(threadsPublicDate(t),"Nov 7, 2026 UTC");
 assert.equal(publicV5Threads({...packet,threads:{...packet.threads,posts:[]}},now).connected,true);
});
test("revoked, stale, expired, unconnected or old V4 snapshots immediately clear posts",()=>{
 for(const invalid of [
  null,{}, {...packet,version:3},
  {...packet,asOf:new Date(now-70000).toISOString()},
  {...packet,threads:{version:1,state:"disconnected",posts:[]}},
  {...packet,threads:{...packet.threads,checkedAt:new Date(now-390000).toISOString()}},
  {...packet,threads:{...packet.threads,posts:Array(4).fill(post)}},
 ]) assert.equal(publicV5Threads(invalid,now).connected,false);
});
test("forged links, timestamps and private fields cannot render",()=>{
 for(const replacement of [
 {href:"https://evil.example/@fixtureDevon/post/CXtzA7JPq5V"},
 {href:"http://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V"},
 {href:"https://www.threads.com.evil.test/@fixtureDevon/post/CXtzA7JPq5V"},
 {href:"https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V?utm=secret"},
 {text:""},
 {publishedAt:new Date(now+120000).toISOString()},
 {media:"video"},
 ]) {
  const projected=publicV5Threads({...packet,threads:{...packet.threads,
    posts:[{...post,...replacement}]}},now);
  assert.equal(projected.connected,false);
 }
 assert.equal(publicV5Threads({...packet,threads:{...packet.threads,posts:[post,post]}},now).connected,false);
});
