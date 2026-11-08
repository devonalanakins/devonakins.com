# Living Mind V5 R21 — Reference-scaled Signal Field

**Status:** Implemented in a draft branch, not merged or deployed. Parent is volumetric Signal Field R20 PR #75. Approved visual reference: `02-signal-field-primary.png` retained in the canonical V5 design archive; owner approval of that reference does not imply a green current CI run.

## User-visible change

The standalone gated V5 Signal Field route becomes a wider, first-viewport three-panel environment at desktop widths. The left public-systems explorer and right contextual inspector frame a proportionally larger center Three.js atlas. This responds to an observed R20 layout gap: the earlier main field was a relatively small centered panel underneath a large introductory heading, while the approved visual reference dedicates most of the screen to the spatial system explorer.

The change is page-local. `renderV5Preview("field")` adds `v5-page-field` to `<body>`; no other page receives it. The existing heading remains in the document for screen readers and is visually concealed only on that field route. The preview notice, opt-in route protection, source boundaries, project identities, date replay, evidence disclaimers, interactive controls and keyboard fallback are not removed.

At screen widths greater than 1100 px, the field uses 15.5% explorer, flexible center and 23% inspector, with a center height tied to the actual visual viewport. The field no longer inherits the site's narrow 1120px/1450px width caps. At tablet widths it retains the prior stacked responsive presentation; mobile keeps the camera-first visual ordering and safe horizontal overflow.

## Verification required

- R20 camera framing and exact-head browser acceptance, including all eight approved visible public labels. R21 is stacked and does not override a failing R20 gate.
- R21 build/TypeScript, Node tests, Git history scan, local isolated Worker/D1, Chromium/WebKit response + axe checks, responsive screenshots at 1440×900, 1024×768 and 390×844, reduced-motion and no-JS.
- Desktop browser assertions: width at least 94% of viewport, uninterrupted three-panel alignment, center width greater than 49% of the atlas frame and center height at least 620px.
- Native semantic `h1` exists on Signal Field even when visually concealed; all other preview routes and screenshot-locked home retain their prior body markup.
- Independently inspect screenshots against the approved visual reference before labeling this visually accepted.

## Out of scope

No new source provider, sync, runtime activity, invented telemetry, private Knowledge pages, historical milestones, project relationships, application deployment, V4 route changes, public disclosure, secret permission or asset replacement. This is a reversible layout fidelity increment. The approved reference still has richer visuals and independently evidenced structure not present in R21.

**Release remains no-go** until parent and exact-head acceptance and owner screenshot review are complete.
