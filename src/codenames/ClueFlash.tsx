import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {RoomState,Team,ClueCount} from './client';
import {clueIdentity} from './gameEvents';
type Flash={key:string;team:Team;text:string;count:ClueCount;leader:string;dx:number;dy:number};
export function clueEventKey(s:RoomState){
 return clueIdentity(s);
}
/** Public server projection only. No network, no role-specific secret data.
 * Initial mount/reconnect does not replay an already visible clue. */
export default function ClueFlash({state:s}:{state:RoomState}){
 const key=clueEventKey(s);
 const seen=useRef<string|null>(key);
 const [flash,setFlash]=useState<Flash|null>(null);
 const timer=useRef<number|null>(null);
 useEffect(()=>()=>{if(timer.current!==null)window.clearTimeout(timer.current)},[]);
 useEffect(()=>{
  if(!key||key===seen.current)return;
  seen.current=key;
  if(document.hidden||!s.clue||!s.turn||s.paused)return;
  if(timer.current!==null)window.clearTimeout(timer.current);
  const target=document.querySelector('[data-cn-clue-target]')?.getBoundingClientRect();
  const dx=target?target.left+target.width/2-window.innerWidth/2:-window.innerWidth*.25;
  const dy=target?target.top+target.height/2-window.innerHeight/2:0;
  setFlash({key,team:s.turn,text:s.clue.text,count:s.clue.count,leader:s.history.at(-1)?.leader??'',dx,dy});
  timer.current=window.setTimeout(()=>{setFlash(null);timer.current=null},1850);
 },[key]); // event identity, not polling revision
 useEffect(()=>{if(s.phase!=='guess'||s.paused){if(timer.current!==null)window.clearTimeout(timer.current);timer.current=null;setFlash(null)}},[s.phase,s.paused,s.round]);
 if(!flash)return null;
 return <div className={'cn-clue-flash cn-flash-'+flash.team} key={flash.key} style={{'--cn-fly-x':flash.dx+'px','--cn-fly-y':flash.dy+'px'} as CSSProperties} role="status" aria-live="polite"><div className="cn-flash-art"><img src={'/art/codenames/'+flash.team+'.svg'} alt=""/></div><div className="cn-flash-copy"><small>تلميح الفريق {flash.team==='red'?'الأحمر':'الأزرق'} · {flash.leader}</small><strong dir="auto">{flash.text}</strong></div><span className="cn-flash-count" dir="ltr">{flash.count==='infinity'?'∞':flash.count}</span></div>
}
