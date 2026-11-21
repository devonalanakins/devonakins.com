// Public live-channel publication gate. Never store ingest URLs, stream keys or
// Cloudflare API credentials in this file or in a browser response.
export const LIVE_ROUTE = '/live/';
export const LIVE_STATUS_PATH = '/api/creator/live';
export const LIVE_PUBLICATION = Object.freeze({
  publicEnabled: false,
  title: 'Live with Devon Alan Akins',
  customerCode: null,
  inputId: null,
});

const inputPattern = /^[a-f0-9]{32}$/i;
const customerPattern = /^[a-z0-9]{8,80}$/i;

function validChannel(publication) {
  if (publication?.publicEnabled !== true ||
      !customerPattern.test(publication.customerCode ?? '') ||
      !inputPattern.test(publication.inputId ?? '')) return null;
  return {
    origin: 'https://customer-' + publication.customerCode.toLowerCase() + '.cloudflarestream.com',
    id: publication.inputId.toLowerCase(),
  };
}

export function streamPlaybackOrigin(publication = LIVE_PUBLICATION) {
  return validChannel(publication)?.origin ?? null;
}

function jsonResponse(request, body, status = 200) {
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 405 ? {'Allow': 'GET, HEAD'} : {}),
    },
  });
}

// Provider errors must never become a false LIVE state, expose secret data,
// or infer that the creator has started broadcasting.
export async function readPublicLiveStatus(request, env = {}, {
  publication = LIVE_PUBLICATION, fetchImpl = fetch,
} = {}) {
  if (!['GET', 'HEAD'].includes(request.method))
    return jsonResponse(request, {state: 'method-not-allowed'}, 405);
  if (publication?.publicEnabled !== true)
    return jsonResponse(request, {state: 'prelaunch'});
  const channel = validChannel(publication);
  const token = env.CLOUDFLARE_STREAM_READ_TOKEN;
  if (!channel || typeof token !== 'string' || !token.trim())
    return jsonResponse(request, {state: 'unavailable'});
  try {
    const response = await fetchImpl(channel.origin + '/' + channel.id + '/lifecycle', {
      method: 'GET',
      headers: {Authorization: 'Bearer ' + token, Accept: 'application/json'},
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return jsonResponse(request, {state: 'unavailable'});
    const body = await response.json();
    if (body?.isInput !== true || typeof body.live !== 'boolean')
      return jsonResponse(request, {state: 'unavailable'});
    if (!body.live) return jsonResponse(request, {state: 'offline'});
    if (!inputPattern.test(body.videoUID ?? ''))
      return jsonResponse(request, {state: 'starting'});
    return jsonResponse(request, {
      state: 'live',
      playerUrl: channel.origin + '/' + channel.id + '/iframe',
    });
  } catch {
    return jsonResponse(request, {state: 'unavailable'});
  }
}

// Reuse a recent public projection within one Worker isolate. This avoids an
// upstream lifecycle request for each simultaneous viewer; it never caches
// credentials in a response, and viewer-facing headers remain no-store.
// A distributed/edge cache may still be warranted at substantial audience size.
export function createLiveStatusReader({
  publication = LIVE_PUBLICATION, fetchImpl = fetch,
  now = Date.now, ttlMs = 10_000, errorTtlMs = 3_000,
} = {}) {
  let cache = null;
  let inflight = null;
  const ttl = Math.max(0, Math.min(ttlMs, 15_000));
  const errorTtl = Math.max(0, Math.min(errorTtlMs, 5_000));
  return async function publicLiveStatus(request, env = {}) {
    if (!['GET','HEAD'].includes(request.method))
      return jsonResponse(request, {state:'method-not-allowed'}, 405);
    // Always check publication and credentials BEFORE reading the cache.
    // Changing to private, losing credentials or rotating a token must not
    // reuse a stale previously published player.
    if (publication?.publicEnabled !== true)
      return jsonResponse(request, {state:'prelaunch'});
    const channel = validChannel(publication);
    const secret = env.CLOUDFLARE_STREAM_READ_TOKEN;
    if (!channel || typeof secret !== 'string' || !secret.trim())
      return jsonResponse(request, {state:'unavailable'});
    const key = channel.origin + '/' + channel.id;
    const valid = entry => entry && entry.key === key && entry.secret === secret;
    if (valid(cache) && cache.until > now())
      return jsonResponse(request, cache.body);
    if (valid(inflight))
      return jsonResponse(request, await inflight.promise);
    // HEAD responses have no body; use one internal GET for the projection.
    const upstreamRequest = new Request(request.url, {method:'GET'});
    const pending = (async () => {
      const upstream = await readPublicLiveStatus(upstreamRequest, env, {
        publication, fetchImpl,
      });
      return upstream.json();
    })();
    inflight = {key, secret, promise:pending};
    try {
      const body = await pending;
      if (inflight?.promise === pending) {
        cache = {key,secret,body,until:now() + (body.state === 'unavailable' ? errorTtl : ttl)};
      }
      return jsonResponse(request, body);
    } catch {
      return jsonResponse(request, {state:'unavailable'});
    } finally {
      if (inflight?.promise === pending) inflight = null;
    }
  };
}

// This HTML is intentionally useful without JavaScript: no fake live player,
// countdown, audience count, video inventory, or imagined start time.
export function renderMobileLive() {
  return [
    '<div class="pc-live" data-mobile-live>',
    '<div class="pc-wrap">',
    '<section class="pc-live-intro" aria-labelledby="pc-live-title">',
    '<div class="pc-live-kicker"><span>DEVON ALAN AKINS / LIVE</span><span class="pc-live-status" data-live-status role="status" aria-live="polite">NOT BROADCASTING</span></div>',
    '<h1 id="pc-live-title">Live from <em>wherever I am.</em></h1>',
    '<p class="pc-live-lede">Building, learning, talking things through. Sometimes a proper conversation, sometimes just my screen and a question worth working on.</p>',
    '</section>',
    '<section class="pc-live-theater" aria-label="Live video theater">',
    '<div class="pc-live-stage" data-live-stage>',
    '<div class="pc-live-atmosphere" aria-hidden="true"><span></span><span></span><span></span></div>',
    '<div class="pc-live-offline" data-live-offline>',
    '<span class="pc-live-sigil" aria-hidden="true">DA / SIGNAL</span>',
    '<div class="pc-live-orbit" aria-hidden="true"><i></i><i></i><i></i></div>',
    '<p class="pc-live-overline">THE STUDIO / IDLE</p>',
    '<h2 data-live-headline>No broadcast right now.</h2>',
    '<p data-live-description>When I go live, the broadcast will play here. In the meantime, the recordings and courses are where the useful stuff lives.</p>',
    '</div>',
    '<div class="pc-live-player" data-live-player hidden></div>',
    '<div class="pc-live-stage-footer"><span>DEVON ALAN AKINS</span><span data-live-stage-label>IPHONE-FIRST BROADCAST</span></div>',
    '</div>',
    '<div class="pc-live-actions"><a class="pc-live-link pc-live-link-primary" href="/podcast/">Conversations <span aria-hidden="true">&rarr;</span></a>',
    '<a class="pc-live-link" href="/courses/">Explore courses <span aria-hidden="true">&rarr;</span></a></div>',
    '</section>',
    '<section class="pc-live-below" aria-label="More from the studio">',
    '<div class="pc-live-below-heading"><p class="pc-live-overline">THE FORMAT</p><h2>One phone. Real work. No production circus.</h2></div>',
    '<div class="pc-live-tiles">',
    '<article><span>01 / BUILD</span><h3>Working sessions</h3><p>Software, systems, research, and the actual decisions behind the work.</p></article>',
    '<article><span>02 / LEARN</span><h3>Screen lessons</h3><p>Practical explanations recorded directly from the iPhone, with narration first.</p></article>',
    '<article><span>03 / TALK</span><h3>Conversations</h3><p>Unscripted interviews and discussions when a guest has agreed to join.</p></article>',
    '</div>',
    '</section>',
    '<section class="pc-live-library" aria-labelledby="pc-live-library-title"><div><p class="pc-live-overline">AFTER THE BROADCAST</p><h2 id="pc-live-library-title">Recordings, when there are recordings.</h2></div>',
    '<div><p>Sessions will be reviewed before they become public replays. There is no archive published here yet.</p>',
    '<a href="/podcast/">Browse the podcast <span aria-hidden="true">&rarr;</span></a></div></section>',
    '</div></div>',
  ].join('');
}
