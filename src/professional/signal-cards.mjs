/**
 * Public-facing professional-site source cards. Deliberate empty states only:
 * live data comes from existing owner-consented Spotify, GPT, work and Threads.
 * Never embed invented tracks, statistics, releases or social posts.
 */
export function spotifyCard(variant="compact") {
  return '<section class="p-signal-card p-spotify-card '+(variant==="feature"?"p-spotify-feature":"")+'" data-public-spotify aria-labelledby="p-spotify-title-'+variant+'">' +
    '<div class="p-signal-head"><span class="p-signal-over">SPOTIFY · IN THE ZONE</span><span class="p-signal-state" data-spotify-state>Checking source</span></div>'+
    '<div class="p-spotify-body"><div class="p-spotify-art"><div class="p-vinyl" aria-hidden="true"><span></span></div>'+
    '<img data-spotify-cover alt="" referrerpolicy="no-referrer" decoding="async" loading="lazy" hidden></div>'+
    '<div class="p-spotify-meta"><span class="p-spotify-eyebrow">MY CODING SOUNDTRACK</span>'+
    '<h3 id="p-spotify-title-'+variant+'" data-spotify-title>Playback not shared</h3>'+
    '<p data-spotify-artist>Source-qualified playback, when enabled.</p>'+
    '<progress data-spotify-progress max="1" value="0" aria-label="Track playback progress" hidden></progress>'+
    '<a class="p-text-link" data-spotify-link href="/listening/">Explore listening <span aria-hidden="true">↗</span></a></div></div>'+
    '<p class="p-signal-foot" data-spotify-note>Listening is Devon's owner-defined coding signal. No audio streams here.</p></section>';
}
export function workSignalCard() {
  return '<section class="p-signal-card p-work-signal-card" data-public-work aria-labelledby="p-work-signals-title">'+
    '<div class="p-signal-head"><span class="p-signal-over">WORK · OBSERVED STATUS</span><span class="p-signal-state" data-work-state>Source pending</span></div>'+
    '<h3 id="p-work-signals-title" data-work-title>No verified active session</h3>'+
    '<p data-work-detail>Spotify is Devon's owner-defined coding mode; editor activity and GitHub history remain separate sources.</p>'+
    '<a class="p-text-link" href="/activity/">Inspect activity <span aria-hidden="true">↗</span></a></section>';
}
export function gptSignalCard() {
  return '<section class="p-signal-card p-gpt-signal-card" data-public-gpt aria-labelledby="p-gpt-signal-title">'+
    '<div class="p-signal-head"><span class="p-signal-over">GPT · CAPTURED USAGE</span><span class="p-signal-state" data-gpt-state>Source pending</span></div>'+
    '<h3 id="p-gpt-signal-title"><span data-gpt-value>—</span> <small data-gpt-unit></small></h3>'+
    '<p data-gpt-label>No owner-approved usage capture is available.</p><time data-gpt-time hidden></time>'+
    '<a class="p-text-link" href="/gpt/">View usage context <span aria-hidden="true">↗</span></a></section>';
}
export function threadsSignalCard() {
  return '<section class="p-signal-card p-threads-signal-card" data-public-threads aria-labelledby="p-threads-signal-title">'+
    '<div class="p-signal-head"><span class="p-signal-over">THREADS · PUBLIC UPDATES</span><span class="p-signal-state" data-threads-state>Source pending</span></div>'+
    '<h3 id="p-threads-signal-title">Outside the code.</h3>'+
    '<p data-threads-summary>Approved public Threads updates appear when the account source is connected.</p>'+
    '<a class="p-text-link" data-threads-link href="https://www.instagram.com/devonalanakins/" target="_blank" rel="noopener noreferrer">Instagram profile <span aria-hidden="true">↗</span></a></section>';
}
export function signalDeck(variant="home") {
  return '<div class="p-signal-deck p-signal-deck-'+variant+'">'+
    spotifyCard(variant==="listening"?"feature":"compact")+
    '<div class="p-signal-pairs">'+workSignalCard()+gptSignalCard()+threadsSignalCard()+'</div></div>';
}
export function listeningCollections() {
  return '<section class="p-listening-collections" data-public-playlists>'+
    '<div class="p-section-heading"><div><p class="p-eyebrow">MY PUBLIC MUSIC</p><h2>Selected listening.</h2></div>'+
    '<p>Only playlists I specifically choose to share—not saved songs or private listening history.</p></div>'+
    '<p data-playlists-status class="p-collection-status" role="status">Checking for approved public playlists…</p>'+
    '<ul class="p-playlist-grid" data-playlist-list></ul></section>';
}
