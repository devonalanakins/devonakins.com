/** Owner-only readout. Configuration does not prove a provider observation.
 * Never include provider identifiers, access tokens, profile names or private
 * repository discovery in this response. The public V5 page never imports it.
 */
import { ownerThreadsReadiness } from "./threads-public.mjs";
import { ownerRow, ownerStatus } from "./listening-owner-core.mjs";

const on=(env,key)=>env?.[key]==="true";
export async function ownerSourceReadiness(env={},presence=null){
  const threads=ownerThreadsReadiness(env);
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
    },
    tasks:{
      reportersSupported:true,
      publicSharingSelected:presence?.public_enabled===1&&
        presence?.private_work!==1&&on(env,"PRESENCE_PUBLIC_RELEASE_APPROVED"),
      observed:"not-checked",
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
