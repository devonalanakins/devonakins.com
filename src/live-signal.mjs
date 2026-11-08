import { activityTasks, hiddenTasks } from "./activity-tasks.mjs";
import {
  publicPresence,
  listeningDisclosure,
  presenceRow,
} from "./presence-api.mjs";
import { approvedProjects } from "./presence-preferences.mjs";
import { publicCloudPresence } from "./cloud-presence-api.mjs";
import { readPublicGptSnapshot } from "./gpt-snapshots.mjs";
import { disconnectedThreads } from "./threads-public.mjs";

export const disconnectedGpt = () => ({
  state: "disconnected",
  scope: "personal-work-codex",
  metric: null,
  period: null,
  count: null,
  asOf: null,
  source: null,
  freshness: "unavailable",
  observations: [],
});
export const emptyPlayback = () => ({
  version: 1,
  mode: "hidden",
  detailsVisible: false,
});
export const quietWork = () => ({
  version: 1,
  visibility: "hidden",
  state: "not-broadcasting",
  asOf: null,
  source: "none",
  project: null,
});
const enabled = (env, o) =>
  env.PRESENCE_PUBLIC_RELEASE_APPROVED === "true" &&
  o?.public_enabled === 1 &&
  o.private_work !== 1;
export function createLiveSignal({
  readListening,
  readGithub,
  readThreads = async () => disconnectedThreads(),
  clock = Date.now,
}) {
  return async (env = {}) => {
    const base = () => ({
      version: 4,
      asOf: new Date(clock()).toISOString(),
      work: quietWork(),
      remote: hiddenTasks(),
      legacy: null,
      spotify: emptyPlayback(),
      gpt: disconnectedGpt(),
      threads: disconnectedThreads(),
      recent: [],
    });
    const result = base();
    // Public GitHub events are history; never an input to current work selection.
    try {
      result.recent = (await readGithub()).slice(0, 8);
    } catch {
      /* Independent provider failure. */
    }
    if (env.PRESENCE_ENABLED !== "true" || !env.LISTENING_DB) return result;
    try {
      const before = await presenceRow(env);
      if (!enabled(env, before)) return { ...result, recent: [] };
      result.recent = result.recent.filter((e) =>
        approvedProjects(before).includes(e.projectSlug),
      );
      const [work, remote, legacy, disclosure] = await Promise.all([
        publicPresence(env, readListening, clock),
        activityTasks(env, clock()),
        publicCloudPresence(env, clock),
        listeningDisclosure(env),
      ]);
      result.work = work;
      result.remote = remote;
      result.legacy = legacy.visibility === "public" ? legacy : null;
      if (disclosure.allowed)
        result.spotify = await (await readListening(env)).json();
      const after = await presenceRow(env);
      if (
        !enabled(env, after) ||
        after.revision !== before.revision ||
        after.editor_generation !== before.editor_generation
      )
        return base();
      // Fence source/task revocation during slower Spotify/GitHub provider calls.
      result.remote = await activityTasks(env, clock());
      result.legacy = await publicCloudPresence(env, clock());
      const final = await presenceRow(env);
      if (
        !enabled(env, final) ||
        final.revision !== before.revision ||
        final.editor_generation !== before.editor_generation
      )
        return base();
      // Capture GPT last: a slow external provider must not hold a revoked
      // observation in the aggregate response. It independently fences consent.
      const capture=env.GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED==='true'?
        await env.LISTENING_DB.prepare('SELECT revision FROM gpt_capture_state WHERE id=1').first():null;
      result.gpt = await readPublicGptSnapshot(env, clock());
      // Threads is an independent, owner-authorized read-only source. It
      // cannot disable unrelated work, GPT or Spotify if the provider fails.
      try { result.threads = await readThreads(env); }
      catch { result.threads = disconnectedThreads(); }
      const consent=capture?
        await env.LISTENING_DB.prepare('SELECT p.revision,p.public_enabled,p.private_work,g.revision AS capture_revision FROM presence_state p JOIN gpt_capture_state g ON g.id=p.id WHERE p.id=1').first():
        await presenceRow(env);
      if(!enabled(env,consent)||consent.revision!==before.revision||
          (capture&&consent.capture_revision!==capture.revision))return base();
      result.asOf = new Date(clock()).toISOString();
      return result;
    } catch {
      return base();
    }
  };
}
