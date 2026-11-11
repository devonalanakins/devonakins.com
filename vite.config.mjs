import { defineConfig } from "vite";
import {PROFESSIONAL_ROUTES} from "./src/professional/site.mjs";
import { resolve } from "node:path";
import { V5_PUBLIC_ROUTES } from "./src/v5/public-routes.mjs";
import { publicNotes } from "./src/v5/public-notes.mjs";
import { pages, projects } from "./src/content.mjs";
import { v5PreviewPlugin } from "./src/v5/preview-plugin.mjs";
const paths = [...new Set([
  ...pages.map((p) => p.path),
  ...(process.env.PROFESSIONAL_SITE_CANDIDATE === "1" ? Object.values(PROFESSIONAL_ROUTES) : []),
  ...projects.map((p) => `/work/${p.slug}/`),
  "/404/",
  ...(process.env.V5_PUBLIC_SITE_CANDIDATE === "1" ? [...Object.values(V5_PUBLIC_ROUTES).filter(p=>!pages.some(page=>page.path===p)),...publicNotes.map(n=>"/knowledge/"+n.slug+"/")] : []),
  "/v2/", // Isolated immersive preview, not the production homepage.
])];
export default defineConfig({
  plugins: [v5PreviewPlugin()],
  build: {
    target: "es2022",
    // Keep legacy site styles out of the portrait interface. Its global
    // reduced-motion rules otherwise override visitor-selected animation.
    cssCodeSplit: true,
    rollupOptions: {
      input: Object.fromEntries(
        paths.map((p, i) => ["page" + i, resolve("." + p + "index.html")]),
      ),
    },
  },
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
});
