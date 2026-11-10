/**
 * Signed GitHub Actions push identity for a phone-independent CI activity source.
 * No reusable shared secret or GitHub App is needed. Never log/return JWTs.
 *
 * The signed identity is accepted only for the website's trusted main-branch
 * verification workflow while GitHub confirms that run is actually in progress.
 * This does NOT grant permission to publish a repository or other account data.
 */
const ISSUER = "https://token.actions.githubusercontent.com";
export const GITHUB_ACTIVITY_AUDIENCE = "https://devonakins.com/github-actions-activity-v1";
const KEYS_URL = ISSUER + "/.well-known/jwks";
const RUN_URL = "https://api.github.com/repos/devonalanakins/devonakins.com/actions/runs/";
/** Only emitted *after* a verified GitHub signature when the independent
 * live-workflow lookup cannot be completed. Never return token or provider
 * payloads as part of errors. */
export class GithubRunProviderUnavailable extends Error {
  constructor() {
    super("Trusted live-run verification temporarily unavailable");
    this.name = "GithubRunProviderUnavailable";
  }
}

const REPO_ID = "1439132762"; // immutable GitHub repository id, verified 2026-11-10
const OWNER_ID = "324676006"; // immutable GitHub account id, verified 2026-11-10
const REF = "refs/heads/main";
const WORKFLOW_REF = "devonalanakins/devonakins.com/.github/workflows/verify.yml@" + REF;
const validId = (v) => typeof v === "string" && /^[1-9][0-9]{6,15}$/.test(v);
const asDigits = (v) => typeof v === "string" && /^[0-9]+$/.test(v) ? v :
  Number.isSafeInteger(v) && v >= 0 ? String(v) : null;

function decode64(value) {
  if (typeof value !== "string" || value.length > 10000 ||
      !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0));
  } catch { return null; }
}
function readSegment(value) {
  const bytes = decode64(value);
  if (!bytes || bytes.length > 9000) return null;
  try {
    const obj = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : null;
  } catch { return null; }
}
export function validGithubActivityClaims(payload, at = Date.now()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !Number.isFinite(at)) return false;
  const seconds = Math.floor(at / 1000);
  return payload.iss === ISSUER &&
    payload.aud === GITHUB_ACTIVITY_AUDIENCE &&
    typeof payload.sub === "string" && payload.sub.length > 4 && payload.sub.length <= 512 &&
    typeof payload.jti === "string" && payload.jti.length > 3 && payload.jti.length <= 256 &&
    payload.repository === "devonalanakins/devonakins.com" &&
    asDigits(payload.repository_id) === REPO_ID &&
    asDigits(payload.repository_owner_id) === OWNER_ID &&
    payload.repository_visibility === "public" &&
    payload.ref === REF && payload.ref_type === "branch" &&
    payload.event_name === "push" &&
    payload.workflow_ref === WORKFLOW_REF &&
    payload.runner_environment === "github-hosted" &&
    typeof payload.sha === "string" && /^[a-f0-9]{40}$/.test(payload.sha) &&
    validId(asDigits(payload.run_id)) &&
    Number.isSafeInteger(Number(payload.iat)) &&
    Number.isSafeInteger(Number(payload.nbf)) &&
    Number.isSafeInteger(Number(payload.exp)) &&
    payload.iat <= seconds + 30 && payload.iat >= seconds - 600 &&
    payload.nbf <= seconds + 30 && payload.nbf <= payload.exp &&
    payload.exp > seconds && payload.exp <= seconds + 600 &&
    payload.exp - payload.iat <= 600;
}

async function boundedJson(response, maxBytes) {
  if (!response?.ok || !/application\/json/i.test(response.headers?.get("content-type") || ""))
    throw Error("Provider unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw Error("Provider response unavailable");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw Error("Provider response oversized");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function verifyGithubActionsIdentity(token, {
  clock = Date.now, fetcher = fetch,
} = {}) {
  if (typeof token !== "string" || token.length < 250 || token.length > 8500 ||
      !/^[A-Za-z0-9_.-]+$/.test(token)) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some(x => !x)) return null;
  const header = readSegment(parts[0]), payload = readSegment(parts[1]);
  if (!header || header.alg !== "RS256" ||
      (header.typ !== undefined && header.typ !== "JWT") ||
      typeof header.kid !== "string" || !/^[A-Za-z0-9_.-]{1,128}$/.test(header.kid) ||
      !validGithubActivityClaims(payload, clock())) return null;
  const signature = decode64(parts[2]);
  if (!signature || signature.length < 256 || signature.length > 512) return null;
  try {
    const jwks = await boundedJson(await fetcher(KEYS_URL, {
      method: "GET", redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }), 32768);
    if (!Array.isArray(jwks.keys) || jwks.keys.length > 32) return null;
    const matched = jwks.keys.filter(key => key?.kid === header.kid && key?.kty === "RSA" &&
      (key.alg === undefined || key.alg === "RS256") &&
      (key.use === undefined || key.use === "sig") &&
      key.e === "AQAB" && typeof key.n === "string" &&
      /^[A-Za-z0-9_-]{256,1024}$/.test(key.n));
    if (matched.length !== 1) return null;
    const key = await crypto.subtle.importKey("jwk", {
      kty: "RSA", n: matched[0].n, e: matched[0].e,
    }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", key, signature,
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    );
    if (!verified || !validGithubActivityClaims(payload, clock())) return null;
    // Do not mistake a rate-limited GitHub API for an invalid signed JWT.
    // This lookup is still mandatory: no unverifiable run becomes a task.
    let run;
    try {
      run = await boundedJson(await fetcher(RUN_URL + payload.run_id, {
        method: "GET", redirect: "error", cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "devonakins-signed-activity",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(5000),
      }), 65536);
    } catch {
      throw new GithubRunProviderUnavailable();
    }
    // A signed token for a completed, cancelled or PR run is never live work.
    if (asDigits(run.id) !== asDigits(payload.run_id) ||
        run.status !== "in_progress" ||
        run.event !== "push" || run.head_branch !== "main" ||
        run.head_sha !== payload.sha ||
        run.path !== ".github/workflows/verify.yml" ||
        run.name !== "Verify website" ||
        asDigits(run.repository?.id) !== REPO_ID) return null;
    return Object.freeze({ projectSlug: "devonakins-com" });
  } catch (error) {
    if (error instanceof GithubRunProviderUnavailable) throw error;
    return null; // Any invalid signature, claim, or key fails closed.
  }
}
