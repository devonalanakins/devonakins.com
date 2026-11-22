# Devon Alan Akins — phone-first live studio

**Status — November 21, 2026:** A source-only, offline-first `/live/` page and anonymous status adapter are under review. **No livestream is configured or published.** The linked personal Cloudflare account's Stream API returned `403 / Cloudflare Stream not enabled` when checked on November 21. No Stream subscription, Stream live input, broadcast key, recording, public episode, or paid product was created. Keep Nona Neuropsychology resources entirely separate.

## Owner experience

1. **Record:** iPhone Camera for spoken pieces, built-in iOS Screen Recording for narrated demonstrations, PRISM Live Studio for camera-based lives and custom RTMPS. Validate the Sony headset as the actual mic in *each* application; Bluetooth audio routing and screen-broadcast limitations differ by application.
2. **Review:** Inspect the actual clip for sound, readability, notifications, sensitive material, and rights/guest consent before publication. Keep original files and a backup. Screen recording a phone **will capture anything visible**; hide notifications and close business/client information first.
3. **Brand:** Use one composited portrait/landscape overlay per mobile format. The OBS scene pack is design source/reference and is **not** installed in PRISM. On iPhone, screen broadcast with face camera inset cannot be assumed. A voice-over-screen lesson is a complete format.
4. **Publish:** Use `devonakins.com/live/` for a public broadcast only after the gated first-broadcast acceptance checks. Put approved public videos in `/watch/`, link podcast episodes from `/podcast/`, and develop structured lessons in `/courses/`. Patreon memberships and Spotify audio remain separate services.
5. **Batch:** A longer recording can become a lesson and a few short excerpts. Publish from a real reviewed content queue; do not promise an automated scheduler or an archive that does not exist.

## Website: what this candidate does

- Adds the real creator route `/live/` to the **existing Laboratory candidate** and links it from the personal homepage and creator navigation. Other site variants retain their existing route gates.
- Renders an accessible, responsive, cinematic page with an honest offline state **even without JavaScript**, no fake countdown, no viewer count, no implied recordings, and no camera permissions. Links from the offline theater and replay section go to the first-party Watch library, not a substitute platform.
- Polls `GET /api/creator/live` only while visible, about every 45 seconds. A publicly enabled stream must pass Cloudflare's documented `/<INPUT_ID>/lifecycle` check with `isInput:true`, `live:true`, and a valid `videoUID`.
- Exposes **only** the verified customer-specific Cloudflare Stream iframe URL. No RTMPS URL, ingest key, video recording ID, admin credential, or private account data is emitted. Error, malformed response, and missing authorization all yield a non-live state.
- Allows a customer-specific `frame-src` only on the live page *after* the publication configuration is explicitly approved. The baseline CSP and all private routes remain unchanged.
- Does **not** provide account signup, authenticated production controls, Stream resource provisioning, automatic course upload, payment, signed playback, replay publication, or recordings management. Those are separate reviewed increments.

The publication gate is in `src/professional/mobile-live.mjs`, `LIVE_PUBLICATION`; it defaults to `publicEnabled:false` with no input/customer identifiers. A missing `CLOUDFLARE_STREAM_READ_TOKEN` Worker secret produces `unavailable`. **Never put API tokens or RTMPS stream keys into source or static site files.** The token should have the least privilege needed to read the live input's lifecycle status. Do not enable public playback until the live-input recording/security policy has been reviewed and approved.

## One-time activation, *not yet authorized or performed*

After deciding to subscribe to Cloudflare Stream and accepting the billing implications:

1. Confirm Stream can be activated under the **personal** account, not the Nona account. Review current rates, recording retention, viewer-minute charges and limits in the dashboard.
2. Create **one** named live input with RTMPS support. Choose and test the recording policy deliberately: simplest privacy-preserving first launch is **no automatic public replay**; store a separately captured local master for review. If automatic recordings are desired later, ensure video access and retention are controlled independently.
3. Store the RTMPS URL and stream key **only in the owner's streaming app**. Store a separate narrowly scoped read token as a Worker secret, not in HTML, JavaScript, GitHub, the site or screenshots.
4. Verify the customer code and live-input UID from Cloudflare's own dashboard/API. Review the input's `allowedOrigins`, signed-URL settings and actual embed URL before updating `LIVE_PUBLICATION` and allowing a production release.
5. In PRISM on the iPhone, add the actual custom RTMPS destination and key. Broadcast a non-sensitive test with explicit owner permission. Confirm audio source, resolution, dropout recovery, landscape/portrait behavior and the correct website player.
6. Turn broadcasting off. Confirm the page actually changes to `OFF AIR`, its iframe unloads, and no replay becomes publicly listed without a separate review.

No purchase, credential configuration, public appearance, or phone streaming has been executed by this code change.

## Local review and acceptance

```sh
npm ci
LABORATORY_SITE_CANDIDATE=1 npm run build
npm test
python3 tests/creator_pages_browser_acceptance.py
```

The browser acceptance script requires installed Chromium/WebKit Playwright engines. Review at 390, 768 and 1440 pixels, with touch/focus, reduced motion, light/dark modes, and no horizontal overflow. Confirm the live state is **not** represented as working when Stream is disabled. Do not merge/deploy until CI and owner acceptance are complete.

### Acceptance matrix

| Condition | Expected behavior |
| --- | --- |
| Public gate disabled | `prelaunch`; no iframe; no provider request |
| Public gate enabled without read token | `unavailable`; no iframe |
| Cloudflare lifecycle returns `live:false` | `offline`; no iframe |
| Lifecycle says `live:true` but no active video UID | `starting`; no iframe |
| Lifecycle says `live:true` with valid active video UID | `live`; customer-scoped player |
| Upstream 403/429, timeout, invalid shape | `unavailable`; no credential leak |
| Unexpected HTTP method | 405; no write |
| Offline after being live | iframe removed |
| Recordings | Never listed until owner approves; currently none |

### References

- [Cloudflare Stream — start a live stream](https://developers.cloudflare.com/stream/stream-live/start-stream-live/)
- [Cloudflare Stream — watch/live-input lifecycle](https://developers.cloudflare.com/stream/stream-live/watch-live-stream/)
- [Cloudflare Stream — recordings](https://developers.cloudflare.com/stream/stream-live/replay-recordings/)
- [Cloudflare Stream — pricing](https://developers.cloudflare.com/stream/pricing/)
- [Existing podcast launch gates](PODCAST-PLATFORM-LAUNCH.md)
