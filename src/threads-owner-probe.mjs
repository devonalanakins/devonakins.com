/** Private, explicitly requested read-only Meta connection check.
 * Owner access and same-origin POST are mandatory. Never writes sharing flags,
 * persists access tokens or returns the provider's profile payload.
 */
import { isListeningOwner, validOwnerOrigin, ownerJson, ownerError } from "./listening-owner-core.mjs";
import { probeThreadsAuthorization } from "./threads-public.mjs";

export function createThreadsOwnerProbe({fetchImpl=fetch,clock=Date.now}={}) {
  return async (request,env={},ctx={})=>{
    if(!(await isListeningOwner(env,ctx)))
      return ownerError("Owner authentication required",403);
    if(request.method!=="POST")return ownerError("Method not allowed",405);
    if(!validOwnerOrigin(request))
      return ownerError("Cross-site operation denied",403);
    try {
      return ownerJson(await probeThreadsAuthorization(env,{fetchImpl,clock}));
    } catch {
      return ownerError("Connection check unavailable");
    }
  };
}
