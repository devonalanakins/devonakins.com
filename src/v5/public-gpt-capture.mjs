import { featuredPublicGpt, publicGptReadings } from "../gpt-public-model.mjs";

// Single source of truth: the owner-captured, consent-filtered public V4
// projection. Never infer numbers from site activity, API spending, screenshots
// or personal work. Credit counts are NOT token counts.
const empty = () => ({ available: false, headline: null, readings: [] });

export function publicV5GptCapture(gpt, now = Date.now()) {
  if (!Number.isFinite(now) || !gpt || gpt.state !== "snapshot") return empty();
  const headline = featuredPublicGpt(gpt, now);
  const readings = publicGptReadings(gpt.observations, now);
  // A malformed observation set must not become a headline, even if other
  // properties appear individually plausible. No partial unsafe projection.
  if (Array.isArray(gpt.observations) && gpt.observations.length > 0 &&
      readings.length !== gpt.observations.length) return empty();
  if (!headline && !readings.length) return empty();
  return { available: true, headline, readings };
}

// Human-readable units remain explicit even when compact magnitude formatting
// is used. Each metric retains an exact value in its accessible label.
export function formatPublicGptValue(reading, compact = false) {
  if (!reading || typeof reading.value !== "number" ||
      !Number.isFinite(reading.value) || reading.value < 0) return "—";
  const format = new Intl.NumberFormat("en-US",compact
    ? {notation:"compact",maximumFractionDigits:2}
    : {maximumFractionDigits:3});
  return format.format(reading.value);
}
export function publicGptCapturedAt(iso) {
  const at=typeof iso==="string"?Date.parse(iso):NaN;
  if(!Number.isFinite(at) || new Date(at).toISOString()!==iso)return null;
  return new Date(at).toLocaleDateString("en-US",{
    month:"short",day:"numeric",year:"numeric",timeZone:"UTC",
  }) + " UTC";
}
