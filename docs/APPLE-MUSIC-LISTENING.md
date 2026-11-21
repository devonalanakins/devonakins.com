# Apple Music / Ambient Music — phone-first listening presence

**Status (2026-11-21):** Opt-in source and UI candidate for Devon Alan Akins's personal site. No Apple Developer enrollment, MusicKit entitlement, Shortcuts automation, iPhone connection, public track sharing, or Apple Music API access is asserted as active.

## What Apple's APIs can and cannot tell the website

The Apple Music catalog/Library APIs and MusicKit do **not** give the Cloudflare website a general remote "what's playing on Devon's iPhone" endpoint. In particular, the iOS Ambient Music control may not supply song metadata to Shortcuts. The website must never claim continuous system-wide observation merely from a manual Shortcuts report.

Use the existing phone to send an **optional owner report** with iOS Shortcuts "Get Current Song" (if that action actually returns a track), or manually choose a named Ambient Music mood (Sleep, Chill, Productivity, Wellbeing). No unsupported ambient-mood detection is claimed. Future automation is possible only after verifying a supported Shortcuts trigger/permission on the actual iOS version.

## Privacy and architecture

- Existing **Spotify** backend and its owner gates remain intact for rollback. Only the selected Laboratory creator UI is switched to Apple Music. The existing Spotify public endpoint should be separately disabled through verified owner controls if no longer wanted.
- The separate first-party endpoint \`GET /api/listening/apple\` defaults to \`hidden\` unless \`APPLE_LISTENING_PUBLIC_ENABLED=true\` is explicitly configured in the **personal** Worker environment.
- \`POST /api/listening/apple/ingest\` requires \`APPLE_LISTENING_INGEST_ENABLED=true\`, a random 32+ character \`APPLE_LISTENING_INGEST_TOKEN\` secret, and exact \`Authorization: Bearer <token>\`. The public site never receives that secret.
- Both endpoints use the personal site's existing private \`LISTENING_DB\`. Apply \`migrations/0013_apple_listening.sql\` to that database **only after explicit migration approval and backup**. No migration is automatically applied by the PR.
- A successful report **replaces** one D1 row. No track-listening history, artwork, account credentials, playlist access, user agent, location, or device fingerprint is persisted. Omit confidential track details when public-sharing is disabled.
- A report older than 100 seconds is **stale** and no longer labeled as current. The page explicitly says "Last reported" rather than claiming uninterrupted live playback.
- The public path includes title/artist only when \`APPLE_LISTENING_TRACK_DETAILS_PUBLIC=true\` is separately enabled. Ambient reports show owner-selected mode only; silence, stale data, and a disabled bridge are never treated as proof the phone is off.
- All reports are explicit and permissioned. No Apple Music subscription, Apple Developer Program membership, MusicKit identity token, or third-party API key is required by this implementation.

## Test using iOS Shortcuts (manual first)

1. Create a Shortcut called **Share my listening**.
2. Use **Get Current Song** and inspect the actual output on your iPhone. If it does not return usable metadata, stop rather than inventing track information.
3. If successful, prepare a Dictionary: \`kind\` = \`song\`, \`title\` = the actual song title, \`artist\` = the actual artist. Optionally include \`album\` and an Apple Music \`https://music.apple.com/...\` URL when available.
4. Use **Get Contents of URL** with POST \`https://devonakins.com/api/listening/apple/ingest\`, headers \`Content-Type: application/json\` and \`Authorization: Bearer <private token>\`, and the Dictionary as the JSON request body. Keep the token private in Shortcuts. If the chosen Shortcuts action serializes the Dictionary unexpectedly, verify the network request payload before enabling a real report.
5. An Ambient Music variant can explicitly report \`{"kind":"ambient","mood":"Chill"}\` (or Sleep, Productivity, Wellbeing) *only if the owner selects the mode*. Do not claim the Shortcut reads the currently active Ambient Music mode automatically.
6. A stop variant reports \`{"kind":"off"}\`. If it isn't sent, the prior status automatically expires in 100 seconds.
7. Review \`GET /api/listening/apple\` from a separate browser. With public sharing disabled it must always return \`{"version":1,"source":"owner-shortcut","state":"hidden"}\`. No song or artist may appear publicly until owner visibility is configured.

## Go-live gates

Before any protected D1 migration, Worker secret addition, public sharing, or release: verify the owner-approved account, test an iOS Shortcut without secrets in logs, verify exact deployed SHA, verify Source Pending / Stale / Recently reported states in Safari and WebKit, test reset/revocation, and confirm that Nona/clinical data is absent. The owner's personal stream is distinct from audio broadcast rights: **this feature shares metadata only, never rebroadcasts licensed Apple Music audio.**

## Rollback

Leave the old Spotify code and D1 rows unchanged. Disable \`APPLE_LISTENING_PUBLIC_ENABLED\` and \`APPLE_LISTENING_INGEST_ENABLED\`, and revert the Laboratory UI branch as needed. Neither the initial PR nor a rollback needs to delete the single-row private table. Rotate the ingest token on suspicion of compromise.
