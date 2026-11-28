// Build-time public projection. Do not duplicate the canonical publication registry.
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export function renderGarageEpisode(publication) {
  const episode=publication.episodes[0];
  if (!episode) return '<aside class="episode" aria-labelledby="episode-title"><p class="eyebrow">THE EPISODES / PRELAUNCH</p><h2 id="episode-title">In preparation</h2><p>No published episodes yet. The first approved episode will appear here.</p><a class="episode-link" href="/podcast/">Visit the podcast <span aria-hidden="true">↗</span></a></aside>';
  if (!/^\/podcast\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(episode.route)) throw new Error("Invalid Garage episode route");
  const access=episode.videoAccess==="members"?" · Members-only video":"";
  return '<aside class="episode" aria-labelledby="episode-title"><p class="eyebrow">LATEST PUBLISHED EPISODE</p><h2 id="episode-title">'+escapeHtml(episode.title)+'</h2><p class="episode-meta"><time datetime="'+escapeHtml(episode.date)+'">'+escapeHtml(episode.date)+'</time> · '+Math.ceil(episode.durationSeconds/60)+' min'+access+'</p><p>'+escapeHtml(episode.summary)+'</p><a class="episode-link" href="'+episode.route+'">Episode details <span aria-hidden="true">↗</span></a></aside>';
}
export function injectGarageEpisode(html, publication) {
  const start="<!-- GARAGE_EPISODE_START -->",end="<!-- GARAGE_EPISODE_END -->";
  const a=html.indexOf(start),b=html.indexOf(end);
  if(a<0||b<a||html.indexOf(start,a+start.length)!==-1||html.indexOf(end,b+end.length)!==-1) throw new Error("Missing or duplicate Garage episode region");
  return html.slice(0,a)+renderGarageEpisode(publication)+html.slice(b+end.length);
}
