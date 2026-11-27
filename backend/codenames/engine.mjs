/** Code Names V1 — server-only deterministic rules. No networking or database access.
 * Caller must authenticate actor, lock room, reconcile presence, validate revision,
 * run command and persist atomically. Never send this private state to a browser.
 */
import { randomInt } from 'node:crypto';
export const TEAMS = ['red','blue'];
export const SLOTS = ['red:leader','red:guesser','blue:leader','blue:guesser'];
export const TIME = Object.freeze({firstClue:180000,clue:90000,guess:120000});
export class RuleError extends Error { constructor(code){super(code);this.name='RuleError';this.code=code;} }
function ok(condition,code){if(!condition)throw new RuleError(code);}
const other=t=>t==='red'?'blue':'red';
const clone=structuredClone;
const normalize=s=>s.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/gu,'').replace(/[أإآٱ]/gu,'ا').replace(/ى/gu,'ي').replace(/\s+/gu,' ').trim();
export function wordKey(s){return typeof s==='string'?normalize(s):'';}
function shuffled(a,rng){const out=[...a];for(let i=out.length-1;i>0;i--){const j=rng(i+1);ok(Number.isInteger(j)&&j>=0&&j<=i,'INVALID_RNG');[out[i],out[j]]=[out[j],out[i]];}return out;}
function validTime(now){ok(Number.isSafeInteger(now)&&now>=0,'INVALID_TIME');}
function publicName(name){ok(typeof name==='string'&&name.trim().length>0&&name.trim().length<=45,'INVALID_NAME');return name.trim();}
export function createRoom({hostId,hostName,timed},now){validTime(now);ok(typeof hostId==='string'&&hostId.length>0&&typeof timed==='boolean','INVALID_SETUP');return {version:1,revision:0,hostId,timed,phase:'lobby',players:[{id:hostId,name:publicName(hostName),slot:null,connected:true}],round:0,starter:null,turn:null,board:[],marks:[],score:{red:0,blue:0},cluesGiven:{red:0,blue:0},clue:null,history:[],winner:null,reason:null,deadline:null,paused:false,pausedRemaining:null,previousWords:[],lastReveal:null};}
function player(s,id){const p=s.players.find(p=>p.id===id);ok(p,'NOT_MEMBER');return p;}
function bySlot(s,slot){return s.players.find(p=>p.slot===slot);}
function seated(s){return s.players.length===4&&SLOTS.every(slot=>!!bySlot(s,slot));}
function ready(s){return seated(s)&&s.players.every(p=>p.connected);}
function setDeadline(s,now,duration){s.deadline=s.timed?now+duration:null;}
function openClue(s,team,now){s.phase='clue';s.turn=team;s.clue=null;s.marks=[];setDeadline(s,now,s.cluesGiven[team]===0?TIME.firstClue:TIME.clue);}
function finishHistory(s,reason){const h=s.history.at(-1);if(s.clue&&h&&h.endReason===null)h.endReason=reason;}
function endTurn(s,reason,now){finishHistory(s,reason);openClue(s,other(s.turn),now);}
function win(s,team,reason){finishHistory(s,reason);s.phase='result';s.winner=team;s.reason=reason;s.score[team]++;s.marks=[];s.deadline=null;s.paused=false;s.pausedRemaining=null;}
function startRound(s,words,now,rng,allowDisconnected=false){ok(allowDisconnected?seated(s):ready(s),'FOUR_READY_REQUIRED');ok(Array.isArray(words),'WORD_POOL_REQUIRED');const pool=new Map();for(const raw of words){const key=wordKey(raw);if(key&&typeof raw==='string'&&raw.trim().length<=60&&!pool.has(key))pool.set(key,raw.trim());}ok(pool.size>=25,'NOT_ENOUGH_UNIQUE_WORDS');const prev=new Set(s.previousWords);const fresh=shuffled([...pool].filter(([k])=>!prev.has(k)),rng);const repeat=shuffled([...pool].filter(([k])=>prev.has(k)),rng);const selected=shuffled([...fresh,...repeat].slice(0,25),rng);s.starter=s.round===0?TEAMS[rng(2)]:other(s.starter);ok(TEAMS.includes(s.starter),'INVALID_RNG');const colors=shuffled([...Array(9).fill(s.starter),...Array(8).fill(other(s.starter)),...Array(7).fill('neutral'),'assassin'],rng);s.round++;s.board=selected.map(([key,word],id)=>({id,word,key,color:colors[id],revealed:false}));s.previousWords=selected.map(([k])=>k);s.cluesGiven={red:0,blue:0};s.history=[];s.winner=null;s.reason=null;s.lastReveal=null;s.paused=false;s.pausedRemaining=null;openClue(s,s.starter,now);if(!ready(s)){s.paused=true;s.pausedRemaining=s.deadline===null?null:Math.max(0,s.deadline-now);s.deadline=null;}}
function canAct(s,p,role){ok(!s.paused,'ROOM_PAUSED');ok(p.connected,'NOT_CONNECTED');ok(p.slot===`${s.turn}:${role}`,'WRONG_ROLE_OR_TURN');}
function tile(s,id){ok(Number.isInteger(id)&&id>=0&&id<25,'INVALID_CARD');const c=s.board[id];ok(c&&!c.revealed,'CARD_UNAVAILABLE');return c;}
function clueText(s,text){ok(typeof text==='string','INVALID_CLUE');const c=text.normalize('NFKC').trim();ok(c.length>0&&c.length<=40&&/^[\p{L}\p{M}]+$/u.test(c),'CLUE_ONE_WORD');const k=wordKey(c);ok(!s.board.some(t=>!t.revealed&&t.key.split(' ').includes(k)),'CLUE_ON_BOARD');return c;}
/** Server-clock maintenance. Presence caller supplies authoritative connection states.
 * Reconciliation is performed before commands. Both timed phases wait for an
 * explicit cut by the opposing leader. A late clue is rejected; guessing stays
 * available until the opposing leader cuts (existing guess rule).
 */
export function reconcile(state,{now,connections}={}){validTime(now);const s=clone(state);let changed=false;if(connections){for(const p of s.players){if(Object.hasOwn(connections,p.id)&&typeof connections[p.id]==='boolean'&&p.connected!==connections[p.id]){p.connected=connections[p.id];changed=true;}}}
 if(['clue','guess'].includes(s.phase)){const disconnected=!s.players.every(p=>p.connected);if(disconnected&&!s.paused){s.paused=true;s.pausedRemaining=s.deadline===null?null:Math.max(0,s.deadline-now);s.deadline=null;changed=true;}else if(!disconnected&&s.paused){s.paused=false;s.deadline=s.pausedRemaining===null?null:now+s.pausedRemaining;s.pausedRemaining=null;changed=true;}}
 if(changed)s.revision++;return s;}
/** Pure transition. Actor IDs must come from verified server credentials. */
export function command(state,actorId,cmd,{now,words=[],rng=randomInt}={}){validTime(now);ok(cmd&&typeof cmd.kind==='string','INVALID_COMMAND');const s=clone(state);const p=player(s,actorId),host=actorId===s.hostId;ok(s.phase!=='closed','ROOM_CLOSED');ok(cmd.kind==='end_game'||p.connected,'NOT_CONNECTED');
 // The persistence layer must commit reconcile separately even when a move is rejected.
 // Expiration does not mutate the turn until a valid opposing-leader cut.
 switch(cmd.kind){
 case 'select_slot':ok(s.phase==='lobby','LOBBY_ONLY');ok(SLOTS.includes(cmd.slot),'INVALID_SLOT');ok(!bySlot(s,cmd.slot)||p.slot===cmd.slot,'SLOT_TAKEN');p.slot=cmd.slot;break;
 case 'remove_player':ok(host&&s.phase==='lobby','HOST_LOBBY_ONLY');ok(cmd.playerId!==s.hostId,'CANNOT_REMOVE_HOST');player(s,cmd.playerId);s.players=s.players.filter(p=>p.id!==cmd.playerId);break;
 case 'start':ok(host&&s.phase==='lobby','HOST_LOBBY_ONLY');startRound(s,words,now,rng);break;
 case 'next_round':ok(host&&s.phase==='result','HOST_RESULT_ONLY');startRound(s,words,now,rng,true);break;
 case 'end_game':ok(host,'HOST_ONLY');s.phase='closed';s.deadline=null;s.paused=false;s.pausedRemaining=null;s.marks=[];break;
 case 'give_clue':{ok(s.phase==='clue','CLUE_PHASE_ONLY');canAct(s,p,'leader');ok(!s.timed||s.deadline===null||now<s.deadline,'CLUE_TIME_EXPIRED');const text=clueText(s,cmd.text);ok(cmd.count==='infinity'||Number.isInteger(cmd.count)&&cmd.count>=1&&cmd.count<=8,'INVALID_CLUE_COUNT');s.cluesGiven[s.turn]++;s.clue={text,count:cmd.count,attempts:0};s.history.push({team:s.turn,leader:p.name,guesser:bySlot(s,`${s.turn}:guesser`).name,text,count:cmd.count,guesses:[],endReason:null});s.phase='guess';s.marks=[];setDeadline(s,now,TIME.guess);break;}
 case 'toggle_mark':{ok(s.phase==='guess','GUESS_PHASE_ONLY');canAct(s,p,'guesser');tile(s,cmd.cardId);s.marks=s.marks.includes(cmd.cardId)?s.marks.filter(id=>id!==cmd.cardId):[...s.marks,cmd.cardId];break;}
 case 'confirm_guess':{ok(s.phase==='guess','GUESS_PHASE_ONLY');canAct(s,p,'guesser');const c=tile(s,cmd.cardId);ok(s.marks.includes(c.id),'MARK_FIRST');const team=s.turn;c.revealed=true;s.marks=s.marks.filter(id=>id!==c.id);s.clue.attempts++;const outcome=c.color===team?'correct':c.color==='assassin'?'assassin':c.color==='neutral'?'neutral':'opponent';s.history.at(-1).guesses.push({cardId:c.id,word:c.word,color:c.color,outcome});s.lastReveal={round:s.round,cardId:c.id,color:c.color,outcome,revision:s.revision+1};if(c.color==='assassin'){win(s,other(team),'assassin');break;}if(TEAMS.includes(c.color)&&s.board.every(t=>t.color!==c.color||t.revealed)){win(s,c.color,'all_words');break;}if(outcome!=='correct'){endTurn(s,outcome,now);break;}if(s.clue.count!=='infinity'&&s.clue.attempts>=s.clue.count+1)endTurn(s,'guess_limit',now);break;}
 case 'skip':ok(s.phase==='guess','GUESS_PHASE_ONLY');canAct(s,p,'guesser');endTurn(s,'skip',now);break;
 case 'cut_turn':{ok(['clue','guess'].includes(s.phase)&&!s.paused&&s.timed&&s.deadline!==null&&now>=s.deadline,'CUT_NOT_AVAILABLE');ok(p.slot===`${other(s.turn)}:leader`,'OPPONENT_LEADER_ONLY');if(s.phase==='clue'){s.cluesGiven[s.turn]++;s.history.push({team:s.turn,leader:bySlot(s,`${s.turn}:leader`).name,guesser:bySlot(s,`${s.turn}:guesser`).name,text:null,count:null,guesses:[],endReason:'clue_timeout'});openClue(s,other(s.turn),now);}else endTurn(s,'opponent_timeout',now);break;}
 default:throw new RuleError('UNKNOWN_COMMAND');}
 s.revision++;return s;}
export function join(state,{id,name},now){validTime(now);ok(state.phase==='lobby','LOBBY_ONLY');ok(typeof id==='string'&&id.length>0,'INVALID_ID');ok(!state.players.some(p=>p.id===id),'ALREADY_MEMBER');ok(state.players.length<4,'ROOM_FULL');const s=clone(state);s.players.push({id,name:publicName(name),slot:null,connected:true});s.revision++;return s;}
/** Explicit allowlist. Never serialize raw board, previousWords, tokens or private state. */
export function project(state,actorId,now){validTime(now);const p=player(state,actorId),leader=p.slot?.endsWith(':leader'),revealAll=state.phase==='result';return {version:state.version,revision:state.revision,timed:state.timed,phase:state.phase,round:state.round,starter:state.starter,turn:state.turn,players:state.players.map(x=>({id:x.id,name:x.name,slot:x.slot,connected:x.connected,isHost:x.id===state.hostId})),you:{id:p.id,slot:p.slot,isHost:p.id===state.hostId},board:state.board.map(c=>({id:c.id,word:c.word,revealed:c.revealed,...(leader||revealAll||c.revealed?{color:c.color}:{})})),marks:[...state.marks],score:{...state.score},remaining:Object.fromEntries(TEAMS.map(t=>[t,state.board.filter(c=>c.color===t&&!c.revealed).length])),clue:clone(state.clue),history:clone(state.history),winner:state.winner,reason:state.reason,deadline:state.deadline,serverNow:now,paused:state.paused,pausedRemaining:state.pausedRemaining,lastReveal:clone(state.lastReveal),canCut:['clue','guess'].includes(state.phase)&&!state.paused&&state.timed&&state.deadline!==null&&now>=state.deadline&&p.slot===`${other(state.turn)}:leader`};}
