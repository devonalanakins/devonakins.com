# Approved design kit implementation — 2026-11-17

This supersedes the missing-reference limitation in the earlier checkpoint. Work continues on draft PR #126 from `f1b8dd3`; production stays on its independently gated release path.

## Authoritative input and comparison

Read the complete `CODEX_FULL_IMPLEMENTATION_PROMPT.md` from the owner's design kit and inspected both supplied images:

- `approved-desktop.jpeg`, 1536 × 864, SHA-256 `a506f32ba1d8250075f421865f3e88d11eb68a4b6d4d9c8aff0a01c2a43e209f`.
- `approved-mobile.png`, 941 × 1672, SHA-256 `5c4ce2962e03e0374618b6dde7530e6063a9122ee69ccda1819345700d2afe9d`.

References and comparison sheets remain outside the repository in `/workspace/devon-design-kit`. They are not deployed as backgrounds, copied into public assets, or committed in the screenshot evidence.

Implemented the reference's six-label desktop header, orbital mark, personal name and editorial headline, two CTA hierarchy, chamber, four-card signals strip, five illustrated destinations in order, and social/status footer. Phones use a compact modal-menu header, reframed chamber, 2 × 2 signals, five stacked full-width destinations, and normal document scrolling. The earlier nested fixed-viewport contract is overridden only for this candidate.

Original generated artwork replaces the simple SVG chamber presentation. The apparatus is decorative architecture; no visual implies a measured brain, clinical result or running scientific instrument. Text, menus, source values and cards remain independent semantic DOM. Asset provenance is in `public/professional/cinematic/PROVENANCE.md`.

### Visual iteration

Actual Chromium and WebKit screenshots were inspected and compared side by side to both references. Corrections include removing inherited fixed stage heights that made the phone footer overlap cards; reducing mobile scene/spacing; moving signals above destinations; aligning desktop signal, card and footer breaks; reserving arrow space and normalizing title baselines; removing emoji-style CTA arrows; removing inherited social-button boxes; and moving Contact/Activity/motion access into the menu rather than adding a seventh top-level label.

At 1536 × 864 the intended desktop landmarks are header ~60, signals ~498, destination cards ~600 and footer ~786 CSS pixels. Actual measurements are stored alongside screenshots. Asserted tolerances cover the header and major section breaks, not photographic equality.

Known visual differences: original architecture and neural sculpture differ in exact geometry, light placement and scale; reference HUD equations/telemetry and branded wall text are omitted rather than falsely presented as scientific monitoring. Real disconnected source states replace illustrative live values/equalizers. Phone controls remain at least 44px for primary actions; readable descriptions and source states make the mobile document longer than a width-normalized raster reference. These are disclosed differences, not a claim of pixel-perfect reproduction.

## Functional content and integrity

- Research: deterministic parameter-controlled Lissajous illustration, assumptions and source citations, separate proposed neuroscience/compute studies.
- Systems: architecture diagram of approved sources → consent projection → Worker/browser, documented engineering practice and honest maturity.
- Projects: searchable/filterable catalog generated from the existing publication manifest, with category, status and approved public overview links. No private repository discovery.
- Portfolio: public website, DevonStation/Knowledge overview, Merit, and nonclinical Nona operations. No clinical/client source material.
- Fieldnotes: readable analytic-model and public-signal notes plus original-writing status and existing writing link.
- Contact and full Activity: available in the modal menu (desktop DA / 001 and phone hamburger), with existing protected-information warning and approved social destinations.
- Editor compact card requires a fresh authorized editor heartbeat. Music, GitHub history and owner declarations cannot make that card active. Legacy variants retain their separately qualified owner-defined signals.
- Signals use existing public adapters; native disclosures expose source, status and provenance. No autoplay, external font, tracking integration, fake activity, invented track or decorative equalizer.

## Reversible legacy analytics retirement plan

Winning candidate Home, navigation, signal cards, Activity, footer and destination content contain no GPT analytics. Historical data and the legacy `/gpt/` route remain intact in this draft. No production redirects or deletions have been made.

Before approved public cutover:

1. Record the current release commit, Worker version and source snapshot inventory privately; retain the existing rollback path. Inventory `/api/activity/v4` analytics projections and public snapshot assets as well as the HTML route; removing a visible card alone does not retire those legacy public data surfaces.
2. Prepare a candidate-only, separately reviewed `/gpt/` retirement response (prefer a 308 to a source-honest `/activity/` or an explanatory retired-page response, based on owner decision). Do not reinterpret old data as current analytics.
3. Remove the legacy analytics route from the candidate sitemap/navigation and update canonical/SEO metadata in the same change; retain old source records outside the new public UI.
4. Test root and deep-link behavior, redirect loops, query strings, cache headers, canonical URLs, unknown-route 404s, absence of analytics links, and baseline V4 restoration. Exercise the actual packaged Worker.
5. Require exact-head CI, owner release approval and independent live endpoint checks before publishing. Roll back by rebuilding the prior approved variant/commit if acceptance fails.

This implementation intentionally does not change `scripts/pages.mjs`, Worker routing, API authorization, publication policy, deployment workflow or secrets. Current candidate verifier asserts legacy deep links still return 200, while the new interface remains analytics-free. The eventual retirement response is a pending release migration, not hidden behavior in this design change.

## Verification and limitations

Final commands/results and retained screenshots are recorded after the final run below. Static Vite source failures are observed preview states; they do not establish live provider health. No merge, deployment, DNS/provider/account change, clinical access or production release is authorized or performed.

### Final local results

- `npm ci --cache /tmp/devon-npm-cache`: passed against the existing lockfile; no dependency or infrastructure replacement.
- `npm run check`: passed.
- `npm run build`: default production variant passed, including TypeScript and packaged Worker.
- `npm test` after default build: all 81 test files passed, zero failures.
- `LABORATORY_SITE_CANDIDATE=1 npm run build`: passed, including TypeScript and candidate Worker packaging.
- `node --test tests/research-facility.test.mjs`: passed.
- `node scripts/verify-research-facility-candidate.mjs`: passed (candidate UI, deep links, metadata/content type, 404, no analytics UI, isolated flag).
- CI-pinned Python Playwright **1.57.0**, actual Chromium and WebKit: passed at 320×568, 375×667, 390×844, 393×852, 428×926, 768×1024, 1024×768, 1440×900, 1536×864 and 1920×1080.
- Browser checks: eight views, five destination links/focus transfer, source details, project search/empty state, mathematical parameter changes, menu dismissal/Escape/return focus, reduced motion, document scrolling, no horizontal overflow, no page errors, no-JavaScript sections, and image-loading failure fallback.
- Synthetic test-only source fixtures: owner declaration + Spotify playback does not establish editor activity; fresh editor heartbeat does; stale editor heartbeat does not. Fixtures are excluded from published screenshots.
- Axe WCAG 2 A/AA, 2.1 AA and applicable 2.2 AA checks: **32 reports, zero violations**, across all eight views at 390px/1536px in both engines. This is scoped automated verification, not physical-device or full manual accessibility certification.
- Final measured desktop landmarks in both engines: header 62px; signals y=502.3px; five destinations y=600.3px; footer y=786.3px. Reference landmarks ~60/498/600/786. This does not measure photographic equality.
- `python3 -m unittest scripts/security/test_scan_git_history.py`: four tests passed. Targeted reachable-history credential scan: zero selected-pattern matches; binary content is not covered. Rerun after committing.
- `npm audit --omit=dev`: zero reported vulnerabilities. Full audit retains the pre-existing picomatch ReDoS advisory GHSA-fc5q-39xc-vjpf, reported through four high-severity **development** dependency entries (picomatch/fdir/tinyglobby/vite). Registry latest was observed as 4.0.7; automated advice changes the pinned Vite major to 6.2.7. No unverified toolchain change was made. Remediation remains a release limitation.

Screenshots, 20 landmark reports and 32 axe reports: `docs/evidence/cinematic-design-kit-2026-11-17/`. The full screenshot matrix and destination screenshots are generated by the existing candidate CI artifact workflow. Comparison sheets containing the supplied references remain local, outside the public repository.

Local host libraries for the pinned WebKit build were extracted to `/tmp` and its temporary launcher was configured to locate them. Only host dependency preflight was bypassed after providing libraries; all actual browsers, renders, screenshots and assertions ran. CI remains on its existing supported Ubuntu image and browser installation workflow.

### Current source observations and release gates

Static preview screenshots show real GitHub browser-fallback history where available (WebKit), otherwise explicit source unavailable; no verified editor session, unavailable Spotify playback, and unavailable/unshared Threads posts. This is not a claim that production integrations are disconnected. Existing consent/expiry/privacy behavior is preserved and tested; no provider credentials or policy were changed.

Exact-head remote CI and physical iPhone review remain independent acceptance gates. Original art geometry and accessible mobile density differ from the raster concept as disclosed above. Legacy analytics retirement is prepared as a plan, not a production migration. No merge, deploy or production change performed.
