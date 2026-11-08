# The Living Mind V5 — R17 expanded 3D atlas integration

**Status:** draft/source implementation only. Owner issues #60/#63. This release is stacked on draft R16 PR #71, R15 PR #70, R14 PR #69, and locked screenshot PR #66. No merge or production deployment has been authorized or performed by this branch.

## Purpose and reconciliation

The earlier experimental Three.js catalog in [PR #68](https://github.com/devonalanakins/devonakins.com/pull/68) was implemented on an older V5 preview and independently modeled ten source-eligible project identities. The owner-approved exact homepage screenshot and R14's terrain have **eight primary structural anchors**. R15 and R16 established a separate, explicit eight-root **reviewed public history**.

R17 reuses PR #68's core progressive enhancement pattern—real Three.js, deterministic geometry, orbit/zoom, picking, native `<details>` inspector, WebGL/no-JS fallback, event-driven rendering and resource disposal—but **does not merge the divergent old shell, duplicate evidence model or ten-item scene** into the locked homepage.

The expanded Signal Field route instead derives both accessible HTML and optional WebGL content from the **same** versioned `replayPublicGraphHistory` result. Time travel uses the server's UTC `asOf` selection. A first-party spatial projection fixes all eight approved root coordinates while deriving child positions deterministically only from source-reviewed graph records. The browser refuses to initialize WebGL if the selected graph revision, version or node count disagrees with the server-rendered semantic index.

The approved homepage markup and visual composition are **not changed** in this slice. R14's distinct source-qualified homepage terrain remains in place. The expanded page is still gated at `/__v5_preview__/field/` under `V5_PREVIEW=1`, noindex/no-store; V4 Worker and production assets remain unmodified.

## Visual meaning (not a mock live feed)

- Central nucleus and faint spokes: **membership in the already approved public catalog**. The nuclei/positions are authored visual structure, not system dependency or activity telemetry.
- Solid member-to-child lines: source-reviewed **published child membership** only.
- Bright typed relation lines: explicitly reviewed public relationship records of the selected historical revision.
- Project/section sculptures: approved public identities. Geometry/color vary for editorial distinction, **never to imply health, metrics, deployment, connection, or current work**.
- Retired reviewed structures: retained in dated history with visually subdued status. Unreviewed structures are entirely absent.
- Native HTML list with links and details is the complete keyboard, screen-reader, touch and no-JS alternative. WebGL is decorative/selectable navigation. Context loss and no GPU fail to semantic HTML; the renderer never polls providers.

**Today the reviewed history manifest is intentionally empty.** The interactive atlas displays eight approved public roots and zero new features, integration assertions, temporal milestones or dependencies. Source-specific public Graph metadata still requires individual human approval and evidence review before publication.

## Security and architecture gates

No new Cloudflare, D1, OAuth, credentials, cookies, third-party libraries, user tracking, fetches, live source subscriptions, hidden GPU loops, background agents, or access grants. Three.js was already installed. The importer is route-gated and lazy. The optional WebGL scene is disposed on pagehide or context loss. Current public activity V4 is deliberately **not** imported into the persistent structural graph.

Public Knowledge is a curated **section**, not a source of private DevonStation Knowledge records. No private project or client-family-health data appears in the layout or index. GitHub PR/commit existence cannot automatically authorize a new public structural record.

## Acceptance matrix

1. **Source/model:** `npm run build` and `npm test`; graph revision parity; no invented edges; deterministic stable coordinates; retirement; future-date replay; malicious unreviewed input fails closed.
2. **UI:** existing Chromium/WebKit responsive/axe matrix for 1440×900, 1199×1312, 1280×800, 1024×768, 768×900, 390×844, 375×667, 320×568 and landscape phone; native details, no-JS date submission, keyboard focus, no overflow, no provider calls, no-JS fallback.
3. **Visual:** actual browser captures `*atlas*` for desktop and mobile, with WebGL fallback when unsupported. These must be inspected against the approved secondary Signal Field reference, not claimed pixel-perfect solely on CI success.
4. **Release:** preserve existing V4 default build and full rollback, review screenshot fidelity and real provider consent independently, verify device performance on representative hardware, and deploy only via protected exact-SHA release and live endpoint confirmation.

## Still incomplete

Full-size semantic child layout with separately approved real structures, source-backed current editor/task overlays in the expanded atlas, automated qualifying structural milestone workflow, filters/typed system layers, full historical playback UI and mobile GPU performance acceptance remain separate reviewed development work. The approved eight-root homepage screenshot is still the authority for the home layout. The original PR #68 can remain as historical engineering evidence; **do not merge its divergent shell** onto PR #66.
