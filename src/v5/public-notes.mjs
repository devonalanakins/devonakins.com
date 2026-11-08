/** Authored explanations of this public repository, never private Knowledge. */
export const publicNotes = Object.freeze([
  {
    slug: "sources-and-meaning",
    title: "What a live signal actually means",
    kind: "Engineering explanation",
    topic: "Evidence & observation",
    summary:
      "An editor observation, a build and a listening session answer different questions.",
    sections: [
      [
        "Observation has a scope",
        "A recent focused edit can support an editor-presence claim for an approved project. A commit records a repository event. A CI result records a particular check. None establishes the others, and none by itself proves what is serving in production.",
      ],
      [
        "Freshness is part of the value",
        "A timestamp and an expiry belong to an observation. Once its permitted window closes, the interface clears that current-work claim. Historical events remain explicitly historical; polling does not give them a new observation date.",
      ],
      [
        "Quiet is useful information",
        "A quiet, disconnected or private source is a valid state. The site does not turn Spotify playback into evidence of coding, or a missing reporter into a claim that no work exists.",
      ],
    ],
    sources: [
      ["Source-qualified V4 read model", "src/live-signal.mjs"],
      ["Public evidence projection", "src/v5/public-evidence.mjs"],
    ],
    related: ["public-and-private", "replaying-a-record"],
  },
  {
    slug: "public-and-private",
    title: "Publishing a view, keeping a boundary",
    kind: "Architecture explanation",
    topic: "Privacy & publication",
    summary:
      "A public portfolio can describe a project without exposing the systems behind it.",
    sections: [
      [
        "Discovery does not grant publication",
        "The owner can discover repositories privately and separately approve public identities. Knowing a repository exists is not permission to display its name, contents or activity.",
      ],
      [
        "Reduce before rendering",
        "Public clients consume a reduced server projection. Source credentials and private provider responses stay outside that projection. Sharing choices are enforced by the server, including when a source is disabled.",
      ],
      [
        "This is a curated reading room",
        "These notes are authored from the website's public source. They do not query the private Knowledge workspace. Publishing a private page or collection requires a separate explicit decision.",
      ],
    ],
    sources: [
      ["Repository consent and webhook handling", "src/github-integration.mjs"],
      ["Public presence preferences", "src/presence-preferences.mjs"],
    ],
    related: ["sources-and-meaning", "replaying-a-record"],
  },
  {
    slug: "replaying-a-record",
    title: "History without invented growth",
    kind: "Engineering explanation",
    topic: "Systems & history",
    summary:
      "The Signal Field separates a curated directory, reviewed structural changes and temporary activity.",
    sections: [
      [
        "A directory is not a launch history",
        "The public directory names approved projects. Its presence in an old date view does not establish that those projects existed on that date. Reviewed dated milestones provide the structural history.",
      ],
      [
        "Replay an ordered record",
        "The graph model validates an ordered manifest of publish and retire actions. Each record carries an effective date and evidence and review links. Invalid chains fail closed; later events do not silently rewrite earlier views.",
      ],
      [
        "Geometry has a legend",
        "A decorative tower or halo adds visual depth. It does not count software components. Only independently reviewed structural records can introduce semantic entities or relationships; activity events cannot create them.",
      ],
    ],
    sources: [
      ["Versioned public graph", "src/v5/public-graph-history.mjs"],
      ["Atlas layout and provenance", "src/v5/atlas-layout.mjs"],
    ],
    related: ["sources-and-meaning", "public-and-private"],
  },
]);
