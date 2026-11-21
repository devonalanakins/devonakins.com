# Devon Alan Akins — podcast, Patreon, Spotify and courses

**Status (2026-11-21):** Platform setup plan and website candidate. No Patreon or Spotify creator account, audience tier, paid course, episode, or native on-site membership integration is asserted to be connected or published by this repository. The website is under review in PR #142; production release remains separately gated.

## Distribution architecture

- **devonakins.com** is the public home: `/podcast/`, approved `/podcast/{slug}/`, `/courses/`, and `/setup/`. It can display public summaries, clips, public-safe transcripts and show notes, and verified links.
- **Patreon** owns memberships, videos and lesson collections, and can host audio for the podcast. If Patreon Video is eligible, the creator can upload a video directly; Patreon can extract an audio feed for the *same post's audience*. Verify account eligibility in Patreon settings.
- **Spotify** is for audio discovery and listening. Connect the Patreon podcast using **Settings → Podcasts and audio → [show] → Distribution**, then configure public and/or members-only feeds.
- **Member access on devonakins.com:** not implemented. Link to Patreon for gated playback for now. Real native on-site member playback would require a separate reviewed Patreon OAuth/entitlement integration and private video hosting with signed access. Client-side hiding or a public `/podcast-media/` video file is not a paywall.

## Creator account checklist (owner action, desktop preferred)

1. Patreon’s logged-in creator dashboard was inspected on 2026-11-21: the **Devon Alan Akins** page exists, and **Podcast and audio** lists an existing show, **The Mark They Make**, with zero published episodes. Its exclusive Spotify toggle was off. This does not establish whether that show is the intended show under an older name or a separate project. Preserve it; resolve that relationship before renaming it or creating another show. Account state may change.
2. Verify Patreon Video eligibility and prepare approved artwork and a suitable *public-facing* author email. After deciding which show to use, review **Settings → Podcasts and audio** and set the show title **Devon Alan Akins**, square podcast artwork, description, author name/email, language, format, explicit-content and category settings. If a separate new show is intended, use **New podcast** and choose **Not now** for an old feed only after confirming there is no feed to preserve.
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

- Keep `/courses/` public. The first planned curriculum concerns mathematical physics, first-principles reasoning and AI-assisted numerical experiments.
- Develop lessons as individual Patreon posts, organized into an ordered Collection. A course is a structured collection, not a native LMS with automatic grading, certificates, or verified progress tracking.
- Patreon supports selling an eligible collection as a one-time purchase when it contains posts; do not publish a purchase control until actual lessons, approved pricing, rights and refunds/terms are ready.
- On the website, show verified descriptions and links to approved collection pages, not embedded paid video URLs or publicly distributed private files.
- Consider a self-hostable course application later only when navigation, assessments, exports or analytics genuinely require it.

## Website publication controls

- Allowed public distribution links are checked in `src/professional/podcast-publication.mjs`. Populate **only verified actual destinations** in `approvedDistribution`. Supported keys: `patreon`, `spotify`, `apple`, `youtube`, and **public** `rss` (no credential querystring). Keep absent sources empty.
- `approvedEpisodes` starts empty. An episode requires `approved: true`, a valid date, and playable verified links/media. Public static assets are intentionally restricted. Never store premium videos, paid audio or private RSS feeds in `public/`.
- The website stays in a prelaunch state until there is an approved real episode. `/courses/` explicitly indicates no courses are on sale or open for enrollment.

## Acceptance before public launch

- [ ] Patreon page and show claimed by owner; media eligibility and accurate public creator email confirmed
- [ ] Owner resolves whether the existing **The Mark They Make** show is the same project before any rename or new show is created
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
