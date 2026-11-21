/** Bundle 35 production smoke — READ ONLY, no test accounts or rooms created. */
import assert from 'node:assert/strict';
const base='https://br-autumn-pond-b92zfumu-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const origin='https://baleshhaa.figma.site';
const health=await fetch(base+'/health');
assert.equal(health.status,200);assert.equal((await health.json()).ok,true);
const preflight=await fetch(base+'/api/rooms/AAAAAA/counts',{method:'OPTIONS',
  headers:{origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});
assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
const unauth=await fetch(base+'/api/rooms/AAAAAA/counts',{headers:{origin}});
const response=await unauth.json();
assert.equal(unauth.status,401,'Host question counts must require login');
assert.equal(response?.error?.code,'AUTH_REQUIRED');
const viewer=await fetch(base+'/api/rooms/AAAAAA/viewer',{headers:{origin}});
assert.equal(viewer.status,401,'Viewer state must require viewer credentials');
console.log('PASS: production Bundle 35 function healthy, live counts endpoint exists, protected by auth, CORS passes.');
console.log('No production writes, test account creation, or room creation.');
