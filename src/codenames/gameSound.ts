import {useCallback,useEffect,useRef,useState} from 'react';

export type Cue='mark'|'confirm'|'clue'|'turn'|'correct'|'opponent'|'neutral'|'assassin'|'victory'|'defeat';
type Tone={at:number;duration:number;from:number;to?:number;gain:number;wave?:OscillatorType};
const note=(at:number,duration:number,from:number,gain=.055,to?:number,wave:OscillatorType='sine'):Tone=>({at,duration,from,to,gain,wave});
/** Original synthesized cues, no licensed recordings, no asset downloads. */
export const cues:Record<Cue,Tone[]>={
 mark:[note(0,.065,780,.038,460,'triangle')],
 clue:[note(0,.15,440,.048,660,'triangle'),note(.13,.22,880,.045)],
 turn:[note(0,.12,330,.035),note(.10,.16,494,.038)],
 confirm:[note(0,.075,620,.06,280,'triangle'),note(.08,.32,180,.035,720,'triangle'),note(.55,.15,460,.035,160,'triangle')],
 correct:[note(0,.17,523,.065),note(.13,.19,659,.06),note(.26,.30,784,.055)],
 opponent:[note(0,.23,392,.06,280,'triangle'),note(.18,.25,220,.052)],
 neutral:[note(0,.18,440,.045,330),note(.13,.14,330,.03)],
 assassin:[note(0,.55,110,.08,45,'triangle'),note(.06,.42,164,.045,60,'sine')],
 victory:[note(0,.25,392,.055),note(.18,.25,523,.055),note(.36,.25,659,.055),note(.54,.72,784,.06),note(.54,.72,523,.035),note(.54,.72,659,.03)],
 defeat:[note(0,.25,392,.04),note(.23,.30,294,.045),note(.50,.55,196,.05)]
};
const STORAGE='baleshhaa:codenames:muted:v1';
const saved=()=>{try{return localStorage.getItem(STORAGE)==='1'}catch{return false}};
export function useCodeNamesSound(){
 const [muted,setMuted]=useState(saved),[ready,setReady]=useState(false);
 const mutedRef=useRef(muted),context=useRef<AudioContext|null>(null);
 const nodes=useRef(new Set<OscillatorNode>());
 const stop=useCallback(()=>{for(const node of nodes.current){try{node.stop()}catch{} }nodes.current.clear()},[]);
 const unlock=useCallback(()=>{
  if(mutedRef.current)return;
  try{
   const Audio=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(!Audio)return;
   if(!context.current||context.current.state==='closed')context.current=new Audio();
   const c=context.current;
   if(c.state==='running'){setReady(true);return}
   void c.resume().then(()=>{if(context.current===c)setReady(c.state==='running')}).catch(()=>{});
  }catch{}
 },[]);
 useEffect(()=>{
  window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);
  const onVisibility=()=>{if(document.hidden)stop()};
  document.addEventListener('visibilitychange',onVisibility);
  return()=>{window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',onVisibility);stop();const c=context.current;context.current=null;if(c)void c.close().catch(()=>{})};
 },[unlock,stop]);
 const toggle=useCallback(()=>{
  const next=!mutedRef.current;mutedRef.current=next;setMuted(next);
  try{localStorage.setItem(STORAGE,next?'1':'0')}catch{}
  if(next)stop();else unlock();
 },[stop,unlock]);
 const play=useCallback((cue:Cue,delay=0)=>{
  const c=context.current;
  if(!c||c.state!=='running'||mutedRef.current||document.hidden)return;
  const start=c.currentTime+Math.max(0,delay);
  for(const t of cues[cue]){
   try{
    const o=c.createOscillator(),g=c.createGain(),a=start+t.at,end=a+t.duration;
    o.type=t.wave??'sine';o.frequency.setValueAtTime(t.from,a);
    if(t.to)o.frequency.exponentialRampToValueAtTime(t.to,end);
    g.gain.setValueAtTime(.0001,a);g.gain.exponentialRampToValueAtTime(t.gain,a+Math.min(.012,t.duration/3));g.gain.exponentialRampToValueAtTime(.0001,end);
    o.connect(g);g.connect(c.destination);nodes.current.add(o);
    o.onended=()=>{nodes.current.delete(o);o.disconnect();g.disconnect()};
    o.start(a);o.stop(end+.015);
   }catch{}
  }
 },[]);
 return {muted,ready,play,stop,toggle};
}
export type GameSound=ReturnType<typeof useCodeNamesSound>;
