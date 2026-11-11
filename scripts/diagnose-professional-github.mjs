#!/usr/bin/env node
/**
 * Read-only release diagnosis. Logs only status codes, fixed provider
 * classifications and freshness; never logs GitHub events or any credentials.
 */
const allowedStatus=new Set(["available","empty","unavailable"]);
const allowedReason=new Set(["rate-limited","access-denied","provider-error","invalid-response","timeout","network-error"]);
async function request(url,headers,timeout=12000){
  try{
    const response=await fetch(url,{method:"GET",headers,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(timeout)});
    return response;
  }catch(error){
    return {ok:false,status:0,headers:new Headers(),networkError:error?.name==="TimeoutError"?"timeout":"network"};
  }
}
const site=await request("https://devonakins.com/api/github/public-feed",{Accept:"application/json"});
let projection={};
if(site.status===200 && /application\/json/i.test(site.headers.get("content-type")||"")){
  try{
    const body=await site.json();
    const at=Date.parse(body?.checkedAt);
    const retry=Date.parse(body?.retryAt);
    projection={
      sourceValid:body?.source==="GitHub public events API",
      mode:allowedStatus.has(body?.status)?body.status:"invalid-status",
      reason:allowedReason.has(body?.reason)?body.reason:null,
      count:Array.isArray(body?.events)?body.events.length:null,
      ageMinutes:Number.isFinite(at)?Math.round((Date.now()-at)/60000):null,
      retryInMinutes:Number.isFinite(retry)?Math.round((retry-Date.now())/60000):null,
    };
  }catch{projection={mode:"parse-failure"};}
}
console.log("PUBLIC_FEED_DIAG "+JSON.stringify({httpStatus:site.status,
  error:site.networkError||null,contentTypeOk:/application\/json/i.test(site.headers.get("content-type")||""),...projection}));
const provider=await request("https://api.github.com/users/devonalanakins/events/public?per_page=10",{
  Accept:"application/vnd.github+json","User-Agent":"devonakins-public-feed-check",
  "X-GitHub-Api-Version":"2022-11-28",
});
console.log("GITHUB_API_DIAG "+JSON.stringify({httpStatus:provider.status,error:provider.networkError||null,
  remaining:/^[0-9]+$/.test(provider.headers.get("x-ratelimit-remaining")||"")?
    Number(provider.headers.get("x-ratelimit-remaining")):null,
  hasRetryAfter:provider.headers.has("retry-after"),contentTypeOk:/application\/json/i.test(provider.headers.get("content-type")||"")}));
const atom=await request("https://github.com/devonalanakins.atom",{Accept:"application/atom+xml", "User-Agent":"devonakins-public-feed-check"});
console.log("GITHUB_ATOM_DIAG "+JSON.stringify({httpStatus:atom.status,error:atom.networkError||null,
  contentTypeOk:/xml|atom/i.test(atom.headers.get("content-type")||"")}));
if(atom.status===200){
  try{
    const xml=await atom.text();
    const entries=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0,7).map(match=>{
      const s=match[1];
      const id=/<id>([^<]{1,200})<\/id>/.exec(s)?.[1]||"";
      const link=/<link[^>]*href="([^"]+)"[^>]*\/>/.exec(s)?.[1]||"";
      const repo=/^https:\/\/github\.com\/devonalanakins\/([A-Za-z0-9_.-]{1,100})(?:[/?#]|$)/.exec(link)?.[1]||null;
      const actor=/<author>[\s\S]*?<name>devonalanakins<\/name>/.test(s);
      const published=/<published>[^<]+<\/published>/.test(s);
      const updated=/<updated>[^<]+<\/updated>/.test(s);
      const idKind=/^tag:github\.com,\d{4}:([A-Za-z]+)\//.exec(id)?.[1]||null;
      return {idKind,repo,actor,published,updated,hasAlternateLink:link.startsWith("https://github.com/")};
    });
    console.log("GITHUB_ATOM_STRUCTURE "+JSON.stringify({size:xml.length,entries:entries.length,examples:entries}));
  }catch { console.log("GITHUB_ATOM_STRUCTURE "+JSON.stringify({parseError:true}));}
}
