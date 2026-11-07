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
const METRIC_KEYS = Object.keys(GPT_OWNER_METRICS);
const NO_DATA = Object.freeze({version:1,state:'disconnected',scope:'personal-work-codex',metric:null,period:null,count:null,asOf:null,source:null,freshness:'unavailable'});
const ownerPath = '/api/gpt/owner';
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
const publicApproved = env => env?.GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED === 'true' &&
  env?.PRESENCE_PUBLIC_RELEASE_APPROVED === 'true';

export const disconnectedGptSnapshot = () => ({...NO_DATA});

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
    const visible=(await rows(db)).filter(r=>r.shared===1).map(r=>rowPublic(r,now)).filter(Boolean);
    if (!visible.length) return disconnectedGptSnapshot();
    // A newer capture takes precedence; when several are recorded together,
    // prefer 7-day tokens. Never synthesize a lifetime value from prior data.
    visible.sort((a,b)=> Date.parse(b.asOf)-Date.parse(a.asOf) ||
      GPT_OWNER_METRICS[a.metric].rank-GPT_OWNER_METRICS[b.metric].rank);
    const after=await db.prepare('SELECT revision,public_enabled,private_work FROM presence_state WHERE id=1').first();
    if (after?.revision!==before.revision || after?.public_enabled!==1 ||
        after.private_work===1 || !publicApproved(env)) return disconnectedGptSnapshot();
    // Check the same selected row's publication revision after async reads:
    // delayed results cannot resurrect a revoked or updated observation.
    const latest=await db.prepare(
      'SELECT metric,value,source,recorded_at,revision,shared FROM gpt_owner_metrics WHERE metric=?'
    ).bind(visible[0].metric).first();
    const projected=rowPublic(latest,now);
    if (!projected || latest.shared!==1 || projected.asOf!==visible[0].asOf ||
        projected.value!==visible[0].value || !publicApproved(env))
      return disconnectedGptSnapshot();
    const final=await db.prepare('SELECT revision,public_enabled,private_work FROM presence_state WHERE id=1').first();
    if(final?.revision!==before.revision || final.public_enabled!==1 || final.private_work===1)
      return disconnectedGptSnapshot();
    return publicShape(projected);
  } catch { return disconnectedGptSnapshot(); }
}

export function createGptSnapshotOwnerApi({clock=Date.now}={}) {
  return async (request,env={},ctx={})=>{
    const path=new URL(request.url).pathname;
    if (!pagePaths.has(path) && path!==ownerPath) return ownerError('Not found',404);
    if (!(await isListeningOwner(env,ctx))) return ownerError('Owner authentication required',403);
    if (pagePaths.has(path)) {
      if(request.method!=='GET' && request.method!=='HEAD') return ownerError('Method not allowed',405);
      return new Response(request.method==='HEAD'?null:renderGptOwner(),{
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
        const list=await rows(db);
        if(list.some(r=>!validRow(r,at)))return ownerError('Recorded analytics unavailable');
        return ownerJson({
          version:1,
          publishingAllowed:publicApproved(env),
          observations:list.map(r=>({...rowPublic(r,at),revision:r.revision,shared:r.shared===1})),
        });
      }
      let data;
      try { data=await readSmallJson(request); } catch { return ownerError('Invalid metric request',400); }
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
      if(request.method==='POST'&&exact(data,['action','metric','enabled','revision']) &&
          data.action==='sharing'&&validMetric(data.metric) &&
          typeof data.enabled==='boolean'&&Number.isSafeInteger(data.revision)&&data.revision>=0) {
        if(data.enabled&&!publicApproved(env))return ownerError('Public metric release has not been approved',403);
        const result=await db.prepare(
          'UPDATE gpt_owner_metrics SET shared=?,revision=revision+1 WHERE metric=? AND revision=?'
        ).bind(data.enabled?1:0,data.metric,data.revision).run();
        return result.meta?.changes===1?ownerJson({saved:true}):ownerError('Metric changed. Refresh and retry.',409);
      }
      if(request.method==='DELETE'&&exact(data,['metric'])&&validMetric(data.metric)){
        await db.prepare('DELETE FROM gpt_owner_metrics WHERE metric=?').bind(data.metric).run();
        return ownerJson({removed:true});
      }
      return ownerError('Invalid metric request',400);
    } catch { return ownerError('Analytics snapshot unavailable'); }
  };
}
