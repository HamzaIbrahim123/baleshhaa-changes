/**
 * Bundle 35 QA: full server authorization, question usage & viewer privacy.
 * Creates a disposable test account and room on QA Neon branch ONLY.
 */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
const authBase='https://br-late-math-b9m0r7gn-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech';
const rooms='https://br-late-math-b9m0r7gn-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const invoke=async(base,path,method='GET',data,token)=>{
 const response=await fetch(base+'/api'+path,{
  method,headers:{...(data?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
  body:data?JSON.stringify(data):undefined,
 });
 const json=await response.json().catch(()=>null);
 if(!response.ok)throw Error(method+' '+path+' => '+response.status+' '+JSON.stringify(json?.error||json));
 return json;
};
const username='pilotqa'+randomBytes(6).toString('hex');
const password='QAtest!'+randomBytes(22).toString('hex');
const registration=await invoke(authBase,'/auth/register','POST',{displayName:'Pilot Quiz QA',username,password});
assert.ok(registration.token&&registration.user?.id);
const token=registration.token;
const created=await invoke(rooms,'/rooms','POST',{gameId:'letters',teams:['تجربة أول','تجربة ثاني'],bestOf:3},token);
const code=created.room.code;
assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
const join=await invoke(rooms,'/rooms/'+code+'/join','POST',{});
assert.ok(join.viewerToken);
let live=await invoke(rooms,'/rooms/'+code+'/host','GET',undefined,token);
let remaining=await invoke(rooms,'/rooms/'+code+'/counts','GET',undefined,token);
assert.equal(Object.keys(remaining.counts).length,28);
assert.equal(Object.values(remaining.counts).reduce((a,b)=>a+b,0),280);
const unauth=await fetch(rooms+'/api/rooms/'+code+'/counts');
assert.equal(unauth.status,401,'Question inventory must be host-only');
const command=async(value)=>{
 live=await invoke(rooms,'/rooms/'+code+'/commands','POST',
  {commandId:randomUUID(),expectedRevision:live.room.revision,command:value},token);
 return live.hostState;
};
let state=await command({kind:'start'});
assert.equal(state.stage,'playing');
const first=state.startingCell,letter=state.letters[first];
state=await command({kind:'open_question',cell:first});
assert.equal(state.stage,'question');assert.equal(state.askedCells.length,1);
const id=state.question.id,answer=state.question.answer;
assert.ok(answer&&answer.startsWith(letter),'Question answer starts with selected letter');
let viewer=await invoke(rooms,'/rooms/'+code+'/viewer','GET',undefined,join.viewerToken);
assert.equal(viewer.state.question?.text,state.question.text);
assert.equal('revealedAnswer' in viewer.state.question,false);
assert.equal(JSON.stringify(viewer).includes(answer),false,'Unrevealed answer must never reach viewer');
remaining=await invoke(rooms,'/rooms/'+code+'/counts','GET',undefined,token);
assert.equal(remaining.counts[letter],9,'Question count decreased only after opening');
state=await command({kind:'cycle_cell_color',cell:first});assert.equal(state.owners[first],'orange');
state=await command({kind:'cycle_cell_color',cell:first});assert.equal(state.owners[first],'green');
state=await command({kind:'cycle_cell_color',cell:first});assert.equal(state.owners[first],null);
state=await command({kind:'cycle_cell_color',cell:first});assert.equal(state.owners[first],'orange');
assert.equal(state.askedCells.length,1,'No reopened question after color-cycle');
const second=(first+1)%25;
state=await command({kind:'open_question',cell:second});
assert.equal(state.question.letter,state.letters[second]);
state=await command({kind:'toggle_edit_mode'});assert.equal(state.editMode,true);
const oldQuestion=state.question.id;
state=await command({kind:'cycle_cell_color',cell:first});
assert.equal(state.question.id,oldQuestion,'Previous cell edit preserves current question');
state=await command({kind:'toggle_edit_mode'});
state=await command({kind:'both_surrender'});
viewer=await invoke(rooms,'/rooms/'+code+'/viewer','GET',undefined,join.viewerToken);
assert.equal(viewer.state.question.revealedAnswer,state.question.answer);
state=await command({kind:'retry_same_letter'});
assert.notEqual(state.question.id,oldQuestion,'New question chosen for surrendered cell');
viewer=await invoke(rooms,'/rooms/'+code+'/viewer','GET',undefined,join.viewerToken);
assert.equal('revealedAnswer' in viewer.state.question,false);
state=await command({kind:'cycle_cell_color',cell:second});
assert.equal(state.owners[second],'orange');
state=await command({kind:'end_match'});assert.equal(state.stage,'abandoned');
console.log('PASS: QA real room, 280 pilot inventory, per-user decrement, question-once cycling, correction, surrender/retry, and private viewer projection.');
console.log('No production data used; disposable QA user and QA room only.');
