import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const authBase='https://br-late-math-b9m0r7gn-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech';
const roomBase='https://br-late-math-b9m0r7gn-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const jsonRequest=async(url, method='GET', data, token)=>{
  const res=await fetch(url,{
    method, headers:{...(data?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
    body:data?JSON.stringify(data):undefined,
  });
  const payload=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(method+' '+new URL(url).pathname+' '+res.status+' '+JSON.stringify(payload?.error||payload));
  return payload;
};
const call=(path,method='GET',data,token)=>jsonRequest(roomBase+'/api'+path,method,data,token);
const auth=async()=>{
  const username='qarooms'+randomBytes(6).toString('hex');
  const password='QA!'+randomBytes(22).toString('hex');
  const reply=await jsonRequest(authBase+'/api/auth/register','POST',{displayName:'Room QA Test',username,password});
  assert.ok(reply.token && reply.user?.id,'QA auth registration failed');
  return reply.token;
};
const h=await jsonRequest(roomBase+'/health');
assert.equal(h.ok,true);
const token=await auth();
const created=await call('/rooms','POST',{gameId:'letters',teams:['فريق تجربة 1','فريق تجربة 2'],bestOf:1},token);
assert.equal(created.room.status,'waiting');
assert.equal(created.room.revision,0);
assert.match(created.room.code,/^[A-HJ-NP-Z2-9]{6}$/);
assert.ok(created.displayUrl.includes(created.room.code));
const code=created.room.code;
let viewer=await call('/rooms/'+code+'/join','POST',{});
assert.ok(viewer.viewerToken && viewer.state);
assert.ok(!JSON.stringify(viewer.state).includes('answer_text'));
let live=await call('/rooms/'+code+'/host','GET',undefined,token);
assert.equal(live.room.displayConnected,true,'viewer should be marked connected');
const push=async(command)=>{
  live=await call('/rooms/'+code+'/commands','POST',{
    commandId:randomUUID(),expectedRevision:live.room.revision,command,
  },token);
  return live;
};
await push({kind:'start'});
assert.equal(live.hostState.stage,'playing');
assert.equal(live.room.revision,1);
await push({kind:'toggle_edit_mode'});
assert.equal(live.hostState.editMode,true);
await push({kind:'cycle_cell_color',cell:0});
assert.equal(live.hostState.owners[0],'orange');
const latest=await call('/rooms/'+code+'/viewer','GET',undefined,viewer.viewerToken);
assert.equal(latest.state.owners[0],'orange','cross-device room read must reflect host edits');
assert.equal(latest.state.question,null);
assert.ok(latest.state.wins);
const unauthed=await fetch(roomBase+'/api/rooms/'+code+'/host');
assert.equal(unauthed.status,401,'host endpoint must require auth');
await push({kind:'toggle_edit_mode'});
await push({kind:'end_match'});
assert.equal(live.room.status,'abandoned');
console.log('QA_REAL_ROOM_OK: auth→create→join→presence→start→edit→viewer sync→end');
console.log('No production database, match or question data touched.');
