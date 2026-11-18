import assert from 'node:assert/strict';

/** The ongoing smoke check must enforce the actually serving variant's contract. */
export function validatePublicAnalytics(signal, health) {
  if (health.variant === 'laboratory') {
    assert.equal(Object.hasOwn(signal, 'gpt'), false,
      'The cinematic public signal must omit retired analytics');
    return;
  }
  if (signal.gpt?.state === 'snapshot') {
    const g = signal.gpt;
    assert.match(g.metric || '', /^(?:profile_7d_tokens|profile_lifetime_tokens_approx|profile_7d_messages|profile_streak_days|work_codex_credits_remaining|work_codex_credits_used|business_7d_messages|business_7d_credits_used)$/);
    assert.ok(Number.isFinite(g.count) && g.count >= 0);
    assert.ok(Number.isFinite(Date.parse(g.asOf)));
    assert.equal(g.sourceUpdatedAt, null, 'Owner capture is never an OpenAI provider update');
    assert.ok(['recent', 'historical'].includes(g.freshness));
  } else {
    assert.equal(signal.gpt?.state, 'disconnected');
    assert.equal(signal.gpt?.count, null);
  }
}
