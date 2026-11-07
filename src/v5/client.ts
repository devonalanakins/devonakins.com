const menu = document.querySelector<HTMLDetailsElement>("[data-mobile-menu]");
menu?.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.open) {
    menu.open = false;
    menu.querySelector("summary")?.focus();
  }
});
// Native details/navigation work without JS. No data polling, motion or storage.
// The route-specific 3D catalog is a progressive local rendering enhancement.
if (document.querySelector("[data-v5-atlas]")) {
  void import("./atlas-client").then(({ mountV5Atlas }) => mountV5Atlas()).catch(() => {
    const status = document.querySelector<HTMLElement>("[data-v5-atlas-status]");
    if (status) status.textContent = "3D renderer could not load. The public project list remains available.";
  });
}
export {};
