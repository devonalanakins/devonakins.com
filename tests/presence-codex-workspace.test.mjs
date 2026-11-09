import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  CREDENTIAL_ENV_KEYS, withoutApiCredentials, codexAuthenticationMode,
  inspectCodexAuthentication, registerCodexWorkspace,
} = require('../extensions/presence-vscode/codex-workspace.cjs');

function fixture({ mode = 'chatgpt', trusted = true, folders = 1, selection } = {}) {
  const calls = { terminals: [], commands: new Map(), messages: [], urls: [] };
  let statusText;
  const api = {
    StatusBarAlignment: { Right: 1 },
    workspace: {
      isTrusted: trusted,
      workspaceFolders: Array.from({ length: folders }, (_, i) => ({
        name: 'folder-' + i, uri: { fsPath: '/checkout-' + i },
      })),
    },
    commands: { registerCommand(name, fn) {
      calls.commands.set(name, fn);
      return { dispose() { calls.commands.delete(name); } };
    } },
    window: {
      createStatusBarItem() { return {
        set text(value) { statusText = value; }, get text() { return statusText; },
        show() {}, dispose() { calls.disposedStatus = true; },
      }; },
      createTerminal(options) {
        const term = { options, sent: [], show() {this.shown = true;},
          sendText(value, execute) {this.sent.push({value, execute});} };
        calls.terminals.push(term);
        return term;
      },
      async showWarningMessage(value, choice) { calls.messages.push({kind:'warning', value}); return selection ?? choice; },
      async showInformationMessage(value) { calls.messages.push({kind:'info', value}); },
      async showQuickPick(choices) {return choices.at(-1);},
    },
    env: { async openExternal(url) { calls.urls.push(url); return true; } },
    Uri: { parse(value) {return value;} },
  };
  const context = { subscriptions: [] };
  const client = registerCodexWorkspace(api, context, { inspect: async () => mode });
  return { client, calls, context, api, get statusText() { return statusText; } };
}

test('the Codex login status parser is strict and does not infer plan, seat or identity', () => {
  assert.equal(codexAuthenticationMode('Logged in using ChatGPT\n'), 'chatgpt');
  assert.equal(codexAuthenticationMode('Logged in using an API key'), 'api-key');
  assert.equal(codexAuthenticationMode('Logged in using Agent Identity'), 'agent-identity');
  assert.equal(codexAuthenticationMode('Not logged in'), 'not-logged-in');
  for (const invalid of [
    'Logged in using ChatGPT with an API key',
    'Logged in using ChatGPT\nsecret',
    'chatgpt',
    'Logged in using ChatGPT'.repeat(80),
    null,
  ]) assert.equal(codexAuthenticationMode(invalid), 'unknown');
});

test('CLI authentication probe removes API key overrides and never shells out', async () => {
  let call;
  const mode = await inspectCodexAuthentication({
    environment: {
      PATH:'/usr/bin', OPENAI_API_KEY:'secret', CODEX_API_KEY:'secret',
      CODEX_ACCESS_TOKEN:'secret', OPENAI_BASE_URL:'https://example.test', CODEX_HOME:'/tmp/codex',
    },
    runner(file, args, options, callback) {
      call = { file, args, options };
      callback(null, 'Logged in using ChatGPT\n', '');
    },
  });
  assert.equal(mode, 'chatgpt');
  assert.equal(call.file, 'codex');
  assert.deepEqual(call.args, ['login', 'status']);
  assert.equal(call.options.shell, false);
  assert.equal(call.options.env.PATH, '/usr/bin');
  assert.equal(call.options.env.CODEX_HOME, '/tmp/codex');
  for (const key of CREDENTIAL_ENV_KEYS) assert.equal(call.options.env[key], undefined);
  assert.equal(withoutApiCredentials({ OPENAI_API_KEY:'hidden', PATH:'/bin' }).PATH, '/bin');
});

test('missing CLI and runner failure fail closed', async () => {
  const broken = await inspectCodexAuthentication({runner() {throw Error('missing')}});
  assert.equal(broken, 'unavailable');
  const missing = await inspectCodexAuthentication({runner(file,args,opts,cb){cb(Error('ENOENT'), '');}});
  assert.equal(missing, 'unavailable');
});

test('ChatGPT login opens a trusted VS Code workspace without API-key environment', async () => {
  const f = fixture();
  await f.client.start();
  assert.equal(f.calls.terminals.length, 1);
  assert.equal(f.calls.terminals[0].options.cwd, '/checkout-0');
  assert.deepEqual(f.calls.terminals[0].sent, [{value:'codex',execute:true}]);
  assert.equal(f.calls.terminals[0].shown, true);
  for (const key of CREDENTIAL_ENV_KEYS) assert.equal(f.calls.terminals[0].options.env[key], null);
  assert.match(f.statusText, /CLI launched/);
  assert.ok(f.calls.messages.some(m=>m.kind==='info' && /not a website token reading/.test(m.value)));
  f.client.dispose();
});

test('an API-key session is blocked without a login or CLI launch', async () => {
  const f = fixture({mode:'api-key'});
  await f.client.start();
  assert.equal(f.calls.terminals.length, 0);
  assert.match(f.statusText, /API key \\(blocked\\)/);
  assert.ok(f.calls.messages.some(m=>/separate API billing/.test(m.value)));
  f.client.dispose();
});

test('unknown or missing authentication never launches a coding session', async () => {
  for (const mode of ['unavailable','unknown','not-logged-in','agent-identity']) {
    const f = fixture({mode,selection:undefined});
    await f.client.start();
    assert.equal(f.calls.terminals.length, 1, 'only explicit login terminal may open');
    assert.deepEqual(f.calls.terminals[0].sent, [{value:'codex login',execute:true}]);
    f.client.dispose();
    const declined = fixture({mode,selection:'No'});
    await declined.client.start();
    assert.equal(declined.calls.terminals.length, 0);
    declined.client.dispose();
  }
});

test('untrusted and empty workspaces fail before inspecting authentication or opening terminals', async () => {
  for (const options of [{trusted:false},{folders:0}]) {
    const f = fixture(options);
    await f.client.start();
    assert.equal(f.calls.terminals.length, 0);
    assert.ok(f.calls.messages.some(m=>m.kind==='warning'));
    f.client.dispose();
  }
});

test('multi-root selection uses the selected folder and never interpolates a path in the shell command', async () => {
  const f = fixture({folders:2});
  await f.client.start();
  assert.equal(f.calls.terminals[0].options.cwd,'/checkout-1');
  assert.equal(f.calls.terminals[0].sent[0].value,'codex');
  f.client.dispose();
});

test('usage is owner-initiated, never scraped or reported as a live counter', async () => {
  const f = fixture();
  assert.equal(f.calls.urls.length, 0);
  await f.client.usage();
  assert.deepEqual(f.calls.urls, ['https://chatgpt.com/']);
  assert.ok(f.calls.messages.some(m=>/distinct metrics/.test(m.value)));
  f.client.dispose();
});

test('dispose unregisters commands and stops subsequent launches', async () => {
  const f = fixture();
  assert.equal(f.calls.commands.size, 4);
  f.client.dispose();
  await f.client.start();
  assert.equal(f.calls.terminals.length, 0);
  assert.equal(f.calls.commands.size, 0);
  assert.equal(f.calls.disposedStatus, true);
});
