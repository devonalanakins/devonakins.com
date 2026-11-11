/**
 * Pure public Spotify projection acceptance for professional-site release QA.
 * The live verifier reads only the already-public, consent-filtered endpoint.
 * It never reads owner tokens or logs track metadata.
 */
const ISO = value => typeof value === "string" &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const exactKeys = (value, expected) =>
  Object.keys(value).sort().join("|") === [...expected].sort().join("|");
const publicText = (value, max, optional = false) =>
  typeof value === "string" && value.length <= max &&
  (optional || value.trim().length > 0);

export function validPublicListening(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      data.version !== 1 || typeof data.detailsVisible !== "boolean" ||
      !["hidden", "off_air", "unavailable", "playing"].includes(data.mode))
    return false;
  if (data.mode === "hidden") {
    return data.detailsVisible === false &&
      exactKeys(data, ["version", "mode", "detailsVisible"]);
  }
  if (!ISO(data.updatedAt)) return false;
  if (data.mode === "off_air" || data.mode === "unavailable" ||
      (data.mode === "playing" && data.detailsVisible === false)) {
    return data.detailsVisible === false &&
      exactKeys(data, ["version", "mode", "detailsVisible", "updatedAt"]);
  }
  // Only explicitly shared, currently playing tracks may disclose details.
  if (data.mode !== "playing" || data.detailsVisible !== true ||
      !data.track || typeof data.track !== "object" ||
      Array.isArray(data.track) ||
      !exactKeys(data.track, ["title", "artist", "album", "url", "image"]) ||
      !publicText(data.track.title, 120) ||
      !publicText(data.track.artist, 358) ||
      !publicText(data.track.album, 120, true) ||
      !/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(data.track.url) ||
      !(data.track.image === null ||
        (typeof data.track.image === "string" &&
          /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(data.track.image) &&
          data.track.image.length <= 256))) return false;
  if (data.playback === undefined)
    return exactKeys(data, ["version", "mode", "detailsVisible", "updatedAt", "track"]);
  const pb = data.playback;
  return exactKeys(data, ["version", "mode", "detailsVisible", "updatedAt", "track", "playback"]) &&
    pb && typeof pb === "object" && !Array.isArray(pb) &&
    exactKeys(pb, ["durationMs", "progressMs"]) &&
    Number.isSafeInteger(pb.durationMs) && pb.durationMs > 0 &&
    pb.durationMs <= 86_400_000 &&
    Number.isSafeInteger(pb.progressMs) && pb.progressMs >= 0 &&
    pb.progressMs <= pb.durationMs;
}
