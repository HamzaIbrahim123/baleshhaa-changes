/** Original, locally synthesized UI sound effects (no external audio files or dependencies). */
export type GameSound = 'win'|'pit'|'trap'|'question'|'reveal'|'correct'|'next';
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
/**
 * Warm, original multi-layered victory fanfare. All audio is synthesized locally:
 * melodic brass-like voices, a gold bell shimmer, and a short arena-clap flourish.
 * No streaming, external audio assets, or third-party licensing.
 */
function getAudioContext():AudioContext|null{
 if(typeof window==='undefined'||!window.AudioContext)return null;
 return sharedContext??(sharedContext=new window.AudioContext());
}
// Called synchronously on the user's Finish click, before awaiting the save API.
// This lets browsers unlock audio even when the network request takes time.
export function unlockGameAudio():void{
 try{
  const ctx=getAudioContext();
  if(!ctx)return;
  if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
  const silent=ctx.createOscillator();
  const gain=ctx.createGain();
  gain.gain.value=0.00001;
  silent.connect(gain).connect(ctx.destination);
  silent.start();silent.stop(ctx.currentTime+.015);
 }catch{/* Optional audio must never interrupt a match. */}
}
let previousVictoryGain:GainNode|null=null;
function victoryFanfare(ctx:AudioContext,at:number):void{
 const limiter=ctx.createDynamicsCompressor();
 limiter.threshold.value=-17;
 limiter.knee.value=16;
 limiter.ratio.value=3.5;
 limiter.attack.value=.006;
 limiter.release.value=.22;
 const master=ctx.createGain();
 master.gain.setValueAtTime(.82,at);
 master.connect(limiter).connect(ctx.destination);
 // Replaying the fanfare gently fades the last one instead of stacking volume.
 if(previousVictoryGain){
  const previous=previousVictoryGain;
  previous.gain.cancelScheduledValues(at);
  previous.gain.setTargetAtTime(.0001,at,.07);
 }
 previousVictoryGain=master;
 const voice=(start:number,freq:number,duration:number,level:number,type:OscillatorType='triangle',detune=0)=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,start);
  osc.detune.value=detune;
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.linearRampToValueAtTime(level,start+.022);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level*.57),start+.12);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain).connect(master);
  osc.start(start);osc.stop(start+duration+.03);
 };
 // A custom uplifting major-key tune, brighter and longer than the old three-beep cue.
 const melody=[
  [392.00,0,.23],[523.25,.16,.25],[659.25,.34,.28],[783.99,.53,.27],
  [1046.50,.76,.43],[987.77,1.03,.20],[1174.66,1.22,.22],[1318.51,1.47,.90]
 ];
 melody.forEach(([freq,t,d],i)=>{
  voice(at+t,freq,d,i===melody.length-1?.092:.075,'triangle');
  voice(at+t+.008,freq/2,Math.max(.18,d-.03),.027,'sawtooth',4);
 });
 // Rich, resolved major chord underpinning the celebration.
 [523.25,659.25,783.99,1046.50].forEach((freq,i)=>{
  voice(at+1.58,freq,1.32,i===3?.061:.044,'triangle');
  voice(at+1.60,freq*1.001,1.15,.019,'sine');
 });
 // High shimmering bell accents at the end of the flourish.
 [1046.50,1318.51,1567.98,2093].forEach((freq,i)=>{
  voice(at+1.92+i*.16,freq,.63,.035,'sine');
  voice(at+1.94+i*.16,freq*2,.27,.012,'sine');
 });
 // Low impact accent, followed by an airy confetti sweep.
 voice(at,196,.32,.095,'triangle');
 voice(at+1.57,261.63,.42,.082,'triangle');
 // Synthetic stadium applause: rhythmically gated and high-pass filtered noise.
 const length=Math.floor(ctx.sampleRate*2.65);
 const applause=ctx.createBuffer(1,length,ctx.sampleRate),samples=applause.getChannelData(0);
 for(let i=0;i<length;i++){
  const t=i/ctx.sampleRate;
  const clapBeat=Math.pow(Math.max(0,Math.sin(t*2*Math.PI*12.2)),10);
  const burst=(.12+.88*clapBeat)*(t<.28?t/.28:t>2.18?Math.max(0,(2.65-t)/.47):1);
  samples[i]=(Math.random()*2-1)*burst;
 }
 const crowd=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),crowdGain=ctx.createGain();
 crowd.buffer=applause;
 filter.type='highpass';filter.frequency.value=1250;
 crowdGain.gain.setValueAtTime(.0001,at+.18);
 crowdGain.gain.linearRampToValueAtTime(.032,at+.5);
 crowdGain.gain.setValueAtTime(.031,at+2.1);
 crowdGain.gain.exponentialRampToValueAtTime(.0001,at+2.82);
 crowd.connect(filter).connect(crowdGain).connect(master);
 crowd.start(at+.18);crowd.stop(at+2.85);
 // Close gracefully: no lingering hiss, and no harsh digital clipping.
 master.gain.setValueAtTime(.82,at+2.95);
 master.gain.exponentialRampToValueAtTime(.0001,at+3.6);
}

export function playGameSound(kind:GameSound):void {
 // Browser audio requires a user gesture. Call only from result-confirm / finish clicks.
 try {
  const ctx=getAudioContext();
  if(!ctx)return;
  if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
  const at=ctx.currentTime+.018;
  if(kind==='win'){
   victoryFanfare(ctx,at);
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
  }else if(kind==='question'){
   // New question fetched successfully from the live game server.
   tone(ctx,at,392,.14,.028,'triangle',530);
   tone(ctx,at+.10,659.25,.21,.035,'sine');
  }else if(kind==='reveal'){
   // Light two-tone answer reveal.
   tone(ctx,at,587.33,.16,.032,'triangle');
   tone(ctx,at+.125,783.99,.29,.04,'sine');
  }else if(kind==='correct'){
   // Points awarded; softer than the final victory fanfare.
   tone(ctx,at,523.25,.12,.032,'triangle');
   tone(ctx,at+.105,783.99,.23,.046,'triangle');
  }else if(kind==='next'){
   // No correct answer: gentle turn signal.
   tone(ctx,at,330,.17,.023,'sine',260);
  }
 }catch{/* Sound is optional; it must never interrupt gameplay. */}
}
