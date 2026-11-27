import {useCallback,useEffect,useRef,useState} from 'react';

export type Cue='mark'|'confirm'|'clue'|'turn'|'correct'|'opponent'|'neutral'|'assassin'|'victory'|'defeat';
type Layer={at:number;duration:number;gain:number;kind:'paper'|'wood'|'metal'|'air'|'bass'|'spark';pitch?:number};
const hit=(at:number,duration:number,gain:number,kind:Layer['kind'],pitch=1):Layer=>({at,duration,gain,kind,pitch});
/** Original procedural foley: filtered noise, short surface impacts, and damped resonances.
 * No recorded or third-party audio. Samples are generated once per AudioContext. */
export const cues:Record<Cue,Layer[]>={
 mark:[hit(0,.095,.23,'paper'),hit(.028,.065,.20,'wood')],
 confirm:[hit(0,.10,.24,'wood'),hit(.08,.40,.28,'air'),hit(.44,.12,.30,'paper')],
 clue:[hit(0,.25,.24,'paper'),hit(.09,.22,.24,'metal',1.18),hit(.22,.12,.16,'spark',1.35)],
 turn:[hit(0,.28,.18,'air'),hit(.16,.17,.22,'wood')],
 correct:[hit(0,.15,.23,'wood'),hit(.05,.35,.27,'metal',1.3),hit(.16,.35,.17,'spark',1.5)],
 opponent:[hit(0,.17,.28,'wood',.75),hit(.07,.34,.22,'bass',1.2)],
 neutral:[hit(0,.19,.24,'paper'),hit(.08,.13,.16,'wood',.9)],
 assassin:[hit(0,.65,.36,'bass',.8),hit(.01,.19,.29,'metal',.48),hit(.10,.52,.16,'air')],
 victory:[hit(0,.46,.26,'bass',1.25),hit(.09,.36,.23,'metal',1.1),hit(.24,.46,.25,'spark',1.22),hit(.42,.65,.23,'metal',1.6),hit(.42,.75,.17,'air')],
 defeat:[hit(0,.52,.27,'bass',.76),hit(.07,.37,.18,'metal',.65),hit(.28,.43,.13,'air')]
};
function renderCue(c:AudioContext,cue:Cue){
 const layers=cues[cue],rate=c.sampleRate,len=Math.ceil((Math.max(...layers.map(x=>x.at+x.duration))+.035)*rate);
 const buf=c.createBuffer(1,len,rate),out=buf.getChannelData(0);
 let seed=2166136261;for(const ch of cue)seed=Math.imul(seed^ch.charCodeAt(0),16777619);
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1};
 const tau=2*Math.PI;
 for(const L of layers){let low=0,slow=0;const start=Math.floor(L.at*rate),n=Math.ceil(L.duration*rate),p=L.pitch??1;
  for(let i=0;i<n&&start+i<len;i++){const t=i/rate,u=t/L.duration;const w=rand();low+=.12*(w-low);slow+=.018*(w-slow);const high=w-low,mid=low-slow;let y=0,env=0;
   if(L.kind==='paper'){env=Math.sin(Math.PI*u)**.7;y=(.7*high+.35*mid)*(.65+.35*Math.sin(95*t+5*slow));}
   else if(L.kind==='wood'){env=Math.exp(-u*8);y=.65*mid+.48*Math.sin(tau*210*p*t)*Math.exp(-t*47)+.29*Math.sin(tau*710*p*t)*Math.exp(-t*75);}
   else if(L.kind==='metal'){env=Math.exp(-u*4.5);y=.42*Math.sin(tau*390*p*t)+.25*Math.sin(tau*827*p*t)*Math.exp(-u*3)+.16*Math.sin(tau*1361*p*t)*Math.exp(-u*5)+.15*high*Math.exp(-u*18);}
   else if(L.kind==='air'){env=Math.sin(Math.PI*u)**1.5;y=(.8*mid+.23*high+.35*slow)*(.55+.45*u);}
   else if(L.kind==='bass'){env=Math.exp(-u*4);y=.55*Math.sin(tau*p*(75*t-22*t*t))+.3*slow+.16*mid*Math.exp(-u*5);}
   else {env=Math.exp(-u*5);y=.33*Math.sin(tau*710*p*t)+.23*Math.sin(tau*1229*p*t)*Math.exp(-u*3)+.18*high;}
   const edge=Math.min(1,t/.004,(L.duration-t)/.018);out[start+i]+=L.gain*y*env*Math.max(0,edge);
  }
 }
 let peak=0;for(const x of out)peak=Math.max(peak,Math.abs(x));if(peak>.68)for(let i=0;i<out.length;i++)out[i]*=.68/peak;
 return buf;
}
const STORAGE='baleshhaa:codenames:muted:v1';
const saved=()=>{try{return localStorage.getItem(STORAGE)==='1'}catch{return false}};
export function useCodeNamesSound(){
 const [muted,setMuted]=useState(saved),[ready,setReady]=useState(false);
 const mutedRef=useRef(muted),context=useRef<AudioContext|null>(null);
 const nodes=useRef(new Set<AudioBufferSourceNode>()),samples=useRef(new Map<Cue,AudioBuffer>());
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
  return()=>{window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',onVisibility);stop();const c=context.current;context.current=null;samples.current.clear();if(c)void c.close().catch(()=>{})};
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
  try{let sample=samples.current.get(cue);if(!sample||sample.sampleRate!==c.sampleRate){sample=renderCue(c,cue);samples.current.set(cue,sample)}const node=c.createBufferSource();node.buffer=sample;node.connect(c.destination);nodes.current.add(node);node.onended=()=>{nodes.current.delete(node);node.disconnect()};node.start(start)}catch{}
 },[]);
 return {muted,ready,play,stop,toggle};
}
export type GameSound=ReturnType<typeof useCodeNamesSound>;
