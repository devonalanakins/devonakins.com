# GPT owner snapshots — five-minute website refresh

**Status:** implementation candidate; not a direct ChatGPT account integration or an entitlement claim.

## Why this exists

The existing static profile preserves the November 4, 2026 snapshot. A page re-render or timer cannot acquire newer personal token totals from OpenAI by itself. ChatGPT Business Workspace Analytics provides workspace and member metrics in the admin interface; Personal Analytics and in-product Work/Codex credit views are separately gated by account/workspace eligibility. OpenAI API usage endpoints count API calls, **not** all ChatGPT messages or Work sessions. Never merge these scopes into one synthetic counter.

The new owner-only page at `/owner/gpt/` provides a practical fallback:

- Enter one actual, visible, nonnegative number you see in your own analytics view.
- Choose its exact metric type. The server derives its fixed source and scope; no prompts, account identifiers, screenshots, raw exports or free text are stored.
- The existing private D1 stores one latest observation per supported metric, with a server-side UTC **capture** time, `sourceUpdatedAt: null`, and private-by-default publication state.
- On public `/api/activity/v4`, the compact GPT ribbon and the detailed GPT profile can show the latest *individually approved* observation. The site already polls Live Signal every 30 seconds; the owner capture page checks saved readings every five minutes. Neither refresh cadence is the rate at which OpenAI provides new data.
- The selected observed value remains explicitly marked *historical* after 24 hours. It is never increased or extrapolated as time passes. If nothing is approved, GPT stays **Not connected**.

## Supported metrics

| Metric | Label and source | Unit |
| --- | --- | --- |
| `profile_7d_tokens` | Seven-day tokens, visible personal profile (owner capture) | tokens |
| `profile_lifetime_tokens_approx` | Approximate lifetime tokens, visible personal profile (owner capture) | tokens |
| `profile_7d_messages` | Seven-day messages, visible personal profile (owner capture) | messages |
| `profile_streak_days` | Streak at capture, visible personal profile | days |
| `work_codex_credits_remaining`, `work_codex_credits_used` | Work/Codex usage when available to the owner | credits |
| `business_7d_messages`, `business_7d_credits_used` | Owner's *own* Business member row, if accessible | messages, credits |

These are not official provider-certified totals. Never capture aggregate colleagues' usage as personal activity. Missing fields are omitted, not written as zero. The original dated November 4 snapshot is intentionally retained as an archive, never promoted as current data.

## Owner authentication and privacy

Owner UI: `GET /owner/gpt/`. Owner API: `GET|POST|DELETE /api/presence/owner?channel=gpt`. All requests are checked against the existing Cloudflare Access audience and owner email. Mutations additionally require same-origin `Origin` and `Sec-Fetch-Site`. Only allowlisted keys and numeric values are accepted, limited to 1024 bytes per request.

Publication requires **all** of:

1. `GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED=true` in the separately reviewed Worker release configuration (not set by this PR).
2. Existing global `PRESENCE_PUBLIC_RELEASE_APPROVED=true`, owner broadcast enabled, and private-work mode disabled.
3. Explicit owner opt-in for the exact metric through owner UI. New metrics start private, and each can be revoked or deleted.

The **Stop all broadcasting** path hides GPT readings immediately because the global broadcast gate is rechecked, including after asynchronous D1 reads. No replay or old provider response can reinstate a revoked metric. Server responses are `no-store`. This PR does not activate any public sharing or external observation collection.

## Migration and rollback

Only the dedicated database already bound as `LISTENING_DB` may receive `migrations/0008_gpt_owner_metrics.sql`. It creates one new table, no existing record changes and no seed data. Before applying:

1. Independently confirm the actual serving Worker D1 binding, original Spotify credential booleans, presence flags, and migrations 0001–0007.
2. Obtain a D1 Time Travel bookmark for restore (keep it private), run the migration once, and register its filename in `d1_migrations` following this repo's exact existing migration convention.
3. Verify table/column SQL, zero initial observation rows, unchanged original connection/privacy counts and absence of public metric routes while release flag is off.
4. Run the protected exact-main deploy workflow; inspect `/_health`, owner Access denial and publication OFF. No private data is written before the owner submits a new reading.

If code must be rolled back, the predecessor Worker can run against an *additive* table left empty/inert. Do not delete any previous D1 table or restore old private D1 data without separately reviewed recovery steps.

## Limitations and future collector

This completes a safe **periodic publication** path, not automatic upstream collection. To get newer numbers without an owner entry requires one authorized source: an eligible, verified API/export; a user-consented native client; or the separate local browser experiment in draft PR #41, which still requires a real visible-number capture test and cannot run on an unattended iPhone. No cookies, internal ChatGPT endpoints, hidden DOM/API scraping, or guessed token rates are used. There is no reason to leave a laptop on merely to *read* the last stored snapshot.

Relevant external documentation:
- https://help.openai.com/en/articles/20001478-reviewing-work-and-codex-usage-and-using-personal-analytics-in-chatgpt-desktop
- https://help.openai.com/en/articles/11391654-chatgpt-business-release-notes
- https://github.com/devonalanakins/devonakins.com/issues/36

