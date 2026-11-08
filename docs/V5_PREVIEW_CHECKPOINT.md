# Living Mind V5 — preview-shell checkpoint

> **Portrait continuation (2026-11-07; supersedes crossed-arms-specific preview wording below):** The owner approved the Anevum/Transcosmic cinematic artwork for V5. This branch now includes the exact archived optimized desktop/mobile WebPs at `src/v5/assets/`, referenced only by the opt-in Vite development preview. The original V4 `/v2/crossed-arms.webp` and all production outputs remain untouched until protected release approval. These are owner-approved portrait *artworks*, not documentary photos. Desktop/mobile decode, viewport, accessibility, and production-asset exclusion are required for the updated PR head; the older CI run belongs only to the original preview commit.


Date: November 7, 2026. Scope: the first bounded implementation task in the owner-supplied execution prompt. This is R0 / the beginning of R1, not a completed redesign or a release candidate.

## Authority and baseline

- Repository / production: `devonalanakins/devonakins.com` / <https://devonakins.com>.
- Owning issues: [#60](https://github.com/devonalanakins/devonakins.com/issues/60), [#63](https://github.com/devonalanakins/devonakins.com/issues/63).
- Locked complete design, eight-image register and sequence: documentation-only [PR #64](https://github.com/devonalanakins/devonakins.com/pull/64), head `8bc7c17f1d2ae98feda7332c45242d32139c2ad3`. That branch is not merged into this implementation branch.
- Implementation base and independently observed production `/_health` commit: `27c01ca338c0b42b12e81e70a4ee925dee4e8b46`, version 1.3.0.
- The newly supplied master brief supersedes earlier ambient-only/no-overhaul restrictions. Actual portrait, V4 data boundaries, dated captures and protected release requirements remain in force.
- The attachment contact sheet SHA-256 is `3523f9fc0f5bdb66b82267e5f50a8a2b42a7634c4488d7870c3d5eaa5dcd8263`; master brief SHA-256 is `df4b30172d799b5b5700dda7dddc4eda3dae6fe02c5abc296f8076cc01d6d0d1`. The eight original image hashes remain in PR #64's manifest. Source renders are not copied into website assets.

## Existing application inventory

| Surface | Current source / route | Treatment in this slice |
| --- | --- | --- |
| Portrait home | `v2/index.html` → `src/portrait-home.mjs` → `scripts/pages.mjs` → `/` | Generator and public homepage unchanged |
| Work / project details | `src/content.mjs`, `src/immersive-routes.mjs`; `/work/`, `/work/...` | Reuse existing public copy and original identity assets |
| Deep pages | `/source/`, `/about/`, `/contact/`, `/studio/`, `/listening/`, `/gpt/` | Preserve existing pages |
| Hash navigation | `/#home`, `/#work`, `/#writing`, `/#research`, `/#contact`, `/#listening` | Preserve existing terminal navigation |
| Activity | `/api/activity/v4`; `src/live-signal-client.ts` | No changes and no second poller |
| Owner / source controls | Existing Access-protected owner and API routes | No changes; preview makes no API requests |
| Publication | `.github/workflows/deploy.yml`, exact-main manual production release | Unchanged; no merge or deploy in this task |
| Local preview | `src/v5/preview-plugin.mjs`; `/__v5_preview__/` | Explicitly enabled Vite development middleware only |

No AGENTS.md, CONTRIBUTING or SECURITY file exists in the inspected default-branch tree. The older AIEI guidance in draft PR #18 is not silently imported. Open #52 is the superseded singleton reporter; it is not integrated. #61/#62 are already in the implementation base. Older visual/telemetry draft branches are not merged.

## Implemented

- Isolated V5 tokens and responsive chrome, local system fonts, original crossed-arms portrait, existing vector identities, editorial hero, static decorative project composition, three-source ribbon and panel primitives.
- Seven navigable preview destinations: Home, Signal Field, Projects, Writing, Research, Knowledge and About. Research and Knowledge explicitly identify unimplemented indexes; these are shell demonstrations, not newly published article collections.
- Native mobile navigation works without JavaScript; Escape restores focus to its summary. Skip navigation, semantic headings, keyboard focus, 44px targets and reduced-motion treatment.
- No source statuses are guessed: every ribbon channel says it is not loaded by this preview. Static geometry encodes no runtime activity or verified dependencies. Project descriptions retain the existing portfolio's maturity qualifications and may require a fresh project-by-project content review before final publication.
- A strict `apply: "serve"` plugin plus an exact `V5_PREVIEW=1` opt-in. Default development requests return 404; production builds never include the preview HTML, CSS or client. `noindex`/`no-store` are additional headers, not the privacy boundary.
- A Node regression suite and Chromium/WebKit acceptance script integrated into the existing PR verification workflow.

Run a loopback-only preview:

```sh
npm ci
node scripts/pages.mjs
V5_PREVIEW=1 node node_modules/vite/bin/vite.js --host 127.0.0.1
```

Open the printed local address followed by `/__v5_preview__/`. The Vite preview command (`npm run preview`) serves built production files and intentionally does not expose this route. Do not add the preview to the sitemap, public Vite inputs or production Worker assets.

## Evidence and limits

Baseline: `npm run build` passed with 241 passing Node tests. The 67 production assets totaled 1,845,526 original bytes / 1,232,224 gzip bytes. Baseline screenshots were captured from the built site at 1440×900 and 390×844 for `/`, `/studio/`, `/gpt/` and `/work/`, with provider APIs blocked. These are local source baselines, not authenticated production screenshots.

After this change: build/typecheck and all 244 Node tests pass, including production Worker 404s for every preview path even with an environment flag. Building with `V5_PREVIEW=1` produces **identical SHA-256 hashes for all 67 existing production assets**, with unchanged original/compressed sizes. The targeted history scanner reports zero matches in 908 text blobs; its three regression tests pass. This scanner is not a comprehensive security certification.

Local Chromium acceptance covers seven routes across 1440×900, 1024×768, 768×900, 390×844, 375×667, 320×568 and 844×320, including both motion preferences at desktop and standard phone sizes, native no-JS navigation, keyboard/skip/Escape, automated axe WCAG checks, portrait decoding, no horizontal overflow, touch targets and first-viewport source ribbon at supported portrait heights. It checks zero API and external-provider requests. Local runtime uses official Chrome Headless Shell 143.0.7499.4 with single-process/no-zygote flags because the executor restricts Unix sockets; it does not prove physical iPhone, GPU or Safari behavior.

Pinned Playwright browser downloads returned unusable content locally. Full Chromium/WebKit verification is also wired into hosted PR CI; its exact-head result must be read before describing hosted acceptance as passed. The screenshot/report outputs are verification artifacts, not new production assets.

## Review / release decision

**Draft source review only.** No merge, deployment, D1 migration, Access change, new consent, secret or provider activation. No 3D atlas, persistent graph/history, live trace wiring, new public Knowledge content, complete secondary-page content, new social destinations or final design-fidelity claim is included. Facebook/Threads URLs still require verification; this slice preserves the known GitHub destination rather than inventing links.

Next coherent slice: refine the preview's homepage to the locked primary composition and finish shared route templates, then implement the server-authoritative semantic graph with approval/history/revocation tests before the true Three.js atlas and V4 trace mapping. Keep future changes in this gated preview until coordinated cutover acceptance passes. Never merge #52 as part of this work.

Rollback for this slice: close the draft branch or revert the preview-only files/config/workflow addition. The current production asset set has no preview dependency and requires no data rollback.
