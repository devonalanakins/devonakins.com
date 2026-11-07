/** Client boundary for the privacy-filtered owner capture API; never imports private data. */
export const publicGptMetrics = Object.freeze({
  profile_7d_tokens: {unit:'tokens',scope:'owner-profile',source:'owner-profile-capture',label:'7-day tokens',max:1e12},
  profile_lifetime_tokens_approx: {unit:'tokens',scope:'owner-profile',source:'owner-profile-capture',label:'Approx. lifetime tokens',max:1e12},
  profile_7d_messages: {unit:'messages',scope:'owner-profile',source:'owner-profile-capture',label:'7-day messages',max:1e9},
  profile_streak_days: {unit:'days',scope:'owner-profile',source:'owner-profile-capture',label:'Streak at capture',max:36500},
  work_codex_credits_remaining: {unit:'credits',scope:'work-codex',source:'owner-work-codex-usage',label:'Work/Codex credits remaining',max:1e6},
  work_codex_credits_used: {unit:'credits',scope:'work-codex',source:'owner-work-codex-usage',label:'Work/Codex credits used',max:1e6},
  business_7d_messages: {unit:'messages',scope:'business-member',source:'owner-business-analytics',label:'Member 7-day messages',max:1e9},
  business_7d_credits_used: {unit:'credits',scope:'business-member',source:'owner-business-analytics',label:'Member 7-day credits',max:1e6},
});
const keys = Object.keys(publicGptMetrics);

export function validPublicGptReading(reading, at = Date.now()) {
  if (!reading || typeof reading.metric !== 'string' || !Object.hasOwn(publicGptMetrics,reading.metric)) return false;
  const def=publicGptMetrics[reading.metric], capture=typeof reading.asOf==='string'?Date.parse(reading.asOf):NaN;
  return reading.unit===def.unit && reading.scope===def.scope && reading.source===def.source &&
    reading.sourceUpdatedAt===null && ['recent','historical'].includes(reading.freshness) &&
    typeof reading.value==='number' && Number.isFinite(reading.value) && reading.value>=0 && reading.value<=def.max &&
    (def.unit==='credits' || Number.isSafeInteger(reading.value)) &&
    Number.isFinite(capture) && capture>0 && capture<=at+60000;
}

/** Reject a malformed collection as a whole; free text from the network is not rendered. */
export function publicGptReadings(value, at = Date.now()) {
  if (!Array.isArray(value) || value.length>keys.length ||
      !value.every(r=>validPublicGptReading(r,at)) || new Set(value.map(r=>r.metric)).size!==value.length) return [];
  return keys.flatMap(metric=>{
    const r=value.find(item=>item.metric===metric);
    return r ? [{metric,...publicGptMetrics[metric],value:r.value,asOf:r.asOf,
      freshness:at-Date.parse(r.asOf)>86400000?'historical':'recent'}] : [];
  });
}

/** The ribbon and profile headline always mean seven-day personal-profile tokens. */
export function featuredPublicGpt(value, at = Date.now()) {
  const reading={...value,value:value?.count};
  return value?.state==='snapshot' && value.metric==='profile_7d_tokens' &&
    validPublicGptReading(reading,at) ? publicGptReadings([reading],at)[0] : null;
}
