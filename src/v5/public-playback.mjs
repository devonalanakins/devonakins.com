// The existing V4 public projection is the only playback input.
// This renderer cannot query a Spotify account, refresh tokens or bypass
// disclosure; it fails closed on incomplete, malformed or stale events.
const spotifyTrack = /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/;
const spotifyArt = /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/;
const quiet = (state, title, artist) => ({
  state, title, artist, href: "/listening/", image: null, progress: null,
});
export function publicV5Playback(value, at = Date.now()) {
  if (!Number.isFinite(at) || !value || value.version !== 1) {
    return quiet("unavailable", "Playback unavailable", "No verified public playback");
  }
  if (value.mode === "hidden") return quiet(
    "private", "Listening privately", "Spotify sharing off",
  );
  if (value.mode === "off_air") return quiet(
    "off_air", "No active playback", "Paused or stopped",
  );
  if (value.mode !== "playing") return quiet(
    "unavailable", "Playback unavailable", "No verified public playback",
  );
  if (value.detailsVisible !== true) return quiet(
    "private", "Playing privately", "Track details not shared",
  );
  const stamp = value.updatedAt;
  const observed = typeof stamp === "string" ? Date.parse(stamp) : NaN;
  if (!Number.isFinite(observed) || new Date(observed).toISOString() !== stamp ||
      observed > at + 10_000 || at - observed > 120_000) {
    return quiet("unavailable", "Playback unavailable", "Source stale or unavailable");
  }
  const track = value.track;
  if (!track || typeof track.title !== "string" || !track.title.trim() ||
      track.title.length > 120 || typeof track.artist !== "string" ||
      !track.artist.trim() || track.artist.length > 358 ||
      !spotifyTrack.test(track.url)) {
    return quiet("unavailable", "Playback unavailable", "No verified track details");
  }
  const image = typeof track.image === "string" && spotifyArt.test(track.image)
    ? track.image : null;
  let progress = null;
  const playback = value.playback;
  if (playback && Number.isSafeInteger(playback.durationMs) &&
      playback.durationMs > 0 && playback.durationMs <= 86_400_000 &&
      Number.isSafeInteger(playback.progressMs) &&
      playback.progressMs >= 0 && playback.progressMs <= playback.durationMs) {
    const current = Math.min(
      playback.durationMs, playback.progressMs + Math.max(0, at - observed),
    );
    if (current >= playback.durationMs) return quiet(
      "unavailable", "Checking next track", "Current track may have ended",
    );
    progress = { value: current, max: playback.durationMs };
  }
  return {
    state: "playing", title: track.title, artist: track.artist,
    href: track.url, image, progress,
  };
}
