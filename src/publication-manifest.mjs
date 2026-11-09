/**
 * Reviewed public presentation permissions, separate from repository visibility,
 * source link permission and activity sharing permission.
 *
 * Existing src/content.mjs owns the copy. This sidecar owns publication rights.
 * A newly added repository or editorial entry is NOT automatically public.
 * These literals contain no private inventory, BGP registry or private records.
 */
import { projects as editorialProjects } from "./content.mjs";

const entry = (category, type, stage, approvedDestination = null, shareActivity = false) =>
  Object.freeze({
    publishApproved: true,
    category,
    type,
    stage,
    approvedDestination,
    sourceLinkApproved: typeof approvedDestination === "string" &&
      approvedDestination.startsWith("https://github.com/devonalanakins/"),
    activitySharingApproved: shareActivity,
    lastReviewedAt: null, // No fabricated per-project review timestamp.
  });

// This list is a FIRST-PARTY permission boundary, not a repository discovery feed.
// Public concept approval can coexist with private repository code (Vesper).
export const PUBLICATION_POLICY = Object.freeze({
  merit: entry("Software", "Engineering toolkit", "experimental",
    "https://github.com/devonalanakins/merit", true),
  mizvo: entry("Software", "Founder-led practice", "reviewed-prototype",
    "https://github.com/devonalanakins/mizvo", true),
  "rhen-language": entry("Research", "Programming language experiment", "experimental",
    "https://github.com/devonalanakins/rhen", true),
  squelch: entry("Software", "Audio engineering experiment", "experimental",
    "https://github.com/devonalanakins/squelch", true),
  vesper: entry("Research", "Private-source research concept", "research"),
  rhen: entry("Archive", "Preserved research source", "archived",
    "https://github.com/devonalanakins/vesper-legacy"),
  operations: entry("Operations", "Professional support", "maintained"),
  writing: entry("Writing", "Books and manuscripts", "draft"),
  anevum: entry("Creative", "Creative property", "draft", "https://anevum.com", true),
  ideaflow: entry("Software", "Meeting software", "draft"),
  devonstation: entry("Software", "Private personal workspace", "draft",
    null, true),
});

const SAFE_SLUG = /^[a-z][a-z0-9-]{1,63}$/;

/**
 * Only explicitly permitted editorial identities render. Public links require
 * their *own* exact permission; a forged/stale private GitHub URL is dropped.
 * This is deterministic and never changes the underlying owner's catalog.
 */
export function projectPublicPortfolio(candidate = editorialProjects) {
  if (!Array.isArray(candidate)) return Object.freeze([]);
  const unique = new Set();
  return Object.freeze(candidate.flatMap(project => {
    if (!project || typeof project !== "object" ||
        typeof project.slug !== "string" ||
        !SAFE_SLUG.test(project.slug) || unique.has(project.slug)) return [];
    const permission = PUBLICATION_POLICY[project.slug];
    if (!Object.hasOwn(PUBLICATION_POLICY, project.slug) ||
        permission?.publishApproved !== true) return [];
    unique.add(project.slug);
    const keepLink = typeof project.url === "string" &&
      permission.approvedDestination === project.url;
    const safe = { ...project, publication: permission };
    if (!keepLink) {
      delete safe.url;
      delete safe.urlLabel;
    }
    return [Object.freeze(safe)];
  }));
}

export const approvedPublicProjects = projectPublicPortfolio();
export const publicProjectBySlug = slug =>
  typeof slug === "string" && Object.hasOwn(PUBLICATION_POLICY, slug)
    ? approvedPublicProjects.find(p => p.slug === slug) ?? null : null;
