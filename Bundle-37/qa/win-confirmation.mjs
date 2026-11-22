/**
 * Bundle 37: deterministic, server-authoritative win-confirmation tests.
 * The winning cell MUST NOT reach a viewer before the host explicitly says YES.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {startMatch, publicState, winningPath} from '../backend/rooms/engine.mjs';
import {createRoomService,RoomFailure} from '../backend/rooms/service.mjs';

const now=Date.now();
function setup(bestOf,ownerOverrides,focused,editing=false){
 const id=randomUUID(),userId=randomUUID(),token='Bearer '+'a'.repeat(32);
 let room={
  id,code:'ABC234',game_id:'letters',host_user_id:userId,status:'active',revision:1,
  host_state:{
   ...startMatch(id,['البرتقالي','الأخضر'],bestOf,()=>0.5),
   revision:1,stage:'question',currentCell:focused,focusedCell:focused,
   askedCells:[focused,...Object.keys(ownerOverrides).map(Number)],
   question:{id:randomUUID(),text:'سؤال تجريبي',answer:'أي',letter:'أ',revealed:false},
   editMode:editing,
   owners:Array.from({length:25},(_,i)=>ownerOverrides[i]??null),
  },
  last_viewer_seen_at:new Date(now-1000),created_at:new Date(now),expires_at:new Date(now+3600000)
 };
 const store={
  authenticate:async()=>userId,
  runCommand:async(code,authId,commandId,revision,transition)=>{
   assert.equal(code,room.code);assert.equal(authId,userId);
   if(revision!==room.revision)throw {code:'REVISION_CONFLICT'};
   const result=await transition(room,async()=>null);
   room={...room,host_state:result.next,status:result.status,revision:result.next.revision};
   return room;
  },
 };
 const api=createRoomService(store,{now:()=>now,rng:()=>0.5});
 const cmd=async(command)=>{
  const reply=await api.command(token,'ABC234',{commandId:randomUUID(),expectedRevision:room.revision,command});
  return reply.hostState;
 };
 return {cmd,room:()=>room};
}

assert.equal(winningPath(Array.from({length:25},(_,i)=>i>=10&&i<=14?'orange':null),'orange').length>0,true);
{
 const {cmd}=setup(1,{10:'orange',11:'orange',12:'orange',13:'orange'},14);
 let state=await cmd({kind:'cycle_cell_color',cell:14,requireWinConfirmation:true});
 assert.equal(state.stage,'question','do not end round prematurely');
 assert.equal(state.owners[14],null,'winning orange must remain UNCOMMITTED');
 assert.equal(state.wins[0],0,'do not award a round before confirmation');
 assert.equal(state.pendingWin?.winner,0,'candidate winner matches orange team');
 assert.equal(state.pendingWin?.proposedColor,'orange');
 assert.equal(publicState(state).winner,null);
 assert.equal(publicState(state).owners[14],null);
 assert.ok(!('pendingWin' in publicState(state)),'viewer must not see the modal/pending state');
 await assert.rejects(()=>cmd({kind:'cycle_cell_color',cell:14,requireWinConfirmation:true}),e=>e instanceof RoomFailure&&e.code==='WIN_CONFIRMATION_REQUIRED');
 state=await cmd({kind:'reject_win'});
 assert.equal(state.pendingWin,null);assert.equal(state.owners[14],null);
 assert.equal(state.declinedWin.color,'orange','decline remembers the rejected color');
 state=await cmd({kind:'cycle_cell_color',cell:14,requireWinConfirmation:true});
 assert.equal(state.owners[14],'green','next tap after NO goes straight to green');
 assert.equal(state.stage,'playing');assert.equal(state.wins[0],0);
 state=await cmd({kind:'cycle_cell_color',cell:14,requireWinConfirmation:true});
 assert.equal(state.owners[14],null,'third tap goes neutral');
 state=await cmd({kind:'cycle_cell_color',cell:14,requireWinConfirmation:true});
 assert.equal(state.owners[14],null,'fourth tap prompts orange again without committing');
 assert.equal(state.pendingWin?.proposedColor,'orange');
 state=await cmd({kind:'confirm_win'});
 assert.equal(state.stage,'finished','YES wins the match');
 assert.equal(state.owners[14],'orange');
 assert.equal(state.winner,0);
 assert.equal(state.wins[0],1);
 assert.equal(state.pendingWin,null);
 assert.equal(publicState(state).winner,0,'viewer sees winner only after YES');
}
{
 const {cmd}=setup(3,{10:'orange',11:'orange',12:'orange',13:'orange'},14);
 let state=await cmd({kind:'cycle_cell_color',cell:14,requireWinConfirmation:true});
 assert.equal(state.stage,'question');assert.equal(state.wins[0],0);
 state=await cmd({kind:'confirm_win'});
 assert.equal(state.stage,'between_rounds','YES awards only a ROUND in best-of-3');
 assert.equal(state.wins[0],1);
}
{
 // Existing clients (without the opt-in flag) keep the old protocol during rollout.
 const {cmd}=setup(1,{10:'orange',11:'orange',12:'orange',13:'orange'},14);
 const state=await cmd({kind:'cycle_cell_color',cell:14});
 assert.equal(state.stage,'finished','old client does not become trapped by unsupported popup');
}
{
 // Confirmation also applies to winning CORRECTIONS of previously asked cells.
 const owners={2:'green',7:'green',12:'green',17:'green',22:'orange'};
 const {cmd}=setup(1,owners,14,true);
 let state=await cmd({kind:'cycle_cell_color',cell:22,requireWinConfirmation:true});
 assert.equal(state.pendingWin?.winner,1,'green was about to connect top to bottom');
 assert.equal(state.owners[22],'orange','do not commit corrected winning cell');
 assert.equal(state.stage,'question','current question remains visible');
 state=await cmd({kind:'reject_win'});
 state=await cmd({kind:'cycle_cell_color',cell:22,requireWinConfirmation:true});
 assert.equal(state.owners[22],null,'NO to green => next tap neutral');
 assert.equal(state.stage,'question','editing previous cell must not close current question');
}
console.log('PASS: no premature winner; NO skips candidate; YES confirms; re-prompt on fourth tap; same rule for old-cell correction; old-client protocol compatible.');
