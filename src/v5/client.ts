const menu = document.querySelector<HTMLDetailsElement>("[data-mobile-menu]");
menu?.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.open) {
    menu.open = false;
    menu.querySelector("summary")?.focus();
  }
});
// Native details/navigation work without JS. No data polling, motion or storage.
export {};
