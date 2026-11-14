import test from "node:test";
import assert from "node:assert/strict";
import {verifyPublicThreadsSnapshot} from "../scripts/verify-live-threads.mjs";

const now=Date.parse("2026-11-13T22:00:00.000Z");
const post={
  href:"https://www.threads.com/@devonalanakins/post/ABCD1234",
  text:"Real approved public update",publishedAt:"2026-11-13T21:59:00.000Z",
  media:false,
};
const packet=()=>({
  version:4,asOf:new Date(now).toISOString(),threads:{
    version:1,state:"connected",checkedAt:new Date(now).toISOString(),posts:[post],
  },
});

test("protected release verifies actual connected public Threads and original post permalinks",()=>{
  assert.deepEqual(verifyPublicThreadsSnapshot(packet(),{action:"enable",now}),
    {state:"connected",count:1});
  const noPosts=packet();noPosts.threads.posts=[];
  assert.deepEqual(verifyPublicThreadsSnapshot(noPosts,{action:"enable",now}),
    {state:"connected",count:0});
  const revoked=packet();revoked.threads.state="disconnected";revoked.threads.posts=[];
  assert.deepEqual(verifyPublicThreadsSnapshot(revoked,{action:"disable",now}),
    {state:"disconnected",count:0});
  assert.throws(()=>verifyPublicThreadsSnapshot(revoked,{action:"enable",now}),/Connected/);
  assert.throws(()=>verifyPublicThreadsSnapshot(packet(),{action:"disable",now}),/hidden/);
});

test("stale and forged public provider packets never count as verified",()=>{
  const mutations=[
    p=>{p.threads.checkedAt="2026-11-13T20:00:00.000Z";},
    p=>{p.threads.posts[0]={...post,href:"https://evil.example/post/ABCD1234"};},
    p=>{p.threads.posts[0]={...post,href:"https://threads.com.evil.example/@devonalanakins/post/ABCD1234"};},
    p=>{p.threads.posts[0]={...post,href:"http://threads.com/@devonalanakins/post/ABCD1234"};},
    p=>{p.threads.posts[0]={...post,href:"https://threads.com/@devonalanakins/post/ABCD1234?access_token=no"};},
    p=>{p.threads.posts[0]={...post,text:""};},
    p=>{p.threads.posts[0]={...post,publishedAt:"2026-11-14T23:00:00.000Z"};},
    p=>{p.threads.posts.push(post);},
    p=>{p.threads.posts=Array(4).fill(post);},
    p=>{p.threads.token_cipher="PRIVATE";},
  ];
  for(const mutate of mutations){
    const p=packet();mutate(p);
    assert.throws(()=>verifyPublicThreadsSnapshot(p,{action:"enable",now}));
  }
  const stale=packet();stale.asOf="2026-11-13T19:00:00.000Z";
  assert.throws(()=>verifyPublicThreadsSnapshot(stale,{action:"enable",now}),/Fresh/);
  assert.throws(()=>verifyPublicThreadsSnapshot(packet(),{action:"preserve",now}),/Invalid/);
});
