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
