import {useEffect,useState,type ReactNode} from 'react';
import './live-match.css';
import {API_BASE,ApiError,type PublicCategory} from './api';
import {gameApi,type GameProgress,type MatchRecord,type OpenedQuestion} from './liveApi';
import {HELPS,makeCells,type Cell,type HelpId} from './data';
import {playGameSound} from './sfx';
type Stage='teams'|'board'|'question'|'reveal'|'result';
type TeamIndex=0|1;
type Choice=TeamIndex|null|'unset';
type HelpSelection=[HelpId[],HelpId[]];
const helpers:HelpId[]=['friend','pit','two','rest','trap'];
const helperNames:Record<HelpId,string>={friend:'اتصال بصديق',pit:'الحفرة',two:'جاوب جوابين',rest:'استريح',trap:'الفخ'};
const num=(n:number)=>n.toLocaleString('en-US');
function HelpIcon({id}:{id:HelpId}){
 const paths:Record<HelpId,ReactNode>={
 friend:<path d="M6 3H4a2 2 0 0 0-2 2c0 9.4 7.6 17 17 17a2 2 0 0 0 2-2v-2l-5-3-2 2a14 14 0 0 1-7-7l2-2-3-5Z"/>,
 pit:<><ellipse cx="12" cy="18" rx="8.5" ry="3.1"/><path d="M12 3v10m-4-4 4 4 4-4"/></>,
 two:<><path d="M5 20v-6a2 2 0 0 1 4 0v1V5a2 2 0 0 1 4 0v8-9a2 2 0 0 1 4 0v11l1-2a2 2 0 0 1 3 2l-3 6H8a4 4 0 0 1-3-1Z"/><path d="M9 15v-2"/></>,
 rest:<path d="M7 3v10M11 4v8M15 6v6M18 10v3c0 5-3 8-7 8S4 18 4 14v-4a2 2 0 0 1 3 0"/>,
 trap:<><circle cx="11.5" cy="14" r="7.2"/><path d="M11.5 6.8V4.5h3.3l2-2M18.5 5l2 2"/></>
 };
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[id]}</svg>;
}
export default function LiveMatch({categories,onExit,soundEnabled}:{categories:PublicCategory[];onExit:()=>void;soundEnabled:boolean}){
 const [stage,setStage]=useState<Stage>('teams');
 const [names,setNames]=useState<[string,string]>(['الفريق الأول','الفريق الثاني']);
 const [helps,setHelps]=useState<HelpSelection>([[],[]]);
 const [usedHelps,setUsedHelps]=useState<HelpSelection>([[],[]]);
 const [scores,setScores]=useState<[number,number]>([0,0]);
 const [turn,setTurn]=useState<TeamIndex>(0);
 const [usedCells,setUsedCells]=useState<string[]>([]);
 const [activeHelp,setActiveHelp]=useState<HelpId|null>(null);
 const [restOwner,setRestOwner]=useState<TeamIndex|null>(null);
 const [activeCell,setActiveCell]=useState<Cell|null>(null);
 const [question,setQuestion]=useState<OpenedQuestion|null>(null);
 const [answer,setAnswer]=useState('');
 const [revealedCell,setRevealedCell]=useState<string|null>(null);
 const [sourceUrl,setSourceUrl]=useState('');
 const [choice,setChoice]=useState<Choice>('unset');
 const [matchId,setMatchId]=useState<string|null>(null);
 const [previous,setPrevious]=useState<MatchRecord|null>(null);
 const [progress,setProgress]=useState<GameProgress[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [finished,setFinished]=useState(false);
 const opponent=(1-turn) as TeamIndex;
 const testMode=categories.length===2;
 const categoryList=categories;
 const currentProgress=(id:string)=>progress.find(x=>x.id===id);
 const canStart=categoryList.length>0&&categoryList.every(x=>(currentProgress(x.id)?.remainingGames||0)>0)&&
   names.every(x=>x.trim().length>0)&&helps.every(x=>x.length===3);
 const msg=(e:unknown)=>e instanceof ApiError?e.message:e instanceof Error?e.message:'فشل الاتصال، حاول مجددًا.';
 useEffect(()=>{let mounted=true;Promise.all([gameApi.progress(),gameApi.active()]).then(([p,a])=>{if(mounted){setProgress(p.categories);setPrevious(a.match)}})
 .catch(e=>{if(mounted)setError(msg(e))}).finally(()=>{if(mounted)setLoading(false)});
 return()=>{mounted=false}},[]);
 const refresh=()=>gameApi.progress().then(r=>setProgress(r.categories)).catch(()=>{});
 const setName=(i:TeamIndex,v:string)=>setNames(x=>x.map((n,j)=>i===j?v:n) as [string,string]);
 const toggleHelp=(i:TeamIndex,id:HelpId)=>setHelps(prev=>prev.map((items,j)=>j!==i?items:items.includes(id)?items.filter(x=>x!==id):items.length<3?[...items,id]:items) as HelpSelection);
 const start=async()=>{
  if(!canStart||busy||previous)return;
  setError('');setBusy(true);
  try{
   const r=await gameApi.create({categoryIds:categoryList.map(c=>c.id),teamNames:names,teamHelps:helps,testMode});
   setMatchId(r.match.id);setScores([0,0]);setTurn(0);setUsedCells([]);setUsedHelps([[],[]]);setRestOwner(null);setActiveHelp(null);setStage('board');
  }catch(e){setError(msg(e))}finally{setBusy(false)}
 };
 const abandonExisting=async()=>{
  if(!previous||busy||!window.confirm('إلغاء المباراة القديمة؟ الأسئلة التي انفتحت فيها ستبقى مستهلكة لهذا الحساب، وغير المفتوحة تبقى متاحة.'))return;
  setBusy(true);setError('');
  try{await gameApi.abandon(previous.id);setPrevious(null);await refresh()}catch(e){setError(msg(e))}finally{setBusy(false)}
 };
 const quit=async()=>{
  if(matchId&&!finished){
   if(!window.confirm('إلغاء المباراة الحالية؟ الأسئلة المفتوحة تظل مستهلكة، وغير المفتوحة تبقى متاحة.'))return;
   setBusy(true);
   try{await gameApi.abandon(matchId);setMatchId(null);onExit()}catch(e){setError(msg(e))}finally{setBusy(false)}
  }else onExit();
 };
 const availability=(i:TeamIndex,id:HelpId)=>{
   if(!helps[i].includes(id)||usedHelps[i].includes(id))return false;
   if(id==='rest')return i!==turn&&stage==='board';
   if(i!==turn||(activeHelp!==null&&activeHelp!==id))return false;
   if(id==='pit')return stage==='board';
   return stage==='question' && (!activeCell||revealedCell!==activeCell.id);
 };
 const activate=(i:TeamIndex,id:HelpId)=>{
  if(!availability(i,id))return;
  if(id==='rest'){setRestOwner(v=>v===i?null:i);return}
  setActiveHelp(v=>v===id?null:id);
 };
 const open=async(cell:Cell)=>{
  if(!matchId||busy||usedCells.includes(cell.id))return;
  setBusy(true);setError('');
  try{
   const r=await gameApi.open(matchId,{cellId:cell.id,categoryId:cell.categoryId,points:cell.points});
   setQuestion(r.question);setActiveCell(cell);setRevealedCell(null);setAnswer('');setSourceUrl('');setChoice('unset');setStage('question');
  }catch(e){setError(msg(e))}finally{setBusy(false)}
 };
 const reveal=async()=>{
  if(!matchId||!question||busy)return;setBusy(true);setError('');
  try{
   const r=await gameApi.reveal(matchId,question.cellId);
   setAnswer(r.answer);setSourceUrl(r.sourceUrl);setRevealedCell(question.cellId);setChoice('unset');setStage('reveal');
  }catch(e){setError(msg(e))}finally{setBusy(false)}
 };
 const applyResult=()=>{
  if(!activeCell||!question||choice==='unset')return;
  const points=activeCell.points;
  const next=[...scores] as [number,number];
  if(activeHelp==='trap'){
   next[opponent]+=choice===opponent?points:-points;
   if(choice!==opponent&&soundEnabled)playGameSound('trap');
  }else if(choice!==null){
   next[choice]+=points;
   if(activeHelp==='pit'&&choice===turn){next[opponent]-=points;if(soundEnabled)playGameSound('pit');}
  }
  setScores(next);
  setUsedHelps(prev=>prev.map((list,i)=>[...new Set([...list,...(i===turn&&activeHelp?[activeHelp]:[]),...(i===restOwner?['rest' as HelpId]:[])])]) as HelpSelection);
  setUsedCells(v=>[...v,activeCell.id]);setTurn(opponent);setRestOwner(null);setActiveHelp(null);setActiveCell(null);setQuestion(null);setRevealedCell(null);setAnswer('');setStage('board');
  void refresh();
 };
 const finish=async()=>{
  if(!matchId||busy||!window.confirm('إنهاء المباراة وإظهار النتيجة؟'))return;
  setBusy(true);setError('');
  try{await gameApi.finish(matchId,scores);setFinished(true);setStage('result');
    if(scores[0]!==scores[1]&&soundEnabled)playGameSound('win');
    await refresh();
  }catch(e){setError(msg(e))}finally{setBusy(false)}
 };
 const helpBar=(i:TeamIndex)=><div className="live-team-card" key={i}>
  <div className="live-team-heading"><strong>{names[i]}</strong><div className="live-score"><button disabled={busy} aria-label="خصم 200" onClick={()=>setScores(s=>s.map((x,j)=>j===i?x-200:x) as [number,number])}>−</button><b>{num(scores[i])}</b><button disabled={busy} aria-label="إضافة 200" onClick={()=>setScores(s=>s.map((x,j)=>j===i?x+200:x) as [number,number])}>+</button></div></div>
  <div className="live-helps">{helps[i].map(id=>{
   const used=usedHelps[i].includes(id),enabled=availability(i,id),chosen=(id==='rest'?restOwner===i:activeHelp===id&&i===turn);
   return <button type="button" key={id} disabled={!enabled||busy} aria-pressed={chosen} title={used?'تم استخدامها':id==='rest'||id==='pit'?'قبل فتح السؤال':'بعد فتح السؤال وقبل الإجابة'}
    className={'live-help '+(chosen?'chosen ':'')+(used?'used':'')} onClick={()=>activate(i,id)}>
    <span className="live-help-icon"><HelpIcon id={id}/></span><small>{helperNames[id]}</small></button>
  })}</div></div>;
 const catImage=(c:PublicCategory)=><div className="catalogue-cover live-category-image"><img src={API_BASE+c.imageUrl} alt={'رسم توضيحي لتصنيف '+c.title_ar}/></div>;
 const btn=(label:string,cb:()=>void,disabled=false)=><button className="btn btn-primary" type="button" disabled={disabled||busy} onClick={cb}>{label}</button>;
 const usedCount=usedCells.length,allCells=categoryList.length*6;
 return <main className="live-match" dir="rtl">
 <div className="live-header"><div><span className="live-eyebrow">بلّشها / سين جيم / أسئلة Neon الحقيقية</span><h1>{stage==='teams'?'جهّز الفرق':stage==='board'?'لوحة المباراة':stage==='result'?'نهاية المباراة':'السؤال الحالي'}</h1></div><button className="btn btn-outline" disabled={busy} onClick={()=>void quit()}>{stage==='result'?'العودة للتصنيفات':'العودة وإلغاء المباراة'}</button></div>
 {testMode&&<p className="live-test-note">نسخة اختبار حقيقية بتصنيفين لأن باقي التصنيفات لسه بدون أسئلة. كل سؤال تفتحه يُحسب على حسابك فعلًا.</p>}
 {error&&<div className="live-error" role="alert">{error} <button type="button" onClick={()=>setError('')}>×</button></div>}
 {loading&&<p role="status">جارٍ تحميل رصيد أسئلتك من Neon...</p>}
 {stage==='teams'&&!loading&&<section className="live-panel">
  {previous&&<div className="live-error"><strong>عندك مباراة غير مكتملة</strong><p>لا نبدأ مباراة ثانية قبل تأكيد إلغاء القديمة، حتى ما نخسر أسئلة ما انفتحت.</p>{btn('إلغاء المباراة القديمة',()=>void abandonExisting())}</div>}
  <h2>الفرق ووسائل المساعدة</h2><p>ولا وسيلة مختارة افتراضيًا. كل فريق يختار 3 من 5.</p>
  <div className="live-team-setup">{([0,1] as const).map(i=><div className="live-setup-team" key={i}>
   <label>اسم الفريق {i===0?'الأول':'الثاني'}<input value={names[i]} onChange={e=>setName(i,e.target.value)} maxLength={40}/></label>
   <b>{num(helps[i].length)} من 3 مساعدات</b>
   <div className="live-setup-help-grid">{helpers.map(id=><button type="button" key={id} disabled={!helps[i].includes(id)&&helps[i].length>=3} aria-pressed={helps[i].includes(id)}
    className={'live-help-choice '+(helps[i].includes(id)?'selected':'')} onClick={()=>toggleHelp(i,id)}>
     <HelpIcon id={id}/><span>{helperNames[id]}</span><small>{id==='pit'||id==='rest'?'قبل فتح السؤال':'بعد فتح السؤال'}</small>
   </button>)}</div>
  </div>)}</div>
  <div className="live-ready-list">{categoryList.map(c=><span key={c.id}>{c.title_ar} — {num(currentProgress(c.id)?.remainingGames||0)} مباراة متبقية</span>)}</div>
  {btn(busy?'جارٍ بدء المباراة...':'ابدأ المباراة الحقيقية',()=>void start(),!canStart||!!previous)}
 </section>}
 {stage==='board'&&<><div className="live-stats"><strong>دور: {names[turn]}</strong><span>الأسئلة المفتوحة: {num(usedCount)} من {num(allCells)}</span><span>اختاروا السؤال من أي تصنيف</span></div>
  <div className="live-board">{categoryList.map(c=><article className="live-board-category" key={c.id}>
   {catImage(c)}<h3>{c.title_ar}</h3>
   <div className="live-question-grid">{makeCells(c.id).map(cell=><button key={cell.id} type="button" disabled={busy||usedCells.includes(cell.id)}
   className={usedCells.includes(cell.id)?'spent':''} onClick={()=>void open(cell)}>{num(cell.points)}</button>)}</div>
  </article>)}</div>
  <div className="live-scorebar">{([0,1] as const).map(helpBar)}</div>
  <div className="live-bottom-actions"><span>الحفرة: صاحب الدور قبل السؤال · استريح: الخصم قبل السؤال · باقي المساعدات بعد فتحه</span>{btn('إنهاء المباراة',()=>void finish())}</div>
 </>}
 {(stage==='question'||stage==='reveal')&&question&&<><div className="live-question-box">
  <div className="live-question-meta"><span>{categoryList.find(c=>c.id===question.categoryId)?.title_ar}</span><strong>{num(question.points)} نقطة</strong></div>
  <h2>{question.text}</h2>
  {stage==='reveal'?<div className="live-answer"><small>الإجابة الصحيحة</small><h3>{answer}</h3>{sourceUrl?.startsWith('https://')&&<a href={sourceUrl} target="_blank" rel="noopener noreferrer">مصدر السؤال</a>}</div>:<div className="live-answer-hidden">الإجابة مخفية — جاوبوا شفهيًا قبل كشفها.</div>}
  {activeHelp==='trap'&&<p className="live-test-note">الفخ على {names[opponent]}: إذا جاوب صح +{num(question.points)}، وإذا غلط −{num(question.points)}.</p>}
 </div>
 {stage==='reveal'&&<section className="live-panel"><h2>{activeHelp==='trap'?'هل '+names[opponent]+' جاوب صح؟':'مين جاوب صح؟'}</h2>
  <div className="live-result-choices">
   {activeHelp==='trap'?<>
    <button className={choice===opponent?'selected':''} aria-pressed={choice===opponent} onClick={()=>setChoice(opponent)}>نعم، جاوب صح</button>
    <button className={choice===null?'selected':''} aria-pressed={choice===null} onClick={()=>setChoice(null)}>لا، جاوب غلط</button>
   </>:<>{([0,1] as const).map(i=><button key={i} className={choice===i?'selected':''} aria-pressed={choice===i} onClick={()=>setChoice(i)}>{names[i]}</button>)}
     <button className={'live-none '+(choice===null?'selected':'')} aria-pressed={choice===null} onClick={()=>setChoice(null)}>لا أحد</button></>}
  </div>
 </section>}
 <div className="live-scorebar">{([0,1] as const).map(helpBar)}</div>
 <div className="live-bottom-actions">
  {stage==='reveal'&&<button className="btn btn-outline" type="button" onClick={()=>setStage('question')} disabled={busy}>العودة للسؤال</button>}
  {stage==='question'?btn(busy?'جارٍ كشف الإجابة...':'اكشف الإجابة',()=>void reveal()):btn('تأكيد النتيجة ومتابعة',applyResult,choice==='unset')}
 </div></>}
 {stage==='result'&&<section className="live-result live-panel">
   <div className="live-result-trophy">🏆</div><h2>{scores[0]===scores[1]?'انتهت المباراة بالتعادل':names[scores[0]>scores[1]?0:1]+' هو الفائز!'}</h2>
   <p>{names[0]}: {num(scores[0])} نقطة</p><p>{names[1]}: {num(scores[1])} نقطة</p>
   <p>الأسئلة التي ظهرت محفوظة كمستخدمة لحسابك؛ الأسئلة غير المفتوحة ما زالت متاحة.</p>
   {btn('العودة للتصنيفات',onExit)}
 </section>}
 </main>;
}
