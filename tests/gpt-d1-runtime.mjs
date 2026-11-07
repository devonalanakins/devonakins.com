#!/usr/bin/env node
/** Real workerd/D1 acceptance. Only synthetic in-memory data, never a hosted DB. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(resolve(process.env.GPT_MINIFLARE_ROOT||'/tmp/devon-d1-tools/node_modules','miniflare/dist/src/index.js')));
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-29',d1Databases:{DB:'gpt-atomic-fixture'}}));
try{
  const db=await mf.getD1Database('DB');
  for(const file of ['0002_presence.sql','0008_gpt_owner_metrics.sql','0009_gpt_capture_revision.sql']){
    const sql=(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8')).replace(/^--.*$/gm,'');
    const statements=sql.split(/(CREATE TRIGGER[\s\S]*?END;)/g).flatMap(part=>
      part.trimStart().startsWith('CREATE TRIGGER')?[part]:part.split(';'));
    for(const statement of statements.filter(s=>s.trim()))await db.prepare(statement).run();
  }
  const {createGptSnapshotOwnerApi}=await import('../src/gpt-snapshots.mjs');
  const api=createGptSnapshotOwnerApi({clock:()=>Date.parse('2026-11-07T14:00:00Z')});
  const env={LISTENING_DB:db,LISTENING_OWNER_EMAIL:'fixture@example.test',LISTENING_ACCESS_AUD:'test'};
  const ctx={access:{aud:'test',getIdentity:async()=>({email:'fixture@example.test'})}};
  const save=(revision,measurements)=>api(new Request('https://example.test/api/presence/owner?channel=gpt',{
    method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({action:'record-batch',revision,measurements})}),env,ctx);
  const entries=[{metric:'profile_7d_tokens',value:10},{metric:'profile_streak_days',value:2}];
  const concurrent=await Promise.all([save(0,entries),save(0,[{metric:'business_7d_messages',value:999}])]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM gpt_owner_metrics').first()).n,2);
  await db.exec("CREATE TRIGGER test_failure BEFORE INSERT ON gpt_owner_metrics WHEN NEW.metric='business_7d_messages' BEGIN SELECT RAISE(ABORT,'injected'); END;");
  const revision=(await db.prepare('SELECT revision FROM gpt_capture_state').first()).revision;
  assert.equal((await save(revision,[{metric:'profile_7d_tokens',value:11},{metric:'business_7d_messages',value:100}])).status,503);
  assert.equal((await db.prepare("SELECT value FROM gpt_owner_metrics WHERE metric='profile_7d_tokens'").first()).value,10);
  assert.equal((await db.prepare('SELECT revision FROM gpt_capture_state').first()).revision,revision);
  console.log('Real workerd/D1: concurrent revision rejection, full rollback and unchanged prior value/revision passed.');
}finally{await mf.dispose();}
