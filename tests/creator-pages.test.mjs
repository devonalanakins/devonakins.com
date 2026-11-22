import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CREATOR_ROUTES, CREATOR_CATEGORIES, CREATOR_GEAR, creatorPaths, renderCreatorPage} from "../src/professional/creator-pages.mjs";
import {podcastPublication} from "../src/professional/podcast-publication.mjs";
import {WATCH_KINDS, watchPublication} from "../src/professional/watch-publication.mjs";
import {renderResearchFacilityHome} from "../src/professional/research-facility.mjs";
import {FIELDNOTES} from "../src/professional/fieldnotes.mjs";

const watch = renderCreatorPage(CREATOR_ROUTES.watch);
const podcast = renderCreatorPage(CREATOR_ROUTES.podcast);
const setup = renderCreatorPage(CREATOR_ROUTES.setup);
const courses = renderCreatorPage(CREATOR_ROUTES.courses);
const live = renderCreatorPage(CREATOR_ROUTES.live);
const about = renderCreatorPage("/about/");

test("prelaunch presents the final title and honest format without fictional publication", () => {
  assert.match(podcast, /<title>Devon Alan Akins — Podcast<\/title>/);
  assert.match(podcast, /rel="canonical" href="https:\/\/devonakins\.com\/podcast\/"/);
  assert.match(podcast, /<h1 id="pc-title">Devon <em>Alan Akins<\/em><\/h1>/);
  assert.match(podcast, /No episodes published yet/);
  assert.match(podcast, /Interviews will be mostly unscripted/);
  assert.match(podcast, /Sometimes it’s just me/);
  assert.match(podcast, /href="\/setup\/"/);
  assert.match(podcast, /href="#episodes"/);
  assert.doesNotMatch(podcast, /<iframe|<audio|<video|autoplay|class="pc-episode"|application\/rss\+xml|spotify\.com\/show|Cristy Russo|Sam Rosenbaum|Jason Tunick/);
  assert.match(podcast, /href="\/courses\/"/);
  assert.match(podcast, /Watch and listen/);
  assert.match(podcast, /Patreon memberships are planned\. A public creator link and benefits will appear after account and offer verification/);
  assert.doesNotMatch(podcast, /href="https:\/\/(?:www\.)?patreon\.com/);
  assert.doesNotMatch(podcast, /Follow my work on Patreon/);
  assert.match(podcast, /og:image" content="https:\/\/devonakins\.com\/professional\/podcast-share\.jpg"/);
  assert.deepEqual(creatorPaths, ["/watch/", "/podcast/", "/courses/", "/setup/", "/live/", "/courses/man-of-the-house/start/", "/about/"]);
});

test("only approved, dated episodes and configured feeds render, with escaped text and accessible playback", () => {
  const episode = {
    approved: true, slug: "test-interview", title: "Test & interview", summary: "Test fixture, never published",
    date: "2026-11-20", durationSeconds: 125, format: "interview", guests: ["Test <guest>"],
    video: "/podcast-media/test.mp4", captions: "/podcast-media/test.vtt",
    audio: "/podcast-media/test.mp3", thumbnail: "/podcast-media/test.webp",
    notes: ["A <sample> note."], transcript: ["Speaker: A <sample> transcript."],
    chapters: [{startSeconds: 0, title: "Introduction"}, {startSeconds: 61, title: "A <sample> chapter"}],
    links: [{label: "Safe link", url: "https://example.org/reference"}, {label: "Unsafe", url: "javascript:alert(1)"}]
  };
  const publication = podcastPublication([
    episode,
    {...episode, slug: "unapproved", title: "Hidden title", approved: false},
    {...episode, slug: "future", title: "Future title", date: "2026-12-01"},
    {...episode, slug: "solo", title: "Test solo", format: "solo", guests: [], date: "2026-11-19"},
    {...episode, slug: "trailer", title: "Test trailer", format: "trailer", guests: [], date: "2026-11-18"}
  ], {rss: "https://example.org/feed.xml", spotify: "https://open.spotify.com/show/example"}, "2026-11-21");
  const archive = renderCreatorPage("/podcast/", publication);
  const detail = renderCreatorPage(episode.slug.replace(/^/, "/podcast/") + "/", publication);
  assert.match(archive, /Featured episode[\s\S]*Test &amp; interview/);
  assert.match(archive, /Solo · <time/);
  assert.match(archive, /Trailer · <time/);
  assert.match(archive, /Interview · Test &lt;guest&gt; · <time datetime="2026-11-20">November 20, 2026<\/time> · 2 min 5 sec/);
  assert.match(archive, /<link rel="alternate" type="application\/rss\+xml"/);
  assert.doesNotMatch(archive, /Hidden title|Future title|No episodes published yet/);
  assert.match(detail, /<video controls playsinline preload="none"/);
  assert.match(detail, /<audio controls preload="none"/);
  assert.match(detail, /<track kind="captions" srclang="en"/);
  assert.match(detail, /<h2>Show notes<\/h2><p>A &lt;sample&gt; note\./);
  assert.match(detail, /<h2>Transcript<\/h2><p>Speaker: A &lt;sample&gt; transcript\./);
  assert.match(detail, /<li data-chapter-start="61"><time datetime="PT61S">1:01<\/time> <span class="pc-chapter-title">A &lt;sample&gt; chapter<\/span><\/li>/);
  assert.match(detail, /<ol class="pc-chapters" data-episode-chapters>/);
  assert.match(detail, /<video controls playsinline preload="none" data-episode-full-video/);
  assert.match(detail, /<audio controls preload="none" data-episode-audio/);
  assert.match(detail, /type="module" src="\/src\/professional\/podcast-chapters\.mjs"/);
  assert.throws(() => podcastPublication([{...episode, chapters: [{startSeconds: 1, title: "Late"}]}]), /Podcast chapters/);
  assert.throws(() => podcastPublication([{...episode, chapters: [...episode.chapters, {startSeconds: 125, title: "Outside"}]}]), /Podcast chapters/);
  assert.match(detail, /href="https:\/\/example\.org\/reference"/);
  assert.doesNotMatch(detail, /autoplay|javascript:|<sample>/);
  const member = {...episode, videoAccess: "members", audio: undefined, video: undefined,
    captions: undefined, playbackLinks: [{label: "Watch on Patreon", url: "https://www.patreon.com/posts/test-123"}]};
  const memberPublication = podcastPublication([member], {patreon: "https://www.patreon.com/devonalanakins"}, "2026-11-21");
  const memberPage = renderCreatorPage("/podcast/test-interview/", memberPublication);
  assert.match(memberPage, /Full video is available to eligible Patreon members/);
  assert.doesNotMatch(memberPage, /data-episode-chapters|data-episode-full-video|data-episode-audio/);
  assert.match(memberPage, /<time datetime="PT61S">1:01<\/time>/);
  assert.match(memberPage, /https:\/\/www\.patreon\.com\/posts\/test-123/);
  assert.doesNotMatch(memberPage, /<video|<audio|\/podcast-media\/test\.mp4/);
  assert.deepEqual(memberPublication.outlets.map(outlet => outlet.key), ["patreon"]);
  const memberArchive = renderCreatorPage("/podcast/", memberPublication);
  assert.match(memberArchive, /<h2>Follow the show<\/h2>/);
  assert.match(memberArchive, /href="https:\/\/www\.patreon\.com\/devonalanakins" target="_blank" rel="noopener noreferrer">Patreon/);
  assert.match(memberArchive, /An approved Patreon destination is listed under Follow the show/);
  assert.doesNotMatch(memberArchive, /A public creator link and benefits will appear after account and offer verification/);
  const memberWatch = renderCreatorPage("/watch/", memberPublication);
  assert.match(memberWatch, /href="https:\/\/www\.patreon\.com\/devonalanakins" target="_blank" rel="noopener noreferrer">Follow on Patreon/);
  assert.doesNotMatch(memberWatch, /A Patreon creator link will appear here after account and membership details are verified/);

  const preview = {...member, videoPreview: "/podcast-media/preview.mp4", captions: "/podcast-media/preview.vtt"};
  const previewPublication = podcastPublication([preview], {}, "2026-11-21");
  const previewPage = renderCreatorPage("/podcast/test-interview/", previewPublication);
  assert.match(previewPage, /<h2>Video preview<\/h2>/);
  assert.match(previewPage, /aria-label="Episode video preview"/);
  assert.match(previewPage, /data-episode-preview/);
  assert.doesNotMatch(previewPage, /data-episode-chapters|data-episode-full-video|data-episode-audio/);
  assert.match(previewPage, /Full video is available to eligible Patreon members/);
  assert.match(previewPage, /https:\/\/www\.patreon\.com\/posts\/test-123/);
  assert.deepEqual(previewPublication.mediaFiles.sort(), ["/podcast-media/preview.mp4", "/podcast-media/preview.vtt", "/podcast-media/test.webp"].sort());
  assert.throws(() => podcastPublication([{...preview, captions: undefined}]), /require playable media and captions/);
  assert.throws(() => podcastPublication([{...episode, videoPreview: "/podcast-media/preview.mp4"}]), /require playable media and captions/);
  assert.throws(() => podcastPublication([{...member, playbackLinks: [{label: "Not Patreon", url: "https://example.org/watch"}]}]), /requires a verified Patreon/);
  assert.throws(() => podcastPublication([{...episode, videoAccess: "members", playbackLinks: member.playbackLinks}]), /Members-only video cannot/);
  assert.throws(() => podcastPublication([], {rss: "https://www.patreon.com/rss/creator?auth=private"}), /Invalid podcast distribution/);
  assert.throws(() => podcastPublication([], {rss: "https://example.org/feed.xml?token=private"}), /Invalid podcast distribution/);
  assert.throws(() => podcastPublication([], {patreon: "https://patreon.com.evil.example/creator"}), /Invalid podcast distribution/);
  assert.throws(() => podcastPublication([{...episode, captions: undefined}]), /require playable media and captions/);
  assert.throws(() => podcastPublication([{...episode, audio: "/private/guest.mp3"}]), /Invalid podcast asset path/);
  assert.throws(() => podcastPublication([], {spotify: "https://open.spotify.com.example.org/show/something"}), /Invalid podcast distribution/);
  assert.throws(() => renderCreatorPage("/podcast/unapproved/", publication), /Unknown creator path/);
});

test("Watch has an honest empty library and its own canonical destination", () => {
  assert.match(watch, /<title>Watch — Devon Alan Akins<\/title>/);
  assert.match(watch, /rel="canonical" href="https:\/\/devonakins\.com\/watch\/"/);
  assert.match(watch, /<h1 id="pc-title">Watch<span>\.<\/span><\/h1>/);
  assert.match(watch, /No videos published yet/);
  assert.match(watch, /Original videos|original media/i);
  assert.match(watch, /href="\/podcast\/"/);
  assert.match(watch, /href="\/courses\/"/);
  assert.doesNotMatch(watch, /<iframe|<video|autoplay|youtube\.com|twitch\.tv|fake-player/i);
  assert.match(watch, /A Patreon creator link will appear here after account and membership details are verified/);
  assert.doesNotMatch(watch, /href="https:\/\/(?:www\.)?patreon\.com/);
  assert.deepEqual(watchPublication().videos, []);
});

test("only approved, verified, public Stream recordings become Watch pages", () => {
  const item = {approved:true, visibility:"public", rightsApproved:true, captionsVerified:true,
    playbackVerified:true, slug:"first-recording", title:"Test <script> recording",
    summary:"First & test", kind:"recording", date:"2026-11-20", durationSeconds:121,
    streamUid:"aabbccddeeff00112233445566778899",
    notes:["Note <private>"], transcript:["Guest: <test>"],
    chapters:[{startSeconds:0,title:"Intro"},{startSeconds:60,title:"Topic & context"}]};
  const publication = watchPublication([item,
    {...item,approved:false,slug:"draft",title:"Hidden draft"},
    {...item,slug:"future",date:"2026-12-01",title:"Hidden future"}], "2026-11-21");
  assert.deepEqual(publication.videos.map(video=>video.route), ["/watch/first-recording/"]);
  const index = renderCreatorPage("/watch/",podcastPublication(),publication);
  const detail = renderCreatorPage("/watch/first-recording/",podcastPublication(),publication);
  assert.match(index,/Test &lt;script&gt; recording/);
  assert.doesNotMatch(index,/Hidden draft|Hidden future|<iframe/);
  assert.match(detail,/src="https:\/\/iframe\.videodelivery\.net\/aabbccddeeff00112233445566778899"/);
  assert.match(detail,/title="Watch: Test &lt;script&gt; recording"/);
  assert.match(detail,/loading="lazy"/);
  assert.match(detail,/allowfullscreen/);
  assert.match(detail,/Notes<\/h2><p>Note &lt;private&gt;/);
  assert.match(detail,/Transcript<\/h2><p>Guest: &lt;test&gt;/);
  assert.match(detail,/<time datetime="PT60S">1:00<\/time> Topic &amp; context/);
  assert.doesNotMatch(detail, /<script> recording|<private>|<test>|autoplay|youtube\.com/);
  assert.throws(()=>renderCreatorPage("/watch/draft/",podcastPublication(),publication),/Unknown creator path/);
  for (const [change,message] of [
    [{rightsApproved:false}, /verified public playback/],
    [{captionsVerified:false}, /verified public playback/],
    [{playbackVerified:false}, /verified public playback/],
    [{visibility:"members"}, /verified public playback/],
    [{streamUid:"https://evil.example/watch"}, /Invalid approved watch video/],
    [{streamUid:"aabbccddeeff00112233445566778899?token=secret"}, /Invalid approved watch video/],
    [{slug:"../private"}, /Invalid approved watch video/],
    [{date:"2026-02-30"}, /Invalid approved watch video/],
    [{chapters:[{startSeconds:1,title:"Late"}]}, /Invalid watch video chapters/],
    [{notes:["ok", 123]}, /Invalid watch video notes/]
  ]) assert.throws(()=>watchPublication([{...item,...change}],"2026-11-21"),message);
  assert.equal(WATCH_KINDS.replay,"Live replay");
});

test("podcast videos enter Watch while audio-only and member-only episodes stay private", () => {
  const base = {approved:true,slug:"podcast-test",title:"Test podcast video",summary:"Episode preview",
    date:"2026-11-20",durationSeconds:61,format:"solo",guests:[],
    videoPreview:"/podcast-media/preview.mp4",captions:"/podcast-media/preview.vtt",
    videoAccess:"members",playbackLinks:[{label:"Patreon full video",url:"https://www.patreon.com/posts/example"}]};
  const publication = podcastPublication([base,
    {...base,slug:"audio-only",title:"Audio-only",videoPreview:undefined,captions:undefined,
      audio:"/podcast-media/audio.mp3",videoAccess:"public",playbackLinks:[]}],{},"2026-11-21");
  const index = renderCreatorPage("/watch/",publication);
  assert.match(index,/Test podcast video/);
  assert.match(index,/Podcast preview/);
  assert.match(index,/href="\/podcast\/podcast-test\/"/);
  assert.doesNotMatch(index,/Audio-only|posts\/example|\/podcast-media\/preview\.mp4/);
});

test("courses hub is honest about prelaunch status and does not solicit payment", () => {
  assert.match(courses, /<title>Courses — Devon Alan Akins<\/title>/);
  assert.match(courses, /rel="canonical" href="https:\/\/devonakins\.com\/courses\/"/);
  assert.match(courses, /Mathematical physics, from first principles/);
  assert.match(courses, /Man of the House/);
  assert.match(courses, /No courses are available for enrollment or purchase yet/);
  assert.match(courses, /AI-assisted code/);
  assert.match(courses, /Patreon is the intended home/);
  assert.match(courses, /Flagship course \/ in development/);
  assert.match(courses, /Future learning track \/ planned/);
  assert.ok(courses.indexOf('Man of the House.') < courses.indexOf('Mathematical physics, from first principles.'), 'actual flagship appears before future physics track');
  assert.match(courses, /href="\/courses\/man-of-the-house\/start\/"/);
  assert.match(courses, /No account or payment is needed to read it/);
  assert.match(courses, /01 \/ Notice/);
  assert.match(courses, /02 \/ Practice/);
  assert.match(courses, /03 \/ Review/);
  assert.doesNotMatch(courses, /<iframe|<video|<audio|<form|Buy now|Enroll now|\/podcast-media\//);
  assert.match(courses, /href="\/podcast\/"/);
});
test("setup distinguishes current owner-confirmed field gear from eight unpurchased candidates", () => {
  assert.match(setup, /rel="canonical" href="https:\/\/devonakins\.com\/setup\/"/);
  assert.deepEqual(CREATOR_CATEGORIES.map(category => category.id), ["field", "stage", "control", "lab"]);
  assert.equal(CREATOR_GEAR.length, 10);
  assert.equal(new Set(CREATOR_GEAR.map(product => product.id)).size, 10);
  assert.equal((setup.match(/data-gear-status="owned"/g) || []).length, 2);
  assert.equal((setup.match(/data-gear-status="considering"/g) || []).length, 7);
  assert.equal((setup.match(/data-gear-status="future"/g) || []).length, 1);
  assert.match(setup,/Owned · owner-confirmed/);
  assert.match(setup,/My current iPhone/);
  assert.match(setup,/My Sony headset/);
  assert.match(setup,/model not independently checked/);
  assert.match(setup,/specific hardware models and app-level audio compatibility stay unverified/i);
  assert.ok(setup.indexOf('data-gear-id="existing-iphone"') < setup.indexOf('data-gear-id="p4next"'));
  assert.ok(setup.indexOf('data-gear-id="existing-sony-headset"') < setup.indexOf('data-gear-id="p4next"'));
  for (const id of ["existing-iphone","existing-sony-headset"]) {
    const product=CREATOR_GEAR.find(item=>item.id===id);
    assert.equal(product.status,"owned");
    assert.equal(product.url,undefined,"generic owned gear is not linked to a guessed product listing");
    assert.equal(product.retailer,undefined,"owned gear must not link to a speculative retailer");
    const card=setup.match(new RegExp('<article class="pc-product" data-gear-id="'+id+'"[\\s\\S]*?<\\/article>'))?.[0];
    assert.ok(card,id+" card is rendered");
    assert.doesNotMatch(card, /<a |href=|target="_blank"|Shop now|Buy now/i);
  }
  assert.equal((setup.match(/Shared with The Stage/g) || []).length, 2);
  for (const category of CREATOR_CATEGORIES) {
    assert.match(setup, new RegExp('id="pc-cat-' + category.id + '"'));
    assert.match(setup, new RegExp('href="#' + category.id + '"'));
  }
  for (const product of CREATOR_GEAR) {
    assert.match(setup, new RegExp('data-gear-id="' + product.id + '"'));
    for (const url of [product.url, product.retailer].filter(Boolean)) {
      assert.equal(new URL(url).protocol, "https:");
      assert.equal(new URL(url).search, "");
    }
    assert.ok(product.spec && product.use);
  }
  assert.match(setup, /Inventory pending/);
  assert.match(setup, /Build notes/);
  assert.doesNotMatch(setup, /Buy now|In stock|\$\d|<img/);
});

test("creator pages are first-party, accessible and connected to the established site", () => {
  for (const html of [watch, podcast, courses, setup, live, about]) {
    assert.match(html, /<html lang="en" class="lab-html"/);
    assert.match(html, /<main id="pc-main" tabindex="-1">/);
    assert.match(html, /aria-label="Primary navigation"/);
    assert.match(html, /aria-current="page"/);
    assert.match(html, /href="\/watch\/"/);
    assert.match(html, /href="\/podcast\/"/);
    assert.match(html, /href="\/setup\/"/);
    assert.match(html, /href="\/fieldnotes\/"/);
    assert.match(html, /\/src\/professional\/creator-pages\.css/);
    assert.match(html, /src="\/laboratory-theme\.js"/);
    assert.match(html, /data-lab-theme-select/);
    assert.doesNotMatch(html, /<script[^>]+src="https?:|<form|password|PHI|patient record|Nona Workspace/i);
  }
  assert.throws(() => renderCreatorPage("/unknown/"), /Unknown creator path/);
  const home = renderResearchFacilityHome();
  assert.equal((home.match(/role="tabpanel"/g) || []).length, 8);
  assert.match(home, /href="\/watch\/">Watch/);
  assert.match(home, /href="\/podcast\/">Podcast/);
  assert.match(home, /href="\/setup\/">My Setup/);
  assert.match(home, /href="\/courses\/">Learn/);
  assert.match(home, /href="\/fieldnotes\/">Writing/);
});

test("creator navigation keeps the January primary hierarchy and contextual destinations", () => {
  const primaryPaths = ["/work/", "/watch/", "/podcast/", "/courses/", "/fieldnotes/", "/about/"];
  const contextPaths = ["/live/", "/research/", "/activity/", "/systems/", "/setup/", "/contact/"];
  const pages = [
    ["/watch/", watch], ["/podcast/", podcast], ["/courses/", courses],
    ["/setup/", setup], ["/live/", live], ["/about/", about]
  ];
  for (const [path, html] of pages) {
    const header = html.match(/<header class="pc-header">([\s\S]*?)<\/header>/)?.[1];
    assert.ok(header, path + " has a header");
    const primary = header.match(/<nav class="pc-nav" aria-label="Primary navigation">([\s\S]*?)<\/nav>/)?.[1];
    const context = header.match(/<nav class="pc-context-nav" aria-label="More destinations">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(primary && context, path + " has both navigation levels");
    const hrefs = section => [...section.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(hrefs(primary), primaryPaths, path + " primary hierarchy");
    assert.deepEqual(hrefs(context), contextPaths, path + " context hierarchy");
    assert.equal((header.match(/aria-current="page"/g) || []).length, 1, path + " single selected destination");
    assert.ok(header.includes('href="' + path + '" aria-current="page"'), path + " selected destination");
    assert.ok(header.includes('aria-label="da. Devon Alan Akins home"'), "logo is the home link");
  }
});

test("live theater stays offline without publishing an unapproved player or recordings", () => {
  assert.ok(live.includes('href="https://devonakins.com/live/"'));
  assert.ok(live.includes("Live from <em>wherever I am"));
  assert.ok(live.includes("NOT BROADCASTING"));
  assert.ok(live.includes("There is no archive published here yet"));
  assert.ok(live.includes("data-live-player hidden"));
  assert.ok(live.includes("mobile-live-client.ts"));
  assert.ok(live.includes("mobile-live.css"));
  assert.doesNotMatch(live, /<iframe|streamKey|token=|autoplay|private recording/i);
});

test("writing retains its index and renders canonical, directly addressable fieldnotes", () => {
  const index = renderResearchFacilityHome({initialView: "writing", canonicalPath: "/fieldnotes/"});
  for (const [path, note] of Object.entries(FIELDNOTES)) {
    assert.ok(index.includes('href="' + path + '"'));
    const detail = renderResearchFacilityHome({initialView: "writing", canonicalPath: path});
    assert.ok(detail.includes('<h1>' + note.title + '</h1>'));
    assert.ok(detail.includes('href="https://devonakins.com' + path + '"'));
    assert.match(detail, /class="lab-reading-body"/);
  }
});

test("the Vite and page generators use the same gated publication set", async () => {
  const [pages, vite, css] = await Promise.all([
    readFile(new URL("../scripts/pages.mjs", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../src/professional/creator-pages.css", import.meta.url), "utf8")
  ]);
  assert.match(pages, /laboratoryCandidate && creatorPaths\.includes\(path\)/);
  assert.match(pages, /Unapproved podcast asset/);
  assert.match(vite, /process\.env\.LABORATORY_SITE_CANDIDATE === "1"/);
  assert.match(vite, /\.\.\.creatorPaths/);
  assert.match(css, /html\.lab-html\[data-theme="dark"\]/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.pc-course-steps/);
  assert.doesNotMatch(css, /@import|https:\/\/fonts\.|url\(\s*https?:/);
});
