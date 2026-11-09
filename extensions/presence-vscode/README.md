# DevonAkins Presence

An optional, initially paused VS Code companion for the owner's personal site.
It matches the edited document to the built-in Git extension's origin remote locally using an authenticated, owner-approved repository catalog, and sends only the approved project slug, focused-edit observation and timestamp. Unknown/private repositories produce no activity signal; switching to one clears any preceding public editor activity. No text, filenames, paths, raw Git metadata, prompts or clipboard data are transmitted.
Edits made through editor commands can also produce an activity event; this is
editor-observed activity, not proof of human keystrokes or productivity.

## Install and pair

1. Install the `.vsix` from the verified PR's `presence-vscode` CI artifact using
   **Extensions → Install from VSIX**. No Marketplace publication is needed.
2. Visit your protected website `/owner/presence/` on your phone or computer.
   Create a pairing code. Paste it only into **Devon Presence: Pair Editor** in
   VS Code's command palette. It expires after five minutes and is one-use.
3. Automatic approved-project detection is the default. Project names cannot be manually assigned to unrelated edits. Enable paired editor activity
   in the private website controls, then run **Devon Presence: Resume Sharing**.
4. Focused edits can now produce an expiring heartbeat at most once per minute.
   Merely leaving VS Code open does not count. Pairing lasts 30 days; restart
   restores your last explicit Resume/Pause preference. No signal is sent until a new focused edit.

The token is kept in VS Code SecretStorage; only the selected public slug is
stored in ordinary global state. The token can update only the minimal editor
signal; it cannot alter owner preferences, playlists, account credentials or GPT
observations. Untrusted workspaces cannot activate the extension.

**Pause Sharing** stops local collection and attempts to clear the public editor
signal. If disconnected, that signal expires within two minutes. **Forget Pairing**
also removes the local token. Use **Disconnect editor** in the private website
controls to revoke the server credential. **Stop all broadcasting** hides all
signals and invalidates the editor pairing, including delayed requests.

Version 0.1.1 waits for any in-flight heartbeat before sending a stop signal.
Delayed responses cannot restore an active status after pause, pairing changes,
or shutdown. Forget Pairing also orders credential deletion after any pending
save, so an earlier pairing request cannot restore the forgotten credential.
The website's Disconnect editor control remains the server-side revocation path.

This companion requires a running VS Code session for new observed edits. Remote
development from an iPhone uses the separate owner-declared session controls.
Neither route requires a laptop to remain running for Spotify account playback.

## Development and verification

Package using the official VSCE tool pinned by repository CI. Alternatively load
this directory with VS Code's `--extensionDevelopmentPath` development option.
The Node suite tests the request boundary against real SQLite and exercises this
module with simulated VS Code events and SecretStorage. A real desktop extension
host, owner pairing and signed-in account are separate acceptance checks.

Version 0.2.0 adds automatic allowlisted GitHub project mapping using the built-in Git API. Credentials are independently revocable and expire after 30 days; a restart remembers explicit sharing opt-in and still waits for a real edit. Pause Sharing persists across restarts.

Version 0.3.0 waits for the built-in Git extension to activate, recognizes only
actual repository document edits, and keeps unknown, virtual and untrusted
workspaces private. Repository recognition comes from the paired editor's
read-only `/api/presence/editor/catalog`, refreshed at least every five minutes;
a newly approved repository can map to an existing project identity without
reinstalling this extension or repeating pairing. Approval changes are enforced
again by the server on every heartbeat. An unavailable or expired catalog stops
sharing until it can be verified again, and refreshing it never invents an edit.
The catalog and raw Git remotes stay local; requests never transmit repository
names, source text, file names or paths. The settings command allows automatic
recognition or keeping all edits private.

## Codex ChatGPT workspace companion (0.4.0)

The optional extension also exposes an official-CLI launcher that keeps **ChatGPT-authenticated Codex** separate from independently billed OpenAI API-key sessions. It is not an AI agent replacement, account-wide analytics API, or automatic token counter.

With Codex CLI installed and a trusted VS Code project open, run **Devon Presence: Check Codex ChatGPT Sign-in** and **Devon Presence: Start Codex with ChatGPT** from the Command Palette. The launcher only starts a coding session if `codex login status` strictly reports ChatGPT sign-in. If the CLI is missing or not signed in, **Devon Presence: Open Codex ChatGPT Sign-in** invokes the official sign-in flow after confirmation. **Devon Presence: Review ChatGPT Usage** opens ChatGPT for an owner-reviewed, dated metric capture.

This launcher removes API-key and custom-base-url environment overrides from its Codex terminal and refuses sessions explicitly authenticated by an API key; it does not read or save Codex credentials. Check the actual account/workspace, model and provider using `/status` inside Codex before asserting usage attribution. No Code/Prompt content or Codex usage counts are sent through the Presence heartbeat, which remains paused until independently paired and approved.

See [the detailed architecture, privacy and acceptance gates](../../docs/CODEX_WORKSPACE_INTEGRATION.md). VS Code / Codex login and end-to-end account usage remain subject to a real owner-device acceptance test.
