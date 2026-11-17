import {useEffect,useState,type ReactNode} from 'react';
import './live-match.css';
import {API_BASE,ApiError,type PublicCategory} from './api';
import {gameApi,type GameProgress,type MatchRecord,type OpenedQuestion} from './liveApi';
import {HELPS,makeCells,type Cell,type HelpId} from './data';
import {playGameSound,unlockGameAudio} from './sfx';
type Stage='categories'|'teams'|'board'|'question'|'reveal'|'result';
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
 const [stage,setStage]=useState<Stage>('categories');
 const [targetCount,setTargetCount]=useState<2|4|6|8>(4);
 const [selectedCategoryIds,setSelectedCategoryIds]=useState<string[]>([]);
 const [names,setNames]=useState<[string,string]>(['الفريق الأول','الفريق الثاني']);
 const [helps,setHelps]=useState<HelpSelection>([[],[]]);
 const [usedHelps,setUsedHelps]=useState<HelpSelection>([[],[]]);
 const [scores,setScores]=useState<[number,number]>([0,0]);
 const [celebrationScores,setCelebrationScores]=useState<[number,number]>([0,0]);
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
 const testMode=targetCount===2;
 const categoryList=categories.filter(c=>selectedCategoryIds.includes(c.id));
 const selectCategory=(id:string)=>{
  setSelectedCategoryIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length>=targetCount?prev:[...prev,id]);
 };
 const changeTargetCount=(count:2|4|6|8)=>{
  setTargetCount(count);setSelectedCategoryIds(ids=>ids.slice(0,count));
 };
 const currentProgress=(id:string)=>progress.find(x=>x.id===id);
 const canStart=categoryList.length===targetCount&&categoryList.every(x=>(currentProgress(x.id)?.remainingGames||0)>0)&&
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
 useEffect(()=>{
  if(stage!=='result')return;
  if(typeof window==='undefined')return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   setCelebrationScores(scores);
   return;
  }
  const begin=performance.now();
  let frame=0;
  const animate=(now:number)=>{
   const t=Math.min(1,(now-begin)/1350);
   const ease=1-Math.pow(1-t,3);
   setCelebrationScores([Math.round(scores[0]*ease),Math.round(scores[1]*ease)]);
   if(t<1)frame=window.requestAnimationFrame(animate);
  };
  setCelebrationScores([0,0]);
  frame=window.requestAnimationFrame(animate);
  return()=>window.cancelAnimationFrame(frame);
 },[stage,scores[0],scores[1]]);
 const finish=async()=>{
  if(!matchId||busy||!window.confirm('إنهاء المباراة وإظهار النتيجة؟'))return;
  // Unlock audio in the direct click before the asynchronous save.
  if(soundEnabled&&scores[0]!==scores[1])unlockGameAudio();
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
 const winnerIndex=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);
 const playAgain=()=>{
  setMatchId(null);setFinished(false);setPrevious(null);setUsedCells([]);
  setUsedHelps([[],[]]);setScores([0,0]);setTurn(0);setActiveCell(null);
  setQuestion(null);setAnswer('');setSourceUrl('');setRevealedCell(null);
  setRestOwner(null);setActiveHelp(null);setChoice('unset');setError('');
  setStage('teams');void refresh();
 };
 return <main className="live-match" dir="rtl">
 <div className="live-header"><div><span className="live-eyebrow">بلّشها / سين جيم / أسئلة Neon الحقيقية</span><h1>{stage==='categories'?'اختار التصنيفات':stage==='teams'?'جهّز الفرق':stage==='board'?'لوحة المباراة':stage==='result'?'نهاية المباراة':'السؤال الحالي'}</h1></div><button className="btn btn-outline" disabled={busy} onClick={()=>void quit()}>{stage==='result'?'العودة للتصنيفات':'العودة وإلغاء المباراة'}</button></div>
 {testMode&&<p className="live-test-note">نسخة اختبار بتصنيفين. كل سؤال تفتحه يُحسب على حسابك فعلًا.</p>}
 {error&&<div className="live-error" role="alert">{error} <button type="button" onClick={()=>setError('')}>×</button></div>}
 {loading&&<p role="status">جارٍ تحميل رصيد أسئلتك من Neon...</p>}
 {stage==='categories'&&!loading&&<section className="live-panel live-picker-panel">
   <h2>اختار عدد التصنيفات</h2>
   <p>اختار 4 تصنيفات من التصنيفات الجاهزة. ممكن تختار تصنيفين بوضع الاختبار. كل تصنيف فيه 6 أسئلة بالمباراة.</p>
   <div className="live-count-options">
    {([4,6,8] as const).map(count=><button key={count} type="button" disabled={categories.length<count} aria-pressed={targetCount===count} className={targetCount===count?'live-count-active':''} onClick={()=>changeTargetCount(count)}>
      {num(count)} تصنيفات{categories.length<count?' — غير متاحة بعد':''}
    </button>)}
    <button type="button" aria-pressed={targetCount===2} className={targetCount===2?'live-count-active live-test-option':'live-test-option'} disabled={categories.length<2} onClick={()=>changeTargetCount(2)}>2 تصنيفات — اختبار</button>
   </div>
   <p className="live-picker-count">تم اختيار {num(categoryList.length)} من {num(targetCount)} · التصنيفات الجاهزة: {num(categories.length)}</p>
   <div className="live-selectable-grid">{categories.map(c=>{
    const selected=selectedCategoryIds.includes(c.id);
    const balance=currentProgress(c.id);
    const games=balance?.remainingGames;
    const disabled=games===0||(!selected&&selectedCategoryIds.length>=targetCount);
    return <button type="button" key={c.id} aria-pressed={selected} disabled={disabled} className={'live-selectable-card '+(selected?'live-selected ':'')+(games===0?'live-unavailable':'')} onClick={()=>selectCategory(c.id)}>
      <div className="live-select-cover">{catImage(c)}<span className="live-select-check" aria-hidden="true">{selected?'✓':'+'}</span></div>
      <strong>{c.title_ar}</strong>
      <span className="live-select-balance">{games===undefined?'جارٍ تحميل رصيدك...':games===0?'نفد رصيد الألعاب':'باقي '+num(games)+' لعبة'}</span>
    </button>;
   })}</div>
   <div className="live-picker-actions">
    {btn('التالي: جهّز الفريقين',()=>setStage('teams'),categoryList.length!==targetCount||!categoryList.every(c=>(currentProgress(c.id)?.remainingGames||0)>0))}
   </div>
  </section>}
  {stage==='teams'&&!loading&&<section className="live-panel">
   <button type="button" className="live-picker-back" onClick={()=>setStage('categories')}>← تغيير التصنيفات</button>
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
   <p className="live-board-balance">{currentProgress(c.id)?'باقي '+num(currentProgress(c.id)!.remainingGames)+' لعبة كاملة':'جارٍ تحديث رصيد الألعاب...'}</p>
   <div className="live-question-grid">{makeCells(c.id).sort((a,b)=>a.points-b.points).map(cell=><button key={cell.id} type="button" disabled={busy||usedCells.includes(cell.id)}
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
 {stage==='result'&&<section className={'live-result live-panel '+(winnerIndex===null?'live-draw-result':'')} aria-label="النتيجة النهائية">
   {winnerIndex!==null&&<div className="live-celebration-effects" aria-hidden="true">
     <div className="live-celebration-topline"/>
     <div className="live-stage-lights"><span/><span/><span/><span/><span/></div>
     <div className="live-celebration-sunburst"/>
     <div className="live-streamer live-streamer-one"/><div className="live-streamer live-streamer-two"/>
     <div className="live-streamer live-streamer-three"/><div className="live-streamer live-streamer-four"/>
     <div className="live-star-shower">{Array.from({length:21},(_,i)=><span key={i} style={{
      left:((i*37+11)%94)+'%',top:((i*29+13)%82)+'%',animationDelay:((i*173)%2100)+'ms',fontSize:(12+(i%4)*5)+'px'
     }}>✦</span>)}</div>
     <div className="live-celebration-firework live-firework-1">{Array.from({length:12},(_,i)=><i key={i} style={{transform:'rotate('+(i*30)+'deg) translateY(-45px)'}}/>)}</div>
     <div className="live-celebration-firework live-firework-2">{Array.from({length:12},(_,i)=><i key={i} style={{transform:'rotate('+(i*30)+'deg) translateY(-45px)'}}/>)}</div>
     <div className="live-celebration-firework live-firework-3">{Array.from({length:12},(_,i)=><i key={i} style={{transform:'rotate('+(i*30)+'deg) translateY(-45px)'}}/>)}</div>
    <div className="live-celebration-glow live-glow-right"/><div className="live-celebration-glow live-glow-left"/>
    <div className="live-burst live-burst-right">{Array.from({length:10},(_,i)=><i key={i} style={{transform:'rotate('+(i*36)+'deg) translateY(-46px)'}}/>)}</div>
    <div className="live-burst live-burst-left">{Array.from({length:10},(_,i)=><i key={i} style={{transform:'rotate('+(i*36)+'deg) translateY(-46px)'}}/>)}</div>
    <div className="live-confetti-layer">{Array.from({length:88},(_,i)=><i key={i} className="live-confetti-piece" style={{
       left:((i*43+17)%99)+'%',animationDelay:((i*179)%2700)+'ms',animationDuration:(2400+(i%7)*410)+'ms',
       backgroundColor:['#4058bc','#a99bff','#f3b343','#f29a67','#48bd9d','#fff1a8'][i%6]
    }}/>)}</div>
    <span className="live-party-popper live-party-right">🎉</span><span className="live-party-popper live-party-left">🎊</span>
   </div>}
   <div className="live-result-content">
    <div className="live-victory-emblem">
     {winnerIndex!==null&&<div className="live-victory-orbit" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>}
     <div className="live-win-medallion"><span aria-hidden="true">{winnerIndex===null?'🤝':'🏆'}</span></div>
    </div>
    {winnerIndex!==null&&<div className="live-winner-ribbon"><span aria-hidden="true">✦</span> أبطال الليلة <span aria-hidden="true">✦</span></div>}
    <p className="live-result-kicker">بلّشها • ليلة حماسية</p>
    <h2>{winnerIndex===null?'انتهت بالتعادل!':'مبروك يا '+names[winnerIndex]+'!'}</h2>
    <p className="live-result-subtitle">{winnerIndex===null?'التحدّي كان متكافئًا، والمنافسة أحلى مع بعض.':'مبروك الفوز! استاهلتوا الصدارة والاحتفال.'}</p>
    <div className="live-result-podium" role="group" aria-label="نقاط الفريقين">
     {([0,1] as const).map(i=><div key={i} className={'live-podium-team '+(winnerIndex===null?'live-podium-tie':winnerIndex===i?'live-podium-winner':'live-podium-runner')}>
      <span className="live-podium-status">{winnerIndex===null?'تعادل':winnerIndex===i?'★ الفريق الفائز':'الفريق الآخر'}</span>
      <strong className="live-podium-name">{names[i]}</strong>
      <div className="live-podium-score"><b>{num(celebrationScores[i])}</b><span>نقطة</span></div>
     </div>)}
    </div>
    <p className="live-result-inventory-note">الأسئلة المفتوحة حُفظت على حسابك. رصيد الألعاب المتبقي لكل تصنيف:</p>
    <div className="live-result-balances">{categoryList.map(c=><span key={c.id}><b>{c.title_ar}</b> {currentProgress(c.id)?'باقي '+num(currentProgress(c.id)!.remainingGames)+' لعبة':'جارٍ تحديث الرصيد...'}</span>)}</div>
    <div className="live-result-actions">
     {btn('العب مرة ثانية',playAgain)}
     <button className="btn btn-outline" type="button" onClick={onExit}>العودة للتصنيفات</button>
    </div>
    {winnerIndex!==null&&<div className="live-replay-audio">
     {soundEnabled?<button type="button" className="live-sound-replay-btn" onClick={()=>playGameSound('win')}><span aria-hidden="true">🔊</span> اسمع صوت الفوز مرة ثانية</button>:
       <p className="live-audio-muted-note">صوت الفوز مكتوم من إعدادات الصوت في الموقع.</p>}
    </div>}
   </div>
 </section>}
 </main>;
}
