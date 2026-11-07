import { publicV5ProjectEvidence } from "./public-evidence.mjs";
import { publicV5ActivationMode } from "./source-activation.mjs";
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
  const relativeAge = (asOf: string, now: number) => {
    const seconds = Math.max(0, Math.floor((now - Date.parse(asOf)) / 1000));
    if (seconds < 60) return seconds + "s ago";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    return Math.floor(seconds / 86400) + "d ago";
  };
  const renderPublicEvidence = (snapshot: unknown, at: number) => {
    const projection = publicV5ProjectEvidence(snapshot, at);
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
      startLiveSignal(() => {}, (snapshot, at) => {
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
    mountDecorativeTerrain(terrain);
  }).catch(() => {});
}

export {};
