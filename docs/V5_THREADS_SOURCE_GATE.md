# Living Mind V5 — Threads Feed Source & Authorization Gate

Status: **V5 website LIVE (November 9, 2026); the private Threads verifier is deployed, official Meta account NOT CONNECTED.** Private OAuth and manual renewal sources are merged but NOT deployed; the D1-backed public reader is a separate source candidate. No Threads posts are authorized for public display.
Owner: DevonAkins.com / canonical repository and protected release workflow. No new repository or social publisher.

## Implemented source contract

The Cloudflare Worker has a read-only projection of an **authorized owner's own posts** from Meta's official Threads API. It uses `threads_basic` with `GET https://graph.threads.net/v1.0/me/threads`, requesting only `id,text,username,media_type,permalink,timestamp`, limit five. It publishes at most three sanitized text excerpts with original Threads permalinks and actual posting timestamps.

The original V4 public aggregate (`/api/activity/v4`) carries an optional `threads` field, so V5 reuses the existing 30-second public reader. A five-minute in-memory per-Worker cache avoids querying Meta on every site poll; no extra browser poller or client-side Meta token is created. Each post remains dated by publication, not by the dashboard refresh. No likes, replies, reposts, impressions or invented engagement figures are published.

Before any Meta request, **all** of these server-side settings must be present and explicitly enabled:

- `PRESENCE_ENABLED=true` and `PRESENCE_PUBLIC_RELEASE_APPROVED=true` (existing global controls)
- An authorized public presence row (`presence_state.public_enabled=1`, `private_work=0`), with revision rechecked by the existing aggregate after the read
- `THREADS_PUBLIC_RELEASE_APPROVED=true`
- `THREADS_PUBLIC_FEED_ENABLED=true`
- A current, owner-authorized long-lived Threads credential encrypted in the dedicated private D1, together with the verified owner username. A legacy Worker secret is deliberately **not** a fallback for the public reader, so local disconnect wins over previously provisioned credentials.

The source checks username consistency, Threads-only HTTPS permalinks, media types, timestamps, limits, and duplicates. Text is rendered through DOM `textContent`, not as provider HTML. A failure, expired source, private mode, Stop All/revocation or missing account authorization leaves the panel in **CONNECTION PENDING** with no posts. Provider errors never block Spotify, work, GitHub, or GPT panels.

## Private owner verification (deployed, connection pending)

The original owner-only read-only verifier can test a preexisting Worker secret, but the reviewed OAuth path should instead be used to store an encrypted D1 token. Legacy compatibility bindings, if present, must not authorize public posts after a D1 disconnect:

- `THREADS_USER_ACCESS_TOKEN`: **secret** (never in source, GitHub Actions logs, page fields or chat)
- `THREADS_PUBLIC_USERNAME`: private Worker variable with exact account handle
- `THREADS_PUBLIC_RELEASE_APPROVED=false` and `THREADS_PUBLIC_FEED_ENABLED=false` during connection verification

The Cloudflare Access-protected **/owner/presence/** page now has a proposed “Test Threads connection privately” button. An explicit same-origin POST triggers one read-only call to Meta's authenticated `GET /v1.0/me?fields=id,username`, compares its returned username to the configured account, and returns only a fixed connection state and timestamp. It does not retrieve or publish posts, grant permissions, store new credentials, enable broadcasting or expose Meta's profile payload. Failed/mismatched/expired credentials remain disconnected.

The protected deployment preflight is extended in this source candidate to retain the already deployed Threads **secret binding opaquely**, validate the handle, and preserve explicitly configured independent public release flags. If the flags are missing they default to `false`. It still rejects any other unknown secret/variable and checks the same dedicated D1 database and encryption key. **Never bypass these checks to turn on Threads.**

The owner must independently authorize the exact Meta app/account and decide whether publicly displaying their Threads posts is approved. The separate OAuth and renewal source is implemented but remains undeployed and without real-provider acceptance.

## Owner OAuth source merged, not deployed

This source candidate extends the existing Cloudflare Access-protected owner Presence page with an explicit **Connect Threads privately** action. The owner must first create or verify their own Meta app with the **Threads API use case** and add the exact HTTPS redirect URI:
`https://devonakins.com/api/threads/auth/callback`.

The Threads-specific app ID (not the main Meta app ID) must be configured as a Worker plain variable `THREADS_APP_ID`; `THREADS_APP_SECRET` must be configured as a **Worker secret**. No key or token is entered in the browser, chat, GitHub, or application source. The existing protected deployment preflight is expanded to retain *only* these reviewed optional bindings while preserving all current database and publication gates.

Before owner use, independently review and apply `migrations/0011_threads_private_oauth.sql` to the existing **private** `devonakins-listening-private` database after backup and approval. The ordinary Worker deployment does not execute D1 migrations. Missing migration, encryption key or app credentials leaves connection disabled.

Upon the owner's explicit click, a five-minute, single-use random OAuth state and HTTP-only secure SameSite=Lax nonce cookie protect the read-only `threads_basic` authorization window. The Meta authorization code is exchanged solely on the Worker for a short-lived token, then a long-lived token through Meta's official endpoint. The authenticated provider profile must match the exchange's numeric user ID, and any preconfigured owner handle. Only the AES-GCM-encrypted long-lived token, validated handle and expiry are stored in the dedicated D1 account row. State is consumed atomically; new authorization or **Remove private Threads connection** invalidates in-flight callbacks. No provider post data is stored or read as part of connection.

The proposed private `GET /api/threads/auth/status` returns only configuration, storage readiness, connected state and expiration timestamps. An owner-only on-demand profile check can use the encrypted token without exporting it. Both existing public Threads flags remain **false** and cannot be enabled through these new routes.

**New renewal candidate (separate from merged PR #85):** `POST /api/threads/auth/renew` is owner-authenticated, same-origin and deliberately initiated by a button. After Meta's minimum 24-hour age window, an unexpired long-lived token can be refreshed through its fixed official `GET /refresh_access_token?grant_type=th_refresh_token` endpoint. The server verifies the same account profile and atomically rotates only the AES-GCM-encrypted credential and expiry in private D1, conditional on the old revision/cipher/expiry. An intervening disconnect or reauthorization wins; provider errors never write or disclose token details. The private control shows when the next renewal is available.

**Important:** This is **manual renewal**, not an automatic scheduler. The official token may still expire if the owner does not renew before expiration; the safe recovery is to reauthorize. `Remove private Threads connection` clears the locally stored token and pending state, but **does not revoke the Meta-side grant**; the owner must separately revoke access in Meta's account settings. The new public-reader source candidate uses only the D1-stored credential, requires all four publication gates, rechecks the D1 revision/ciphertext after every network or cached response, and returns a disconnected projection if the owner revoked or renewed credentials during the read. Public sharing is not enabled by either OAuth or renewal.

## Still required before any real sync

1. Create or verify the owner's Meta app with the **Threads API use case**, request `threads_basic` and complete applicable Meta app authorization/review requirements. Do not request content publishing or insight permissions for this read-only feed.
2. Review and deploy the verified read-only OAuth source, approve/apply the additive private D1 migration after backup, and securely configure the Meta app credentials. Review the manual renewal PR separately and renew eligible long-lived tokens before expiry; no automatic renewal or account authorization is implied.
3. Confirm the authorized Threads username, account identity, provider policy for public site display, data retention, and user-approved publication scope before enabling the Threads release flag.
4. Run the verified browser/provider contract against the real account with explicit authorization, review a dated post on the intended host, test Stop All and token expiry, then complete the protected V5 release checklist. The in-memory cache is best-effort across Worker isolates; production retry/rate-limit and refresh behavior must be independently verified.
5. Keep public publication disabled until explicit account, data-scope, and production release approval. The V5 site is live, but the Threads feed must remain disconnected until a separately verified real authorization.

## Acceptance evidence

- `tests/threads-public.test.mjs`: official request contract, no token exposure, content/identity validation, bounded cache, failure modes, source gate and in-flight revocation
- `tests/threads-owner-oauth.test.mjs`: private OAuth, manual renewal, same-origin owner access, encryption, provider mismatches, token age/expiry, disconnect/reconnect races and public sharing disabled
- `tests/activity-v4.test.mjs`: actual V4 aggregation, Stop All, no provider call without public consent, and cache reuse
- `tests/threads-public-d1.test.mjs`: encrypted owner D1 credential, explicit publication gates, cache and in-flight disconnect/rotation/Stop All fences, no legacy secret fallback
- `tests/v5-public-threads.test.mjs`: browser-side source expiry, link allowlist and invalid-data clearing
- `tests/v5_source_contract.py`: synthetic browser proof that source-approved posts appear as inert text, link to the original Threads post and disappear after revocation

Source reference: Meta official [Threads API Postman collection](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api) and [official documentation](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api). These are implementation references, not proof that the owner's account is connected.

The approved screenshot's sample Threads content is **design-only**, not current user data.

## November 13, 2026 — Meta callbacks and private release handoff (draft PR #111)

**Authority and state:** The owner reports that the callback settings were saved in Meta, but no real provider delivery has been observed or verified. PR #111 includes the OAuth canonical-host fix from PR #110, as well as the lifecycle callbacks; resolve the overlapping PRs before merge. CI **run #2672** passed at source commit `f790cc40952a76eb924465232d5f6263511817a6`. That is source/isolated-runtime evidence only, not a deployed or provider-accepted connection.

The exact URLs in this source candidate are:

- OAuth redirect: `https://devonakins.com/api/threads/auth/callback` (owner's Access-protected OAuth flow)
- Deauthorize callback: `https://devonakins.com/api/threads/lifecycle/deauthorize` (Meta signed POST)
- Data deletion request: `https://devonakins.com/api/threads/lifecycle/delete` (Meta signed POST)
- Data deletion status: `https://devonakins.com/api/threads/lifecycle/status/<opaque-confirmation-code>` (generated dynamically, not manually configured in Meta)

Meta-to-server callbacks must be publicly reachable **without** an owner Access session; the Worker verifies the form-encoded `signed_request` HMAC using the **Threads-specific app secret**, not a personal or Facebook app secret. The owner OAuth endpoints remain Access protected. Data deletion returns `{url,confirmation_code}` and the opaque status URL reports completion only after the matching encrypted connection is removed or determined absent. The callback stores only bounded opaque replay/confirmation receipts, no Threads posts. Real Meta acceptance, correct user-ID mapping and test delivery are **not yet verified**.

### Gate to first private connection

1. Verify the Meta app's **Threads-specific** ID/secret, registered URLs, app role/tester and available callback test-delivery mechanism. Do not claim acceptance solely from a saved form.
2. Pin PR #111's **exact final HEAD**, rerun the full GitHub verification and review changed security code, tests, and release bundle. Reconcile PR #110 without double-merging it.
3. Independently back up `devonakins-listening-private` before any migration and confirm the recovery procedure. D1 Time Travel bookmark availability is useful but **not** proof that an independently restorable backup exists; bookmarks have provider retention limits. Keep any export private and outside public GitHub/CI artifacts.
4. Review and manually apply additive `migrations/0012_threads_meta_lifecycle.sql` to that exact D1 after explicit production migration approval. The current code's protected preflight uses a read-only D1 query and must **fail closed** until `threads_connection.threads_user_id`, four receipt fields and `threads_oauth_attempt` are present. Check actual schema and existing rows after migration; never run the migration in an ordinary site deployment.
5. Confirm Cloudflare Access protects `/api/threads/auth/*` and owner pages, while the two `/api/threads/lifecycle/*` callbacks remain reachable and reject unsigned requests. Review the private production binding allowlist, custom-domain mapping and rollback version. No changes to Access policies are implied by PR #111.
6. Merge only through the established protected workflow, deploy an exact, reviewed commit, then confirm `/_health`, anonymous owner-route denial, lifecycle bad-signature denial, nonexistent-status 404 and authenticated owner status. Keep `THREADS_PUBLIC_FEED_ENABLED=false` and `THREADS_PUBLIC_RELEASE_APPROVED=false` throughout.
7. The owner explicitly starts OAuth from `/owner/presence/`, authorizes `threads_basic`, and confirms the private verified identity, encrypted token storage and disconnect/renew safeguards. Use a real Meta signed delivery or supported provider verification to validate callback semantics without accidentally deleting a live grant.
8. Public Threads posts are a **separate** owner approval and release. Test correct post dates/permalinks, privacy/Stop All and revocation before independently enabling either publication flag.

**Rollback:** Return the Worker to the independently recorded prior production version if a release regresses. The new migration is additive; do not automatically roll back D1 to a historical state, because Time Travel restoration can discard unrelated writes. A database restore requires an explicit recovery decision and review of any intervening data.

As of this checkpoint, Cloudflare's live Worker is still on its prior version, the private Threads connection has no stored token, both public Threads flags are false, and migration `0012` is absent. These are observed production checks, not proof of Meta callback acceptance.

## November 14 — owner-visible sharing controls (draft; separate from LIVE #120)

This candidate adds a dedicated **Show public Threads posts** checkbox and save
action in the authenticated `/owner/presence/` Public visibility panel. It
does not grant Meta write permissions, change Threads/Spotify credentials, or
alter the four protected release flags. The existing public feed and profile
URLs remain untouched until a separate reviewed release.

`migrations/0013_threads_public_visibility.sql` adds a private, integer
`threads_connection.public_feed_enabled` flag. Its default is OFF. A one-time
update preserves the **already approved** verified owner grant when the migration
is first applied, avoiding a surprise outage during this particular cutover.
Every new OAuth authorization and disconnect explicitly resets the flag OFF;
refreshing the same verified account preserves it. The toggle requires Cloudflare
Access owner identity, same-origin JSON, a still-valid verified grant, global
public opt-in, and a current D1 revision for enabling. Consent may be staged
when the separate protected Threads source-release flags are OFF; nothing is
publicly displayed until those independent flags are enabled.
The OFF operation advances the revision regardless of previous state so that
stale or in-flight enable requests cannot revive disclosure.

The public reader checks the D1 flag before calling Meta and again afterward
against the same revision, ciphertext, expiry, username and release flags.
Cached and pending provider responses fail closed after OFF, disconnect or
credential renewal. The owner status endpoint exposes only consent boolean,
revision and release readiness; never a token, handle or account ID.

**Release gate: migration + deploy are not authorized by this draft.**
1. Independently verify the private database identity, currently serving Worker
   version and owner-approved public feed status. Export/verify an actual
   restorable private database backup; do not put it in public CI or GitHub.
2. Review and separately approve applying only migration 0013 to that database.
   The deployment preflight now rejects missing column with
   `MIGRATION_0013_REQUIRED`; do not bypass it.
3. Review the exact PR head, Node/TypeScript/build/Browser CI, source diff,
   security boundaries and rollback candidate. Merge only through approved
   branch protections, then deploy an exact reviewed main SHA using the existing
   protected one-screen workflow with `threads_publication_action=preserve`.
4. Verify the real production owner status on iPhone Safari and a live public
   activity packet. Toggle OFF: the latest three posts disappear while the
   private Threads connection remains available. Toggle ON with explicit owner
   consent: only verified public posts reappear. Confirm the global Stop All
   switch still hides the feed, and all owner APIs fail closed anonymously.
5. For rollback, restore the previously serving Worker version only after
   checking its binding compatibility. The additive schema change does not
   require or justify destructive D1 restore.

Social links in Home, Contact and Footer use first-party, CC0 Simple Icons SVG
marks for GitHub, Instagram, Threads and Facebook with real hrefs and
accessible link names. No remote icon provider, analytics, iframe or
third-party social script is added.
