/**
 * Accessible, optional source-free explorer controls for the reviewed V5 atlas.
 * Only filters the existing signed-off public projection; it never discovers
 * projects or writes activity state. Works when WebGL is unavailable.
 */
import { publicAtlasVisibleSlice, ATLAS_DISPLAY_LAYERS } from "./atlas-explorer-model.mjs";
import { replayPublicGraphHistory } from "./public-graph-history.mjs";
import { projectV5Atlas } from "./atlas-layout.mjs";

export function mountPublicAtlasExplorer() {
  const root = document.querySelector("[data-v5-atlas]");
  if (!root) return () => {};
  const instant = Date.parse(root.dataset.v5AtlasAt || "");
  const graph = projectV5Atlas(replayPublicGraphHistory(undefined, instant));
  if (!graph.valid || graph.revision !== Number(root.dataset.v5AtlasRevision) ||
      graph.version !== Number(root.dataset.v5AtlasVersion)) return () => {};
  const section = root.querySelector("[data-v5-atlas-controls]");
  const search = root.querySelector("[data-v5-atlas-search]");
  const checkboxes = Array.from(root.querySelectorAll("[data-v5-atlas-layer]"));
  const count = root.querySelector("[data-v5-atlas-filter-count]");
  const index = Array.from(root.querySelectorAll("[data-v5-atlas-node-id]"));
  const shortcuts = Array.from(root.querySelectorAll("[data-v5-atlas-select]"));
  const spotlight = root.querySelector("[data-v5-atlas-spotlight]");
  const profileTemplates = new Map(Array.from(
    root.querySelectorAll("template[data-v5-atlas-profile]"),
    template => [template.dataset.v5AtlasProfile, template],
  ));
  const resetSpotlight = () => {
    if (!spotlight) return;
    delete spotlight.dataset.v5AtlasSelected;
    const prompt = document.createElement("p");
    prompt.textContent = "Select a public system from the directory to inspect its curated overview. " +
      "Portfolio descriptions are not live activity or feature-verification evidence.";
    spotlight.replaceChildren(prompt);
  };
  const updateSpotlight = id => {
    if (!spotlight || typeof id !== "string" ||
        !index.some(item => item.dataset.v5AtlasNodeId === id && !item.hidden)) return;
    const template = profileTemplates.get(id);
    if (!template || !template.content) return;
    spotlight.replaceChildren(template.content.cloneNode(true));
    spotlight.dataset.v5AtlasSelected = id;
  };
  if (!section || !search || !count || !spotlight ||
      profileTemplates.size !== 8 ||
      checkboxes.length !== ATLAS_DISPLAY_LAYERS.length ||
      !ATLAS_DISPLAY_LAYERS.every(key => checkboxes.some(c => c.dataset.v5AtlasLayer === key)))
    return () => {};

  // Preserve the no-JS directory and native links until the enhancer is ready.
  section.hidden = false;
  const apply = () => {
    const enabled = Object.fromEntries(checkboxes.map(c => [c.dataset.v5AtlasLayer, c.checked]));
    const slice = publicAtlasVisibleSlice(graph, { search: search.value, ...enabled });
    const visible = new Set(slice.nodeIds);
    for (const detail of index) {
      const showing = visible.has(detail.dataset.v5AtlasNodeId);
      detail.hidden = !showing;
      if (!showing) detail.open = false;
    }
    for (const shortcut of shortcuts) {
      const li = shortcut.closest("li");
      if (li) li.hidden = !visible.has(shortcut.dataset.v5AtlasSelect);
    }
    count.textContent = slice.count + " approved visible public structures · no live connection implied";
    if (spotlight.dataset.v5AtlasSelected &&
        !visible.has(spotlight.dataset.v5AtlasSelected)) resetSpotlight();
    root.dispatchEvent(new CustomEvent("v5-atlas-filter", {
      detail: { nodeIds: slice.nodeIds, linkIndexes: slice.linkIndexes },
    }));
  };
  const onSelect = event => {
    const anchor = event.target instanceof Element
      ? event.target.closest("[data-v5-atlas-select]") : null;
    if (!anchor) return;
    const id = anchor.dataset.v5AtlasSelect;
    const detail = index.find(item => item.dataset.v5AtlasNodeId === id);
    if (detail && !detail.hidden) {
      detail.open = true;
      // Keep the ordinary fragment link operational without JavaScript.
      detail.querySelector("summary")?.focus();
      updateSpotlight(id);
    }
  };
  const onDisclosure = event => {
    const detail = event.target;
    if (detail instanceof HTMLDetailsElement && detail.open &&
        detail.hasAttribute("data-v5-atlas-node-id")) {
      updateSpotlight(detail.dataset.v5AtlasNodeId);
    }
  };
  const onCanvasSelection = event => {
    // Never trust a dispatched id to create a new profile.
    updateSpotlight(event.detail?.id);
  };
  root.addEventListener("toggle", onDisclosure, true);
  root.addEventListener("v5-atlas-selected", onCanvasSelection);
  search.addEventListener("input", apply);
  for (const checkbox of checkboxes) checkbox.addEventListener("change", apply);
  root.addEventListener("click", onSelect);
  apply();
  const dispose = () => {
    search.removeEventListener("input", apply);
    for (const checkbox of checkboxes) checkbox.removeEventListener("change", apply);
    root.removeEventListener("click", onSelect);
    root.removeEventListener("toggle", onDisclosure, true);
    root.removeEventListener("v5-atlas-selected", onCanvasSelection);
    window.removeEventListener("pagehide", onPageHide);
  };
  // BFCache preserves the same page/controls; a persisted pagehide is not a
  // teardown. Otherwise mobile Back navigation restores visible but dead filters.
  const onPageHide = event => {
    if (!event.persisted) dispose();
  };
  window.addEventListener("pagehide", onPageHide);
  return dispose;
}
