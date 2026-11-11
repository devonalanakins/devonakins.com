// Owner-written notes are public only when the source explicitly released them.
// They are never proof of current coding, an agent run, or a GitHub event.
const MAX_NOTE_MS = 7 * 24 * 60 * 60_000;
const NOTE_KEYS = "expiresAt|postedAt|text|version|visibility";

export function publicHomepageNote(value, now = Date.now()) {
  if (!Number.isFinite(now) || !value || typeof value !== "object" ||
      Array.isArray(value) || Object.keys(value).sort().join("|") !== NOTE_KEYS) return null;
  const postedAt = typeof value.postedAt === "string" ? Date.parse(value.postedAt) : NaN;
  const expiresAt = typeof value.expiresAt === "string" ? Date.parse(value.expiresAt) : NaN;
  if (value.version !== 1 || value.visibility !== "public" ||
      typeof value.text !== "string" || !value.text.length ||
      value.text !== value.text.trim() || value.text.length > 60 ||
      /[\p{Cc}\p{Cf}]/u.test(value.text) ||
      !Number.isFinite(postedAt) || !Number.isFinite(expiresAt) ||
      postedAt > now + 10_000 || expiresAt <= now ||
      expiresAt <= postedAt || expiresAt - postedAt > MAX_NOTE_MS) return null;
  return Object.freeze({ text: value.text, postedAt: value.postedAt,
    expiresAt: value.expiresAt, expiresAtMs: expiresAt });
}

export function publicHomepageFocus(homepage, rawNote, now = Date.now()) {
  const active = homepage?.available === true ? homepage.focus : null;
  // A cached homepage summary is not permanent proof of activity. Recheck the
  // timestamp whenever a note request or expiry repaints Current Focus.
  const observedAt = typeof active?.at === "string" ? Date.parse(active.at) : NaN;
  const elapsed = now - observedAt;
  const knownSource = active?.kind === "editor"
    ? active.source === "Editor observed"
    : active?.kind === "remote" &&
      ["Codex task", "Work task", "Workflow task"].includes(active.source);
  if (Number.isFinite(now) && knownSource &&
      typeof active.title === "string" && active.title.length > 0 &&
      Number.isFinite(observedAt) && elapsed >= -10_000 && elapsed < 120_000) {
    const age = elapsed < 60_000 ? "under a minute ago" :
      Math.floor(elapsed / 60_000) + "m ago";
    return { kind: "observed", title: active.title,
      detail: active.source + " \u00b7 observed " + age };
  }
  const note = publicHomepageNote(rawNote, now);
  if (note) return { kind: "owner-note", title: note.text,
    detail: "Owner-published note \u00b7 expires " +
      new Date(note.expiresAtMs).toLocaleString() +
      " \u00b7 not a live work session" };
  return { kind: "unavailable", title: "No current public work observed",
    detail: homepage?.available === true
      ? "No fresh approved editor or participating task observations."
      : "Public work source unavailable or sharing disabled." };
}
