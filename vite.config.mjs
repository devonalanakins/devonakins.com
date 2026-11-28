import {FIELDNOTES} from "./src/professional/fieldnotes.mjs";
import {LABORATORY_ROUTES,LABORATORY_REDIRECTS} from "./src/professional/laboratory-routes.mjs";
import {creatorPaths} from "./src/professional/creator-pages.mjs";
import { defineConfig } from "vite";
import {PROFESSIONAL_ROUTES} from "./src/professional/site.mjs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { V5_PUBLIC_ROUTES } from "./src/v5/public-routes.mjs";
import { publicNotes } from "./src/v5/public-notes.mjs";
import { pages, projects } from "./src/content.mjs";
import { v5PreviewPlugin } from "./src/v5/preview-plugin.mjs";
import { shopPaths } from "./src/trading-post/catalog.mjs";
const laboratoryCandidate = process.env.LABORATORY_SITE_CANDIDATE === "1";
const paths = [...new Set([
  ...shopPaths,
  ...pages.map((p) => p.path),
  ...(laboratoryCandidate?[...Object.values(LABORATORY_ROUTES),...creatorPaths,...Object.keys(FIELDNOTES),...Object.keys(LABORATORY_REDIRECTS),"/listening/"]:[]),
  ...(process.env.PROFESSIONAL_SITE_CANDIDATE === "1" ? Object.values(PROFESSIONAL_ROUTES) : []),
  ...projects.map((p) => `/work/${p.slug}/`),
  "/404/",
  ...(process.env.V5_PUBLIC_SITE_CANDIDATE === "1" ? [...Object.values(V5_PUBLIC_ROUTES).filter(p=>!pages.some(page=>page.path===p)),...publicNotes.map(n=>"/knowledge/"+n.slug+"/")] : []),
  "/v2/", // Isolated immersive preview, not the production homepage.
])];
export default defineConfig({
  plugins: [
    v5PreviewPlugin(),
    {
      name: "exclude-creator-media-from-other-builds",
      apply: "build",
      async writeBundle(options) {
        if (!laboratoryCandidate && options.dir) {
          await rm(resolve(options.dir, "podcast-media"), {recursive: true, force: true});
        }
      },
    },
  ],
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
