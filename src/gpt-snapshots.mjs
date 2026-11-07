/**
 * Owner-attested GPT metrics, separate from the historical /gpt/ profile and
 * from provider-verified Work/Codex API usage.
 *
 * Data entry uses the existing Cloudflare Access owner boundary and dedicated
 * private D1. Publication requires two independent release gates plus explicit
 * per-metric approval, and the global Stop all broadcasting remains decisive.
 */
import {
  isListeningOwner,
  validOwnerOrigin,
  readSmallJson,
  ownerJson,
  ownerError,
} from './listening-owner-core.mjs';
import { renderGptOwner } from './gpt-owner-page.mjs';

export const GPT_OWNER_METRICS = Object.freeze({
  profile_7d_tokens: Object.freeze({label:'7-day tokens',unit:'tokens',scope:'owner-profile',source:'owner-profile-capture',max:1_000_000_000_000,integer:true,rank:0}),
  profile_lifetime_tokens_approx: Object.freeze({label:'Approx. lifetime tokens',unit:'tokens',scope:'owner-profile',source:'owner-profile-capture',max:1_000_000_000_000,integer:true,rank:1}),
  profile_7d_messages: Object.freeze({label:'7-day messages',unit:'messages',scope:'owner-profile',source:'owner-profile-capture',max:1_000_000_000,integer:true,rank:2}),
  profile_streak_days: Object.freeze({label:'Streak at capture',unit:'days',scope:'owner-profile',source:'owner-profile-capture',max:36500,integer:true,rank:3}),
  work_codex_credits_remaining: Object.freeze({label:'Work/Codex credits remaining',unit:'credits',scope:'work-codex',source:'owner-work-codex-usage',max:1_000_000,integer:false,rank:4}),
  work_codex_credits_used: Object.freeze({label:'Work/Codex credits used',unit:'credits',scope:'work-codex',source:'owner-work-codex-usage',max:1_000_000,integer:false,rank:5}),
  business_7d_messages: Object.freeze({label:'Member 7-day messages',unit:'messages',scope:'business-member',source:'owner-business-analytics',max:1_000_000_000,integer:true,rank:6}),
  business_7d_credits_used: Object.freeze({label:'Member 7-day credits',unit:'credits',scope:'business-member',source:'owner-business-analytics',max:1_000_000,integer:false,rank:7}),
});
export const GPT_FEATURED_METRIC = 'profile_7d_tokens';
const NO_DATA = Object.freeze({version:1,state:'disconnected',scope:'personal-work-codex',metric:null,period:null,count:null,asOf:null,source:null,freshness:'unavailable',observations:[]});
const ownerPath = '/api/presence/owner';
const pagePaths = new Set(['/owner/gpt', '/owner/gpt/']);
const iso = (at) => new Date(at).toISOString();
const validMetric = (metric) => typeof metric === 'string' && Object.hasOwn(GPT_OWNER_METRICS,metric);
const exact = (object, keys) => !!object && typeof object === 'object' &&
  !Array.isArray(object) && Object.keys(object).sort().join('|') === [...keys].sort().join('|');
const validValue = (metric,value) => validMetric(metric) && typeof value === 'number' &&
  Number.isFinite(value) && value >= 0 && value <= GPT_OWNER_METRICS[metric].max &&
  (!GPT_OWNER_METRICS[metric].integer || Number.isSafeInteger(value));
const validRow = (r,now) => validMetric(r?.metric) &&
  validValue(r.metric,r.value) &&
  r.source === GPT_OWNER_METRICS[r.metric].source &&
  Number.isSafeInteger(r.recorded_at) &&
  r.recorded_at <= now + 60_000 && r.recorded_at > 0 &&
  Number.isSafeInteger(r.revision) && r.revision >= 0 &&
  (r.shared === 0 || r.shared === 1);
const rowPublic = (r,now) => {
  if (!validRow(r,now)) return null;
  const d=GPT_OWNER_METRICS[r.metric];
  return {
    metric:r.metric,label:d.label,unit:d.unit,scope:d.scope,
    value:r.value,source:r.source,asOf:iso(r.recorded_at),
    sourceUpdatedAt:null,
    freshness: now-r.recorded_at<=86400000?'recent':'historical',
  };
};
const rows = async db => (await db.prepare(
  'SELECT metric,value,source,recorded_at,revision,shared FROM gpt_owner_metrics ORDER BY recorded_at DESC LIMIT 8'
).all()).results || [];
const envDb = env => env?.LISTENING_DB && typeof env.LISTENING_DB.prepare === 'function';
const publicApproved = env => env?.PRESENCE_ENABLED === 'true' &&
  env?.GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED === 'true' &&
  env?.PRESENCE_PUBLIC_RELEASE_APPROVED === 'true';

// The negative revision violates a named CHECK and aborts the whole batch.
// REPLACE also fails closed if the singleton is missing; it cannot silently
// accept writes without concurrency protection.
const captureGuard=(db,revision,at)=>db.prepare(
  'REPLACE INTO gpt_capture_state(id,revision) VALUES(1,CASE WHEN '+
  '(SELECT revision FROM gpt_capture_state WHERE id=1)=?'+
  (at===undefined?'':' AND NOT EXISTS (SELECT 1 FROM gpt_owner_metrics WHERE recorded_at>?)')+
  ' THEN (SELECT revision FROM gpt_capture_state WHERE id=1) ELSE -1 END)'
).bind(...(at===undefined?[revision]:[revision,at]));
const validRevision=value=>Number.isSafeInteger(value)&&value>=0;
const conflictError=error=>String(error?.message).includes('gpt_capture_revision');

export const disconnectedGptSnapshot = () => ({...NO_DATA,observations:[]});

function publicShape(r) {
  return {
    state:'snapshot',scope:r.scope,metric:r.metric,period:r.metric.includes('7d')?'7d':null,
    count:r.value,unit:r.unit,label:r.label,asOf:r.asOf,
    source:r.source,sourceUpdatedAt:null,freshness:r.freshness,
  };
}

export async function readPublicGptSnapshot(env, now=Date.now()) {
  if (!publicApproved(env) || !envDb(env)) return disconnectedGptSnapshot();
  try {
    const db=env.LISTENING_DB;
    const before=await db.prepare('SELECT revision,public_enabled,private_work FROM presence_state WHERE id=1').first();
    if (!before || before.public_enabled!==1 || before.private_work===1) return disconnectedGptSnapshot();
    const captureRevision=await db.prepare('SELECT revision FROM gpt_capture_state WHERE id=1').first();
    if(!validRevision(captureRevision?.revision))return disconnectedGptSnapshot();
    const captured=await rows(db);
    const visible=captured.filter(r=>r.shared===1).map(r=>rowPublic(r,now)).filter(Boolean);
    if (!visible.length) return disconnectedGptSnapshot();
    visible.sort((a,b)=>GPT_OWNER_METRICS[a.metric].rank-GPT_OWNER_METRICS[b.metric].rank);
    const after=await db.prepare('SELECT revision,public_enabled,private_work FROM presence_state WHERE id=1').first();
    if (after?.revision!==before.revision || after?.public_enabled!==1 ||
        after.private_work===1 || !publicApproved(env)) return disconnectedGptSnapshot();
    // Re-read every approved row: an update or revocation during projection
    // must not return a previously visible reading, even in the secondary list.
    const latest=await rows(db);
    for(const r of captured.filter(r=>r.shared===1)) {
      const current=latest.find(v=>v.metric===r.metric);
      if(!current || current.revision!==r.revision || current.shared!==1 ||
          current.recorded_at!==r.recorded_at || current.value!==r.value)
        return disconnectedGptSnapshot();
    }
    // One final authorization snapshot fences both per-metric and global
    // revocation; separate awaits would reopen a Stop-all race.
    const final=await db.prepare('SELECT p.revision,p.public_enabled,p.private_work,g.revision AS capture_revision FROM presence_state p JOIN gpt_capture_state g ON g.id=p.id WHERE p.id=1').first();
    if(final?.revision!==before.revision || final.public_enabled!==1 || final.private_work===1 ||
        final.capture_revision!==captureRevision.revision)return disconnectedGptSnapshot();
    const featured=visible.find(r=>r.metric===GPT_FEATURED_METRIC);
    return {...(featured?publicShape(featured):disconnectedGptSnapshot()),observations:visible};
  } catch { return disconnectedGptSnapshot(); }
}

export function createGptSnapshotOwnerApi({clock=Date.now}={}) {
  return async (request,env={},ctx={})=>{
    const url=new URL(request.url),path=url.pathname;
    if (!pagePaths.has(path) && !(path===ownerPath && url.search==='?channel=gpt')) return ownerError('Not found',404);
    if (!(await isListeningOwner(env,ctx))) return ownerError('Owner authentication required',403);
    if (pagePaths.has(path)) {
      if(request.method!=='GET' && request.method!=='HEAD') return ownerError('Method not allowed',405);
      return new Response(request.method==='HEAD'?null:renderGptOwner(GPT_OWNER_METRICS),{
        status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
        'X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'},
      });
    }
    if (!['GET','POST','DELETE'].includes(request.method)) return ownerError('Method not allowed',405);
    if (request.method!=='GET' && !validOwnerOrigin(request)) return ownerError('Cross-site operation denied',403);
    if(!envDb(env)) return ownerError('Private analytics database unavailable');
    try {
      const db=env.LISTENING_DB, at=clock();
      if(!Number.isSafeInteger(at)||at<0) return ownerError();
      if(request.method==='GET') {
        if(typeof db.batch!=='function')return ownerError('Atomic analytics database unavailable');
        const result=await db.batch([
          db.prepare('SELECT revision FROM gpt_capture_state WHERE id=1'),
          db.prepare('SELECT metric,value,source,recorded_at,revision,shared FROM gpt_owner_metrics ORDER BY recorded_at DESC LIMIT 8'),
        ]);
        const revision=result[0].results?.[0]?.revision;
        const list=result[1].results || [];
        if(!Number.isSafeInteger(revision)||revision<0)return ownerError('Analytics migration required');
        if(list.some(r=>!validRow(r,at)))return ownerError('Recorded analytics unavailable');
        return ownerJson({
          version:2,revision,featuredMetric:GPT_FEATURED_METRIC,
          publishingAllowed:publicApproved(env),
          observations:list.map(r=>({...rowPublic(r,at),revision:r.revision,shared:r.shared===1})),
        });
      }
      let data;
      try { data=await readSmallJson(request); } catch { return ownerError('Invalid metric request',400); }
      if(request.method==='POST' && data?.action==='record-batch') {
        if(!exact(data,['action','revision','measurements']) ||
            !Number.isSafeInteger(data.revision) || data.revision<0 ||
            !Array.isArray(data.measurements) || data.measurements.length<1 || data.measurements.length>8 ||
            data.measurements.some(r=>!exact(r,['metric','value']) || !validValue(r.metric,r.value)) ||
            new Set(data.measurements.map(r=>r.metric)).size!==data.measurements.length)
          return ownerError('Invalid measurement batch. Nothing was saved.',400);
        if(typeof db.batch!=='function')return ownerError('Atomic analytics database unavailable');
        // The CHECK constraint aborts the whole D1 transaction for a stale
        // revision or backwards clock. Triggers advance the revision for ALL
        // writers, including sharing and delete/recreate (no ABA race).
        const statements=[captureGuard(db,data.revision,at)];
        for(const {metric,value} of data.measurements)statements.push(db.prepare(
          'INSERT INTO gpt_owner_metrics(metric,value,source,recorded_at) VALUES(?,?,?,?) '+
          'ON CONFLICT(metric) DO UPDATE SET value=excluded.value,source=excluded.source,'+
          'recorded_at=excluded.recorded_at,revision=gpt_owner_metrics.revision+1'
        ).bind(metric,value,GPT_OWNER_METRICS[metric].source,at));
        statements.push(db.prepare('SELECT revision FROM gpt_capture_state WHERE id=1'));
        try {
          const result=await db.batch(statements);
          if(result[0].meta?.changes!==1) return ownerError('Analytics migration required');
          const revision=result.at(-1).results?.[0]?.revision;
          return ownerJson({saved:true,count:data.measurements.length,revision,asOf:iso(at)});
        } catch(error) {
          if(conflictError(error))
            return ownerError('Records changed. Refresh and review your entries before retrying. Nothing was saved.',409);
          return ownerError('Could not save the batch. Nothing was saved.');
        }
      }
      if(request.method==='POST'&&exact(data,['action','metric','value']) &&
          data.action==='record'&&validValue(data.metric,data.value)) {
        const source=GPT_OWNER_METRICS[data.metric].source;
        // A correction keeps an existing metric's owner approval; a new
        // metric never becomes public by default.
        const result=await db.prepare(
          'INSERT INTO gpt_owner_metrics(metric,value,source,recorded_at) VALUES(?,?,?,?) '+
          'ON CONFLICT(metric) DO UPDATE SET value=excluded.value,source=excluded.source,'+
          'recorded_at=excluded.recorded_at,revision=gpt_owner_metrics.revision+1 '+
          'WHERE excluded.recorded_at >= gpt_owner_metrics.recorded_at'
        ).bind(data.metric,data.value,source,at).run();
        if(result.meta?.changes!==1) return ownerError('Metric changed. Refresh and retry.',409);
        return ownerJson({saved:true,metric:data.metric,asOf:iso(at)});
      }
      if(request.method==='POST'&&exact(data,['action','metric','enabled','revision','captureRevision']) &&
          data.action==='sharing'&&validMetric(data.metric) &&
          typeof data.enabled==='boolean'&&validRevision(data.revision)&&validRevision(data.captureRevision)) {
        if(data.enabled&&!publicApproved(env))return ownerError('Public metric release has not been approved',403);
        if(typeof db.batch!=='function')return ownerError('Atomic analytics database unavailable');
        try {
          const result=await db.batch([captureGuard(db,data.captureRevision),db.prepare(
            'UPDATE gpt_owner_metrics SET shared=?,revision=revision+1 WHERE metric=? AND revision=?'
          ).bind(data.enabled?1:0,data.metric,data.revision)]);
          return result[1].meta?.changes===1?ownerJson({saved:true}):ownerError('Metric changed. Refresh and retry.',409);
        }catch(error){return conflictError(error)?ownerError('Records changed. Refresh and retry.',409):ownerError();}
      }
      if(request.method==='DELETE'&&exact(data,['metric','revision','captureRevision'])&&validMetric(data.metric)&&
          validRevision(data.revision)&&validRevision(data.captureRevision)){
        if(typeof db.batch!=='function')return ownerError('Atomic analytics database unavailable');
        try {
          const result=await db.batch([captureGuard(db,data.captureRevision),db.prepare(
            'DELETE FROM gpt_owner_metrics WHERE metric=? AND revision=?'
          ).bind(data.metric,data.revision)]);
          return result[1].meta?.changes===1?ownerJson({removed:true}):ownerError('Metric changed. Refresh and retry.',409);
        }catch(error){return conflictError(error)?ownerError('Records changed. Refresh and retry.',409):ownerError();}
      }
      return ownerError('Invalid metric request',400);
    } catch { return ownerError('Analytics snapshot unavailable'); }
  };
}
