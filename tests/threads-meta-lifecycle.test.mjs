import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {createThreadsMetaLifecycle} from "../src/threads-meta-lifecycle.mjs";

const now=Date.parse("2026-11-13T10:00:00Z");
const root="https://devonakins.com";
const secret="synthetic-meta-secret-long-enough";
const encode=s=>Buffer.from(s).toString("base64url");
async function sign(id="123456789",time=Math.floor(now/1000)){
 const payload=encode(JSON.stringify({algorithm:"HMAC-SHA256",issued_at:time,user_id:id}));
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const mac=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload));
 return encode(Buffer.from(mac))+"."+payload;
}
function fixture(){
 const sql=new DatabaseSync(":memory:");
 for(const path of ["0011_threads_private_oauth.sql","0012_threads_meta_lifecycle.sql"])
   sql.exec(readFileSync(new URL("../migrations/"+path,import.meta.url),"utf8"));
 const env={THREADS_APP_SECRET:secret,LISTENING_DB:{prepare(q){
   const stmt=sql.prepare(q);let args=[];
   return {bind(...v){args=v;return this;},async first(){return stmt.get(...args)||null;},
     async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};}};
 }}};
 sql.prepare("UPDATE threads_connection SET threads_user_id=?,username=?,token_cipher=?,revision=1 WHERE id=1")
   .run("123456789","fixture","encrypted");
 const handler=createThreadsMetaLifecycle({clock:()=>now});
 const send=async(value,path="/api/threads/lifecycle/delete",method="POST")=>handler(new Request(root+path,{
   method,headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:method==="POST"?new URLSearchParams({signed_request:value}):undefined
 }),env);
 const row=()=>sql.prepare("SELECT revision,token_cipher,threads_user_id FROM threads_connection").get();
 return {sql,env,send,row};
}
test("signed Meta deletion revokes only matching account and acknowledges without identity disclosure",async()=>{
 const f=fixture();
 assert.equal((await f.send(await sign("999999999"))).status,200);
 assert.equal(f.row().token_cipher,"encrypted");
 const receipt=await sign();
 assert.deepEqual(await (await f.send(receipt)).json(),{received:true});
 assert.equal(f.row().token_cipher,null);
 assert.equal(f.row().threads_user_id,null);
 assert.equal(f.row().revision,2);
 f.sql.prepare("UPDATE threads_connection SET threads_user_id=?,token_cipher=? WHERE id=1").run("123456789","new-credential");
 assert.equal((await f.send(receipt)).status,200);
 assert.equal(f.row().token_cipher,"new-credential","replay cannot revoke new grant");
});
test("deauthorization is accepted only when signature, time and method are valid",async()=>{
 const f=fixture();
 const good=await sign();
 assert.equal((await f.send(good,"/api/threads/lifecycle/deauthorize")).status,200);
 const other=fixture();
 for(const value of [(good[0]==="A"?"B":"A")+good.slice(1),await sign("123456789",Math.floor(now/1000)-7200),"malformed"]){
   assert.equal((await other.send(value)).status,403);
 }
 assert.equal(other.row().token_cipher,"encrypted");
 assert.equal((await other.send(good,"/api/threads/lifecycle/delete","GET")).status,405);
 assert.equal((await other.send(good,"/api/threads/lifecycle/unknown")).status,404);
 assert.equal(other.row().token_cipher,"encrypted");
});
