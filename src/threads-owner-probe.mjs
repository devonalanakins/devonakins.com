/** Private, explicitly requested read-only Meta connection check.
 * Owner access and same-origin POST are mandatory. Never writes sharing flags,
 * persists access tokens or returns the provider's profile payload.
 */
import { isListeningOwner, validOwnerOrigin, ownerJson, ownerError } from "./listening-owner-core.mjs";
import { probeThreadsAuthorization } from "./threads-public.mjs";
import {storedThreadsCredential} from "./threads-owner-oauth.mjs";

export function createThreadsOwnerProbe({fetchImpl=fetch,clock=Date.now}={}) {
  return async (request,env={},ctx={})=>{
    if(!(await isListeningOwner(env,ctx)))
      return ownerError("Owner authentication required",403);
    if(request.method!=="POST")return ownerError("Method not allowed",405);
    if(!validOwnerOrigin(request))
      return ownerError("Cross-site operation denied",403);
    try {
      // Prefer an explicit legacy Worker secret, otherwise use the owner's
      // encrypted D1 OAuth connection. Neither token nor handle is returned.
      const stored=typeof env.THREADS_USER_ACCESS_TOKEN==="string" ? null :
        await storedThreadsCredential(env,clock());
      const effective=stored?{...env,THREADS_USER_ACCESS_TOKEN:stored.token,
        THREADS_PUBLIC_USERNAME:stored.username}:env;
      const result=await probeThreadsAuthorization(effective,{fetchImpl,clock});
      if(stored && result.connection==="verified"){
        const latest=await storedThreadsCredential(env,clock());
        if(!latest || latest.revision!==stored.revision ||
           latest.cipher!==stored.cipher)
          return ownerJson({version:1,connection:"unavailable",
            checkedAt:result.checkedAt});
      }
      return ownerJson(result);
    } catch {
      return ownerError("Connection check unavailable");
    }
  };
}
