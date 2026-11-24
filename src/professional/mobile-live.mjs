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

// Runtime-only publication configuration: the code is safe to release before
// activating Stream. All fields must be provided in the personal Worker; the
// broadcast is never enabled merely because a live input exists.
export function livePublicationFromEnv(env = {}) {
  if (env.CLOUDFLARE_STREAM_PUBLIC_ENABLED !== '1') return LIVE_PUBLICATION;
  return {
    publicEnabled: true,
    title: LIVE_PUBLICATION.title,
    customerCode: env.CLOUDFLARE_STREAM_CUSTOMER_CODE ?? null,
    inputId: env.CLOUDFLARE_STREAM_INPUT_ID ?? null,
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
  publication, fetchImpl = fetch,
} = {}) {
  publication ??= livePublicationFromEnv(env);
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
    '<p data-live-description>When I go live, the broadcast will play here. When I’m not, the Watch library is where approved recordings will appear.</p>',
    '</div>',
    '<div class="pc-live-player" data-live-player hidden></div>',
    '<div class="pc-live-stage-footer"><span>DEVON ALAN AKINS</span><span data-live-stage-label>FROM LAPTOP TO MOBILE</span></div>',
    '</div>',
    '<div class="pc-live-actions"><a class="pc-live-link pc-live-link-primary" href="/watch/">Watch library <span aria-hidden="true">&rarr;</span></a>',
    '<a class="pc-live-link" href="/podcast/">Podcast <span aria-hidden="true">&rarr;</span></a>',
    '<a class="pc-live-link" href="/courses/">Explore courses <span aria-hidden="true">&rarr;</span></a></div>',
    '</section>',
    '<section class="pc-live-below" aria-label="More from the studio">',
    '<div class="pc-live-below-heading"><p class="pc-live-overline">THE FORMAT</p><h2>One studio. Real work. No production circus.</h2></div>',
    '<div class="pc-live-tiles">',
    '<article><span>01 / BUILD</span><h3>Working sessions</h3><p>Software, systems, research, and the actual decisions behind the work.</p></article>',
    '<article><span>02 / LEARN</span><h3>Screen lessons</h3><p>Practical screen lessons with narration first, using the tools already at hand.</p></article>',
    '<article><span>03 / TALK</span><h3>Conversations</h3><p>Unscripted interviews and discussions when a guest has agreed to join.</p></article>',
    '</div>',
    '</section>',
    '<section class="pc-live-library" aria-labelledby="pc-live-library-title"><div><p class="pc-live-overline">AFTER THE BROADCAST</p><h2 id="pc-live-library-title">Recordings, when there are recordings.</h2></div>',
    '<div><p>Sessions will be reviewed before they become public replays. There is no archive published here yet.</p>',
    '<a href="/watch/">Visit the Watch library <span aria-hidden="true">&rarr;</span></a></div></section>',
    '</div></div>',
  ].join('');
}
