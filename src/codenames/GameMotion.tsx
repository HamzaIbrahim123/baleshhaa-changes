import {useLayoutEffect,useEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import type {RoomState,BoardCard,Team,CardColor} from './client';
import type {GameSound} from './gameSound';
import {gameEvents,clueIdentity,REVEAL_MS,VICTORY_MS} from './gameEvents';

const name=(team:Team)=>team==='red'?'الأحمر':'الأزرق';
type Frame={key:string;previous:RoomState;card:BoardCard;color:CardColor;outcome:NonNullable<RoomState['lastReveal']>['outcome'];x:number;y:number;width:number;height:number;dx:number;dy:number;scale:number;duration:number};
type Win={key:string;team:Team;own:boolean;reason:string|null;duration:number};
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function useGameMotion(s:RoomState,sound:GameSound){
 const previous=useRef<RoomState|null>(null),current=useRef(s);
 const [frame,setFrame]=useState<Frame|null>(null),[win,setWin]=useState<Win|null>(null),[turn,setTurn]=useState<Team|null>(null);
 const timers=useRef<number[]>([]),active=useRef(false);
 const later=(cb:()=>void,ms:number)=>{const id=window.setTimeout(()=>{timers.current=timers.current.filter(n=>n!==id);cb()},ms);timers.current.push(id)};
 const clear=()=>{timers.current.forEach(id=>window.clearTimeout(id));timers.current=[];active.current=false;setFrame(null);setWin(null);setTurn(null);sound.stop()};
 useEffect(()=>{
  const visibility=()=>{if(document.hidden)clear()};
  document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('visibilitychange',visibility);timers.current.forEach(id=>window.clearTimeout(id));timers.current=[];active.current=false;sound.stop()};
 },[sound.stop]);
 useLayoutEffect(()=>{
  current.current=s;
  const old=previous.current;previous.current=s;
  if(!old)return;
  if(old.round!==s.round||s.phase==='closed'){clear();return}
  if(document.hidden){clear();return}
  const event=gameEvents(old,s);
  const celebrate=()=>{
   const latest=current.current;
   if(latest.round!==s.round||latest.phase!=='result'||!latest.winner||document.hidden)return;
   const team=latest.winner,own=latest.you.slot?.startsWith(team+':')??false;
   const duration=reduced()?1150:VICTORY_MS;
   setWin({key:s.round+':'+team,team,own,reason:latest.reason,duration});sound.play(own?'victory':'defeat');if(own)sound.play('victoryMusic',.10);
   later(()=>setWin(null),duration);
  };
  const announceTurn=()=>{
   const latest=current.current;
   if(latest.round!==s.round||latest.phase==='result'||latest.paused||!latest.turn||document.hidden)return;
   setTurn(latest.turn);sound.play('turn');later(()=>setTurn(null),1000);
  };
  if(event.reveal){
   const reveal=event.reveal,card=old.board.find(c=>c.id===reveal.cardId);
   if(!card){if(event.victory)celebrate();return}
   clear();
   const rect=document.querySelector('[data-cn-card-id="'+reveal.cardId+'"]')?.getBoundingClientRect();
   const width=rect?.width||140,height=rect?.height||90;
   const x=rect?.left??(window.innerWidth-width)/2,y=rect?.top??(window.innerHeight-height)/2;
   const scale=Math.max(1,Math.min(2.1,(window.innerWidth-40)/width,(window.innerHeight-80)/height,350/width));
   const duration=reduced()?400:REVEAL_MS;
   const key=reveal.round+':'+reveal.revision;
   active.current=true;
   setFrame({key,previous:old,card,color:reveal.color,outcome:reveal.outcome,x,y,width,height,dx:window.innerWidth/2-x-width/2,dy:window.innerHeight/2-y-height/2,scale,duration});
   sound.play('confirm');sound.play(reveal.outcome,reduced()?0.08:0.55);
   later(()=>{active.current=false;setFrame(null);if(current.current.phase==='result')celebrate();else if(clueIdentity(current.current)&&clueIdentity(current.current)!==clueIdentity(old))sound.play('clue');else if(event.turn||current.current.turn!==old.turn)announceTurn()},duration);
   return;
  }
  if(event.victory&&!active.current)celebrate();
  else if(event.turn&&!event.clue&&!active.current)announceTurn();
  if(event.clue&&!active.current)sound.play('clue');
  else if(event.mark&&!active.current)sound.play('mark');
 },[s,sound.play,sound.stop]);
 return {frame,win,turn,locked:!!frame||!!win};
}
const colors={red:'أحمر',blue:'أزرق',neutral:'محايدة',assassin:'سوداء'};
const outcomes={correct:'تخمين صحيح',opponent:'كلمة الفريق الخصم',neutral:'بطاقة محايدة',assassin:'البطاقة السوداء'};
export function RevealLayer({frame:f}:{frame:Frame}){
 const style={'--cn-x':f.x+'px','--cn-y':f.y+'px','--cn-w':f.width+'px','--cn-h':f.height+'px','--cn-dx':f.dx+'px','--cn-dy':f.dy+'px','--cn-zoom':f.scale,'--cn-reveal-ms':f.duration+'ms'} as CSSProperties;
 return createPortal(<div className={'cn-reveal-layer cn-reveal-'+f.outcome+' cn-fx-'+f.color} style={style} role="status" aria-label={f.card.word+' — '+outcomes[f.outcome]}><div className="cn-reveal-dim"/><div className="cn-impact-ring" aria-hidden="true"/><div className="cn-reveal-vignette" aria-hidden="true"/><div className={'cn-flying-card cn-card-'+(f.card.color??'paper')}><div className="cn-flying-face"><span className="cn-flying-word">{f.card.word}</span></div><div className={'cn-flying-true cn-card-'+f.color}><div className="cn-flying-face"><span className="cn-flying-word">{f.card.word}</span></div><div className="cn-flying-cover"><img src={'/art/codenames/'+f.color+'.svg'} alt=""/></div></div></div><div className={'cn-reveal-caption cn-outcome-'+f.outcome}>{outcomes[f.outcome]} · {colors[f.color]}</div></div>,document.body)
}
export function VictoryLayer({win:w}:{win:Win}){
 return createPortal(<div className={'cn-victory-layer cn-victory-'+w.team} style={{'--cn-win-ms':w.duration+'ms'} as CSSProperties} role="status"><div className="cn-victory-scrim"/>{w.own&&<div className="cn-confetti" aria-hidden="true">{Array.from({length:32},(_,i)=><i key={i} style={{'--a':(i*137.5)+'deg','--r':(95+(i%7)*32)+'px','--d':(i%5)*45+'ms','--h':i%3===0?'#f6ce7a':i%3===1?'var(--win)':'#fff'} as CSSProperties}/>)}</div>}<div className="cn-victory-panel" dir="rtl"><div className="cn-victory-radar" aria-hidden="true"/><small>MISSION / ROUND COMPLETE</small><div className="cn-win-seal" aria-hidden="true">{w.own?'✓':'—'}</div><div className="cn-victory-character"><img src={'/art/codenames/'+w.team+'.svg'} alt=""/></div><strong>{w.own?'انتصار!':'انتهت المهمة'}</strong><h2>فاز الفريق {name(w.team)}</h2><p>{w.reason==='assassin'?'حُسمت الجولة بالبطاقة السوداء':'تم كشف جميع كلمات الفريق الفائز'}</p></div></div>,document.body)
}
export function TurnFlash({team}:{team:Team}){return <div className={'cn-turn-flash cn-turn-'+team} role="status"><i/><span><small>TURN TRANSFER</small><strong>دور الفريق {name(team)}</strong></span></div>}

export function MissionLayer({round,team,onDismiss}:{round:number;team:Team|null;onDismiss:()=>void}){return createPortal(<div className="cn-mission-layer" role="status" dir="rtl"><div className="cn-mission-card"><small>CLASSIFIED / OPERATION {String(round).padStart(2,'0')}</small><div className="cn-mission-agents" aria-hidden="true"><img src="/art/codenames/red.svg" alt=""/><img src="/art/codenames/blue.svg" alt=""/></div><strong>بدأت المهمة</strong><p>{team?'الفريق '+name(team)+' يبدأ الجولة':'استعدوا للعملية'}</p><button type="button" onClick={onDismiss}>تخطّي</button></div></div>,document.body)}
