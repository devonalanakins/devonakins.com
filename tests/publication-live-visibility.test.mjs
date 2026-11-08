import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewedGithubLinks,
  verifyPublicGithubLinks,
} from "../scripts/verify-public-portfolio-links.mjs";

const project=(slug, url, approved=true)=>({
  slug,
  url,
  publication:{sourceLinkApproved:approved},
});
const good=[
  project("merit","https://github.com/devonalanakins/merit"),
  project("vesper",undefined,false),
  project("rhen-language","https://github.com/devonalanakins/rhen"),
];
const okResponse=({name="merit",privateRepo=false,visibility="public",status=200}={})=>({
  status,
  json: async()=>({
    full_name:"devonalanakins/"+name,
    html_url:"https://github.com/devonalanakins/"+name,
    private:privateRepo,
    visibility,
  }),
});

test("public visibility gate inspects approved source links, never private concept",()=>{
  assert.deepEqual(reviewedGithubLinks(good),[
    {project:"merit",repo:"merit",url:"https://github.com/devonalanakins/merit"},
    {project:"rhen-language",repo:"rhen",url:"https://github.com/devonalanakins/rhen"},
  ]);
  assert.deepEqual(reviewedGithubLinks([
    good[0],good[0],
  ]).map(x=>x.repo),["merit"]);
});

test("approved source destinations are exact owner repository roots",()=>{
  for(const url of [
    "https://github.com/devonalanakins/vesper/pull/1",
    "https://github.com/attacker/merit",
    "https://github.com/devonalanakins/merit?tab=code",
    "https://github.com/devonalanakins/merit#private",
    "https://github.com/devonalanakins/merit/",
    "http://github.com/devonalanakins/merit",
    "https://github.com.evil.invalid/devonalanakins/merit",
    "https://evil.invalid/devonalanakins/merit",
    null,
  ]) assert.throws(()=>reviewedGithubLinks([project("merit",url)]));
  assert.throws(()=>reviewedGithubLinks(null));
});

test("public visibility is verified from actual provider fields, not assumed from a cached catalog",async()=>{
  const calls=[];
  const fetchImpl=async(url, init)=>{
    calls.push({url,init});
    const name=url.split("/").at(-1);
    return okResponse({name});
  };
  const result=await verifyPublicGithubLinks({projects:good,fetchImpl,token:"test-token"});
  assert.deepEqual(result,{
    checked:2,visibility:"public",source:"GitHub repository metadata",
  });
  assert.deepEqual(calls.map(c=>c.url),[
    "https://api.github.com/repos/devonalanakins/merit",
    "https://api.github.com/repos/devonalanakins/rhen",
  ]);
  assert.ok(calls.every(c=>c.init.headers.Authorization==="Bearer test-token"));
  assert.ok(calls.every(c=>c.init.redirect==="error"));
  assert.ok(calls.every(c=>!c.url.includes("vesper")));
});

test("unconfirmed and private source data always fail closed",async()=>{
  const cases=[
    {response:{status:404,json:async()=>({})}},
    {response:{status:403,json:async()=>({})}},
    {response:okResponse({privateRepo:true,visibility:"private"})},
    {response:okResponse({privateRepo:false,visibility:"internal"})},
    {response:okResponse({name:"attacker"})},
    {response:{status:200,json:async()=>{throw Error("malformed");}}},
  ];
  for(const {response} of cases){
    await assert.rejects(
      verifyPublicGithubLinks({projects:[good[0]],token:"test-token",
        fetchImpl:async()=>response}),
      /GitHub source|metadata|not verified public/i,
    );
  }
  await assert.rejects(verifyPublicGithubLinks({
    projects:[good[0]],token:"test-token",
    fetchImpl:async()=>{throw Error("upstream down");},
  }),/lookup unavailable/);
  await assert.rejects(verifyPublicGithubLinks({
    projects:[good[0]],token:"",
    fetchImpl:async()=>{throw Error("should not execute");},
  }),/token required/);
  await assert.rejects(verifyPublicGithubLinks({
    projects:[good[1]],token:"test-token",
    fetchImpl:async()=>{throw Error("must not contact provider");},
  }),/unexpectedly empty/);
});

test("provider API error body and the token are never reported to the caller",async()=>{
  const secret="dont-log-provider-credentials";
  await assert.rejects(
    verifyPublicGithubLinks({
      projects:[good[0]],
      token:secret,
      fetchImpl:async()=>({
        status:403,
        json:async()=>({message:"danger: "+secret}),
      }),
    }),
    err=>{
      assert.ok(!err.message.includes(secret));
      return true;
    },
  );
});
