# Living Mind V5 — proposed public graph milestones

Status: **STAGED / NOT PUBLIC / PENDING INDEPENDENT REVIEW**. Owner release PR: [#77](https://github.com/devonalanakins/devonakins.com/pull/77). These are code-merged publication facts, **not** evidence that any app was deployed or that the V5 graph has been approved for publication.

## Evidence prepared
- [Squelch identity and canonical site route, #26](https://github.com/devonalanakins/devonakins.com/pull/26), merged 2026-11-04T00:26:13Z; [merge commit](https://github.com/devonalanakins/devonakins.com/commit/d7e9c4cd4f599485dd8dbf028f386295e6811623).
- [Merit and Rhen-language site portfolio entries, #29](https://github.com/devonalanakins/devonakins.com/pull/29), merged 2026-11-04T04:59:08Z; [merge commit](https://github.com/devonalanakins/devonakins.com/commit/310b90386bb02749a784e1b57b1d0b17ba01cadf). Language research is not the Rhen finance/trading repository.
- [Mizvo provisional source portfolio, #34](https://github.com/devonalanakins/devonakins.com/pull/34), merged 2026-11-05T05:34:39Z; [merge commit](https://github.com/devonalanakins/devonakins.com/commit/4a4922e324b85f41aa0d7f7c40c8f6d15a3eacd4). Its public app PR was draft, not a deployed app.

The three merged PRs above have no submitted GitHub review approvals on record. Their source and merge status were checked through GitHub. This artifact does **not** count merge itself as independent publication approval.

## Exact disclosure boundary
`V5_PUBLIC_GRAPH_PROPOSALS.json` is **not imported into any client, Worker, published manifest or active replay**. `PUBLIC_GRAPH_REVIEWED_RECORDS` remains empty. Thus current Signal Field stays at structural revision 0. The four proposals represent *portfolio source publications*, not shipped product components or active source reporters.

A dry-run test synthesizes the eight milestone and `documents` relation records in a simulated replay; this establishes compatibility of code, dates, source links and typed edges, **not** publication approval. No cross-project integration or dependency is asserted.

## Promotion / independent review gates
1. Review the source and merge SHA for each proposed label, confirm the public scope and decide whether the portfolio-source milestone is meaningful to the external atlas. Reject any item that lacks useful value, precise identity or disclosure approval.
2. Obtain explicit owner approval for the specific selected public milestones, and a separate engineering review of the manifest/diff, source/route links, historical dates, and privacy boundary. Do not cite PR #77 as approved while it is draft.
3. In a **separate reviewable PR or independently reviewed update**, copy only accepted proposal events to `PUBLIC_GRAPH_REVIEWED_RECORDS`. Keep source merge timestamps distinct from actual release/deployment dates in every public label. Add one new review URL that actually records publication authorization; do not quietly reuse a source PR as a publication review.
4. Update tests that currently expect eight root-only identities, replay dates, source-accurate links, the full atlas, 3D camera fit, mobile, no-JS, accessibility and screenshot output.
5. Re-verify exact-head CI and owner sign-off before any V5 cutover. Never activate or promote proposals dynamically through GitHub webhooks or public APIs.

No merge, deployment or source disclosure change is authorized by this staging step.
