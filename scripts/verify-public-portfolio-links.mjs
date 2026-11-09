/**
 * Read-only release check: editorial source-link approval is not proof that
 * GitHub still exposes the repository publicly. Fail the candidate/release
 * before publishing a formerly public repository name as an accessible link.
 *
 * This checks ONLY exact owner-approved public source destinations. It never
 * queries the private discovery registry, source contents, or owner secrets.
 */
import { pathToFileURL } from "node:url";
import { approvedPublicProjects } from "../src/publication-manifest.mjs";

const BASE = "https://github.com/";
const OWNER = "devonalanakins";
const NAME = /^[a-zA-Z0-9._-]{1,100}$/;

export function reviewedGithubLinks(projects=approvedPublicProjects) {
  if(!Array.isArray(projects)) throw Error("Public presentation catalog unavailable");
  const seen = new Set();
  return projects.flatMap(project => {
    if(project?.publication?.sourceLinkApproved!==true) return [];
    const url=project?.url;
    if(typeof url!=="string" || !url.startsWith(BASE))
      throw Error("Approved repository link is missing or malformed");
    let parsed;
    try{parsed=new URL(url);}catch{throw Error("Approved repository URL invalid");}
    const path=parsed.pathname.split("/").filter(Boolean);
    if(parsed.origin!=="https://github.com" || path.length!==2 ||
       path[0]!==OWNER || !NAME.test(path[1]) || parsed.search ||
       parsed.hash || parsed.username || parsed.password ||
       url!==BASE+OWNER+"/"+path[1])
      throw Error("Approved public link must be an exact GitHub repository root");
    if(seen.has(path[1])) return [];
    seen.add(path[1]);
    return [{ project:project.slug, repo:path[1], url }];
  });
}

export async function verifyPublicGithubLinks({
  projects=approvedPublicProjects,
  fetchImpl=fetch,
  token=process.env.GITHUB_TOKEN,
}={}){
  if(typeof token!=="string" || !token.trim())
    throw Error("Read-only GitHub token required for release visibility verification");
  const links=reviewedGithubLinks(projects);
  if(links.length===0) throw Error("Reviewed public source links unexpectedly empty");
  for(const link of links){
    let response;
    try{
      response=await fetchImpl("https://api.github.com/repos/"+OWNER+"/"+link.repo,{
        headers:{
          Authorization:"Bearer "+token,
          Accept:"application/vnd.github+json",
          "X-GitHub-Api-Version":"2022-11-28",
          "User-Agent":"devonakins-publication-visibility-release-gate",
        },
        redirect:"error",
        signal:AbortSignal.timeout(12000),
      });
    }catch{
      throw Error("GitHub visibility lookup unavailable for reviewed source "+link.project);
    }
    if(response?.status!==200)
      throw Error("GitHub source "+link.project+" is not publicly verifiable (HTTP "+String(response?.status)+")");
    let data;
    try{data=await response.json();}catch{
      throw Error("GitHub source metadata invalid for "+link.project);
    }
    if(data?.full_name!==OWNER+"/"+link.repo ||
       data?.html_url!==link.url || data?.private!==false ||
       data?.visibility!=="public")
      throw Error("Approved source "+link.project+" is not verified public");
  }
  return {checked:links.length,visibility:"public",source:"GitHub repository metadata"};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const result=await verifyPublicGithubLinks();
    console.log("Verified "+result.checked+" approved GitHub source links are currently public");
  }catch(e){
    console.error("Public repository visibility release gate failed: "+e.message);
    process.exitCode=1;
  }
}
