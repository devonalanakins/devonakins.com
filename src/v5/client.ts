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


const terrain = document.querySelector<HTMLElement>(".v5-lock-terrain");
if (terrain && window.innerWidth > 600) {
  // The GPU is an enhancement to the true semantic HTML markers, never a data
  // source. A failed WebGL import or context retains the SVG fallback.
  void import("./terrain-3d").then(({ mountDecorativeTerrain }) => {
    mountDecorativeTerrain(terrain);
  }).catch(() => {});
}

export {};
