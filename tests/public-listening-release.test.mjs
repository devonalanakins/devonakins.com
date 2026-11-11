import test from "node:test";
import assert from "node:assert/strict";
import {validPublicListening} from "../scripts/validate-public-listening.mjs";

const time="2026-11-10T20:00:00.000Z";
const base={version:1,mode:"playing",detailsVisible:true,updatedAt:time,track:{
  title:"Public Track",artist:"Public Artist",album:"Public Album",
  url:"https://open.spotify.com/track/"+"A".repeat(22),image:null,
}};
test("public listening accepts consent-filtered published states",()=>{
  for(const data of [
    {version:1,mode:"hidden",detailsVisible:false},
    {version:1,mode:"unavailable",detailsVisible:false,updatedAt:time},
    {version:1,mode:"off_air",detailsVisible:false,updatedAt:time},
    {version:1,mode:"playing",detailsVisible:false,updatedAt:time},
    base,
    {...base,playback:{durationMs:180000,progressMs:8000}},
  ]) assert.equal(validPublicListening(data),true,JSON.stringify(data));
});
test("public listening rejects metadata leakage, undeclared details and malformed tracks",()=>{
  for(const data of [
    {...base,refresh_cipher:"secret"},
    {...base,track:{...base.track,privateDevice:"headphones"}},
    {...base,track:{...base.track,url:"https://evil.invalid/track/"+"A".repeat(22)}},
    {...base,track:{...base.track,image:"https://attacker.invalid/cover.png"}},
    {...base,playback:{durationMs:5000,progressMs:9000}},
    {...base,mode:"hidden"},
    {...base,detailsVisible:false},
    {version:1,mode:"hidden",detailsVisible:false,track:base.track},
    {version:1,mode:"playing",detailsVisible:false,updatedAt:time,track:base.track},
    {version:1,mode:"unavailable",detailsVisible:false,updatedAt:time,access_token:"token"},
    {...base,updatedAt:"not a date"},
  ]) assert.equal(validPublicListening(data),false,JSON.stringify(data));
});
