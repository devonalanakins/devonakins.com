import {
  PRESENCE_PROJECTOR_POLICY,
  PUBLIC_PRESENCE_PROJECTS,
} from "./presence-model.mjs";

// An invalid persisted owner selection is not implicitly replaced or
// trimmed. Requiring owner review avoids publishing previously hidden work.
function validPersistedProjects(row) {
  if (row?.public_projects_json == null)
    return PRESENCE_PROJECTOR_POLICY.publicProjects;
  try {
    const value = JSON.parse(row.public_projects_json);
    return Array.isArray(value) &&
      value.length <= PRESENCE_PROJECTOR_POLICY.publicProjects.length &&
      new Set(value).size === value.length &&
      value.every((slug) => typeof slug === "string" &&
        Object.hasOwn(PUBLIC_PRESENCE_PROJECTS, slug))
      ? value
      : null;
  } catch {
    return null;
  }
}

export function approvedProjects(row) {
  return validPersistedProjects(row) ?? [];
}

// Private owner-only diagnostic. This returns no stored project identifiers.
// A deliberate empty [] is valid; malformed or obsolete lists require review.
export function projectPreferencesNeedReview(row) {
  return row?.public_projects_json != null &&
    validPersistedProjects(row) === null;
}
