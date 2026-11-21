// This is a public allowlist. Add an entry only after Devon approves the
// episode, credited guests, media, links and any transcript for publication.
export const PODCAST_TITLE = "Devon Alan Akins";
export const PODCAST_DESCRIPTION = "Mostly unscripted interviews and the occasional solo episode with Devon Alan Akins.";
const approvedEpisodes = [];
const approvedDistribution = {};

export function publicWebUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch {
    return null;
  }
  return null;
}

export function podcastPublication(episodes = approvedEpisodes, distribution = approvedDistribution, today = new Date().toISOString().slice(0, 10)) {
  const slugs = new Set();
  const mediaFiles = new Set();
  const path = (value, extensions) => {
    if (!value) return undefined;
    const match = /^\/podcast-media\/[a-z0-9-]+\.([a-z0-9]+)$/.exec(value);
    if (!match || !extensions.includes(match[1])) throw new Error("Invalid podcast asset path");
    mediaFiles.add(value);
    return value;
  };
  const published = episodes.flatMap(episode => {
    if (episode.approved !== true) return [];
    const {slug, title, summary, date, durationSeconds, format, guests = [], notes = [], links = [], transcript = []} = episode;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? "") || slugs.has(slug) ||
        !title?.trim() || !summary?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
        !Number.isSafeInteger(durationSeconds) || durationSeconds < 1 ||
        !["interview", "solo"].includes(format) || (format === "interview" ? !guests.length : guests.length)) {
      throw new Error("Invalid approved podcast episode");
    }
    if (date > today) return [];
    slugs.add(slug);
    const audio = path(episode.audio, ["mp3"]);
    const video = path(episode.video, ["mp4"]);
    const captions = path(episode.captions, ["vtt"]);
    const thumbnail = path(episode.thumbnail, ["avif", "webp", "jpg", "png"]);
    const playbackLinks = (episode.playbackLinks ?? []).map(({label, url}) => {
      const href = publicWebUrl(url);
      if (!label || !href) throw new Error("Invalid podcast playback link");
      return {label, href};
    });
    if (Boolean(video) !== Boolean(captions) || (!audio && !video && !playbackLinks.length)) {
      throw new Error("Podcast episodes require playable media and captions for native video");
    }
    return [{slug, title, summary, date, durationSeconds, format, guests, notes, links, transcript,
      audio, video, captions, thumbnail, playbackLinks, route: "/podcast/" + slug + "/"}];
  });
  const outlets = [
    ["spotify", "Spotify", "open.spotify.com"],
    ["apple", "Apple Podcasts", "podcasts.apple.com"],
    ["youtube", "YouTube", "www.youtube.com"],
    ["rss", "RSS", null]
  ].flatMap(([key, label, host]) => {
    if (!distribution[key]) return [];
    const href = publicWebUrl(distribution[key]);
    if (!href || (host && new URL(href).hostname !== host)) throw new Error("Invalid podcast distribution URL");
    return [{key, label, href}];
  });
  published.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return {episodes: published, outlets, mediaFiles: [...mediaFiles]};
}
