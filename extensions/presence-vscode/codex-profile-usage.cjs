/**
 * Read-only ChatGPT profile metrics from the documented local Codex app-server.
 * Does not access auth files, create model threads, upload data, or log raw RPC.
 */
const { spawn } = require('node:child_process');

const MAX_RESPONSE_BYTES = 256 * 1024;
const PRIVATE_ENV_KEYS = [
  'OPENAI_API_KEY', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN',
  'OPENAI_BASE_URL', 'OPENAI_API_BASE',
];
const FIELDS = [
  'lifetimeTokens', 'peakDailyTokens', 'longestRunningTurnSec',
  'currentStreakDays', 'longestStreakDays',
];

function safeEnvironment(environment = process.env) {
  const result = { ...environment };
  for (const key of PRIVATE_ENV_KEYS) delete result[key];
  return result;
}

function profileReading(result, observedAt) {
  const summary = result?.summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
  const reading = Object.create(null);
  for (const name of FIELDS) {
    const value = summary[name];
    if (value === null || value === undefined) {
      reading[name] = null;
    } else if (Number.isSafeInteger(value) && value >= 0) {
      reading[name] = value;
    } else {
      return null;
    }
  }
  // Do not infer lifetime totals from daily buckets or other products.
  if (reading.lifetimeTokens === null) return null;
  const when = new Date(observedAt);
  if (!Number.isFinite(when.valueOf())) return null;
  return Object.freeze({
    ...reading,
    observedAt: when.toISOString(),
    source: 'local-codex-app-server',
    upstreamUpdatedAt: null,
  });
}

function readCodexProfile({
  launcher = spawn,
  environment = process.env,
  platform = process.platform,
  timeoutMs = 15000,
  clock = () => new Date().toISOString(),
} = {}) {
  return new Promise((resolve) => {
    let child = null;
    let done = false;
    let buffer = '';
    let bytes = 0;
    let stage = 0;
    let timeout;
    const finish = (state, reading = null) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      try { child?.stdin?.end(); } catch {}
      try { child?.kill(); } catch {}
      resolve({ state, ...(reading ? { reading } : {}) });
    };
    const send = (message) => {
      if (done) return;
      try { child.stdin.write(JSON.stringify(message) + '\n'); }
      catch { finish('unavailable'); }
    };
    const line = (value) => {
      if (done || !value.trim()) return;
      let msg;
      try { msg = JSON.parse(value); }
      catch { finish('invalid-response'); return; }
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
        finish('invalid-response');
        return;
      }
      if (stage === 0 && msg.id === 0) {
        if (!msg.result || msg.error) { finish('unavailable'); return; }
        stage = 1;
        send({ method: 'initialized', params: {} });
        send({ id: 1, method: 'account/read', params: { refreshToken: false } });
        return;
      }
      if (stage === 1 && msg.id === 1) {
        if (msg.error || msg.result?.account?.type !== 'chatgpt') {
          finish(msg.result?.account?.type === 'apiKey' ? 'api-key-blocked' : 'chatgpt-auth-required');
          return;
        }
        stage = 2;
        send({ id: 2, method: 'account/usage/read' });
        return;
      }
      if (stage === 2 && msg.id === 2) {
        if (msg.error) { finish('usage-unavailable'); return; }
        const reading = profileReading(msg.result, clock());
        finish(reading ? 'available' : 'usage-unavailable', reading);
      }
      // Ignore unrelated notifications, including any account names/emails.
    };
    const windows = platform === 'win32';
    const command = windows ? 'cmd.exe' : 'codex';
    const args = windows ? ['/d', '/s', '/c', 'codex app-server'] : ['app-server'];
    try {
      child = launcher(command, args, {
        stdio: ['pipe', 'pipe', 'ignore'],
        shell: false,
        windowsHide: true,
        env: safeEnvironment(environment),
      });
      if (!child?.stdout || !child?.stdin) {
        finish('unavailable');
        return;
      }
      child.on('error', () => finish('unavailable'));
      child.on('close', () => finish('unavailable'));
      child.stdin.on('error', () => finish('unavailable'));
      child.stdout.on('error', () => finish('unavailable'));
      child.stdout.on('data', (chunk) => {
        if (done) return;
        bytes += Buffer.byteLength(chunk);
        if (bytes > MAX_RESPONSE_BYTES) { finish('invalid-response'); return; }
        buffer += chunk.toString('utf8');
        while (buffer.includes('\n') && !done) {
          const end = buffer.indexOf('\n');
          const part = buffer.slice(0, end);
          buffer = buffer.slice(end + 1);
          line(part);
        }
      });
      timeout = setTimeout(() => finish('timeout'), Math.max(1000, Math.min(30000, timeoutMs)));
      send({
        id: 0,
        method: 'initialize',
        params: { clientInfo: {
          name: 'devonakins_presence_readonly',
          title: 'DevonAkins Presence local profile reader',
          version: '0.4.2',
        } },
      });
    } catch {
      finish('unavailable');
    }
  });
}

module.exports = { safeEnvironment, profileReading, readCodexProfile };
