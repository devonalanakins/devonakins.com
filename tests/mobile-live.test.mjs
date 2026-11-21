import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_PUBLICATION,LIVE_STATUS_PATH,renderMobileLive,readPublicLiveStatus,streamPlaybackOrigin} from '../src/professional/mobile-live.mjs';
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
