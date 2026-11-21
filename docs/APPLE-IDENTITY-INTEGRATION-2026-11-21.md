# Apple development within Devon Alan Akins's identity

Status: **review candidate**. The site changes in this branch are not a release. Bio copy below is proposed for review, not a record that other profiles have been updated.

## Starting point

The existing Laboratory site brings together independent software, writing, scientific learning, conversations and nonclinical operations. Its approved visual identity and existing Work, Portfolio, Podcast, Courses, My Setup and Fieldnotes routes remain the home for that work. Apple development is a practice within this identity, not a new brand or replacement site.

On November 21, 2026, production `/_health` reported Laboratory commit `232051bedebd1c4561218a4362bf2375580ee103`; `/`, `/work/`, `/writing/`, `/about/`, `/podcast/`, `/courses/` and `/setup/` responded successfully. The existing routing redirects `/writing/` and `/about/` to their canonical pages. The repository records podcast and courses as prelaunch; a page response is not evidence of a published episode or an available course. PR [#142](https://github.com/devonalanakins/devonakins.com/pull/142) records the protected release and prior browser evidence. Recheck production and provider status at release time.

The public [IREN iOS source](https://github.com/devonalanakins/anevum-web/tree/main/native/iren-ios) contains SwiftUI, WidgetKit and ActivityKit work. Its current README explicitly identifies it as archived, dependent on retired authentication and mobile APIs, and unsuitable for distribution or current production. It is evidence of source work, not a shipped app, a current backend connection or a reusable authentication design. No App Store listing, download, certification, customer, or years-of-experience claim has been verified.

## Proposed public bios

**Short:** Devon Alan Akins is an independent software developer working across the web and Apple platforms, a writer, and a lifelong student of mathematics and science.

**Medium:** Devon Alan Akins builds software for the web and Apple platforms, writes, studies mathematics and physics, and is developing a long-form podcast. He also leads nonclinical operations and technology at Nona Neuropsychology. His independent projects range from accessible interfaces and personal tools to engineering integrity and open education.

**GitHub profile introduction:** I build software for the web and Apple platforms, explore scientific computing and AI infrastructure, and write. I try to make systems understandable, test their claims, document their limits, and keep them maintainable. My public repositories distinguish released work from prototypes and archived source.

Use the existing [profile repository](https://github.com/devonalanakins/devonalanakins) for any eventual profile README change. Retain its current source links, visual identity and separate project/privacy boundaries. Do not change the GitHub account biography, avatar, pinned repositories or repository permissions as a side effect of this website PR. Confirm each linked project's current status before a separate profile change.

## Portfolio architecture

1. The existing Work page introduces Apple development and links to the archived IREN source with its status. The existing About text and metadata acknowledge the practice; navigation, publication manifests and the other creator pages remain in place.
2. A future case study belongs within the existing `/work/` publication system only when a project has an approved public description, owner, platform, status, source or evidence link, privacy review and clear limitations. Use distinct labels for proposed, prototype, archived and released work. Do not generate fictional App Store links, screenshots, metrics or customer outcomes.
3. Dadog is a proposed personal iPhone application, specified separately in [DADOG-IPHONE-SPEC.md](DADOG-IPHONE-SPEC.md). Its specification is not a shipped app or a promise of an integration. Select an existing appropriate repository only after inspecting its current purpose and access; do not create infrastructure merely to start.
4. Keep the personal, ANEVUM and Nona contexts distinct. No private records, clinical data, credentials, internal project details or unpublished conversations belong in public portfolio material without explicit authorization.

## Review gates

- Review the proposed wording, source labeling and actual rendered mobile/desktop pages.
- Require exact-head website and Laboratory browser checks. A source commit or a green check alone is not deployment evidence.
- Obtain explicit approval before merging, publishing profile changes or running the protected production release. Verify the released revision, routes and existing privacy controls afterward.
