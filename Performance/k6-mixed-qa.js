import http from 'k6/http';
import { sleep, check } from 'k6';
import exec from 'k6/execution';
import { Trend, Counter } from 'k6/metrics';
import { randomBytes } from 'k6/crypto';

const qa='br-late-math-b9m0r7gn';
const base=slug=>'https://'+qa+'-'+slug+'.compute.c-7.eu-central-1.aws.neon.tech/api';
const auth=base('baleshhaaapi'), game=base('baleshhaagame'), rooms=base('baleshhaarooms');
const latency=new Trend('game_api_ms',true);
const completed=new Counter('completed_players');
const integrity=new Counter('integrity_failures');
const setupN=10, roomN=5;
const bounds={executor:'per-vu-iterations',iterations:1,maxDuration:'38s',gracefulStop:'0s'};
export const options={
  setupTimeout:'150s',teardownTimeout:'150s',
  scenarios:{
    seen_only:{...bounds,vus:10,exec:'seen',startTime:'0s'},
    seen_mixed:{...bounds,vus:10,exec:'seen',startTime:'42s'},
    letters_host:{...bounds,vus:5,exec:'host',startTime:'42s'},
    letters_viewer:{...bounds,vus:5,exec:'viewer',startTime:'42s'}
  },
  thresholds:{
    'http_req_failed{phase:seen_only}':[{threshold:'rate<0.01',abortOnFail:true,delayAbortEval:'38s'}],
    'game_api_ms{phase:seen_only}':[{threshold:'p(95)<500',abortOnFail:true,delayAbortEval:'38s'}],
    'http_req_failed{phase:mixed}':['rate<0.01'],
    'game_api_ms{phase:mixed}':['p(95)<500'],
    'completed_players{scenario:seen_only}':['count==10'],
    'completed_players{scenario:seen_mixed}':['count==10'],
    'completed_players{scenario:letters_host}':['count==5'],
    'completed_players{scenario:letters_viewer}':['count==5'],
    'integrity_failures':['count==0'],
    'dropped_iterations':['count==0'],
  },
  summaryTrendStats:['count','avg','min','med','p(90)','p(95)','max'],
  // No tokens or response bodies in logs. URLs are grouped by static endpoint name.
  systemTags:['status','method','name','scenario','expected_response','error_code','group','check'],
};
function hex(n){return Array.from(new Uint8Array(randomBytes(n))).map(x=>x.toString(16).padStart(2,'0')).join('')}
function requireOk(ok,label){if(!check(ok,{[label]:x=>x===true})){integrity.add(1);exec.test.abort('QA integrity/HTTP failure: '+label);throw Error(label)}}
function request(b,path,name,token,body,phase='setup',soft=false){
 if(![auth,game,rooms].includes(b))throw Error('QA only');
 const headers={...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})};
 const tags={name,phase};
 const r=body===undefined?http.get(b+path,{headers,tags,timeout:'7s',redirects:0}):http.post(b+path,JSON.stringify(body),{headers,tags,timeout:'7s',redirects:0});
 if(phase==='seen_only'||phase==='mixed')latency.add(r.timings.duration,tags);
 let d=null;try{d=r.json()}catch(_){}
 if(!soft)requireOk(r.status>=200&&r.status<300&&d!==null,name+' succeeds');
 return {d,status:r.status};
}
function account(){const d=request(auth,'/auth/register','setup.register',null,{username:'k6qa'+hex(8),password:'QA!'+hex(20),displayName:'k6 QA only'}).d;requireOk(Boolean(d.token),'registration token');return d.token;}
function cmd(f,command,phase='setup',soft=false){
 const p='/rooms/'+f.code+'/commands';
 const rev=f.room.room.revision;
 const x=request(rooms,p,'letters.command',f.host,{commandId:hex(4)+'-'+hex(2)+'-4'+hex(2).slice(1)+'-8'+hex(2).slice(1)+'-'+hex(6),expectedRevision:rev,command},phase,soft);
 if(!soft){requireOk(x.d.room.code===f.code&&x.d.room.revision===rev+1,'letters room revision');}
 if(x.status>=200&&x.status<300)f.room=x.d;
 return x;
}
function cleanup(data){
 let closedMatches=0,closedRooms=0,failed=0;
 for(const s of data.seen){
  try{
   const a=request(game,'/player/matches/active','cleanup.active',s.token,undefined,'cleanup',true);
   if(a.status!==200){failed++;continue;}
   if(a.d.match){const id=a.d.match.id;const r=request(game,'/player/matches/'+id+'/abandon','cleanup.abandon',s.token,{},'cleanup',true);if(r.status!==200){failed++;continue;}}
   closedMatches++;
  }catch(_){failed++}
 }
 for(const f of data.letters){
  try{
   const a=request(rooms,'/rooms/'+f.code+'/host','cleanup.host',f.host,undefined,'cleanup',true);
   if(a.status!==200){failed++;continue;}
   f.room=a.d;
   if(!['finished','abandoned'].includes(a.d.room.status)){
    const c=cmd(f,{kind:'end_match'},'cleanup',true);if(c.status!==200){failed++;continue;}
   }
   closedRooms++;
  }catch(_){failed++}
 }
 console.log('K6_CLEANUP '+JSON.stringify({seenAccounts:data.seen.length,seenWithoutActiveMatch:closedMatches,rooms:data.letters.length,closedRooms,failed}));
 if(failed)exec.test.fail('QA cleanup needs review');
}
export function setup(){
 const data={seen:[],letters:[]};
 integrity.add(0);
 try{
  for(let i=0;i<setupN;i++){
   const token=account();const s={token,cats:[]};data.seen.push(s);
   const p=request(game,'/player/progress','setup.progress',token).d;
   s.cats=p.categories.filter(c=>c.remainingGames>=2).slice(0,4).map(c=>c.id);
   requireOk(s.cats.length===4,'four categories available for two QA matches');
  }
  for(let i=0;i<roomN;i++){
   const host=account();
   const r=request(rooms,'/rooms','setup.room',host,{gameId:'letters',teams:['QA Orange','QA Green'],bestOf:3}).d;
   const f={host,code:r.room.code,room:r,viewer:null};data.letters.push(f);
   const v=request(rooms,'/rooms/'+f.code+'/join','setup.join',null,{}).d;f.viewer=v.viewerToken;
   requireOk(Boolean(f.viewer),'viewer token');cmd(f,{kind:'start'});
  }
  console.log('K6_SETUP '+JSON.stringify({seen: data.seen.length,rooms:data.letters.length}));
  return data;
 }catch(e){cleanup(data);throw e}
}
function stagger(i){sleep((i%10)*0.12)}
export function seen(data){
 const i=exec.scenario.iterationInTest;
 const s=data.seen[i], phase=exec.scenario.name==='seen_only'?'seen_only':'mixed';
 stagger(i);
 const progress=request(game,'/player/progress','seen.progress',s.token,undefined,phase).d;
 requireOk(progress.categories.length>=4,'seen category progress');
 const a=request(game,'/player/matches/active','seen.active',s.token,undefined,phase).d;
 requireOk(a.match===null,'no prior active QA match');
 const create=request(game,'/player/matches','seen.create',s.token,{categoryIds:s.cats,teamNames:['QA A','QA B'],teamHelps:[['friend','pit','two'],['friend','rest','trap']],testMode:false},phase).d;
 const id=create.match.id;requireOk(Boolean(id),'match id');
 const picked=new Set();
 for(let j=0;j<4;j++){
   const cat=s.cats[j],pts=[200,400,600,200][j],cell=cat+':A:'+pts;
   sleep(3);
   const q=request(game,'/player/matches/'+id+'/open','seen.open',s.token,{cellId:cell,categoryId:cat,points:pts},phase).d.question;
   requireOk(q&&q.cellId===cell&&q.categoryId===cat&&q.points===pts&&Boolean(q.text)&&!('answer' in q)&&!picked.has(q.id),'valid unrevealed unique question');
   picked.add(q.id);
   sleep(2);
   const reveal=request(game,'/player/matches/'+id+'/reveal','seen.reveal',s.token,{cellId:cell},phase).d;
   requireOk(typeof reveal.answer==='string'&&reveal.answer.length>0,'answer revealed');
 }
 const scores=[600,800];
 const result=request(game,'/player/matches/'+id+'/finish','seen.finish',s.token,{scores},phase).d;
 requireOk(result.ok===true,'match finished');
 const active=request(game,'/player/matches/active','seen.active_after',s.token,undefined,phase).d;
 requireOk(active.match===null,'finished match no longer active');
 completed.add(1);
}
export function host(data){
 const i=exec.scenario.iterationInTest, f=data.letters[i], phase='mixed';
 stagger(i);
 let n=0;const end=Date.now()+30000;
 while(Date.now()<end){
  const started=Date.now();
  const r=request(rooms,'/rooms/'+f.code+'/host','letters.host',f.host,undefined,phase).d;
  requireOk(r.room.code===f.code,'host correct room');f.room=r;
  if(n===0||n===3){
   const state=f.room.hostState;
   const cell=n===0?state.startingCell:state.owners.findIndex((x,j)=>x===null&&j%5>=1&&j%5<=3);
   requireOk(cell>=0,'letters free cell');
   const opened=cmd(f,{kind:'open_question',cell},phase).d;
   requireOk(Boolean(opened.hostState.question.answer),'host can see answer');
  }
  if(n===1||n===4){
   const cell=f.room.hostState.currentCell;
   requireOk(Number.isInteger(cell),'selected cell');
   const colored=cmd(f,{kind:'cycle_cell_color',cell,requireWinConfirmation:true},phase).d;
   requireOk(colored.hostState.owners[cell]==='orange','correct assigned color');
  }
  n++;sleep(Math.max(0.1,(2500-(Date.now()-started))/1000));
 }
 requireOk(n>=5,'host completed planned actions');completed.add(1);
}
export function viewer(data){
 const i=exec.scenario.iterationInTest, f=data.letters[i];stagger(i);
 let rev=-1,n=0,observed=false;const end=Date.now()+30000;
 while(Date.now()<end){
  const started=Date.now();
  const d=request(rooms,'/rooms/'+f.code+'/viewer','letters.viewer',f.viewer,undefined,'mixed').d;
  requireOk(d.room.code===f.code&&!d.hostState&&d.room.revision>=rev,'viewer isolated and nondecreasing revision');
  requireOk(!d.state.question||!('answer' in d.state.question),'private answer not leaked');
  if(d.state.owners.some(x=>x==='orange'))observed=true;
  rev=d.room.revision;n++;sleep(Math.max(.1,(1500-(Date.now()-started))/1000));
 }
 requireOk(n>=5&&observed,'viewer observed a real color update');completed.add(1);
}
export function teardown(data){cleanup(data)}
export function handleSummary(data){
 const metrics={};for(const [k,v] of Object.entries(data.metrics)){
  if(/^(game_api_ms|http_req_failed|http_reqs|completed_players|integrity_failures|dropped_iterations|iterations)(\{|$)/.test(k))metrics[k]={values:v.values,thresholds:v.thresholds};
 }
 return {stdout:'K6_RESULTS '+JSON.stringify(metrics)+'\n','k6-summary.json':JSON.stringify(metrics,null,2)};
}
