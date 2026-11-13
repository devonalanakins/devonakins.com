import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {createThreadsMetaLifecycle} from "../src/threads-meta-lifecycle.mjs";
import {createHandler} from "../src/worker.mjs";

const now=Date.parse("2026-11-13T10:00:00Z");
const root="https://devonakins.com";
const secret="synthetic-meta-secret-long-enough";
const encode=s=>Buffer.from(s).toString("base64url");
async function sign(id="123456789",time=Math.floor(now/1000)){
 const payload=encode(JSON.stringify({algorithm:"HMAC-SHA256",issued_at:time,user_id:id}));
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
   {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const mac=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload));
 return encode(Buffer.from(mac))+"."+payload;
}
function fixture(){
 const sql=new DatabaseSync(":memory:");
 for(const path of ["0011_threads_private_oauth.sql","0012_threads_meta_lifecycle.sql"])
   sql.exec(readFileSync(new URL("../migrations/"+path,import.meta.url),"utf8"));
 const db={
   prepare(q){
     const stmt=sql.prepare(q);let args=[];
     return {bind(...v){args=v;return this;},
       async first(){return stmt.get(...args)||null;},
       async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};}};
   },
   async batch(statements){
     sql.exec("BEGIN TRANSACTION");
     try {
       const results=[];
       for(const statement of statements)results.push(await statement.run());
       sql.exec("COMMIT");
       return results;
     }catch(error){sql.exec("ROLLBACK");throw error;}
   }
 };
 const env={THREADS_APP_SECRET:secret,LISTENING_DB:db};
 sql.prepare("UPDATE threads_connection SET threads_user_id=?,username=?,token_cipher=?,revision=1,connected_at=? WHERE id=1")
   .run("123456789","fixture","encrypted",now-60000);
 const handler=createThreadsMetaLifecycle({clock:()=>now});
 const send=async(value,path="/api/threads/lifecycle/delete",method="POST")=>handler(
   new Request(root+path,{method,headers:{"Content-Type":"application/x-www-form-urlencoded"},
     body:method==="POST"?new URLSearchParams({signed_request:value}):undefined}),env);
 const get=async path=>handler(new Request(root+path),env);
 const row=()=>sql.prepare("SELECT revision,token_cipher,threads_user_id,connected_at FROM threads_connection").get();
 const receipts=()=>sql.prepare("SELECT COUNT(*) AS n FROM threads_lifecycle_receipt").get().n;
 return {sql,db,env,handler,send,get,row,receipts};
}
test("Meta data deletion returns stable confirmation code and public completed status",async()=>{
 const f=fixture();
 const signed=await sign();
 const first=await f.send(signed);
 assert.equal(first.status,200);
 const result=await first.json();
 assert.match(result.confirmation_code,/^[a-f0-9]{40}$/);
 assert.equal(result.url,root+"/api/threads/lifecycle/status/"+result.confirmation_code);
 assert.equal(f.row().token_cipher,null);
 assert.equal(f.row().threads_user_id,null);
 assert.equal(f.row().revision,2);
 const status=await f.get(new URL(result.url).pathname);
 assert.equal(status.status,200);
 assert.match(status.headers.get("content-type"),/text\/html/);
 assert.match(await status.text(),/Data deletion completed/);
 assert.equal((await f.send(signed)).status,200);
 assert.deepEqual(await (await f.send(signed)).json(),result,"replay has same confirmation code");
 assert.equal(f.receipts(),1);
 assert.equal(f.row().revision,2);
 assert.equal((await f.get("/api/threads/lifecycle/status/"+ "a".repeat(40))).status,404);
});
test("valid deauthorization removes pending OAuth attempts and only matching credentials",async()=>{
 const f=fixture();
 f.sql.prepare("INSERT INTO threads_oauth_attempt(state_hash,nonce_hash,expires_at) VALUES(?,?,?)")
   .run("state","nonce",now+300000);
 const wrong=await f.send(await sign("999999999"),"/api/threads/lifecycle/deauthorize");
 assert.equal(wrong.status,200);
 assert.equal(f.row().token_cipher,"encrypted");
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM threads_oauth_attempt").get().n,1);
 const success=await f.send(await sign(),"/api/threads/lifecycle/deauthorize");
 assert.deepEqual(await success.json(),{received:true});
 assert.equal(f.row().token_cipher,null);
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM threads_oauth_attempt").get().n,0);
});
test("replayed callbacks cannot revoke new grants, and pre-grant callbacks never remove new tokens",async()=>{
 const f=fixture(), signed=await sign();
 assert.equal((await f.send(signed)).status,200);
 f.sql.prepare("UPDATE threads_connection SET threads_user_id=?,token_cipher=?,connected_at=? WHERE id=1")
   .run("123456789","fresh-grant",now+2000);
 assert.equal((await f.send(signed)).status,200);
 assert.equal(f.row().token_cipher,"fresh-grant");
 // Different signed request issued earlier is also unable to revoke the later grant.
 assert.equal((await f.send(await sign("123456789",Math.floor(now/1000)-1))).status,200);
 assert.equal(f.row().token_cipher,"fresh-grant");
});
test("callback is authenticated by signed request, not an owner Access cookie",async()=>{
 const f=fixture();
 const worker=createHandler({}, {version:"test"}, {now:()=>new Date(now)});
 const path="/api/threads/lifecycle/deauthorize";
 const response=await worker.fetch(new Request(root+path,{method:"POST",
   headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({signed_request:await sign()})}),f.env,{});
 assert.equal(response.status,200);
 assert.equal(f.row().token_cipher,null);
 const forged=await worker.fetch(new Request(root+path,{method:"POST",
   headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({signed_request:"invalid"})}),f.env,{});
 assert.equal(forged.status,403);
});
test("forged, expired, oversized and malformed requests fail closed",async()=>{
 const f=fixture();
 const good=await sign();
 for(const value of [
   (good[0]==="A"?"B":"A")+good.slice(1),
   await sign("123456789",Math.floor(now/1000)-7200),
   "malformed",
   "z".repeat(20000),
 ]){
   assert.equal((await f.send(value)).status,403);
 }
 assert.equal(f.row().token_cipher,"encrypted");
 assert.equal(f.receipts(),0);
 assert.equal((await f.send(good,"/api/threads/lifecycle/delete","GET")).status,405);
 assert.equal((await f.send(good,"/api/threads/lifecycle/unknown")).status,404);
 assert.equal(f.row().token_cipher,"encrypted");
});
test("database failure rolls back revocation, pending-state deletion and receipt in one transaction",async()=>{
 const f=fixture();
 f.sql.prepare("INSERT INTO threads_oauth_attempt(state_hash,nonce_hash,expires_at) VALUES(?,?,?)")
   .run("state","nonce",now+300000);
 const original=f.db.batch.bind(f.db);
 f.db.batch=async statements=>{
   statements[1].run=async()=>{throw Error("Synthetic update failure");};
   return original(statements);
 };
 const response=await f.send(await sign());
 assert.equal(response.status,503);
 assert.equal(f.row().token_cipher,"encrypted");
 assert.equal(f.receipts(),0);
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM threads_oauth_attempt").get().n,1);
});
