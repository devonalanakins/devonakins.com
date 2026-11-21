# Watch — first-party video publication contract

**Status:** source implementation / review candidate. No recordings or member access are published by this change. This belongs to the independent personal site, not Nona Neuropsychology.

## User experience

- `/watch/` is the canonical video library; it shows only published videos or an honest prelaunch state.
- `/watch/{slug}/` is a permanent canonical page for an approved public Stream recording, with a player, date, duration and optional notes/transcript/chapters.
- Approved podcast episodes with playable video or a public preview are also discoverable in Watch; the canonical episode page remains under `/podcast/{slug}/`.
- Spotify remains the selected distribution channel for podcast audio. Patreon handles membership and does **not** license exposing paid video through the public Stream route.
- The website works without a configured Stream account and publishes no fake videos.

## Release checklist for each recording

1. Record and edit locally. Keep an original and backup, then review guest permission, background details, publication rights and sensitive content.
2. If using Cloudflare Stream, upload the final **public** version through an authorized account. This commit does not provision services or incur purchases.
3. Configure accessible captions or an equivalent supported by the player; actually test them, playback, audio, mobile Safari and performance.
4. In `src/professional/watch-publication.mjs`, add an approved entry only after verification. Required fields: `approved:true`, `visibility:"public"`, `rightsApproved:true`, `captionsVerified:true`, `playbackVerified:true`, `slug`, `title`, `summary`, ISO `date`, integer `durationSeconds`, `kind` (conversation/recording/lesson/replay) and the 32-character Stream `streamUid`. Public `notes`, `transcript` and ordered `chapters` are optional. No secret query strings, account tokens, private material or unconsented transcripts.
5. Run the full verification suite and manual responsive, accessibility and playback checks, then follow protected release and independently verify the live revision.
6. Podcast episodes use their existing allowlist. Only approved publicly playable first-party video/previews enter Watch; Patreon links do not make paid video playable here.

## Security and architecture

- The publication manifest fails closed for invalid approved entries. Unapproved and future-dated items are not routed. Displayed metadata is HTML-escaped.
- The Stream ID is strictly validated and cannot contain an arbitrary iframe host, query string, scripts or signed tokens.
- The Worker applies a narrow `frame-src https://iframe.videodelivery.net` allowance only to Laboratory Watch paths. Other pages retain the existing CSP.
- No external script dependency, viewer tracking, backend secrets, payment implementation, memberships or database is added.
- Cloudflare Stream is managed infrastructure, not an independently self-hosted streaming stack. Budget and provider terms require separate approval.
- Member-only first-party access requires separate authenticated video delivery, negative access tests and explicit owner approval.

## Review gates

- [x] Owner-gated public manifest, with no approved real recordings
- [x] Watch library and individual video player templates in source
- [x] Podcast-video discovery without duplicating podcast episode routes
- [x] Route, CSP, unit and browser-acceptance source integration
- [ ] Exact-head CI and Chromium/WebKit acceptance results
- [ ] Owner visual review and real iPhone Safari checks
- [ ] First real approved captioned video and Stream service billing approval
- [ ] Any private membership or live ingestion feature
