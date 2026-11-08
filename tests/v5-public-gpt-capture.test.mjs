import test from "node:test";
import assert from "node:assert/strict";
import {publicGptMetrics} from "../src/gpt-public-model.mjs";
import {
  publicV5GptCapture, formatPublicGptValue, publicGptCapturedAt,
} from "../src/v5/public-gpt-capture.mjs";

const now=Date.parse("2026-11-07T22:00:00.000Z");
const iso=(n=0)=>new Date(now+n).toISOString();
function reading(metric, value, extra={}) {
  const {unit,scope,source}=publicGptMetrics[metric];
  return {metric,unit,scope,source,value,asOf:iso(-120000),
    sourceUpdatedAt:null,freshness:"recent",...extra};
}
const seven=reading("profile_7d_tokens",143204887);
function gpt(extra={}) {
  return {state:"snapshot",metric:seven.metric,scope:seven.scope,
    source:seven.source,unit:seven.unit,asOf:seven.asOf,
    sourceUpdatedAt:null,freshness:seven.freshness,count:seven.value,
    observations:[seven,reading("profile_lifetime_tokens_approx",2310000000),
      reading("work_codex_credits_used",1.5)],...extra};
}
test("uses distinct validated personal tokens, approximate lifetime and work credits",()=>{
  const s=publicV5GptCapture(gpt(),now);
  assert.equal(s.available,true);
  assert.equal(s.headline.metric,"profile_7d_tokens");
  assert.equal(s.headline.value,143204887);
  assert.equal(s.readings.length,3);
  assert.equal(s.readings[1].metric,"profile_lifetime_tokens_approx");
  assert.equal(s.readings[2].scope,"work-codex");
  assert.equal(s.readings[2].unit,"credits");
  assert.equal(formatPublicGptValue(s.headline,true),"143.2M");
  assert.equal(formatPublicGptValue(s.readings[2]),"1.5");
  assert.equal(publicGptCapturedAt(seven.asOf),"Nov 7, 2026 UTC");
});
test("zero captures are honest data and dates do not advance with polling",()=>{
  const zero=gpt({count:0,observations:[reading("profile_7d_tokens",0)]});
  zero.asOf=iso(-120000);
  assert.equal(publicV5GptCapture(zero,now).headline.value,0);
  assert.equal(publicGptCapturedAt(zero.asOf),"Nov 7, 2026 UTC");
  assert.equal(publicGptCapturedAt("yesterday"),null);
});
test("fail closed on private, unshared, malformed, duplicate and future captures",()=>{
  for (const data of [
    null,{},gpt({state:"disconnected"}),gpt({state:"private"}),
    gpt({observations:[reading("profile_7d_tokens",5,{value:-3})]}),
    gpt({observations:[seven,seven]}),
    gpt({observations:[reading("work_codex_credits_used",7,
      {scope:"owner-profile"})]}),
    gpt({count:-8,observations:[]}),
    gpt({asOf:iso(120000),observations:[]}),
  ]) assert.equal(publicV5GptCapture(data,now).available,false);
});
test("other owner-approved metrics never masquerade as 7-day tokens",()=>{
 const other=reading("business_7d_messages",124);
 const s=publicV5GptCapture(gpt({metric:other.metric,count:other.value,
   unit:other.unit,scope:other.scope,source:other.source,asOf:other.asOf,
   observations:[other]}),now);
 assert.equal(s.available,true);
 assert.equal(s.headline,null);
 assert.equal(s.readings[0].metric,"business_7d_messages");
});
test("historic captures remain historical and preserve their real recorded date",()=>{
 const old=reading("profile_7d_tokens",123,{asOf:iso(-172800000),freshness:"historical"});
 const s=publicV5GptCapture(gpt({count:123,asOf:old.asOf,freshness:"historical",
 observations:[old]}),now);
 assert.equal(s.headline.freshness,"historical");
 assert.equal(publicGptCapturedAt(old.asOf),"Nov 5, 2026 UTC");
});
