/**
 * Verified public destinations; Threads handle is from the owner's successful
 * production provider identity check, not guessed from Instagram.
 * A public profile link is NOT consent to republish posts on DevonAkins.com.
 * Facebook links only to the owner's explicitly supplied personal profile URL.
 */
export const FACEBOOK_PROFILE_URL="https://fb.com/devonalanakins";
export const THREADS_PROFILE_URL="https://www.threads.com/@devonalanakins";
const verified=Object.freeze([
  ["GitHub","https://github.com/devonalanakins"],
  ["Instagram","https://www.instagram.com/devonalanakins/"],
  ["Threads",THREADS_PROFILE_URL],
  ["Facebook",FACEBOOK_PROFILE_URL],
]);
function anchor([label,url]){
  return '<a href="'+url+'" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"'+
    ' aria-label="Open '+label+' profile in a new tab">'+label+'</a>';
}
export function renderSocialChannels(compact=false){
  return '<nav class="one-social-channels'+(compact?' one-social-channels--compact':'')+
    '" aria-label="Social profiles and updates">'+verified.map(anchor).join("")+'</nav>';
}
export function renderHomeSocialHub(){
  return '<div class="studio-social-dock"><span class="studio-social-dock-label">FIND ME / VERIFIED CHANNELS</span>'+
    renderSocialChannels()+'</div>';
}
export function renderHomeThreadsSignal(){
  return '<section class="studio-threads-inline" data-public-threads data-threads-presentation="home"'+
    ' aria-label="Latest approved public Threads update">'+
    '<div class="studio-threads-inline-head"><strong>THREADS / LATEST</strong>'+
      '<span data-threads-state role="status">CHECKING SOURCE</span></div>'+
    '<p data-threads-summary>Public post sharing has not been enabled.</p>'+
    '<div class="studio-threads-inline-actions">'+
      '<a data-threads-link href="'+THREADS_PROFILE_URL+'" target="_blank" rel="noopener noreferrer"'+
      ' referrerpolicy="no-referrer">Open Threads profile ↗</a>'+
      '<button type="button" data-one-go="contact" aria-label="View all approved Threads updates">Full feed ↗</button>'+
    '</div></section>';
}
export function renderThreadsPreview(){
  return '<section class="one-threads-panel one-panel" data-public-threads data-threads-presentation="contact" aria-labelledby="one-threads-title">'+
    '<header class="one-threads-head"><div><span class="one-threads-eyebrow">PUBLIC SIGNAL / THREADS</span>'+
    '<h2 id="one-threads-title">Outside the code.</h2></div>'+
    '<span class="one-threads-status" data-threads-state role="status">CHECKING SOURCE</span></header>'+
    '<p class="one-threads-description" data-threads-summary>Approved public posts appear only after sharing is enabled.</p>'+
    '<ol class="one-threads-posts" data-threads-posts aria-label="Recent authorized public Threads posts"></ol>'+
    '<p class="one-threads-provenance" data-threads-checked>Public source not yet verified.</p>'+
    '<a class="one-threads-profile" href="'+THREADS_PROFILE_URL+
    '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Open Threads profile ↗</a>'+
    '</section>';
}
