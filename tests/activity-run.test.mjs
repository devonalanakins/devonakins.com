import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {runParticipatingTask,activityRequest,activityFailureReason,ActivityRequestFailure} from '../scripts/activity-run.mjs';
test('participating wrapper emits only real execution checkpoints and final status, never raw command/output or inherited credential',async()=>{
 const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();let at=Date.now();const sent=[];const token='T'.repeat(43);const sink={write(){}};
 const run=runParticipatingTask(['npm','test'],{sourceToken:'S'.repeat(43),clock:()=>at,stdout:sink,stderr:sink,fetcher:async(url,init)=>{const body=JSON.parse(init.body);sent.push({url,body});return Response.json(url.endsWith('/start')?{token,expiresAt:new Date(at+86400000).toISOString()}:{accepted:true});},spawnProcess:(file,args,opts)=>{assert.equal(file,'npm');assert.deepEqual(args,['test']);assert.equal(opts.shell,false);assert.equal(opts.env.DEVON_ACTIVITY_SOURCE_TOKEN,undefined);queueMicrotask(()=>{at+=31000;child.stdout.emit('data','PRIVATE command output');setImmediate(()=>child.emit('exit',0,null));});return child;}});
 assert.equal(await run,0);assert.deepEqual(sent.map(x=>x.body.state).filter(Boolean),['running','completed']);assert.equal(sent[1].body.checkpoint,'testing');assert.equal(sent[2].body.checkpoint,'tests-passed');assert.ok(!JSON.stringify(sent).includes('PRIVATE'));assert.ok(!JSON.stringify(sent).includes('npm'));
});
test('telemetry outage never prevents the real requested command from running',async()=>{
 let spawned=false;const child=new EventEmitter();const result=runParticipatingTask(['node','example.mjs'],{sourceToken:'S'.repeat(43),stdout:{write(){}},stderr:{write(){}},fetcher:async()=>new Response(null,{status:401}),spawnProcess:()=>{spawned=true;queueMicrotask(()=>child.emit('exit',7,null));return child;}});assert.equal(await result,7);assert.equal(spawned,true);
});
test('repository metadata maps only the owner catalog and unknown remotes never create a public task',async()=>{
 const {projectFromRemote}=await import('../scripts/activity-run.mjs');assert.equal(projectFromRemote('git@github.com:devonalanakins/merit.git'),'merit');assert.equal(projectFromRemote('https://github.com/devonalanakins/rhen.git'),'rhen');assert.equal(projectFromRemote('https://github.com/devonalanakins/private-client.git'),null);assert.equal(projectFromRemote('https://attacker.test/devonalanakins/merit'),null);
 const child=new EventEmitter();let calls=0;const result=runParticipatingTask(['npm','test'],{sourceToken:'S'.repeat(43),detectProject:()=>({available:true,projectSlug:null}),stdout:{write(){}},stderr:{write(){}},fetcher:async()=>{calls++;throw Error();},spawnProcess:()=>{queueMicrotask(()=>child.emit('exit',0,null));return child;}});assert.equal(await result,0);assert.equal(calls,0);
});

test('reporter failure classification is fixed and never reflects untrusted error text',()=>{
 for(const [code,expected] of [
  [400,/invalid reporter payload \(HTTP 400\)/],
  [401,/credential rejected or expired \(HTTP 401\)/],
  [403,/receiver denied \(HTTP 403\)/],
  [404,/receiver not available \(HTTP 404\)/],
  [409,/source project or state conflict \(HTTP 409\)/],
  [429,/source cooldown or task limit \(HTTP 429\)/],
  [500,/receiver error \(HTTP 500\)/],
 ]) assert.match(activityFailureReason(new ActivityRequestFailure(code)),expected);
 assert.equal(activityFailureReason(new Error('Bearer secret, client information')),'network or invalid response');
 assert.equal(activityFailureReason(null),'network or invalid response');
});

test('HTTP failure preserves status without reading or logging provider payloads',async()=>{
 let bodyRead=false;
 await assert.rejects(
  activityRequest('/api/activity/tasks/start',{version:1},'S'.repeat(43),
    async()=>({ok:false,status:401,headers:{get(){return null}},
      async json(){bodyRead=true;throw Error('provider secret');}})),
  e=>e instanceof ActivityRequestFailure && e.status===401
 );
 assert.equal(bodyRead,false);
});

test('a failed reporter exposes only a safe HTTP category while real work still runs',async()=>{
 for(const status of [401,409,429,503]){
  let diagnostics='';
  const child=new EventEmitter();
  const code=await runParticipatingTask(['node','safe-test'],{
    sourceToken:'S'.repeat(43),
    detectProject:()=>({available:true,projectSlug:'devonakins-com'}),
    stderr:{write(text){diagnostics+=text;}},
    stdout:{write(){}},
    fetcher:async()=>Response.json({error:'private provider text',token:'never-visible'}, {status}),
    spawnProcess:()=>{queueMicrotask(()=>child.emit('exit',0,null));return child;}
  });
  assert.equal(code,0);
  assert.match(diagnostics,new RegExp('HTTP '+status));
  assert.doesNotMatch(diagnostics,/private provider text|never-visible|S{20}/);
 }
});

test('missing or invalid HTTP response cannot produce false positive activity',async()=>{
 let messages='';
 const child=new EventEmitter();
 const code=await runParticipatingTask(['node','safe-test'],{
   sourceToken:'S'.repeat(43),
   detectProject:()=>({available:true,projectSlug:'devonakins-com'}),
   stderr:{write(s){messages+=s;}},stdout:{write(){}},
   fetcher:async()=>{throw Error('token_secret_please_dont_log');},
   spawnProcess:()=>{queueMicrotask(()=>child.emit('exit',0,null));return child;}
 });
 assert.equal(code,0);
 assert.match(messages,/network or invalid response/);
 assert.doesNotMatch(messages,/token_secret_/);
});
