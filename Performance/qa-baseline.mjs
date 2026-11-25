// Baleshhaa: bounded first load baseline. Only explicitly pinned QA URLs.
import {randomUUID,randomBytes} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const QA='br-late-math-b9m0r7gn';
const base=slug=>'https://'+QA+'-'+slug+'.compute.c-7.eu-central-1.aws.neon.tech/api';
const auth=base('baleshhaaapi'), rooms=base('baleshhaarooms'), game=base('baleshhaagame');
const N=5, duration=20000;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const stats={}, created=[], failures=[], sync=[];
let stop=false;
async function api(base,path,tag,token,body,measure=true){
 if(!base.startsWith('https://'+QA+'-'))throw Error('QA-only guard');
 const t=performance.now();let status=0,ok=false;
 try{
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 status=r.status;const d=await r.json();ok=r.ok;
 if(!ok)throw Error(tag+' HTTP '+status+' '+(d?.error?.code||''));
 return d;
 }finally{if(measure){(stats[tag]??=[]).push({ms:Math.round(performance.now()-t),status,ok});}}
}
function verify(c,m){if(!c)throw Error(m)}
async function command(f,cmd,measure=true){
 const rev=f.room.room.revision;
 const n=await api(rooms,'/rooms/'+f.code+'/commands','letters.command',f.host,{commandId:randomUUID(),expectedRevision:rev,command:cmd},measure);
 verify(n.room.code===f.code,'host room mismatch');verify(n.room.revision===rev+1,'revision mismatch');
 f.room=n;return n;
}
async function fixture(){
 const acct=await api(auth,'/auth/register','setup.register',null,{username:'loadqa'+randomBytes(7).toString('hex'),password:'QA!'+randomBytes(20).toString('hex'),displayName:'Load baseline QA'});
 verify(acct.token,'missing host token');
 const room=await api(rooms,'/rooms','setup.create',acct.token,{gameId:'letters',teams:['QA Orange','QA Green'],bestOf:3});
 const f={host:acct.token,room,code:room.room.code};created.push(f);
 const v=await api(rooms,'/rooms/'+f.code+'/join','setup.join',null,{});
 verify(v.viewerToken,'missing viewer token');f.viewer=v.viewerToken;
 await command(f,{kind:'start'},false);
 return f;
}
function recordFailure(e){failures.push(String(e.message||e).slice(0,160));stop=true;}
async function poll(f,kind,interval,end){
 let next=performance.now();
 while(!stop&&performance.now()<end){
 try{
 const v=await api(rooms,'/rooms/'+f.code+'/'+kind,'letters.'+kind,kind==='host'?f.host:f.viewer);
 verify(v.room.code===f.code,'cross-room response');
 if(kind==='viewer'){
 verify(!v.hostState,'host state leaked');verify(!v.state.question||!('answer' in v.state.question),'private answer leaked');
 if(v.state.question&&!v.state.question.revealedAnswer)verify(!JSON.stringify(v.state.question).includes('"answer":'),'private answer leaked');
 if(f.pending&&v.room.revision>=f.pending.rev){sync.push(Math.max(0,Math.round(performance.now()-f.pending.time)));f.pending=null;}
 }
 }catch(e){recordFailure(e);break;}
 next+=interval;await pause(Math.max(0,next-performance.now()));
 }
}
async function play(f,end){
 await pause(1200);
 for(let i=0;i<3&&!stop&&performance.now()<end-2500;i++){
 try{
 const state=f.room.hostState;
 const cell=i===0?state.startingCell:state.owners.findIndex((x,j)=>x===null&&!state.askedCells?.includes(j));
 verify(cell>=0,'no free cell');
 const opened=await command(f,{kind:'open_question',cell});
 verify(opened.hostState.question?.answer,'host missing answer');
 f.pending={rev:opened.room.revision,time:performance.now()};
 await pause(2400);
 if(stop)break;
 const colored=await command(f,{kind:'cycle_cell_color',cell,requireWinConfirmation:true});
 verify(colored.hostState.owners[cell]==='orange','wrong assigned color');
 await pause(1000);
 }catch(e){recordFailure(e);break;}
 }
}
const pct=(a,p)=>a.length?a[Math.ceil(a.length*p)-1]:null;
function summarize(a){const x=a.map(v=>v.ms).sort((a,b)=>a-b);return {n:x.length,failed:a.filter(v=>!v.ok).length,p50:pct(x,.5),p95:pct(x,.95),max:x.at(-1),statuses:a.reduce((o,v)=>(o[v.status]=(o[v.status]||0)+1,o),{})};}
try{
 // Limit fixture registrations and join requests to five total; no rate-limit bypass.
 for(let i=0;i<N;i++)await fixture();
 const start=performance.now(),end=start+duration;
 await Promise.all(created.flatMap(f=>[poll(f,'host',2500,end),poll(f,'viewer',1500,end),play(f,end)]));
 const elapsed=Math.round(performance.now()-start);
 const gameplay=Object.entries(stats).filter(([k])=>k.startsWith('letters.')).flatMap(([,v])=>v);
 const report={qaOnly:true,rooms:created.length,devices:created.length*2,targetDurationMs:duration,elapsedMs:elapsed,api:summarize(gameplay),byEndpoint:Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,summarize(v)])),syncAfterHostResponseMs:{n:sync.length,p95:pct(sync.sort((a,b)=>a-b),.95),max:sync.at(-1)},failures,criteria:{p95Under500:gameplay.length>0&&summarize(gameplay).p95<500,errorsUnder1:gameplay.length>0&&summarize(gameplay).failed/gameplay.length<.01,syncUnder2000:sync.length>0&&pct(sync,.95)<2000}};
 console.log('LOAD_BASELINE_JSON '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}catch(e){console.log('LOAD_SETUP_FAILURE '+String(e.message||e));process.exitCode=1;}
finally{
 for(const f of created){try{const fresh=await api(rooms,'/rooms/'+f.code+'/host','cleanup',f.host,undefined,false);f.room=fresh;if(!['finished','abandoned'].includes(f.room.room.status))await command(f,{kind:'end_match'},false);}catch(e){console.log('QA_CLEANUP_WARNING '+String(e.message||e));}}
}
