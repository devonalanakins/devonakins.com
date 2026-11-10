import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createActivityTasksApi, activityTasks } from "../src/activity-tasks.mjs";
import { GithubRunProviderUnavailable, GithubKeyProviderUnavailable } from "../src/github-actions-oidc.mjs";
const at=Date.parse("2026-11-10T15:00:00.000Z");
const owner={access:{aud:"fixture",getIdentity:async()=>({email:"owner@example.test"})}};
const pretendJwt="SIGNED_GITHUB_OIDC_FIXTURE_NOT_REAL";
function make({verified=true,enabled=true}={}){
 const sqlite=new DatabaseSync(":memory:");
 for(const file of ["0002_presence.sql","0003_presence_preferences.sql","0004_editor_pairing.sql","0006_cloud_presence.sql","0007_activity_tasks.sql"])
   sqlite.exec(readFileSync(new URL("../migrations/"+file,import.meta.url),"utf8"));
 const db={prepare(query){const statement=sqlite.prepare(query);let values=[];
   return {bind(...v){values=v;return this;},async first(){return statement.get(...values)||null;},
     async all(){return {results:statement.all(...values)};},
     async run(){return {meta:{changes:Number(statement.run(...values).changes)}};}}}};
 let validations=0;
 const api=createActivityTasksApi({clock:()=>at,verifyGithubIdentity:async(token,{clock})=>{
   validations++;assert.equal(token,pretendJwt);assert.equal(clock(),at);
   if(verified==="provider-unavailable") throw new GithubRunProviderUnavailable();
   if(verified==="key-provider-unavailable") throw new GithubKeyProviderUnavailable();
   return verified?{projectSlug:"devonakins-com"}:null;
 }});
 const env={PRESENCE_ENABLED:"true",PRESENCE_PUBLIC_RELEASE_APPROVED:"true",
   GITHUB_OIDC_ACTIVITY_ENABLED:enabled?"true":"false",LISTENING_DB:db,
   LISTENING_ACCESS_AUD:"fixture",LISTENING_OWNER_EMAIL:"owner@example.test"};
 const req=(path,body,token=pretendJwt)=>new Request("https://devonakins.com"+path,{
   method:"POST",headers:{"Content-Type":"application/json",Origin:"https://devonakins.com",
     ...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify(body)});
 const connect=async()=>{const response=await api(req("/api/presence/owner?channel=tasks",
   {action:"connect",source:"github-actions",projectSlug:"devonakins-com"},null),env,owner);
   assert.equal(response.status,200);return response.json();};
 const publish=()=>sqlite.exec("UPDATE presence_state SET public_enabled=1,revision=revision+1;UPDATE activity_sources SET public_enabled=1,revision=revision+1;");
 const start=()=>api(req("/api/activity/tasks/github-oidc-start",{version:1,projectSlug:"devonakins-com"}),env);
 return {sqlite,env,api,req,connect,publish,start,validations:()=>validations};
}
test("a signed and approved main-branch workflow creates an expiring public task",async()=>{
 const f=make();await f.connect();f.publish();
 const response=await f.start();assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.projectSlug,"devonakins-com");assert.equal(result.source,"github-actions");
 assert.equal(result.token.length,43);assert.equal(f.validations(),1);
 const publicView=await activityTasks(f.env,at);
 assert.equal(publicView.visibility,"public");assert.equal(publicView.tasks.length,1);
 assert.equal(publicView.tasks[0].source,"github-actions");
 assert.equal(publicView.tasks[0].state,"running");
 assert.equal(publicView.tasks[0].project,"DevonAkins.com");
 assert.doesNotMatch(JSON.stringify(publicView),/SIGNED_GITHUB_OIDC_FIXTURE/);
 assert.equal((await activityTasks(f.env,at+120001)).tasks.length,0);
});
test("release gate off returns 404 before invoking identity verifier",async()=>{
 const f=make({enabled:false});await f.connect();f.publish();
 assert.equal((await f.start()).status,404);
 assert.equal(f.validations(),0);assert.equal((await activityTasks(f.env,at)).tasks.length,0);
});
test("a rejected identity never creates a task even with approved source",async()=>{
 const f=make({verified:false});await f.connect();f.publish();
 assert.equal((await f.start()).status,401);
 assert.equal((await activityTasks(f.env,at)).tasks.length,0);
});
test("missing, private, revoked, and disallowed source cannot publish a signed task",async()=>{
 for(const mode of ["missing","private","revoked","owner-private","project-removed"]){
   const f=make();
   if(mode!=="missing")await f.connect();
   f.publish();
   if(mode==="private")f.sqlite.exec("UPDATE activity_sources SET public_enabled=0");
   if(mode==="revoked")f.sqlite.exec("UPDATE activity_sources SET revoked=1");
   if(mode==="owner-private")f.sqlite.exec("UPDATE presence_state SET private_work=1");
   if(mode==="project-removed")f.sqlite.exec("UPDATE presence_state SET public_projects_json='[\"merit\"]'");
   assert.equal((await f.start()).status,401,mode);
   assert.equal((await activityTasks(f.env,at)).tasks.length,0);
 }
});
test("multiple matching source credentials fail closed; legacy bearer remains available",async()=>{
 const f=make();const source=await f.connect();await f.connect();f.publish();
 assert.equal((await f.start()).status,401);
 const legacy=await f.api(f.req("/api/activity/tasks/start",
   {version:1,projectSlug:"devonakins-com"},source.token),f.env);
 assert.equal(legacy.status,200);
});
test("signed request cannot borrow an approved source for a different project",async()=>{
 const f=make();await f.connect();f.publish();
 const response=await f.api(f.req("/api/activity/tasks/github-oidc-start",
   {version:1,projectSlug:"merit"}),f.env);
 assert.equal(response.status,409);
 assert.equal((await activityTasks(f.env,at)).tasks.length,0);
});

test("signed but unconfirmed run has distinct 503 without source creation or credential leakage",async()=>{
 const f=make({verified:"provider-unavailable"});
 await f.connect();f.publish();
 const response=await f.start();
 assert.equal(response.status,503);
 assert.equal(response.headers.get("retry-after"),"60");
 const content=await response.text();
 assert.match(content,/Live workflow verification unavailable/);
 assert.doesNotMatch(content,/SIGNED_GITHUB_OIDC_FIXTURE|PRIVATE|secret|token/);
 assert.equal((await activityTasks(f.env,at)).tasks.length,0);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM activity_tasks").get().count,0);
});

test("signed-claim issuer JWKS outage is a fail-closed 502, never a task",async()=>{
 const f=make({verified:"key-provider-unavailable"});
 await f.connect();f.publish();
 const response=await f.start();
 assert.equal(response.status,502);
 assert.equal(response.headers.get("retry-after"),"60");
 const content=await response.text();
 assert.match(content,/Identity verification keys unavailable/);
 assert.doesNotMatch(content,/SIGNED_GITHUB_OIDC_FIXTURE|PRIVATE|secret|token/);
 assert.equal((await activityTasks(f.env,at)).tasks.length,0);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM activity_tasks").get().count,0);
});
