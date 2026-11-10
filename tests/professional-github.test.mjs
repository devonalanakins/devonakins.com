import test from "node:test";
import assert from "node:assert/strict";
import {
  projectProfessionalGithub,
  validProfessionalGithub,
  createProfessionalGithubReader,
} from "../src/professional/github-public.mjs";

const date = new Date("2026-11-10T20:00:00.000Z");
const sample = (name, type = "PushEvent", extra = {}) => ({
  id: "1000", public: true, type,
  actor: { login: "devonalanakins" },
  repo: { name: "devonalanakins/" + name },
  created_at: "2026-11-10T19:58:00Z",
  payload: { commits: [{ message: "no publishing raw commit messages" }] },
  ...extra,
});

test("automatic GitHub feed accepts public owner events from unfeatured repositories", () => {
  const value = projectProfessionalGithub([
    sample("unfeatured-project"),
    sample("knowledge", "PullRequestEvent", {
      payload: {action:"closed",pull_request:{merged:true,title:"do not expose"}},
    }),
    sample("devonakins.com", "ReleaseEvent"),
  ], date);
  assert.equal(value.events.length, 3);
  assert.deepEqual(value.events.map(e => e.repo), [
    "devonalanakins/unfeatured-project",
    "devonalanakins/knowledge",
    "devonalanakins/devonakins.com",
  ]);
  assert.equal(value.events[1].label, "Merged a pull request");
  assert.equal(validProfessionalGithub(value, date), true);
  assert.doesNotMatch(JSON.stringify(value), /no publishing raw|do not expose/);
});

test("private, other actor, unsafe repository and malformed events are excluded", () => {
  const value = projectProfessionalGithub([
    sample("private", "PushEvent", {public:false}),
    sample("fake", "PushEvent", {actor:{login:"another-user"}}),
    sample("repo", "PushEvent", {repo:{name:"evil/repo"}}),
    sample("bad", "PushEvent", {repo:{name:"devonalanakins/<script>"}}),
    sample("fine", "PushEvent", {type:"UnsupportedEvent"}),
    sample("actual"),
  ], date);
  assert.deepEqual(value.events.map(x=>x.repo), ["devonalanakins/actual"]);
  assert.equal(validProfessionalGithub({...value,events:[{...value.events[0],url:"https://evil.test"}]},date),false);
  assert.equal(validProfessionalGithub({...value,admin:true},date),false);
});

test("public feed is bounded, sorted, and never claims current coding", () => {
  const events = Array.from({length:70},(_,i)=>sample("repo-" + i,"PushEvent",{
    created_at:new Date(date.getTime()-(70-i)*1000).toISOString(),
  }));
  const projected = projectProfessionalGithub(events, date);
  assert.equal(projected.events.length,32);
  assert.match(projected.scope,/not exhaustive history or private activity/);
  assert.equal(validProfessionalGithub(projected,date),true);
  assert.equal(projected.events[0].repo,"devonalanakins/repo-69");
  assert.doesNotMatch(JSON.stringify(projected),/coding now|active development/i);
});

test("reader caches successful results, fails closed and shows provider outages",async()=>{
  let n=0;
  const reader=createProfessionalGithubReader({
    clock:()=>date, cache:null,
    fetchImpl:async()=>{n++;return new Response(JSON.stringify([sample("new-project")]),{status:200});},
  });
  const one=await reader(),two=await reader();
  assert.deepEqual(one,two);
  assert.equal(n,1);
  assert.equal(one.events[0].repo,"devonalanakins/new-project");
  const failed=createProfessionalGithubReader({
    clock:()=>date,cache:null,
    fetchImpl:async()=>new Response("secret details",{status:429,headers:{"Retry-After":"90"}}),
  });
  const fallback=await failed();
  assert.equal(fallback.status,"unavailable");
  assert.equal(fallback.reason,"rate-limited");
  assert.deepEqual(fallback.events,[]);
  assert.doesNotMatch(JSON.stringify(fallback),/secret details/);
  assert.equal(validProfessionalGithub(fallback,date),true);
});

test("edge cache cannot inject arbitrary GitHub fields",async()=>{
  const poison={
    version:1,expiresAt:new Date(date.getTime()+60000).toISOString(),
    value:{...projectProfessionalGithub([sample("repo")],date),token:"secret"},
  };
  let calls=0;
  const reader=createProfessionalGithubReader({
    clock:()=>date,
    cache:{match:async()=>new Response(JSON.stringify(poison)),put:async()=>{}},
    fetchImpl:async()=>{calls++;return new Response(JSON.stringify([sample("safe")]))},
  });
  assert.equal((await reader()).events[0].repo,"devonalanakins/safe");
  assert.equal(calls,1);
});
