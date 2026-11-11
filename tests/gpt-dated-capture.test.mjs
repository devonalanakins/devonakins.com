import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateDatedGptCapture,renderDatedGptCapture} from "../src/professional/gpt-capture.mjs";
import {renderProfessionalPage} from "../src/professional/site.mjs";

const newCapture=JSON.parse(await readFile(new URL("../public/gpt/snapshots/2026-11-10.json",import.meta.url),"utf8"));
const historical=JSON.parse(await readFile(new URL("../public/v2/usage-snapshot.json",import.meta.url),"utf8"));
const clone=()=>structuredClone(newCapture);

test("November 10 owner recording retains cumulative and seven-day scopes independently",()=>{
  const entry=validateDatedGptCapture(clone());
  assert.equal(entry.captureDate,"2026-11-10");
  assert.equal(entry.capturedAt,"2026-11-11T03:05:55Z");
  assert.equal(entry.attestation,"owner-recorded");
  assert.deepEqual(entry.profile,{
    lifetimeTokensApprox:3300000000,peakTokensApprox:314200000,
    longestTaskHours:23,longestStreakDays:31,currentStreakDays:31,
    skillsExplored:93,totalSkillUses:6795,fastModePercent:2,
    mostUsedReasoning:"Light",mostUsedReasoningPercent:36,
  });
  assert.deepEqual(entry.usage7d,{
    selection:"7d",tokens:526339878,messages:308,pluginCalls:190,
    skillUses:126,tokensUpdatedAt:"2026-11-11T01:00:00Z",
    toolsUpdatedAt:"2026-11-10T17:54:00Z",
  });
  assert.equal(Object.hasOwn(entry,"showcaseSites"),false);
  assert.equal(Object.hasOwn(entry.profile,"sites"),false);
  assert.equal(Object.hasOwn(entry.profile,"showcaseSites"),false);
});

test("immutable November 4 capture remains independent of November 10 snapshot",()=>{
  assert.equal(historical.asOf,"2026-11-04");
  assert.equal(historical.count,2700000000);
  assert.equal(historical.profile.profileInsightsAsOf,"2026-11-03");
  assert.deepEqual(historical.profile.weeklyActivity,{
    startDate:"2026-10-29",endDate:"2026-11-04",days:7,
    tokens:621712155,messages:325,pluginCalls:299,skillUses:114,
  });
  assert.notEqual(newCapture.profile.lifetimeTokensApprox,historical.count);
  assert.notEqual(newCapture.usage7d.tokens,historical.profile.weeklyActivity.tokens);
});

test("professional GPT page shows the new capture and preserves the prior dated archive",()=>{
  const markup=renderProfessionalPage("gpt",{
    datedCapture:clone(),historicalSnapshot:historical,
  });
  assert.match(markup,/Latest dated snapshot\./);
  for(const visible of ["≈3.3B","≈314.2M","23h","31 days",
    "6,795","93","Light · 36%","526,339,878","308","190","126",
    "≈2.7B","621,712,155","325","299","114",
    "Nov 10, 2026","Nov 11, 2026","November 4, 2026"]) {
    assert.ok(markup.includes(visible),"Missing dated source value: "+visible);
  }
  assert.ok(markup.indexOf("Latest dated snapshot.") < markup.indexOf("Earlier dated capture."));
  assert.match(markup,/href="\/v2\/usage-snapshot\.json"/);
  assert.match(markup,/2026-11-10/);
  assert.doesNotMatch(markup,/Showcase Sites|Sites by you|gpt-showcase-card|ANEVUM.*Sep 20/i);
  assert.doesNotMatch(markup,/now listening to|Live account usage|api-verified/i);
  assert.doesNotMatch(markup,/data-gpt-recording-private/);
});

test("earlier new captures remain accessible in the dated history if a later reading is added",()=>{
  const later=clone();later.captureDate="2026-11-11";later.capturedAt="2026-11-11T03:06:00Z";
  const markup=renderDatedGptCapture(later,historical,[clone()]);
  assert.match(markup,/href="\/gpt\/snapshots\/2026-11-10\.json"/);
  assert.match(markup,/526,339,878 seven-day tokens/);
  assert.throws(()=>renderDatedGptCapture(newCapture,historical,[later]),/not chronological/);
});

test("untrusted or malformed future-dated values fail closed and cannot publish a site record",()=>{
  const changes=[
    x=>x.version=2,
    x=>x.attestation="api-verified",
    x=>x.source="Unsourced account metrics",
    x=>x.capturedAt="2026-11-10T99:05:55Z",
    x=>x.captureDate="2026-11-09",
    x=>x.profile.lifetimeTokensApprox=-1,
    x=>x.profile.lifetimeTokensApprox="3.3B",
    x=>x.profile.currentStreakDays=1.5,
    x=>x.profile.mostUsedReasoning="<script>alert(1)</script>",
    x=>x.profile.mostUsedReasoningPercent=101,
    x=>x.usage7d.selection="30d",
    x=>x.usage7d.messages=-1,
    x=>x.usage7d.tokens="526339878",
    x=>x.usage7d.tokensUpdatedAt="2026-11-11T04:00:00Z",
    x=>x.usage7d.toolsUpdatedAt="invalid",
    x=>x.showcaseSites=[{name:"Unapproved"}],
    x=>x.profile.sites=["Unapproved"],
    x=>x.usage7d.privateChats=["Not public"],
  ];
  for(const mutate of changes) {
    const entry=clone();mutate(entry);
    assert.throws(()=>validateDatedGptCapture(entry));
  }
  const withoutCapture=renderProfessionalPage("gpt");
  assert.doesNotMatch(withoutCapture,/Latest dated snapshot\./);
  assert.match(withoutCapture,/data-gpt-value/);
});
