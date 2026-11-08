import { publicV5ProjectEvidence } from "./public-evidence.mjs";
import { publicV5Playback } from "./public-playback.mjs";
import { publicV5GptCapture, formatPublicGptValue, publicGptCapturedAt } from "./public-gpt-capture.mjs";
import { publicV5Threads, threadsPublicDate } from "./public-threads.mjs";
import { publicV5ActivationMode } from "./source-activation.mjs";
import { publicV5TerrainStates } from "./field-terrain-state.mjs";
const menu = document.querySelector<HTMLDetailsElement>("[data-mobile-menu]");
menu?.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.open) {
    menu.open = false;
    menu.querySelector("summary")?.focus();
  }
});
// Native details/navigation work without JS. No data polling, motion or storage.


// Search is a local, accessible projection of the existing approved public
// portfolio. It never fetches private repository inventories or provider data.
const searchButton = document.querySelector<HTMLButtonElement>("[data-v5-search-toggle]");
const searchPanel = document.querySelector<HTMLElement>("[data-v5-search-panel]");
const searchInput = document.querySelector<HTMLInputElement>("[data-v5-search-input]");
const searchRows = Array.from(document.querySelectorAll<HTMLElement>("[data-v5-search-item]"));
const searchEmpty = document.querySelector<HTMLElement>("[data-v5-search-empty]");
const setSearchOpen = (open: boolean) => {
  if (!searchPanel || !searchButton) return;
  searchPanel.hidden = !open;
  searchButton.setAttribute("aria-expanded", String(open));
  if (open) searchInput?.focus();
  else searchButton.focus();
};
searchButton?.addEventListener("click", () => setSearchOpen(Boolean(searchPanel?.hidden)));
searchInput?.addEventListener("input", () => {
  const term = searchInput.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const row of searchRows) {
    row.hidden = !row.dataset.searchText?.includes(term);
    if (!row.hidden) count += 1;
  }
  if (searchEmpty) searchEmpty.hidden = count !== 0;
});
searchPanel?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    setSearchOpen(false);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (
    searchPanel && !searchPanel.hidden &&
    event.target instanceof Node &&
    !searchPanel.contains(event.target) &&
    !searchButton?.contains(event.target)
  ) setSearchOpen(false);
});



// Public catalog metadata is already rendered by the server from approved
// content. No provider requests, project inference, or private wiki access.
const field = document.querySelector<HTMLElement>(".v5-lock-field");
const inspector = field?.querySelector<HTMLElement>("#v5-field-inspector");
const fieldLinks = Array.from(field?.querySelectorAll<HTMLAnchorElement>("[data-v5-field-node]") ?? []);
type TerrainActivity = Readonly<Record<string, "editor" | "remote">>;
let latestTerrainActivity: TerrainActivity = Object.create(null);
let setTerrainActivity: ((states: TerrainActivity) => void) | null = null;
const inspectorClose = inspector?.querySelector<HTMLButtonElement>("[data-v5-field-close]");
const inspectorTitle = inspector?.querySelector<HTMLElement>("[data-v5-field-title]");
const inspectorSummary = inspector?.querySelector<HTMLElement>("[data-v5-field-summary]");
const inspectorStatus = inspector?.querySelector<HTMLElement>("[data-v5-field-status]");
const inspectorSource = inspector?.querySelector<HTMLElement>("[data-v5-field-source]");
const inspectorOpen = inspector?.querySelector<HTMLAnchorElement>("[data-v5-field-open]");
let selectedFieldLink: HTMLAnchorElement | null = null;
const closeInspector = () => {
  if (!inspector || inspector.hidden) return;
  inspector.hidden = true;
  fieldLinks.forEach(link => link.setAttribute("aria-expanded", "false"));
  const previouslySelected = selectedFieldLink;
  selectedFieldLink = null;
  previouslySelected?.focus();
};
field?.addEventListener("click", (event) => {
  if (!(event instanceof MouseEvent) || !(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>("[data-v5-field-node]");
  if (!link || !field?.contains(link) || !inspector || !inspectorTitle ||
      !inspectorSummary || !inspectorStatus || !inspectorSource || !inspectorOpen ||
      event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey ||
      event.shiftKey || event.defaultPrevented) return;
  event.preventDefault();
  if (selectedFieldLink === link && !inspector.hidden) {
    closeInspector();
    return;
  }
  inspectorTitle.textContent = link.dataset.v5FieldTitle ?? link.textContent?.trim() ?? "";
  inspectorSummary.textContent = link.dataset.v5FieldSummary ?? "";
  inspectorStatus.textContent = link.dataset.v5FieldStatus ?? "Not published";
  inspectorSource.textContent = "SOURCE · " + (link.dataset.v5FieldSource ?? "Public portfolio");
  inspectorOpen.href = link.href;
  fieldLinks.forEach(node => node.setAttribute("aria-expanded", node === link ? "true" : "false"));
  selectedFieldLink = link;
  inspector.hidden = false;
  inspectorTitle.focus();
});
inspectorClose?.addEventListener("click", closeInspector);
inspector?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeInspector();
  }
});

// Preview-only source check. The existing V4 polling client supplies the
// consent-filtered read model. No additional poller, publisher or owner API.
const publicPreviewButton = document.querySelector<HTMLButtonElement>("[data-v5-preview-connect]");
const publicPreviewStatus = document.querySelector<HTMLElement>("[data-v5-preview-source-state]");
const activationMode = publicV5ActivationMode(
  window.location.pathname,
  document.documentElement.dataset.v5SignalMode,
);
if (field && (publicPreviewButton || activationMode === "automatic")) {
  if (activationMode === "manual-preview" && publicPreviewButton) {
    publicPreviewButton.hidden = false;
  }
  let started = false;
  let latestV4: unknown = null;

  const spotifyLink = document.querySelector<HTMLAnchorElement>(".v5-lock-spotify");
  const spotifyTitle = spotifyLink?.querySelector<HTMLElement>("[data-v5-spotify-title]");
  const spotifyArtist = spotifyLink?.querySelector<HTMLElement>("[data-v5-spotify-artist]");
  const spotifyCover = spotifyLink?.querySelector<HTMLImageElement>("[data-v5-spotify-cover]");
  const spotifyProgress = spotifyLink?.querySelector<HTMLProgressElement>("[data-v5-spotify-progress]");
  const renderSpotify = (value: unknown) => {
    if (!spotifyLink) return;
    const details = publicV5Playback(value, Date.now());
    spotifyLink.dataset.v5SpotifyState = details.state;
    spotifyLink.href = details.href;
    if (spotifyTitle) spotifyTitle.textContent = details.title;
    if (spotifyArtist) spotifyArtist.textContent = details.artist;
    if (spotifyCover) {
      if (details.image) {
        if (spotifyCover.getAttribute("src") !== details.image)
          spotifyCover.src = details.image;
        spotifyCover.hidden = false;
      } else {
        spotifyCover.hidden = true;
        spotifyCover.removeAttribute("src");
      }
    }
    if (spotifyProgress) {
      spotifyProgress.hidden = !details.progress;
      spotifyProgress.max = details.progress?.max || 1;
      spotifyProgress.value = details.progress?.value || 0;
    }
  };

  // Owner-entered GPT measurements are read exclusively from the approved
  // public V4 projection. No new fetch, stored credential or token estimate.
  const gptPanel = document.querySelector<HTMLElement>("[data-v5-gpt-capture]");
  const gptEmpty = document.querySelector<HTMLElement>("[data-v5-gpt-empty]");
  const gptPrimary = gptPanel?.querySelector<HTMLElement>("[data-v5-gpt-primary]");
  const gptLabel = gptPanel?.querySelector<HTMLElement>("[data-v5-gpt-primary-label]");
  const gptTime = gptPanel?.querySelector<HTMLTimeElement>("[data-v5-gpt-time]");
  const gptRows = gptPanel?.querySelector<HTMLUListElement>("[data-v5-gpt-readings]");
  const renderPublicGpt = (gpt: unknown, at: number) => {
    const capture = publicV5GptCapture(gpt, at);
    if (gptPanel) gptPanel.hidden = !capture.available;
    if (gptEmpty) gptEmpty.hidden = capture.available;
    if (!capture.available) {
      if (gptPrimary) gptPrimary.textContent = "";
      if (gptLabel) gptLabel.textContent = "";
      if (gptTime) { gptTime.textContent = ""; gptTime.removeAttribute("datetime"); }
      gptRows?.replaceChildren();
      return;
    }
    const featured = capture.headline;
    if (gptPrimary) {
      gptPrimary.textContent = featured
        ? formatPublicGptValue(featured, true)
        : "No shared 7-day token capture";
      if (featured) gptPrimary.setAttribute(
        "aria-label", formatPublicGptValue(featured) + " personal-profile tokens recorded over 7 days",
      );
      else gptPrimary.removeAttribute("aria-label");
    }
    if (gptLabel) gptLabel.textContent = featured
      ? "Personal-profile 7-day tokens · " +
        (featured.freshness === "historical" ? "Historical" : "Owner capture")
      : "Other approved GPT measurements";
    if (gptTime) {
      gptTime.textContent = featured ? "Captured " + publicGptCapturedAt(featured.asOf) : "";
      if (featured) gptTime.dateTime = featured.asOf;
      else gptTime.removeAttribute("datetime");
    }
    const rows = capture.readings.filter((r) => r.metric !== "profile_7d_tokens");
    if (gptRows) gptRows.replaceChildren(...rows.map(r => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      const amount = document.createElement("strong");
      const captured = document.createElement("time");
      label.textContent = r.label + " · " + r.scope;
      amount.textContent = formatPublicGptValue(r, true) + " " + r.unit;
      amount.setAttribute("aria-label",
        formatPublicGptValue(r) + " " + r.unit + " · " + r.label);
      captured.dateTime = r.asOf;
      captured.textContent = "Captured " + publicGptCapturedAt(r.asOf) +
        " · " + (r.freshness === "historical" ? "Historical" : "Owner capture");
      item.append(label, amount, captured);
      return item;
    }));
  };


  const threadsStatus = document.querySelector<HTMLElement>("[data-v5-threads-status]");
  const threadsEmpty = document.querySelector<HTMLElement>("[data-v5-threads-empty]");
  const threadsFeed = document.querySelector<HTMLElement>("[data-v5-threads-feed]");
  const threadsPosts = document.querySelector<HTMLUListElement>("[data-v5-threads-posts]");
  const threadsChecked = document.querySelector<HTMLTimeElement>("[data-v5-threads-checked]");
  const renderPublicThreads = (snapshot: unknown, at: number) => {
    const feed = publicV5Threads(snapshot, at);
    if (threadsStatus) threadsStatus.textContent = feed.connected
      ? "SOURCE CONNECTED" : "CONNECTION PENDING";
    if (threadsFeed) threadsFeed.hidden = !feed.connected;
    if (threadsEmpty) {
      threadsEmpty.hidden = feed.connected;
      if (!feed.connected) threadsEmpty.textContent =
        "Public Threads posts will appear only through a permitted integration after account authorization and publication review.";
    }
    if (!feed.connected) {
      threadsPosts?.replaceChildren();
      if (threadsChecked) {
        threadsChecked.textContent = "";
        threadsChecked.removeAttribute("datetime");
      }
      return;
    }
    if (threadsChecked && feed.checkedAt) {
      threadsChecked.dateTime = feed.checkedAt;
      threadsChecked.textContent = "checked " + threadsPublicDate(feed.checkedAt);
    }
    if (!threadsPosts) return;
    if (!feed.posts.length) {
      const noPosts=document.createElement("li");
      noPosts.textContent="No public posts available from the authorized account.";
      threadsPosts.replaceChildren(noPosts);
      return;
    }
    threadsPosts.replaceChildren(...feed.posts.map(post => {
      const item=document.createElement("li");
      const link=document.createElement("a");
      const date=document.createElement("time");
      link.href=post.href;
      link.target="_blank";
      link.rel="noopener noreferrer";
      link.textContent=post.text;
      link.setAttribute("aria-label","Open original Threads post: " + post.text.slice(0,75));
      date.dateTime=post.publishedAt;
      date.textContent="Posted " + threadsPublicDate(post.publishedAt);
      item.append(link,date);
      return item;
    }));
  };

  const relativeAge = (asOf: string, now: number) => {
    const seconds = Math.max(0, Math.floor((now - Date.parse(asOf)) / 1000));
    if (seconds < 60) return seconds + "s ago";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    return Math.floor(seconds / 86400) + "d ago";
  };
  const renderPublicEvidence = (snapshot: unknown, at: number) => {
    const projection = publicV5ProjectEvidence(snapshot, at);
    latestTerrainActivity = publicV5TerrainStates(projection);
    setTerrainActivity?.(latestTerrainActivity);
    const publicGpt = projection.available && snapshot && typeof snapshot === "object"
      && "gpt" in snapshot ? (snapshot as { gpt?: unknown }).gpt : null;
    renderPublicGpt(publicGpt, at);
    renderPublicThreads(projection.available ? snapshot : null, at);
    if (publicPreviewStatus) publicPreviewStatus.textContent = projection.available
      ? "Public V4 source checked · consented evidence only"
      : "Public source unavailable, disabled or stale";

    for (const node of fieldLinks) {
      const entry = projection.nodes[node.dataset.v5FieldSlug ?? ""];
      if (entry?.active) node.dataset.v5Verified = entry.active.kind;
      else delete node.dataset.v5Verified;
    }
    const active = Object.entries(
      projection.nodes as Record<string, {
        active?: { kind: string; source: string; at: string } | null;
      }>,
    ).flatMap(([slug, entry]) => entry?.active ? [{ slug, ...entry.active }] : [])
      .sort((a, b) =>
        (a.kind === "editor" ? -1 : 0) - (b.kind === "editor" ? -1 : 0) ||
        Date.parse(b.at) - Date.parse(a.at),
      );
    const summary = document.querySelector<HTMLElement>("[data-v5-work-summary]");
    const provenance = document.querySelector<HTMLElement>("[data-v5-work-provenance]");
    const top = active[0];
    if (summary) summary.textContent = top
      ? fieldLinks.find(link => link.dataset.v5FieldSlug === top.slug)
          ?.dataset.v5FieldTitle || "Verified public project"
      : "No fresh, verified public work";
    if (provenance) provenance.textContent = top
      ? top.source + " · " + relativeAge(top.at, at)
      : projection.available
        ? "No recent approved editor or runner activity"
        : "Source unavailable or sharing disabled";

    const recent = projection.recent[0];
    const github = document.querySelector<HTMLElement>("[data-v5-github-summary]");
    if (github) github.textContent = recent
      ? (fieldLinks.find(node => node.dataset.v5FieldSlug === recent.slug)
          ?.dataset.v5FieldTitle || recent.slug) + " · " + recent.kind + " · " +
        relativeAge(recent.at, at) + " · Public GitHub history"
      : "No approved public GitHub history within the verified window";

    const line = inspector?.querySelector<HTMLElement>("[data-v5-field-evidence]");
    if (line && selectedFieldLink && inspector && !inspector.hidden) {
      const info = projection.nodes[selectedFieldLink.dataset.v5FieldSlug ?? ""];
      const message = info?.active
        ? info.active.source + " · observed " + relativeAge(info.active.at, at)
        : info?.lastEvent
          ? "Public GitHub " + info.lastEvent.kind + " · " +
            relativeAge(info.lastEvent.at, at) + " · history, not current work"
          : "";
      line.hidden = !message;
      line.textContent = message;
    }
  };
  field.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-v5-field-node]")) {
      // The existing node handler runs first, without fabricating evidence.
      renderPublicEvidence(latestV4, Date.now());
    }
  });
  const startPublicReader = async () => {
    if (started) return;
    started = true;
    if (publicPreviewButton) {
      publicPreviewButton.disabled = true;
      publicPreviewButton.textContent = "Public source preview enabled";
    }
    if (publicPreviewStatus) publicPreviewStatus.textContent = "Reading existing public V4 source…";
    try {
      const { startLiveSignal } = await import("../live-signal-client");
      startLiveSignal(renderSpotify, (snapshot, at) => {
        latestV4 = snapshot;
        renderPublicEvidence(snapshot, at);
      });
    } catch {
      if (publicPreviewStatus) publicPreviewStatus.textContent = "Public source preview unavailable";
    }
  };
  // The future reviewed public V5 homepage may opt into automatic,
  // read-only V4 source initialization. Preview remains manual and cannot
  // flip this mode through a URL query; server consent still gates data.
  if (activationMode === "automatic") {
    void startPublicReader();
  } else if (activationMode === "manual-preview") {
    publicPreviewButton?.addEventListener("click", () => { void startPublicReader(); });
  }
}


const terrain = document.querySelector<HTMLElement>(".v5-lock-terrain");
if (terrain && window.innerWidth > 600) {
  // The GPU is an enhancement to the true semantic HTML markers, never a data
  // source. A failed WebGL import or context retains the SVG fallback.
  void import("./terrain-3d").then(({ mountDecorativeTerrain }) => {
    const controller = mountDecorativeTerrain(terrain);
    setTerrainActivity = controller.setEvidence;
    // A verified V4 update may arrive while the optional GPU module loads.
    // Recheck the most recent projection instead of preserving a stale state.
    controller.setEvidence(latestTerrainActivity);
    const onTerrainPageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        controller.dispose();
        setTerrainActivity = null;
        window.removeEventListener("pagehide", onTerrainPageHide);
      }
    };
    window.addEventListener("pagehide", onTerrainPageHide);
  }).catch(() => {
    // Semantic links and their source-qualified states remain usable.
    setTerrainActivity = null;
  });
}


if (document.querySelector("[data-v5-atlas]")) {
  // Source-free directory filters work independently of optional WebGL.
  void import("./atlas-explorer-client.mjs").then(({ mountPublicAtlasExplorer }) => {
    mountPublicAtlasExplorer();
  }).catch(() => {
    // The server-rendered public index remains usable without scripts.
  });
  // PR #68's full-screen 3D atlas, reconciled with R15/R16 dated public history.
  // Same local first-party vetted manifest as the semantic index; zero fetches.
  void import("./atlas-client").then(({ mountV5Atlas }) => {
    mountV5Atlas();
  }).catch(() => {
    const host = document.querySelector<HTMLElement>("[data-v5-atlas-host]");
    const state = document.querySelector<HTMLElement>("[data-v5-atlas-status]");
    if (host) host.dataset.v5AtlasFallback = "true";
    if (state) state.textContent =
      "Optional 3D renderer could not load. The public index remains accessible.";
  });
}

export {};

// One public portfolio, filtered locally; no provider or private inventory read.
const directoryControls = document.querySelector<HTMLElement>("[data-v5-directory-controls]");
if (directoryControls) {
  const input = directoryControls.querySelector<HTMLInputElement>("[data-v5-project-search]");
  const category = directoryControls.querySelector<HTMLSelectElement>("[data-v5-project-category]");
  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-v5-project-card]"));
  const count = directoryControls.querySelector<HTMLElement>("[data-v5-project-count]");
  const empty = document.querySelector<HTMLElement>("[data-v5-project-empty]");
  const filter = () => {
    const term = (input?.value ?? "").trim().toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      card.hidden = !(card.dataset.searchText ?? "").includes(term) ||
        Boolean(category?.value && category.value !== card.dataset.projectCategory);
      if (!card.hidden) visible++;
    }
    if (count) count.textContent = visible + " of " + cards.length + " public projects";
    if (empty) empty.hidden = visible > 0;
  };
  directoryControls.hidden = false;
  directoryControls.addEventListener("submit", event => event.preventDefault());
  input?.addEventListener("input", filter);
  category?.addEventListener("change", filter);
  filter();
}

// Preserve bookmarked V4 section fragments when the full V5 home is selected.
if (window.location.pathname === "/" &&
    document.documentElement.dataset.v5SignalMode === "released-v5" &&
    document.querySelector('a[href="/signal-field/"]')) {
  const legacyDestinations: Record<string,string> = {
    "#work":"/work/", "#writing":"/writing/", "#research":"/research/",
    "#contact":"/contact/", "#listening":"/listening/",
  };
  const followLegacyHash = () => {
    const destination = legacyDestinations[window.location.hash];
    if(destination) window.location.replace(destination);
  };
  window.addEventListener("hashchange",followLegacyHash);
  followLegacyHash();
}
