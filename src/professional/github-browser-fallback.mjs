/**
 * Public GitHub activity rescue path for browser visitors when Cloudflare's
 * shared egress IP cannot read either official provider endpoint.
 *
 * No access token, cookies, raw commit messages, arbitrary GitHub URLs,
 * local storage, or third-party analytics. The browser requests GitHub
 * only after our first-party feed has already failed. The professional UI
 * discloses the browser-direct origin; GitHub sees the browser request.
 */
import {
  projectProfessionalGithub, validProfessionalGithub,
} from "./github-public.mjs";

export const BROWSER_GITHUB_SOURCE = "GitHub public events API (browser)";
const PUBLIC_API = "https://api.github.com/users/devonalanakins/events/public?per_page=100";
const MAX_BYTES = 2_000_000;

export async function readBrowserGithubFallback({
  fetcher = fetch,
  clock = () => new Date(),
} = {}) {
  const now = clock();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    return null;
  try {
    const response = await fetcher(PUBLIC_API, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      cache: "no-store",
      headers: {Accept: "application/vnd.github+json"},
      signal: AbortSignal.timeout(6500),
    });
    if (!response?.ok ||
        !/application\/json/i.test(response.headers?.get("content-type") || ""))
      return null;
    const length = response.headers?.get("content-length");
    if (length !== null && (!/^[0-9]{1,10}$/.test(length) || Number(length) > MAX_BYTES))
      return null;
    const text = await response.text();
    if (text.length > MAX_BYTES) return null;
    const projection = projectProfessionalGithub(JSON.parse(text),now);
    if (!validProfessionalGithub(projection,now)) return null;
    return {...projection, source: BROWSER_GITHUB_SOURCE};
  } catch {
    // A GitHub outage or local browser rate limit is not evidence of zero
    // development; the caller preserves its explicit unavailable state.
    return null;
  }
}
