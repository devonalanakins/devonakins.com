import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../extensions/presence-vscode/extension.cjs", import.meta.url),
  "utf8",
);
const start = Date.parse("2026-11-06T20:00:00.000Z");
const key = "devon-presence-pairing-v1";
const pairing = () => ({
  token: "T".repeat(43),
  expiresAt: new Date(start + 3600000).toISOString(),
  projects: ["merit"],
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const settle = () => new Promise((resolve) => setImmediate(resolve));
function companion({ transport, readSecret, storeSecret, deleteSecret, globals = new Map(),
  remote = "https://github.com/devonalanakins/merit.git", catalog, gitActivation,
} = {}) {
  let edit;
  let fileChanged;
  let fileCreated;
  let watcherDisposed = false;
  let tick;
  let time = start;
  let scheme = "file";
  let catalogReads = 0;
  const git = {getAPI: () => ({ getRepository: () => ({state:{remotes:[{name:"origin",fetchUrl:remote}]}}) })};
  let disposed = false;
  const secretValues = new Map();
  const signals = [];
  const errors = [];
  const texts = [];
  const status = {
    set text(value) {
      assert.equal(disposed, false, "disposed UI must not be updated");
      texts.push(value);
    },
    show() {},
    dispose() {
      disposed = true;
    },
  };
  const api = {
    StatusBarAlignment: { Right: 1 },
    extensions: {getExtension: () => gitActivation
      ? {isActive:false,activate:async()=>{await gitActivation;return git;}}
      : {isActive:true,exports:git}},
    window: {
      state: { focused: true },
      createStatusBarItem: () => status,
      showInputBox: async () => "P".repeat(43),
      showQuickPick: async items => items[0],
      showInformationMessage: async () => {},
      showErrorMessage: async (value) => {
        errors.push(value);
      },
    },
    commands: {
      registerCommand() {
        return { dispose() {} };
      },
    },
    workspace: {
      onDidChangeTextDocument(fn) {
        edit = fn;
        return { dispose() {} };
      },
      createFileSystemWatcher(pattern) {
        assert.ok(pattern.startsWith("**/*.{"), "Watcher must stay workspace-scoped");
        return {
          onDidChange(fn) { fileChanged = fn; return {dispose(){}}; },
          onDidCreate(fn) { fileCreated = fn; return {dispose(){}}; },
          dispose() {watcherDisposed = true;},
        };
      },
    },
  };
  const context = {
    subscriptions: [],
    secrets: {
      async get(name) {
        return readSecret ? readSecret(name) : secretValues.get(name);
      },
      async store(name, value) {
        if (storeSecret) await storeSecret();
        secretValues.set(name, value);
      },
      async delete(name) {
        if (deleteSecret) await deleteSecret();
        secretValues.delete(name);
      },
    },
    globalState: { get(name) {return globals.get(name);}, async update(name,value) {globals.set(name,value);} },
  };
  const sandbox = {
    require: () => api,
    exports: {},
    AbortSignal,
    Date,
    JSON,
    Promise,
    setInterval,
    clearInterval,
  };
  vm.runInNewContext(source, sandbox);
  const client = sandbox.exports.createCompanion(api, context, {
    clock: () => time,
    setTimer: fn => {tick=fn;return 1;},
    clearTimer() {},
    async fetcher(url, init) {
      const body = init.body === undefined ? undefined : JSON.parse(init.body);
      if (url.endsWith("/catalog")) {
        catalogReads++;
        return catalog ? catalog(url, init, time) : Response.json({
          version:1,repositories:[{owner:"devonalanakins",name:"merit",projectSlug:"merit"}],
          expiresAt:new Date(time+300000).toISOString(),
        });
      }
      if (url.endsWith("/heartbeat")) signals.push(body);
      if (transport) return transport(url, init, body);
      return Response.json(
        url.endsWith("/claim") ? pairing() : { accepted: true },
      );
    },
  });
  return {
    client,
    signals,
    secretValues,
    texts,
    errors,
    setRemote(value) {remote=value;},
    setScheme(value) {scheme=value;},
    advance(value) {time+=value;},
    focus(value) {api.window.state.focused=value;},
    trust(value) {api.workspace.isTrusted=value;},
    tick: () => tick(),
    catalogReads: () => catalogReads,
    watcherDisposed: () => watcherDisposed,
    externalChange(path, scheme = "file") {
      fileChanged({ fsPath: path, scheme });
    },
    externalCreate(path, scheme = "file") {
      fileCreated({ fsPath: path, scheme });
    },
    isReportable(path, scheme = "file") {
      return sandbox.exports.reportableExternalFile({ fsPath: path, scheme });
    },
    edit(changes = [{}]) {
      edit({contentChanges: changes,document:{uri:{scheme},getText(){throw Error("document text must not be read");}}});
    },
    async pairAndResume() {
      await client.ready;
      await client.actions.pair();
      await client.actions.resume();
    },
  };
}

for (const action of ["pause", "disconnect"]) {
  test(`${action} follows an in-flight active heartbeat with a newer inactive signal`, async () => {
    const active = deferred();
    const f = companion({
      async transport(url, init, body) {
        if (url.endsWith("/claim")) return Response.json(pairing());
        if (body.active) await active.promise;
        return Response.json({ accepted: true });
      },
    });
    await f.pairAndResume();
    f.edit();
    const stopping = f.client.actions[action]();
    assert.equal(f.signals.length, 1);
    const writesBeforeResponse = f.texts.length;
    active.resolve();
    await stopping;
    assert.deepEqual(
      f.signals.map((value) => value.active),
      [true, false],
    );
    assert.ok(
      Date.parse(f.signals[1].observedAt) > Date.parse(f.signals[0].observedAt),
    );
    assert.ok(
      f.texts
        .slice(writesBeforeResponse)
        .every((value) => !value.includes("editor active")),
    );
    if (action === "disconnect") {
      assert.equal(f.secretValues.has(key), false);
      await f.client.actions.resume();
      f.edit();
      await settle();
      assert.equal(
        f.signals.length,
        2,
        "forgetting must prevent subsequent active signals",
      );
    }
    f.client.dispose();
  });
}

test("a rejected active heartbeat still permits a stop attempt and cannot overwrite paused UI", async () => {
  const active = deferred();
  const f = companion({
    async transport(url, init, body) {
      if (url.endsWith("/claim")) return Response.json(pairing());
      if (body.active) {
        await active.promise;
        throw Error("synthetic transport rejection");
      }
      return Response.json({ accepted: true });
    },
  });
  await f.pairAndResume();
  f.edit();
  const paused = f.client.actions.pause();
  active.resolve();
  await paused;
  assert.deepEqual(
    f.signals.map((value) => value.active),
    [true, false],
  );
  assert.match(f.texts.at(-1), /paused/);
  f.client.dispose();
});

test("shutdown fences a pending response and any new editor events", async () => {
  const active = deferred();
  const f = companion({
    async transport(url, init, body) {
      if (url.endsWith("/claim")) return Response.json(pairing());
      if (body.active) await active.promise;
      return Response.json({ accepted: true });
    },
  });
  await f.pairAndResume();
  f.edit();
  f.client.dispose();
  active.resolve();
  await settle();
  f.edit();
  await settle();
  assert.equal(f.signals.length, 1);
});

test("forgetting prevents a delayed pairing claim from restoring credentials", async () => {
  const claim = deferred();
  const f = companion({
    async transport() {
      await claim.promise;
      return Response.json(pairing());
    },
  });
  await f.client.ready;
  const pairingRequest = f.client.actions.pair();
  await settle();
  await f.client.actions.disconnect();
  claim.resolve();
  await pairingRequest;
  assert.equal(f.secretValues.has(key), false);
  assert.match(f.texts.at(-1), /pairing forgotten/);
  f.client.dispose();
});

test("forgetting orders deletion after a pending save and prevents later restoration", async () => {
  const saved = deferred();
  const f = companion({ storeSecret: () => saved.promise });
  await f.client.ready;
  const pairingRequest = f.client.actions.pair();
  await settle();
  const forgotten = f.client.actions.disconnect();
  saved.resolve();
  await Promise.all([pairingRequest, forgotten]);
  assert.equal(f.secretValues.has(key), false);
  assert.match(f.texts.at(-1), /pairing forgotten/);
  f.client.dispose();
});

test("a delayed startup secret read cannot restore a forgotten token", async () => {
  const restored = deferred();
  const f = companion({ readSecret: () => restored.promise });
  await f.client.actions.disconnect();
  restored.resolve(
    JSON.stringify({
      token: "T".repeat(43),
      expires: start + 3600000,
      projects: [],
    }),
  );
  await f.client.ready;
  await f.client.actions.resume();
  f.edit();
  await settle();
  assert.equal(f.signals.length, 0);
  assert.match(f.texts.at(-1), /pairing required/);
  f.client.dispose();
});

test("credential deletion failure is visible and Forget Pairing can be retried", async () => {
  let fail = true;
  const f = companion({
    async deleteSecret() {
      if (fail) throw Error("synthetic storage failure");
    },
  });
  await f.pairAndResume();
  await f.client.actions.disconnect();
  assert.equal(f.secretValues.has(key), true);
  assert.match(f.texts.at(-1), /removal failed/);
  assert.equal(f.errors.length, 1);
  fail = false;
  await f.client.actions.disconnect();
  assert.equal(f.secretValues.has(key), false);
  assert.match(f.texts.at(-1), /pairing forgotten/);
  f.client.dispose();
});


test("explicit sharing consent survives restart; pause persists and startup never invents an edit",async()=>{
 const globals=new Map([["sharingEnabled",true]]);
 const saved=JSON.stringify({token:"T".repeat(43),expires:start+3600000,projects:["merit"]});
 const first=companion({globals,readSecret:async()=>saved});await first.client.ready;
 assert.equal(first.signals.length,0);first.edit();await settle();assert.equal(first.signals[0].active,true);
 await first.client.actions.pause();assert.equal(globals.get("sharingEnabled"),false);first.client.dispose();
 const second=companion({globals,readSecret:async()=>saved});await second.client.ready;second.edit();await settle();assert.equal(second.signals.length,0);second.client.dispose();
});


test("one pairing recognizes authenticated approved repository mappings without a local registry", async () => {
  const requests=[];
  const f=companion({catalog:async(url,init,time)=>{
    requests.push({url,init});
    return Response.json({version:1,repositories:[
      {owner:"devonalanakins",name:"future-research-module",projectSlug:"merit"},
      {owner:"devonalanakins",name:"anevum-web",projectSlug:"anevum"},
    ],expiresAt:new Date(time+300000).toISOString()});
  }});
  await f.pairAndResume();
  assert.equal(f.signals.length,0,"pairing, opening and resuming do not manufacture edits");
  f.setRemote("git@github.com:devonalanakins/future-research-module.git");
  f.edit();await settle();assert.equal(f.signals.at(-1).projectSlug,"merit");
  f.advance(60001);f.setRemote("ssh://git@github.com/devonalanakins/anevum-web.git");
  f.edit();await settle();assert.equal(f.signals.at(-1).projectSlug,"anevum");
  f.advance(60001);f.setRemote("https://github.com/devonalanakins/anevum.git");
  f.edit();await settle();assert.equal(f.signals.at(-1).active,false,"anevum is not anevum-web");
  assert.ok(requests.every(r=>r.init.method==="GET"&&r.init.body===undefined&&r.init.credentials==="omit"&&r.init.redirect==="error"));
  assert.ok(requests.every(r=>r.init.headers.Authorization==="Bearer "+"T".repeat(43)));
  assert.ok(!JSON.stringify(f.signals).includes("future-research-module"),"raw repository identity remains local");
  f.client.dispose();
});

test("unknown, forged, virtual and untrusted repositories never create an active signal", async () => {
  const f=companion();await f.pairAndResume();
  for(const remote of [
    "https://github.com/devonalanakins/private-client.git",
    "https://github.com.attacker.invalid/devonalanakins/merit.git",
    "https://github.com/devonalanakins/merit.git/../private",
    "https://github.com/another-owner/merit.git",
    "https://attacker@github.com/devonalanakins/merit.git",
    "git@github.com:devonalanakins/merit.git#private",
    "https://github.com/devonalanakins/__proto__",
  ]) {f.setRemote(remote);f.edit();await settle();}
  assert.equal(f.signals.length,0);
  f.setRemote("https://github.com/devonalanakins/merit.git");
  f.setScheme("untitled");f.edit();await settle();assert.equal(f.signals.length,0);
  f.setScheme("file");f.trust(false);f.edit();await settle();assert.equal(f.signals.length,0);
  f.trust(true);f.edit([]);await settle();assert.equal(f.signals.length,0);
  f.focus(false);f.edit();await settle();assert.equal(f.signals.length,0);
  f.focus(true);f.edit();await settle();assert.equal(f.signals.at(-1).active,true);
  f.client.dispose();
});

test("private-repository edit fences a pending public response and then clears public activity", async () => {
  const active=deferred();
  const f=companion({async transport(url,init,body){
    if(url.endsWith("/claim"))return Response.json(pairing());
    if(body.active)await active.promise;
    return Response.json({accepted:true});
  }});
  await f.pairAndResume();f.edit();
  f.setRemote("https://github.com/devonalanakins/private-client.git");
  f.edit();active.resolve();await settle();await settle();
  assert.deepEqual(f.signals.map(s=>s.active),[true,false]);
  assert.equal(f.signals.at(-1).projectSlug,null);
  assert.ok(!f.texts.slice(f.texts.lastIndexOf("Presence: private repository; not sharing")).includes("Presence: editor active"));
  f.client.dispose();
});

test("Git activation is awaited and an idle timer never renews an edit", async () => {
  const git=deferred();const f=companion({gitActivation:git.promise});
  let ready=false;void f.client.ready.then(()=>{ready=true;});await settle();assert.equal(ready,false);
  git.resolve();await f.pairAndResume();f.edit();await settle();
  assert.equal(f.signals.length,1);const captured=f.signals[0].observedAt;
  f.advance(60000);f.tick();await settle();assert.equal(f.signals.length,1);
  f.advance(60001);f.tick();await settle();assert.equal(f.signals.at(-1).active,false);
  assert.equal(f.signals[0].observedAt,captured);
  f.client.dispose();
});

test("catalog expiry or revocation fails closed without replaying a previous edit", async () => {
  let allowed=true;
  const f=companion({catalog:async(url,init,time)=>allowed?Response.json({
    version:1,repositories:[{owner:"devonalanakins",name:"merit",projectSlug:"merit"}],expiresAt:new Date(time+300000).toISOString(),
  }):Response.json({error:"Editor authentication required"},{status:401})});
  await f.pairAndResume();f.edit();await settle();allowed=false;
  f.advance(300001);f.tick();await settle();await settle();
  assert.equal(f.signals.at(-1).active,false);const stopped=f.signals.length;
  f.advance(60001);f.edit();await settle();assert.equal(f.signals.length,stopped);
  allowed=true;f.tick();await settle();assert.equal(f.signals.length,stopped,"catalog refresh cannot manufacture a new edit");
  f.advance(60001);f.edit();await settle();assert.equal(f.signals.at(-1).active,true);
  f.client.dispose();
});

test("malformed or ambiguous catalogs cannot approve repository edits", async () => {
  for(const repositories of [
    [{owner:"devonalanakins",name:"merit",projectSlug:"merit"},{owner:"devonalanakins",name:"merit",projectSlug:"rhen"}],
    [{owner:"https://github.com/devonalanakins",name:"merit",projectSlug:"merit"}],
    [{owner:"devonalanakins",name:"merit",projectSlug:"../../private"}],
  ]){
    const f=companion({catalog:async(url,init,time)=>Response.json({version:1,repositories,expiresAt:new Date(time+300000).toISOString()})});
    await f.pairAndResume();f.edit();await settle();assert.equal(f.signals.length,0);f.client.dispose();
  }
});


test("a disconnected heartbeat is throttled across new edits while pause remains immediate", async()=>{
  const f=companion({async transport(url,init,body){
    if(url.endsWith("/claim"))return Response.json(pairing());
    if(body.active)throw Error("offline");
    return Response.json({accepted:true});
  }});
  await f.pairAndResume();f.edit();await settle();
  for(let i=0;i<10;i++){f.advance(1000);f.edit();await settle();}
  assert.equal(f.signals.length,1);
  await f.client.actions.pause();assert.equal(f.signals.at(-1).active,false);
  f.client.dispose();
});


test("real external Codex file change produces an approved project observation", async () => {
  const f = companion();
  await f.pairAndResume();
  assert.equal(f.isReportable("C:\\work\\merit\\src\\index.ts"), true);
  f.externalChange("C:\\work\\merit\\src\\index.ts");
  await settle();
  assert.equal(f.signals.length, 1);
  assert.equal(f.signals[0].active, true);
  assert.equal(f.signals[0].projectSlug, "merit");
  assert.equal(JSON.stringify(f.signals).includes("index.ts"),false,"Never upload paths");
  f.client.dispose();
  assert.equal(f.watcherDisposed(),true);
});

test("external files in generated, hidden or credential paths do not imply live work", async () => {
  const f=companion();
  await f.pairAndResume();
  for(const file of [
    "C:\\work\\merit\\node_modules\\pkg\\index.ts",
    "C:\\work\\merit\\dist\\bundle.js",
    "C:\\work\\merit\\.git\\hooks\\pre-commit.js",
    "C:\\work\\merit\\coverage\\html\\index.html",
    "C:\\work\\merit\\.env.production",
    "C:\\work\\merit\\src\\credentials.json",
    "C:\\work\\merit\\src\\package.min.js",
    "C:\\work\\merit\\src\\bundle.js.map",
    "C:\\work\\merit\\src\\raw.png",
  ]) {
    assert.equal(f.isReportable(file),false,file);
    f.externalChange(file);
  }
  assert.equal(f.signals.length,0);
  f.client.dispose();
});

test("external agent edits require trusted workspace, focus and approved Git origin", async () => {
  const f=companion();await f.pairAndResume();
  f.focus(false);f.externalChange("C:\\work\\merit\\src\\logic.ts");await settle();
  f.focus(true);f.trust(false);f.externalChange("C:\\work\\merit\\src\\logic.ts");await settle();
  assert.equal(f.signals.length,0);
  f.trust(true);f.setRemote("https://github.com/devonalanakins/private-client.git");
  f.externalChange("C:\\work\\private-client\\src\\logic.ts");await settle();
  assert.equal(f.signals.length,0);
  f.setRemote("https://github.com/devonalanakins/merit.git");
  f.externalCreate("C:\\work\\merit\\src\\new-file.ts");await settle();
  assert.equal(f.signals.length,1);
  assert.equal(f.signals[0].projectSlug,"merit");
  f.client.dispose();
});

test("switching from approved source to private file clears previous public activity", async () => {
  const f=companion();await f.pairAndResume();
  f.externalChange("C:\\work\\merit\\src\\logic.ts");await settle();
  f.setRemote("https://github.com/devonalanakins/private-client.git");
  f.advance(50);
  f.externalChange("C:\\work\\private-client\\src\\logic.ts");await settle();
  assert.deepEqual(f.signals.map(s=>s.active),[true,false]);
  f.client.dispose();
});

test("file watcher observations stop after pausing or disposing companion",async()=>{
  const f=companion();await f.pairAndResume();
  await f.client.actions.pause();
  f.externalChange("C:\\work\\merit\\src\\logic.ts");await settle();
  assert.equal(f.signals.every(s=>!s.active),true);
  f.client.dispose();
  const n=f.signals.length;
  f.externalCreate("C:\\work\\merit\\src\\new.ts");await settle();
  assert.equal(f.signals.length,n);
  assert.equal(f.watcherDisposed(),true);
});
