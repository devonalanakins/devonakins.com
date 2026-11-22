# Devon Alan Akins — podcast, Patreon, Spotify and courses

**Status (2026-11-22):** Platform setup notes and website source candidates. The November 21 owner dashboard inspection established an existing Patreon creator page, but the retired podcast show title and public creator URL remain unverified for publication. No connected Spotify distribution, paid tier, published episode, or native on-site member entitlement is asserted by this repository. [January issue #148](https://github.com/devonalanakins/devonakins.com/issues/148) owns release gates; production publication is separately approved.

## Distribution architecture

- **devonakins.com** is the public home: `/podcast/`, approved `/podcast/{slug}/`, `/courses/`, and `/setup/`. It can display public summaries, clips, public-safe transcripts and show notes, and verified links.
- **Patreon** owns memberships, videos and lesson collections, and can host audio for the podcast. If Patreon Video is eligible, the creator can upload a video directly; Patreon can extract an audio feed for the *same post's audience*. Verify account eligibility in Patreon settings.
- **Spotify** is for audio discovery and listening. Connect the Patreon podcast using **Settings → Podcasts and audio → [show] → Distribution**, then configure public and/or members-only feeds.
- **Member access on devonakins.com:** not implemented. Link to Patreon for gated playback for now. Real native on-site member playback would require a separate reviewed Patreon OAuth/entitlement integration and private video hosting with signed access. Client-side hiding or a public `/podcast-media/` video file is not a paywall.

## Creator account checklist (owner action, desktop preferred)

1. Patreon’s logged-in creator dashboard was inspected on 2026-11-21: the **Devon Alan Akins** page exists, and **Podcast and audio** lists the retired show name **The Mark They Make**, with zero published episodes. Its exclusive Spotify toggle was off. Devon confirmed that the old name is retired and the podcast is **Devon Alan Akins**. Reuse the existing show; its rename is still pending verification. Account state may change.
2. Verify Patreon Video eligibility and prepare approved artwork and a suitable *public-facing* author email. In **Settings → Podcasts and audio**, update the existing show title to **Devon Alan Akins** and review its square podcast artwork, description, author name/email, language, format, explicit-content and category settings.
3. In **Distribution**, choose whether public episodes are available on Spotify, enable access to exclusive episodes for members as needed, and enable the private member RSS feature for patrons. **Never copy an individual's private RSS URL into this repository or public website.**
4. If enabling free public episodes, follow Patreon's public Spotify instructions in **Spotify for Creators** (Add a new show → Find an existing show → Somewhere else, then verify the public RSS), and add the resulting official Spotify show URL back in Patreon. If combining public and paid shows, set up **Synced Feeds** in Spotify for Creators on desktop after both feeds exist. Avoid creating multiple competing public show listings.
5. Decide whether to offer free following and one simple paid membership; any price, charge, benefit promise or public enrollment requires explicit owner approval and real content. Do not advertise lessons or episodes as published until they are.

## Episode release procedure

**Public audio / paid full video (recommended start):**

1. Produce a single master recording with consent, licensed music, captions and guest-publication review.
2. Export audio for a **public audio post** on Patreon. Set **Add to podcast** on and select the show; this is the version intended to become publicly available on Spotify. Validate the actual public feed and the Spotify listing.
3. Create a **separate paid video post** on Patreon from the same recording. Use Paid access / the intended tier and keep **Add to podcast** off unless a separate paid audio release is intentional. Otherwise Patreon will mirror that post's audio with the video post's restricted access, or duplicate an episode. Test playback both as a member and as a logged-out visitor.
4. Add a public-safe episode entry to `src/professional/podcast-publication.mjs` only after review of title, date, credited guests, summary, artwork, transcript and links. A member-video entry can set `videoAccess: "members"` and reference a Patreon post as a `playbackLinks` URL; do **not** supply a native video path.
   A separately approved short public clip may use `videoPreview` with its matching `captions` VTT. It is public and downloadable, so never use the paid full recording or a private link as the preview. The build checks the allowlist and limits first-party MP4/MP3 assets to 2.5 MB.
5. If an entire bonus episode is Patreon-only, upload as a paid audio/video post with **Add to podcast** enabled so eligible members can listen in Spotify after linking Patreon. Do not infer a public release from that sync.

## Course library procedure

- Keep `/courses/` public. The flagship learning series is **Man of the House** (practical household competence, safety, cooking, organization and responsibility), with one complete free written [15-minute starter lesson source](../src/professional/first-practical-lesson.mjs) destined for `/courses/man-of-the-house/start/` after an approved release. The wider course is not open for enrollment or sale. Mathematics, physics and AI-assisted simulations are future learning tracks, not the flagship paid product.
- Develop lessons as individual Patreon posts, organized into an ordered Collection. A course is a structured collection, not a native LMS with automatic grading, certificates, or verified progress tracking.
- Patreon supports selling an eligible collection as a one-time purchase when it contains posts; do not publish a purchase control until actual lessons, approved pricing, rights and refunds/terms are ready.
- On the website, show verified descriptions and links to approved collection pages, not embedded paid video URLs or publicly distributed private files.
- Consider a self-hostable course application later only when navigation, assessments, exports or analytics genuinely require it.

## Website publication controls

- Allowed public distribution links are checked in `src/professional/podcast-publication.mjs`. Populate **only verified actual destinations** in `approvedDistribution`. Supported keys: `patreon`, `spotify`, `apple`, `youtube`, and **public** `rss` (no credential querystring). Keep absent sources empty; the Podcast and Watch pages deliberately have **no automatic Patreon creator-link fallback**.
- `approvedEpisodes` starts empty. An episode requires `approved: true`, a valid date, and playable verified links/media. Public static assets are intentionally restricted. Never store premium videos, paid audio or private RSS feeds in `public/`.
- The website stays in a prelaunch state until there is an approved real episode. `/courses/` explicitly indicates no courses are on sale or open for enrollment.

## Episode metadata

Use `interview`, `solo` or `trailer` in the site publication record. Start the optional `chapters` array at zero. Each entry contains `startSeconds` as a strictly increasing whole-second offset within the recording and a short `title`. Copy chapters to the publisher’s supported fields and verify how they appear in the destination app. The website keeps a readable timestamped list with JavaScript disabled. For an approved public full recording or audio file, the first-party chapter module can add seek buttons after browser initialization; preview-only and Patreon-only full video remain static chapter text. Browser fixtures are synthetic until real owner media is approved and playback tested.

Use the 3000 × 3000 show cover for directory upload after owner approval. The podcast webpage uses a lightweight derivative, a separate 1200 × 630 share card and the public creator link. Public Patreon and listening links are withheld until their exact destination is approved in `approvedDistribution`. An account observed in a signed-in dashboard does not itself verify a public URL, show name, pricing, or offer. Listening destinations still require verification against actual published feeds.

## Acceptance before public launch

- [ ] Patreon page and show claimed by owner; media eligibility and accurate public creator email confirmed
- [ ] Rename the existing show **Devon Alan Akins** and verify the saved title; replace retired branding when approved artwork is ready
- [ ] Legitimate Spotify public show URL verified with an actual public episode or trailer
- [ ] Paid video viewable by eligible members; not viewable by public visitors
- [ ] Public audio appears on Spotify without duplicating the paid full video post
- [ ] Mobile player, captions, transcripts/notes and links checked
- [ ] Website candidate test and build gates pass at the *exact* PR head; owner reviews release
- [ ] Public production `/podcast/` and `/courses/` independently verified after protected Cloudflare release

## Official references

- [Patreon — Set up a podcast](https://support.patreon.com/hc/en-us/articles/34699048104333-Set-up-a-podcast-on-Patreon)
- [Patreon — Share your podcast on Spotify](https://support.patreon.com/hc/en-us/articles/17118627183501-Share-your-podcast-on-Spotify)
- [Patreon — Enable audio RSS feeds for members](https://support.patreon.com/hc/en-us/articles/213557023-Enable-audio-RSS-feeds-for-my-members)
- [Patreon — Video overview](https://support.patreon.com/hc/en-us/articles/6598555214477-Patreon-Video-overview)
- [Patreon — Organize collections](https://support.patreon.com/hc/en-us/articles/16666733679757-How-to-use-Collections-to-organize-your-work)
- [Patreon — Sell posts and collections](https://support.patreon.com/hc/en-us/articles/16303719836813-Selling-one-time-purchases-on-Patreon)
