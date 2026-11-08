# Living Mind V5 — Reviewed Public Graph History (R15)

Status: **draft, source-only, not deployed**. Owner issues [#60](https://github.com/devonalanakins/devonakins.com/issues/60) and [#63](https://github.com/devonalanakins/devonakins.com/issues/63); stacked on [R14 PR #69](https://github.com/devonalanakins/devonakins.com/pull/69) and the locked screenshot PR #66.

## What this increment actually implements

`src/v5/public-graph-history.mjs` provides a deterministic, bounded, as-of projector for future **reviewed public structural records**. It is distinct from the short-lived V4 editor/task/GitHub/Spotify projector and from the Three.js renderer.

At revision zero the graph has **eight existing public visual anchors only**: DevonStation, Mizvo, the **public Knowledge section** (not the private wiki), Anevum, Rhen, Merit, Vesper and Squelch. The compiled reviewed history array is **intentionally empty**. No implementation milestones, source integrations, live reporters, relationships, released products, or dates are inferred from project names or generic GitHub events.

When independently verified records are subsequently approved in a reviewed source PR, the pure projector can replay dated public feature/component/integration/publication structures and typed relationships. Return values distinguish structural publication/retirement from transient activity. Their presence never means a reporter is connected or working.

## Publication requirements (not automatic verification)

Each new event must be manually authored and reviewed in this repository, with:
- A consecutive sequence number and canonical UTC millisecond `effectiveAt`.
- One allowed action: `publish-node`, `retire-node`, `publish-relation`, or `retire-relation`.
- An exact stable allowlisted node/edge identity and strictly bounded public title/type.
- A cited public evidence PR/commit and a **V5 publication-review PR**. These are validated by shape and public repository allowlist; **the pure function does not confirm that those URLs exist, that their contents prove the claim, or that publication has been approved**. Human verification/approval remains mandatory before modifying the manifest.
- An as-of replay revision. Recorded structure is not updated by web polling, project discovery, Spotify playback, ChatGPT conversation activity, or an unreviewed build event.

The current R15 PR is **not** approval to publish any structure records. The repository-history audit and owner review must validate every proposed milestone. An approved public project identity alone does not justify any feature or relationship.

## Privacy, scope and runtime contract

- No provider requests, credentials, Workers, D1 changes, persistent browser storage, subscription timers, asset publication, autonomous capture, or new dependencies.
- The new projector does not read private Knowledge, Notion, family/client/clinical records, repo inventories, commits, messages, paths or telemetry payloads.
- The **public Knowledge** anchor is a section; its private record tree is never used as input. Until a separately approved public Knowledge schema exists, no private Knowledge child or link may be added.
- Invalid sequences, timestamps, owners, titles, relation endpoints, review/evidence URI forms, unapproved nodes or duplicate records make the entire manifest **fail closed**, leaving only public roots. Limits: 128 changes, 96 nodes and 128 relations.
- Retirement preserves the node as historical metadata, removes incident active edges and can be replayed as of prior dates. Full historical revision remains code-reviewed. It does not delete GitHub or user data.
- This model is **not** the existing immersive Signal Field PR #68's graph; merge/reconcile that visual implementation only after standalone review.

## Verification and future adoption

`npm test` must cover a positive fixture, earlier-date replay, retirement, invalid records and private-data avoidance. `npm run build` and the repository PR checks must pass on this exact head. Do not claim visual/device verification from source-only model tests.

After acceptance, the next isolated incremental PR may add a browser-accessible **read-only, semantic graph timeline** with reduced-motion/no-JS parity and a separately reviewed GPU binding. Never represent a decorative line as an implemented dependency. Source-only R15 intentionally does **not** change the locked homepage or protected V4 deployment.
