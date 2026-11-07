import test from "node:test";
import assert from "node:assert/strict";
import { renderV5Preview, renderV5PublicHomepage } from "../src/v5/shell.mjs";
import { publicV5ActivationMode } from "../src/v5/source-activation.mjs";

test("public V5 homepage uses identical approved layout, no preview notice and explicit release marker", () => {
  const preview = renderV5Preview("home");
  const released = renderV5PublicHomepage();
  const layout = /data-v5-exact-reference="2026-11-07"/g;
  assert.equal((released.match(layout) ?? []).length, 1);
  assert.equal((released.match(/class="v5-lock-project-art"/g) ?? []).length, 5);
  assert.equal((released.match(/class="v5-lock-beam v5-lock-/g) ?? []).length, 8);
  for (const key of ["v5-locked-portrait", "v5-lock-projects", "v5-lock-triple", "v5-lock-field"]) {
    assert.ok(preview.includes(key) && released.includes(key));
  }
  assert.match(released, /<html lang="en" data-v5-signal-mode="released-v5">/);
  assert.equal(publicV5ActivationMode("/", "released-v5"), "automatic");
  assert.match(released, /<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(released, /Developer, Researcher, Builder<\/title>/);
  assert.doesNotMatch(released, /__v5_preview__|data-v5-preview-connect|DESIGN PREVIEW/);
  assert.doesNotMatch(released, /noindex|Development-only Living Mind V5|V5 Preview/);
  assert.match(preview, /data-v5-signal-mode="preview"/);
  assert.match(preview, /noindex,nofollow,noarchive/);
});
test("public V5 navigation preserves established public routes and truthful disclosures", () => {
  const html=renderV5PublicHomepage();
  for(const path of ["/","/work/","/source/","/work/writing/","/about/","/studio/","/listening/","/gpt/"]){
    assert.ok(html.includes('href="'+path+'"'),path);
  }
  assert.ok(html.includes('href="/#v5-lock-field-title"'));
  assert.match(html,/No fresh, verified work session/);
  assert.match(html,/Awaiting consented source/);
  assert.match(html,/Manual · dated/);
  assert.match(html,/No verified inter-project dependencies are published here/);
  assert.doesNotMatch(html, /\/<script[^>]*>[^<]*fetch\(|source token|private Knowledge/i);
});
