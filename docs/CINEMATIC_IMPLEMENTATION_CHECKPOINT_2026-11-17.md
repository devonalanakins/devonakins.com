# Cinematic implementation checkpoint — 2026-11-17

> Historical checkpoint. The design kit was subsequently supplied; see [approved kit implementation](CINEMATIC_DESIGN_KIT_IMPLEMENTATION_2026-11-17.md) for the current implementation and evidence.

Continuation of draft PR #126, starting at `4021a74d178062aa647b0e72fc5325398f963a91` on `design/computational-laboratory-2026-11-17`.

## Implemented

- Five independently navigable illustrated destination cards: Research, Systems, Projects, Portfolio, Fieldnotes. Added dedicated Systems and Portfolio views; retained legacy hashes and six-section behavior in other site variants.
- Original first-party SVG neural sculpture, glass vessel, metal plinth and luminous connections, layered over existing chamber art. Decorative architecture, not a neural measurement or scientific result. No WebGL or animation loop added.
- Separate nonclinical operations portfolio, public project maturity, and readable Fieldnotes on analytic geometry and public-source evidence.
- Native destination links, focus transfer, eight-section keyboard navigation, horizontally scrollable phone navigation with 44px targets, reduced motion, and all sections accessible without JavaScript.
- Existing GitHub, development presence, Spotify, Threads and approved social adapters retained. No synthetic activity or playback introduced. Candidate interface has no GPT analytics; historical routes/infrastructure are preserved.
- Corrected destination and signal clipping found in rendered desktop review.

## Verification

Observed local results follow. Screenshots are implementation evidence only; they are **not reference-match evidence**.

- `npm ci --cache /tmp/devon-npm-cache`: passed with repository lockfile, no dependency changes.
- `npm run build`: default production variant passed, including TypeScript and Worker packaging.
- `npm test` after default build: 81 test files passed on the final implementation.
- `LABORATORY_SITE_CANDIDATE=1 npm run build`: passed, including TypeScript and Worker packaging.
- `node scripts/verify-research-facility-candidate.mjs`: passed.
- `node --test tests/research-facility.test.mjs`: passed.
- `python3 tests/laboratory_browser_acceptance.py`: passed in Chromium and WebKit at 1440×900, 1024×768, 768×1024, 390×844, 375×667, 320×568, 1920×1080. Checks include eight views, five real destination links and focus transfer, 44px phone tabs, horizontal overflow, research controls, reduced motion, source adapter presence, no GPT interface, and no-JavaScript sections.
- Axe WCAG 2 A/AA and 2.1 AA: zero violations on home at 1440px and 390px in both engines. These are scoped automated audits, not full manual accessibility certification.
- Four implementation screenshots and four axe JSON reports: `docs/evidence/laboratory-2026-11-17/`. CI retains the expanded screenshot matrix.
- Full default build and 81-file suite rerun after candidate checks: passed. Full suite must follow the default build; several legacy tests intentionally expect that variant.
- `python3 scripts/security/scan-git-history.py`: 2,276 reachable text blobs scanned, 26 binary blobs skipped, zero selected-pattern matches. This is a targeted scan, not proof of absence of secrets.
- `python3 -m unittest scripts/security/test_scan_git_history.py`: four tests passed.
- `npm audit --omit=dev`: zero reported vulnerabilities.
- Full `npm audit`: existing picomatch ReDoS advisory GHSA-fc5q-39xc-vjpf (<=4.0.7), reported through four high-severity development dependency entries: picomatch, fdir, tinyglobby, vite. No dependency changes made; proposed automated fix would change the pinned Vite major. Requires a separately verified dependency remediation before release.

Browser verification uses installed Python Playwright 1.62.0, Chromium 151 and bundled WebKit. The repository CI pins Playwright 1.57.0 and remains an independent release check. Missing host libraries were downloaded and extracted into `/tmp`, with a temporary copied WebKit launcher configured to find them. No application or system package configuration changed. Host preflight was skipped only after providing libraries; actual browser launch/render/interaction checks still execute.

## Missing inputs and release boundaries

`CODEX_FULL_IMPLEMENTATION_PROMPT.md`, `references/approved-desktop.jpeg`, and `references/approved-mobile.png` were not present in the branch, workspace uploads, or PR discussion. Requested reattachment during the session. Exact composition, image comparison, fidelity iteration, and full attached-prompt compliance remain BLOCKED on those inputs. This checkpoint does not certify the approved design as implemented.

Preview is static Vite: provider/API fallback states are observed, not proof of authenticated live integration health. Existing backend policies and consent tests are preserved. Physical iPhone testing, full pinned CI, dependency remediation, exact reference comparison, and explicit owner release approval remain gates. No merge, deployment, provider change, clinical access, or production release performed.
