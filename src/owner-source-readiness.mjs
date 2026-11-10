/** Owner-only readout. Configuration does not prove a provider observation.
 * Never include provider identifiers, access tokens, profile names or private
 * repository discovery in this response. The public V5 page never imports it.
 */
import { ownerThreadsReadiness } from "./threads-public.mjs";
import {storedThreadsStatus} from "./threads-owner-oauth.mjs";
import { ownerRow, ownerStatus } from "./listening-owner-core.mjs";

const on=(env,key)=>env?.[key]==="true";
export async function ownerSourceReadiness(env={},presence=null,at=Date.now()){
  const threads=ownerThreadsReadiness(env);
  // D1 OAuth authorization is a private stored credential, not approval to
  // display social posts or a claim of current public provider connectivity.
  const privateThreads=await storedThreadsStatus(env,at);
  threads.appConfigured=privateThreads.appConfigured;
  threads.privateStorageReady=privateThreads.storageReady;
  threads.privateConnected=privateThreads.connected;
  threads.privateExpiresAt=privateThreads.expiresAt;
  if(privateThreads.connected){
    threads.authorizationConfigured=true;
    threads.usernameConfigured=true;
    threads.configured=threads.publicationApproved && threads.feedEnabled &&
      threads.globallyEnabled;
  }
  const spotify={
    appConfigured:false,
    connection:"unverified",
    publicationApproved:on(env,"LISTENING_PUBLIC_RELEASE_APPROVED"),
    publicEnabled:false,
    reauthorizationRequired:null,
    lastObservedAt:null,
  };
  const spotifyApp=typeof env.SPOTIFY_CLIENT_ID==="string" &&
    /^[A-Za-z0-9]{16,64}$/.test(env.SPOTIFY_CLIENT_ID);
  spotify.appConfigured=spotifyApp;
  // This owner-only D1 status is proof of a stored authorization, NOT proof of
  // actual current playback. Do not read tracks or return encrypted materials.
  if(typeof env.LISTENING_DB?.prepare==="function"){
    try{
      const record=await ownerRow(env.LISTENING_DB);
      if(record){
        const status=ownerStatus(record,env);
        spotify.connection=status.connected?
          (status.reauthorizationRequired?"reauthorization-required":"authorization-stored"):
          "not-connected";
        spotify.publicEnabled=status.publicEnabled;
        spotify.reauthorizationRequired=status.reauthorizationRequired;
      }
    }catch{
      spotify.connection="unverified";
    }
  }
  // Owner-only, read-only pairing summary. A stored token hash is NOT an
  // observed edit or a provider-wide integration. Never return identifiers,
  // hashes, repo names, private events or user-supplied text.
  let editorPaired=null, editorLastObservedAt=null, connectedSourceCount=null;
  let publicSourceCount=null;
  if(typeof env.LISTENING_DB?.prepare==="function" &&
      Number.isFinite(at) && Number.isSafeInteger(presence?.editor_generation)){
    try{
      const row=await env.LISTENING_DB.prepare(
        "SELECT generation,token_hash,token_until,last_at FROM presence_editor WHERE id=1"
      ).first();
      editorPaired=Boolean(row?.token_hash &&
        row.generation===presence.editor_generation &&
        Number.isFinite(row.token_until) && row.token_until>at);
      if(editorPaired && Number.isFinite(row.last_at) && row.last_at>0 &&
          row.last_at<=at+10_000)
        editorLastObservedAt=new Date(row.last_at).toISOString();
    }catch{ editorPaired=null; editorLastObservedAt=null; }
    try{
      const row=await env.LISTENING_DB.prepare(
        "SELECT COUNT(*) AS total,"+
        "SUM(CASE WHEN public_enabled=1 THEN 1 ELSE 0 END) AS sharing "+
        "FROM activity_sources WHERE revoked=0 AND token_until>? AND generation=?"
      ).bind(at,presence.editor_generation).first();
      if(Number.isSafeInteger(row?.total) && row.total>=0 && row.total<=32 &&
          (row.sharing===null ||
           (Number.isSafeInteger(row.sharing) && row.sharing>=0 && row.sharing<=row.total))){
        connectedSourceCount=row.total;
        publicSourceCount=row.sharing??0;
      }
    }catch{ connectedSourceCount=null; publicSourceCount=null; }
  }
  return {
    version:1,
    checkedAt:null, // Never assert a live provider check from config reads.
    threads,
    spotify,
    github:{
      publicEventsImplemented:true,
      appIntegrationEnabled:on(env,"GITHUB_INTEGRATION_ENABLED"),
      authorizationConfigured:typeof env.GITHUB_INSTALLATION_ID==="string" &&
        /^[0-9]+$/.test(env.GITHUB_INSTALLATION_ID),
      observed:"not-checked",
    },
    editor:{
      serverEnabled:on(env,"PRESENCE_ENABLED")&&on(env,"PRESENCE_EDITOR_ENABLED"),
      ownerSharingSelected:presence?.editor_enabled===1 && presence?.public_enabled===1 &&
        presence?.private_work!==1,
      observed:"not-checked",
      paired:editorPaired,
      lastObservedAt:editorLastObservedAt,
    },
    tasks:{
      reportersSupported:true,
      publicSharingSelected:presence?.public_enabled===1&&
        presence?.private_work!==1&&on(env,"PRESENCE_PUBLIC_RELEASE_APPROVED"),
      observed:"not-checked",
      connectedSourceCount,
      publicSourceCount,
    },
    gpt:{
      captureToolAvailable:typeof env.LISTENING_DB?.prepare==="function",
      publicCaptureApproved:on(env,"GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED"),
      automaticAccountTelemetry:false,
      observed:"not-checked",
    },
    social:{
      instagram:"profile-link-only",
      facebook:"profile-destination-unverified",
    },
  };
}
