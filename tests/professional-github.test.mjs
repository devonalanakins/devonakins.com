import test from "node:test";
import assert from "node:assert/strict";
import {
  projectProfessionalGithub,
  projectProfessionalGithubAtom,
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
    version:2,expiresAt:new Date(date.getTime()+60000).toISOString(),
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


const atomEntry = ({repo="devonakins.com",actor="devonalanakins",event="push",
  href="https://github.com/devonalanakins/"+repo+"/compare/a..b",
  timestamp="2026-11-10T19:59:00Z"}={}) => 
  '<entry><id>tag:github.com,2008:'+event+'/1234</id>'+
  '<published>'+timestamp+'</published><updated>'+timestamp+'</updated>'+
  '<link rel="alternate" type="text/html" href="'+href+'"/>'+
  '<title type="html">Untrusted raw private-looking commit details</title>'+
  '<author><name>'+actor+'</name></author>'+
  '<content type="html">&lt;script&gt;never-publish&lt;/script&gt;</content>'+
  '</entry>';
const atomFeed = (...entries) =>
  '<?xml version="1.0" encoding="UTF-8"?>'+
  '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">'+
  entries.join("")+'</feed>';

test("GitHub official public Atom fallback is safely projected and attributed",()=>{
  const projected=projectProfessionalGithubAtom(atomFeed(
    atomEntry({repo:"any-public-repository"}),
    atomEntry({repo:"knowledge",event:"pull_request",
      href:"https://github.com/devonalanakins/knowledge/pull/123"}),
    atomEntry({repo:"someone-elses-repo",actor:"not-the-owner"}),
    atomEntry({repo:"bad",href:"https://attacker.invalid/devonalanakins/bad"}),
  ),date);
  assert.equal(projected.source,"GitHub public Atom feed");
  assert.equal(projected.status,"available");
  assert.deepEqual(projected.events.map(x=>({kind:x.kind,repo:x.repo})),[
    {kind:"push",repo:"devonalanakins/any-public-repository"},
    {kind:"pull_request",repo:"devonalanakins/knowledge"},
  ]);
  assert.equal(validProfessionalGithub(projected,date),true);
  assert.doesNotMatch(JSON.stringify(projected),/Untrusted raw|never-publish|<script>|attacker/);
});

test("API 403 rate limit uses official public Atom instead of exposing unavailable state",async()=>{
  const called=[];
  const reader=createProfessionalGithubReader({
    clock:()=>date,cache:null,
    fetchImpl:async(url)=>{
      called.push(String(url));
      return String(url).includes("api.github.com")
        ? new Response("provider denied",{status:403,headers:{"x-ratelimit-remaining":"0","Retry-After":"1800"}})
        : new Response(atomFeed(atomEntry({repo:"unfeatured-live-work"})),{
            status:200,headers:{"Content-Type":"application/atom+xml; charset=utf-8"}});
    },
  });
  const first=await reader(),again=await reader();
  assert.equal(first.status,"available");
  assert.equal(first.source,"GitHub public Atom feed");
  assert.equal(first.events[0].repo,"devonalanakins/unfeatured-live-work");
  assert.equal(validProfessionalGithub(first,date),true);
  assert.deepEqual(first,again);
  assert.equal(called.length,2,"Cached fallback must not refetch for every visitor");
  assert.match(called[1],/^https:\/\/github\.com\/devonalanakins\.atom$/);
});

test("malformed fallback never leaks feed fields and respects original API cooldown",async()=>{
  const bad=[
    atomFeed(atomEntry({href:"https://evil.example/devonalanakins/repo"})),
    "<!DOCTYPE html><html>Not an atom feed</html>",
    atomFeed(atomEntry({actor:"another-user"})),
  ];
  for(const xml of bad){
    const reader=createProfessionalGithubReader({
      clock:()=>date,cache:null,
      fetchImpl:async(url)=>String(url).includes("api.github.com")
        ? new Response("limited",{status:429,headers:{"Retry-After":"100"}})
        : new Response(xml,{status:200,headers:{"Content-Type":"application/atom+xml"}}),
    });
    const value=await reader();
    if(xml.includes("<!DOCTYPE")) {
      assert.equal(value.status,"unavailable");
      assert.equal(value.reason,"rate-limited");
    } else {
      // Valid public feed documents with no eligible owned events are empty,
      // never an invented project or an unavailable credential.
      assert.equal(value.status,"empty");
    }
    assert.doesNotMatch(JSON.stringify(value),/evil\.example|another-user|provider denied|<script>/);
    assert.equal(validProfessionalGithub(value,date),true);
  }
});

test("fallback rejects oversized or non-Atom XML without publishing content",()=>{
  assert.throws(()=>projectProfessionalGithubAtom("<html>not a feed</html>",date));
  assert.throws(()=>projectProfessionalGithubAtom("X".repeat(600001),date));
});
