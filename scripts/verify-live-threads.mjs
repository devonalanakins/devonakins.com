/** Post-deploy read-only proof: public Threads posts are actually projected. */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const endpoint="https://devonakins.com/api/activity/v4";
const HOSTS=new Set(["threads.com","www.threads.com","threads.net","www.threads.net"]);
const POST=/^\/@[A-Za-z0-9._]{1,30}\/post\/[A-Za-z0-9_-]{4,50}\/?$/;

export function verifyPublicThreadsSnapshot(packet,{action,now=Date.now()}={}){
  if(!["enable","disable"].includes(action))throw Error("Invalid Threads release action");
  if(!packet || packet.version!==4 || !Number.isFinite(Date.parse(packet.asOf)) ||
     Math.abs(now-Date.parse(packet.asOf))>120_000)
    throw Error("Fresh public activity packet required");
  const source=packet.threads;
  if(!source||source.version!==1||!Array.isArray(source.posts)||source.posts.length>3)
    throw Error("Invalid Threads public projection");
  if(action==="disable"){
    if(source.state!=="disconnected"||source.posts.length!==0)
      throw Error("Threads public feed must be hidden");
    return {state:"disconnected",count:0};
  }
  if(source.state!=="connected"||!Number.isFinite(Date.parse(source.checkedAt))||
     now-Date.parse(source.checkedAt)>360_000||
     Date.parse(source.checkedAt)>now+60_000)
    throw Error("Connected, fresh Threads provider response required");
  const seen=new Set();
  for(const post of source.posts){
    let url;
    try{url=new URL(post.href);}catch{throw Error("Invalid Threads permalink");}
    if(url.protocol!=="https:"||!HOSTS.has(url.hostname)||
       !POST.test(url.pathname)||url.search||url.hash||url.port||
       url.username||url.password||seen.has(url.href))
      throw Error("Unsafe public Threads permalink");
    seen.add(url.href);
    if(typeof post.text!=="string"||!post.text.trim()||post.text.length>330||
       typeof post.media!=="boolean"||
       !Number.isFinite(Date.parse(post.publishedAt))||
       Date.parse(post.publishedAt)>now+60_000)
      throw Error("Invalid public Threads post");
  }
  if(/"(?:access_token|token_cipher|client_secret|refresh_token|Authorization)"\s*:/.test(JSON.stringify(packet)))
    throw Error("Private credential field exposed in public packet");
  return {state:"connected",count:source.posts.length};
}

async function main(){
  const action=process.env.THREADS_PUBLICATION_ACTION;
  // No secrets are ever requested or logged; a failed source stays fail closed.
  for(let attempt=0;attempt<6;attempt++){
    try{
      const response=await fetch(endpoint,{headers:{Accept:"application/json"},
        cache:"no-store",signal:AbortSignal.timeout(10000),redirect:"error"});
      if(!response.ok)throw Error("Public activity HTTP status invalid");
      if(!/application\/json/i.test(response.headers.get("Content-Type")||""))
        throw Error("Public activity content type invalid");
      const raw=await response.text();
      if(raw.length>100_000)throw Error("Public activity packet oversized");
      const proof=verifyPublicThreadsSnapshot(JSON.parse(raw),{action});
      console.log("Threads public source verified: "+proof.state+
        "; public posts="+proof.count+"; no provider data logged.");
      return;
    }catch{
      if(attempt===5)throw Error("Threads public release acceptance failed; review provider connection and revert through the protected disable action.");
      await new Promise(resolve=>setTimeout(resolve,2000));
    }
  }
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1]))
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
