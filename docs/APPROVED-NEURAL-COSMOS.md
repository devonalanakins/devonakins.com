# Neural-cosmos owner-art integration (PR #106)

**Status: source implemented; awaiting final reviewed media in this branch. Not released.**

The original 1920×1080, 24fps, silent 3.5-second H.264 film and 1920×1080 WebP poster are kept separate from the decorative UI code and all public telemetry. The current generator retains its first-party procedural fallback. Never claim that the fallback satisfies creative acceptance.

## Exact approved inputs

Unpack the ready-to-commit `DevonAkins-Neural-Cosmos-Repo-Assets.zip` at the repository root. It contains exactly:

- `assets/approved/neural-cosmos-1920x1080.mp4` — SHA-256 `cee2ca738e0be5d7fb635a19433d8785c2f51930c0c39560958e23d73c8f5c4d`.
- `assets/approved/neural-cosmos-1920x1080.webp` — SHA-256 `b71490301500b59891613d19a954409c29f5420d8928c2ddac2f5c704db05054`.

The generator checks each digest, verifies poster dimensions, probes the video for codec/frame size/frame rate/audio absence and duration, then copies the film into `public/professional/living-atmosphere.mp4` and transcodes the optimized poster to `public/professional/living-atmosphere.png`. The Cloudflare build continues to package these same-origin assets; its existing MP4 range/HEAD implementation remains unchanged.

A missing pair retains the existing procedural fallback for ordinary technical CI. `REQUIRE_APPROVED_NEURAL_ART=1` fails closed when the artwork is absent. A single missing file or digest mismatch always fails, even without the strict flag.

## Final acceptance gates

1. Add the exact two binary assets to **this draft branch** and require the strict flag for the selected full-motion build. Do not switch the existing protected production release before this happens.
2. Execute baseline `npm run build && npm test`, one-screen candidate build, FFmpeg movie verification, protected Worker asset checks and Chromium/WebKit desktop/mobile/landscape screenshots on the exact commit.
3. Inspect actual on-page framing, contrast, reduced-motion and data-saver behavior, control accessibility and interaction with real provider empty/available states. Confirm that no UI is baked into the film and that the motion never masquerades as live activity.
4. Obtain explicit owner creative acceptance and the normal protected exact-main-SHA release approval. After deploying, verify live Worker SHA, video byte-range response, poster, source-qualified public feeds and mobile experience.

The provided media zip is a local build artifact, not a GitHub commit. No direct binary upload into the connected repository was available through the current tools. Do not mark this task **LIVE** or creatively **VERIFIED** until the binary files and visual checks exist in GitHub and production.
