// The homepage, Work directory and standalone Systems Map may reuse the existing
// public V4 reader only after the server explicitly marks them released.
// Previews, project-detail pages and unrelated routes remain source-disabled;
// V4's server-side consent, stop and allowlists still apply.
export function publicV5ActivationMode(pathname, releaseMarker) {
  if (releaseMarker === "released-v5" &&
      (pathname === "/" || pathname === "/work/" ||
       pathname === "/signal-field/")) return "automatic";
  if (pathname === "/__v5_preview__/" && releaseMarker === "preview") return "manual-preview";
  return "disabled";
}
