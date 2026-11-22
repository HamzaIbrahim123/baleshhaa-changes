/** Bundle 37 MAIN: safe read-only health, auth and CORS check. */
import assert from 'node:assert/strict';
const origin='https://baleshhaa.figma.site';
const base='https://br-autumn-pond-b92zfumu-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const h=await fetch(base+'/health',{headers:{origin}});
assert.equal(h.status,200,'Production function must load');
const json=await h.json();
assert.equal(json.ok,true);
assert.equal(h.headers.get('access-control-allow-origin'),origin);
const options=await fetch(base+'/api/rooms/AAAAAA/commands',{
 method:'OPTIONS',
 headers:{origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}
});
assert.equal(options.status,204,'Preflight should be permitted');
assert.equal(options.headers.get('access-control-allow-origin'),origin);
const noAuth=await fetch(base+'/api/rooms/AAAAAA/host',{headers:{origin}});
assert.equal(noAuth.status,401,'Host room must stay private');
console.log('PASS: production function loaded, app CORS allowed, host authentication enforced. No production data written.');
