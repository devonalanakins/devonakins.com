// One same-origin read model for the ribbon, feed, soundtrack ticker and Listening.
type Task = {
  id?: string;
  source: string;
  project: string | null;
  state: string;
  checkpoint: string | null;
  asOf: string;
  expiresAt: string;
};
const projects = [
  "Merit",
  "Rhen",
  "Mizvo",
  "DevonStation",
  "Squelch",
  "Anevum",
  "Brandicade",
  "Vesper",
  "Knowledge",
  "DevonAkins.com",
];
const sources: Record<string, string> = {
  codex: "Codex task",
  "chatgpt-work": "Work task",
  "github-actions": "Workflow task",
};
const gptMetrics: Record<string, { unit: string; scope: string; source: string; label: string; max: number }> = {
  profile_7d_tokens: { unit: "tokens", scope: "owner-profile", source: "owner-profile-capture", label: "7-day tokens", max: 1e12 },
  profile_lifetime_tokens_approx: { unit: "tokens", scope: "owner-profile", source: "owner-profile-capture", label: "Approx. total tokens", max: 1e12 },
  profile_7d_messages: { unit: "messages", scope: "owner-profile", source: "owner-profile-capture", label: "7-day messages", max: 1e9 },
  profile_streak_days: { unit: "days", scope: "owner-profile", source: "owner-profile-capture", label: "Streak at capture", max: 36500 },
  work_codex_credits_remaining: { unit: "credits", scope: "work-codex", source: "owner-work-codex-usage", label: "Credits remaining", max: 1e6 },
  work_codex_credits_used: { unit: "credits", scope: "work-codex", source: "owner-work-codex-usage", label: "Credits used", max: 1e6 },
  business_7d_messages: { unit: "messages", scope: "business-member", source: "owner-business-analytics", label: "Member messages · 7d", max: 1e9 },
  business_7d_credits_used: { unit: "credits", scope: "business-member", source: "owner-business-analytics", label: "Member credits · 7d", max: 1e6 },
};
const checkpoints: Record<string, string> = {
  testing: "Testing",
  "tests-passed": "Tests reported passed",
  building: "Building",
  reviewing: "Reviewing",
};
const fresh = (v: any, at: number, ttl = 120000) =>
  typeof v.asOf === "string" &&
  Number.isFinite(Date.parse(v.asOf)) &&
  Date.parse(v.asOf) <= at + 10000 &&
  at - Date.parse(v.asOf) < ttl &&
  (v.expiresAt === undefined ||
    (typeof v.expiresAt === "string" &&
      Date.parse(v.expiresAt) > at &&
      Date.parse(v.expiresAt) <= Date.parse(v.asOf) + ttl));
const text = (q: string, value: string) =>
  document.querySelectorAll<HTMLElement>(q).forEach((e) => {
    if (e.textContent !== value) e.textContent = value;
  });
const age = (iso: string, at: number) => {
  const s = Math.max(0, Math.floor((at - Date.parse(iso)) / 1000));
  return s < 60
    ? s + "s ago"
    : s < 3600
      ? Math.floor(s / 60) + "m ago"
      : s < 86400
        ? Math.floor(s / 3600) + "h ago"
        : Math.floor(s / 86400) + "d ago";
};
export function validSignalTasks(value: any, at = Date.now()): Task[] {
  if (
    value?.visibility !== "public" ||
    !Array.isArray(value.tasks) ||
    value.tasks.length > 16
  )
    return [];
  return value.tasks.filter(
    (t: any) =>
      t &&
      Object.hasOwn(sources, t.source) &&
      projects.includes(t.project) &&
      ["running", "waiting", "completed", "failed", "cancelled"].includes(
        t.state,
      ) &&
      (t.checkpoint === null || Object.hasOwn(checkpoints, t.checkpoint)) &&
      fresh(t, at),
  );
}
export function startLiveSignal(onPlayback: (data: unknown) => void) {
  let latest: any = null,
    busy = false,
    epoch = 0;
  const feedRows = new Map<string, HTMLLIElement>();
  const render = () => {
    const at = Date.now(),
      v = latest?.version === 4 && fresh(latest, at, 65000) ? latest : null;
    const w = v?.work;
    const editor =
      w?.visibility === "public" &&
      w.source === "editor-heartbeat" &&
      ["developing", "in-the-zone"].includes(w.state) &&
      (w.project === null || projects.includes(w.project)) &&
      fresh(w, at);
    const manual =
      w?.visibility === "public" &&
      w.source === "owner-declared" &&
      ["developing", "in-the-zone"].includes(w.state) &&
      (w.project === null || projects.includes(w.project)) &&
      fresh(w, at, 1800000);
    const tasks = validSignalTasks(v?.remote, at);
    const legacy = v?.legacy;
    if (
      legacy?.visibility === "public" &&
      Object.hasOwn(sources, legacy.source) &&
      (legacy.project === null || projects.includes(legacy.project)) &&
      ["running", "waiting", "completed", "failed", "cancelled"].includes(
        legacy.state,
      ) &&
      fresh(legacy, at)
    )
      tasks.push(legacy);
    const active = tasks.filter((t) => t.state === "running");
    const current = editor ? w : active[0] || (manual ? w : null);
    const currentLabel =
      current?.project ||
      (editor
        ? "Editor activity"
        : current
          ? "Remote work"
          : "No current work");
    const detail = editor
      ? "Editor observed · " + age(w.asOf, at)
      : active[0]
        ? (checkpoints[active[0].checkpoint || ""] || "Running") +
          " · " +
          sources[active[0].source]
        : manual
          ? "Owner declared · " + age(w.asOf, at)
          : "No fresh development signal";
    text("[data-signal-work]", currentLabel);
    text("[data-signal-work-detail]", detail);
    document
      .querySelector("[data-work-signal]")
      ?.setAttribute(
        "data-active",
        editor ? "editor" : active.length ? "remote" : "quiet",
      );
    // Owner-captured GPT observations are not provider-live counts. A five-minute
    // page refresh never advances their capture timestamps.
    const g = v?.gpt;
    const def = typeof g?.metric === "string" && Object.hasOwn(gptMetrics, g.metric)
      ? gptMetrics[g.metric] : null;
    const captureAt = typeof g?.asOf === "string" ? Date.parse(g.asOf) : NaN;
    const validGpt = g?.state === "snapshot" && def &&
      g.unit === def.unit && g.scope === def.scope && g.source === def.source &&
      (g.freshness === "recent" || g.freshness === "historical") &&
      g.sourceUpdatedAt === null &&
      typeof g.count === "number" && Number.isFinite(g.count) &&
      g.count >= 0 && g.count <= def.max &&
      Number.isFinite(captureAt) && captureAt <= at + 60000 && captureAt > 0;
    const gptCount = validGpt ? new Intl.NumberFormat("en-US", {
      notation:"compact", maximumFractionDigits:1,
    }).format(g.count) : "—";
    text("[data-signal-gpt]", gptCount);
    text("[data-signal-gpt-detail]", validGpt
      ? def.label + " · owner capture " + age(g.asOf,at)
      : "GPT analytics · Not connected");
    const recordedPanel = document.querySelector<HTMLElement>("#gpt-observation-panel");
    if (recordedPanel) {
      if (validGpt) {
        recordedPanel.dataset.source = "v4-snapshot";
        recordedPanel.hidden = false;
        text("#gpt-observation-value",gptCount + " " + def.unit);
        text("#gpt-observation-state",
          def.label + " · " + (g.freshness === "historical" ? "Historical" : "Recent") +
          " · Owner recorded; provider update unverified");
        text("#gpt-observation-age","Captured " + age(g.asOf,at));
      } else if (recordedPanel.dataset.source === "v4-snapshot") {
        // An approved V4 reading was revoked or became unavailable.
        // Never hide the older, separately gated observation bridge
        // when it owns this panel instead.
        delete recordedPanel.dataset.source;
        recordedPanel.hidden = true;
      }
    }
    const playback = v?.spotify || {
      version: 1,
      mode: "unavailable",
      detailsVisible: false,
    };
    const track =
      playback.mode === "playing" &&
      playback.detailsVisible === true &&
      playback.track &&
      typeof playback.track.title === "string" &&
      typeof playback.track.artist === "string" &&
      /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(
        playback.track.url,
      ) &&
      fresh({ asOf: playback.updatedAt }, at)
        ? playback.track
        : null;
    const p = playback.playback;
    const validProgress =
      track &&
      p &&
      Number.isSafeInteger(p.durationMs) &&
      p.durationMs > 0 &&
      p.durationMs <= 86400000 &&
      Number.isSafeInteger(p.progressMs) &&
      p.progressMs >= 0 &&
      p.progressMs <= p.durationMs;
    const progress = validProgress
      ? Math.min(
          p.durationMs,
          p.progressMs + Math.max(0, at - Date.parse(playback.updatedAt)),
        )
      : 0;
    const ended = validProgress && progress >= p.durationMs;
    onPlayback(
      ended
        ? { version: 1, mode: "unavailable", detailsVisible: false }
        : playback,
    );
    text(
      "[data-signal-track]",
      track && !ended
        ? track.title
        : playback.mode === "hidden"
          ? "Listening privately"
          : playback.mode === "off_air"
            ? "No active playback"
            : ended
              ? "Checking next track"
              : "Playback unavailable",
    );
    text(
      "[data-signal-artist]",
      track && !ended
        ? track.artist
        : playback.mode === "hidden"
          ? "Spotify sharing off"
          : playback.mode === "off_air"
            ? "Paused or stopped"
            : "No verified current track",
    );
    document
      .querySelectorAll<HTMLImageElement>("[data-signal-art]")
      .forEach((img) => {
        const url =
          track &&
          !ended &&
          typeof track.image === "string" &&
          /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(track.image)
            ? track.image
            : null;
        img.hidden = !url;
        if (url) {
          if (img.getAttribute("src") !== url) img.src = url;
        } else img.removeAttribute("src");
      });
    document
      .querySelectorAll<HTMLAnchorElement>("[data-signal-spotify-link]")
      .forEach((link) => {
        link.href = track && !ended ? track.url : "/listening/";
      });
    document
      .querySelectorAll<HTMLProgressElement>("[data-playback-progress]")
      .forEach((bar) => {
        bar.hidden = !validProgress || ended;
        bar.max = validProgress ? p.durationMs : 1;
        bar.value = progress;
      });
    text(
      "[data-soundtrack]",
      track && !ended ? track.title + " · " + track.artist : "Listening",
    );
    const feed = document.querySelector("[data-motion-feed]");
    const entries: Array<{
      title: string;
      detail: string;
      kind: string;
      href?: string;
    }> = [];
    if (editor)
      entries.push({
        title: currentLabel,
        detail: "Editor observed · " + age(w.asOf, at),
        kind: "editor",
      });
    tasks.slice(0, 3).forEach((t) =>
      entries.push({
        title: t.project || "Remote task",
        detail:
          (t.state === "running"
            ? checkpoints[t.checkpoint || ""] || "Running"
            : t.state === "waiting"
              ? "Waiting"
              : t.state.charAt(0).toUpperCase() + t.state.slice(1)) +
          " · " +
          sources[t.source] +
          " · " +
          age(t.asOf, at),
        kind: t.state === "running" ? "remote" : "recent",
      }),
    );
    const history = Array.isArray(v?.recent) ? v.recent : [];
    history.slice(0, 3).forEach((e: any) => {
      if (
        projects.includes(e.project) &&
        ["Commit", "Pull request", "Release"].includes(e.kind) &&
        typeof e.at === "string" &&
        Number.isFinite(Date.parse(e.at)) &&
        /^https:\/\/github\.com\/devonalanakins\/[a-z0-9.-]+$/.test(e.url)
      )
        entries.push({
          title: e.project,
          detail: e.kind + " · GitHub · " + age(e.at, at),
          kind: "recent",
          href: e.url,
        });
    });
    if (!entries.length)
      entries.push({
        title: "Between signals",
        detail: "Awaiting verified activity",
        kind: "quiet",
      });
    if (feed) {
      const desired: HTMLLIElement[] = [],
        used = new Set<string>(),
        duplicates = new Map<string, number>();
      for (const e of entries.slice(0, 3)) {
        const stem = JSON.stringify([e.kind, e.title, e.href || ""]),
          index = duplicates.get(stem) || 0,
          key = stem + index;
        duplicates.set(stem, index + 1);
        used.add(key);
        let row = feedRows.get(key);
        if (!row) {
          row = document.createElement("li");
          row.dataset.kind = e.kind;
          const content = document.createElement(e.href ? "a" : "span");
          if (e.href) (content as HTMLAnchorElement).href = e.href;
          content.append(
            document.createElement("strong"),
            document.createElement("small"),
          );
          row.append(content);
          feedRows.set(key, row);
        }
        const title = row.querySelector("strong")!,
          detail = row.querySelector("small")!;
        if (title.textContent !== e.title) title.textContent = e.title;
        if (detail.textContent !== e.detail) detail.textContent = e.detail;
        desired.push(row);
      }
      desired.forEach((row, index) => {
        if (feed.children[index] !== row)
          feed.insertBefore(row, feed.children[index] || null);
      });
      for (const child of Array.from(feed.children))
        if (!desired.includes(child as HTMLLIElement)) child.remove();
      for (const key of feedRows.keys())
        if (!used.has(key)) feedRows.delete(key);
    }
  };
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    const gen = epoch;
    try {
      const r = await fetch("/api/activity/v4", {
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok || !r.headers.get("Content-Type")?.includes("application/json"))
        throw Error();
      const v = await r.json();
      if (gen === epoch && !document.hidden) latest = v;
    } catch {
      if (gen === epoch) latest = null;
    } finally {
      busy = false;
      render();
      if (gen !== epoch && !document.hidden)
        window.setTimeout(() => void refresh(), 0);
    }
  }
  void refresh();
  const poll = window.setInterval(() => void refresh(), 30000),
    ageTimer = window.setInterval(() => {
      if (!document.hidden) render();
    }, 1000);
  document.addEventListener("visibilitychange", () => {
    epoch++;
    latest = null;
    render();
    if (!document.hidden) void refresh();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) void refresh();
  });
  window.addEventListener("pagehide", (e) => {
    epoch++;
    latest = null;
    if (!e.persisted) {
      clearInterval(poll);
      clearInterval(ageTimer);
    }
  });
  document
    .querySelector("#refresh-usage")
    ?.addEventListener("click", () => void refresh());
}
