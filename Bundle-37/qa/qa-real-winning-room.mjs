/** Bundle 37 QA: real two-client win confirmation and decline flow, QA branch only. */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';

const authBase='https://br-late-math-b9m0r7gn-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech';
const rooms='https://br-late-math-b9m0r7gn-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const request=async(base,path,method='GET',data,token)=>{
 const response=await fetch(base+'/api'+path,{
  method,headers:{...(data?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
  body:data?JSON.stringify(data):undefined
 });
 const json=await response.json().catch(()=>null);
 if(!response.ok)throw Error(method+' '+path+' '+response.status+' '+JSON.stringify(json?.error||json));
 return json;
};
const username='winnerqa'+randomBytes(6).toString('hex');
const password='QA!'+randomBytes(22).toString('hex');
const registered=await request(authBase,'/auth/register','POST',{username,password,displayName:'Win Confirmation QA'});
assert.ok(registered?.token,'QA account registration failed');
const token=registered.token;
const created=await request(rooms,'/rooms','POST',{gameId:'letters',teams:['برتقالي','أخضر'],bestOf:1},token);
const code=created.room.code;
const spectator=await request(rooms,'/rooms/'+code+'/join','POST',{});
assert.ok(spectator.viewerToken);
let live=await request(rooms,'/rooms/'+code+'/host','GET',undefined,token);
const cmd=async(command)=>{
 live=await request(rooms,'/rooms/'+code+'/commands','POST',
  {commandId:randomUUID(),expectedRevision:live.room.revision,command},token);
 return live.hostState;
};
const view=async()=>request(rooms,'/rooms/'+code+'/viewer','GET',undefined,spectator.viewerToken);
let state=await cmd({kind:'start'});
let first=state.startingCell;
state=await cmd({kind:'open_question',cell:first});
state=await cmd({kind:'cycle_cell_color',cell:first,requireWinConfirmation:true});
assert.equal(state.owners[first],'orange');
state=await cmd({kind:'cycle_cell_color',cell:first,requireWinConfirmation:true});
assert.equal(state.owners[first],'green');
const row=(first<5)?[10,11,12,13,14]:[0,1,2,3,4];
assert.ok(!row.includes(first));
for(const cell of row.slice(0,4)){
 state=await cmd({kind:'open_question',cell});
 state=await cmd({kind:'cycle_cell_color',cell,requireWinConfirmation:true});
 assert.equal(state.owners[cell],'orange');
 assert.equal(state.pendingWin??null,null);
}
const last=row[4];
state=await cmd({kind:'open_question',cell:last});
state=await cmd({kind:'cycle_cell_color',cell:last,requireWinConfirmation:true});
assert.equal(state.pendingWin?.proposedColor,'orange');
assert.equal(state.pendingWin?.winner,0);
assert.equal(state.owners[last],null,'winning color is not committed before confirmation');
assert.equal(state.stage,'question','do not finish until confirmation');
let display=await view();
assert.equal(display.state.owners[last],null);
assert.equal(display.state.wins[0],0);
assert.equal(display.state.winner,null);
assert.equal('pendingWin' in display.state,false,'spectator must not receive host-only confirmation');
state=await cmd({kind:'reject_win'});
assert.equal(state.owners[last],null);
state=await cmd({kind:'cycle_cell_color',cell:last,requireWinConfirmation:true});
assert.equal(state.owners[last],'green','after rejecting orange, click must go directly green');
assert.equal(state.stage,'playing');
state=await cmd({kind:'cycle_cell_color',cell:last,requireWinConfirmation:true});
assert.equal(state.owners[last],null);
state=await cmd({kind:'cycle_cell_color',cell:last,requireWinConfirmation:true});
assert.equal(state.pendingWin?.proposedColor,'orange','fourth click reconfirms orange');
state=await cmd({kind:'confirm_win'});
assert.equal(state.stage,'finished');
assert.equal(state.winner,0);
display=await view();
assert.equal(display.state.stage,'finished');
assert.equal(display.state.winner,0);
assert.equal(display.state.owners[last],'orange');
console.log('PASS: QA Neon room win stayed uncommitted before YES; NO skipped orange; green/neutral/reprompt; spectator receives winner only after YES.');
console.log('QA account and room only; production data untouched.');
