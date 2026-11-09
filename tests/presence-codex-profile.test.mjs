import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { safeEnvironment, profileReading, readCodexProfile } =
  require('../extensions/presence-vscode/codex-profile-usage.cjs');

const now = '2026-11-09T13:25:00.000Z';
const summary = () => ({
  lifetimeTokens: 3300000000,
  peakDailyTokens: 314200000,
  longestRunningTurnSec: 82800,
  currentStreakDays: 30,
  longestStreakDays: 30,
});

function server({
  account = { type: 'chatgpt', email: 'never@share.test', planType: 'business' },
  usage = { summary: summary(), dailyUsageBuckets: [{ startDate:'2026-11-09', tokens: 1200 }] },
  badUsage = false, malformed = false, oversize = false, noResponse = false,
  windows = false, split = false,
} = {}) {
  const requests = [], launches = [];
  const launcher = (file, args, options) => {
    launches.push({file,args,options});
    const child = new EventEmitter();
    child.stdin = new EventEmitter();
    child.stdout = new EventEmitter();
    child.kill = () => {child.killed = true;};
    child.stdin.end = () => {};
    child.stdin.write = text => {
      const req = JSON.parse(text);
      requests.push(req);
      if (!noResponse) queueMicrotask(() => {
        if (oversize) {
          child.stdout.emit('data', Buffer.from('x'.repeat(270000)));
          return;
        }
        if (malformed) {
          child.stdout.emit('data', Buffer.from('{untrusted-bad-json}\n'));
          return;
        }
        const response = req.id === 0 ? { id:0, result:{ userAgent:'local-client' } } :
          req.id === 1 ? { id:1, result:{ account, requiresOpenaiAuth:true } } :
          req.id === 2 ? (badUsage ? {id:2,error:{code:401,message:'synthetic unauthorized'}} : {id:2,result:usage}) :
          null;
        if (!response) return;
        const data = JSON.stringify(response) + '\n';
        if (split && req.id === 2) {
          child.stdout.emit('data',Buffer.from(data.slice(0,7)));
          child.stdout.emit('data',Buffer.from(data.slice(7)));
        } else {
          child.stdout.emit('data',Buffer.from(data));
        }
      });
      return true;
    };
    return child;
  };
  const run = (args = {}) => readCodexProfile({
    launcher, platform:windows?'win32':'linux', clock:()=>now,
    environment: {PATH:'/bin',OPENAI_API_KEY:'should-never-be-forwarded',
      CODEX_ACCESS_TOKEN:'secret', OPENAI_BASE_URL:'https://invalid.example'},
    ...args,
  });
  return {run,requests,launches};
}

test('profile schema maps only allowlisted nonnegative integer values and dated source',()=>{
  const r=profileReading({summary:{...summary(), email:'secret', lifetimeTokenEstimate:1},dailyUsageBuckets:[{tokens:99999}]},now);
  assert.equal(r.lifetimeTokens,3300000000);
  assert.equal(r.peakDailyTokens,314200000);
  assert.equal(r.currentStreakDays,30);
  assert.equal(r.observedAt,now);
  assert.equal(r.source,'local-codex-app-server');
  assert.equal(r.upstreamUpdatedAt,null);
  assert.ok(!JSON.stringify(r).includes('email'));
  assert.ok(!JSON.stringify(r).includes('dailyUsageBuckets'));
  assert.equal(Object.isFrozen(r),true);
});

test('refuse invalid, negative, fractional, missing lifetime or unsafe counters',()=>{
  for(const bad of [
    null, {}, {summary:null}, {summary:{...summary(),lifetimeTokens:null}},
    {summary:{...summary(),lifetimeTokens:-1}},
    {summary:{...summary(),lifetimeTokens:0.7}},
    {summary:{...summary(),lifetimeTokens:Number.MAX_SAFE_INTEGER+1}},
    {summary:{...summary(),currentStreakDays:'30'}},
  ]) assert.equal(profileReading(bad,now),null);
  assert.equal(profileReading({summary:summary()},'invalid-date'),null);
});

test('reads only ChatGPT-backed profile after initialize and account checks',async()=>{
  const f=server({split:true});const result=await f.run();
  assert.equal(result.state,'available');
  assert.equal(result.reading.lifetimeTokens,3300000000);
  assert.equal(result.reading.currentStreakDays,30);
  assert.deepEqual(f.requests.map(x=>x.method),
    ['initialize','initialized','account/read','account/usage/read']);
  assert.equal(f.requests[0].params.clientInfo.name,'devonakins_presence_readonly');
  assert.equal(f.requests[2].params.refreshToken,false);
  assert.equal(f.launches[0].file,'codex');
  assert.deepEqual(f.launches[0].args,['app-server']);
  assert.equal(f.launches[0].options.shell,false);
  assert.equal(f.launches[0].options.stdio[2],'ignore');
  for(const key of ['OPENAI_API_KEY','CODEX_ACCESS_TOKEN','OPENAI_BASE_URL']) {
    assert.equal(f.launches[0].options.env[key],undefined);
  }
  assert.ok(!JSON.stringify(result).includes('never@share.test'));
  assert.ok(!JSON.stringify(result).includes('1200'), 'daily usage buckets are not silently aggregated');
});

test('Windows uses fixed local cmd.exe invocation without interpolation',async()=>{
  const f=server({windows:true});const result=await f.run();
  assert.equal(result.state,'available');
  assert.equal(f.launches[0].file,'cmd.exe');
  assert.deepEqual(f.launches[0].args,['/d','/s','/c','codex app-server']);
});

test('API-key-only Codex account is blocked before usage request',async()=>{
  const f=server({account:{type:'apiKey'}});
  const result=await f.run();assert.equal(result.state,'api-key-blocked');
  assert.ok(!f.requests.some(x=>x.method==='account/usage/read'));
});

test('missing or unrelated account fails closed',async()=>{
  for(const account of [null,{type:'amazonBedrock'},{type:'chatgptAuthTokens'}]){
    const f=server({account});const result=await f.run();
    assert.equal(result.state,'chatgpt-auth-required');
    assert.ok(!f.requests.some(x=>x.method==='account/usage/read'));
  }
});

test('unavailable provider usage and null lifetime remain missing rather than zero',async()=>{
  const f=server({badUsage:true});assert.equal((await f.run()).state,'usage-unavailable');
  const g=server({usage:{summary:{...summary(),lifetimeTokens:null}}});
  assert.equal((await g.run()).state,'usage-unavailable');
});

test('malformed and oversized local protocol payloads are rejected',async()=>{
  for(const opts of [{malformed:true},{oversize:true}]){
    const f=server(opts);const result=await f.run();
    assert.equal(result.state,'invalid-response');
  }
});

test('a process that fails before sending a result cannot report success',async()=>{
  const result=await readCodexProfile({
    launcher(){throw Error('no CLI installed')},
    clock:()=>now,
  });
  assert.equal(result.state,'unavailable');
});

test('sanitization preserves safe PATH and omits known credential overrides',()=>{
  assert.deepEqual(safeEnvironment({
    PATH:'/usr/bin',OPENAI_API_KEY:'secret',CODEX_API_KEY:'secret',
    CODEX_ACCESS_TOKEN:'secret',OPENAI_BASE_URL:'https://untrusted',
  }),{PATH:'/usr/bin'});
});

test('bounded timeout reports no data on a silent app-server',async()=>{
  const f=server({noResponse:true});
  const result=await f.run({timeoutMs:1000});
  assert.equal(result.state,'timeout');
  assert.deepEqual(f.requests.map(x=>x.method),['initialize']);
});
