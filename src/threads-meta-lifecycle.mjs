/** Signed Threads provider callbacks. No owner Access session on Meta-to-server requests.
 * No callback can publish content or reveal private account data.
 */
import {digest} from "./listening-crypto.mjs";
import {ownerJson,ownerError,boundDatabase,constantEqual} from "./listening-owner-core.mjs";

const paths=new Map([
  ["/api/threads/lifecycle/deauthorize","deauthorize"],
  ["/api/threads/lifecycle/delete","delete"],
]);
const scopedId=/^[0-9]{4,32}$/;
const signature=/^[A-Za-z0-9_-]{43}$/;
const encoder=new TextEncoder();
function decode(value){
  if(typeof value!=="string"||value.length<1||value.length>16384||!/^[A-Za-z0-9_-]+$/.test(value))throw Error("Invalid payload");
  const bytes=Uint8Array.from(atob(value.replaceAll("-","+").replaceAll("_","/").padEnd(Math.ceil(value.length/4)*4,"=")),c=>c.charCodeAt(0));
  return bytes;
}
async function readBody(request){
  if(!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(request.headers.get("Content-Type")||""))throw Error("Invalid content type");
  const bytes=await request.arrayBuffer();
  if(bytes.byteLength>18000)throw Error("Too large");
  const params=new URLSearchParams(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if([...params.keys()].some(k=>k!=="signed_request")||params.getAll("signed_request").length!==1)throw Error("Invalid form");
  return params.get("signed_request");
}
async function verify(value,secret,now){
  const parts=value.split(".");
  if(parts.length!==2||!signature.test(parts[0]))throw Error("Invalid signature");
  const payload=decode(parts[1]);
  if(payload.byteLength>12000)throw Error("Payload too large");
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const mac=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(parts[1])));
  const expected=btoa(String.fromCharCode(...mac)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
  if(!constantEqual(expected,parts[0]))throw Error("Invalid signature");
  const obj=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(payload));
  if(!obj||obj.algorithm!=="HMAC-SHA256"||!scopedId.test(String(obj.user_id||""))||
     !Number.isSafeInteger(obj.issued_at)||Math.abs(Math.floor(now/1000)-obj.issued_at)>3600)
    throw Error("Invalid signed request");
  return {id:String(obj.user_id),hash:await digest(value)};
}
export function createThreadsMetaLifecycle({clock=Date.now}={}){
  return async(request,env={})=>{
    const url=new URL(request.url);
    const kind=paths.get(url.pathname);
    if(!kind)return ownerError("Not found",404);
    if(request.method!=="POST")return ownerError("Method not allowed",405);
    if(url.origin!=="https://devonakins.com"||url.search)return ownerError("Invalid request",400);
    if(!boundDatabase(env)||typeof env.THREADS_APP_SECRET!=="string"||
       env.THREADS_APP_SECRET.length<20||env.THREADS_APP_SECRET.length>512)
      return ownerError("Integration unavailable",503);
    let signed;
    try{signed=await verify(await readBody(request),env.THREADS_APP_SECRET,clock());}
    catch{return ownerError("Invalid signed request",403);}
    try{
      const db=env.LISTENING_DB;
      // Conditional update is atomic: a callback for another account cannot revoke ours.
      const update=await db.prepare(
        "UPDATE threads_connection SET revision=revision+1,token_cipher=NULL,username=NULL,"+
        "threads_user_id=NULL,connected_at=0,token_expires_at=0,verified_at=0 "+
        "WHERE id=1 AND threads_user_id=?"
      ).bind(signed.id).run();
      await db.prepare("INSERT OR IGNORE INTO threads_lifecycle_receipt(request_hash,received_at,kind) VALUES(?,?,?)")
        .bind(signed.hash,clock(),kind).run();
      if(update.meta?.changes===1)
        await db.prepare("DELETE FROM threads_oauth_attempt").run();
      // Do not disclose whether a user ID matched the private owner account.
      return ownerJson({received:true});
    }catch{return ownerError("Integration unavailable",503);}
  };
}
