import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pages } from "../src/content.mjs";
import { approvedPublicProjects as projects } from "../src/publication-manifest.mjs";
import { promotePortraitHome } from "../src/portrait-home.mjs";
import { renderV5PublicHomepage, renderV5PublicPage, renderV5ProjectPage } from "../src/v5/shell.mjs";
import { V5_PUBLIC_ROUTES } from "../src/v5/public-routes.mjs";
import { publicNotes } from "../src/v5/public-notes.mjs";
import { renderImmersiveRoute } from "../src/immersive-routes.mjs";
import { validatePublicGptSnapshot } from "../src/gpt-profile.mjs";

// All public routes use one independently audited cinematic shell. No legacy
// homepage, navbar or old global CSS is generated for deep-linked pages.
const home = promotePortraitHome(await readFile("v2/index.html", "utf8"));
const gptSnapshot = validatePublicGptSnapshot(JSON.parse(await readFile("public/v2/usage-snapshot.json", "utf8")));
// Explicit build-time candidate only. Ordinary builds keep the verified V4
// document, including on production's existing deploy workflow. No URL/env
// runtime parameter can switch a deployed site without a reviewed rebuild.
const fullV5Candidate = process.env.V5_PUBLIC_SITE_CANDIDATE === "1";
const v5Candidate = process.env.V5_PUBLIC_HOME_CANDIDATE === "1";
await writeFile("index.html", fullV5Candidate ? renderV5PublicPage("home") : v5Candidate ? renderV5PublicHomepage() : home);
const all = [...new Set([
  ...pages.map(({ path }) => path),
  ...projects.map((project) => "/work/" + project.slug + "/"),
  "/404/",
  ...(fullV5Candidate ? [...Object.values(V5_PUBLIC_ROUTES),...publicNotes.map(n=>"/knowledge/"+n.slug+"/")] : []),
])];
for (const path of all) {
  if (path === "/") continue;
  const dir = "." + path;
  await mkdir(dir, { recursive: true });
  const routeKey=Object.keys(V5_PUBLIC_ROUTES).find(key=>V5_PUBLIC_ROUTES[key]===path);
  const topic=publicNotes.find(n=>path==="/knowledge/"+n.slug+"/");
  const project=projects.find(p=>path==="/work/"+p.slug+"/");
  const html=fullV5Candidate && routeKey ? renderV5PublicPage(routeKey) :
    fullV5Candidate && topic ? renderV5PublicPage("knowledge",{topic:topic.slug,publicPath:path}) :
    fullV5Candidate && project ? renderV5ProjectPage(project.slug) :
    renderImmersiveRoute(home,path,projects,gptSnapshot);
  await writeFile(dir+"index.html",html);
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
