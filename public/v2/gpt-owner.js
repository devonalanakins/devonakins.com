// Protected, private, owner-initiated Work/Codex observation entry.
// No ChatGPT session/cookies/screenshots, no client-side saved usage history.
(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const url = "/api/gpt-observation/owner";
  const metrics = Object.freeze({
    work_codex_credits_remaining: "credits",
    work_codex_credits_used: "credits",
    work_codex_remaining_percent: "%",
    work_codex_used_percent: "%",
  });
  const metric = byId("gpt-owner-metric");
  const value = byId("gpt-owner-value");
  const reviewed = byId("gpt-owner-reviewed");
  const save = byId("gpt-owner-save");
  const notice = byId("gpt-owner-notice");
  const last = byId("gpt-owner-last");
  let available = false;
  let busy = false;
  const updateButton = () => {
    const num = Number(value.value);
    const selected = metrics[metric.value];
    const maximum = selected === "%" ? 100 : 1000000;
    value.max = String(maximum);
    save.disabled = busy || !available || !reviewed.checked ||
      !Object.hasOwn(metrics, metric.value) || value.value.trim() === "" ||
      !Number.isFinite(num) || num < 0 || num > maximum;
  };
  async function request(method = "GET", body) {
    const response = await fetch(url, {
      method, credentials: "same-origin", cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json"))
      throw new Error(response.status === 429 ?
        "A new observation is allowed five minutes after the previous one." :
        response.status === 403 ? "Owner session unavailable." :
        response.status === 503 || response.status === 404 ?
          "Private snapshot storage is not configured yet." :
          "Snapshot request could not be completed.");
    return response.json();
  }
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    updateButton();
    try {
      const data = await request();
      available = true;
      if (data.status === "no-data" || !data.observation) {
        last.textContent = "No Work/Codex observation recorded.";
      } else {
        const o = data.observation;
        const unit = metrics[o.metric];
        if (!unit || !Number.isFinite(o.value) ||
            o.source !== "owner-reviewed-dashboard" &&
            o.source !== "user-selected-visible-usage-text")
          throw Error("Stored observation is not recognized.");
        last.textContent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })
          .format(o.value) + (unit === "%" ? "%" : " credits") +
          " · recorded " + new Date(o.observedAt).toLocaleString() +
          " · " + (data.status === "stale" ? "dated" : "recent") +
          " · private by default";
      }
      notice.textContent = "Private observation interface available. No automatic ChatGPT account connection.";
    } catch (error) {
      available = false;
      notice.textContent = error.message;
      last.textContent = "No verified observation available.";
    } finally {
      busy = false;
      updateButton();
    }
  }
  async function record() {
    updateButton();
    if (save.disabled) return;
    busy = true;
    updateButton();
    try {
      const result = await request("POST", {
        version: 1, metric: metric.value, value: Number(value.value),
        reviewed: true,
      });
      if (result.accepted !== true) throw Error("Observation was not confirmed.");
      reviewed.checked = false;
      value.value = "";
      busy = false;
      await refresh();
      notice.textContent = "Owner-reviewed observation recorded privately.";
    } catch (error) {
      notice.textContent = error.message;
      busy = false;
    } finally {
      updateButton();
    }
  }
  metric.addEventListener("change", updateButton);
  value.addEventListener("input", updateButton);
  reviewed.addEventListener("change", updateButton);
  save.addEventListener("click", () => void record());
  byId("gpt-owner-refresh").addEventListener("click", () => void refresh());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void refresh();
  });
  window.setInterval(() => {
    if (!document.hidden) void refresh();
  }, 5 * 60 * 1000);
  void refresh();
})();
