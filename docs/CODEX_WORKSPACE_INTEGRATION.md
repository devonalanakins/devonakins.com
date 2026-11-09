# Codex with ChatGPT sign-in — DevonAkins Presence companion

**Status:** Source-only VS Code companion. Not a full account analytics feed, production release, provider-authenticated usage audit, or Marketplace installation.

## Goal and architecture

Use the official Codex VS Code extension as the primary coding runtime, signed in with Devon's **ChatGPT workspace account**. The standalone Codex CLI is optional, not a prerequisite for IDE use, and uses a separate launcher guarded against API-key authentication. Reuse the existing opt-in VS Code Presence companion for approved project activity, while treating OpenAI usage and DevonAkins.com telemetry as **separate**, source-labeled data systems.

```text
Trusted VS Code workspace
  |-- Codex CLI or official IDE client -- ChatGPT sign-in --> OpenAI usage accounting
  |                                                (provider owns the measurements)
  |
  |-- Existing Presence companion -- explicit opt-in --> approved editor activity
                                                         |
                                                DevonAkins.com Live Signal

Dated, independently observed GPT numbers --> private /owner/gpt capture
                                             --> owner-approved public metrics only
```

## Commands

| VS Code command | Behavior |
| --- | --- |
| Devon Presence: Open Official Codex IDE | Opens OpenAI's installed Codex VS Code sidebar using the documented `chatgpt.openSidebar` command. Does not inspect account credentials, require the CLI, or assert a usage total. |
| Devon Presence: Check Codex ChatGPT Sign-in | Locally executes the documented `codex login status` check. Strictly recognizes the sign-in *mode*, not the actual account, workspace seat, provider, or usage totals. |
| Devon Presence: Start Codex CLI with ChatGPT | Requires a trusted workspace and the CLI's exact `Logged in using ChatGPT` status. Prompts for a project folder in a multi-root workspace; runs `codex` in a terminal. |
| Devon Presence: Open Codex ChatGPT Sign-in | With explicit user confirmation, starts official `codex login` in a local terminal. |
| Devon Presence: Review ChatGPT Usage | Opens ChatGPT and explains where to review official Work/Codex metrics. No scraping or background collection. |

The companion does not implement a replacement AI agent, authenticate directly with OAuth, inspect `~/.codex/auth.json`, or collect prompt/code text. **The official Codex IDE/CLI owns sign-in, credential refresh, and requests.** Opening the IDE is a navigation action and is never described as proof of ChatGPT login, usage, or entitlement.

## API-billing guard

- Before launching, a bounded shell-free status probe verifies the locally configured CLI sign-in method. On Windows, an npm-installed `codex.cmd` shim may be unavailable to shell-free `execFile`; on that exact `ENOENT` case, a tightly fixed `cmd.exe /d /s /c codex login status` fallback probes the same authentication mode without interpolating user input, paths or prompt text.
- `OPENAI_API_KEY`, `CODEX_API_KEY`, `CODEX_ACCESS_TOKEN`, `OPENAI_BASE_URL`, and `OPENAI_API_BASE` are excluded from the probe environment and unset in the VS Code terminal.
- The optional CLI launcher refuses a coding session when the CLI reports API-key authentication. Missing or unrecognized CLI authentication fails closed, without preventing use of the independently installed official Codex IDE sidebar. Signed-out CLI sessions offer explicit ChatGPT CLI sign-in.
- A `config.toml` custom provider or manually changed runtime configuration could still change where Codex sends requests. **The user must check `/status` within Codex**, confirm the intended ChatGPT account/workspace/provider, and verify an actual inference run before making billing/usage claims.
- A local CLI mode check is not an independent proof of OpenAI billing or of which workspace member is being credited.

## Activity and privacy

The existing VS Code Presence companion remains separate and initially paused, requiring pairing at the protected `/owner/presence/` page and explicit approval of source/repository. It can send the approved public project slug and edit timestamp, never Git remote, file content, prompt, raw repository path or credential. Private/unmapped repos remain excluded; local pause and server-wide Stop all broadcasting remain active.

**No token totals are derived from commits, keystrokes, CLI launches or editor activity.** The existing immutable November 4, 2026 public archive reports approximately **2.7 billion tokens**, **not billing credits**. In the November 9 owner-provided recording, the already-public ChatGPT profile displays **3.3 billion lifetime tokens (rounded)**. This observation is not a new public-site publication and does not prove any Codex IDE session contributed to the total. Capture updated readings only via the protected owner process, with explicit metric-specific publication controls. Work/Codex credits, session tokens, ChatGPT profile lifetime tokens, streaks and regular ChatGPT messages remain different metrics.

The protected `/owner/gpt/` form already supports source-observed and individually approved GPT readings. We do not add unverified APIs, public personal analytics, background scraping, session impersonation, subscription charges, new Cloudflare resources, or new repositories.

## Verification and release gates

- [x] Local isolated Node tests: exact status parsing, missing CLI, API-key rejection and environment cleaning, trusted-workspace launch, multi-root selection, user-controlled sign-in/usage, disposal.
- [ ] GitHub PR CI: full `npm test`, `npm run build` and optional VSIX packaging.
- [ ] Real VS Code Extension Development Host or verified VSIX installation on owner's laptop.
- [ ] Official Codex IDE authenticated to the intended ChatGPT workspace and a real coding turn verified on the owner's laptop; CLI installation is optional. If using the CLI, `codex login status` and in-session `/status` must confirm the intended configuration.
- [ ] One real successful Codex coding turn and official OpenAI usage view checked before/after; no API-key charges.
- [ ] Existing paired Presence acceptance: approved repo reports only after opt-in; private repo and stop controls remain private.
- [ ] If the owner elects to publish an updated GPT number, enter the actual source reading through protected `/owner/gpt/`; verify source date and privacy switches before any public release.

No merge, deployment, usage update, or publication is implied by this feature branch or passing local tests.

## Future option: authenticated private analytics

A future supported scoped workspace analytics API/export could supply appropriately scoped, dated readings, subject to verified entitlement and user approval. Never infer the lifetime profile total from local Codex sessions, combine different metric types, or scrape private ChatGPT sessions. The Codex app-server is a possible foundation for a richer custom coding UI, but this release deliberately reuses the established runtime.

## References

- [Using Codex with a ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- [Codex IDE commands (`chatgpt.openSidebar`)](https://learn.chatgpt.com/docs/ide/commands)
- [Codex authentication / IDE versus API-key sign-in](https://learn.chatgpt.com/docs/auth)
- [Codex CLI reference](https://developers.openai.com/codex/cli/reference)
- [Work/Codex usage and personal analytics](https://help.openai.com/en/articles/20001478-reviewing-work-and-codex-usage-and-using-personal-analytics-in-chatgpt-desktop)
- [Codex app-server integration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [Existing extension and pairing](../extensions/presence-vscode/README.md)
- [Existing owner snapshot and publication controls](./GPT_OWNER_SNAPSHOTS.md)
- [Existing telemetry issue](https://github.com/devonalanakins/devonakins.com/issues/36)
