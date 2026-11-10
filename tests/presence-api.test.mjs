import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createPresenceOwnerApi, publicPresence, publicProfileNote, presenceRow, listeningDisclosure} from '../src/presence-api.mjs';
import {createHandler} from '../src/worker.mjs';

const start=Date.parse('2026-11-06T17:00:00.000Z');
const owner={access:{aud:'synthetic-audience',getIdentity:async()=>({email:'owner@example.test'})}};
function fixture() {
  const sql=new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0002_presence.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0003_presence_preferences.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0004_editor_pairing.sql',import.meta.url),'utf8'));
  const db={prepare(query){
    const statement=sql.prepare(query);let values=[];
    return {bind(...v){values=v;return this;},async first(){return statement.get(...values)||null;},async run(){return {meta:{changes:Number(statement.run(...values).changes)}};}};
  }};
  const env={PRESENCE_ENABLED:'true',PRESENCE_PUBLIC_RELEASE_APPROVED:'true',LISTENING_DB:db,
    LISTENING_OWNER_EMAIL:'owner@example.test',LISTENING_ACCESS_AUD:'synthetic-audience'};
  let time=start;
  const clock=()=>time;
  const api=createPresenceOwnerApi({clock});
  const request=(data,headers={})=>new Request('https://devonakins.com/api/presence/owner',{
    method:data?'POST':'GET',headers:{Origin:'https://devonakins.com','Content-Type':'application/json',...headers},
    ...(data?{body:JSON.stringify(data)}:{}),
  });
  const write=async(action,extra={})=>api(request({action,revision:(await presenceRow(env)).revision,...extra}),env,owner);
  return {env,api,request,write,sql,clock,advance(ms=1100){time+=ms;}};
}
const hidden=async()=>Response.json({version:1,mode:'hidden'});
test('custom public statuses require explicit review, expire and obey privacy shutoff',async()=>{
  const f=fixture();
  await f.write('settings',{enabled:true,privateWork:false,shareListening:false});f.advance();
  for(const extra of [{label:'Editing a chapter',labelApproved:false},{label:'Hidden\nline',labelApproved:true},{label:'a'.repeat(61),labelApproved:true}])
    assert.equal((await f.write('manual',{status:'custom',minutes:15,...extra})).status,400);
  assert.equal((await f.write('manual',{status:'custom',minutes:15,label:'Editing a new chapter',labelApproved:true})).status,200);
  const view=await publicPresence(f.env,hidden,f.clock);assert.equal(view.state,'offline');
  const note=await publicProfileNote(f.env,f.clock);
  assert.equal(note.visibility,'public');assert.equal(note.text,'Editing a new chapter');
  f.advance(16*60_000);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).state,'offline');
  assert.equal((await publicProfileNote(f.env,f.clock)).visibility,'hidden');
  await f.write('off');assert.equal((await publicPresence(f.env,hidden,f.clock)).visibility,'hidden');
});
test('24-hour public profile note persists independently of session and expires, obeying opt-in',async()=>{
  const f=fixture();
  assert.equal((await publicProfileNote(f.env,f.clock)).visibility,'hidden');
  await f.write('settings',{enabled:true,privateWork:false,shareListening:false});f.advance();
  assert.equal((await f.write('manual',{status:'custom',minutes:1440,label:'Building DevonAkins.com',labelApproved:true})).status,200);
  assert.equal((await publicProfileNote(f.env,f.clock)).text,'Building DevonAkins.com');
  assert.equal((await publicPresence(f.env,hidden,f.clock)).state,'offline','owner note is not live coding');
  f.advance();
  assert.equal((await f.write('start',{projectSlug:'merit',minutes:15})).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).state,'developing');
  assert.equal((await publicProfileNote(f.env,f.clock)).text,'Building DevonAkins.com');
  f.advance();
  await f.write('settings',{enabled:true,privateWork:true,shareListening:false});
  assert.equal((await publicProfileNote(f.env,f.clock)).visibility,'hidden','private mode wins');
  f.advance();
  await f.write('settings',{enabled:true,privateWork:false,shareListening:false});
  f.advance(24*60*60_000);
  assert.equal((await publicProfileNote(f.env,f.clock)).visibility,'hidden','expiry is truthful');
});
test('public note rejects excessive lifetime and immediately revokes on stop',async()=>{
  const f=fixture();await f.write('settings',{enabled:true,privateWork:false,shareListening:false});f.advance();
  assert.equal((await f.write('manual',{status:'custom',minutes:10081,label:'No',labelApproved:true})).status,400);
  assert.equal((await f.write('manual',{status:'sleeping',minutes:1440})).status,400);
  assert.equal((await f.write('manual',{status:'custom',minutes:10080,label:'Approved message',labelApproved:true})).status,200);
  assert.equal((await publicProfileNote(f.env,f.clock)).visibility,'public');
  await f.write('off');
  assert.equal((await publicProfileNote(f.env,f.clock)).visibility,'hidden');
});
test('owner project choices constrain sessions and remove an active disallowed label',async()=>{
  const f=fixture();await activate(f);f.advance();
  assert.equal((await f.write('projects',{projects:['mizvo']})).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).project,null);f.advance();
  assert.equal((await f.write('start',{projectSlug:'merit',minutes:15})).status,400);
  assert.equal((await f.write('start',{projectSlug:'mizvo',minutes:15})).status,200);f.advance();
  for(const projects of [['../clinical'],['mizvo','mizvo']]) assert.equal((await f.write('projects',{projects})).status,400);
  assert.equal((await f.write('projects',{projects:[]})).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).project,null);
});
async function activate(f) {
  assert.equal((await f.write('settings',{enabled:true,privateWork:false,shareListening:true})).status,200);
  f.advance();
  assert.equal((await f.write('start',{projectSlug:'merit',minutes:15})).status,200);
}
test('unconfigured feature touches no database; public view defaults hidden',async()=>{
  const f=fixture();const env={...f.env,PRESENCE_ENABLED:undefined,LISTENING_DB:{prepare(){throw Error('must not query');}}};
  assert.equal((await f.api(f.request(),env,owner)).status,404);
  assert.equal((await publicPresence(env,hidden)).visibility,'hidden');
});
test('owner controls reject spoofed headers, wrong audience, wrong identity and cross-site posts',async()=>{
  const f=fixture();
  for(const context of [{},{access:{...owner.access,aud:'other'}},{access:{...owner.access,getIdentity:async()=>({email:'someone@example.test'})}}]) {
    assert.equal((await f.api(f.request(null,{'Cf-Access-Authenticated-User-Email':'owner@example.test'}),f.env,context)).status,403);
  }
  for(const headers of [{Origin:'https://evil.example'},{'Sec-Fetch-Site':'cross-site'},{Origin:'null'}]) {
    assert.equal((await f.api(f.request({action:'off',revision:0},headers),f.env,owner)).status,403);
  }
});
test('public release requires separate approval, even for an authenticated owner',async()=>{
  const f=fixture();f.env.PRESENCE_PUBLIC_RELEASE_APPROVED='false';
  assert.equal((await f.write('settings',{enabled:true,privateWork:false,shareListening:true})).status,403);
  assert.equal((await f.write('start',{projectSlug:'merit',minutes:15})).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).visibility,'hidden');
});
test('real SQLite state supports session, pause, resume, 15-minute expiration and end',async()=>{
  const f=fixture();await activate(f);
  let state=await publicPresence(f.env,hidden,f.clock);
  assert.equal(state.state,'developing');assert.equal(state.source,'owner-declared');assert.equal(state.project,'Merit');
  f.advance();assert.equal((await f.write('pause')).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).state,'idle');
  f.advance();assert.equal((await f.write('resume',{minutes:15,projectSlug:'mizvo'})).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).project,'Mizvo');
  f.advance(15*60_000);
  state=await publicPresence(f.env,hidden,f.clock);assert.equal(state.state,'idle');assert.equal(state.project,null);
  f.advance();assert.equal((await f.write('end')).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).state,'offline');
});
test('music is independent; private mode hides all sources until owner explicitly clears it',async()=>{
  const f=fixture();await activate(f);
  let calls=0;const music=async()=>{calls++;return Response.json({version:1,mode:'playing',updatedAt:new Date(f.clock()).toISOString()});};
  assert.equal((await publicPresence(f.env,music,f.clock)).state,'in-the-zone');
  f.advance();await f.write('settings',{enabled:true,privateWork:true,shareListening:true});
  const state=await publicPresence(f.env,music,f.clock);assert.equal(state.state,'working-privately');assert.equal(state.project,null);
  assert.equal(calls,1);assert.equal((await listeningDisclosure(f.env)).allowed,false);
  f.advance(16*60_000);assert.equal((await publicPresence(f.env,music,f.clock)).state,'working-privately');
});
test('manual family/sleep states are explicit and expire without restoring old sessions',async()=>{
  const f=fixture();await activate(f);f.advance();
  assert.equal((await f.write('manual',{status:'family-time',minutes:15})).status,200);
  assert.equal((await publicPresence(f.env,hidden,f.clock)).state,'family-time');
  f.advance(16*60_000);assert.equal((await publicPresence(f.env,hidden,f.clock)).state,'offline');
});
test('kill switch fences delayed Spotify responses and stale re-enable requests',async()=>{
  const f=fixture();await activate(f);const previous=await presenceRow(f.env);
  let release,entered;const started=new Promise(r=>{entered=r;});
  const delayed=publicPresence(f.env,async()=>{entered();return new Promise(r=>{release=r;});},f.clock);
  await started;
  assert.equal((await f.write('off')).status,200);
  release(Response.json({version:1,mode:'playing',updatedAt:new Date(f.clock()).toISOString()}));
  assert.equal((await delayed).visibility,'hidden');
  f.advance();
  const replay=await f.api(f.request({action:'settings',revision:previous.revision,enabled:true,privateWork:false,shareListening:true}),f.env,owner);
  assert.equal(replay.status,409);
  assert.equal((await listeningDisclosure(f.env)).allowed,false);
  assert.equal((await f.write('off',{revision:0})).status,200);
});
test('database CAS rejects two concurrent owner updates; cooldown never blocks shutoff',async()=>{
  const f=fixture();const data={action:'start',revision:0,projectSlug:'merit',minutes:15};
  const responses=await Promise.all([f.api(f.request(data),f.env,owner),f.api(f.request(data),f.env,owner)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  assert.equal((await f.write('pause')).status,429);
  assert.equal((await f.write('off')).status,200);
});
test('strict schema rejects paths, clinical fields, unknown projects and unbounded content',async()=>{
  const f=fixture();
  for(const extra of [{projectSlug:'../patient',minutes:15},{projectSlug:'merit',minutes:2000},{projectSlug:'merit',minutes:15,filename:'patient.md'}]) {
    assert.equal((await f.write('start',extra)).status,400);
  }
  assert.equal((await f.write('manual',{status:'a'.repeat(2000),minutes:15})).status,400);
  assert.equal((await presenceRow(f.env)).revision,0);
});
test('owner status is no-store and preview matches public projection; no private SQL fields escape',async()=>{
  const f=fixture();await activate(f);
  const response=await f.api(f.request(),f.env,owner);assert.match(response.headers.get('Cache-Control'),/no-store/);
  const data=await response.json();assert.deepEqual(data.preview,await publicPresence(f.env,hidden,f.clock));
  assert.doesNotMatch(JSON.stringify(data),/session_source|changed_at|private_key|patient/);
});
test('actual Worker routes reject anonymous owner writes, never cache presence, and suppress music',async()=>{
  const f=fixture();const handler=createHandler({}, {version:'test'}, {now:()=>new Date(f.clock())});
  const response=await handler.fetch(new Request('https://devonakins.com/api/presence/public'),f.env);
  assert.equal(response.status,200);assert.equal((await response.json()).visibility,'hidden');assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal((await handler.fetch(f.request({action:'off',revision:0}),f.env)).status,403);
  const music=await handler.fetch(new Request('https://devonakins.com/api/listening/now'),f.env);
  assert.equal((await music.json()).mode,'hidden');assert.equal(music.headers.get('X-Content-Type-Options'),'nosniff');
  const head=await handler.fetch(new Request('https://devonakins.com/api/listening/now',{method:'HEAD'}),f.env);
  assert.equal(await head.text(),'');
});


test('public note HTTP endpoint is gated, noncacheable, and separately revocable',async()=>{
  const f=fixture();
  const worker=createHandler({}, {version:'test'}, {now:()=>new Date(f.clock())});
  const read=(method='GET')=>worker.fetch(new Request(
    'https://devonakins.com/api/presence/note',{method}),f.env);
  const empty={version:1,visibility:'hidden'};
  let response=await read();
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),empty);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.match(response.headers.get('CDN-Cache-Control'),/no-store/);
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal((await read('POST')).status,405,'public read endpoint must not accept writes');

  await f.write('settings',{enabled:true,privateWork:false,shareListening:false});
  f.advance();
  await f.write('manual',{status:'custom',minutes:1440,label:'Building a public project',labelApproved:true});
  response=await read();
  assert.equal(response.status,200);
  const visible=await response.json();
  assert.equal(visible.visibility,'public');
  assert.equal(visible.text,'Building a public project');
  assert.equal(Date.parse(visible.expiresAt)-Date.parse(visible.postedAt),24*60*60_000);
  const head=await read('HEAD');
  assert.equal(head.status,200);
  assert.equal(await head.text(),'');
  assert.match(head.headers.get('Cache-Control'),/no-store/);

  f.env.PRESENCE_PUBLIC_RELEASE_APPROVED='false';
  assert.deepEqual(await (await read()).json(),empty,'release approval revocation');
  f.env.PRESENCE_PUBLIC_RELEASE_APPROVED='true';
  await f.write('off');
  assert.deepEqual(await (await read()).json(),empty,'owner stop immediately revokes');
});

test('owner status discloses configuration only, and never to unauthenticated visitors',async()=>{
  const f=fixture();
  const material='x'.repeat(40);
  Object.assign(f.env,{
    THREADS_PUBLIC_USERNAME:'fixtureOwner',
    THREADS_USER_ACCESS_TOKEN:material,
    THREADS_PUBLIC_RELEASE_APPROVED:'true',
    THREADS_PUBLIC_FEED_ENABLED:'true',
  });
  const response=await f.api(f.request(),f.env,owner);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.sources.threads.configured,true);
  assert.equal(body.sources.threads.providerObserved,false);
  assert.equal(body.sources.spotify.connection,'unverified',
    'Presence fixture has no listening account table; do not guess connection');
  assert.equal(body.sources.github.observed,'not-checked');
  assert.equal(body.sources.gpt.automaticAccountTelemetry,false);
  assert.equal(JSON.stringify(body).includes(material),false);
  assert.equal(JSON.stringify(body).includes('fixtureOwner'),false);
  const unauthenticated=await f.api(f.request(),f.env,{});
  assert.equal(unauthenticated.status,403);
  assert.ok(!JSON.stringify(await unauthenticated.json()).includes('sources'));
});

test("Threads credential check is owner-only, same-origin POST and cannot enable publication",async()=>{
  const f=fixture(),seen=[];
  const env={...f.env,THREADS_USER_ACCESS_TOKEN:"s".repeat(40),
    THREADS_PUBLIC_USERNAME:"fixtureDevon",THREADS_PUBLIC_FEED_ENABLED:"false",
    THREADS_PUBLIC_RELEASE_APPROVED:"false"};
  const worker=createHandler({}, {version:"test"},{
    now:()=>new Date(f.clock()),
    threadsFetch:async(url,init)=>{
      seen.push({url,init});
      return Response.json({id:"278695012345",username:"fixtureDevon",secret:"DO_NOT_SHOW"});
    },
  });
  const url="https://devonakins.com/api/presence/owner?channel=threads";
  const request=(method="POST",origin="https://devonakins.com")=>
    new Request(url,{method,headers:{Origin:origin}});
  assert.equal((await worker.fetch(request(),env,{})).status,403,"Access identity required");
  assert.equal((await worker.fetch(request(),"",owner)).status,403,"empty env has no owner");
  assert.equal((await worker.fetch(request("GET"),env,owner)).status,405);
  assert.equal((await worker.fetch(request("POST","https://untrusted.test"),env,owner)).status,403);
  assert.equal(seen.length,0,"failed auth and CSRF checks must not contact Meta");
  const response=await worker.fetch(request(),env,owner);
  assert.equal(response.status,200);
  assert.match(response.headers.get("Cache-Control"),/no-store/);
  assert.match(response.headers.get("CDN-Cache-Control"),/no-store/);
  const payload=await response.json();
  assert.deepEqual(payload,{version:1,connection:"verified",
    checkedAt:new Date(f.clock()).toISOString()});
  assert.equal(seen.length,1);
  assert.equal(new URL(seen[0].url).searchParams.has("access_token"),false);
  assert.doesNotMatch(JSON.stringify(payload),/fixtureDevon|DO_NOT_SHOW|s{40}/);
  assert.equal(env.THREADS_PUBLIC_FEED_ENABLED,"false");
  assert.equal(env.THREADS_PUBLIC_RELEASE_APPROVED,"false");
});

test('legacy invalid project selection stays closed and is repairable only through owner choices',async()=>{
  const f=fixture();
  for(const invalid of [
    JSON.stringify(['devonakins-com','unknown-private-project']),
    JSON.stringify(['devonakins-com','devonakins-com']),
    JSON.stringify('devonakins-com'),
    '{invalid',
  ]){
    f.sql.prepare('UPDATE presence_state SET public_projects_json=? WHERE id=1').run(invalid);
    const response=await f.api(f.request(),f.env,owner);
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.projectChoicesNeedReview,true);
    assert.deepEqual(result.projects,[],'invalid selections never become public');
  }
  const ownerPage=await f.api(new Request('https://devonakins.com/owner/presence/'),f.env,owner);
  assert.equal(ownerPage.status,200);
  const markup=await ownerPage.text();
  assert.match(markup,/id="project-policy-warning"/);
  assert.match(markup,/Review and save only the projects/);
  // No automatic migration or inferred consent. An explicit owner save
  // replaces the stale list using the existing revision-checked operation.
  assert.equal((await f.write('projects',{projects:['devonakins-com']})).status,200);
  const saved=await (await f.api(f.request(),f.env,owner)).json();
  assert.equal(saved.projectChoicesNeedReview,false);
  assert.deepEqual(saved.projects,['devonakins-com']);
  f.advance();
  assert.equal((await f.write('projects',{projects:[]})).status,200);
  const intentionallyEmpty=await (await f.api(f.request(),f.env,owner)).json();
  assert.equal(intentionallyEmpty.projectChoicesNeedReview,false);
  assert.deepEqual(intentionallyEmpty.projects,[]);
});
