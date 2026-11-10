#!/usr/bin/env node
/** Wrap real work once; no timer heartbeats and no command/output content leaves this process. */
import { PUBLIC_REPOSITORIES } from "../src/activity-history.mjs";
import {
  GITHUB_ACTIVITY_AUDIENCE,
  validGithubActivityClaims,
  verifyGithubActionsIdentity,
  GithubRunProviderUnavailable,
} from "../src/github-actions-oidc.mjs";
import { spawn, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const ORIGIN = "https://devonakins.com";
const secret = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
// Fixed status categories only. Never print a response body, bearer, URL,
// provider account, command output or arbitrary exception text into CI logs.
export class ActivityRequestFailure extends Error {
  constructor(status, stage = null) {
    super("Reporter HTTP response rejected");
    this.name = "ActivityRequestFailure";
    this.status = status;
    // Never pass through a provider-controlled header without an allowlist.
    this.stage = ["keys", "crypto", "run"].includes(stage) ? stage : null;
  }
}
export function activityFailureReason(error) {
  if (!(error instanceof ActivityRequestFailure)) return "network or invalid response";
  const categories = {
    400: "invalid reporter payload",
    401: "credential rejected or expired",
    403: "receiver denied",
    404: "receiver not available",
    409: "source project or state conflict",
    429: "source cooldown or task limit",
  };
  const message = (categories[error.status] || "receiver error") +
    " (HTTP " + (Number.isSafeInteger(error.status) && error.status >= 400 &&
      error.status <= 599 ? error.status : "error") + ")";
  return message + (error.status === 503 && error.stage
    ? "; verifier stage " + error.stage : "");
}
export function projectFromRemote(remote) {
  if (typeof remote !== "string") return null;
  const match =
    /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)devonalanakins\/([a-z0-9.-]+?)(?:\.git)?$/.exec(
      remote.trim(),
    );
  return match && Object.hasOwn(PUBLIC_REPOSITORIES, match[1])
    ? PUBLIC_REPOSITORIES[match[1]]
    : null;
}
function repositoryProject() {
  try {
    const remote = execFileSync(
      "git",
      ["config", "--get", "remote.origin.url"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
        maxBuffer: 4096,
      },
    );
    return { available: true, projectSlug: projectFromRemote(remote) };
  } catch {
    return { available: false, projectSlug: null };
  }
}
export async function activityRequest(path, body, token, fetcher = fetch) {
  if (!secret(token)) throw Error("A valid workspace credential is required.");
  const response = await fetcher(ORIGIN + path, {
    method: "POST",
    redirect: "error",
    credentials: "omit",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new ActivityRequestFailure(response.status);
  if (!response.headers.get("Content-Type")?.includes("application/json"))
    throw Error("Invalid reporter response");
  return response.json();
}
/**
 * GitHub-minted short-lived identity; only trusted main-branch jobs opt in.
 * Credentials and JWTs are never logged or inherited by the child command.
 */
/** Diagnostic *shape check only* for the first-party GitHub CI client.
 * Signature and live-run status remain verified by the Cloudflare Worker.
 * Never log JWT text, header, payload or identity fields. */
export function localGithubOidcScopeMatches(jwt, at = Date.now()) {
  if (typeof jwt !== "string" || jwt.length < 250 || jwt.length > 8500)
    return false;
  const parts = jwt.split(".");
  if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p)))
    return false;
  try {
    const raw = Buffer.from(parts[1], "base64url");
    if (raw.length > 9000) return false;
    return validGithubActivityClaims(JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(raw),
    ), at);
  } catch { return false; }
}

export async function githubOidcTaskStart({
  environment = process.env,
  projectSlug = "devonakins-com",
  fetcher = fetch,
  onClaimCheck = null,
  onLocalVerifierCheck = null,
  verifyLocalIdentity = verifyGithubActionsIdentity,
} = {}) {
  if (environment.GITHUB_ACTIONS !== "true" ||
      environment.GITHUB_EVENT_NAME !== "push" ||
      environment.GITHUB_REF !== "refs/heads/main" ||
      environment.GITHUB_REPOSITORY !== "devonalanakins/devonakins.com" ||
      projectSlug !== "devonakins-com") throw Error("Untrusted workflow context");
  const rawUrl = environment.ACTIONS_ID_TOKEN_REQUEST_URL;
  const actionToken = environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (typeof rawUrl !== "string" || rawUrl.length > 2048 ||
      typeof actionToken !== "string" || !actionToken || actionToken.length > 4096)
    throw Error("OIDC not available");
  const idUrl = new URL(rawUrl);
  if (idUrl.protocol !== "https:" ||
      !/^(?:[a-z0-9-]+\.)*actions\.githubusercontent\.com$/.test(idUrl.hostname) ||
      idUrl.username || idUrl.password || idUrl.port || idUrl.hash)
    throw Error("OIDC endpoint unavailable");
  idUrl.searchParams.set("audience", GITHUB_ACTIVITY_AUDIENCE);
  const issued = await fetcher(idUrl.toString(), {
    method: "GET", redirect: "error", credentials: "omit",
    headers: { Authorization: "Bearer " + actionToken, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!issued.ok) throw new ActivityRequestFailure(issued.status);
  if (!/application\/json/i.test(issued.headers.get("content-type") || ""))
    throw Error("Invalid identity response");
  const data = await issued.json();
  const jwt = data?.value;
  if (typeof jwt !== "string" || jwt.length < 250 || jwt.length > 8500 ||
      jwt.split(".").length !== 3) throw Error("Invalid identity response");
  // Debug the runner's public claim contract without weakening server-side
  // cryptographic and live-run checks or disclosing a token in CI logs.
  if (typeof onClaimCheck === "function")
    onClaimCheck(localGithubOidcScopeMatches(jwt));
  // Optional trusted-runner diagnostic. This independently verifies GitHub's
  // RSA signature AND current workflow using the runner's own network path,
  // but does not authorize publication. The Worker remains authoritative.
  if (typeof onLocalVerifierCheck === "function") {
    let result = "rejected";
    try {
      const local = await verifyLocalIdentity(jwt,{fetcher});
      result = local?.projectSlug === "devonakins-com" ? "verified" : "rejected";
    } catch (error) {
      result = error instanceof GithubRunProviderUnavailable
        ? "run-provider-unavailable" : "verification-error";
    }
    onLocalVerifierCheck(result);
  }
  const response = await fetcher(ORIGIN + "/api/activity/tasks/github-oidc-start", {
    method: "POST", redirect: "error", credentials: "omit",
    headers: {
      Authorization: "Bearer " + jwt,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ version: 1, projectSlug }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new ActivityRequestFailure(
    response.status, response.headers?.get("X-Activity-Verification-Stage"),
  );
  if (!/application\/json/i.test(response.headers.get("content-type") || ""))
    throw Error("Invalid reporter response");
  return response.json();
}

export async function runParticipatingTask(
  command,
  {
    sourceToken = process.env.DEVON_ACTIVITY_SOURCE_TOKEN,
    detectProject = repositoryProject,
    sourceTokens = process.env.DEVON_ACTIVITY_SOURCE_TOKENS,
    useGithubOidc = process.env.DEVON_ACTIVITY_GITHUB_OIDC === "true",
    oidcEnvironment = process.env,
    fetcher = fetch,
    clock = Date.now,
    spawnProcess = spawn,
    stdout = process.stdout,
    stderr = process.stderr,
  } = {},
) {
  if (
    !Array.isArray(command) ||
    !command.length ||
    command.some((v) => typeof v !== "string")
  )
    throw Error("Pass the real command after --.");
  const category = command.some((v) => /^(test|check|lint)$/.test(v))
    ? "testing"
    : command.includes("build")
      ? "building"
      : "reviewing";
  let task = null,
    sequence = 0,
    lastSent = 0,
    pending = Promise.resolve(),
    terminal = false;
  const enqueue = (state, checkpoint = null) => {
    if (!task) return Promise.resolve();
    const observed = clock();
    const next = () =>
      activityRequest(
        "/api/activity/tasks/signal",
        {
          version: 1,
          sequence: ++sequence,
          state,
          checkpoint,
          observedAt: new Date(observed).toISOString(),
        },
        task.token,
        fetcher,
      );
    pending = pending.then(next).catch((error) => {
      stderr.write(
        "Activity checkpoint unavailable (" + activityFailureReason(error) +
        "); source will expire automatically.\n",
      );
    });
    return pending;
  };
  let observedProject = { available: false, projectSlug: null };
  try {
    observedProject = detectProject();
  } catch {
    observedProject = { available: true, projectSlug: null };
  }
  if (observedProject.available && !observedProject.projectSlug)
    sourceToken = null;
  if (observedProject.projectSlug && sourceTokens) {
    try {
      const tokens = JSON.parse(sourceTokens);
      sourceToken =
        tokens &&
        Object.hasOwn(tokens, observedProject.projectSlug) &&
        secret(tokens[observedProject.projectSlug])
          ? tokens[observedProject.projectSlug]
          : null;
    } catch {
      sourceToken = null;
    }
  }
  if (sourceToken || useGithubOidc) {
    try {
      task = useGithubOidc
        ? await githubOidcTaskStart({
            environment: oidcEnvironment,
            projectSlug: observedProject.projectSlug,
            fetcher,
            onClaimCheck: (matched) => {
              stderr.write("Local OIDC claim scope: " +
                (matched ? "match" : "mismatch") +
                " (not proof of signature or accepted activity).\n");
            },
            ...(oidcEnvironment.DEVON_ACTIVITY_DIAGNOSE_IDENTITY === "true"
              ? { onLocalVerifierCheck: (status) => {
                  stderr.write("Local signed GitHub run proof: " +
                    status + " (independent of production acceptance).\n");
                }}
              : {}),
          })
        : await activityRequest(
            "/api/activity/tasks/start",
            {
              version: 1,
              ...(observedProject.available
                ? { projectSlug: observedProject.projectSlug }
                : {}),
            },
            sourceToken,
            fetcher,
          );
      if (!secret(task.token) || !Number.isFinite(Date.parse(task.expiresAt)))
        throw Error();
      lastSent = clock();
    } catch (error) {
      task = null;
      stderr.write(
        "Activity connection unavailable (" + activityFailureReason(error) +
        "); continuing the requested command.\n",
      );
    }
  }
  const child = spawnProcess(command[0], command.slice(1), {
    stdio: ["inherit", "pipe", "pipe"],
    shell: false,
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) =>
          ![
            "DEVON_ACTIVITY_SOURCE_TOKEN",
            "DEVON_ACTIVITY_SOURCE_TOKENS",
            "ACTIONS_ID_TOKEN_REQUEST_URL",
            "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
            "DEVON_ACTIVITY_GITHUB_OIDC",
          ].includes(key),
      ),
    ),
  });
  const progress = () => {
    if (!terminal && task && clock() - lastSent >= 30000) {
      lastSent = clock();
      void enqueue("running", category);
    }
  };
  child.stdout?.on("data", (data) => {
    stdout.write(data);
    progress();
  });
  child.stderr?.on("data", (data) => {
    stderr.write(data);
    progress();
  });
  const forward = (signal) => {
    terminal = true;
    child.kill(signal);
  };
  const int = () => forward("SIGINT"),
    term = () => forward("SIGTERM");
  process.once("SIGINT", int);
  process.once("SIGTERM", term);
  const result = await new Promise((resolve) => {
    child.once("error", () => resolve({ code: 1, signal: null }));
    child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
  process.removeListener("SIGINT", int);
  process.removeListener("SIGTERM", term);
  const cancelled = terminal || !!result.signal;
  terminal = true;
  await enqueue(
    cancelled ? "cancelled" : result.code === 0 ? "completed" : "failed",
    !cancelled && result.code === 0 && category === "testing"
      ? "tests-passed"
      : null,
  );
  return result.code;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const index = process.argv.indexOf("--");
  runParticipatingTask(index < 0 ? [] : process.argv.slice(index + 1))
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      console.error(
        "Usage: DEVON_ACTIVITY_SOURCE_TOKEN=<runner secret> node scripts/activity-run.mjs -- <command> [args]",
      );
      process.exitCode = 1;
    });
}
