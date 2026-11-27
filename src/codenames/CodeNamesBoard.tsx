import {useEffect,useMemo,useState,type FormEvent} from 'react';
import ClueFlash from './ClueFlash';
import {useGameMotion,RevealLayer,VictoryLayer,TurnFlash} from './GameMotion';
import type {GameSound} from './gameSound';
import './motion.css';
import type {RoomState,Command,Team,BoardCard,ClueCount} from './client';
import './board.css';
const teamName=(t:Team|null)=>t==='red'?'الأحمر':t==='blue'?'الأزرق':'—';
const countText=(n:ClueCount|null)=>n==='infinity'?'∞':n??'—';
const colorText={red:'أحمر',blue:'أزرق',neutral:'محايد',assassin:'أسود'};
const outcomeText={correct:'صحيح',opponent:'كلمة الخصم',neutral:'محايدة',assassin:'البطاقة السوداء'};
const endText:Record<string,string>={clue_timeout:'انتهى وقت التلميح',guess_limit:'اكتمل عدد التخمينات',skip:'أنهى المخمّن دوره',opponent_timeout:'أنهى قائد الخصم الدور',neutral:'بطاقة محايدة',opponent:'كلمة الخصم'};
function useTime(s:RoomState){
 const base=useMemo(()=>performance.now(),[s.serverNow]);
 const [now,setNow]=useState(()=>performance.now());
 useEffect(()=>{setNow(performance.now());if(!s.timed||s.deadline===null||s.paused)return;const i=window.setInterval(()=>setNow(performance.now()),250);return()=>window.clearInterval(i)},[base,s.deadline,s.paused,s.timed]);
 return s.paused?s.pausedRemaining:s.deadline===null?null:Math.max(0,s.deadline-s.serverNow-Math.max(0,now-base));
}
function Clock({s,ms}:{s:RoomState;ms:number|null}){
 if(!s.timed)return <span className="cn-no-clock">بدون تايمر</span>;
 if(ms===null)return null;
 const sec=Math.ceil(ms/1000),max=s.phase==='clue'&&!s.history.some(h=>h.team===s.turn)?300000:120000;
 const text=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
 return <div className={'cn-clock '+(sec===0?'cn-clock-expired':'')} aria-label={'الوقت المتبقي '+text}><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" className="cn-clock-track"/><circle cx="24" cy="24" r="20" pathLength="100" strokeDasharray={Math.min(100,ms/max*100)+' 100'} className="cn-clock-arc"/></svg><b dir="ltr">{text}</b></div>
}
function TeamScore({team,s}:{team:Team;s:RoomState}){return <div className={'cn-game-score cn-score-'+team+(s.turn===team&&s.phase!=='result'?' active':'')}><div className="cn-score-text"><b>الفريق {teamName(team)}</b><small>الجولات: {s.score[team]}</small></div><div className="cn-score-counter"><strong>{s.remaining[team]}</strong><small>متبقي</small></div></div>}
function Card({card,s,canGuess,busy,onCommand,inFlight}:{card:BoardCard;s:RoomState;canGuess:boolean;busy:boolean;inFlight:boolean;onCommand:(cmd:Command)=>Promise<void>}){
 const [peek,setPeek]=useState(false);
 const marked=!card.revealed&&s.marks.includes(card.id),allowed=canGuess&&!busy&&!card.revealed;
 const covered=card.revealed&&!!card.color;
 const color=card.color??'paper';
 const label=card.word+(card.color?' — '+colorText[card.color]:'')+(card.revealed?' — مكشوفة':'')+(marked?' — مشتبه بها':'');
 return <div data-cn-card-id={card.id} className={'cn-word-card cn-card-'+color+(card.revealed?' cn-revealed':'')+(inFlight?' cn-in-flight':'')}><div className="cn-card-face"><button type="button" className="cn-card-select" aria-label={label} aria-pressed={marked} disabled={!allowed} onClick={()=>void onCommand({kind:'toggle_mark',cardId:card.id})}><span className="cn-card-word" dir="auto">{card.word}</span></button><div className="cn-card-top">{marked&&s.turn&&<img className="cn-mark" src={'/art/codenames/mark-'+s.turn+'.svg'} width="16" height="16" alt={'شك الفريق '+teamName(s.turn)}/>}<span className="cn-card-spacer"/>{marked&&canGuess&&<button type="button" className="cn-card-confirm" aria-label={'تأكيد '+card.word} disabled={busy} onClick={()=>void onCommand({kind:'confirm_guess',cardId:card.id})}><img src="/art/codenames/confirm.svg" width="24" height="24" alt=""/></button>}</div>{covered&&<button type="button" className={'cn-character-cover'+(peek?' cn-peek':'')} aria-label={(peek?'إخفاء كلمة ':'عرض كلمة ')+card.word+' — '+colorText[card.color!]} aria-expanded={peek} onClick={()=>setPeek(v=>!v)}><span className="cn-cover-art"><img src={'/art/codenames/'+card.color+'.svg'} alt="" draggable={false}/></span></button>}</div></div>
}
function Log({s}:{s:RoomState}){return <section className="cn-game-log"><header><b>سجل الجولة</b><small>GAME LOG</small></header>{!s.history.length?<p>لم يتم تسجيل تلميح بعد.</p>:<div className="cn-log-scroll">{s.history.map((h,i)=><article key={i}><div className={'cn-log-clue cn-log-'+h.team}><small>{h.leader}</small><b dir="auto">{h.text??'انتهى الوقت'}</b><strong>{countText(h.count)}</strong></div><p>{h.guesser}{!h.guesses.length&&!h.endReason?' · بانتظار أول تخمين مؤكد':''}</p>{h.guesses.length>0&&<div className="cn-log-guesses">{h.guesses.map(g=><span key={g.cardId} className={'cn-log-guess cn-log-'+g.color} title={outcomeText[g.outcome]}>{g.word} {g.outcome==='correct'?'✓':'×'}</span>)}</div>}{h.endReason&&<small>{endText[h.endReason]??''}</small>}</article>)}</div>}</section>}
export default function CodeNamesBoard({state,busy,onCommand,onEnd,onRules,onHome,sound}:{state:RoomState;busy:boolean;sound:GameSound;onCommand:(cmd:Command)=>Promise<void>;onEnd:()=>void;onRules:()=>void;onHome:()=>void}){
 const motion=useGameMotion(state,sound);
 const s=motion.frame?.previous??state;
 const [text,setText]=useState(''),[count,setCount]=useState<ClueCount|null>(null);
 const ms=useTime(state),ownTeam=s.you.slot?.startsWith('red:')?'red':s.you.slot?.startsWith('blue:')?'blue':null,leader=!!s.you.slot?.endsWith(':leader'),ownTurn=ownTeam!==null&&ownTeam===s.turn,finished=s.phase==='result';
 const myClue=ownTurn&&leader&&s.phase==='clue',myGuess=ownTurn&&!leader&&s.phase==='guess',canGuess=myGuess&&!s.paused;
 const locked=busy||state.paused||motion.locked,expired=state.timed&&ms===0;
 const label=motion.frame?'كشف البطاقة':finished?'انتهت الجولة':s.paused?'اللعبة متوقفة مؤقتًا':myClue?'دورك لإعطاء التلميح':myGuess?'دورك للتخمين':s.phase==='clue'?'بانتظار تلميح الفريق '+teamName(s.turn):'الفريق '+teamName(s.turn)+' يخمّن';
 useEffect(()=>{setText('');setCount(null)},[s.round,s.turn,s.phase]);
 const send=(e:FormEvent)=>{e.preventDefault();if(!myClue||locked||expired||count===null||!text.trim()||/\s/.test(text.trim()))return;void onCommand({kind:'give_clue',text:text.trim(),count})};
 const me=s.players.find(p=>p.id===s.you.id),ready=s.players.length===4&&s.players.every(p=>p.connected&&p.slot);
 return <div className="cn-game" dir="rtl" data-cn-turn-flash={motion.turn??undefined}>{motion.frame&&<RevealLayer key={motion.frame.key} frame={motion.frame}/>} {motion.win&&<VictoryLayer key={motion.win.key} win={motion.win}/>} {motion.turn&&!motion.frame&&!motion.win&&<TurnFlash team={motion.turn}/>}<ClueFlash state={s}/><div className="cn-score-row"><TeamScore team="red" s={s}/><div className="cn-round-role"><b>الجولة {String(s.round).padStart(2,'0')} / {me?.name} · {leader?'قائد':'مخمّن'} {teamName(ownTeam)}</b><span>{label}</span></div><TeamScore team="blue" s={s}/></div>
 {s.paused&&<div className="cn-notice" role="status">بانتظار عودة {s.players.filter(p=>!p.connected).map(p=>p.name).join('، ')}. الوقت محفوظ.</div>}
 {finished&&!motion.win&&<section className="cn-game-result"><div><h2>{s.winner?'فاز الفريق '+teamName(s.winner):'انتهت الجولة'}</h2><p>{s.reason==='assassin'?'تم اختيار البطاقة السوداء.':'تم كشف جميع كلمات الفريق الفائز.'}</p></div>{s.you.isHost?<div className="cn-result-actions"><button className="btn btn-primary" disabled={locked||!ready} onClick={()=>void onCommand({kind:'next_round'})}>جولة جديدة</button><button className="btn btn-gold" disabled={busy} onClick={onEnd}>إنهاء اللعبة</button></div>:<div><p>بانتظار صاحب الغرفة.</p><button className="btn btn-gold" onClick={onHome}>العودة للألعاب</button></div>}</section>}
 <div className="cn-game-layout"><main className="cn-board-area"><header><b>{leader&&!finished?'الخريطة السرية':'لوحة الأدلة'}</b><small>{leader&&!finished?'للقادة فقط':'25 بطاقة · 5 × 5'}</small></header><div className="cn-card-grid" role="group" aria-label="لوحة الكلمات">{s.board.map(card=><Card key={s.round+':'+card.id} card={card} s={s} inFlight={motion.frame?.card.id===card.id} canGuess={canGuess} busy={locked} onCommand={onCommand}/>)}</div></main>
 <aside className="cn-game-sidebar"><section className="cn-turn-panel"><header><b>{label}</b><Clock s={state} ms={ms}/></header>{myClue&&<form onSubmit={send}><label>التلميح<input placeholder="اكتب كلمة واحدة" value={text} onChange={e=>setText(e.target.value)} maxLength={50} disabled={locked||expired}/></label><div className="cn-count-options" role="group" aria-label="عدد الكلمات">{([1,2,3,4,5,6,7,8,'infinity'] as ClueCount[]).map(n=><button key={n} type="button" className={count===n?'selected':''} aria-pressed={count===n} disabled={locked||expired} onClick={()=>setCount(n)}>{countText(n)}</button>)}</div><button className="btn btn-primary" type="submit" disabled={locked||expired||count===null||!text.trim()||/\s/.test(text.trim())}>إرسال التلميح</button></form>}
 {s.phase==='guess'&&s.clue&&<><div data-cn-clue-target className={'cn-current-clue cn-clue-'+s.turn}><small>التلميح الحالي</small><strong>{s.clue.text} : {countText(s.clue.count)}</strong><span>{s.clue.count==='infinity'?'تخمينات غير محدودة':Math.max(0,s.clue.count+1-s.clue.attempts)+' تخمينات متبقية'}</span></div>{myGuess&&<button className="btn btn-outline" disabled={locked||s.clue.attempts<1} onClick={()=>void onCommand({kind:'skip'})}>إنهاء دوري</button>}{s.canCut&&!s.paused&&<button type="button" className="cn-cut-turn" disabled={locked} onClick={()=>void onCommand({kind:'cut_turn'})}>إنهاء دور الخصم</button>}</>}
 {s.phase==='clue'&&!myClue&&<p>انتظر حتى يرسل القائد التلميح.</p>}
 <button type="button" className="cn-board-rules" onClick={onRules}>كيف تلعب؟</button></section><Log s={s}/></aside></div></div>
}