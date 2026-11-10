import test from "node:test";
import assert from "node:assert/strict";
import { publicHomepageNote, publicHomepageFocus } from "../src/v5/homepage-focus.mjs";

const now = Date.parse("2026-11-10T09:00:00.000Z");
const iso = (ms) => new Date(now + ms).toISOString();
const note = (overrides = {}) => ({version:1,visibility:"public",
  text:"Shipping the portfolio",postedAt:iso(-60_000),expiresAt:iso(86_400_000),...overrides});

test("owner-published note persists as a clearly non-live focus fallback", () => {
  const focus = publicHomepageFocus({available:true,focus:null},note(),now);
  assert.equal(focus.kind,"owner-note");
  assert.equal(focus.title,"Shipping the portfolio");
  assert.match(focus.detail,/Owner-published note/);
  assert.match(focus.detail,/not a live work session/);
  assert.equal(publicHomepageNote(note(),now)?.expiresAt,iso(86_400_000));
});

test("verified current work takes precedence without promoting a note to editor evidence", () => {
  const focus = publicHomepageFocus({available:true,focus:{kind:"editor",title:"DevonAkins.com",
    source:"Editor observed",age:"12s ago"}},note(),now);
  assert.deepEqual(focus,{kind:"observed",title:"DevonAkins.com",
    detail:"Editor observed \u00b7 observed 12s ago"});
});

test("owner note can stand alone if separate V4 evidence is unavailable", () => {
  assert.equal(publicHomepageFocus(null,note(),now).kind,"owner-note");
  assert.equal(publicHomepageFocus({available:false,focus:null},note(),now).kind,"owner-note");
});

test("revoked, expired, hidden, malformed and overlong notes fail closed", () => {
  const invalid = [null,{},note({visibility:"private"}),note({expiresAt:iso(-1)}),
    note({postedAt:iso(20_000)}),note({expiresAt:iso(8*86_400_000)}),
    note({text:" "}),note({text:"x".repeat(61)}),note({text:"a\nb"}),
    note({text:"not trimmed "}),{...note(),internalUserId:"hidden"}];
  for (const entry of invalid) {
    assert.equal(publicHomepageNote(entry,now),null);
    assert.equal(publicHomepageFocus({available:true,focus:null},entry,now).kind,"unavailable");
  }
});

test("fallback does not reclassify old history as ongoing work", () => {
  const old = {available:true,focus:null,events:[{kind:"Commit",at:iso(-300_000)}]};
  assert.deepEqual(publicHomepageFocus(old,null,now),{kind:"unavailable",
    title:"No current public work observed",
    detail:"No fresh approved editor or participating task observations."});
});
