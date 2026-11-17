/** Test-only transport for Wrangler's self-signed loopback HTTPS server.
 * Never used by the Worker or public live verifier; external hosts are rejected.
 */
import assert from 'node:assert/strict';
import {request} from 'node:https';
import {gunzipSync} from 'node:zlib';
export async function localWorkerRequest(origin,path){
 assert.match(origin,/^https:\/\/127\.0\.0\.1:\d+$/,'Only isolated loopback HTTPS is supported');
 assert.ok(path.startsWith('/'));
 return new Promise((resolve,reject)=>{
  const req=request(origin+path,{rejectUnauthorized:false,timeout:10000},res=>{
   const chunks=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>5*1024*1024)req.destroy(new Error('Local response exceeded test bound'));else chunks.push(chunk)});
   res.on('error',reject);
   res.on('end',()=>{try{
    let body=Buffer.concat(chunks);const headers=new Headers();
    for(const [key,value]of Object.entries(res.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
    if(headers.get('content-encoding')==='gzip'){body=gunzipSync(body);headers.delete('content-encoding');headers.delete('content-length')}
    resolve(new Response(body,{status:res.statusCode,headers}));
   }catch(error){reject(error)}});
  });
  req.on('timeout',()=>req.destroy(new Error('Local runtime request timed out')));req.on('error',reject);req.end();
 });
}
