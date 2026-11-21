import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_PUBLICATION,LIVE_STATUS_PATH,renderMobileLive,readPublicLiveStatus,createLiveStatusReader,streamPlaybackOrigin} from '../src/professional/mobile-live.mjs';
const request=(method='GET')=>new Request('https://devonakins.com'+LIVE_STATUS_PATH,{method});
const configured={publicEnabled:true,customerCode:'ABCdef12345',inputId:'a'.repeat(32)};
const provider=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});

test('default channel stays offline and never invokes the provider',async()=>{
 assert.equal(LIVE_PUBLICATION.publicEnabled,false);
 assert.equal(streamPlaybackOrigin(),null);
 const html=renderMobileLive();
 assert.match(html,/<h1 id="pc-live-title">Live from/);
 assert.match(html,/NOT BROADCASTING/);
 assert.match(html,/data-live-player hidden/);
 assert.doesNotMatch(html,/<iframe|stream key|Cloudflare API|Patient|autoplay/i);
 let requested=false;
 const reply=await readPublicLiveStatus(request(),{CLOUDFLARE_STREAM_READ_TOKEN:'private'},{fetchImpl:()=>{requested=true;throw Error('unexpected provider request')}});
 assert.equal((await reply.json()).state,'prelaunch');
 assert.equal(requested,false);
 assert.equal(reply.headers.get('cache-control'),'no-store');
});

test('live endpoint refuses writes and returns no private credentials',async()=>{
 const reply=await readPublicLiveStatus(request('POST'));
 assert.equal(reply.status,405);
 assert.equal(reply.headers.get('allow'),'GET, HEAD');
 assert.equal((await reply.json()).state,'method-not-allowed');
});

test('a live channel needs validated customer identifiers and a private token',async()=>{
 assert.equal(streamPlaybackOrigin({...configured,customerCode:'https://evil.test'}),null);
 assert.equal(streamPlaybackOrigin({...configured,inputId:'broken'}),null);
 assert.equal(streamPlaybackOrigin(configured),'https://customer-abcdef12345.cloudflarestream.com');
 for(const publication of [{...configured,inputId:'broken'},configured]){
   const reply=await readPublicLiveStatus(request(),{},{publication});
   assert.equal((await reply.json()).state,'unavailable');
 }
});

test('verified Cloudflare lifecycle exposes only the public player',async()=>{
 let providerUrl='';
 const options={publication:configured,fetchImpl:async(url,init)=>{
   providerUrl=url;
   assert.equal(init.headers.Authorization,'Bearer private-worker-token');
   return provider({isInput:true,live:true,videoUID:'b'.repeat(32)});
 }};
 const response=await readPublicLiveStatus(request(),{CLOUDFLARE_STREAM_READ_TOKEN:'private-worker-token'},options);
 const data=await response.json();
 assert.equal(data.state,'live');
 assert.equal(data.playerUrl,'https://customer-abcdef12345.cloudflarestream.com/'+'a'.repeat(32)+'/iframe');
 assert.equal(providerUrl,'https://customer-abcdef12345.cloudflarestream.com/'+'a'.repeat(32)+'/lifecycle');
 assert.doesNotMatch(JSON.stringify(data),/private-worker-token|videoUID|streamKey|ingest/i);
 const head=await readPublicLiveStatus(request('HEAD'),{CLOUDFLARE_STREAM_READ_TOKEN:'private-worker-token'},options);
 assert.equal(head.status,200);
 assert.equal(await head.text(),'');
});

test('idle, connection, malformed and provider failure states never claim live',async()=>{
 const env={CLOUDFLARE_STREAM_READ_TOKEN:'private'};
 const read=async(fetchImpl)=>(await(await readPublicLiveStatus(request(),env,{publication:configured,fetchImpl})).json());
 assert.deepEqual(await read(async()=>provider({isInput:true,live:false,videoUID:null})),{state:'offline'});
 assert.deepEqual(await read(async()=>provider({isInput:true,live:true,videoUID:null})),{state:'starting'});
 assert.deepEqual(await read(async()=>provider({isInput:true,live:true,videoUID:'bogus'})),{state:'starting'});
 assert.deepEqual(await read(async()=>provider({isInput:true,live:'yes'})),{state:'unavailable'});
 assert.deepEqual(await read(async()=>provider({isInput:false,live:true})),{state:'unavailable'});
 assert.deepEqual(await read(async()=>provider({},401)),{state:'unavailable'});
 assert.deepEqual(await read(async()=>{throw Error('sensitive upstream error')}),{state:'unavailable'});
});

test('status reader coalesces concurrent viewers, expires promptly and invalidates on privacy or token changes',async()=>{
 let ticks=1_000_000;
 let upstream=0;
 const publication={...configured};
 const reader=createLiveStatusReader({
   publication, now:()=>ticks, ttlMs:10_000,
   fetchImpl:async(url,init)=>{
     upstream++;
     assert.equal(init.headers.Authorization.startsWith('Bearer '),true);
     return provider({isInput:true,live:true,videoUID:'f'.repeat(32)});
   },
 });
 const env={CLOUDFLARE_STREAM_READ_TOKEN:'read-token-one'};
 const concurrent=await Promise.all(Array.from({length:24},(_,i)=>reader(request(i%2===0?'GET':'HEAD'),env)));
 assert.equal(upstream,1,'24 simultaneous viewer requests must share one provider call');
 assert.equal((await concurrent[0].json()).state,'live');
 assert.equal(await concurrent[1].text(),'');
 assert.equal(concurrent[0].headers.get('cache-control'),'no-store');
 assert.equal((await(await reader(request(),env)).json()).state,'live');
 assert.equal(upstream,1,'short-lived cache avoids repeated provider calls');
 ticks+=10_001;
 assert.equal((await(await reader(request(),env)).json()).state,'live');
 assert.equal(upstream,2,'cache expires within ten seconds');
 // A different key may not reuse any result fetched using a prior key.
 assert.equal((await(await reader(request(),{CLOUDFLARE_STREAM_READ_TOKEN:'read-token-two'})).json()).state,'live');
 assert.equal(upstream,3);
 assert.deepEqual(await(await reader(request(),{})).json(),{state:'unavailable'});
 assert.equal(upstream,3,'missing private token must never reuse cached public player');
 publication.publicEnabled=false;
 assert.deepEqual(await(await reader(request(),env)).json(),{state:'prelaunch'});
 assert.equal(upstream,3,'revocation must bypass all cached player results');
 assert.equal((await reader(request('POST'),env)).status,405);
});

test('provider failures are short-cached and never presented as live',async()=>{
 let ticks=500_000,upstream=0;
 const reader=createLiveStatusReader({
   publication:configured,now:()=>ticks,ttlMs:10_000,errorTtlMs:2_000,
   fetchImpl:async()=>{upstream++;throw Error('token or account details cannot be exposed');}
 });
 const env={CLOUDFLARE_STREAM_READ_TOKEN:'some-read-token'};
 for(let i=0;i<10;i++){
   const response=await reader(request(),env);
   assert.deepEqual(await response.json(),{state:'unavailable'});
 }
 assert.equal(upstream,1);
 ticks+=2_001;
 assert.deepEqual(await(await reader(request(),env)).json(),{state:'unavailable'});
 assert.equal(upstream,2);
});
