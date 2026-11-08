# Living Mind V5 — Threads Feed Source & Authorization Gate

Status: **R13 implementation prepared, not connected or publicly deployed**.
Owner: DevonAkins.com / screenshot-locked V5 PR #66.

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

## Still required before any real sync

1. Create or verify the owner's Meta app with the **Threads API use case**, request `threads_basic` and complete applicable Meta app authorization/review requirements. Do not request content publishing or insight permissions for this read-only feed.
2. Build and review the Cloudflare Access–protected mobile-capable owner OAuth connection, secure token storage and **renewal before expiration**. R13 does **not** perform OAuth or refresh user access tokens. No credentials are committed to GitHub, logs, screenshots or test fixtures.
3. Confirm the authorized Threads username, account identity, provider policy for public site display, data retention, and user-approved publication scope before enabling the Threads release flag.
4. Run the verified browser/provider contract against the real account with explicit authorization, review a dated post on the intended host, test Stop All and token expiry, then complete the protected V5 release checklist. The in-memory cache is best-effort across Worker isolates; production retry/rate-limit and refresh behavior must be independently verified.
5. No production settings or site deployment should be changed by merging this source contract alone; PR #66 remains under review.

## Acceptance evidence

- `tests/threads-public.test.mjs`: official request contract, no token exposure, content/identity validation, bounded cache, failure modes, source gate and in-flight revocation
- `tests/activity-v4.test.mjs`: actual V4 aggregation, Stop All, no provider call without public consent, and cache reuse
- `tests/v5-public-threads.test.mjs`: browser-side source expiry, link allowlist and invalid-data clearing
- `tests/v5_source_contract.py`: synthetic browser proof that source-approved posts appear as inert text, link to the original Threads post and disappear after revocation

Source reference: Meta official [Threads API Postman collection](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api) and [official documentation](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api). These are implementation references, not proof that the owner's account is connected.

The approved screenshot's sample Threads content is **design-only**, not current user data.
