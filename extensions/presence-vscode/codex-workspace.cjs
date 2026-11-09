/**
 * Local Codex launch guard. Do not read auth files, inspect prompts, or use API billing keys.
 * The Codex CLI owns ChatGPT authentication. This companion only checks its declared mode.
 */
const { execFile } = require('node:child_process');

const CREDENTIAL_ENV_KEYS = Object.freeze([
  'OPENAI_API_KEY',
  'CODEX_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_API_BASE',
  'CODEX_ACCESS_TOKEN',
]);

function withoutApiCredentials(environment = process.env) {
  const safe = { ...environment };
  for (const key of CREDENTIAL_ENV_KEYS) delete safe[key];
  return safe;
}

function codexAuthenticationMode(stdout) {
  if (typeof stdout !== 'string' || stdout.length > 1024) return 'unknown';
  const line = stdout.trim();
  if (line === 'Logged in using ChatGPT') return 'chatgpt';
  if (line === 'Logged in using an API key') return 'api-key';
  if (line === 'Logged in using Agent Identity') return 'agent-identity';
  if (line === 'Not logged in') return 'not-logged-in';
  return 'unknown';
}

function inspectCodexAuthentication({
  runner = execFile, environment = process.env, platform = process.platform,
} = {}) {
  return new Promise((resolve) => {
    const options = {
      shell: false,
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024,
      env: withoutApiCredentials(environment),
    };
    // npm on Windows may expose only codex.cmd. Node execFile cannot launch
    // .cmd directly, so fall back to cmd.exe with a FIXED command string.
    // No prompt, repository path, account data or user input reaches cmd.exe.
    function run(file, args, allowWindowsFallback) {
      const missingShim = (error) =>
        allowWindowsFallback && platform === 'win32' && error?.code === 'ENOENT';
      try {
        runner(file, args, options, (error, stdout) => {
          if (missingShim(error)) {
            run('cmd.exe', ['/d', '/s', '/c', 'codex login status'], false);
            return;
          }
          resolve(error ? 'unavailable' : codexAuthenticationMode(stdout));
        });
      } catch (error) {
        if (missingShim(error)) run('cmd.exe', ['/d', '/s', '/c', 'codex login status'], false);
        else resolve('unavailable');
      }
    }
    run('codex', ['login', 'status'], true);
  });
}

const terminalEnvironment = Object.freeze(
  Object.fromEntries(CREDENTIAL_ENV_KEYS.map((key) => [key, null])),
);

function registerCodexWorkspace(api, context, { inspect = inspectCodexAuthentication } = {}) {
  let disposed = false;
  let starting = false;
  const status = api.window.createStatusBarItem(api.StatusBarAlignment.Right, 0);
  status.command = 'devonPresence.codexAccount';
  status.text = '$(shield) Codex: check account';
  status.tooltip = 'Verify Codex CLI uses ChatGPT sign-in; this is not a usage counter.';
  status.show();

  const setStatus = (value) => {
    if (!disposed) status.text = '$(shield) Codex: ' + value;
  };
  async function account() {
    if (disposed) return 'unavailable';
    setStatus('checking');
    let mode;
    try { mode = await inspect(); }
    catch { mode = 'unavailable'; }
    if (disposed) return 'unavailable';
    setStatus(mode === 'chatgpt' ? 'ChatGPT sign-in' :
      mode === 'api-key' ? 'API key (blocked)' :
      mode === 'not-logged-in' ? 'sign-in required' : 'not verified');
    return mode;
  }
  async function login() {
    if (disposed) return;
    if (api.workspace.isTrusted !== true) {
      await api.window.showWarningMessage('Trust the workspace before launching Codex.');
      return;
    }
    const chosen = await api.window.showWarningMessage(
      'This companion cannot verify ChatGPT sign-in. Open the official Codex CLI sign-in? No API key is required.',
      'Open ChatGPT sign-in',
    );
    if (disposed || chosen !== 'Open ChatGPT sign-in') return;
    const terminal = api.window.createTerminal({
      name: 'Codex ChatGPT sign-in', env: { ...terminalEnvironment },
    });
    terminal.show();
    terminal.sendText('codex login', true);
  }
  async function start() {
    if (starting || disposed) return;
    starting = true;
    try {
      if (api.workspace.isTrusted !== true) {
        await api.window.showWarningMessage('Open a trusted workspace before launching Codex.');
        return;
      }
      const folders = api.workspace.workspaceFolders || [];
      if (!folders.length) {
        await api.window.showWarningMessage('Open a project folder in VS Code first.');
        return;
      }
      const mode = await account();
      if (disposed) return;
      if (mode !== 'chatgpt') {
        if (mode === 'api-key') {
          await api.window.showWarningMessage(
            'Codex is using API-key authentication, which has separate API billing. No session started. Sign in to Codex with ChatGPT first.',
          );
        } else {
          await login();
        }
        return;
      }
      let folder = folders[0];
      if (folders.length > 1) {
        const choice = await api.window.showQuickPick(
          folders.map((candidate) => ({ label: candidate.name, folder: candidate })),
          { placeHolder: 'Choose which trusted workspace to open in Codex' },
        );
        if (!choice || disposed) return;
        folder = choice.folder;
      }
      if (disposed) return;
      const terminal = api.window.createTerminal({
        name: 'Codex (ChatGPT)',
        cwd: folder.uri.fsPath,
        env: { ...terminalEnvironment },
      });
      terminal.show();
      terminal.sendText('codex', true);
      setStatus('CLI launched');
      // CLI sign-in method is not proof of active workspace or provider entitlement.
      await api.window.showInformationMessage(
        'Codex opened with ChatGPT credentials. Confirm the intended account/workspace and provider in Codex (/status). Usage appears in OpenAI only if the request succeeds; it is not a website token reading.',
      );
    } finally {
      starting = false;
    }
  }
  async function usage() {
    if (disposed) return;
    await api.env.openExternal(api.Uri.parse('https://chatgpt.com/'));
    if (!disposed) await api.window.showInformationMessage(
      'Open ChatGPT Settings > Usage (or Desktop Settings > Usage & billing, if available). Work/Codex credits, session tokens, and profile lifetime tokens are distinct metrics.',
    );
  }
  const registrations = [
    ['codexAccount', async () => {
      const mode = await account();
      if (!disposed && mode === 'chatgpt') await api.window.showInformationMessage(
        'Codex CLI reports ChatGPT sign-in. Confirm the selected ChatGPT workspace in the official client; this check does not inspect identity, prove a successful model request, or fetch lifetime usage.',
      );
      else if (!disposed && mode === 'api-key') await api.window.showWarningMessage(
        'Codex CLI reports API-key authentication. The ChatGPT-plan launcher will not start a session.',
      );
      else if (!disposed) await api.window.showWarningMessage(
        'ChatGPT authentication could not be verified. Install/update Codex CLI and sign in with ChatGPT.',
      );
    }],
    ['codexStart', start],
    ['codexLogin', login],
    ['codexUsage', usage],
  ].map(([name, fn]) => api.commands.registerCommand('devonPresence.' + name, fn));
  const dispose = () => {
    disposed = true;
    for (const item of registrations) item.dispose();
    status.dispose();
  };
  context.subscriptions.push({ dispose });
  return { account, start, login, usage, dispose };
}

module.exports = {
  CREDENTIAL_ENV_KEYS, withoutApiCredentials, codexAuthenticationMode,
  inspectCodexAuthentication, registerCodexWorkspace,
};
