/** Bundle 39: real QA API smoke without touching main. */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
const auth='https://br-late-math-b9m0r7gn-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech';
const rooms='https://br-late-math-b9m0r7gn-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const call=async(base,path,method='GET',data,token)=>{
 const res=await fetch(base+'/api'+path,{method,
  headers:{...(data?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
  body:data?JSON.stringify(data):undefined});
 const json=await res.json().catch(()=>null);
 if(!res.ok)throw Error(method+' '+path+' => '+res.status+' '+JSON.stringify(json?.error||json));
 return json;
};
const user='moreqa'+randomBytes(7).toString('hex'),password='QA!'+randomBytes(24).toString('hex');
const acct=await call(auth,'/auth/register','POST',{username:user,password,displayName:'Content Inventory QA'});
assert.ok(acct.token);
const token=acct.token;
let room=await call(rooms,'/rooms','POST',{gameId:'letters',teams:['البرتقالي','الأخضر'],bestOf:1},token);
const code=room.room.code;
const join=await call(rooms,'/rooms/'+code+'/join','POST',{});
assert.ok(join.viewerToken);
const counts=await call(rooms,'/rooms/'+code+'/counts','GET',undefined,token);
assert.equal(Object.keys(counts.counts).length,28);
assert.equal(Object.values(counts.counts).reduce((a,b)=>a+b,0),2209);
assert.ok(Object.values(counts.counts).every(n=>n>=73&&n<=80));
const command=async(cmd)=>{
 room=await call(rooms,'/rooms/'+code+'/commands','POST',{commandId:randomUUID(),
  expectedRevision:room.room.revision,command:cmd},token);return room.hostState;
};
let state=await command({kind:'start'});
const cell=state.startingCell,letter=state.letters[cell];
state=await command({kind:'open_question',cell});
assert.equal(state.question.letter,letter);
const clean=s=>s.normalize('NFKC').trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[اإآٱأ]/g,'أ');
assert.equal(clean(state.question.answer)[0],clean(letter)[0]);
let display=await call(rooms,'/rooms/'+code+'/viewer','GET',undefined,join.viewerToken);
assert.equal(display.state.question.text,state.question.text);
assert.equal('revealedAnswer' in display.state.question,false);
const updated=await call(rooms,'/rooms/'+code+'/counts','GET',undefined,token);
assert.equal(updated.counts[letter],counts.counts[letter]-1,'question count must decrement after first reveal to host');
const firstId=state.question.id;
state=await command({kind:'both_surrender'});
display=await call(rooms,'/rooms/'+code+'/viewer','GET',undefined,join.viewerToken);
assert.equal(display.state.question.revealedAnswer,state.question.answer);
state=await command({kind:'retry_same_letter'});
assert.notEqual(state.question.id,firstId);
const updatedAgain=await call(rooms,'/rooms/'+code+'/counts','GET',undefined,token);
assert.equal(updatedAgain.counts[letter],counts.counts[letter]-2,'retry consumes another previously unseen question');
state=await command({kind:'end_match'});
assert.equal(state.stage,'abandoned');
console.log('PASS: 2209 total questions (73–80 per letter); host-specific counters, unique random question retry and private spectator answers.');
console.log('Used QA branch, isolated disposable user, no production changes.');
