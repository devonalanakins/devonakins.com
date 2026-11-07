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

const terrain = document.querySelector<HTMLElement>(".v5-lock-terrain");
if (terrain && window.innerWidth > 600) {
  // The GPU is an enhancement to the true semantic HTML markers, never a data
  // source. A failed WebGL import or context retains the SVG fallback.
  void import("./terrain-3d").then(({ mountDecorativeTerrain }) => {
    mountDecorativeTerrain(terrain);
  }).catch(() => {});
}

export {};
