import test from "node:test";
import assert from "node:assert/strict";
import {
  INSTAGRAM_READ_SCOPE,INSTAGRAM_AUTH_CALLBACK,
  INSTAGRAM_GRAPH_HOST,instagramBusinessAuthorizeUrl,
  instagramPublicEnabled,projectInstagramMedia,hiddenInstagram,
} from "../src/instagram-source.mjs";

const at=Date.parse("2026-11-13T23:00:00.000Z");
const state="a".repeat(43);
const base=()=>({
  data:[{
    id:"1798765432100123456",username:"devonalanakins",
    media_type:"IMAGE",caption:"Building useful things <script>bad()</script>",
    permalink:"https://www.instagram.com/p/C123abcD_/",
    timestamp:"2026-11-13T22:00:00+0000",
    media_url:"https://scontent.cdninstagram.com/v/t51.29350-15/photo.jpg?stp=dst-jpg",
    access_token:"DO_NOT_EXPOSE",insights:{impressions:1254},comments:{data:[]},
  }],
});

test("Instagram Business Login uses an exact fixed callback and only read-only scope",()=>{
  const url=new URL(instagramBusinessAuthorizeUrl({appId:"1713839290172872",state}));
  assert.equal(url.href.startsWith("https://www.instagram.com/oauth/authorize?"),true);
  assert.equal(url.searchParams.get("redirect_uri"),INSTAGRAM_AUTH_CALLBACK);
  assert.equal(url.searchParams.get("response_type"),"code");
  assert.equal(url.searchParams.get("scope"),INSTAGRAM_READ_SCOPE);
  assert.equal(url.searchParams.get("scope"),"instagram_business_basic");
  assert.equal(url.searchParams.get("state"),state);
  assert.equal(url.searchParams.get("enable_fb_login"),"false");
  assert.equal(INSTAGRAM_GRAPH_HOST,"https://graph.instagram.com");
  assert.equal(url.searchParams.has("client_secret"),false);
  for(const bad of ["",42,"MetaAppID","1234","1".repeat(34)])
    assert.throws(()=>instagramBusinessAuthorizeUrl({appId:bad,state}),TypeError);
  for(const bad of [undefined,"",state+"=",state.slice(1),"&".repeat(43)])
    assert.throws(()=>instagramBusinessAuthorizeUrl({appId:"1713839290172872",state:bad}),TypeError);
});

test("all independent Instagram release gates are required",()=>{
  const env={PRESENCE_ENABLED:"true",PRESENCE_PUBLIC_RELEASE_APPROVED:"true",
    INSTAGRAM_PUBLIC_RELEASE_APPROVED:"true",INSTAGRAM_PUBLIC_FEED_ENABLED:"true"};
  assert.equal(instagramPublicEnabled(env),true);
  for(const name of Object.keys(env))
    assert.equal(instagramPublicEnabled({...env,[name]:"false"}),false);
  assert.equal(instagramPublicEnabled(null),false);
  assert.equal(instagramPublicEnabled({}),false);
});

test("projector exposes only bounded real-post fields and permitted media URLs",()=>{
  const output=projectInstagramMedia(base(),{now:at,username:"devonalanakins"});
  assert.equal(output.state,"connected");
  assert.equal(output.version,1);
  assert.equal(output.checkedAt,new Date(at).toISOString());
  assert.equal(output.posts.length,1);
  assert.deepEqual(output.posts[0],{
    permalink:"https://www.instagram.com/p/C123abcD_/",
    publishedAt:"2026-11-13T22:00:00.000Z",mediaType:"IMAGE",
    caption:"Building useful things <script>bad()</script>",
    imageUrl:"https://scontent.cdninstagram.com/v/t51.29350-15/photo.jpg?stp=dst-jpg",
  });
  assert.doesNotMatch(JSON.stringify(output),/DO_NOT_EXPOSE|insights|comments|1798765432100123456/);
});

test("unknown media CDNs or signed-token query params never leak into the public contract",()=>{
  for(const href of [
    "https://evil.example/image.jpg",
    "http://scontent.cdninstagram.com/x.jpg",
    "https://scontent.cdninstagram.com.evil.example/x.jpg",
    "https://scontent.cdninstagram.com/x.jpg?access_token=PRIVATE",
    "https://user:pass@scontent.cdninstagram.com/x.jpg",
  ]){
    const payload=base();payload.data[0].media_url=href;
    const output=projectInstagramMedia(payload,{now:at,username:"devonalanakins"});
    assert.equal(output.posts[0].imageUrl,null);
    assert.equal(output.posts[0].permalink,"https://www.instagram.com/p/C123abcD_/");
  }
});

test("wrong account, forged links, future dates and oversized content fail closed",()=>{
  const variants=[
    item=>{item.username="not-the-owner";},
    item=>{item.permalink="https://instagram.com.evil.example/p/C123abcD/";},
    item=>{item.permalink="https://www.instagram.com/p/C123abcD/?access_token=PRIVATE";},
    item=>{item.permalink="http://www.instagram.com/reel/C123abcD/";},
    item=>{item.timestamp="2026-11-14T01:00:00.000Z";},
    item=>{item.media_type="STORY";},
    item=>{item.caption="X".repeat(10001);},
    item=>{item.id="abc";},
  ];
  for(const mutate of variants){
    const payload=base();mutate(payload.data[0]);
    assert.deepEqual(projectInstagramMedia(payload,{now:at,username:"devonalanakins"}),hiddenInstagram());
  }
  const duplicate=base();duplicate.data.push({...duplicate.data[0]});
  assert.deepEqual(projectInstagramMedia(duplicate,{now:at,username:"devonalanakins"}),hiddenInstagram());
  assert.deepEqual(projectInstagramMedia(base(),{now:at,username:"impossible space"}),hiddenInstagram());
  assert.deepEqual(projectInstagramMedia({data:Array(13).fill({})},{now:at,username:"devonalanakins"}),hiddenInstagram());
});

test("video Reels and carousel links are supported without inventing views or analytics",()=>{
  const data=base();data.data=[{
    id:"1798765432100123456",media_type:"VIDEO",
    permalink:"https://www.instagram.com/reel/Cr77Q1_/",
    timestamp:"2026-11-13T22:00:00+0000",caption:"A build in motion",
    thumbnail_url:"https://scontent.fbcdn.net/thumb.jpg",media_url:"https://scontent.cdninstagram.com/video.mp4",
  },{
    id:"1798765432100123457",media_type:"CAROUSEL_ALBUM",
    permalink:"https://www.instagram.com/p/A99abc_/",
    timestamp:"2026-11-13T22:00:00+0000",caption:"Media album",
  }];
  const output=projectInstagramMedia(data,{now:at,username:"devonalanakins"});
  assert.equal(output.state,"connected");
  assert.equal(output.posts.length,2);
  assert.equal(output.posts[0].imageUrl,"https://scontent.fbcdn.net/thumb.jpg");
  assert.equal(output.posts[1].imageUrl,null);
  assert.equal(output.posts[0].mediaType,"VIDEO");
  assert.equal(output.posts[1].mediaType,"CAROUSEL_ALBUM");
});
