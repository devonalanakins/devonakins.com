import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  privateDeploymentConfig,
  preparePrivateDeployment,
  PrivatePreflightFailure,
  verifyGithubOidcOwnerConsent,
} from "../scripts/prepare-private-deploy.mjs";

const base = readFileSync(
  new URL("../wrangler.jsonc", import.meta.url),
  "utf8",
);
const id = "00000000-0000-0000-0000-000000000001";
const activeVersion = "11111111-1111-4111-8111-111111111111";
const uploadedVersion = "22222222-2222-4222-8222-222222222222";
const database = {
  uuid: id,
  name: "devonakins-listening-private",
  read_replication: { mode: "disabled" },
};
const ownerGates = [
  "PRESENCE_PUBLIC_RELEASE_APPROVED",
  "LISTENING_PUBLIC_RELEASE_APPROVED",
  "GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED",
  "THREADS_PUBLIC_RELEASE_APPROVED",
  "THREADS_PUBLIC_FEED_ENABLED",
  "GITHUB_OIDC_ACTIVITY_ENABLED",
];
const legacyGates = ["GPT_USAGE_READ_ENABLED", "GPT_USAGE_WRITE_ENABLED"];
const gates = [...ownerGates, ...legacyGates];
const settings = () => ({
  bindings: [
    { type: "d1", name: "LISTENING_DB", id },
    { type: "secret_text", name: "LISTENING_TOKEN_KEY" },
    { type: "plain_text", name: "LISTENING_OWNER_EMAIL", text: "owner@example.test" },
    { type: "plain_text", name: "LISTENING_ACCESS_AUD", text: "synthetic-audience" },
    { type: "plain_text", name: "SPOTIFY_CLIENT_ID", text: "syntheticspotifyclientid0123456789" },
    { type: "plain_text", name: "PRESENCE_ENABLED", text: "true" },
    { type: "plain_text", name: "PRESENCE_EDITOR_ENABLED", text: "true" },
    { type: "plain_text", name: "LISTENING_COLLECTIONS_ENABLED", text: "true" },
    ...gates.map(name => ({ type: "plain_text", name, text: "false" })),
  ],
});
const installed = ({ percent = 100, versions = [{
  version_id: activeVersion, percentage: percent,
}] } = {}) => ({ deployments: [{ versions }] });
const provider = (url) => {
  if (url.endsWith("/deployments")) return installed();
  if (url.endsWith("/versions/" + activeVersion))
    return { resources: settings() };
  if (url.endsWith("/settings"))
    return { bindings: [{ name: "LISTENING_TOKEN_KEY", type: "secret_text" }] };
  if (url.endsWith("/d1/database/" + id)) return database;
  throw Error("Unapproved test provider path");
};
const clean = (config) => JSON.parse(config.replace(/,\s*([}\]])/g, "$1"));

test("private release retains active owner/Spotify vars, dedicated D1, and closed gates without exporting encryption secret", () => {
  const config = privateDeploymentConfig(base, settings(), database);
  const parsed = clean(config);
  assert.equal(parsed.name, "devonakins-personal");
  assert.equal(parsed.d1_databases[0].database_id, id);
  assert.equal(parsed.keep_vars, true);
  assert.equal(parsed.vars.LISTENING_OWNER_EMAIL, "owner@example.test");
  assert.equal(parsed.vars.LISTENING_ACCESS_AUD, "synthetic-audience");
  assert.equal(parsed.vars.SPOTIFY_CLIENT_ID, "syntheticspotifyclientid0123456789");
  assert.equal(parsed.vars.PRESENCE_ENABLED, "true");
  assert.equal(parsed.vars.PRESENCE_EDITOR_ENABLED, "true");
  assert.equal(parsed.vars.LISTENING_COLLECTIONS_ENABLED, "true");
  assert.ok(gates.every(name => parsed.vars[name] === "false"));
  assert.doesNotMatch(config, /LISTENING_TOKEN_KEY|synthetic-ci-credential/);
});

test("foreign database, extra bindings, missing key, malformed release gate and legacy data API access reject release", () => {
  assert.throws(() =>
    privateDeploymentConfig(base, settings(), {
      ...database, name: "other-project",
    }),
  );
  assert.throws(() =>
    privateDeploymentConfig(base, settings(), {
      ...database, read_replication: { mode: "auto" },
    }),
  );
  const extra = settings();
  extra.bindings.push({ type: "kv_namespace", name: "OTHER" });
  assert.throws(() => privateDeploymentConfig(base, extra, database));
  const key = settings();
  key.bindings = key.bindings.filter(b => b.type !== "secret_text");
  assert.throws(() => privateDeploymentConfig(base, key, database));
  const published = settings();
  for (const name of ownerGates) published.bindings.find(b => b.name === name).text = "true";
  const approved = clean(privateDeploymentConfig(base, published, database));
  for (const name of ownerGates) assert.equal(approved.vars[name], "true");
  for (const name of legacyGates) assert.equal(approved.vars[name], "false");
  const mixed = settings();
  mixed.bindings.find(b => b.name === "PRESENCE_PUBLIC_RELEASE_APPROVED").text = "true";
  mixed.bindings.find(b => b.name === "LISTENING_PUBLIC_RELEASE_APPROVED").text = "false";
  assert.equal(clean(privateDeploymentConfig(base, mixed, database)).vars.PRESENCE_PUBLIC_RELEASE_APPROVED, "true");
  const malformedGate = settings();
  malformedGate.bindings.find(b => b.name === "PRESENCE_PUBLIC_RELEASE_APPROVED").text = "approved";
  assert.throws(() => privateDeploymentConfig(base, malformedGate, database));
  const legacyExposed = settings();
  legacyExposed.bindings.find(b => b.name === "GPT_USAGE_READ_ENABLED").text = "true";
  assert.throws(() => privateDeploymentConfig(base, legacyExposed, database));
  const duplicate = settings();
  duplicate.bindings.push({ type: "plain_text", name: "SPOTIFY_CLIENT_ID", text: "duplicate" });
  assert.throws(() => privateDeploymentConfig(base, duplicate, database));
  const malformed = settings();
  malformed.bindings.find(b => b.name === "LISTENING_OWNER_EMAIL").text = "owner@example.test\nFORGED_FIELD";
  assert.throws(() => privateDeploymentConfig(base, malformed, database));
});

test("release safely preserves an authorized Threads token binding without copying its value",()=>{
  const configured=settings();
  configured.bindings.push({type:"secret_text",name:"THREADS_USER_ACCESS_TOKEN"});
  configured.bindings.push({type:"plain_text",name:"THREADS_PUBLIC_USERNAME",text:"fixtureDevon"});
  const config=privateDeploymentConfig(base,configured,database);
  const parsed=clean(config);
  assert.equal(parsed.keep_vars,true);
  assert.equal(parsed.vars.THREADS_PUBLIC_USERNAME,"fixtureDevon");
  assert.equal(parsed.vars.THREADS_PUBLIC_RELEASE_APPROVED,"false");
  assert.equal(parsed.vars.THREADS_PUBLIC_FEED_ENABLED,"false");
  assert.doesNotMatch(config,/THREADS_USER_ACCESS_TOKEN|fixture-secret-value/);
  const malformed=settings();
  malformed.bindings.push({type:"plain_text",name:"THREADS_PUBLIC_USERNAME",text:"bad user"});
  assert.throws(()=>privateDeploymentConfig(base,malformed,database));
  const wrongKind=settings();
  wrongKind.bindings.push({type:"plain_text",name:"THREADS_USER_ACCESS_TOKEN",text:"exposed"});
  assert.throws(()=>privateDeploymentConfig(base,wrongKind,database));
  const forged=settings();
  forged.bindings.push({type:"secret_text",name:"UNREVIEWED_PROVIDER_TOKEN"});
  assert.throws(()=>privateDeploymentConfig(base,forged,database));
});

test("deployment preserves only an authorized read-only Threads app ID and opaque secret",()=>{
  const configured=settings();
  configured.bindings.push({type:"plain_text",name:"THREADS_APP_ID",text:"123456789012345"});
  configured.bindings.push({type:"secret_text",name:"THREADS_APP_SECRET"});
  const artifact=privateDeploymentConfig(base,configured,database);
  const parsed=clean(artifact);
  assert.equal(parsed.keep_vars,true);
  assert.equal(parsed.vars.THREADS_APP_ID,"123456789012345");
  assert.equal(parsed.vars.THREADS_PUBLIC_FEED_ENABLED,"false");
  assert.equal(parsed.vars.THREADS_PUBLIC_RELEASE_APPROVED,"false");
  assert.doesNotMatch(artifact,/THREADS_APP_SECRET/);
  for(const wrong of [
    {type:"plain_text",name:"THREADS_APP_ID",text:"not-an-app-id"},
    {type:"plain_text",name:"THREADS_APP_SECRET",text:"plain-is-forbidden"},
  ]) {
    const input=settings();input.bindings.push(wrong);
    assert.throws(()=>privateDeploymentConfig(base,input,database));
  }
});

test("a competing checked-in binding is not silently overwritten", () => {
  assert.throws(() =>
    privateDeploymentConfig(
      base.replace('"routes":', '"vars": {}, "routes":'),
      settings(), database,
    ),
  );
});

test("preflight uses the deployed version, not an unbound latest upload, and writes an untracked private config", async () => {
  const calls = [];
  let written;
  await preparePrivateDeployment({
    env: {
      CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
      CLOUDFLARE_API_TOKEN: "synthetic-ci-credential",
    },
    read: async () => base,
    write: async (...args) => { written = args; },
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ success: true, result: provider(url) });
    },
  });
  assert.equal(calls.length, 3);
  assert.ok(calls[0].url.endsWith("/deployments"));
  assert.ok(calls[1].url.endsWith("/versions/" + activeVersion));
  assert.ok(calls[2].url.endsWith("/d1/database/" + id));
  assert.ok(calls.every(c => !c.url.endsWith("/settings")));
  assert.ok(calls.every(c => c.options.redirect === "error" && c.options.signal));
  assert.equal(written[0], "wrangler.deploy.jsonc");
  assert.equal(written[2].mode, 0o600);
  assert.equal(clean(written[1]).vars.SPOTIFY_CLIENT_ID, "syntheticspotifyclientid0123456789");
  assert.doesNotMatch(written[1], /synthetic-ci-credential|LISTENING_TOKEN_KEY/);
});

test("missing, split, and partial production deployments create no deployment config", async () => {
  for (const deployment of [
    { deployments: [] },
    installed({ percent: 75 }),
    installed({ versions: [
      { version_id: activeVersion, percentage: 50 },
      { version_id: uploadedVersion, percentage: 50 },
    ] }),
  ]) {
    let writes = 0;
    await assert.rejects(preparePrivateDeployment({
      env: { CLOUDFLARE_ACCOUNT_ID: "a".repeat(32), CLOUDFLARE_API_TOKEN: "synthetic" },
      read: async () => base,
      write: async () => { writes++; },
      fetcher: async url => Response.json({
        success: true,
        result: url.endsWith("/deployments") ? deployment : provider(url),
      }),
    }));
    assert.equal(writes, 0);
  }
});

test("active version missing private DB is not replaced by the staged upload or silently deployed", async () => {
  let writes = 0;
  await assert.rejects(preparePrivateDeployment({
    env: { CLOUDFLARE_ACCOUNT_ID: "a".repeat(32), CLOUDFLARE_API_TOKEN: "synthetic" },
    read: async () => base,
    write: async () => { writes++; },
    fetcher: async url => Response.json({
      success: true,
      result: url.endsWith("/versions/" + activeVersion)
        ? { resources: { bindings: [{ type: "secret_text", name: "LISTENING_TOKEN_KEY" }] } }
        : provider(url),
    }),
  }));
  assert.equal(writes, 0);
});

test("public GitHub workflow masks inherited owner values before generating the temporary deployment configuration", async () => {
  const events = [];
  await preparePrivateDeployment({
    env: {
      CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
      CLOUDFLARE_API_TOKEN: "synthetic-ci-credential",
      GITHUB_ACTIONS: "true",
    },
    read: async () => base,
    write: async () => { events.push({ event: "written" }); },
    mask: value => { events.push({ event: "mask", value }); },
    fetcher: async url => Response.json({ success: true, result: provider(url) }),
  });
  const marked = events.filter(x => x.event === "mask").map(x => x.value);
  assert.ok(marked.includes("owner@example.test"));
  assert.ok(marked.includes("synthetic-audience"));
  assert.ok(marked.includes("syntheticspotifyclientid0123456789"));
  assert.equal(events.at(-1).event, "written");
  assert.ok(events.slice(0, -1).every(x => x.event === "mask"));
  assert.ok(!marked.includes("false"));
});


test("preflight safely distinguishes 403 scope denials, malformed JSON and provider rejection without leaking details", async () => {
  const cases = [
    {
      response: new Response("provider-token-secret", { status: 403 }),
      reason: "HTTP_403",
    },
    {
      response: new Response("provider-token-secret", {
        status: 200, headers: { "Content-Type": "application/json" },
      }),
      reason: "INVALID_JSON",
    },
    {
      response: Response.json({
        success: false, errors: [{ code: 9999, message: "provider-token-secret" }],
      }),
      reason: "API_REJECTED",
    },
  ];
  for (const sample of cases) {
    let writes = 0;
    await assert.rejects(
      preparePrivateDeployment({
        env: {
          CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
          CLOUDFLARE_API_TOKEN: "synthetic-ci-credential",
        },
        write: async () => { writes++; },
        fetcher: async () => sample.response,
      }),
      error => error instanceof PrivatePreflightFailure &&
        error.stage === "DEPLOYMENTS_READ" &&
        error.reason === sample.reason &&
        !JSON.stringify(error).includes("provider-token-secret") &&
        !JSON.stringify(error).includes("synthetic-ci-credential"),
    );
    assert.equal(writes, 0);
  }
});

test("preflight identifies the active version read and D1 metadata read as independent permission boundaries", async () => {
  for (const stage of ["ACTIVE_VERSION_READ", "D1_METADATA_READ"]) {
    let writes = 0;
    await assert.rejects(
      preparePrivateDeployment({
        env: {
          CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
          CLOUDFLARE_API_TOKEN: "synthetic-ci-credential",
        },
        read: async () => base,
        write: async () => { writes++; },
        fetcher: async (url) => {
          if (stage === "ACTIVE_VERSION_READ" && url.includes("/versions/"))
            return new Response("sensitive provider text", { status: 403 });
          if (stage === "D1_METADATA_READ" && url.includes("/d1/database/"))
            return new Response("sensitive provider text", { status: 403 });
          return Response.json({ success: true, result: provider(url) });
        },
      }),
      error => error instanceof PrivatePreflightFailure &&
        error.stage === stage &&
        error.reason === "HTTP_403" &&
        !error.message.includes("sensitive provider text"),
    );
    assert.equal(writes, 0);
  }
});

test("a real-provider-style D1 401 blocks deployment after successful Worker reads", async () => {
  const calls = [];
  let writes = 0;
  await assert.rejects(preparePrivateDeployment({
    env: { CLOUDFLARE_ACCOUNT_ID: "a".repeat(32), CLOUDFLARE_API_TOKEN: "synthetic" },
    read: async () => base,
    write: async () => { writes++; },
    fetcher: async url => {
      calls.push(url);
      if (url.includes("/d1/database/"))
        return Response.json({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }, { status: 401 });
      return Response.json({ success: true, result: provider(url) });
    },
  }), error => error instanceof PrivatePreflightFailure &&
    error.stage === "D1_METADATA_READ" && error.reason === "HTTP_401");
  assert.equal(calls.length, 3);
  assert.equal(writes, 0);
});

test("preflight classifies network failure without echoing transport exception", async () => {
  await assert.rejects(
    preparePrivateDeployment({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
        CLOUDFLARE_API_TOKEN: "synthetic-ci-credential",
      },
      fetcher: async () => { throw Error("SENSITIVE_TRANSPORT_TOKEN"); },
    }),
    error => error instanceof PrivatePreflightFailure &&
      error.stage === "DEPLOYMENTS_READ" &&
      error.reason === "NETWORK_OR_TIMEOUT" &&
      !JSON.stringify(error).includes("SENSITIVE_TRANSPORT_TOKEN"),
  );
});

test("provider failures create no deployment file and expose no provider response or credential", async () => {
  let writes = 0;
  await assert.rejects(
    preparePrivateDeployment({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
        CLOUDFLARE_API_TOKEN: "synthetic-ci-credential",
      },
      write: async () => { writes++; },
      fetcher: async () =>
        new Response("PRIVATE_PROVIDER_DETAIL", { status: 403 }),
    }),
    e =>
      !e.message.includes("PRIVATE_PROVIDER_DETAIL") &&
      !e.message.includes("synthetic-ci-credential"),
  );
  assert.equal(writes, 0);
});

test("GitHub OIDC release preserves a previously approved gate without a new category opt-in", () => {
  const enabled = settings();
  enabled.bindings.find(b => b.name === "GITHUB_OIDC_ACTIVITY_ENABLED").text = "true";
  assert.equal(clean(privateDeploymentConfig(base, enabled, database))
    .vars.GITHUB_OIDC_ACTIVITY_ENABLED, "true");
  assert.equal(clean(privateDeploymentConfig(base, enabled, database, {
    githubOidcAction: "disable",
  })).vars.GITHUB_OIDC_ACTIVITY_ENABLED, "false");
  assert.throws(() => privateDeploymentConfig(base, settings(), database, {
    githubOidcAction: "enable",
  }), /prerequisites/);
  assert.throws(() => privateDeploymentConfig(base, settings(), database, {
    githubOidcAction: "unexpected", githubOidcConsentVerified: true,
  }), /Unsupported/);
  const approved = settings();
  approved.bindings.find(b => b.name === "PRESENCE_PUBLIC_RELEASE_APPROVED").text = "true";
  assert.equal(clean(privateDeploymentConfig(base, approved, database, {
    githubOidcAction: "enable", githubOidcConsentVerified: true,
  })).vars.GITHUB_OIDC_ACTIVITY_ENABLED, "true");
  assert.doesNotMatch(privateDeploymentConfig(base, approved, database, {
    githubOidcAction: "enable", githubOidcConsentVerified: true,
  }), /LISTENING_TOKEN_KEY/);
});

test("GitHub OIDC consent check is read-only, source-specific, dated and fail-closed", async () => {
  const captured = [];
  const valid = async (url, options) => {
    captured.push({url,options});
    return Response.json({success:true,result:[{success:true,
      results:[{configured:1,eligible:1}]}]});
  };
  assert.equal(await verifyGithubOidcOwnerConsent({
    account:"a".repeat(32),token:"synthetic-ci",databaseId:id,
    now:1_700_000_000_000,fetcher:valid,
  }),true);
  assert.equal(captured.length,1);
  assert.equal(captured[0].options.method,"POST");
  assert.equal(captured[0].options.redirect,"error");
  const body=JSON.parse(captured[0].options.body);
  assert.deepEqual(body.params,["1700000000000"]);
  assert.match(body.sql,/s.source='github-actions'/);
  assert.match(body.sql,/s.project_slug='devonakins-com'/);
  assert.match(body.sql,/s.token_until>\?/);
  assert.doesNotMatch(body.sql,/SELECT \*/);
  for(const rows of [
    [{configured:2,eligible:1}],[{configured:1,eligible:0}],
    [],[{configured:0,eligible:0}],
  ]) {
    await assert.rejects(verifyGithubOidcOwnerConsent({
      account:"a".repeat(32),token:"synthetic-ci",databaseId:id,
      fetcher:async()=>Response.json({success:true,result:[{success:true,results:rows}]}),
    }),e=>e instanceof PrivatePreflightFailure && e.stage.startsWith("OIDC_CONSENT"));
  }
  await assert.rejects(verifyGithubOidcOwnerConsent({
    account:"a".repeat(32),token:"synthetic-ci",databaseId:id,
    fetcher:async()=>new Response("sensitive provider text",{status:403}),
  }),e=>e instanceof PrivatePreflightFailure &&
    e.reason==="HTTP_403" && !JSON.stringify(e).includes("sensitive provider text"));
});

test("activation preflight needs exact protected-main confirmation plus approved D1 source", async () => {
  const env = {
    CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
    CLOUDFLARE_API_TOKEN: "synthetic-ci",
    GITHUB_ACTIONS: "true",
    GITHUB_REF: "refs/heads/main",
    GITHUB_SHA: "a".repeat(40),
    EXPECTED_SHA: "a".repeat(40),
    RELEASE_VARIANT: "v4",
    GITHUB_OIDC_ACTION: "enable",
    GITHUB_OIDC_CONFIRMATION: "GITHUB-OIDC-ENABLE-APPROVED",
  };
  const approval = settings();
  approval.bindings.find(b=>b.name==="PRESENCE_PUBLIC_RELEASE_APPROVED").text="true";
  const queries=[];
  const fetcher = async (url,opts) => {
    if(url.endsWith("/query")) {
      queries.push(opts);
      return Response.json({success:true,result:[{success:true,
        results:[{configured:1,eligible:1}]}]});
    }
    return Response.json({success:true,
      result:url.endsWith("/versions/"+activeVersion)
        ? {resources:approval}
        : provider(url)});
  };
  let written;
  await preparePrivateDeployment({env,fetcher,read:async()=>base,
    write:async (...args)=>{written=args;}});
  assert.equal(queries.length,1);
  assert.equal(written[0],"wrangler.deploy.jsonc");
  assert.equal(written[2].mode,0o600);
  assert.equal(clean(written[1]).vars.GITHUB_OIDC_ACTIVITY_ENABLED,"true");
  for(const input of [
    {GITHUB_OIDC_CONFIRMATION:"yes"},
    {GITHUB_REF:"refs/heads/other"},
    {RELEASE_VARIANT:"v5"},
    {EXPECTED_SHA:"b".repeat(40)},
    {GITHUB_ACTIONS:"false"},
    {GITHUB_OIDC_ACTION:"anything"},
  ]) {
    let writes=0;
    await assert.rejects(preparePrivateDeployment({
      env:{...env,...input},fetcher,read:async()=>base,
      write:async()=>{writes++;},
    }));
    assert.equal(writes,0);
  }
  let writes=0;
  await assert.rejects(preparePrivateDeployment({
    env,read:async()=>base,write:async()=>{writes++;},
    fetcher:async(url,opts)=>url.endsWith("/query")
      ? Response.json({success:true,result:[{success:true,
          results:[{configured:1,eligible:0}]}]})
      : fetcher(url,opts),
  }),e=>e instanceof PrivatePreflightFailure && e.reason==="SOURCE_NOT_APPROVED");
  assert.equal(writes,0);
});
