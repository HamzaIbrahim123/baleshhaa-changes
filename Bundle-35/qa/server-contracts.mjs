/**
 * Bundle 35 — deterministic room-service tests; ZERO database/network I/O.
 * Server commands must enforce the one-time-question and color-cycle rules.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {startMatch,publicState,teamForColor} from '../backend/rooms/engine.mjs';
import {createRoomService,RoomFailure} from '../backend/rooms/service.mjs';

const timestamp=Date.now();
const userId=randomUUID(), roomId=randomUUID();
const now=()=>timestamp;
let room={
 id:roomId,code:'ABC234',game_id:'letters',host_user_id:userId,status:'waiting',
 revision:0,host_state:{
  ...startMatch(roomId,['الأول','الثاني'],3,()=>0.5),stage:'lobby',revision:0,
  editMode:false,askedCells:[],focusedCell:null,
 },
 last_viewer_seen_at:new Date(timestamp-1000),created_at:new Date(timestamp),
 expires_at:new Date(timestamp+86400000),
};
let questionSeq=0,questionPicks=0;
const counts={'أ':10,'ب':10};
const pickQuestion=async(letter)=>{questionPicks++;return {id:randomUUID(),text:'سؤال حرف '+letter,answer:letter+'جابة',letter};};
const store={
 authenticate:async()=>userId,
 byHost:async(code,id)=>code===room.code&&id===userId?room:null,
 questionCounts:async(id)=>{assert.equal(id,userId);return counts;},
 runCommand:async(code,id,commandId,expectedRevision,transition)=>{
  assert.equal(code,room.code);assert.equal(id,userId);
  assert.equal(expectedRevision,room.revision);
  const result=await transition(room,pickQuestion);
  room={...room,host_state:result.next,status:result.status,revision:result.next.revision};
  return room;
 },
};
const api=createRoomService(store,{now,rng:()=>0.5,publicAppUrl:'https://baleshhaa.figma.site'});
const token='Bearer '+'a'.repeat(32);
const run=async(command)=>{
 const reply=await api.command(token,'ABC234',{commandId:randomUUID(),expectedRevision:room.revision,command});
 return reply.hostState;
};
const expectReject=async(cmd,code)=>{
 await assert.rejects(()=>run(cmd),(err)=>err instanceof RoomFailure&&err.code===code);
};
const count=await api.counts(token,'ABC234');
assert.equal(count.counts['أ'],10);
assert.equal(count.roomCode,'ABC234');
let s=await run({kind:'start'});
assert.equal(s.stage,'playing');assert.deepEqual(s.askedCells,[]);assert.equal(s.focusedCell,null);
const first=s.startingCell;
await expectReject({kind:'open_question',cell:(first+1)%25},'STARTING_CELL_REQUIRED');
s=await run({kind:'open_question',cell:first});
assert.equal(s.stage,'question');assert.deepEqual(s.askedCells,[first]);assert.equal(s.focusedCell,first);
assert.equal(questionPicks,1);assert.equal(publicState(s).question.revealedAnswer,undefined);
await expectReject({kind:'open_question',cell:(first+1)%25},'CELL_UNAVAILABLE');
s=await run({kind:'cycle_cell_color',cell:first});
assert.equal(s.owners[first],'orange');assert.equal(s.stage,'playing');assert.equal(s.question,null);
s=await run({kind:'cycle_cell_color',cell:first});
assert.equal(s.owners[first],'green');
s=await run({kind:'cycle_cell_color',cell:first});
assert.equal(s.owners[first],null);
await expectReject({kind:'open_question',cell:(first+1)%25},'FOCUSED_CELL_UNASSIGNED');
s=await run({kind:'cycle_cell_color',cell:first});
assert.equal(s.owners[first],'orange');assert.equal(s.stage,'playing');
assert.equal(questionPicks,1,'Question must not repeat after neutral cycle');
await expectReject({kind:'open_question',cell:first},'CELL_UNAVAILABLE');
const second=(first+1)%25;
s=await run({kind:'open_question',cell:second});
assert.equal(s.stage,'question');assert.deepEqual(s.askedCells,[first,second]);
assert.equal(questionPicks,2);
await expectReject({kind:'cycle_cell_color',cell:first},'CELL_UNAVAILABLE');
s=await run({kind:'toggle_edit_mode'});
assert.equal(s.editMode,true);
await expectReject({kind:'cycle_cell_color',cell:second},'CELL_UNAVAILABLE');
const questionId=s.question.id;
s=await run({kind:'cycle_cell_color',cell:first});
assert.equal(s.owners[first],'green');assert.equal(s.question.id,questionId);
assert.equal(s.stage,'question','Correcting old cell must preserve active question');
s=await run({kind:'toggle_edit_mode'});
assert.equal(s.editMode,false);
s=await run({kind:'both_surrender'});
assert.equal(publicState(s).question.revealedAnswer,s.question.answer);
await expectReject({kind:'cycle_cell_color',cell:second},'RETRY_REQUIRED');
s=await run({kind:'retry_same_letter'});
assert.notEqual(s.question.id,questionId);
assert.equal(publicState(s).question.revealedAnswer,undefined);
assert.equal(questionPicks,3);
s=await run({kind:'cycle_cell_color',cell:second});
assert.equal(s.stage,'playing');assert.equal(s.question,null);assert.equal(s.owners[second],'orange');
assert.equal(s.turn,teamForColor('orange',s.round));
await expectReject({kind:'wrong_answer'},'OLD_COMMAND_DISABLED');
await expectReject({kind:'correct_answer',team:0},'OLD_COMMAND_DISABLED');
console.log('PASS: one question per cell, neutral lock, correction, surrender/retry, privacy, host-only counts and legacy lockdown.');
