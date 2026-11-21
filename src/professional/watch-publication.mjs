// An explicit public publication manifest. Nothing appears until recordings,
// captions, playback, rights and the owner's release have been verified.
export const WATCH_KINDS = Object.freeze({
  conversation: "Conversation",
  recording: "Studio recording",
  lesson: "Lesson",
  replay: "Live replay"
});
const approvedVideos = [];

export function watchPublication(videos = approvedVideos, today = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(videos) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new TypeError("Invalid watch publication input");
  }
  const slugs = new Set();
  const result = [];
  for (const item of videos) {
    if (item?.approved !== true) continue;
    const {slug, title, summary, date, durationSeconds, kind, streamUid,
      notes = [], transcript = [], chapters = []} = item;
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        slugs.has(slug) || typeof title !== "string" || !title.trim() ||
        typeof summary !== "string" || !summary.trim() ||
        typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
        !Number.isSafeInteger(durationSeconds) || durationSeconds < 1 ||
        !Object.hasOwn(WATCH_KINDS, kind) ||
        typeof streamUid !== "string" || !/^[0-9a-f]{32}$/i.test(streamUid)) {
      throw new Error("Invalid approved watch video");
    }
    // Member video is never copied into this public manifest.
    if (item.visibility !== "public" || item.rightsApproved !== true ||
        item.captionsVerified !== true || item.playbackVerified !== true) {
      throw new Error("Watch videos require verified public playback, captions and rights");
    }
    if (!Array.isArray(notes) || !Array.isArray(transcript) ||
        notes.some(line => typeof line !== "string") ||
        transcript.some(line => typeof line !== "string")) {
      throw new Error("Invalid watch video notes or transcript");
    }
    if (!Array.isArray(chapters) || chapters.some(({startSeconds, title}, index) =>
      !Number.isSafeInteger(startSeconds) || startSeconds < 0 || startSeconds >= durationSeconds ||
      (index === 0 ? startSeconds !== 0 : startSeconds <= chapters[index - 1].startSeconds) ||
      typeof title !== "string" || !title.trim())) {
      throw new Error("Invalid watch video chapters");
    }
    if (date > today) continue;
    slugs.add(slug);
    result.push({slug, title, summary, date, durationSeconds, kind,
      streamUid: streamUid.toLowerCase(), notes, transcript, chapters,
      route: "/watch/" + slug + "/"});
  }
  result.sort((a,b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return {videos: result};
}
