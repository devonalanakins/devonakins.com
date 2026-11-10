/**
 * Public GitHub activity is independent of featured portfolio projects and
 * private owner presence. Only GitHub's public user-event stream is eligible.
 * This is recent history, never evidence of a currently active coding session.
 */
import { githubCooldownMs } from "../public-telemetry.mjs";

const USER = "devonalanakins";
const SOURCE = "GitHub public events API";
const SCOPE = "Latest public user events across repositories; bounded sample, not exhaustive history or private activity";
const URL = "https://api.github.com/users/" + USER + "/events/public?per_page=100";
const REPO = /^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/;
const KINDS = Object.freeze({
  PushEvent: ["push", "Pushed commits"],
  PullRequestEvent: ["pull_request", "Updated a pull request"],
  PullRequestReviewEvent: ["pull_request", "Reviewed a pull request"],
  PullRequestReviewCommentEvent: ["pull_request", "Commented on a pull request"],
  ReleaseEvent: ["release", "Published a release"],
  CreateEvent: ["other", "Created a branch or tag"],
  DeleteEvent: ["other", "Deleted a branch or tag"],
  IssuesEvent: ["issue", "Updated an issue"],
  IssueCommentEvent: ["issue", "Commented on an issue"],
  CommitCommentEvent: ["other", "Commented on a commit"],
  DiscussionEvent: ["other", "Participated in a discussion"],
  DiscussionCommentEvent: ["other", "Commented on a discussion"],
  ForkEvent: ["other", "Forked a repository"],
  WatchEvent: ["other", "Starred a repository"],
  PublicEvent: ["other", "Made a repository public"],
});
const LIMIT = 32;
const SUCCESS_TTL = 5 * 60_000;
const FAILURE_TTL = 10 * 60_000;
const MAX_TTL = 4 * 60 * 60_000;
const cacheKey = new Request("https://devonakins.com/__cache/professional-github-public-v1");

function safeTime(raw, now) {
  if (typeof raw !== "string" || raw.length > 36) return null;
  const time = Date.parse(raw);
  if (!Number.isFinite(time) || time > now + 60_000 ||
      time < now - 90 * 86400000) return null;
  return new Date(time).toISOString();
}

export function projectProfessionalGithub(raw, now = new Date()) {
  if (!Array.isArray(raw) || raw.length > 100)
    throw new Error("Unexpected public GitHub event envelope");
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error("Invalid check time");
  const events = raw.flatMap(event => {
    if (!event || event.public !== true ||
        event.actor?.login !== USER ||
        !Object.hasOwn(KINDS, event.type) ||
        typeof event.repo?.name !== "string" ||
        !REPO.test(event.repo.name)) return [];
    const at = safeTime(event.created_at, nowMs);
    if (!at) return [];
    const [kind, generic] = KINDS[event.type];
    let label = generic;
    if (event.type === "PullRequestEvent") {
      label = event.payload?.action === "closed" &&
        event.payload?.pull_request?.merged === true
          ? "Merged a pull request"
          : event.payload?.action === "opened" ? "Opened a pull request"
          : event.payload?.action === "closed" ? "Closed a pull request"
          : generic;
    }
    return [{
      kind, label, repo: event.repo.name, at,
      // Never accept arbitrary provider URLs, messages, paths or HTML.
      url: "https://github.com/" + event.repo.name,
    }];
  }).sort((a, b) => b.at.localeCompare(a.at)).slice(0, LIMIT);
  return {
    version: 1, source: SOURCE, scope: SCOPE,
    checkedAt: now.toISOString(),
    status: events.length ? "available" : "empty",
    reason: null, retryAt: null, events,
  };
}

export function unavailableProfessionalGithub(now, reason, ttlMs) {
  const retry = new Date(now.getTime() + ttlMs).toISOString();
  return {
    version: 1, source: SOURCE, scope: SCOPE,
    checkedAt: now.toISOString(), status: "unavailable",
    reason, retryAt: retry, events: [],
  };
}

/** Checks edge-cache content as untrusted input; no arbitrary links or fields. */
export function validProfessionalGithub(value, now = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join("|") !==
        "checkedAt|events|reason|retryAt|scope|source|status|version" ||
      value.version !== 1 || value.source !== SOURCE || value.scope !== SCOPE ||
      !Array.isArray(value.events) || value.events.length > LIMIT ||
      !safeTime(value.checkedAt, now.getTime())) return false;
  if (value.status === "unavailable")
    return value.events.length === 0 &&
      ["rate-limited", "access-denied", "provider-error", "invalid-response", "timeout", "network-error"].includes(value.reason) &&
      typeof value.retryAt === "string" &&
      Number.isFinite(Date.parse(value.retryAt)) &&
      new Date(value.retryAt).toISOString() === value.retryAt &&
      Date.parse(value.retryAt) >= Date.parse(value.checkedAt) &&
      Date.parse(value.retryAt) <= Date.parse(value.checkedAt) + MAX_TTL;
  if (value.reason !== null || value.retryAt !== null ||
      !["empty", "available"].includes(value.status) ||
      (value.status === "available") !== (value.events.length > 0)) return false;
  let previous = Infinity;
  for (const event of value.events) {
    if (!event || Object.keys(event).sort().join("|") !== "at|kind|label|repo|url" ||
        !["push", "pull_request", "release", "issue", "other"].includes(event.kind) ||
        typeof event.label !== "string" || !/^[A-Za-z ]{3,40}$/.test(event.label) ||
        typeof event.repo !== "string" || !REPO.test(event.repo) ||
        event.url !== "https://github.com/" + event.repo ||
        !safeTime(event.at, now.getTime()) ||
        Date.parse(event.at) > previous) return false;
    previous = Date.parse(event.at);
  }
  return true;
}

export function createProfessionalGithubReader({
  fetchImpl = fetch,
  clock = () => new Date(),
  cache,
} = {}) {
  let cached = null;
  let pending = null;
  let failures = 0;
  return async () => {
    const at = clock();
    const time = at.getTime();
    if (cached && cached.expiresAt > time) return cached.value;
    if (pending) return pending;
    pending = (async () => {
      const edge = cache === undefined
        ? (typeof caches !== "undefined" ? caches.default : null)
        : cache;
      if (edge) {
        try {
          const found = await edge.match(cacheKey);
          if (found?.ok) {
            const entry = await found.json();
            const expiry = Date.parse(entry?.expiresAt);
            if (entry?.version === 1 && Number.isFinite(expiry) &&
                expiry > time && expiry <= time + MAX_TTL &&
                validProfessionalGithub(entry.value, at)) {
              cached = {expiresAt: expiry, value: entry.value};
              return entry.value;
            }
          }
        } catch { /* Ignore bad or unavailable edge cache. */ }
      }
      let value, ttl = SUCCESS_TTL, reason = "network-error";
      try {
        const response = await fetchImpl(URL, {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "devonakins-professional-public-feed",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          const limited = response.status === 429 ||
            (response.status === 403 &&
              (response.headers.get("x-ratelimit-remaining") === "0" ||
               response.headers.has("retry-after")));
          reason = limited ? "rate-limited" :
            response.status === 403 ? "access-denied" : "provider-error";
          ttl = limited ? githubCooldownMs(response, at, failures + 1) : FAILURE_TTL;
          throw new Error("Public GitHub provider unavailable");
        }
        const body = await response.text();
        if (body.length > 2_000_000) {
          reason = "invalid-response";
          throw new Error("Oversized public GitHub response");
        }
        try {
          value = projectProfessionalGithub(JSON.parse(body), at);
        } catch {
          reason = "invalid-response";
          throw new Error("Malformed public GitHub response");
        }
        failures = 0;
      } catch (error) {
        if (reason === "network-error" &&
            ["AbortError", "TimeoutError"].includes(error?.name))
          reason = "timeout";
        failures = Math.min(failures + 1, 6);
        ttl = ttl === SUCCESS_TTL ? FAILURE_TTL : ttl;
        value = unavailableProfessionalGithub(at, reason, ttl);
      }
      cached = {expiresAt: time + ttl, value};
      if (edge) {
        try {
          await edge.put(cacheKey, new Response(JSON.stringify({
            version: 1, expiresAt: new Date(time + ttl).toISOString(), value,
          }), {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=" + Math.ceil(ttl / 1000),
            },
          }));
        } catch { /* Cache writes are best effort. */ }
      }
      return value;
    })();
    try { return await pending; }
    finally { pending = null; }
  };
}
