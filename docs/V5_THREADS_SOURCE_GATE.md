# Living Mind V5 — Threads Feed Source & Authorization Gate

Status: **V5 website LIVE (November 9, 2026); official Threads account NOT CONNECTED.** The private provider verification control is a separate source candidate until merged, tested and released.
Owner: DevonAkins.com / canonical repository and protected release workflow. No new repository or social publisher.

## Implemented source contract

The Cloudflare Worker has a read-only projection of an **authorized owner's own posts** from Meta's official Threads API. It uses `threads_basic` with `GET https://graph.threads.net/v1.0/me/threads`, requesting only `id,text,username,media_type,permalink,timestamp`, limit five. It publishes at most three sanitized text excerpts with original Threads permalinks and actual posting timestamps.

The original V4 public aggregate (`/api/activity/v4`) carries an optional `threads` field, so V5 reuses the existing 30-second public reader. A five-minute in-memory per-Worker cache avoids querying Meta on every site poll; no extra browser poller or client-side Meta token is created. Each post remains dated by publication, not by the dashboard refresh. No likes, replies, reposts, impressions or invented engagement figures are published.

Before any Meta request, **all** of these server-side settings must be present and explicitly enabled:

- `PRESENCE_ENABLED=true` and `PRESENCE_PUBLIC_RELEASE_APPROVED=true` (existing global controls)
- An authorized public presence row (`presence_state.public_enabled=1`, `private_work=0`), with revision rechecked by the existing aggregate after the read
- `THREADS_PUBLIC_RELEASE_APPROVED=true`
- `THREADS_PUBLIC_FEED_ENABLED=true`
- `THREADS_PUBLIC_USERNAME` set to the **verified owner username**
- `THREADS_USER_ACCESS_TOKEN` set as a server-only Cloudflare secret from an approved Threads authorization flow

The source checks username consistency, Threads-only HTTPS permalinks, media types, timestamps, limits, and duplicates. Text is rendered through DOM `textContent`, not as provider HTML. A failure, expired source, private mode, Stop All/revocation or missing account authorization leaves the panel in **CONNECTION PENDING** with no posts. Provider errors never block Spotify, work, GitHub, or GPT panels.

## Private owner verification (source candidate)

Once the owner's Meta Threads app has issued a valid **`threads_basic` read-only user token** and the exact owner handle is confirmed, configure these only through the authorized Cloudflare Worker secret/variable controls:

- `THREADS_USER_ACCESS_TOKEN`: **secret** (never in source, GitHub Actions logs, page fields or chat)
- `THREADS_PUBLIC_USERNAME`: private Worker variable with exact account handle
- `THREADS_PUBLIC_RELEASE_APPROVED=false` and `THREADS_PUBLIC_FEED_ENABLED=false` during connection verification

The Cloudflare Access-protected **/owner/presence/** page now has a proposed “Test Threads connection privately” button. An explicit same-origin POST triggers one read-only call to Meta's authenticated `GET /v1.0/me?fields=id,username`, compares its returned username to the configured account, and returns only a fixed connection state and timestamp. It does not retrieve or publish posts, grant permissions, store new credentials, enable broadcasting or expose Meta's profile payload. Failed/mismatched/expired credentials remain disconnected.

The protected deployment preflight is extended in this source candidate to retain the already deployed Threads **secret binding opaquely**, validate the handle, and preserve explicitly configured independent public release flags. If the flags are missing they default to `false`. It still rejects any other unknown secret/variable and checks the same dedicated D1 database and encryption key. **Never bypass these checks to turn on Threads.**

The owner must still independently authorize the exact Meta app/account and decide whether publicly displaying their Threads posts is approved. No standalone OAuth callback, token generation, token refresh or automatic account link is being represented as finished.

## Still required before any real sync

1. Create or verify the owner's Meta app with the **Threads API use case**, request `threads_basic` and complete applicable Meta app authorization/review requirements. Do not request content publishing or insight permissions for this read-only feed.
2. Complete the owner-approved Meta OAuth/token exchange and maintain **renewal before expiration** using an authorized secure flow. The private connection verifier is not an OAuth client and does not refresh tokens. A long-lived token still needs periodic renewal; none is uploaded or automatically connected by this change. No credentials are committed to GitHub, logs, screenshots or test fixtures.
3. Confirm the authorized Threads username, account identity, provider policy for public site display, data retention, and user-approved publication scope before enabling the Threads release flag.
4. Run the verified browser/provider contract against the real account with explicit authorization, review a dated post on the intended host, test Stop All and token expiry, then complete the protected V5 release checklist. The in-memory cache is best-effort across Worker isolates; production retry/rate-limit and refresh behavior must be independently verified.
5. Keep public publication disabled until explicit account, data-scope, and production release approval. The V5 site is live, but the Threads feed must remain disconnected until a separately verified real authorization.

## Acceptance evidence

- `tests/threads-public.test.mjs`: official request contract, no token exposure, content/identity validation, bounded cache, failure modes, source gate and in-flight revocation
- `tests/activity-v4.test.mjs`: actual V4 aggregation, Stop All, no provider call without public consent, and cache reuse
- `tests/v5-public-threads.test.mjs`: browser-side source expiry, link allowlist and invalid-data clearing
- `tests/v5_source_contract.py`: synthetic browser proof that source-approved posts appear as inert text, link to the original Threads post and disappear after revocation

Source reference: Meta official [Threads API Postman collection](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api) and [official documentation](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api). These are implementation references, not proof that the owner's account is connected.

The approved screenshot's sample Threads content is **design-only**, not current user data.
