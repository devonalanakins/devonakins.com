/** Meta Threads signed deauthorization and data-deletion callbacks.
 * Provider callbacks do not carry the owner's browser/Access session.
 * The Threads app secret authenticates the exact signed_request bytes.
 * All local account revocation, pending-state removal and receipt storage
 * happen in a single D1 batch transaction. No account data is reflected.
 */
import {digest} from "./listening-crypto.mjs";
import {ownerJson,ownerError,ownerHeaders,boundDatabase,constantEqual} from "./listening-owner-core.mjs";

const callbacks=new Map([
  ["/api/threads/lifecycle/deauthorize","deauthorize"],
  ["/api/threads/lifecycle/delete","delete"],
]);
const statusPrefix="/api/threads/lifecycle/status/";
const scopedId=/^[0-9]{4,32}$/;
const base64url=/^[A-Za-z0-9_-]+$/;
const signature=/^[A-Za-z0-9_-]{43}$/;
const confirmation=/^[a-f0-9]{40}$/;
const encoder=new TextEncoder();
const retainedMs=180*86400000;
function decode(value){
  if(typeof value!=="string"||value.length<1||value.length>16384||!base64url.test(value))
    throw Error("Invalid payload");
  return Uint8Array.from(atob(value.replaceAll("-","+").replaceAll("_","/")
    .padEnd(Math.ceil(value.length/4)*4,"=")),c=>c.charCodeAt(0));
}
async function readBody(request){
  if(!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(request.headers.get("Content-Type")||""))
    throw Error("Invalid content type");
  const reader=request.body?.getReader();
  if(!reader)throw Error("Missing body");
  const parts=[];let total=0;
  try{
    while(true){
      const next=await reader.read();
      if(next.done)break;
      total+=next.value.byteLength;
      if(total>18000){await reader.cancel();throw Error("Body too large");}
      parts.push(next.value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  const params=new URLSearchParams(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if([...params.keys()].some(k=>k!=="signed_request")||
     params.getAll("signed_request").length!==1)throw Error("Invalid form");
  return params.get("signed_request");
}
async function verify(value,secret,now,kind){
  if(typeof value!=="string"||value.length>18000)throw Error("Invalid signed request");
  const parts=value.split(".");
  if(parts.length!==2||!signature.test(parts[0]))throw Error("Invalid signature");
  const payload=decode(parts[1]);
  if(payload.byteLength>12000)throw Error("Payload too large");
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const mac=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(parts[1])));
  const expected=btoa(String.fromCharCode(...mac)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
  if(!constantEqual(expected,parts[0]))throw Error("Invalid signature");
  const obj=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(payload));
  if(!obj||obj.algorithm!=="HMAC-SHA256"||!scopedId.test(String(obj.user_id||""))||
     !Number.isSafeInteger(obj.issued_at)||Math.abs(Math.floor(now/1000)-obj.issued_at)>3600)
    throw Error("Invalid signed request");
  return {id:String(obj.user_id),issuedAt:obj.issued_at,
    hash:await digest(kind+":"+value)};
}
const newCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(20)),
  v=>v.toString(16).padStart(2,"0")).join("");
const acknowledged=(kind,code)=>kind==="delete"
  ?ownerJson({url:"https://devonakins.com"+statusPrefix+code,confirmation_code:code})
  :ownerJson({received:true});
async function statusResponse(request,db){
  const url=new URL(request.url);
  const code=url.pathname.slice(statusPrefix.length);
  if(request.method!=="GET"||url.search)return ownerError("Not found",404);
  if(!confirmation.test(code))return ownerError("Not found",404);
  try{
    const record=await db.prepare(
      "SELECT 1 AS found FROM threads_lifecycle_receipt WHERE kind='delete' AND confirmation_code=?"
    ).bind(code).first();
    if(!record)return ownerError("Not found",404);
    return new Response("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">"+
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"+
      "<title>Threads data deletion</title><main><h1>Data deletion completed</h1>"+
      "<p>The connected Threads authorization and associated account data held by this integration have been removed where present.</p></main></html>",
      {status:200,headers:{...ownerHeaders,"Content-Type":"text/html; charset=utf-8"}});
  }catch{return ownerError("Integration unavailable",503);}
}
export function createThreadsMetaLifecycle({clock=Date.now}={}){
  return async(request,env={})=>{
    const url=new URL(request.url);
    if(url.origin!=="https://devonakins.com")return ownerError("Invalid request",400);
    if(url.pathname.startsWith(statusPrefix)){
      if(!boundDatabase(env))return ownerError("Integration unavailable",503);
      return statusResponse(request,env.LISTENING_DB);
    }
    const kind=callbacks.get(url.pathname);
    if(!kind)return ownerError("Not found",404);
    if(request.method!=="POST")return ownerError("Method not allowed",405);
    if(url.search)return ownerError("Invalid request",400);
    if(!boundDatabase(env)||typeof env.LISTENING_DB.batch!=="function"||
       typeof env.THREADS_APP_SECRET!=="string"||
       env.THREADS_APP_SECRET.length<20||env.THREADS_APP_SECRET.length>512)
      return ownerError("Integration unavailable",503);
    let signed;
    try{signed=await verify(await readBody(request),env.THREADS_APP_SECRET,clock(),kind);}
    catch{return ownerError("Invalid signed request",403);}
    try{
      const db=env.LISTENING_DB;
      const code=kind==="delete"?newCode():null;
      const maxConnectedAt=signed.issuedAt*1000;
      // D1 batch is one SQLite transaction: any statement error rolls back all.
      // Receipt guard makes replay harmless even after a later re-authorization.
      await db.batch([
        db.prepare("DELETE FROM threads_oauth_attempt WHERE EXISTS("+
          "SELECT 1 FROM threads_connection WHERE id=1 AND threads_user_id=? AND connected_at<=? "+
          "AND NOT EXISTS(SELECT 1 FROM threads_lifecycle_receipt WHERE request_hash=?))")
          .bind(signed.id,maxConnectedAt,signed.hash),
        db.prepare("UPDATE threads_connection SET revision=revision+1,token_cipher=NULL,"+
          "username=NULL,threads_user_id=NULL,connected_at=0,token_expires_at=0,verified_at=0 "+
          "WHERE id=1 AND threads_user_id=? AND connected_at<=? "+
          "AND NOT EXISTS(SELECT 1 FROM threads_lifecycle_receipt WHERE request_hash=?)")
          .bind(signed.id,maxConnectedAt,signed.hash),
        db.prepare("INSERT OR IGNORE INTO threads_lifecycle_receipt(request_hash,received_at,kind,confirmation_code) "+
          "VALUES(?,?,?,?)").bind(signed.hash,clock(),kind,code),
        db.prepare("DELETE FROM threads_lifecycle_receipt WHERE received_at<?")
          .bind(clock()-retainedMs),
      ]);
      const receipt=await db.prepare(
        "SELECT kind,confirmation_code FROM threads_lifecycle_receipt WHERE request_hash=?"
      ).bind(signed.hash).first();
      if(!receipt||receipt.kind!==kind||
         (kind==="delete"&&!confirmation.test(receipt.confirmation_code||"")))
        return ownerError("Integration unavailable",503);
      return acknowledged(kind,receipt.confirmation_code);
    }catch{return ownerError("Integration unavailable",503);}
  };
}
