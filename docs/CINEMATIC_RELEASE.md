# Cinematic portfolio release

## Scope and authority

Continue existing PR [#126](https://github.com/devonalanakins/devonakins.com/pull/126) and the existing `devonakins-personal` Worker. The owner's latest instruction, “Continue to develop and implement through to completion and make live,” authorizes this website release. It supersedes the earlier draft-only checkpoint. No clinical system, private repository publication, provider consent change, DNS change, new service or database migration is part of the release.

The original desktop and phone reference images were compared in the preceding design implementation. Their independently rendered artwork, hierarchy and mobile adaptations remain. This continuation completes native routes, meaningful public case studies, reversible analytics retirement, full WCAG A/AA test coverage and the guarded production workflow. Original art geometry and readable phone density differ from the supplied concepts; photographic or pixel identity is not claimed. Physical iPhone testing has not been performed.

## Public behavior

`/research/`, `/systems/`, `/projects/`, `/portfolio/`, `/fieldnotes/`, `/activity/`, `/contact/` and `/listening/` render their selected content on direct entry. Each has its own title and canonical URL. The five destinations support normal clicks, modified clicks, reloads and browser history. Case studies under `/work/<approved slug>/` use only the existing explicit publication manifest: context, implementation stage, role, evidence boundaries and next steps. Unapproved project objects are rejected at render time.

Legacy `/work/`, `/writing/`, `/experience/`, `/about/`, `/source/` and `/studio/` redirect to their corresponding new destinations. Query strings survive. `/gpt/` redirects to Activity; legacy GPT snapshot URLs and the public V2 homepage/snapshot return 404. The cinematic public activity/telemetry projections omit GPT fields. The sitemap and public interface omit GPT analytics. These changes are compiled only into the cinematic variant; original source records, earlier variants, protected owner APIs and their V2 controller/style assets remain available for restoration and owner operation. Redirects are no-store to preserve reversibility.

GitHub, editor presence, Spotify and Threads reuse the existing adapters and owner settings. Source absence, hidden playback and stale editor reports remain explicit states. The release neither fabricates activity nor enables a feed. Editor activity requires a fresh authorized editor heartbeat. The dedicated private database, credentials, Access rules, provider identities and publication boundaries are preserved by the existing private-deployment preflight.

## Verification before release

Run the default build and full repository suite, then the cinematic build and compiled Worker verifier:

```sh
npm run build
npm test
LABORATORY_SITE_CANDIDATE=1 npm run build
node scripts/verify-research-facility-candidate.mjs
LABORATORY_RUNTIME_BROWSER_CHECK=1 node scripts/verify-laboratory-runtime.mjs
python3 -m unittest scripts/security/test_scan_git_history.py
python3 scripts/security/scan-git-history.py
npm audit --omit=dev
```

Browser package: Python Playwright 1.57.0, Chromium and WebKit. The matrix covers ten viewports (320–1920px), all eight sections, five destinations, search/filter, analytic model, modal/focus/Escape, motion preference changes, reduced motion, image failure and no-JavaScript fallbacks. The focused pass covers real direct routes, an approved case study, native new tabs, Back/Forward, scroll restoration, cover-request referrer privacy and consent revocation. Synthetic fixtures exist only inside isolated test contexts and are never included in public screenshots.

The runtime harness serves the **packaged Worker** using isolated local workerd, no remote bindings, over HTTPS. The self-signed certificate exception is restricted to `https://127.0.0.1:<port>` test transport/contexts; public live verification uses normal TLS validation. CSP remains strict: no unsafe-eval, inline-script allowance or browser bypass. Polling and Axe injection use the browser debugging API. This verifies actual Worker routing and CSP, rather than relying exclusively on Vite.

Both PR candidate CI and the production workflow repeat these browser checks. Production first rebuilds/tests the default variant, then builds the exclusive cinematic variant, and verifies it on exact main before deployment. After deployment it verifies the exact public health commit, all routes/cases/art, security headers, source contracts, owner denials, analytics retirement, www redirect, and both browser engines on the live HTTPS origin. Artifacts retain the full screenshot and accessibility matrix.

Security limitation: production dependency audit reports no vulnerabilities. The existing development-only picomatch ReDoS advisory GHSA-fc5q-39xc-vjpf propagates through four tooling entries. Its advisory currently lists no patched version. No speculative override or unrelated Vite downgrade was introduced. The targeted history scanner covers selected text credential patterns, not every secret format or binary content.

### Observed local results, 2026-11-17

- Default production build and TypeScript: passed; full repository suite: **82 test files passed, zero failures**.
- Cinematic build, packaged Worker verifier, route/publication and release-guard tests: passed.
- Actual isolated HTTPS workerd with both pinned browser engines: passed the ten-size rendering matrix and focused navigation/privacy checks. **32 Axe reports are empty**, now including WCAG 2.1 A and 2.2 A as well as A/AA tags. The expanded audit caught visible-label/accessibility-name mismatches that were corrected before this run.
- Desktop screenshots and the 390px phone screenshots were inspected. Composition landmarks remain header 62px, signals 502.3px, destinations 600.3px and footer 786.3px at 1536×864. Evidence in `docs/evidence/cinematic-design-kit-2026-11-17/` was refreshed from the actual Worker rather than Vite. Navigation/privacy results are in `docs/evidence/cinematic-navigation-2026-11-17/`.
- Approved GitHub source visibility: **five links verified public** with authenticated read-only API checks.
- Production dependency audit: zero reported vulnerabilities. Targeted history-scanner self-tests: four passed; reachable text scan: zero selected-pattern matches. Final history scan is repeated after committing.
- Existing deployment CLI 4.151.3 dry-run packaging passed without remote upload or configuration changes. Local workerd uses 4.158.0, matching existing CI and supporting the unchanged compatibility date; production deployment CLI remains unchanged.

Exact-head GitHub CI, main merge SHA and actual deployment observations belong in the existing PR's final release evidence; local success alone does not establish them.

## Release procedure and rollback

Use the existing protected manual workflow on **main**, with its exact 40-character SHA, `release_variant=laboratory`, `laboratory_confirmation=LABORATORY-CUTOVER-APPROVED`, and both source-policy actions `preserve`. All older build flags and confirmations must be off/empty. The guard rejects mixed variants, mismatched SHAs, other Workers and implicit consent changes. The workflow's existing dedicated Cloudflare credentials and `--keep-vars` preserve secret bindings; the preflight reads configuration from the actively serving version, validates the existing private schema and performs no database migration.

Pre-release observed Worker version: `7c9cfb22-ca04-41b5-a250-7026da6c3b78`, serving 100% of `devonakins-personal`; deployment `72b61989-d381-44ad-9649-a9ec292e7b40`. Public health reported version 1.3.0 and main commit `6f4b71f7c89f61d537b44bbd2efbd2d19f0f6049`. These identifiers are rollback metadata, not credentials.

If independent verification finds a release regression, restore that prior existing Worker version to 100% using the personal Worker's normal version rollback/deployment mechanism, then verify public health and owner/source boundaries again. No database rollback is required because the website release changes no schema or stored provider data. Do not deploy to the Nona account or change its resources.

Status at preparation: implemented and locally verified; merge/deployment results must be recorded in PR #126 after actual observation. Do not interpret this document's procedure as proof of a live release.
