// Anonymous viewer only. No publishing controls or stream credentials.
type LiveState = 'prelaunch' | 'offline' | 'starting' | 'live' | 'unavailable';
type LivePayload = {state?: LiveState; playerUrl?: unknown};
const root = document.querySelector<HTMLElement>('[data-mobile-live]');
if (root) {
  const status = root.querySelector<HTMLElement>('[data-live-status]');
  const title = root.querySelector<HTMLElement>('[data-live-headline]');
  const description = root.querySelector<HTMLElement>('[data-live-description]');
  const offline = root.querySelector<HTMLElement>('[data-live-offline]');
  const player = root.querySelector<HTMLElement>('[data-live-player]');
  const foot = root.querySelector<HTMLElement>('[data-live-stage-label]');
  let currentPlayer: string | null = null;
  let checking = false;

  function checkedPlayerUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.search || url.hash ||
          !/^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(url.hostname) ||
          !/^\/[a-f0-9]{32}\/iframe$/.test(url.pathname)) return null;
      return url.href;
    } catch { return null; }
  }

  function setText(node: HTMLElement | null, value: string) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function show(state: LiveState, url: string | null = null) {
    if (state === 'live' && url && player && offline) {
      setText(status, 'LIVE NOW');
      setText(foot, 'LIVE / DEVON ALAN AKINS');
      if (currentPlayer !== url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.title = 'Devon Alan Akins live broadcast';
        iframe.allow = 'fullscreen; picture-in-picture; encrypted-media';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        player.replaceChildren(iframe);
        currentPlayer = url;
      }
      player.hidden = false;
      offline.hidden = true;
      root?.setAttribute('data-live-state', 'live');
      return;
    }
    if (player) { player.hidden = true; player.replaceChildren(); }
    if (offline) offline.hidden = false;
    currentPlayer = null;
    const messages: Record<Exclude<LiveState,'live'>, [string,string,string]> = {
      prelaunch: ['NOT BROADCASTING', 'No broadcast right now.', 'The phone-first studio is being set up. New conversations and lessons will appear on the site when published.'],
      offline: ['OFF AIR', 'No broadcast right now.', 'When the next session starts, it will appear here. Browse the Watch library or courses in the meantime.'],
      starting: ['CONNECTING', 'The broadcast is connecting.', 'The video signal is starting. Check back in a moment.'],
      unavailable: ['STATUS UNAVAILABLE', 'Unable to confirm the live signal.', 'The player is hidden until the broadcast can be verified. Try again shortly.'],
    };
    const [s,h,d] = messages[state === 'live' ? 'unavailable' : state];
    setText(status, s);
    setText(title, h);
    setText(description, d);
    setText(foot, 'IPHONE-FIRST BROADCAST');
    root?.setAttribute('data-live-state', state);
  }

  async function refresh() {
    if (document.hidden || checking) return;
    checking = true;
    // Without a deadline, one hung request blocks every subsequent poll and
    // can leave a stale LIVE label or iframe visible indefinitely.
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch('/api/creator/live', {
        method: 'GET', cache: 'no-store', credentials: 'omit',
        headers: {Accept: 'application/json'},
        signal: controller.signal,
      });
      if (!response.ok) { show('unavailable'); return; }
      const payload = await response.json() as LivePayload;
      const allowed: LiveState[] = ['prelaunch', 'offline', 'starting', 'live', 'unavailable'];
      if (!payload || !allowed.includes(payload.state as LiveState)) { show('unavailable'); return; }
      const url = checkedPlayerUrl(payload.playerUrl);
      show(payload.state === 'live' && !url ? 'unavailable' : payload.state as LiveState, url);
    } catch { show('unavailable'); }
    finally {
      window.clearTimeout(timeout);
      checking = false;
    }
  }
  void refresh();
  window.setInterval(() => { void refresh(); }, 45_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh();
  });
}
