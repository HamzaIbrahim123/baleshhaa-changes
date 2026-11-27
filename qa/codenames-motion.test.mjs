// Run after compiling gameEvents.ts: CN_EVENTS_JS=/tmp/cn-events/gameEvents.js node --test qa/codenames-motion.test.mjs
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createRoom,join,command,project,SLOTS} from '../backend/codenames/engine.mjs';
const code=readFileSync(process.env.CN_EVENTS_JS||'/tmp/cn-events/gameEvents.js','utf8');
const {gameEvents,clueIdentity,REVEAL_MS,VICTORY_MS}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const words=Array.from({length:100},(_,i)=>'word'+i);const now=1000000;
function setup(){let s=createRoom({hostId:'p0',hostName:'Host',timed:false},now);for(let i=1;i<4;i++)s=join(s,{id:'p'+i,name:'Player '+i},now);for(let i=0;i<4;i++)s=command(s,'p'+i,{kind:'select_slot',slot:SLOTS[i]},{now});return command(s,'p0',{kind:'start'},{now,words})}
const actor=(s,role)=>s.players.find(p=>p.slot===s.turn+':'+role).id;
const p=(s,i=0)=>project(s,'p'+i,now);
const clue=s=>command(s,actor(s,'leader'),{kind:'give_clue',text:'space',count:'infinity'},{now});
const mark=(s,c)=>command(s,actor(s,'guesser'),{kind:'toggle_mark',cardId:c.id},{now});
const guess=(s,c)=>command(s,actor(s,'guesser'),{kind:'confirm_guess',cardId:c.id},{now});
const noEvents=e=>assert.deepEqual(e,{reveal:null,clue:false,turn:false,victory:false,mark:false});
test('initial state, repeated revision and stale state never replay',()=>{const a=setup(),b=clue(a);noEvents(gameEvents(null,p(b)));noEvents(gameEvents(p(b),p(b)));noEvents(gameEvents(p(b),p(a)))});
test('one public clue event for every role, not every polling revision',()=>{const a=setup(),b=clue(a);for(let i=0;i<4;i++){assert.equal(gameEvents(p(a,i),p(b,i)).clue,true);noEvents(gameEvents(p(b,i),p(b,i)));assert.equal(clueIdentity(p(b,i)),clueIdentity(p(b,0)))}});
test('public mark is not a reveal',()=>{const a=clue(setup()),c=a.board.find(c=>c.color===a.turn),b=mark(a,c);for(let i=0;i<4;i++){const e=gameEvents(p(a,i),p(b,i));assert(e.mark);assert.equal(e.reveal,null)}});
test('all four outcomes are authoritative and common to four roles',()=>{for(const outcome of ['correct','opponent','neutral','assassin']){const a=clue(setup());const color=outcome==='correct'?a.turn:outcome==='opponent'?(a.turn==='red'?'blue':'red'):outcome;const c=a.board.find(c=>c.color===color),b=mark(a,c),d=guess(b,c);for(let i=0;i<4;i++){const e=gameEvents(p(b,i),p(d,i));assert.equal(e.reveal?.outcome,outcome);assert.equal(e.reveal?.cardId,c.id);assert.equal(e.victory,outcome==='assassin');assert.equal(e.turn,outcome==='opponent'||outcome==='neutral');noEvents(gameEvents(p(d,i),p(d,i)))}}});
test('reconnect with existing result never replays victory',()=>{const a=clue(setup()),c=a.board.find(c=>c.color==='assassin'),b=guess(mark(a,c),c);noEvents(gameEvents(null,p(b)));noEvents(gameEvents(p(b),p(b)))});
test('new round does not replay last round effects',()=>{const a=clue(setup()),c=a.board.find(c=>c.color==='assassin'),b=guess(mark(a,c),c),d=command(b,'p0',{kind:'next_round'},{now,words});noEvents(gameEvents(p(b),p(d)))});
test('a missed mark still allows the confirmed reveal; no guessed hidden colors',()=>{const a=clue(setup()),c=a.board.find(c=>c.color===a.turn),b=guess(mark(a,c),c);const index=a.players.findIndex(p=>p.slot.endsWith(':guesser'));const before=p(a,index);assert(before.board.every(c=>!('color'in c)));assert.equal(gameEvents(before,p(b,index)).reveal?.color,c.color);assert.equal(before.board.filter(c=>c.revealed).length,0)});
test('timing and animations stay bounded',()=>{assert.equal(REVEAL_MS,1650);assert.equal(VICTORY_MS,2350)});

test('last correct card yields one final reveal and victory for all roles',()=>{let s=clue(setup());const team=s.turn;const cards=s.board.filter(c=>c.color===team);for(const card of cards){const old=mark(s,card);s=guess(old,card);for(let i=0;i<4;i++){const e=gameEvents(p(old,i),p(s,i));assert.equal(e.reveal?.cardId,card.id);assert.equal(e.victory,card===cards.at(-1));noEvents(gameEvents(p(s,i),p(s,i)))}}assert.equal(s.winner,team);assert.equal(s.reason,'all_words')});
