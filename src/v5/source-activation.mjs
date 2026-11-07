// Public V5 must not accidentally activate source reads on development
// previews, secondary routes, or the still-serving V4 production document.
// The future reviewed release renderer must explicitly provide its own
// server-authored release marker. V4 server consent/allowlists remain required.
export function publicV5ActivationMode(pathname, releaseMarker) {
  if (pathname === "/" && releaseMarker === "released-v5") return "automatic";
  if (pathname === "/__v5_preview__/" && releaseMarker === "preview") return "manual-preview";
  return "disabled";
}
