import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CREATOR_ROUTES, CREATOR_CATEGORIES, CREATOR_GEAR, creatorPaths, renderCreatorPage} from "../src/professional/creator-pages.mjs";
import {podcastPublication} from "../src/professional/podcast-publication.mjs";
import {renderResearchFacilityHome} from "../src/professional/research-facility.mjs";
import {FIELDNOTES} from "../src/professional/fieldnotes.mjs";

const podcast = renderCreatorPage(CREATOR_ROUTES.podcast);
const setup = renderCreatorPage(CREATOR_ROUTES.setup);
const courses = renderCreatorPage(CREATOR_ROUTES.courses);

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
  assert.deepEqual(creatorPaths, ["/podcast/", "/courses/", "/setup/"]);
});

test("only approved, dated episodes and configured feeds render, with escaped text and accessible playback", () => {
  const episode = {
    approved: true, slug: "test-interview", title: "Test & interview", summary: "Test fixture, never published",
    date: "2026-11-20", durationSeconds: 125, format: "interview", guests: ["Test <guest>"],
    video: "/podcast-media/test.mp4", captions: "/podcast-media/test.vtt",
    audio: "/podcast-media/test.mp3", thumbnail: "/podcast-media/test.webp",
    notes: ["A <sample> note."], transcript: ["Speaker: A <sample> transcript."],
    links: [{label: "Safe link", url: "https://example.org/reference"}, {label: "Unsafe", url: "javascript:alert(1)"}]
  };
  const publication = podcastPublication([
    episode,
    {...episode, slug: "unapproved", title: "Hidden title", approved: false},
    {...episode, slug: "future", title: "Future title", date: "2026-12-01"},
    {...episode, slug: "solo", title: "Test solo", format: "solo", guests: [], date: "2026-11-19"}
  ], {rss: "https://example.org/feed.xml", spotify: "https://open.spotify.com/show/example"}, "2026-11-21");
  const archive = renderCreatorPage("/podcast/", publication);
  const detail = renderCreatorPage(episode.slug.replace(/^/, "/podcast/") + "/", publication);
  assert.match(archive, /Featured episode[\s\S]*Test &amp; interview/);
  assert.match(archive, /Solo · <time/);
  assert.match(archive, /Interview · Test &lt;guest&gt; · <time datetime="2026-11-20">November 20, 2026<\/time> · 2 min 5 sec/);
  assert.match(archive, /<link rel="alternate" type="application\/rss\+xml"/);
  assert.doesNotMatch(archive, /Hidden title|Future title|No episodes published yet/);
  assert.match(detail, /<video controls playsinline preload="none"/);
  assert.match(detail, /<audio controls preload="none"/);
  assert.match(detail, /<track kind="captions" srclang="en"/);
  assert.match(detail, /<h2>Show notes<\/h2><p>A &lt;sample&gt; note\./);
  assert.match(detail, /<h2>Transcript<\/h2><p>Speaker: A &lt;sample&gt; transcript\./);
  assert.match(detail, /href="https:\/\/example\.org\/reference"/);
  assert.doesNotMatch(detail, /autoplay|javascript:|<sample>/);
  const member = {...episode, videoAccess: "members", audio: undefined, video: undefined,
    captions: undefined, playbackLinks: [{label: "Watch on Patreon", url: "https://www.patreon.com/posts/test-123"}]};
  const memberPublication = podcastPublication([member], {patreon: "https://www.patreon.com/devonalanakins"}, "2026-11-21");
  const memberPage = renderCreatorPage("/podcast/test-interview/", memberPublication);
  assert.match(memberPage, /Full video is available to eligible Patreon members/);
  assert.match(memberPage, /https:\/\/www\.patreon\.com\/posts\/test-123/);
  assert.doesNotMatch(memberPage, /<video|<audio|\/podcast-media\/test\.mp4/);
  assert.deepEqual(memberPublication.outlets.map(outlet => outlet.key), ["patreon"]);
  const preview = {...member, videoPreview: "/podcast-media/preview.mp4", captions: "/podcast-media/preview.vtt"};
  const previewPublication = podcastPublication([preview], {}, "2026-11-21");
  const previewPage = renderCreatorPage("/podcast/test-interview/", previewPublication);
  assert.match(previewPage, /<h2>Video preview<\/h2>/);
  assert.match(previewPage, /aria-label="Episode video preview"/);
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

test("courses hub is honest about prelaunch status and does not solicit payment", () => {
  assert.match(courses, /<title>Courses — Devon Alan Akins<\/title>/);
  assert.match(courses, /rel="canonical" href="https:\/\/devonakins\.com\/courses\/"/);
  assert.match(courses, /Mathematical physics, from first principles/);
  assert.match(courses, /No courses are available for enrollment or purchase yet/);
  assert.match(courses, /AI-assisted code/);
  assert.match(courses, /Patreon is the planned home/);
  assert.doesNotMatch(courses, /<iframe|<video|<audio|<form|Buy now|Enroll now|\/podcast-media\//);
  assert.match(courses, /href="\/podcast\/"/);
});
test("setup gives all eight candidates unique, sourced entries and clear states", () => {
  assert.match(setup, /rel="canonical" href="https:\/\/devonakins\.com\/setup\/"/);
  assert.deepEqual(CREATOR_CATEGORIES.map(category => category.id), ["field", "stage", "control", "lab"]);
  assert.equal(CREATOR_GEAR.length, 8);
  assert.equal(new Set(CREATOR_GEAR.map(product => product.id)).size, 8);
  assert.equal((setup.match(/data-gear-status="considering"/g) || []).length, 7);
  assert.equal((setup.match(/data-gear-status="future"/g) || []).length, 1);
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
  for (const html of [podcast, courses, setup]) {
    assert.match(html, /<html lang="en" class="lab-html"/);
    assert.match(html, /<main id="pc-main" tabindex="-1">/);
    assert.match(html, /aria-label="Primary navigation"/);
    assert.match(html, /aria-current="page"/);
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
  assert.match(home, /href="\/podcast\/">Podcast/);
  assert.match(home, /href="\/setup\/">My Setup/);
  assert.match(home, /href="\/courses\/">Courses/);
  assert.match(home, /href="\/fieldnotes\/">Writing/);
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
