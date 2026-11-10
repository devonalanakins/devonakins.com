#!/usr/bin/env node
/**
 * No-credential production check for owner-approved public Live Signal V4.
 * Never logs raw provider payloads, artwork URLs, tokens, prompts or personal stats.
 * Does not assume someone must be listening or coding during each CI check.
 */
import assert from "node:assert/strict";

const origin = "https://devonakins.com";
const forbidden = /(?:^|_)(?:refresh_cipher|access_cipher|access_token|refresh_token|client_secret|email|oauth|private_text|session_id|task_token|source_token|prompt|command_output|file_path|file_name|connection_key)(?:$|_)/i;

async function getJson(path) {
  let error = null;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(origin + path, {
        method: "GET",
        cache: "no-store",
        redirect: "error",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(18000),
      });
      assert.equal(r.status, 200, path + " must return HTTP 200");
      assert.match(r.headers.get("content-type") || "", /application\/json/i);
      assert.match(r.headers.get("cache-control") || "", /no-store/i);
      const value = await r.json();
      assert.ok(value && typeof value === "object" && !Array.isArray(value));
      // Do not dump payloads into public CI logs.
      return value;
    } catch (e) {
      error = e;
      if (i < 2) await new Promise(resolve => setTimeout(resolve, 750));
    }
  }
  throw Error(path + " anonymous production smoke failed: " + (error?.code || error?.name || "unknown"));
}

function assertSanitized(value, path = "", depth = 0) {
  assert.ok(depth < 16, "excessive nested public response");
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    assert.ok(!forbidden.test(key), "Unexpected private field in public response");
    assert.ok(typeof item !== "string" || item.length <= 1024, "Unbounded public text field");
    assertSanitized(item, path + "." + key, depth + 1);
  }
}

const [signal, listening, presence, health] = await Promise.all([
  getJson("/api/activity/v4"),
  getJson("/api/listening/now"),
  getJson("/api/presence/public"),
  getJson("/_health"),
]);
for (const value of [signal, listening, presence]) assertSanitized(value);
assert.equal(signal.version, 4);
assert.equal(listening.version, 1);
assert.equal(presence.version, 1);
assert.match(health.commit || "", /^[a-f0-9]{40}$/);
// The two requests are independent; Spotify can change tracks or pause
// between them, so their instantaneous modes are not required to match.
assert.ok(typeof signal.spotify?.mode === "string" && signal.spotify.mode.length <= 40);
assert.ok(["hidden", "public"].includes(signal.work?.visibility), "Work projection must be gated");
assert.ok(["hidden", "public"].includes(signal.remote?.visibility), "Remote task projection must be gated");
assert.ok(Array.isArray(signal.remote?.tasks) && signal.remote.tasks.length <= 16);
if (signal.gpt?.state === "snapshot") {
  const g = signal.gpt;
  assert.match(g.metric || "", /^(?:profile_7d_tokens|profile_lifetime_tokens_approx|profile_7d_messages|profile_streak_days|work_codex_credits_remaining|work_codex_credits_used|business_7d_messages|business_7d_credits_used)$/);
  assert.ok(Number.isFinite(g.count) && g.count >= 0);
  assert.ok(Number.isFinite(Date.parse(g.asOf)));
  assert.equal(g.sourceUpdatedAt, null, "Owner capture is never an OpenAI provider update");
  assert.ok(["recent", "historical"].includes(g.freshness));
} else {
  assert.equal(signal.gpt?.state, "disconnected");
  assert.equal(signal.gpt?.count, null);
}
if (signal.remote?.visibility === "public") {
  for (const task of signal.remote.tasks) {
    assert.ok(["github-actions", "codex", "chatgpt-work"].includes(task.source));
    assert.equal(task.project, "DevonAkins.com", "Only preapproved project can appear");
    assert.ok(Number.isFinite(Date.parse(task.expiresAt)));
  }
}
// An idle moment is valid. Only metadata is published, never music audio.
assert.ok(typeof listening.mode === "string" && listening.mode.length <= 40);
assert.ok(!("audio" in listening), "No audio broadcast");
console.log("Anonymous public V4 check passed: health, release schema, bounded sources, and no private fields.");
console.log("Observed modes: GPT=" + signal.gpt?.state +
  ", Spotify=" + listening.mode +
  ", work=" + signal.work.visibility +
  ", remote=" + signal.remote.visibility +
  ", tasks=" + signal.remote.tasks.length + ".");
console.log("Public GitHub history accepted: " +
  (Array.isArray(signal.recent) ? signal.recent.length : 0) +
  " dated event(s). This is not proof of current coding.");
