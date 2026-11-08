/**
 * Fail-closed Threads presentation contract for V5. The trusted server
 * projection is rechecked before rendering, but the browser never receives
 * the Threads access token, API cursor, private replies or provider cookies.
 */
const HOSTS=new Set(["threads.net","www.threads.net","threads.com","www.threads.com"]);
const postPath=/^\/@[A-Za-z0-9._]{1,30}\/post\/[A-Za-z0-9_-]{4,50}\/?$/i;
function link(raw) {
  if(typeof raw!=="string" || raw.length>300)return null;
  try{
    const u=new URL(raw);
    return u.protocol==="https:" && HOSTS.has(u.hostname) &&
      !u.username && !u.password && !u.port && !u.search && !u.hash &&
      postPath.test(u.pathname)?u.href:null;
  }catch{return null;}
}
function iso(raw,now) {
  if(typeof raw!=="string" || raw.length>36)return null;
  const value=Date.parse(raw);
  return Number.isFinite(value) && value<=now+60_000 && value>0 &&
    new Date(value).toISOString()===raw ? raw : null;
}
const empty={connected:false,checkedAt:null,posts:[]};
export function publicV5Threads(snapshot,now=Date.now()) {
  if(!Number.isFinite(now) || !snapshot || snapshot.version!==4 ||
     !iso(snapshot.asOf,now) || now-Date.parse(snapshot.asOf)>65_000)return empty;
  const src=snapshot.threads;
  if(src?.version!==1 || src.state!=="connected" ||
     !iso(src.checkedAt,now) || now-Date.parse(src.checkedAt)>6*60_000 ||
     !Array.isArray(src.posts) || src.posts.length>3)return empty;
  const posts=[];
  const hrefs=new Set();
  for(const post of src.posts){
    const href=link(post?.href),publishedAt=iso(post?.publishedAt,now);
    if(!href || hrefs.has(href) || !publishedAt ||
       typeof post.text!=="string" || post.text.length>330 ||
       post.text.trim().length===0 || typeof post.media!=="boolean")return empty;
    hrefs.add(href);
    posts.push({href,text:post.text,publishedAt,media:post.media});
  }
  return {connected:true,checkedAt:src.checkedAt,posts};
}
export function threadsPublicDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US",{
    month:"short",day:"numeric",year:"numeric",timeZone:"UTC",
  })+" UTC";
}
