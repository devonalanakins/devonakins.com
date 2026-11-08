import test from "node:test";
import assert from "node:assert/strict";
import { publicV5Playback } from "../src/v5/public-playback.mjs";
const now=Date.parse("2026-11-07T23:30:00.000Z");
const iso=(offset=0)=>new Date(now+offset).toISOString();
const id="AbCdEfGhIjKlMnOpQrStUv";
const playing=(extra={})=>({
  version:1,mode:"playing",detailsVisible:true,updatedAt:iso(-18000),
  track:{title:"Approved Track",artist:"Verified Artist",album:"Album",
    url:"https://open.spotify.com/track/"+id,
    image:"https://i.scdn.co/image/abcdefABCDEF1234"},
  playback:{durationMs:240000,progressMs:42000},...extra,
});
test("valid permitted playback displays title, Spotify-only link, artwork and source progress",()=>{
 const out=publicV5Playback(playing(),now);
 assert.equal(out.state,"playing");
 assert.equal(out.title,"Approved Track");
 assert.equal(out.artist,"Verified Artist");
 assert.equal(out.image,"https://i.scdn.co/image/abcdefABCDEF1234");
 assert.equal(out.href,"https://open.spotify.com/track/"+id);
 assert.deepEqual(out.progress,{value:60000,max:240000});
});
test("private, off-air and unavailable never publish track details",()=>{
 for(const [mode,expected] of [["hidden","private"],["off_air","off_air"],["unavailable","unavailable"]]){
   const out=publicV5Playback(playing({mode}),now);
   assert.equal(out.state,expected);
   assert.equal(out.href,"/listening/");
   assert.equal(out.image,null);
   assert.doesNotMatch(out.title,/Approved Track/);
 }
 const out=publicV5Playback(playing({detailsVisible:false}),now);
 assert.equal(out.title,"Playing privately");
 assert.equal(out.href,"/listening/");
});
test("invalid or stale timing, bad artwork URLs and malformed track URLs fail closed",()=>{
 for(const value of [
   null,{},playing({version:2}),playing({updatedAt:iso(-130000)}),
   playing({updatedAt:iso(20000)}),
   playing({track:{...playing().track,url:"https://evil.example/track/"+id}}),
   playing({track:{...playing().track,title:" "}}),
   playing({track:{...playing().track,artist:" "}}),
 ]){
   assert.notEqual(publicV5Playback(value,now).state,"playing");
 }
 const out=publicV5Playback(playing({track:{...playing().track,
   image:"https://evil.example/secret.png"}}),now);
 assert.equal(out.state,"playing");
 assert.equal(out.image,null);
});
test("unverified progress is suppressed and elapsed playback never claims a current track",()=>{
 const out=publicV5Playback(playing({playback:{durationMs:240000,progressMs:-1}}),now);
 assert.equal(out.state,"playing");
 assert.equal(out.progress,null);
 const ended=publicV5Playback(playing({playback:{durationMs:240000,progressMs:239000}}),now);
 assert.notEqual(ended.state,"playing");
 assert.equal(ended.href,"/listening/");
});
