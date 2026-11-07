# Central repository connections — V5 source implementation

This is a gated GitHub App integration, not proof that an App is registered,
installed, credentialed, or receiving production events. No account permission,
installation, credential, paid service, or live publication was enabled by this
implementation. Keep the existing trusted single-repository Actions reporter
until central acceptance is complete; prevent duplicate reporting for the same
repository when deliberately switching its source.

## Paths and owner decisions

| Path                                 | Boundary                                                       | Behavior                                                        |
| ------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------- |
| `/owner/github/`                     | Existing Cloudflare Access owner identity                      | Private inventory and connection controls                       |
| `/api/presence/owner?channel=github` | Access owner; same-origin mutations                            | GET status, POST discovery/connection, DELETE revocation        |
| `/api/activity/github/webhook`       | POST; SHA-256 HMAC of exact bytes; one configured installation | Fixed workflow status ingress                                   |
| `/api/presence/editor/catalog`       | Existing paired editor bearer, expiry and generation           | Approved repository recognition catalog, no private discoveries |

The inventory distinguishes discovered, recognized, owner-approved, connected,
sharing, and recent-event states. Recognized names match the existing public
project catalog; `anevum-web` maps to Anevum, while `anevum` does not. A newly
discovered repository is private and disconnected in this system even if its
GitHub visibility is public. Cristy/client/family repositories have no inferred
public identity.

The owner can map a new public, authorized repository to an already approved
project identity without changing the homepage or extension registry. A wholly
new public project identity still requires extending the reviewed global
project contract; discovery does not add identities automatically.

POST `{ "action": "discover" }` refreshes the selected installation inventory.
POST `{ "action": "connect", "id": REPOSITORY_ID, "revision": OBSERVED_REVISION,
"projectSlug": APPROVED_SLUG, "enabled": false }` explicitly classifies and
connects it privately. Setting `enabled` to true additionally requires the
existing public release gate and the owner's explicit sharing decision.
DELETE `{ "id": REPOSITORY_ID, "revision": OBSERVED_REVISION }` revokes the
connection. Stale owner revisions fail with 409.

## Activation prerequisites

Review and approve the selected-repository GitHub App installation first. The
App needs repository metadata read and Actions read permissions; subscribe to
`workflow_run`, installation, and installation-repository changes. This source
does not ask for contents, administrative, or write permissions. Requesting
Actions read in token minting cannot grant permissions the App lacks.

Configure only in the private Worker settings/secret store:

| Binding                      | Classification        | Meaning                                                              |
| ---------------------------- | --------------------- | -------------------------------------------------------------------- |
| `GITHUB_INTEGRATION_ENABLED` | Plain boolean string  | Absent or false keeps ingress and dynamic discovery off              |
| `GITHUB_APP_ID`              | Private configuration | App/client ID used as JWT issuer                                     |
| `GITHUB_INSTALLATION_ID`     | Private configuration | One deliberately selected installation owned by `devonalanakins`     |
| `GITHUB_APP_PRIVATE_KEY`     | Secret                | RSA private key in PKCS8 `BEGIN PRIVATE KEY` PEM form                |
| `GITHUB_WEBHOOK_SECRET`      | Secret                | Independent high-entropy webhook HMAC secret, at least 32 characters |

GitHub's downloaded PKCS1 PEM must be converted to unencrypted PKCS8 before
private secret provisioning. Never put either key form in Git, issues, browser
storage, or logs. The App JWT lives only for the request; token minting requests
metadata/Actions read only. All API calls use fixed `api.github.com` URLs,
reject redirects, enforce response-size/time limits, and never return or store
tokens. Discovery verifies the installation account and suspension state.

Add these reviewed names to the protected deployment configuration validator
before configuring them. Include `github-integration`,
`github-integration-auth`, and `github-integration-page` in the release module
copy list. Route the four paths before generic presence handlers. The webhook
path needs public reachability but does not bypass its own signature validation;
the owner page/API still require Access and exact owner identity.

Apply additive `0010_github_integration.sql` to the verified existing private
D1 using the established migration/backup procedure. It only adds bounded
repository metadata, delivery receipts, and workflow-run linkage. It does not
change existing public consent, OAuth, editor pairing, sources, or tasks.

## Evidence and limits

Only fresh signed `workflow_run` evidence for default-branch `push` and
`workflow_dispatch` runs from the same repository is eligible for tasks.
Fork, pull-request, nondefault-branch, stale (>120 seconds), future (>10 seconds),
unknown conclusions and unsupported events never become activity. The public
projection receives only existing V4 fixed statuses, random opaque handles,
project identity, and observation/expiry dates. No workflow titles, provider
run/repo IDs, names, paths, commits, logs, prompts or raw payloads are public.

Concurrent workflow run IDs and rerun attempts have independent task handles.
Terminal tasks do not restart; old waiting evidence cannot downgrade running
evidence at the same timestamp. SQL batches are transactional and fence owner,
source, repository, task, workflow-run and discovery revisions. A delayed running delivery cannot revive a workflow that concurrently became terminal. Discovery failure rolls back
all inventory changes. Rename, privacy/default-branch changes or installation
removal revoke existing sources. Reconnecting never revives/relabels old tasks.
Global Stop all invalidates the existing generation and wins over delayed
webhook writes and projections. Ordinary task evidence expires after 120
seconds without genuine new events: a long-running workflow can become quiet
between GitHub callbacks, and no synthetic heartbeat keeps it alive.

Delivery deduplication hashes authenticated content rather than trusting the
unsigned GitHub delivery ID. Receipt retention is bounded to 7 days/10,000
entries. Workflow age, monotone state and provider run/attempt identity provide
additional replay protection. Lifecycle revocation is deliberately fail-closed;
old revocation content beyond retained receipts may revoke a later connection
again, but cannot grant access or publication. This is a remaining availability
limitation, not a path to disclosure.

Inventory is bounded to 500 repositories, 32 total existing V4 sources and 64
task rows. Deployment/provider query limits can require a smaller discovery
batch; a rejected transaction leaves the old inventory intact. No plan upgrade
is introduced. Installation-added events and genuine workflow events discover
new authorized repositories privately; owner discovery also performs a complete
reconciliation. Unmapped repositories never become public automatically.

The editor catalog contains approved built-in mappings and explicitly approved
public dynamic mappings. Known private/deauthorized or newly discovered unapproved repositories are removed.
Catalog reads fence owner/editor credentials and inventory revisions; validity
is at most five minutes and no longer than credential expiry. Clients must stop
on expiry/failure. A local cached mapping may persist until that refresh; global
project withdrawal, editor revocation and Stop all are enforced immediately by
the existing heartbeat API. No repo names or Git metadata are sent in heartbeats.

This implementation covers central workflow status; central PR, release and
arbitrary check-run publication are not implemented. Existing separate public
GitHub history remains unchanged. Real App installation, delivery/redelivery,
revocation, same-repository CI and owner/browser acceptance remain required
before claiming a connected production integration.

## Validation and rollback

`node --test tests/github-integration.test.mjs` exercises actual SQLite
transactions and WebCrypto signatures/JWT verification with fixture provider
responses. It covers auth/origin, no implicit publication, private repository
exclusion, payload spoofing, replay, concurrency, state transitions, atomic sync
rollback, revocation/Stop-all races, editor catalog fencing and source renewal.
These tests do not establish real provider connectivity.

Rollback by disabling ingress and revoking new sources, then redeploying the
prior reviewed Worker version through the protected release workflow. Leave
the additive tables intact; old code ignores them. Do not restore the entire
D1 as ordinary rollback because it also contains independent Spotify/editor
credentials and privacy state.

The review candidate routes these endpoints and packages all three Worker modules. New App binding names remain intentionally absent from the protected deployment allowlist until activation is explicitly reviewed. CI also exercises signed events against actual local workerd/D1 and synthetic owner controls in Chromium/WebKit. Actual desktop extension-host use and GitHub App delivery are separate acceptance gates.
