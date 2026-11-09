import test from "node:test";
import assert from "node:assert/strict";
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
  assert.match(html,/href="\\/owner\\/listening\\/"/);
  assert.doesNotMatch(html,/THREADS_USER_ACCESS_TOKEN/);
});
