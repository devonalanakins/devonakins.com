/** Merge independently verified GitHub history and owner-approved Threads posts.
 * Neither source is evidence that the owner is coding now.
 * The existing provider projections verify timestamps, disclosure and URL safety.
 */
import { publicV5Threads, threadsPublicDate } from "./public-threads.mjs";

export function publicHomepageTimeline(homepage, snapshot, now = Date.now()) {
  const threads = publicV5Threads(homepage?.available === true ? snapshot : null, now);
  const history = homepage?.available === true && Array.isArray(homepage.events)
    ? homepage.events.slice(0, 4) : [];
  const entries = [
    ...history.filter(item => Number.isFinite(Date.parse(item.at))).map(item => ({
      source: "github", href: item.href, at: item.at,
      heading: "GitHub · " + item.kind + " · " + item.title,
      detail: item.age ?? "Dated public event",
    })),
    ...threads.posts.map(post => ({
      source: "threads", href: post.href, at: post.publishedAt,
      heading: post.text,
      detail: "Threads · Posted " + threadsPublicDate(post.publishedAt),
    })),
  ].sort((left, right) => Date.parse(right.at) - Date.parse(left.at)).slice(0, 6);
  return { threadsConnected: threads.connected, entries };
}
