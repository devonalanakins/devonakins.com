# GPT observation bridge — owner-controlled periodic snapshot

**Status:** Private first-party owner-entry implementation, release-gated and not connected to a personal ChatGPT usage API. Preserve the existing historical GPT Observatory, Spotify, Work and GitHub signals.

## Why periodic rather than falsely live

OpenAI's Work/Codex Usage & billing and workspace analytics screens do not provide this public website with an authorized continuous account-level data feed. Reading the website every five minutes cannot create a newer OpenAI observation. The recorded value changes **only when the owner reviews a fresh official figure and saves it, or when an independently authorized source is implemented later**. Old numbers are displayed as dated/stale, never extrapolated or called live. Regular Chat statistics are not mixed with Work/Codex credits or API metering.

## Owner capture — private and phone-friendly

1. Sign in through existing Cloudflare Access at `/owner/presence/` and scroll to **GPT usage snapshot**.
2. Choose an explicitly labeled Work/Codex metric: credits used, credits remaining, percent used, or percent remaining. Read that number from the applicable official Work/Codex usage view, check **I just checked this value**, and record it.
3. A successful server response stores only `metric`, numeric `value`, metric `unit`, scope `work-codex`, server capture time and provenance `owner-reviewed-dashboard`. It sets `lastChangedAt:null` and `sourceUpdatedAt:null` because neither underlying update time is known. No URL, account identity, login/session token, prompt, screenshot or chat content is stored.
4. The Access-protected owner page checks the last reading on opening, on becoming visible and at most every **five minutes**. **Clear snapshot** explicitly erases the one saved record.
5. The public V4 page already re-reads `/api/activity/v4` every 30 seconds for work and Spotify. It can display the latest approved GPT observation with an observation-age label; it does **not** pretend that a poll is a new provider measurement. After 15 minutes it is marked *Dated*. A record no longer participates after 30 days without a new observation.

Source of truth: the user's real signed-in OpenAI Work/Codex usage view. Eligibility and figures must be checked on the actual account; the website does not extract them. This is intentionally not an undocumented ChatGPT API, a browser-cookie monitor, an OpenAI API billing substitute or an autonomous cloud collector.

## Minimal private storage and protected release

**Primary storage:** the existing dedicated private D1 binding `LISTENING_DB`, using additive migration `migrations/0008_gpt_owner_snapshot.sql`. One row `id=1`, bounded record text (1024 bytes), and server receipt timestamp. No new KV namespace, subscription, file store, unbounded history or additional service. The earlier optional `GPT_USAGE_STORE` KV code remains a compatibility fallback for isolated prototypes, but production uses the existing D1 after migration. The private D1 is not queried on public reads unless explicit release gates permit it.

Endpoints:

| Endpoint | Method | Protection |
| --- | --- | --- |
| `/api/gpt-observation/owner` | GET | Cloudflare Access owner identity |
| `/api/gpt-observation/owner` | POST | Owner identity, same-origin, explicit reviewed confirmation, 5-minute cooldown |
| `/api/gpt-observation/owner` | DELETE | Owner identity and same-origin; removes the one record |
| `/api/gpt-observation/ingest` | POST | Disabled by default. Separate `GPT_USAGE_WRITE_ENABLED` plus strong `GPT_USAGE_INGEST_SECRET`; only if a supported verified source is later authorized |
| `/api/gpt-observation/latest` | GET, HEAD | Disabled by default. Both `GPT_USAGE_READ_ENABLED` and `GPT_USAGE_PUBLIC_RELEASE_APPROVED` required |
| `/api/activity/v4` | GET, HEAD | GPT only when both GPT gates, existing global `PRESENCE_PUBLIC_RELEASE_APPROVED`, owner public presence opt-in and non-private mode all allow it |

**Public authorization is separate from recording a private observation.** The protected deploy workflow deliberately forces old disclosure flags OFF. Do not silently relax its guard, turn on public GPT visibility or reuse the personal metric for another project. A clear owner approval and protected release workflow are required for publication.

Before migrating production D1: confirm the active serving Worker bound to `devonakins-listening-private`, replication disabled, migration 0001–0007 intact and a Time Travel bookmark or verified rollback backup available. Apply the additive migration only once and register its filename, check schema and old Spotify/presence tables, then deploy through the existing exact-SHA manual GitHub workflow. Do not use direct Cloudflare uploads to bypass the protected release. A deployment before migration fails the private owner snapshot interface closed without affecting Spotify or the live task API.

## Client and API invariants

- Only four allowlisted metric+unit pairs: Work/Codex credits used/remaining and percent used/remaining. Percent 0–100; credits 0–1,000,000.
- Only a reviewed value. Unknown metrics, arbitrary text, fake timestamps, private fields, invalid units and requests over 1024 bytes are rejected. Snapshot time is assigned by the Worker, not by the browser.
- D1 updates use a one-row primary key with an atomic five-minute update guard. A new verified observation cannot be overwritten by a concurrent stale one. GET/POST/DELETE have `no-store` headers and do not publish account or network details.
- Existing public historical GPT profile remains dated and separate. If no value is stored or publication is disabled, the V4 GPT ribbon says *Not connected* rather than showing zero or obsolete estimates.
- Unit/browser tests cover D1 migration, owner authentication, same-origin writes and deletion, publish-off state, stale values, failed requests, cooldown, and privacy-stop races.

## Future automatic source

If an **authorized official account-level export/API** becomes available for this workspace, integrate it with a read-only scoped credential, actual provider timestamp, suitable daily/periodic cadence, revocation and separate public approval. OpenAI API organization usage metrics and ChatGPT Work/Codex workspace analytics are distinct scopes. Do not scrape browser sessions or require a laptop on 24/7 just to impersonate a missing provider feed.

The older experimental local visible-number collector (draft PR #41) can read one selected browser element **while the relevant tab is open**, but does not itself solve a laptop-free source. The earlier KV-only snapshot proposal (draft PR #42) is superseded as the preferred production storage by this D1-backed owner-capture path; its external bearer ingestion remains disabled.
