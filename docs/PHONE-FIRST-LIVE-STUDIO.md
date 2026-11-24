# Devon Live — laptop-first stream, iPhone later

**Status — November 24, 2026:** The personal website is deployed with an honest OFF AIR state. The runtime Stream activation adapter is under review in PR #159; it defaults OFF and is not yet deployed. The personal Cloudflare Stream API returned 403 / Stream not enabled on November 24. No paid subscription, live input, ingest key, recording or actual public broadcast has been created or verified. Do not use any Nona Neuropsychology account or resource for this personal stream.

## Owner experience

1. **Record locally first:** OBS on the existing laptop with a display/window capture and the Sony headset selected as the actual microphone. Make a 60-second local recording, play it back, check voice, dropped frames, screen readability and private information. Turn off notifications and close healthcare, family, business or confidential windows.
2. **First public stream after approved setup:** OBS Studio over protected RTMPS to a personal Cloudflare Stream input, watched through devonakins.com/live/. Keep a public-safe scene and verify another device can hear it.
3. **Mobile later:** The iPhone with PRISM custom RTMPS can use a separately tested app route, but microphone routing and face-camera/screen composition must be tested on device. The visual scene pack is design source only; it is not yet installed in OBS or PRISM.
4. **Replay review:** Automatic recording is required for this provider's RTMPS-to-HLS/DASH website playback. A recording can exist even if no link appears in /watch/; an unlisted recording is not necessarily private. Review access, deletion/retention and guest/media rights before publication.
5. **Other channels:** Approved videos can later appear in /watch/, audio in /podcast/, and lessons in /courses/. No automatic editing, scheduling, membership access or replay publication is claimed.

## Website: what this candidate does

- Adds the real creator route `/live/` to the **existing Laboratory candidate** and links it from the personal homepage and creator navigation. Other site variants retain their existing route gates.
- Renders an accessible, responsive, cinematic page with an honest offline state **even without JavaScript**, no fake countdown, no viewer count, no implied recordings, and no camera permissions. Links from the offline theater and replay section go to the first-party Watch library, not a substitute platform.
- Polls `GET /api/creator/live` only while visible, about every 45 seconds. A publicly enabled stream must pass Cloudflare's documented `/<INPUT_ID>/lifecycle` check with `isInput:true`, `live:true`, and a valid `videoUID`.
- Exposes **only** the verified customer-specific Cloudflare Stream iframe URL. No RTMPS URL, ingest key, video recording ID, admin credential, or private account data is emitted. Error, malformed response, and missing authorization all yield a non-live state.
- Allows a customer-specific `frame-src` only on the live page *after* the publication configuration is explicitly approved. The baseline CSP and all private routes remain unchanged.
- Does **not** provide account signup, authenticated production controls, Stream resource provisioning, automatic course upload, payment, signed playback, replay publication, or recordings management. Those are separate reviewed increments.

The runtime publication gate in `src/professional/mobile-live.mjs` defaults to `publicEnabled:false`. It requires the explicit environment flag `CLOUDFLARE_STREAM_PUBLIC_ENABLED=1` plus a validated `CLOUDFLARE_STREAM_CUSTOMER_CODE`, `CLOUDFLARE_STREAM_INPUT_ID`, and a separate protected `CLOUDFLARE_STREAM_READ_TOKEN`. Missing or invalid settings fail closed. Never put read credentials, RTMPS ingest URLs or stream keys into source, browser responses, screenshots or public files. No source merge alone activates the channel.

## One-time activation — blocked until paid subscription and publication/access approval

1. Confirm Cloudflare Stream is available under the **personal** account and review the actual billing screen before activating. As documented in November 2026, storage capacity is prepaid in $5/month per 1,000 stored minutes, and video delivery costs $1 per 1,000 viewer-minutes. Usage must be monitored.
2. Approve the first broadcast's audience, recording privacy and retention **before creating an input**. For RTMPS video to play in the HLS/DASH iframe, use `recording.mode: automatic`. Cloudflare's `recording.mode: off` also disables HLS/DASH viewing; it cannot be used for a watchable website stream. A public player with unrestricted signed URLs may leave the generated recording accessible via its direct URL even if /watch/ does not list it. Configure and verify the allowed origins and decide recording deletion explicitly. This website does not yet issue signed viewer tokens.
3. Create a single personal-account live input only after approval; copy its genuine RTMPS server and key into **local OBS configuration**, never GitHub or chat. Retain the verified customer code and live input UID only for server configuration.
4. Configure OBS: Custom server RTMPS, output 1280×720 at 30 fps, H.264 video roughly 3,000 kbps CBR, AAC audio, 4-second keyframes, auto reconnect enabled. Check the Sony mic actually drives the audio meter and that combined bitrate stays in Cloudflare's supported 2–14 Mbps range. Do a local test before any broadcast.
5. Store the least-privilege Stream lifecycle read token as a **personal Worker secret**; set the customer code and input UID through protected Worker configuration. Keep `CLOUDFLARE_STREAM_PUBLIC_ENABLED` disabled until a real input and approved public access policy are in place.
6. The exact PR head must pass ordinary `verify` and the full Laboratory workerd/Chromium/WebKit checks, then receive release review. Only the existing protected manual `laboratory` release workflow may ship the reviewed main SHA; independently verify `/_health`, the routes, CSP, secrets preservation and real live/offline states afterward.
7. Once explicitly approved for public transmission, do a short public-safe OBS broadcast and independently check the viewer from another device, audio, valid lifecycle status, live-to-OFF AIR behavior and the recorded video's real visibility and deletion state. No automatic publication into /watch/.

**If paid activation or actual transmission approval is not available:** stop after local OBS proof and keep the public page in its honest OFF AIR state. Code changes alone cannot establish a working live stream.

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
