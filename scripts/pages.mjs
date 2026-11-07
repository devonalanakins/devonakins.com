import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pages, projects } from "../src/content.mjs";
import { promotePortraitHome } from "../src/portrait-home.mjs";
import { renderV5PublicHomepage } from "../src/v5/shell.mjs";
import { renderImmersiveRoute } from "../src/immersive-routes.mjs";
import { validatePublicGptSnapshot } from "../src/gpt-profile.mjs";

// All public routes use one independently audited cinematic shell. No legacy
// homepage, navbar or old global CSS is generated for deep-linked pages.
const home = promotePortraitHome(await readFile("v2/index.html", "utf8"));
const gptSnapshot = validatePublicGptSnapshot(JSON.parse(await readFile("public/v2/usage-snapshot.json", "utf8")));
// Explicit build-time candidate only. Ordinary builds keep the verified V4
// document, including on production's existing deploy workflow. No URL/env
// runtime parameter can switch a deployed site without a reviewed rebuild.
const v5Candidate = process.env.V5_PUBLIC_HOME_CANDIDATE === "1";
await writeFile("index.html", v5Candidate ? renderV5PublicHomepage() : home);
const all = [
  ...pages.map(({ path }) => path),
  ...projects.map((project) => "/work/" + project.slug + "/"),
  "/404/",
];
for (const path of all) {
  if (path === "/") continue;
  const dir = "." + path;
  await mkdir(dir, { recursive: true });
  await writeFile(dir + "index.html", renderImmersiveRoute(home, path, projects, gptSnapshot));
}
await writeFile(
  "public/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    all
      .filter((path) => path !== "/404/")
      .map((path) => '<url><loc>https://devonakins.com' + path + "</loc></url>")
      .join("") +
    "</urlset>",
);
console.log("Generated " + all.length + " public HTML routes (" +
  (v5Candidate ? "V5 homepage release candidate, V4 deep links preserved" :
    "verified V4 homepage and deep links") + ").");
