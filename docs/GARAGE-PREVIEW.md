# Garage experience — first review increment

The intended direction is a studio-centered personal website, with conventional pages retained. This increment is an imagined room, not a digital twin of any physical property. The existing integrated creator candidate is the parent; the separate Cal Rook identity experiment remains untouched.

## Build and review
- Standard build: `npm ci && npm run build && npm test` — /garage/ must not be packaged.
- Preview: `LABORATORY_SITE_CANDIDATE=1 GARAGE_SITE_CANDIDATE=1 npm run build`, then `LABORATORY_SITE_CANDIDATE=1 GARAGE_SITE_CANDIDATE=1 node --test tests/garage-preview.test.mjs`.
- Run `npm run preview` and navigate to /garage/. Preview is intentionally noindex and not in the sitemap; noindex is not access control.
- Check 320px, phone Safari and desktop Chromium, keyboard focus/menu, all six named views, optional drag orbit, WebGL failure, repeated enable/disable, and links back to the existing pages. No automatic animation or media access. Verify the packaged Worker does not serve the route in ordinary builds.

## Boundaries and follow-through
- Source preview only, no production homepage replacement or deployment. The existing release gate #148 remains operative.
- No actual room measurements/photos, real live signal, viewer accounts, achievements, chat, payments or cameras. Status is explicitly no camera connected. No private address, family, or clinical data.
- Before a homepage integration, review this preview visually, settle identity with the separate design candidate, verify exact-head tests, then replace only the public landing composition behind an explicit candidate flag.
- Broadcast comes from the existing approved Live route; a real broadcast requires a separate end-to-end test and owner publication approval. Visitor login, moderated chat, achievements, selectable consenting broadcast perspectives and VR are later separately gated increments.
