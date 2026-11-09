import test from "node:test";
import assert from "node:assert/strict";
import { projects } from "../src/content.mjs";
import { renderV5ProjectPage } from "../src/v5/shell.mjs";
import { createHandler } from "../src/worker.mjs";
import assets from "../.release/assets.mjs";

test("approved private-source concept is discoverable without a repository link", async () => {
  const project = projects.find((entry) => entry.slug === "vesper");
  assert.ok(project, "The reviewed editorial concept must remain discoverable");
  assert.equal(project.url, undefined, "Private source links require separate approval");

  const privateSource = "https://github.com/devonalanakins/" + project.slug;
  const v5 = renderV5ProjectPage(project.slug);
  assert.ok(v5.includes(project.summary), "The public concept must remain useful");
  assert.ok(!v5.includes(privateSource), "V5 must not link to nonpublic source");

  const handler = createHandler(assets, { version: "test", commit: "synthetic" });
  const response = await handler.fetch(new Request("https://devonakins.com/work/" + project.slug + "/"));
  assert.equal(response.status, 200);
  const built = await response.text();
  assert.ok(built.includes(project.summary));
  assert.ok(!built.includes(privateSource), "Built public HTML must not disclose private source");
});
