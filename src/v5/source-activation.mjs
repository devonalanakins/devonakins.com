// The homepage and standalone Signal Field may read the existing public V4
// snapshot only after the server explicitly marks them released. Development
// previews and unrelated secondary routes remain source-disabled; V4's
// server-side consent, stop and allowlists still apply.
export function publicV5ActivationMode(pathname, releaseMarker) {
  if (releaseMarker === "released-v5" &&
      (pathname === "/" || pathname === "/signal-field/")) return "automatic";
  if (pathname === "/__v5_preview__/" && releaseMarker === "preview") return "manual-preview";
  return "disabled";
}
