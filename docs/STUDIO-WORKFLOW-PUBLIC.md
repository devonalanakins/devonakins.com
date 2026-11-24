# Public studio journey — creator-site source contract

**Date:** 2026-11-23. **Status:** source candidate only; not a recording, subscription, deployment, or claim of live broadcasting.

This slice links existing `/live/`, `/watch/` and `/setup/` without creating a new primary route or replacing the established Laboratory architecture.

- `/setup/#studio` presents four evidence-qualified stages: phone capture (owner-confirmed kit), Mac production (workflow in design), broadcast (not on air), and media publication (review required).
- `/live/` links to the workflow. It keeps the provider-gated status logic and no-JavaScript OFF AIR baseline unchanged.
- The text intentionally does **not** expose private devices, household identities, guest names, garage address, local network topology, collaborator accounts, broadcast keys, Cloudflare account IDs, or future server specifications.
- Public `/watch/` recordings remain gated by rights, captions, playback testing and explicit publication approval. No replay is created automatically by this change.
- A future home server is a private infrastructure ambition, not a streaming dependency or a presently reachable service.

## Verification
- `npm test`, `LABORATORY_SITE_CANDIDATE=1 npm run build`, existing Worker security suite and Chromium/WebKit Laboratory browser acceptance on the exact PR head.
- Confirm mobile 390px, tablet 768px and desktop 1440px layouts, focus visibility, reduced motion and no overflow. Verify no player when offline, no secrets in output.
- No activation, family/account invitation, collaborator access, billing or production deploy is authorized by this change.

Keep this branch stacked after the current creator-site parent until the parent and downstream approvals are complete. See release control issue #148.
