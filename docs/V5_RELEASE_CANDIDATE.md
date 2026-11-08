# Living Mind V5 — consolidated candidate

Owner issues: #60 and #63. Work date: November 7, 2026 (America/New_York).
State: IMPLEMENTED candidate development; release NO-GO. No production cutover or new provider authorization.

## Consolidation from actual ancestry

R21 `53efc7cac6abdf83a44d6631285977202212b03b` already contains the exact current heads of #65, #66 and #69–#76. Main `27c01ca338c0b42b12e81e70a4ee925dee4e8b46` is an ancestor. The candidate preserves that chain and incorporates the separate heads below as merge parents, without replaying duplicate patches.

| PR | Separate head | Disposition |
| --- | --- | --- |
| #64 | `b2774f51215e3aad7758d76236467da7629cba55` | Three approved design/reference documents incorporated unchanged |
| #67 | `81cab62c13250a382a633a1d5c14bc021c393ea2` | Superseded first evidence model; ancestry retained, unused duplicate projector not shipped alongside newer source-qualified projectors |
| #68 | `37490b10179c66e22199ccad5b509d776ec2b482` | Early atlas already ported into R17–R21. Preserve newer integrated renderer, tests, eight approved roots and history instead of overwriting them with the ten-root initial implementation |

Earlier PRs remain available as review history. No main merge, force push, production deployment, obsolete #52 integration, or unrelated branch restacking is required to review this candidate.

## Product changes in this candidate

- All already-published portfolio entries have searchable, category-filtered cards and detailed V5 pages. No newly discovered repository inventory is published.
- Writing uses the existing public publication/revision statements, with no invented title, cover or purchase destination.
- Research separates independent prototypes from engineering explanations and unclaimed scientific findings.
- The public Knowledge reading room has three authored, source-linked engineering explanations, topic pages, related-topic links and backlinks. It has no private Knowledge connection.
- A separate full-site build includes the complete existing Three.js atlas at `/signal-field/`, plus `/writing/`, `/research/`, `/knowledge/` and topic routes. The earlier home-only build remains available for regression comparisons.
- The actual Worker renders the atlas/history for a bounded `asOf` date on each request, including without JavaScript. Responses use no-store, no static ETag, and same-origin GET form CSP. Invalid/future dates fall back with a visible message. Ordinary V4 builds do not gain this route.
- Native camera buttons offer orbit, zoom, focus and reset, with pan/touch retained. Context restoration recovers the optional renderer; semantic index and filters remain functional during loss. The homepage terrain also restores after context loss, and its teardown listener survives a BFCache round trip.
- Reviewed graph history supports explicit reinstatement of retired nodes and relations without altering historical dates. Duplicate, unknown, retired-parent and coercible-proof cases fail closed. The production milestone manifest remains empty: no fabricated structural history is seeded.
- The mobile header now shrinks correctly at intermediate phone widths after Chromium exposed 375px overflow.

## Build and verification

```sh
npm ci
npm run build
npm test
python3 -m unittest scripts/security/test_scan_git_history.py
python3 scripts/security/scan-git-history.py
V5_PUBLIC_SITE_CANDIDATE=1 npm run build
node scripts/verify-v5-site-candidate.mjs
```

Default builds keep V4. The protected production workflow does not select the full-site candidate flag. Do not change that until final acceptance and explicit cutover approval.

`verify.yml` preserves the existing default-build, security, D1/workerd and Chromium/WebKit preview gates. A candidate job additionally builds full V5 and tests its compiled routes and real local workerd with Chromium and WebKit at seven required dimensions. It uploads actual screenshots and reports. CI results belong to their exact head; consult the PR checks before accepting.

Local Chromium is installed from the official Chrome for Testing distribution after the Playwright mirrors returned invalid ZIP/HTTP responses. The constrained single-process option is local-only; hosted CI uses normal Chromium and WebKit. Emulation and software WebGL are not physical iPhone or hardware GPU acceptance.

## Verified production baseline and rollback

The read-only production probe observed version 1.3.0, commit `27c01ca338c0b42b12e81e70a4ee925dee4e8b46`, with the expected public routes and compatibility redirects. This observation does not attest any V5 deployment.

V4 source, original artwork, legacy deep routes and the protected manual deploy workflow are retained. Rebuild the baseline commit through the existing authorized workflow for recovery after a separately approved release. No database migration is introduced here.

## Remaining release gates

1. Hosted candidate CI passed at `dbd176e18f42dabb62d10f41e6d709fecd86b8e8` (run 42453609133): build, WebGL lifecycle, Chromium and WebKit across seven viewports and eleven routes. Private side-by-side QA of the approved 1199×1312 homepage target versus hosted output confirms the following gaps: portrait scale and atmospheric texture, Signal Field terrain/volumetric density, and card spacing. Mock source values in the approved visual are illustrative and must never be fabricated. Exact visual fidelity, physical iPhone/GPU acceptance, and all new-head checks remain release gates.
2. Four owner-approved public **portfolio-source publication** nodes and their typed documentation relationships are now literal, dated, provenance-pinned records in draft V5. The candidate reaches revision 8 after 2026-11-05 (eight existing roots plus four publication children). This is not a product launch, deployed feature, connected reporter or independent production sign-off. Independent review and substantive new component/feature evidence remain open; see `V5_PUBLIC_GRAPH_PROPOSALS.md`.
3. Source-qualified activity overlay now passes **synthetic full-browser acceptance** at `dbd176e18f42dabb62d10f41e6d709fecd86b8e8` (run 42453609133): Chromium and WebKit, seven viewports and eleven routes; synthetic editor/runner evidence appears on approved project roots and is removed after privacy revocation or provider failure. The source remains the existing V4 consent-filtered reader, with no extra browser poller. Real provider activation, production consent/revocation races and physical-device verification are still release gates. The atlas sidebar now presents this source state above the static public directory, following the approved inspector reference.
4. Complete Threads owner OAuth/encrypted token storage/refresh/revocation and actual account acceptance. The existing official-API read projection alone is insufficient. See `V5_THREADS_SOURCE_GATE.md`. No app permission is granted by this candidate.
5. Verify actual GitHub App installation/repository scope, reporter delivery, editor pairing and participating task authorization. Names in the portfolio do not prove connected reporters.
6. Finish V5 treatment for the working legacy Listening/GPT/Studio/Contact/source surfaces while preserving their actual controls, dated measurements and routes. They remain functional V4 pages in this build.
7. Verify genuine Facebook/Instagram/Threads destinations before adding them. No guessed handles are used.
8. Owner-control integration/credential expiry acceptance, real source privacy/revocation races, independent release audit, performance measurements and physical iPhone/GPU review remain required.
9. Only after all product/security/source/fidelity gates: present exact release commit, disclosure, deployment configuration, recovery procedure and request protected cutover authorization.

Continue on this one candidate branch; do not create another R-series stack or describe a draft build as the completed product.
