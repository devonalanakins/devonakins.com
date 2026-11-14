/** Derive an ephemeral release config from the live, owner-approved Worker deployment. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_PRESENCE_PROJECTS } from "../src/presence-model.mjs";

export class PrivatePreflightFailure extends Error {
  constructor(stage, reason) {
    super("Private deployment preflight blocked");
    this.name = "PrivatePreflightFailure";
    this.stage = stage;
    this.reason = reason;
  }
}

// Public metadata disclosure can be retained only when explicitly approved
// on the currently serving version. Never introduce it from repository code.
const ownerReleaseGates = [
  "PRESENCE_PUBLIC_RELEASE_APPROVED",
  "LISTENING_PUBLIC_RELEASE_APPROVED",
  "GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED",
  "THREADS_PUBLIC_RELEASE_APPROVED",
  "THREADS_PUBLIC_FEED_ENABLED",
  "GITHUB_OIDC_ACTIVITY_ENABLED",
];
// Legacy API read/write gates are *not* the owner-reviewed snapshot feature.
const privateGates = [
  "GPT_USAGE_READ_ENABLED",
  "GPT_USAGE_WRITE_ENABLED",
];
const plainNames = new Set([
  "LISTENING_OWNER_EMAIL",
  "LISTENING_ACCESS_AUD",
  "LISTENING_ACCESS_AUDS",
  "SPOTIFY_CLIENT_ID",
  "THREADS_PUBLIC_USERNAME",
  "THREADS_APP_ID",
  "PRESENCE_ENABLED",
  "PRESENCE_EDITOR_ENABLED",
  "LISTENING_COLLECTIONS_ENABLED",
  ...privateGates,
  ...ownerReleaseGates,
]);
export function privateDeploymentConfig(base, settings, database, {
  githubOidcAction = "preserve",
  githubOidcConsentVerified = false,
  threadsPublishAction = "preserve",
  threadsPublicConsentVerified = false,
} = {}) {
  if (!["preserve", "enable", "disable"].includes(githubOidcAction))
    throw Error("Unsupported GitHub OIDC release action");
  if (!["preserve", "enable", "disable"].includes(threadsPublishAction))
    throw Error("Unsupported Threads publication action");
  const bindings = settings?.bindings;
  if (!Array.isArray(bindings) || !bindings.length)
    throw Error("Deployed private runtime settings unavailable");
  const names = bindings.map((b) => b.name);
  if (new Set(names).size !== names.length)
    throw Error("Duplicate deployed binding requires review");
  for (const b of bindings) {
    if (b.type === "plain_text" &&
        (typeof b.text !== "string" || b.text.length > 1024 ||
         /[\u0000-\u001f\u007f]/.test(b.text)))
      throw Error("Invalid deployed plain-text binding");
  }
  const appId=bindings.find((b)=>b.name==="THREADS_APP_ID");
  if(appId && (appId.type!=="plain_text" || !/^[0-9]{10,32}$/.test(appId.text)))
    throw Error("Invalid Threads App ID");
  const threadsHandle = bindings.find((b) => b.name === "THREADS_PUBLIC_USERNAME");
  if (threadsHandle && (threadsHandle.type !== "plain_text" ||
      !/^[A-Za-z0-9._]{1,30}$/.test(threadsHandle.text)))
    throw Error("Invalid Threads owner handle");
  const dbs = bindings.filter((b) => b.type === "d1");
  if (
    dbs.length !== 1 ||
    dbs[0].name !== "LISTENING_DB" ||
    !/^[a-f0-9-]{36}$/.test(dbs[0].id || "")
  )
    throw Error("Dedicated database binding required");
  if (
    database?.uuid !== dbs[0].id ||
    database.name !== "devonakins-listening-private" ||
    database.read_replication?.mode !== "disabled"
  )
    throw Error("Dedicated database identity or replication differs");
  if (
    bindings.some(
      (b) =>
        !(
          b.type === "d1" ||
          (b.type === "secret_text" &&
            ["LISTENING_TOKEN_KEY", "THREADS_USER_ACCESS_TOKEN", "THREADS_APP_SECRET"].includes(b.name)) ||
          (b.type === "plain_text" && plainNames.has(b.name))
        ),
    )
  )
    throw Error("Unexpected runtime binding requires review");
  if (
    !bindings.some(
      (b) => b.type === "secret_text" && b.name === "LISTENING_TOKEN_KEY",
    )
  )
    throw Error("Encryption key must be configured privately");
  for (const name of ["LISTENING_OWNER_EMAIL", "LISTENING_ACCESS_AUD"]) {
    if (
      !bindings.some(
        (b) =>
          b.type === "plain_text" &&
          b.name === name &&
          typeof b.text === "string" &&
          b.text.length,
      )
    )
      throw Error("Owner identity configuration required");
  }
  for (const name of privateGates) {
    const value = bindings.find((b) => b.name === name);
    if (value && value.text !== "false")
      throw Error("Legacy GPT API access gates must remain off");
  }
  for (const name of ownerReleaseGates) {
    const value = bindings.find((b) => b.name === name);
    if (value && !["true", "false"].includes(value.text))
      throw Error("Owner-release gate must be explicitly true or false");
  }
  if (
    !base.includes('"name": "devonakins-personal"') ||
    !/\n}\s*$/.test(base) ||
    /"(?:d1_databases|vars|keep_vars)"\s*:/.test(base)
  )
    throw Error("Base deployment configuration changed; review required");
  let prefix = base.replace(/}\s*$/, "").trimEnd();
  if (!prefix.endsWith(",")) prefix += ",";
  // An upload-only Cloudflare build may be newer than production yet omit D1
  // and nonsecret variables. Explicitly carry the approved *deployed* vars;
  // keep_vars retains the server-side encryption key without reading it.
  const vars = Object.fromEntries(
    bindings.filter((b) => b.type === "plain_text")
      .map((b) => [b.name, b.text]),
  );
  for (const name of privateGates) vars[name] = "false";
  // Missing public gates are closed. Existing approved gates remain unchanged.
  for (const name of ownerReleaseGates)
    if (!(name in vars)) vars[name] = "false";
  if (githubOidcAction === "enable") {
    if (githubOidcConsentVerified !== true ||
        vars.PRESENCE_ENABLED !== "true" ||
        vars.PRESENCE_PUBLIC_RELEASE_APPROVED !== "true")
      throw Error("GitHub OIDC source publication prerequisites not approved");
    vars.GITHUB_OIDC_ACTIVITY_ENABLED = "true";
  } else if (githubOidcAction === "disable") {
    vars.GITHUB_OIDC_ACTIVITY_ENABLED = "false";
  }
  if (threadsPublishAction === "enable") {
    if (threadsPublicConsentVerified !== true ||
        vars.PRESENCE_ENABLED !== "true" ||
        vars.PRESENCE_PUBLIC_RELEASE_APPROVED !== "true" ||
        !bindings.some(b=>b.name==="THREADS_APP_SECRET" && b.type==="secret_text") ||
        !bindings.some(b=>b.name==="THREADS_APP_ID" &&
          b.type==="plain_text" && /^[0-9]{10,32}$/.test(b.text)))
      throw Error("Threads publication prerequisites not approved");
    vars.THREADS_PUBLIC_RELEASE_APPROVED = "true";
    vars.THREADS_PUBLIC_FEED_ENABLED = "true";
  } else if (threadsPublishAction === "disable") {
    vars.THREADS_PUBLIC_RELEASE_APPROVED = "false";
    vars.THREADS_PUBLIC_FEED_ENABLED = "false";
  }
  const extra = {
    d1_databases: [
      {
        binding: "LISTENING_DB",
        database_name: database.name,
        database_id: database.uuid,
        migrations_dir: "migrations",
      },
    ],
    keep_vars: true,
    vars,
  };
  return prefix + "\n" + JSON.stringify(extra, null, 2).slice(1, -1) + "\n}\n";
}
// Read-only production acceptance. A public-approved source and project are
// required before enabling the receiver. This never reads token hashes or
// returns the raw private owner record into CI logs.
export async function verifyGithubOidcOwnerConsent({
  account, token, databaseId, fetcher = fetch, now = Date.now(),
} = {}) {
  if (!Number.isSafeInteger(now) || now <= 0)
    throw new PrivatePreflightFailure("OIDC_CONSENT_VALIDATE", "INVALID_TIME");
  // Match src/presence-preferences.mjs::approvedProjects, not merely JSON
  // membership. A JSON scalar, duplicate entries, an unknown project or an
  // oversized array would be rejected by the Worker and must not authorize
  // enabling its receiver in the protected deployment.
  const slugs = Object.keys(PUBLIC_PRESENCE_PROJECTS);
  const placeholders = slugs.map(() => "?").join(",");
  const sql = [
    "SELECT",
    "(SELECT COUNT(*) FROM activity_sources WHERE source='github-actions'",
    "AND project_slug='devonakins-com' AND revoked=0) AS configured,",
    "(SELECT COUNT(*) FROM activity_sources s JOIN presence_state p ON p.id=1",
    "WHERE s.source='github-actions' AND s.project_slug='devonakins-com'",
    "AND s.revoked=0 AND s.public_enabled=1 AND s.token_until>?",
    "AND s.generation=p.editor_generation AND p.public_enabled=1",
    "AND p.private_work=0 AND p.paused=0",
    "AND CASE WHEN p.public_projects_json IS NULL THEN 1",
    "WHEN json_valid(p.public_projects_json)=0 THEN 0",
    "WHEN json_type(p.public_projects_json)<>'array' THEN 0",
    "WHEN json_array_length(p.public_projects_json)>? THEN 0",
    "WHEN EXISTS(SELECT 1 FROM json_each(p.public_projects_json)",
    "WHERE type<>'text' OR value NOT IN (" + placeholders + ")) THEN 0",
    "WHEN (SELECT COUNT(DISTINCT value) FROM json_each(p.public_projects_json))",
    "<>json_array_length(p.public_projects_json) THEN 0",
    "ELSE EXISTS(SELECT 1 FROM json_each(p.public_projects_json)",
    "WHERE value='devonakins-com') END) AS eligible",
  ].join(" ");
  let response;
  try {
    response = await fetcher(
      "https://api.cloudflare.com/client/v4/accounts/" + account +
      "/d1/database/" + databaseId + "/query", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql, params: [String(now), String(slugs.length), ...slugs] }),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
  } catch {
    throw new PrivatePreflightFailure("OIDC_CONSENT_READ", "NETWORK_OR_TIMEOUT");
  }
  if (!response.ok)
    throw new PrivatePreflightFailure("OIDC_CONSENT_READ", "HTTP_" + response.status);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new PrivatePreflightFailure("OIDC_CONSENT_READ", "INVALID_JSON");
  }
  const result = data?.result?.[0];
  if (data?.success !== true || result?.success === false ||
      !Array.isArray(result?.results) || result.results.length !== 1)
    throw new PrivatePreflightFailure("OIDC_CONSENT_READ", "API_REJECTED");
  const { configured, eligible } = result.results[0] || {};
  if (configured !== 1 || eligible !== 1)
    throw new PrivatePreflightFailure("OIDC_CONSENT_VALIDATE", "SOURCE_NOT_APPROVED");
  return true;
}

/** Read-only, owner-only Threads publication preflight for protected release.
 * Checks owner presence consent, nonpaused scope, verified encrypted grant
 * and future expiry. Does not select usernames, IDs, tokens or post content.
 */
export async function verifyThreadsPublicOwnerConsent({
  account,token,databaseId,fetcher=fetch,now=Date.now(),
}={}){
  if(!Number.isSafeInteger(now)||now<=0)
    throw new PrivatePreflightFailure("THREADS_CONSENT_VALIDATE","INVALID_TIME");
  const sql=[
    "SELECT COUNT(*) AS eligible FROM presence_state p",
    "JOIN threads_connection t ON t.id=p.id",
    "WHERE p.id=1 AND p.public_enabled=1 AND p.private_work=0 AND p.paused=0",
    "AND t.token_cipher IS NOT NULL AND t.threads_user_id IS NOT NULL",
    "AND t.username IS NOT NULL AND t.verified_at > 0",
    "AND t.public_feed_enabled=1",
    "AND t.token_expires_at > ?",
  ].join(" ");
  let response;
  try{
    response=await fetcher("https://api.cloudflare.com/client/v4/accounts/"+
      account+"/d1/database/"+databaseId+"/query",{
      method:"POST",headers:{Authorization:"Bearer "+token,Accept:"application/json",
        "Content-Type":"application/json"},body:JSON.stringify({sql,params:[String(now)]}),
      redirect:"error",signal:AbortSignal.timeout(10000),
    });
  }catch{
    throw new PrivatePreflightFailure("THREADS_CONSENT_READ","NETWORK_OR_TIMEOUT");
  }
  if(!response.ok)
    throw new PrivatePreflightFailure("THREADS_CONSENT_READ","HTTP_"+response.status);
  let data;
  try{data=await response.json();}
  catch{throw new PrivatePreflightFailure("THREADS_CONSENT_READ","INVALID_JSON");}
  const result=data?.result?.[0];
  if(data?.success!==true || result?.success!==true ||
      !Array.isArray(result.results) || result.results.length!==1)
    throw new PrivatePreflightFailure("THREADS_CONSENT_READ","API_REJECTED");
  if(result.results[0]?.eligible!==1)
    throw new PrivatePreflightFailure("THREADS_CONSENT_VALIDATE","OWNER_SOURCE_NOT_APPROVED");
  return true;
}

/** Exact schema gate for the lifecycle handler shipping in this release.
 * Query only schema metadata from the reviewed private D1; never touch token rows.
 * A missing/unapplied migration must stop the protected release before upload.
 */
export async function verifyThreadsLifecycleSchema({
  account, token, databaseId, fetcher=fetch,
} = {}) {
  const sql = [
    "SELECT",
    "(SELECT COUNT(*) FROM pragma_table_info('threads_connection')",
    "WHERE name='threads_user_id' AND type='TEXT') AS identity_column,",
    "(SELECT COUNT(*) FROM pragma_table_info('threads_lifecycle_receipt')",
    "WHERE name IN ('request_hash','received_at','kind','confirmation_code')) AS receipt_columns,",
    "(SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
    "AND name='threads_oauth_attempt') AS attempt_table,",
    "(SELECT COUNT(*) FROM pragma_table_info('threads_connection')",
    "WHERE name='public_feed_enabled' AND type='INTEGER') AS sharing_column",
  ].join(" ");
  let response;
  try {
    response=await fetcher(
      "https://api.cloudflare.com/client/v4/accounts/"+account+
      "/d1/database/"+databaseId+"/query", {
        method:"POST",
        headers:{Authorization:"Bearer "+token,Accept:"application/json",
          "Content-Type":"application/json"},
        body:JSON.stringify({sql}),redirect:"error",
        signal:AbortSignal.timeout(10000),
      });
  } catch {
    throw new PrivatePreflightFailure("THREADS_SCHEMA_READ","NETWORK_OR_TIMEOUT");
  }
  if(!response.ok)
    throw new PrivatePreflightFailure("THREADS_SCHEMA_READ","HTTP_"+response.status);
  let data;
  try { data=await response.json(); }
  catch { throw new PrivatePreflightFailure("THREADS_SCHEMA_READ","INVALID_JSON"); }
  const result=data?.result?.[0];
  if(data?.success!==true||result?.success!==true||
      !Array.isArray(result.results)||result.results.length!==1)
    throw new PrivatePreflightFailure("THREADS_SCHEMA_READ","API_REJECTED");
  const row=result.results[0];
  if(row?.identity_column!==1||row?.receipt_columns!==4||row?.attempt_table!==1)
    throw new PrivatePreflightFailure("THREADS_SCHEMA_VALIDATE","MIGRATION_0012_REQUIRED");
  if(row?.sharing_column!==1)
    throw new PrivatePreflightFailure("THREADS_SCHEMA_VALIDATE","MIGRATION_0013_REQUIRED");
  return true;
}

export async function preparePrivateDeployment({
  env = process.env,
  fetcher = fetch,
  read = readFile,
  write = writeFile,
  mask = value => process.stdout.write("::add-mask::" + value + "\n"),
} = {}) {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  const githubOidcAction = env.GITHUB_OIDC_ACTION || "preserve";
  const threadsPublishAction=env.THREADS_PUBLICATION_ACTION || "preserve";
  if (!["preserve", "enable", "disable"].includes(githubOidcAction))
    throw new PrivatePreflightFailure("OIDC_ACTION_VALIDATE", "INVALID_ACTION");
  if (githubOidcAction !== "preserve" &&
      (env.GITHUB_ACTIONS !== "true" ||
       env.GITHUB_REF !== "refs/heads/main" ||
       env.RELEASE_VARIANT !== "v4" ||
       !/^[a-f0-9]{40}$/.test(env.EXPECTED_SHA || "") ||
       env.EXPECTED_SHA !== env.GITHUB_SHA))
    throw new PrivatePreflightFailure("OIDC_ACTION_VALIDATE", "UNTRUSTED_RELEASE");
  if (githubOidcAction === "enable"
      ? env.GITHUB_OIDC_CONFIRMATION !== "GITHUB-OIDC-ENABLE-APPROVED"
      : Boolean(env.GITHUB_OIDC_CONFIRMATION))
    throw new PrivatePreflightFailure("OIDC_ACTION_VALIDATE", "CONFIRMATION_MISMATCH");
  if (!["preserve","enable","disable"].includes(threadsPublishAction))
    throw new PrivatePreflightFailure("THREADS_ACTION_VALIDATE","INVALID_ACTION");
  if(threadsPublishAction!=="preserve" &&
      (env.GITHUB_ACTIONS!=="true" || env.GITHUB_REF!=="refs/heads/main" ||
       env.RELEASE_VARIANT!=="one-screen" ||
       !/^[a-f0-9]{40}$/.test(env.EXPECTED_SHA||"") ||
       env.EXPECTED_SHA!==env.GITHUB_SHA || githubOidcAction!=="preserve"))
    throw new PrivatePreflightFailure("THREADS_ACTION_VALIDATE","UNTRUSTED_RELEASE");
  if(threadsPublishAction==="enable"
      ? env.THREADS_PUBLICATION_CONFIRMATION!=="THREADS-PUBLIC-FEED-APPROVED"
      : Boolean(env.THREADS_PUBLICATION_CONFIRMATION))
    throw new PrivatePreflightFailure("THREADS_ACTION_VALIDATE","CONFIRMATION_MISMATCH");
  if (!/^[a-f0-9]{32}$/.test(account || "") || !token)
    throw Error("Dedicated Cloudflare CI credentials required");
  async function get(path, stage) {
    let response;
    try {
      response = await fetcher(
        "https://api.cloudflare.com/client/v4/accounts/" + account + path,
        {
          headers: {
            Authorization: "Bearer " + token,
            Accept: "application/json",
          },
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch {
      throw new PrivatePreflightFailure(stage, "NETWORK_OR_TIMEOUT");
    }
    if (!response.ok)
      throw new PrivatePreflightFailure(stage, "HTTP_" + response.status);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new PrivatePreflightFailure(stage, "INVALID_JSON");
    }
    if (data.success !== true)
      throw new PrivatePreflightFailure(stage, "API_REJECTED");
    return data.result;
  }
  // /settings follows the most recently *uploaded* version, which is not
  // necessarily deployed. A CI upload can lack private bindings entirely.
  const script = "/workers/scripts/devonakins-personal";
  const deployments = await get(script + "/deployments", "DEPLOYMENTS_READ");
  const active = deployments?.deployments?.[0];
  if (active?.versions?.length !== 1 ||
      active.versions[0].percentage !== 100 ||
      !/^[a-f0-9-]{36}$/.test(active.versions[0].version_id || ""))
    throw new PrivatePreflightFailure("DEPLOYMENTS_VALIDATE", "SINGLE_100_PERCENT_VERSION_REQUIRED");
  const version = await get(
    script + "/versions/" + active.versions[0].version_id,
    "ACTIVE_VERSION_READ",
  );
  const settings = { bindings: version?.resources?.bindings };
  const binding = settings?.bindings?.find(
    (b) => b.type === "d1" && b.name === "LISTENING_DB",
  );
  if (!/^[a-f0-9-]{36}$/.test(binding?.id || ""))
    throw new PrivatePreflightFailure("ACTIVE_BINDINGS_VALIDATE", "DEDICATED_D1_MISSING");
  const database = await get("/d1/database/" + binding.id, "D1_METADATA_READ");
  // The lifecycle module reads threads_user_id on all private connection paths.
  // Do not release it while migration 0012 is still absent from the live D1.
  await verifyThreadsLifecycleSchema({account,token,databaseId:binding.id,fetcher});
  const base = await read("wrangler.jsonc", "utf8");
  // A dedicated read-only SQL query verifies owner source consent. No
  // activity is inserted and no public sharing state is altered here.
  const githubOidcConsentVerified = githubOidcAction === "enable"
    ? await verifyGithubOidcOwnerConsent({
        account, token, databaseId: binding.id, fetcher,
      })
    : false;
  const threadsPublicConsentVerified=threadsPublishAction==="enable"
    ?await verifyThreadsPublicOwnerConsent({account,token,databaseId:binding.id,fetcher})
    :false;
  let config;
  try {
    config = privateDeploymentConfig(base, settings, database, {
      githubOidcAction, githubOidcConsentVerified,
      threadsPublishAction,threadsPublicConsentVerified,
    });
  } catch {
    throw new PrivatePreflightFailure("PRIVATE_CONFIG_VALIDATE", "BINDING_OR_DB_MISMATCH");
  }
  // Wrangler prints plain-text Worker binding values during deployment.
  // Protect owner configuration from appearing in public Actions logs.
  if (env.GITHUB_ACTIONS === "true") {
    for (const binding of settings.bindings) {
      if (binding.type === "plain_text" && binding.text.length > 6)
        mask(binding.text);
    }
  }
  await write("wrangler.deploy.jsonc", config, { mode: 0o600 });
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  preparePrivateDeployment()
    .then(() =>
      console.log(
        "Reviewed deployment configuration prepared; serving owner-release gates preserved.",
      ),
    )
    .catch((error) => {
      // Never echo API response bodies, headers, account values or token text.
      // A stable stage and status distinguishes missing token scopes from drift.
      const code = error instanceof PrivatePreflightFailure
        ? " Stage=" + error.stage + " Reason=" + error.reason + "."
        : "";
      console.error(
        "Private deployment preflight failed." + code +
        " Verify dedicated runtime bindings, owner approval gates and CI permissions.",
      );
      process.exitCode = 1;
    });
}
