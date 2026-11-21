/** Bundle 34: safe read-only production availability and CORS checks. */
import assert from 'node:assert/strict';
const origin='https://baleshhaa.figma.site';
const base='https://br-autumn-pond-b92zfumu-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const get=async(path,options={})=>{
  const response=await fetch(base+path,options);
  const body=await response.text();
  return {response,body};
};
const health=await get('/health');
assert.equal(health.response.status,200,'main rooms function health');
assert.equal(JSON.parse(health.body).ok,true);
const preflight=await get('/api/rooms',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
assert.equal(preflight.response.status,204,'CORS preflight status');
assert.equal(preflight.response.headers.get('access-control-allow-origin'),origin,'site origin allowed');
const forbidden=await get('/health',{headers:{Origin:'https://evil.invalid'}});
assert.equal(forbidden.response.status,403,'unknown origin denied');
const noAuth=await get('/api/rooms/active',{headers:{Origin:origin}});
assert.equal(noAuth.response.status,401,'rooms active requires valid login');
console.log('MAIN_ROOMS_HEALTH_OK; CORS, unauthorized access and origin checks passed.');
console.log('No database records written, no tokens or secrets requested.');
