/**
 * Public social affordances for the one-screen studio.
 * Never infer a Facebook or Threads handle from Instagram, and never expose
 * a profile URL without verifying the exact account. Public Threads content
 * is loaded separately from the consent-filtered existing activity endpoint.
 */
const verified = Object.freeze([
  ["GitHub", "https://github.com/devonalanakins"],
  ["Instagram", "https://www.instagram.com/devonalanakins/"],
]);
function anchor([label,url]) {
  return '<a href="'+url+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+label+' profile in a new tab">'+
    '<span aria-hidden="true">'+label+'</span></a>';
}
export function renderSocialChannels(compact=false) {
  return '<nav class="one-social-channels'+(compact?' one-social-channels--compact':'')+
    '" aria-label="Social profiles and updates">'+
    verified.map(anchor).join("")+
    (compact
      ? '<button type="button" data-one-go="contact" aria-label="View public Threads updates and connection status">Threads</button>'
      : '<span class="one-social-unverified" title="Facebook profile address has not been verified">Facebook · link pending</span>'+
        '<span class="one-social-unverified" title="Threads profile address has not been verified">Threads · feed status at right</span>')+
    '</nav>';
}
export function renderThreadsPreview() {
  return '<section class="one-threads-panel one-panel" data-public-threads aria-labelledby="one-threads-title">'+
    '<header class="one-threads-head"><div><span class="one-threads-eyebrow">PUBLIC SIGNAL / THREADS</span>'+
    '<h2 id="one-threads-title">Outside the code.</h2></div>'+
    '<span class="one-threads-status" data-threads-state role="status">CHECKING SOURCE</span></header>'+
    '<p class="one-threads-description" data-threads-summary>Approved public posts appear here only after a verified connection.</p>'+
    '<ol class="one-threads-posts" data-threads-posts aria-label="Recent authorized public Threads posts"></ol>'+
    '<p class="one-threads-provenance" data-threads-checked>Public source not yet verified.</p>'+
    '</section>';
}
