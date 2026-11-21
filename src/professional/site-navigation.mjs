/** One public navigation contract for the Laboratory and standalone creator pages.
 * The da. monogram is Home. Do not invent new routes or leak owner-only links.
 */
export const SITE_PRIMARY_LINKS = Object.freeze([
  Object.freeze({href: "/work/", label: "Work"}),
  Object.freeze({href: "/watch/", label: "Watch"}),
  Object.freeze({href: "/podcast/", label: "Podcast"}),
  Object.freeze({href: "/courses/", label: "Learn"}),
  Object.freeze({href: "/fieldnotes/", label: "Writing"}),
  Object.freeze({href: "/about/", label: "About"}),
]);

export const SITE_CONTEXT_LINKS = Object.freeze([
  Object.freeze({href: "/live/", label: "Live"}),
  Object.freeze({href: "/research/", label: "Research"}),
  Object.freeze({href: "/activity/", label: "Activity"}),
  Object.freeze({href: "/systems/", label: "Systems"}),
  Object.freeze({href: "/setup/", label: "My Setup"}),
  Object.freeze({href: "/contact/", label: "Contact"}),
]);

/** Parent routes remain the selected destination on approved detail pages. */
export function selectedPrimaryHref(path) {
  if (typeof path !== "string") return null;
  const pathname = path.split(/[?#]/, 1)[0];
  for (const link of SITE_PRIMARY_LINKS) {
    if (pathname === link.href || pathname.startsWith(link.href)) return link.href;
  }
  return null;
}
