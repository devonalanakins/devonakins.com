# Neural-cosmos art — source, verification and release (PR #106)

**Status as of 2026-11-11:** Original motion source and poster are **committed in draft PR #106**; technical verification is in progress. **Not merged, not deployed, and not creatively accepted yet.**

The Living Console keeps its real GitHub/Spotify/work/GPT UI and source contracts in DOM/JavaScript. The silent neural-cosmos film is decorative. Never use motion to imply work status, live activity, or account usage.

## Source assets

These assets are part of the repository, not external URLs or simulated data:

- `assets/approved/neural-cosmos-1920x1080.mp4` — H.264, 1920 × 1080, 24 fps, 3.5 s, silent, 337,081 bytes. SHA-256: `cee2ca738e0be5d7fb635a19433d8785c2f51930c0c39560958e23d73c8f5c4d`. Git blob: `6ba3357b08941bbdeeb71272f4468ea124131307`.
- `assets/approved/neural-cosmos-1920x1080.webp` — 1920 × 1080, 319,620 bytes. SHA-256: `b71490301500b59891613d19a954409c29f5420d8928c2ddac2f5c704db05054`. Git blob: `f4e672f3c75b14f5fed266bb9613877f1d0ca66a`.

Both are integrated in commit `34292b78c5e84a2eee0c303729774116726d42b7`; GitHub's recursive tree was checked at later branch head and showed the two expected sizes and blob SHAs.

The selected one-screen build verifies both SHA-256 digests, checks 1920×1080 poster dimensions, validates video codec, frame size, frame rate, absence of audio, and duration when ffprobe is present, then packages a local `/professional/living-atmosphere.mp4` and PNG poster. The existing Cloudflare Worker MP4 range/HEAD handling is preserved.

### Strict release behavior

- `REQUIRE_APPROVED_NEURAL_ART=1` **fails closed** if either original asset is missing or if ffprobe is unavailable. Any digest mismatch or incomplete pair fails even without that flag.
- `.github/workflows/prestige-profile-review.yml` enables strict verification for the HD motion job with FFmpeg installed. Chromium/WebKit candidate review uses the same committed assets without requiring ffprobe inside its browser image.
- `.github/workflows/deploy.yml` enables strict verification only for a separately approved `release_variant=one-screen`. Baseline V4, V5 and professional variants remain isolated.
- Source-level tests assert the two real digests, strict negative case in an isolated empty directory, and both workflow gates.

The procedural generator remains a fail-safe when the new art is absent in an ordinary exploratory build, **not** an acceptable substitute for approved site release.

## Evidence and remaining gates

**Local media evidence:** source ZIP SHA-256 hashes and exact Git blobs verified; ffprobe reported H.264, 1920×1080, 24 fps, 3.5 s and only one video stream.

**Local visual evidence:** an offline render of the existing compiled candidate with the original film and later compact-header CSS checked Chromium at 1440×900, 390×844, 320×640 and 844×390. The film decoded and played in all four; the document had no horizontal or vertical overflow. This was a local static/inlined-asset rendering, **not** a full networked application/API acceptance and not an exact-head GitHub build. The mobile header collision was fixed and a dedicated browser assertion was added to the source.

**Pending:** exact-head CI success on the final SHA (baseline, strict motion, real browser assets and responsive screenshots); human creative acceptance; non-expert usability check; protected production release approval; post-release HTTP, source-feed and phone verification. No changes to production Cloudflare secrets, bindings, consent or reporter identity are authorized by this PR.

Keep [PR #106](https://github.com/devonalanakins/devonakins.com/pull/106) draft/unmerged until all appropriate gates pass. Green CI alone does not authorize production cutover.
