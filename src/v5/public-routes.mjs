export const V5_PUBLIC_ROUTES = Object.freeze({
  home: "/",
  field: "/signal-field/",
  projects: "/work/",
  writing: "/writing/",
  research: "/research/",
  knowledge: "/knowledge/",
  about: "/about/",
});
/** Exact first-party links only; never redirect user-provided URLs. */
export function publishV5Links(html) {
  for (const [key, path] of Object.entries(V5_PUBLIC_ROUTES)) {
    const preview = "/__v5_preview__/" + (key === "home" ? "" : key + "/");
    html = html
      .replaceAll('href="' + preview + '"', 'href="' + path + '"')
      .replaceAll('action="' + preview + '"', 'action="' + path + '"');
  }
  // Topics are a fixed authored catalog, never private page discovery.
  return html.replaceAll(
    'href="/__v5_preview__/knowledge/',
    'href="/knowledge/',
  );
}
