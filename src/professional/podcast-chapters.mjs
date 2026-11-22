/**
 * Progressive enhancement of already published, first-party podcast chapters.
 * Unpublished episodes never reach this page. The original timestamps remain
 * readable without JavaScript; video previews and external member players are
 * deliberately excluded from seeking.
 */
(() => {
  "use strict";
  function hydrate() {
    const article = document.querySelector(".pc-episode-detail");
    const list = article?.querySelector(".pc-chapters[data-episode-chapters]");
    if (!list || list.dataset.hydrated === "true") return;
    const video = article.querySelector("video[data-episode-full-video]");
    const audio = article.querySelector("audio[data-episode-audio]");
    if (!video && !audio) return;
    list.dataset.hydrated = "true";
    const feedback = document.createElement("p");
    feedback.className = "pc-chapters-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    list.after(feedback);
    let requestId = 0;
    function selectPlayer() {
      // Keep the medium the visitor is already using; otherwise prefer video.
      if (audio && !audio.paused && !audio.ended) return audio;
      if (video && !video.paused && !video.ended) return video;
      return video || audio;
    }
    for (const item of list.querySelectorAll("li[data-chapter-start]")) {
      const start = Number(item.dataset.chapterStart);
      const time = item.querySelector("time");
      if (!Number.isSafeInteger(start) || start < 0 || !time) continue;
      const label = item.querySelector(".pc-chapter-title")?.textContent?.trim() || "Chapter";
      const display = time.textContent?.trim() || "0:00";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pc-chapter-jump";
      button.setAttribute("aria-label", "Play from " + display + " — " + label);
      // Move existing visible content; don't duplicate/replace the no-JS text.
      while (item.firstChild) button.appendChild(item.firstChild);
      item.append(button);
      button.addEventListener("click", () => {
        const player = selectPlayer();
        if (!player) return;
        const token = ++requestId;
        const other = player === video ? audio : video;
        if (other && !other.paused) other.pause();
        const playFromChapter = async () => {
          if (token !== requestId) return;
          try {
            if (player.error || (Number.isFinite(player.duration) && start >= player.duration)) {
              feedback.textContent = "This chapter is unavailable in the current recording.";
              return;
            }
            player.currentTime = start;
            const playback = player.play();
            if (playback && typeof playback.then === "function") await playback;
            if (token === requestId) feedback.textContent = "Playing from " + display + ": " + label + ".";
          } catch {
            if (token === requestId) feedback.textContent =
              "Playback could not start. You can still use the recording's native controls.";
          }
        };
        if (player.readyState >= 1) {
          void playFromChapter();
        } else {
          feedback.textContent = "Loading recording to open " + label + "…";
          // In-flight chapter requests are superseded by the most recent click.
          player.addEventListener("loadedmetadata", () => { void playFromChapter(); }, {once: true});
          player.addEventListener("error", () => {
            if (token === requestId) feedback.textContent = "Recording unavailable. Try again later.";
          }, {once: true});
          player.preload = "metadata";
          player.load();
        }
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrate, {once: true});
  } else {
    hydrate();
  }
})();
