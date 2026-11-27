import {useCallback,useEffect,useRef,useState} from 'react';
export type Cue='mark'|'confirm'|'clue'|'turn'|'correct'|'opponent'|'neutral'|'assassin'|'victory'|'defeat'|'opening'|'victoryMusic';
export const cueNames:Cue[]=['mark','confirm','clue','turn','correct','opponent','neutral','assassin','victory','defeat','opening','victoryMusic'];
const musicCue=(cue:Cue)=>cue==='opening'||cue==='victoryMusic';
const STORAGE='baleshhaa:codenames:audio:v2';
type Settings={muted:boolean;music:number;effects:number};
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;
function saved():Settings{try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');if(raw)return {muted:raw.muted===true,music:typeof raw.music==='number'?clamp(raw.music):40,effects:typeof raw.effects==='number'?clamp(raw.effects):85};return {muted:localStorage.getItem('baleshhaa:codenames:muted:v1')==='1',music:40,effects:85}}catch{return {muted:false,music:40,effects:85}}}
export function useCodeNamesSound(){
 const [settings,setSettings]=useState(saved),[ready,setReady]=useState(false);
 const prefs=useRef(settings),ctx=useRef<AudioContext|null>(null),buses=useRef<{master:GainNode;music:GainNode;effects:GainNode}|null>(null);
 const raw=useRef(new Map<Cue,Promise<ArrayBuffer|null>>()),decoded=useRef(new Map<Cue,Promise<AudioBuffer|null>>());
 const nodes=useRef(new Set<AudioBufferSourceNode>()),generation=useRef(0);
 const load=useCallback((cue:Cue)=>{let p=raw.current.get(cue);if(!p){p=fetch('/audio/codenames/'+cue+'.mp3').then(r=>{if(!r.ok)throw Error('audio');return r.arrayBuffer()}).catch(()=>null);raw.current.set(cue,p)}return p},[]);
 const decode=useCallback((cue:Cue,c:AudioContext)=>{let p=decoded.current.get(cue);if(!p){p=load(cue).then(data=>data?c.decodeAudioData(data.slice(0)):null).catch(()=>null);decoded.current.set(cue,p)}return p},[load]);
 const stop=useCallback(()=>{generation.current++;for(const n of nodes.current){try{n.stop()}catch{}}nodes.current.clear()},[]);
 const sync=useCallback(()=>{const c=ctx.current,g=buses.current,p=prefs.current;if(!c||!g)return;g.master.gain.setTargetAtTime(p.muted?0:.85,c.currentTime,.015);g.music.gain.setTargetAtTime(p.music/100,c.currentTime,.015);g.effects.gain.setTargetAtTime(p.effects/100,c.currentTime,.015)},[]);
 const unlock=useCallback(()=>{if(prefs.current.muted)return;try{const Audio=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Audio)return;
 if(!ctx.current||ctx.current.state==='closed'){const c=new Audio();ctx.current=c;decoded.current.clear();const master=c.createGain(),music=c.createGain(),effects=c.createGain(),limiter=c.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=10;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.18;music.connect(master);effects.connect(master);master.connect(limiter);limiter.connect(c.destination);buses.current={master,music,effects};sync()}
 const c=ctx.current;const done=()=>{if(ctx.current===c){setReady(c.state==='running');if(c.state==='running')for(const cue of cueNames)void decode(cue,c)}};if(c.state==='running')done();else void c.resume().then(done).catch(()=>{})}catch{}},[decode,sync]);
 useEffect(()=>{for(const cue of cueNames)void load(cue);window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);const hidden=()=>{if(document.hidden)stop()};document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',hidden);stop();const c=ctx.current;ctx.current=null;buses.current=null;decoded.current.clear();if(c)void c.close().catch(()=>{})}},[load,unlock,stop]);
 const update=useCallback((next:Partial<Settings>)=>{const p={...prefs.current,...next};prefs.current=p;setSettings(p);try{localStorage.setItem(STORAGE,JSON.stringify(p))}catch{}sync();if(p.muted)stop();else unlock()},[sync,stop,unlock]);
 const toggle=useCallback(()=>update({muted:!prefs.current.muted}),[update]);
 const setMusic=useCallback((n:number)=>update({music:clamp(n)}),[update]);
 const setEffects=useCallback((n:number)=>update({effects:clamp(n)}),[update]);
 const play=useCallback((cue:Cue,delay=0)=>{const c=ctx.current,g=buses.current;if(!c||!g||c.state!=='running'||prefs.current.muted||document.hidden)return;const gen=generation.current,start=c.currentTime+Math.max(0,delay);void decode(cue,c).then(buffer=>{if(!buffer||ctx.current!==c||gen!==generation.current||prefs.current.muted||document.hidden||c.currentTime>start+.35)return;try{const n=c.createBufferSource();n.buffer=buffer;n.connect(musicCue(cue)?g.music:g.effects);nodes.current.add(n);n.onended=()=>{nodes.current.delete(n);n.disconnect()};n.start(Math.max(c.currentTime,start))}catch{}})},[decode]);
 const preview=useCallback((cue:Cue)=>{stop();unlock();const c=ctx.current;if(!c||prefs.current.muted)return;const gen=generation.current;void c.resume().then(()=>decode(cue,c)).then(buf=>{if(!buf||ctx.current!==c||gen!==generation.current)return;play(cue)}).catch(()=>{})},[stop,unlock,decode,play]);
 return {...settings,ready,play,stop,toggle,setMusic,setEffects,preview};
}
export type GameSound=ReturnType<typeof useCodeNamesSound>;
