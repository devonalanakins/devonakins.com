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
          // Codex exits nonzero when signed out. Preserve the explicit,
          // strictly parsed "Not logged in" result rather than labeling it
          // as a missing CLI or unavailable authentication.
          const mode = codexAuthenticationMode(stdout);
          resolve(error ? (mode === 'not-logged-in' ? mode : 'unavailable') : mode);
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

function registerCodexWorkspace(api, context, {
  inspect = inspectCodexAuthentication,
  readProfile = () => require('./codex-profile-usage.cjs').readCodexProfile(),
} = {}) {
  let disposed = false;
  let starting = false;
  const status = api.window.createStatusBarItem(api.StatusBarAlignment.Right, 0);
  status.command = 'devonPresence.codexIde';
  status.text = '$(code) Codex: open IDE';
  status.tooltip = 'Open the official Codex VS Code sidebar. IDE sign-in and usage are verified only by OpenAI.';
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
      mode === 'not-logged-in' ? 'CLI sign-in required' :
      mode === 'unavailable' ? 'CLI unavailable (IDE separate)' :
      mode === 'agent-identity' ? 'agent identity (blocked)' : 'CLI status unknown');
    return mode;
  }
  async function login(knownMode = null) {
    if (disposed) return;
    if (api.workspace.isTrusted !== true) {
      await api.window.showWarningMessage('Trust the workspace before launching Codex.');
      return;
    }
    const mode = knownMode || await inspect();
    if (disposed) return;
    if (mode === 'unavailable' || mode === 'unknown' || mode === 'agent-identity') {
      await api.window.showWarningMessage(
        'This companion could not check the standalone Codex CLI. The official Codex VS Code extension is separate and may already be signed in. You can use its sidebar without this CLI launcher. To enable the launcher, install/check the official Codex CLI and restart VS Code.',
      );
      return;
    }
    if (mode === 'chatgpt') {
      await api.window.showInformationMessage(
        'The standalone Codex CLI already reports ChatGPT sign-in. Check the intended workspace in the official Codex client.',
      );
      return;
    }
    const chosen = await api.window.showWarningMessage(
      'Open the official Codex CLI ChatGPT sign-in? No API key is required.',
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
        } else if (mode === 'not-logged-in') {
          await login(mode);
        } else {
          await api.window.showWarningMessage(
            'The standalone Codex CLI status cannot be verified. This does not mean the official VS Code Codex extension is disconnected. Use its sidebar, or check "codex login status" in PowerShell before using the optional CLI launcher.',
          );
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
  async function openIde() {
    if (disposed) return false;
    // OpenAI's published command ID, not a private extension API.
    // Only existence and navigation are checked. We cannot inspect IDE auth.
    if (!api.extensions?.getExtension('OpenAI.chatgpt')) {
      await api.window.showWarningMessage(
        'The official OpenAI Codex VS Code extension is not installed or enabled. Install it from the VS Code Marketplace to use ChatGPT sign-in without a separate CLI.',
      );
      return false;
    }
    try {
      await api.commands.executeCommand('chatgpt.openSidebar');
      return !disposed;
    } catch {
      if (!disposed) await api.window.showWarningMessage(
        'Could not open the official Codex sidebar. Enable or reload the OpenAI Codex extension and retry.',
      );
      return false;
    }
  }
  async function profileUsage() {
    if (disposed) return false;
    if (api.workspace.isTrusted !== true) {
      await api.window.showWarningMessage('Trust the workspace before reading local Codex profile data.');
      return false;
    }
    const permission = await api.window.showInformationMessage(
      'Read your own ChatGPT profile metrics locally via the official Codex app-server? Nothing will be sent to DevonAkins.com.',
      'Read local profile',
    );
    if (disposed || permission !== 'Read local profile') return false;
    let result;
    try { result = await readProfile(); } catch { result = { state: 'unavailable' }; }
    if (disposed) return false;
    if (result?.state === 'available' && Number.isSafeInteger(result.reading?.lifetimeTokens)) {
      const reading = result.reading;
      const count = new Intl.NumberFormat('en-US').format(reading.lifetimeTokens);
      await api.window.showInformationMessage(
        'ChatGPT profile lifetime tokens: ' + count +
        '. Local observation: ' + reading.observedAt +
        '. This does not prove a specific Codex session contributed, and nothing was uploaded or published.',
      );
      return true;
    }
    await api.window.showWarningMessage(
      result?.state === 'api-key-blocked'
        ? 'The Codex app-server is authenticated using an API key, not ChatGPT. Profile reading was blocked.'
        : 'No supported ChatGPT profile reading is available from the local Codex app-server. Check Codex CLI installation and ChatGPT sign-in. The official IDE can still be used independently.',
    );
    return false;
  }
  async function usage() {
    if (disposed) return;
    await api.env.openExternal(api.Uri.parse('https://chatgpt.com/'));
    if (!disposed) await api.window.showInformationMessage(
      'Open ChatGPT Settings > Usage (or Desktop Settings > Usage & billing, if available). Work/Codex credits, session tokens, and profile lifetime tokens are distinct metrics.',
    );
  }
  const registrations = [
    ['codexIde', openIde],
    ['codexProfile', profileUsage],
    ['codexAccount', async () => {
      const mode = await account();
      if (!disposed && mode === 'chatgpt') await api.window.showInformationMessage(
        'Codex CLI reports ChatGPT sign-in. Confirm the selected ChatGPT workspace in the official client; this check does not inspect identity, prove a successful model request, or fetch lifetime usage.',
      );
      else if (!disposed && mode === 'api-key') await api.window.showWarningMessage(
        'Codex CLI reports API-key authentication. The ChatGPT-plan launcher will not start a session.',
      );
      else if (!disposed) await api.window.showWarningMessage(
        mode === 'not-logged-in'
          ? 'Standalone Codex CLI is signed out. Use Devon Presence: Open Codex ChatGPT Sign-in, or keep using the official VS Code Codex sidebar with its own sign-in.'
          : 'Standalone Codex CLI could not be verified. The official VS Code Codex extension is separate and may already be signed in. Run "codex login status" in PowerShell to check the CLI, or continue using the official Codex sidebar.',
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
  return { account, start, login, usage, openIde, profileUsage, dispose };
}

module.exports = {
  CREDENTIAL_ENV_KEYS, withoutApiCredentials, codexAuthenticationMode,
  inspectCodexAuthentication, registerCodexWorkspace,
};
