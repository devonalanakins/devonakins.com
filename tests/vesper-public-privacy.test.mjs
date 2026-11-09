import test from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_REPOSITORIES,
  projectActivityHistory,
  validActivityHistory,
} from "../src/activity-history.mjs";
import {
  PUBLIC_PRESENCE_PROJECTS,
  projectPublicPresence,
} from "../src/presence-model.mjs";

const AT = Date.parse("2026-11-08T20:00:00.000Z");
const asOf = new Date(AT).toISOString();

test("private Vesper repository does not generate public GitHub history, even if a provider marks it public", () => {
  assert.equal(Object.hasOwn(PUBLIC_REPOSITORIES, "vesper"), false);
  const input = {
    public: true,
    type: "PushEvent",
    created_at: asOf,
    repo: {name: "devonalanakins/vesper"},
    payload: {commits: [{message: "private development"}]},
  };
  assert.deepEqual(projectActivityHistory([input], AT), []);
  assert.deepEqual(validActivityHistory([{
    project: "Vesper",
    projectSlug: "vesper",
    kind: "Commit",
    at: asOf,
    url: "https://github.com/devonalanakins/vesper",
  }], AT), []);
});

test("public source allowlist excludes the private Vesper project identity", () => {
  assert.equal(Object.hasOwn(PUBLIC_PRESENCE_PROJECTS, "vesper"), false);
  const presence = projectPublicPresence({
    publicEnabled: true,
    session: {
      approved: true,
      source: "editor-heartbeat",
      publicProject: true,
      projectSlug: "vesper",
      asOf,
    },
    allowedProjects: ["vesper"],
  }, AT);
  assert.equal(presence.project, null, "No private project title may enter public presence");
});
