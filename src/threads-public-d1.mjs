/**
 * Public read-only Threads feed sourced exclusively from owner-encrypted D1.
 * An old Worker secret can never override local D1 disconnect/revocation.
 * Publication requires four explicit independent release gates; the ordinary
 * private OAuth connection alone never makes a post public.
 */
import {createPublicThreadsReader,disconnectedThreads} from "./threads-public.mjs";
import {storedThreadsCredential} from "./threads-owner-oauth.mjs";

export const publicThreadsReleaseAllowed=env=>
  env?.PRESENCE_ENABLED==="true" &&
  env?.PRESENCE_PUBLIC_RELEASE_APPROVED==="true" &&
  env?.THREADS_PUBLIC_RELEASE_APPROVED==="true" &&
  env?.THREADS_PUBLIC_FEED_ENABLED==="true";

export function createD1PublicThreadsReader({fetchImpl=fetch,clock=Date.now}={}){
  const provider=createPublicThreadsReader({fetchImpl,clock});
  return async(env={})=>{
    if(!publicThreadsReleaseAllowed(env))return disconnectedThreads();
    try{
      const before=await storedThreadsCredential(env,clock());
      if(!before?.publicFeedEnabled)return disconnectedThreads();
      const scoped={...env,THREADS_USER_ACCESS_TOKEN:before.token,
        THREADS_PUBLIC_USERNAME:before.username};
      const feed=await provider(scoped);
      // A cached response still requires a fresh D1 authorization fence.
      // Re-read after network/cache resolution so the owner can revoke a
      // running fetch or an earlier token while it is in flight.
      const after=await storedThreadsCredential(env,clock());
      if(!after?.publicFeedEnabled || after.revision!==before.revision ||
         after.cipher!==before.cipher ||
         after.username!==before.username ||
         after.expiresAt!==before.expiresAt ||
         !publicThreadsReleaseAllowed(env))
        return disconnectedThreads();
      return feed;
    }catch{return disconnectedThreads();}
  };
}
