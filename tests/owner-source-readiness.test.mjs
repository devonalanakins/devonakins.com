import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ownerSourceReadiness} from "../src/owner-source-readiness.mjs";
import {ownerThreadsReadiness} from "../src/threads-public.mjs";
import {renderPresenceOwner} from "../src/presence-owner-page.mjs";

const env={
  PRESENCE_ENABLED:"true",PRESENCE_PUBLIC_RELEASE_APPROVED:"true",
  PRESENCE_EDITOR_ENABLED:"true",LISTENING_PUBLIC_RELEASE_APPROVED:"true",
  GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED:"true",
  GITHUB_INTEGRATION_ENABLED:"true",GITHUB_INSTALLATION_ID:"1234567",
  SPOTIFY_CLIENT_ID:"a".repeat(24),
  THREADS_PUBLIC_USERNAME:"fixtureHandle",
  THREADS_USER_ACCESS_TOKEN:"x".repeat(40),
  THREADS_PUBLIC_RELEASE_APPROVED:"true",THREADS_PUBLIC_FEED_ENABLED:"true",
};
const visibility={editor_enabled:1,public_enabled:1,private_work:0};

test("Threads owner readiness needs each independent approval gate",()=>{
  const ready=ownerThreadsReadiness(env);
  assert.equal(ready.configured,true);
  assert.equal(ready.providerObserved,false);
  assert.equal(ready.observedAt,null);
  for(const name of ["THREADS_PUBLIC_FEED_ENABLED","THREADS_PUBLIC_RELEASE_APPROVED",
    "PRESENCE_ENABLED","PRESENCE_PUBLIC_RELEASE_APPROVED"]){
    assert.equal(ownerThreadsReadiness({...env,[name]:"false"}).configured,false);
  }
  assert.equal(ownerThreadsReadiness({...env,THREADS_USER_ACCESS_TOKEN:null}).configured,false);
});

test("owner status shows configured sources without leaking private inputs or claiming playback",async()=>{
  const fixtureDb={prepare(query){
    assert.equal(query,"SELECT * FROM listening_account WHERE id=1");
    return {first:async()=>({
      refresh_cipher:"fixtureCipher",public_enabled:1,show_details:1,
      reauth_required:0,reauth_due:Date.now()+3600000,
    })};
  }};
  const data=await ownerSourceReadiness({...env,LISTENING_DB:fixtureDb},visibility);
  assert.equal(data.spotify.connection,"authorization-stored");
  assert.equal(data.spotify.lastObservedAt,null);
  assert.equal(data.threads.configured,true);
  assert.equal(data.github.observed,"not-checked");
  assert.equal(data.editor.ownerSharingSelected,true);
  assert.equal(data.gpt.automaticAccountTelemetry,false);
  const result=JSON.stringify(data);
  for(const value of ["x".repeat(40),"fixtureHandle","fixtureCipher","1234567"])
    assert.equal(result.includes(value),false);
});

test("missing and failed configuration never becomes a live provider status",async()=>{
  const empty=await ownerSourceReadiness({},null);
  assert.equal(empty.spotify.connection,"unverified");
  assert.equal(empty.threads.configured,false);
  assert.equal(empty.tasks.publicSharingSelected,false);
  const failed=await ownerSourceReadiness({...env,
    LISTENING_DB:{prepare(){throw Error("test database failure");}}},visibility);
  assert.equal(failed.spotify.connection,"unverified");
  assert.equal(JSON.stringify(failed).includes("test database failure"),false);
});

test("owner view links to existing protected controls and includes no provider credentials",()=>{
  const html=renderPresenceOwner();
  assert.match(html,/id="owner-source-readiness"/);
  assert.match(html,/Threads requires a separately approved Meta account authorization/);
  assert.ok(html.includes('href="/owner/listening/"'));
  assert.doesNotMatch(html,/THREADS_USER_ACCESS_TOKEN/);
});

test("owner summary reports only authorized, nonsecret pairing metadata", async()=>{
  const at=Date.parse("2026-11-09T04:00:00.000Z");
  const input={...env, LISTENING_DB:{prepare(sql){
    if(sql==="SELECT * FROM listening_account WHERE id=1")
      return {first:async()=>null};
    if(sql==="SELECT generation,token_hash,token_until,last_at FROM presence_editor WHERE id=1")
      return {first:async()=>({generation:7,token_hash:"fixtureHashNeverDisclose",
        token_until:at+60_000,last_at:at-20_000})};
    if(sql.startsWith("SELECT COUNT(*) AS total,"))
      return {bind(time,generation){
        assert.equal(time,at);
        assert.equal(generation,7);
        return {first:async()=>({total:2,sharing:1})};
      }};
    throw Error("Unexpected read query: "+sql);
  }}};
  const ready=await ownerSourceReadiness(input,
    {...visibility,editor_generation:7},at);
  assert.equal(ready.editor.paired,true);
  assert.equal(ready.editor.lastObservedAt,new Date(at-20_000).toISOString());
  assert.equal(ready.tasks.connectedSourceCount,2);
  assert.equal(ready.tasks.publicSourceCount,1);
  const text=JSON.stringify(ready);
  assert.doesNotMatch(text,/fixtureHashNeverDisclose|private-client|access_token/);
  assert.equal(ready.editor.observed,"not-checked",
    "A stored editor token does not prove a live edit");
  assert.equal(ready.tasks.observed,"not-checked",
    "One registered runner does not prove an active task");
});

test("expired or mismatched pairing and missing D1 cannot impersonate activity",async()=>{
  const at=Date.parse("2026-11-09T04:00:00.000Z");
  const withDb={...env,LISTENING_DB:{prepare(sql){
    if(sql==="SELECT * FROM listening_account WHERE id=1")
      return {first:async()=>null};
    if(sql==="SELECT generation,token_hash,token_until,last_at FROM presence_editor WHERE id=1")
      return {first:async()=>({generation:2,token_hash:"oldHash",
        token_until:at-1,last_at:at-30_000})};
    if(sql.startsWith("SELECT COUNT(*) AS total,"))
      return {bind:()=>({first:async()=>({total:0,sharing:null})})};
    throw Error("Unknown query");
  }}};
  const state=await ownerSourceReadiness(withDb,
    {...visibility,editor_generation:3},at);
  assert.equal(state.editor.paired,false);
  assert.equal(state.editor.lastObservedAt,null);
  assert.equal(state.tasks.connectedSourceCount,0);
  assert.equal(state.tasks.publicSourceCount,0);
  const empty=await ownerSourceReadiness({...env,LISTENING_DB:null},null,at);
  assert.equal(empty.editor.paired,null);
  assert.equal(empty.tasks.connectedSourceCount,null);
});

test("owner integration actions use current protected routes and accessible links",()=>{
  const js=readFileSync(new URL("../public/v2/presence-owner.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("../public/v2/presence.css",import.meta.url),"utf8");
  for(const route of ['/owner/listening/','/owner/github/','/owner/gpt/',
    '#editor-title','#reporters-title'])
    assert.ok(js.includes(route),"Missing existing source destination "+route);
  assert.match(js,/link\.textContent=action\[1\]/);
  assert.match(js,/link\.rel="noopener noreferrer"/);
  assert.match(css,/source-readiness-action:focus-visible/);
  assert.match(css,/min-height:44px/);
  assert.doesNotMatch(js,/THREADS_USER_ACCESS_TOKEN|SPOTIFY_CLIENT_SECRET|innerHTML=/);
});
