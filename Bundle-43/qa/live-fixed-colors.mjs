/** Bundle 43 real disposable QA room: best-of-3 with fixed team colors and winning confirmation. */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
const auth='https://br-late-math-b9m0r7gn-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech';
const rooms='https://br-late-math-b9m0r7gn-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
async function call(base,path,method='GET',body,token){
  const response=await fetch(base+'/api'+path,{
    method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
    body:body?JSON.stringify(body):undefined
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Error(method+' '+path+' => '+response.status+' '+JSON.stringify(data?.error||data));
  return data;
}
const username='fixedqa'+randomBytes(7).toString('hex');
const password='QA42!'+randomBytes(21).toString('hex');
const account=await call(auth,'/auth/register','POST',{username,password,displayName:'Fixed Colors QA'});
assert.ok(account.token);
const token=account.token;
let room=await call(rooms,'/rooms','POST',{gameId:'letters',teams:['فريق برتقالي دائم','فريق أخضر دائم'],bestOf:3},token);
const code=room.room.code;
const spectator=await call(rooms,'/rooms/'+code+'/join','POST',{});
assert.ok(spectator.viewerToken);
const send=async command=>{
 room=await call(rooms,'/rooms/'+code+'/commands','POST',{commandId:randomUUID(),expectedRevision:room.room.revision,command},token);
 return room.hostState;
};
const view=async()=> (await call(rooms,'/rooms/'+code+'/viewer','GET',undefined,spectator.viewerToken)).state;
let state=await send({kind:'start'});
assert.equal(state.round,1);
for(let round=1;round<=3;round++){
  assert.equal(state.round,round);
  assert.equal(state.stage,'playing');
  assert.deepEqual(state.wins,round===1?[0,0]:round===2?[1,0]:[1,1]);
  // The random first letter is compulsory; color it OPPOSITE the team whose path we're building.
  const expectedWinner=round===2?1:0;
  const winColor=expectedWinner===0?'orange':'green';
  const first=state.startingCell;
  state=await send({kind:'open_question',cell:first});
  state=await send({kind:'cycle_cell_color',cell:first,requireWinConfirmation:true});
  if(winColor==='orange'){
    state=await send({kind:'cycle_cell_color',cell:first,requireWinConfirmation:true});
    assert.equal(state.owners[first],'green');
  }else{
    assert.equal(state.owners[first],'orange');
  }
  // Separate target path from the forced first cell to keep the board deterministic.
  const line=winColor==='orange'
   ? (first<5?[10,11,12,13,14]:[0,1,2,3,4])
   : (first%5===0?[3,8,13,18,23]:[0,5,10,15,20]);
  assert.ok(!line.includes(first));
  for(let i=0;i<line.length;i++){
    const cell=line[i],last=i===line.length-1;
    state=await send({kind:'open_question',cell});
    state=await send({kind:'cycle_cell_color',cell,requireWinConfirmation:true});
    if(winColor==='green'){
      assert.equal(state.pendingWin??null,null,'orange step must not preempt green win');
      state=await send({kind:'cycle_cell_color',cell,requireWinConfirmation:true});
    }
    if(!last){
      assert.equal(state.stage,'playing');
      assert.equal(state.owners[cell],winColor);
      assert.equal(state.pendingWin??null,null);
    }else{
      assert.equal(state.pendingWin?.proposedColor,winColor,'pending win for '+winColor+' round '+round);
      assert.equal(state.pendingWin?.winner,expectedWinner,'winning team index fixed in round '+round);
      const before=await view();
      assert.equal(before.winner,null,'viewer cannot see winner before host confirmation');
      assert.equal(before.owners[cell],null,'winning cell is not committed without confirmation');
      state=await send({kind:'confirm_win'});
      assert.equal(state.winner,expectedWinner,'correct winner for round '+round);
      assert.equal(state.owners[cell],winColor,'same winning color in round '+round);
      assert.deepEqual(state.wins,round===1?[1,0]:round===2?[1,1]:[2,1]);
      assert.equal(state.stage,round===3?'finished':'between_rounds');
      const after=await view();
      assert.equal(after.winner,expectedWinner,'spectator sees confirmed team in round '+round);
      assert.deepEqual(after.wins,state.wins,'scores synchronized with spectator');
      assert.equal(after.owners[cell],winColor,'spectator sees correct permanent winning color');
      assert.equal('pendingWin' in after,false,'private confirmation not leaked to viewer');
    }
  }
  if(round<3)state=await send({kind:'next_round'});
}
console.log('PASS QA: best of 3 with orange team0 winning round 1; GREEN team1 winning round 2; orange team0 final win round 3.');
console.log('PASS QA: win only after confirmation, public room synced, no production user or room touched.');
