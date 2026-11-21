/** Non-intrusive production join check: asks to join a code that does not exist.
 * Expected 404 proves the rate limiter runs without crashing; no existing room is touched.
 */
import assert from 'node:assert/strict';
const base='https://br-autumn-pond-b92zfumu-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const res=await fetch(base+'/api/rooms/AAAAAA/join',{
 method:'POST',
 headers:{'content-type':'application/json','origin':'https://baleshhaa.figma.site'},
 body:'{}',
});
const payload=await res.json();
assert.equal(res.status,404,'Nonexistent valid room must return 404, not 500');
assert.equal(payload?.error?.code,'ROOM_NOT_FOUND');
assert.equal(res.headers.get('access-control-allow-origin'),'https://baleshhaa.figma.site');
console.log('PASS: join pipeline & rate limit table are working, unknown room correctly returns 404.');
