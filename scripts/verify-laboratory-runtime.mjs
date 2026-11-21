import {localWorkerRequest} from './local-worker-request.mjs';
/** Isolated local workerd: compiled release, no remote bindings or provider writes. */
import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const dir=resolve('.artifacts/laboratory-runtime');await mkdir(dir,{recursive:true});
const config=JSON.parse((await readFile('wrangler.jsonc','utf8')).replace(/,\s*([}\]])/g,'$1'));
if(config.name!=='devonakins-personal'||config.d1_databases||config.vars)throw new Error('Unexpected local runtime target');
delete config.build;delete config.$schema;config.routes=[];config.main=resolve('.release/worker.mjs');
await writeFile(dir+'/config.json',JSON.stringify(config));
const log=await open(dir+'/runtime.log','w');
const env={...process.env,XDG_CONFIG_HOME:dir+'/config',WRANGLER_LOG_PATH:dir+'/logs',WRANGLER_SEND_METRICS:'false'};
const cli=spawn('npm',['exec','--yes','--package=wrangler@4.158.0','--','wrangler','dev','--local','--config',dir+'/config.json','--ip','127.0.0.1','--port','4183','--local-protocol=https'],{env,detached:true,stdio:['ignore',log.fd,log.fd]});
const origin='https://127.0.0.1:4183';
try{
 let ready=false;
 for(let i=0;i<180;i++){
  if(cli.exitCode!==null)throw new Error('Isolated workerd exited; inspect .artifacts/laboratory-runtime/runtime.log');
  try{const r=await localWorkerRequest(origin,'/_health');if(r.ok&&(await r.json()).variant==='laboratory'){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!ready)throw new Error('Isolated cinematic workerd did not become ready');
 const verifier=spawn(process.execPath,['scripts/verify-research-facility-candidate.mjs'],{env:{...process.env,LABORATORY_VERIFY_ORIGIN:origin},stdio:'inherit'});
 const result=await new Promise(resolve=>verifier.once('exit',resolve));
 if(result!==0)throw new Error('Isolated cinematic Worker acceptance failed');
 if(process.env.LABORATORY_RUNTIME_BROWSER_CHECK==='1'){
  for(const script of ['tests/laboratory_browser_acceptance.py','tests/cinematic_navigation_acceptance.py','tests/creator_pages_browser_acceptance.py']){
   const browser=spawn('python3',[script],{env:{...process.env,LABORATORY_TEST_ORIGIN:origin,CREATOR_TEST_ORIGIN:origin},stdio:'inherit'});
   if(await new Promise(resolve=>browser.once('exit',resolve))!==0)throw new Error('Cinematic workerd browser acceptance failed');
  }
 }
 console.log('Actual isolated workerd passed cinematic routes, redirects, retired analytics, owner denials/resources and CSP; no remote bindings configured.');
}finally{
 try{process.kill(-cli.pid,'SIGTERM')}catch{}
 await log.close();
}
