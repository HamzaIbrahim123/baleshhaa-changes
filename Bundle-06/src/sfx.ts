/** Original, locally synthesized UI sound effects (no external audio files or dependencies). */
export type GameSound = 'win'|'pit'|'trap';
let sharedContext: AudioContext | null = null;
const safe = (v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
function tone(ctx:AudioContext,when:number,frequency:number,duration:number,volume:number,kind:OscillatorType='sine',endFrequency?:number){
 const oscillator=ctx.createOscillator();
 const gain=ctx.createGain();
 oscillator.type=kind;
 oscillator.frequency.setValueAtTime(frequency,when);
 if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(Math.max(25,endFrequency),when+duration);
 gain.gain.setValueAtTime(0.0001,when);
 gain.gain.exponentialRampToValueAtTime(safe(volume,0.0002,0.25),when+0.012);
 gain.gain.exponentialRampToValueAtTime(0.0001,when+duration);
 oscillator.connect(gain).connect(ctx.destination);
 oscillator.start(when);
 oscillator.stop(when+duration+0.025);
}
function noise(ctx:AudioContext,when:number,duration:number,volume:number,lowpass:number){
 const len=Math.max(1,Math.floor(ctx.sampleRate*duration));
 const buffer=ctx.createBuffer(1,len,ctx.sampleRate);
 const samples=buffer.getChannelData(0);
 // Original per-playback noise, shaped and filtered. No recorded/copyrighted samples.
 for(let i=0;i<len;i++)samples[i]=(Math.random()*2-1)*(1-i/len);
 const source=ctx.createBufferSource();
 const filter=ctx.createBiquadFilter();
 const gain=ctx.createGain();
 source.buffer=buffer;
 filter.type='lowpass';
 filter.frequency.value=lowpass;
 gain.gain.setValueAtTime(0.0001,when);
 gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,Math.min(volume,.2)),when+.008);
 gain.gain.exponentialRampToValueAtTime(0.0001,when+duration);
 source.connect(filter).connect(gain).connect(ctx.destination);
 source.start(when);
 source.stop(when+duration+.01);
}
export function playGameSound(kind:GameSound):void {
 // Browser audio requires a user gesture. Call only from result-confirm / finish clicks.
 try {
  if(typeof window==='undefined')return;
  const Ctx=window.AudioContext;
  if(!Ctx)return;
  const ctx=sharedContext??(sharedContext=new Ctx());
  if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
  const at=ctx.currentTime+.018;
  if(kind==='win'){
   // Bright, rising celebration fanfare and three sparkling chimes.
   const notes=[392,494,587.33,783.99,987.77,1174.66];
   notes.forEach((f,i)=>tone(ctx,at+i*.105,f,.34,.067,'triangle'));
   [783.99,987.77,1174.66].forEach((f,i)=>tone(ctx,at+.62+i*.12,f,.40,.045,'sine'));
   noise(ctx,at+.72,.5,.03,3800);
  }else if(kind==='pit'){
   // Surprise "wow": rising swoosh into a two-note success sparkle.
   tone(ctx,at,180,.33,.082,'sawtooth',520);
   tone(ctx,at+.22,659.25,.33,.065,'triangle');
   tone(ctx,at+.35,987.77,.46,.065,'sine');
   noise(ctx,at,.18,.016,2100);
  }else if(kind==='trap'){
   // Low-pitched impact with filtered original noise: explosion-like hit.
   noise(ctx,at,.62,.16,820);
   tone(ctx,at,135,.46,.16,'sawtooth',35);
   tone(ctx,at+.06,70,.62,.11,'triangle',28);
   noise(ctx,at+.04,.28,.065,1900);
  }
 }catch{/* Sound is optional; it must never interrupt gameplay. */}
}
