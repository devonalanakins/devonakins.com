# DevonAkins.com — Public Website Experience Standard

Owner instruction: November 8, 2026. Scope: entire existing website, within the current repository and Cloudflare Worker. This is a design and acceptance contract for subsequent implementation, not a claim that every section has already been rebuilt.

## 1. Identity, promise, and vocabulary

The public brand is **Devon Alan Akins** / **DevonAkins.com**. This is a personal creative and engineering website, not a branded software product, operating system, technical demo, commercial consultancy landing page, or AI dashboard.

Visitor promise: meet the person, explore useful software and original writing, understand what is real, inspect the supporting evidence, and find a natural way to get in touch.

Public copy uses human nouns: Home, Work, Research, Writing, Notes, About, Activity, Systems Map, Listening, Measurements, Source, Contact. This is preferred navigation language, not permission to add duplicate top-level links.

**Do not display internal project/version nomenclature** in public titles, navigation, headings, hero labels, footers, cards, metadata, accessible labels, or snippets. Forbidden examples: The Living Mind, Living Mind V5, Live Signal, Live Signal V5, SIGNAL FIELD · V5, release V4/V5, R17/R20 and similar implementation/release tags. Technical identifiers may remain in source paths, internal docs, test fixtures, data attributes, health endpoints and deployment logs; those identifiers must not become visual copy. The existing /signal-field/ and other URLs remain valid even if the visible page name is Systems Map.

The phrases "live", "now", "running" and "active" should only be used for actually verified fresh activity. Otherwise write "recent", "recorded", "captured", "not connected", "not shared", "unavailable", or a dated status. Do not present the portfolio itself as current activity.

Example homepage text:
- Eyebrow: Independent developer · author · researcher
- H1: Devon Alan Akins
- Intro: "I build software, write stories, and explore ideas that connect technology, creativity, and everyday life."
- Primary action: Explore my work
- Secondary action: About me
- Observation label: Activity & sources (never an invented engine name)

## 2. Experience architecture

Three interwoven layers, each comprehensible alone:
1. **The person** — identity, perspective, writing, interests, method and contact.
2. **The work** — software, experiments, family creative worlds and separately bounded business operations.
3. **The evidence** — public source links, project stage, source dates, consent and reproducible engineering details.

First-time visitor should know who Devon is and how to explore within the first viewport. A developer should reach real code and current project status within two meaningful actions. A writing reader should reach an actual book/project page without wading through software jargon. A collaborator should find a real contact channel without a fabricated booking form.

### Primary navigation

Persistent global: Home / Work / Research / Writing / Notes / About. Utility: search, GitHub and Contact. Contextual: Activity, Systems Map, Listening, Measurements and Source. Anevum and Mizvo are strong featured project identities, not additional redundant global navigation systems.

Use ONE clear hierarchy. The expressive homepage side rail may remain as contextual shortcuts but must not fight with the global navigation or duplicate equal-priority lists. Desktop: slim fixed-height header, contextual links in content; mobile: compact brand/search/menu, one semantic accessible menu with >=44px targets. No scroll-jacking, non-dismissable overlays or double headers.

Permanent routes to preserve: /, /work/, /work/{approved-slug}/, /research/, /writing/, /knowledge/, /knowledge/{approved-topic}/, /about/, /studio/, /signal-field/, /listening/, /gpt/, /source/, /contact/, plus current legacy aliases and redirects. No new public repository discovery or automatic public indexing.

### Global search

Search only the existing approved public index: pages, projects, authored public notes and verified links. Results distinguish project, research, writing, note and navigation. Keyboard access via search button and optionally Cmd/Ctrl+K; Escape closes; focus restores; empty/no-result feedback is semantic. No private Knowledge queries, raw GitHub access or dynamic search of discovered accounts.

## 3. Visual system

Preserve the approved first-party portrait and copper/cyan atmospheric composition. Preserve original project identities, detailed spatial system art and dark cinematic visual language. Refine, do not replace with stock photography, generic glass dashboards, AI-generated project covers or an unrelated sci-fi theme.

- Base: near-black navy/charcoal; secondary panels in restrained midnight blue. Example design values: #071019 / #0D1A25. Exact production tokens come from current approved CSS.
- Main text: near-white blue neutral (#EAF1F3); secondary text: muted cool gray that passes contrast.
- Evidence / verified interaction: clear cyan/teal, used sparingly.
- Creative / narrative atmosphere: warm copper/amber, concentrated near portrait and editorial features.
- Violet: limited artistic accent in project visualizations, never as a status indicator without a legend.
- Error/warning and privacy states: separate explicit labels and semantics; never color-only.

Typography: confident modern sans for utility and navigation; high-quality, legible editorial serif for articles/writing; precise tabular numerals or a restrained mono for source dates and code. Use existing locally available font assets if possible, with reliable system fallbacks. No gratuitous all-caps technical dashboard labels. Text should read like a person's public website, not a development telemetry console.

Spatial language: restrained ambient light, precise soft panels, custom vector identity, softly layered dimensional geometry. Differentiation by page theme, not by unrelated redesign. Dynamic gradients respect contrast overlays and do not mask face, text or controls. Avoid fake terminals, meaningless numbers, particles behind reading paragraphs, decorative progress bars and unsupported indicators.

Layout: wide immersive homepage, 72–80ch maximum narrative text line lengths in reading areas, calm sectional rhythm, measured whitespace. Desktop content width responsive (target ~1280–1440px maximum depending on scene); fine-grained breakpoints. At 320px and 390px prioritize readable work/source labels, functioning controls and no horizontal scroll. Keep 44px touch targets and visible keyboard focus. Reduced motion removes ambient animation and preserves every task.

## 4. Route-by-route experience

### Home (/)

One distinguished portrait-led introduction rather than a wall of status widgets. First viewport: name, intelligible statement of purpose, real primary actions, concise visual identity, and small, source-qualified activity/listening/measurement views. Never say "I'm coding" without fresh, separately verified evidence. Show genuine quiet/offline/hidden states.

Below: five established featured public works with differentiated first-party iconography, real one-line purpose, accurate stage and an obvious detail action. No claim that they are all actively being developed at that instant. A compact evidence/history area distinguishes GitHub event dates, publicly shared activity and owner-entered captures. The lower dimensional Systems Map is an invitation to explore reviewed relationships, not a fake active system diagram.

Footer: "Devon Alan Akins", a concise human sentence, useful links, public source/privacy policy. No release number, internal system title or fake running status.

### Work directory (/work/)

Hero: "Things I build". Searchable/filterable existing approved portfolio; arrange by useful function (Software, Research, Creative, Operations) and evidence-backed maturity rather than artificial hype. Featured and regular cards should not all look like a generic dashboard.

Cards: original illustration/mark, name, one-sentence benefit, accurate stage, small meaningful tags and a link. Status is dated or qualified where necessary. A project's mere existence is not evidence of deployed availability.

### Project details (/work/{slug}/)

Every approved project receives a differentiated but consistent narrative:
- What it is and who it serves, in non-technical language first.
- Current stage: research, private prototype, reviewed draft, deployed, preserved legacy, etc., only after verification.
- Actual first-party imagery: screenshots only if the product exists and public rights are confirmed, otherwise clearly abstract original art.
- How it works, evidence/source links and meaningful limitations.
- Timeline/milestones with dates only for independently attested records.
- Next meaningful acceptance, related research/notes and one appropriate outbound action.

Some projects are not software products. Writing and Anevum need editorial presentation; business operations remain deliberately private. Public source does not entitle visitors to client systems or private repositories.

### Systems Map (/signal-field/)

Human label "Systems Map" or "Connections"; preserve /signal-field/ as URL and existing implementation contracts. The Three.js world is optional spatial exploration of the reviewed public graph, never an activity simulator. Fixed reviewed identities, dated milestones, typed links, explicit provenance, current-source overlay only with consent. Side explorer/search, contextual inspector, date replay with plain explanation, keyboard/camera controls, 2D semantic index and functional no-JS fallback. Stable node positions, pause when hidden, restore on context loss/BFCache. Historical display never rewrites yesterday based on today's unrelated activity.

### Research (/research/)

Editorial research collection, not a general list of projects. Each inquiry is structured: question -> why it matters -> approach -> artifact/protocol -> results (or "not evaluated") -> limitations -> replication -> next hypothesis. Keep original Rhen/Vesper research and current approved notes; do not add unreviewed newly created repos until separate public approval. Never claim a breakthrough, peer review, benchmarking superiority or novel discovery without evidence.

### Writing (/writing/)

An actual author page. Clearly separate a previously published work being revised, unreleased manuscripts, and Anevum fiction/worldbuilding. Lead with real approved book title/cover/edition history only when verified; otherwise present accurate copy and restrained original editorial motifs, no invented cover or "Buy" button. Reading excerpts, revision notes and a clean accessible reading mode only after public-rights review. Warm subtle copper atmosphere and long-form readability take precedence over busy 3D effects.

### Notes / public Knowledge (/knowledge/ and topic routes)

A curated public reading room of authored explanations. Do not connect private DevonStation Knowledge records directly. Topic grid with short contextual descriptions, article page with useful headings, verifiable source links, related notes/backlinks, last-reviewed dates if actual, and meaningful onward journeys. Avoid filler cards. The published three-note baseline remains valid; additions need explicit public review. Source documentation labels should be human-readable and must not advertise API/version codenames.

### About (/about/)

A complete candid human biography rather than a two-card placeholder or a self-link. This page answers: Who am I? What do I make? What is my working philosophy? What interests shape the work? How can someone reach me? Use approved portrait; authentic education/history only where verified; thoughtful family reference without children/family privacy disclosures; original values framed through actual behavior and evidence. Distinct sections, selected milestones with dates if verified, and a real Contact action.

### Activity (/studio/)

Preserve existing source/control behavior but publicly label the route "Activity". Distinct independently sourced rails for editor observation, participating remote tasks, GitHub events, listening and dated GPT captures. Time is explicit. Connection pending, source private, source stale, provider unavailable, current observation and historical event must be visually distinguishable. No invented activity or activity inferred from Spotify playback. Owner-only pairing and disclosure controls remain behind authentication.

### Listening (/listening/)

A deliberate music/journal surface. Consent-first playback projection, actual artist/track/artwork/Spotify links only when authorized, paused/unavailable/disconnected/hidden states without pretending playback, optional curated collections. Do not autoplay audio or require login to see the public page. Preserve owner controls and rights boundaries.

### Measurements (/gpt/)

A transparent page for dated owner-entered ChatGPT/Codex profile observations. Distinguish personal profile, managed-workspace captures, API billing and historical archives by real source/scope. Display exact capture date, sharing state and unavailable readings. No live counters, interpolated tokens, fabricated activity or inferred current streak. Preserve working private owner form and atomic save flow.

### Source (/source/)

A human-readable open-source/provenance destination: what code is published, which original assets can be used, how source links correspond to actual projects, how the site distinguishes verified events from claims, and where to inspect GitHub. Keep technical details optional and readable; preserve functional V4 route until updated.

### Contact (/contact/)

Minimal, authentic contact surface. Use only confirmed public channels and approved links. Distinguish collaboration, writing and general correspondence without inventing booking availability or client intake. No fake form submission; retain existing working destination or introduce a verified secure backend only as a separate authorized build. No client/patient material solicited.

## 5. Shared interaction language

- Navigation and state changes should have clear cause and effect. Basic links work without JavaScript.
- Transition hierarchy: ~150–250ms micro-interaction, slower ambient movement only when meaningful; no mandatory loading animation or page-capture gimmick.
- Search, filters, camera, disclosures and menus all support keyboard, screen reader, focus restore, touch and pointer.
- Activity freshness must not be refreshed simply because the website polls. An unavailable source clears misleading "current" badges.
- Provide honest alternatives for unsupported WebGL, offline, provider failure, low-power and reduced-motion states.
- Layout shift should remain minimal, long-form pages remain comfortably readable, and inactive canvases must release GPU resources.
- No external ad trackers, third-party page builders, unnecessary polling or new auth/vendor dependency for visual redesign.

## 6. Component architecture

Reuse current Vite/TypeScript, static HTML generator, Cloudflare Worker, first-party illustrations and access-controlled source models. Define reusable global header, mobile menu, footer, page hero, editorial article, project card, project evidence panel, source-state badge, related-content module, accessible inspector and contextual section transitions. Use one responsive token set across new and legacy routes. No direct private Knowledge integration.

Keep public route content keyed to approved static entries and links. Maintain canonical metadata, robots/sitemap, one semantic h1, social previews and page-specific titles. Do not expose internal release names via document title, OG metadata or textual accessibility labels.

## 7. Acceptance contract

- **Scope:** preserve all 22 reviewed V5 routes and five legacy functional routes; preserve public graph roots/history and existing static-source approval boundaries. No automatic publication of additional repos.
- **Comprehension:** a nontechnical visitor can understand page purpose and find a relevant action immediately, without knowing project acronyms.
- **Visual:** desktop 1440/1199/1024, tablet and 390/375/320 phone evidence; portrait not replaced; no clipped or ellipsized source qualifications; no horizontal overflow; intentional typography and consistent margins.
- **Accessibility:** WCAG 2.2 AA minimum; 44px target goal for touch, focus, headings, labels, contrast, screen-reader text index, reduced motion and keyboard map navigation.
- **Performance:** strive for Core Web Vitals good thresholds (LCP <=2.5s, INP <=200ms, CLS <=0.1 at 75th percentile) with measured device profiles, not asserted performance without measurements.
- **Security/privacy:** no private account values, credentials, private Knowledge, client information, raw provider events or invented source state. Consent and revocation remain fail-closed. Test both known live observations and unavailable states.
- **Language regression:** reject forbidden release/engine labels in rendered public headings, navigation, footers, document titles and social meta; retain technical identifiers in scripts/tests only.
- **Release:** normal branch/PR tests and independent screenshot review, protected V5 variant deployment with exact merge SHA and production verification, plus rollback.

## 8. Delivery boundary and ordered implementation

This document is the site-wide design baseline, not evidence of completed redesign. Keep the current verified production release serving until a tested, protected update.

1. **Copy and navigation cleanup:** remove public release/engine branding and enforce a rendered-text regression; no route/data changes.
2. **Shared shell and About:** consolidate navigation, editorial style and full biography; fix About self-link; verify desktop/mobile/a11y.
3. **Work and project stories:** craft meaningful distinct detail layouts without changing approved project catalog.
4. **Writing, Research and Notes:** genuine editorial hierarchy, evidence and source links; no invented media.
5. **Legacy modernization:** Activity, Listening, Measurements, Source and Contact all use same site design while retaining their working owner/auth/data paths.
6. **Whole-site visual and privacy acceptance:** mobile/iPhone when available, contrast, screenshots, end-to-end flows, 22-route exact-head and protected production release.

Later approved integrations and new repositories are separate proposals, not prerequisites to a coherent public website.

## 9. Status vocabulary

Use: DESIGN APPROVED (only when owner explicitly accepts), SOURCE IMPLEMENTED, CI VERIFIED, PRODUCTION DEPLOYED, LIVE VERIFIED, INTENTIONALLY DISCONNECTED, and DEFERRED. No untested pages called finished. No automatic work claimed outside actually configured automation.
