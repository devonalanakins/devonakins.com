import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import {renderProfessionalPage, renderProfessionalProjectPage, PROFESSIONAL_ROUTES} from "../src/professional/site.mjs";
import { pages } from "../src/content.mjs";
import { approvedPublicProjects as projects } from "../src/publication-manifest.mjs";
import { promotePortraitHome } from "../src/portrait-home.mjs";
import { renderV5PublicHomepage, renderV5PublicPage, renderV5ProjectPage } from "../src/v5/shell.mjs";
import { V5_PUBLIC_ROUTES } from "../src/v5/public-routes.mjs";
import { publicNotes } from "../src/v5/public-notes.mjs";
import { renderImmersiveRoute } from "../src/immersive-routes.mjs";
import { validatePublicGptSnapshot } from "../src/gpt-profile.mjs";
import { validateDatedGptCapture } from "../src/professional/gpt-capture.mjs";

// All public routes use one independently audited cinematic shell. No legacy
// homepage, navbar or old global CSS is generated for deep-linked pages.
const home = promotePortraitHome(await readFile("v2/index.html", "utf8"));
const gptSnapshot = validatePublicGptSnapshot(JSON.parse(await readFile("public/v2/usage-snapshot.json", "utf8")));
const datedGptFiles = (await readdir("public/gpt/snapshots")).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
const datedGptCaptures = await Promise.all(datedGptFiles.map(async name => {
  const capture=validateDatedGptCapture(JSON.parse(await readFile("public/gpt/snapshots/"+name,"utf8")));
  if(name !== capture.captureDate+".json") throw new Error("Capture filename/date mismatch: "+name);
  return capture;
}));
if (!datedGptCaptures.length) throw new Error("Dated GPT capture history is missing");
const datedGptCapture=datedGptCaptures.at(-1);
const priorDatedGptCaptures=datedGptCaptures.slice(0,-1);

// Explicit build-time candidate only. Ordinary builds keep the verified V4
// document, including on production's existing deploy workflow. No URL/env
// runtime parameter can switch a deployed site without a reviewed rebuild.
const fullV5Candidate = process.env.V5_PUBLIC_SITE_CANDIDATE === "1";
const v5Candidate = process.env.V5_PUBLIC_HOME_CANDIDATE === "1";
const professionalCandidate = process.env.PROFESSIONAL_SITE_CANDIDATE === "1";
const professionalPaths = new Map(Object.entries(PROFESSIONAL_ROUTES).map(([key,path]) => [path,key]));
const professionalLegacyDestinations = Object.freeze({
  home: "/", work: "/work/", research: "/work/", contact: "/contact/",
  listening: "/listening/", writing: "/writing/", gpt: "/gpt/",
  about: "/about/", source: "/source/",
});
// Legacy deep links retain their URLs, but must never send a visitor to V4
// homepage fragments that are absent from the opt-in professional homepage.
function repairProfessionalLegacyNavigation(html) {
  return html.replace(/href="\/#([a-z-]+)"/g, (whole, fragment) => {
    const destination = professionalLegacyDestinations[fragment];
    if (!Object.hasOwn(professionalLegacyDestinations, fragment))
      throw Error("Unmapped professional legacy anchor: " + fragment);
    return 'href="' + destination + '"';
  });
}

await writeFile("index.html", professionalCandidate ? renderProfessionalPage("home") : fullV5Candidate ? renderV5PublicPage("home") : v5Candidate ? renderV5PublicHomepage() : home);
const all = [...new Set([
  ...pages.map(({ path }) => path),
  ...(professionalCandidate ? [...professionalPaths.keys()] : []),
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
  const html=professionalCandidate && professionalPaths.has(path) ? renderProfessionalPage(professionalPaths.get(path), {datedCapture:datedGptCapture,historicalSnapshot:gptSnapshot,previousCaptures:priorDatedGptCaptures}) :
    fullV5Candidate && routeKey ? renderV5PublicPage(routeKey) :
    fullV5Candidate && topic ? renderV5PublicPage("knowledge",{topic:topic.slug,publicPath:path}) :
    professionalCandidate && project ? renderProfessionalProjectPage(project.slug) :
    fullV5Candidate && project ? renderV5ProjectPage(project.slug) :
    renderImmersiveRoute(home,path,projects,gptSnapshot);
  const published = professionalCandidate && !professionalPaths.has(path) && !project
    ? repairProfessionalLegacyNavigation(html) : html;
  await writeFile(dir+"index.html",published);
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
