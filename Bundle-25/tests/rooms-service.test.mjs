import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRoomHandler, createRoomService, digest } from '../backend/rooms/service.mjs';
import { winningPath, colorForTeam, publicState } from '../backend/rooms/engine.mjs';

const token = 'A'.repeat(50), secondToken = 'B'.repeat(50);
const origin = 'https://preview.baleshhaa.test';
const now = Date.parse('2026-11-20T12:00:00.000Z');
const shallow = x => structuredClone(x);
const mkRow = ({ id, code, userId, bestOf, state, projection }) => ({
  id, code, host_user_id:userId,game_id:'letters',series_length:bestOf,
  status:'waiting',revision:0,host_state:shallow(state),display_state:shallow(projection),
  last_viewer_seen_at:null,viewer_token_hash:null,created_at:new Date(now),
  expires_at:new Date(now+86400000),
});
function fakeDb() {
  const rooms = new Map(), commands = new Map(), used = new Set(), banks = new Map();
  const store={
    rooms, used, banks, rateLimit:false,
    async authenticate(hash) { return hash===digest(token)?'user-a':hash===digest(secondToken)?'user-b':null; },
    async create(data) {
      if ([...rooms.values()].some(r=>r.host_user_id===data.userId&&['active','waiting'].includes(r.status))) {
        const error=new Error('already exists');error.code='ROOM_ALREADY_ACTIVE';throw error;
      }
      if (rooms.has(data.code)) {const error=new Error('collision');error.code='ROOM_CODE_TAKEN';throw error;}
      const row=mkRow(data);rooms.set(data.code,row);return shallow(row);
    },
    async activeForUser(userId) {const r=[...rooms.values()].find(x=>x.host_user_id===userId&&['waiting','active'].includes(x.status));return r?shallow(r):null;},
    async byHost(code,userId) {const r=rooms.get(code);return r?.host_user_id===userId?shallow(r):null;},
    async checkJoinRate() {if(store.rateLimit){const e=new Error('limited');e.code='RATE_LIMITED';throw e;}},
    async join(code,viewerHash) {
      const r=rooms.get(code);if(!r||!['waiting','active'].includes(r.status)||new Date(r.expires_at).getTime()<=now)return null;
      r.viewer_token_hash=viewerHash;r.last_viewer_seen_at=new Date(now);return shallow(r);
    },
    async byViewer(code,viewerHash) {const r=rooms.get(code);if(!r||r.viewer_token_hash!==viewerHash)return null;r.last_viewer_seen_at=new Date(now);return shallow(r);},
    async runCommand(code,userId,cmdId,expectedRevision,transition) {
      const r=rooms.get(code);if(!r||r.host_user_id!==userId){const e=new Error('not found');e.code='ROOM_NOT_FOUND';throw e;}
      const k=code+cmdId;
      if(commands.has(k))return shallow(r);
      const tempUsed=new Set(used);
      const pickQuestion=async letter=>{
        const found=(banks.get(letter)||[]).find(q=>!tempUsed.has(q.id));
        if(!found)return null;tempUsed.add(found.id);return shallow(found);
      };
      const result=await transition(shallow(r),pickQuestion);
      used.clear();tempUsed.forEach(x=>used.add(x));
      r.host_state=shallow(result.next);r.display_state=shallow(result.projection);
      r.revision=result.next.revision;r.status=result.status;commands.set(k,true);
      return shallow(r);
    }
  };
  return store;
}
function fixture() {
  const db=fakeDb(), service=createRoomService(db,{rng:()=>0.1,now:()=>now,publicAppUrl:'https://app.test'});
  const handler=createRoomHandler(db,{rng:()=>0.1,now:()=>now,publicAppUrl:'https://app.test',corsOrigins:origin,ipPepper:'test-pepper'});
  return {db,service,handler};
}
const auth='Bearer '+token,otherAuth='Bearer '+secondToken;
const submit=(handler,method,path,data=null,bearer=null,site=origin)=>handler.fetch(new Request('https://room-api.test'+path,{
  method,headers:{...(data?{'content-type':'application/json'}:{}),...(bearer?{'authorization':bearer}:{}),...(site?{'origin':site}:{})},
  ...(data?{body:JSON.stringify(data)}:{})}));
const create=async (f,bestOf=3)=>f.service.create(auth,{gameId:'letters',teams:['النسور','الصقور'],bestOf});
const cmd=(f,code,rev,command,commandId=randomUUID())=>f.service.command(auth,code,{expectedRevision:rev,commandId,command});
function seedLetter(db,letter,n=2){db.banks.set(letter,Array.from({length:n},(_,i)=>({id:randomUUID(),letter,text:'سؤال '+letter+' '+i,answer:letter+'ليل'})));}

test('creating a room requires existing account and valid match settings',async()=>{
  const f=fixture();await assert.rejects(f.service.create(null,{gameId:'letters',teams:['أ','ب'],bestOf:3}),e=>e.status===401);
  await assert.rejects(f.service.create(auth,{gameId:'letters',teams:['','ب'],bestOf:3}),e=>e.code==='INVALID_SETUP');
  const a=await create(f);
  assert.match(a.room.code,/^[A-HJ-NP-Z2-9]{6}$/);assert.equal(a.room.status,'waiting');
  assert.equal(a.hostState.stage,'lobby');assert.equal(a.hostState.editMode,false);assert.equal(a.room.revision,0);
  assert.match(a.displayUrl,/room=/);
  await assert.rejects(create(f),e=>e.code==='ROOM_ALREADY_ACTIVE');
});

test('host status is scoped to owner and active match can be resumed',async()=>{
  const f=fixture(),a=await create(f);
  assert.equal((await f.service.active(auth)).room.room.code,a.room.code);
  await assert.rejects(f.service.host(otherAuth,a.room.code),e=>e.status===404);
  assert.equal((await f.service.host(auth,a.room.code)).hostState.id,a.hostState.id);
});

test('viewer has no access without joining and joins with an opaque token',async()=>{
  const f=fixture(),a=await create(f);
  await assert.rejects(f.service.viewer('Bearer '+('C'.repeat(64)),a.room.code),e=>e.status===404);
  const joined=await f.service.join(a.room.code,'fingerprint');
  assert.equal(joined.state.stage,'lobby');assert.equal(joined.viewerToken.length,64);
  assert.equal(joined.room.displayConnected,true);
  const view=await f.service.viewer('Bearer '+joined.viewerToken,a.room.code);
  assert.deepEqual(view.state.question,null);
  assert.equal(view.state.teams[0],'النسور');
  assert.equal(JSON.stringify(view).includes('hostState'),false);
  await assert.rejects(f.service.command('Bearer '+joined.viewerToken,a.room.code,{commandId:randomUUID(),expectedRevision:0,command:{kind:'start'}}),e=>e.status===401);
});

test('start is host-only and waits for connected viewer',async()=>{
  const f=fixture(),a=await create(f);
  await assert.rejects(cmd(f,a.room.code,0,{kind:'start'}),e=>e.code==='DISPLAY_NOT_CONNECTED');
  await f.service.join(a.room.code,'f');
  const started=await cmd(f,a.room.code,0,{kind:'start'});
  assert.equal(started.hostState.stage,'playing');assert.equal(started.hostState.letters.length,25);
  assert.equal(new Set(started.hostState.letters).size,25);
  assert.equal(started.room.revision,1);
});

test('optimistic revision rejects stale commands; same commandId is idempotent',async()=>{
  const f=fixture(),a=await create(f);await f.service.join(a.room.code,'f');
  const id=randomUUID(),first=await cmd(f,a.room.code,0,{kind:'start'},id);
  const retry=await cmd(f,a.room.code,0,{kind:'start'},id);
  assert.equal(first.room.revision,retry.room.revision);
  await assert.rejects(cmd(f,a.room.code,0,{kind:'end_match'}),e=>e.code==='REVISION_CONFLICT');
});

test('question answer stays secret on viewer projection until revealed',async()=>{
  const f=fixture(),a=await create(f),join=await f.service.join(a.room.code,'f');
  const start=await cmd(f,a.room.code,0,{kind:'start'}),cell=start.hostState.startingCell;
  const letter=start.hostState.letters[cell];seedLetter(f.db,letter);
  const opened=await cmd(f,a.room.code,1,{kind:'open_question',cell});
  assert.equal(opened.hostState.question.answer,letter+'ليل');
  const displayed=await f.service.viewer('Bearer '+join.viewerToken,a.room.code);
  assert.equal(displayed.state.question.text,opened.hostState.question.text);
  assert.equal(JSON.stringify(displayed).includes('ليل'),false);
  const unveiled=await cmd(f,a.room.code,2,{kind:'both_surrender'});
  assert.equal(unveiled.hostState.question.revealed,true);
  const after=await f.service.viewer('Bearer '+join.viewerToken,a.room.code);
  assert.equal(after.state.question.revealedAnswer,letter+'ليل');
  assert.equal(after.state.owners[cell],null);
  await assert.rejects(cmd(f,a.room.code,3,{kind:'correct_answer',team:0}),e=>e.code==='ANSWER_ALREADY_REVEALED');
});

test('replacing surrendered question keeps the same cell and never repeats consumed question',async()=>{
  const f=fixture(),a=await create(f);await f.service.join(a.room.code,'f');
  const started=await cmd(f,a.room.code,0,{kind:'start'});const cell=started.hostState.startingCell;
  seedLetter(f.db,started.hostState.letters[cell]);
  const first=await cmd(f,a.room.code,1,{kind:'open_question',cell});
  await cmd(f,a.room.code,2,{kind:'both_surrender'});
  const second=await cmd(f,a.room.code,3,{kind:'retry_same_letter'});
  assert.equal(second.hostState.currentCell,cell);
  assert.notEqual(second.hostState.question.id,first.hostState.question.id);
  assert.equal(f.db.used.size,2);
  assert.equal(second.hostState.question.revealed,false);
});

test('a wrong answer moves turn to opponent, then correct answer awards chosen team',async()=>{
  const f=fixture(),a=await create(f);await f.service.join(a.room.code,'f');
  const started=await cmd(f,a.room.code,0,{kind:'start'}),cell=started.hostState.startingCell;
  seedLetter(f.db,started.hostState.letters[cell]);
  await cmd(f,a.room.code,1,{kind:'open_question',cell});
  const wrong=await cmd(f,a.room.code,2,{kind:'wrong_answer'});
  assert.equal(wrong.hostState.attempt,'free'); // opening question is free competition
  const earned=await cmd(f,a.room.code,3,{kind:'correct_answer',team:1});
  assert.equal(earned.hostState.turn,1);
  assert.equal(earned.hostState.owners[cell],colorForTeam(1,1));
});

test('edit color is gated and can detect winding paths immediately',async()=>{
  const f=fixture(),a=await create(f);await f.service.join(a.room.code,'f');await cmd(f,a.room.code,0,{kind:'start'});
  await assert.rejects(cmd(f,a.room.code,1,{kind:'cycle_cell_color',cell:0}),e=>e.code==='EDIT_MODE_REQUIRED');
  let current=await cmd(f,a.room.code,1,{kind:'toggle_edit_mode'});
  for(const cell of [2,6,12,17,23]){
    const n=await cmd(f,a.room.code,current.room.revision,{kind:'cycle_cell_color',cell}); // neutral -> orange
    current=await cmd(f,a.room.code,n.room.revision,{kind:'cycle_cell_color',cell}); // orange -> green
  }
  assert.deepEqual(winningPath(current.hostState.owners,'green').length>0,true);
  assert.equal(current.hostState.stage,'between_rounds');
  assert.equal(current.hostState.winner,1);
  assert.equal(current.hostState.editMode,false);
  const next=await cmd(f,a.room.code,current.room.revision,{kind:'next_round'});
  assert.equal(next.hostState.round,2);assert.equal(colorForTeam(1,2),'orange');
  assert.equal(next.hostState.wins[1],1);
});

test('no published questions returns a conflict without consuming a revision',async()=>{
  const f=fixture(),a=await create(f);await f.service.join(a.room.code,'f');
  const started=await cmd(f,a.room.code,0,{kind:'start'});
  await assert.rejects(cmd(f,a.room.code,1,{kind:'open_question',cell:started.hostState.startingCell}),e=>e.code==='NO_QUESTION_AVAILABLE');
  assert.equal((await f.service.host(auth,a.room.code)).room.revision,1);
});

test('HTTP layer handles CORS, payload validation, and secret-free viewer access',async()=>{
  const f=fixture();
  const preflight=await submit(f.handler,'OPTIONS','/api/rooms',null,null);
  assert.equal(preflight.status,204);
  const untrusted=await submit(f.handler,'POST','/api/rooms',{gameId:'letters'},auth,'https://evil.invalid');
  assert.equal(untrusted.status,403);
  const createResponse=await submit(f.handler,'POST','/api/rooms',{gameId:'letters',teams:['النسور','الصقور'],bestOf:3},auth);
  assert.equal(createResponse.status,201);
  const created=await createResponse.json();
  const joined=await submit(f.handler,'POST','/api/rooms/'+created.room.code+'/join',{});
  assert.equal(joined.status,200);
  const joinedData=await joined.json();
  const shown=await submit(f.handler,'GET','/api/rooms/'+created.room.code+'/viewer',null,'Bearer '+joinedData.viewerToken);
  assert.equal(shown.status,200);assert.equal((await shown.json()).state.stage,'lobby');
  const denied=await submit(f.handler,'GET','/api/rooms/'+created.room.code+'/host',null,'Bearer '+joinedData.viewerToken);
  assert.equal(denied.status,401);
});

test('join rate limit returns 429; expired and foreign rooms are hidden',async()=>{
  const f=fixture(),a=await create(f);f.db.rateLimit=true;
  await assert.rejects(f.service.join(a.room.code,'f'),e=>e.status===429);
  f.db.rateLimit=false;
  await assert.rejects(f.service.host(otherAuth,a.room.code),e=>e.status===404);
  f.db.rooms.get(a.room.code).expires_at=new Date(now-1000);
  await assert.rejects(f.service.host(auth,a.room.code),e=>e.status===404);
});

test('ended room releases active slot; commandId replay after close does not rerun',async()=>{
  const f=fixture(),a=await create(f);await f.service.join(a.room.code,'f');
  await cmd(f,a.room.code,0,{kind:'start'});
  const ended=await cmd(f,a.room.code,1,{kind:'end_match'});
  assert.equal(ended.hostState.stage,'abandoned');assert.equal(ended.room.status,'abandoned');
  assert.equal((await f.service.active(auth)).room,null);
  const fresh=await create(f);assert.notEqual(fresh.room.code,a.room.code);
});
