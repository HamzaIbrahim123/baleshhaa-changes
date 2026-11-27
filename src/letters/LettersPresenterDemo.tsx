import {HomeBrand} from '../HomeBrand';
/**
 * Bundle 30 — offline presenter flow.
 * Real engine transitions, but example questions and state stay in React only.
 * No auth, API, session storage, local storage or Neon calls.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  bothSurrender, colorForTeam, nextRound, publicState, retrySameCell, startMatch,
} from './engine';
import { presenterCellEnabled, presenterClickCell } from './presenterLocalRules';
import type { DisplayState } from './engine';
import type { BestOf, MatchState, Team } from './engine';
import './LettersDemo.css';
import './LettersPresenterDemo.css';

const SAMPLE_ANSWERS: Record<string, string> = {
  'أ':'أسد','ب':'بحر','ت':'تفاح','ث':'ثعلب','ج':'جبل','ح':'حصان','خ':'خيمة',
  'د':'دراجة','ذ':'ذهب','ر':'رمان','ز':'زيتون','س':'سماء','ش':'شمس',
  'ص':'صقر','ض':'ضفدع','ط':'طائرة','ظ':'ظرف','ع':'عنب','غ':'غزال',
  'ف':'فراشة','ق':'قلم','ك':'كتاب','ل':'ليمون','م':'مدرسة',
  'ن':'نمر','ه':'هلال','و':'وردة','ي':'يد',
};
const stageLabels: Record<MatchState['stage'], string> = {
  lobby: 'بانتظار البداية', playing: 'اختار الحرف', question: 'السؤال مفتوح',
  between_rounds: 'انتهت الجولة', finished: 'انتهت المباراة', abandoned: 'انتهت التجربة',
};
const fmt = (value:number) => value.toLocaleString('ar');

export function LettersPresenterDemo({onBack}:{onBack:()=>void}) {
  const [teamA,setTeamA]=useState('الفريق الأول');
  const [teamB,setTeamB]=useState('الفريق الثاني');
  const [bestOf,setBestOf]=useState<BestOf>(3);
  const [state,setState]=useState<MatchState|null>(null);
  const [askedCells,setAskedCells]=useState<number[]>([]);
  const [focusedCell,setFocusedCell]=useState<number|null>(null);
  const [correctionMode,setCorrectionMode]=useState(false);
  const [showViewer,setShowViewer]=useState(false);
  const sessionId=useRef<string>(crypto.randomUUID());
  const broadcast=useRef<BroadcastChannel|null>(null);
  const currentPublicSnapshot=useRef<DisplayState|null>(null);
  const [error,setError]=useState('');
  const questionCounter=useRef(0);

  const viewer = useMemo(()=>state ? publicState(state) : null,[state]);
  const path=useMemo(()=>new Set(state?.winningPath || []),[state]);
  const matchWinner=state?.winner ?? null;
  const names:[string,string]=state?.teams || [teamA,teamB];
  const clickContext={askedCells,focusedCell,correctionMode};
  const canCorrect=Boolean(state && askedCells.length>=2 &&
    (state.stage==='playing'||state.stage==='question'));

  // Only send the public projection. This never includes an unrevealed answer.
  useEffect(()=>{
    if(typeof window==='undefined'||!('BroadcastChannel' in window))return;
    const room=new BroadcastChannel('baleshhaa:letters-demo:'+sessionId.current);
    broadcast.current=room;
    room.onmessage=(message:MessageEvent)=>{
      if(message.data?.kind==='viewer-ready'){
        room.postMessage({kind:'snapshot',payload:currentPublicSnapshot.current});
      }
    };
    return ()=>{room.close();broadcast.current=null;};
  },[]);
  useEffect(()=>{
    currentPublicSnapshot.current=viewer;
    broadcast.current?.postMessage({kind:'snapshot',payload:viewer});
  },[viewer]);

  function previewLink():string {
    if(typeof window==='undefined')return '#';
    const url=new URL(window.location.href);
    url.searchParams.delete('display');
    url.searchParams.delete('room');
    // Static Figma-site hosts handle hash fragments without server-side routing.
    url.searchParams.delete('lettersPreview');
    url.hash=new URLSearchParams({lettersPreview:sessionId.current}).toString();
    return url.toString();
  }

  function update(run:(current:MatchState)=>MatchState) {
    if(!state) return;
    try {
      const next=run(state);
      setState(next);
      setError('');
      if(next.round!==state.round){
        setAskedCells([]);setFocusedCell(null);setCorrectionMode(false);
      }
      if(next.stage==='finished'||next.stage==='between_rounds')setCorrectionMode(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر تنفيذ الحركة التجريبية.');
    }
  }

  function mockQuestion(letter:string) {
    questionCounter.current += 1;
    return {
      id:'offline-test-'+questionCounter.current,
      letter,
      text:'اذكر اسم شيء يبدأ بحرف «'+letter+'». (سؤال تجريبي)',
      answer:SAMPLE_ANSWERS[letter] || letter,
    };
  }

  function start() {
    if(!teamA.trim() || !teamB.trim()) {
      setError('اكتب اسمَي الفريقين أولًا.');
      return;
    }
    try {
      setState(startMatch('offline-demo-match', [teamA.trim(),teamB.trim()], bestOf, Math.random));
      questionCounter.current=0;
      setAskedCells([]);setFocusedCell(null);setCorrectionMode(false);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر بدء التجربة.');
    }
  }

  function chooseCell(cell:number) {
    if(!state) return;
    try{
      const result=presenterClickCell(state,cell,clickContext,mockQuestion);
      if(result.match===state)return;
      setState(result.match);
      setAskedCells(result.askedCells);
      setFocusedCell(result.focusedCell);
      if(result.match.stage==='finished'||result.match.stage==='between_rounds')setCorrectionMode(false);
      setError('');
    }catch(cause){
      setError(cause instanceof Error?cause.message:'تعذّر تنفيذ الحركة التجريبية.');
    }
  }

  function reset() {
    setState(null);
    setAskedCells([]);setFocusedCell(null);setCorrectionMode(false);
    setShowViewer(false);
    setError('');
  }

  return <section className="letters-demo letters-presenter" dir="rtl" aria-labelledby="letters-presenter-title">
    <div className="letters-demo__top">
      <button type="button" className="letters-demo__ghost" onClick={onBack}>الرجوع للعبة الحروف</button>
      <HomeBrand>⬡ بلّشها* / تجربة المقدّم</HomeBrand>
    </div>
    <header className="letters-demo__intro">
      <span>محاكاة محلية • لا حساب ولا غرفة ولا قاعدة بيانات</span>
      <h1 id="letters-presenter-title">تجربة دور المقدّم</h1>
      <p>جرب لعبة كاملة من دور المقدّم. كل حرف يُفتح سؤاله <b>مرة واحدة فقط في الجولة</b>، وبعدها تقدر تلوّنه وتصحّحه بدون إعادة السؤال. وتقدر تفتح شاشة عرض ثانية للمشاهدة، على نفس الموقع والمتصفح. الأسئلة <b>أمثلة مؤقتة</b>.</p>
    </header>
    {error && <div className="letters-presenter__error" role="alert">{error}</div>}

    {!state ? <div className="letters-demo__panel letters-presenter__setup">
      <h2>جهّز مباراة تجريبية</h2>
      <div className="letters-presenter__fields">
        <label>اسم الفريق الأول<input maxLength={45} value={teamA} onChange={e=>setTeamA(e.target.value)}/></label>
        <label>اسم الفريق الثاني<input maxLength={45} value={teamB} onChange={e=>setTeamB(e.target.value)}/></label>
      </div>
      <fieldset className="letters-presenter__formats"><legend>عدد الجولات</legend>
        {([1,3,5] as BestOf[]).map(value=><label key={value}>
          <input type="radio" name="mock-best-of" checked={bestOf===value} onChange={()=>setBestOf(value)}/>
          {value===1?'جولة واحدة':'أفضل من '+fmt(value)}
        </label>)}
      </fieldset>
      <button type="button" className="letters-demo__primary letters-presenter__start" onClick={start}>ابدأ تجربة المقدّم</button>
      <p>لا يتم إنشاء غرفة حقيقية أو إرسال أي بيانات. تجربة محلية داخل المتصفح فقط.</p>
    </div> : <>
      <div className="letters-presenter__score-head">
        <span>الجولة {fmt(state.round)} من {fmt(state.bestOf)} • {stageLabels[state.stage]}</span>
        <button type="button" className="letters-demo__ghost" onClick={reset}>تجربة جديدة</button>
      </div>
      <div className="letters-presenter__teams">
        {([0,1] as Team[]).map(team=><div key={team} className={'letters-presenter__team letters-presenter__team--'+colorForTeam(team,state.round)}>
          <span>{names[team]}</span><b>{fmt(state.wins[team])}</b>
          <small>جولات فاز فيها • {colorForTeam(team,state.round)==='orange'?'برتقالي (يمين/يسار)':'أخضر (فوق/تحت)'}</small>
        </div>)}
      </div>
      {(state.stage==='playing'||state.stage==='question')&&<div className="letters-presenter__toolbar">
        {canCorrect&&<button type="button" className="letters-demo__ghost"
          aria-pressed={correctionMode}
          onClick={()=>setCorrectionMode(v=>!v)}>
          {correctionMode?'إنهاء التعديل':'تعديل خلية سابقة'}
        </button>}
        <span>{correctionMode?
          'وضع التعديل: اختار خلية من الأسئلة السابقة لتصحيح لونها (برتقالي ← أخضر ← محايد). السؤال الحالي يظل كما هو.':
          state.stage==='question'?
            (state.question?.revealed?
              'تم كشف الإجابة. اختار «سؤال جديد لنفس الحرف» لاستكمال هذه الخلية.' :
              'السؤال مفتوح. اضغط نفس الحرف لتلوينه برتقالي، ثم أخضر، ثم محايد.'):
          focusedCell!==null && state.owners[focusedCell]===null?
            'الخلية الحالية محايدة: لازم ترجع تحددها برتقالي أو أخضر قبل فتح حرف جديد.' :
          state.turn===null?
            'ابدأ بالحرف المضيء العشوائي. الكبسة الأولى تفتح سؤاله.' :
            'اختار حرفًا جديدًا لفتح سؤاله؛ الخلايا السابقة تتعدل من زر «تعديل خلية سابقة».'}</span>
      </div>}
      <div className="letters-demo__columns letters-presenter__columns">
        <section className="letters-demo__panel" aria-label="لوحة الحروف التجريبية">
          <div className="letters-demo__board-wrap">
            <span className="letters-demo__direction letters-demo__direction--top">أعلى ↑</span>
            <span className="letters-demo__direction letters-demo__direction--right">يمين</span>
            <div className="letters-demo__board" role="group" aria-label="شبكة الحروف">
              {Array.from({length:5},(_,row)=><div className="letters-demo__row" key={row}>
                {Array.from({length:5},(_,col)=>{
                  const i=row*5+col;
                  const owner=state.owners[i];
                  const opening=state.turn===null && state.stage==='playing' && state.startingCell===i;
                  const active=state.currentCell===i || (focusedCell===i && state.owners[i]===null);
                  const available=presenterCellEnabled(state,i,clickContext);
                  return <button type="button" key={i} disabled={!available}
                    onClick={()=>chooseCell(i)}
                    className={'letters-demo__hex letters-demo__hex--'+(owner||'empty')+
                    (path.has(i)?' letters-demo__hex--winning':'')+
                    (active||opening?' letters-demo__hex--active':'')}
                    aria-label={'الحرف '+state.letters[i]+(opening?'، الحرف الافتتاحي':'')+
                      (owner?', '+(owner==='orange'?'برتقالي':'أخضر'):'، غير ملوّن')}
                    title={available?(correctionMode?'تصحيح لون خلية سابقة':askedCells.includes(i)?'تغيير لون الخلية دون فتح سؤال جديد':'فتح سؤال الحرف لأول مرة'):'الخلية غير متاحة الآن'}>
                    <span>{state.letters[i]}</span>{path.has(i)&&<span className="letters-demo__star" aria-hidden="true">★</span>}
                  </button>;
                })}
              </div>)}
            </div>
            <span className="letters-demo__direction letters-demo__direction--left">يسار</span>
            <span className="letters-demo__direction letters-demo__direction--bottom">↓ أسفل</span>
          </div>
          {state.stage==='playing'&&<p className="letters-presenter__board-hint">الحرف الجديد يفتح سؤالًا مرة واحدة فقط. إذا رجع الحرف السابق محايد، ضل يغيّر لون بدون إعادة السؤال، وباقي الحروف مقفلة لحد ما تحدد لونه.</p>}
          {(state.stage==='between_rounds'||state.stage==='finished')&&matchWinner!==null&&
            <div className="letters-demo__outcome">
              <h2>🏆 {state.stage==='finished'?'فاز بالمباراة':'فاز بالجولة'}: {names[matchWinner]}</h2>
              <div className="letters-demo__score">
                <div className={'letters-demo__score-card letters-demo__score-card--'+colorForTeam(matchWinner,state.round)}>
                  <span>الفائز</span><b>{names[matchWinner]}</b><small>{fmt(state.wins[matchWinner])} جولات</small>
                </div>
                <div className="letters-demo__score-card letters-demo__score-card--loser">
                  <span>الخاسر</span><b>{names[matchWinner===0?1:0]}</b>
                  <small>{fmt(state.wins[matchWinner===0?1:0])} جولات</small>
                </div>
              </div>
            </div>}
        </section>

        <aside className="letters-demo__panel letters-presenter__controls">
          <h2>لوحة تحكّم المقدّم</h2>
          {state.stage==='playing'&&<>
            <p>أول كبسة على حرف غير مستخدم بتفتح سؤاله مرة واحدة فقط. بعد ذلك الضغط على نفس الحرف يغيّر لونه برتقالي ثم أخضر ثم محايد، بدون إعادة السؤال.</p>
            <div className="letters-presenter__info">الحرف الافتتاحي: <strong>{state.letters[state.startingCell]}</strong>
              {state.turn!==null?' • الدور الآن: '+names[state.turn]:''}</div>
          </>}
          {state.stage==='question'&&state.question&&<>
            <span className="letters-presenter__label">السؤال التجريبي • حرف {state.question.letter}</span>
            <h3 className="letters-presenter__question">{state.question.text}</h3>
            <div className="letters-presenter__secret">
              <small>إجابة مثال • تظهر للمقدّم فقط</small>
              <strong>{state.question.answer}</strong>
            </div>
            {state.question.revealed ? <>
              <div className="letters-presenter__info">انكشف الجواب للمتسابقين. اضغط «سؤال جديد لنفس الحرف» حتى يبدأ سؤال آخر، وبعدين لوّن الخلية حسب نتيجة السؤال الجديد.</div>
              <button type="button" className="letters-demo__primary"
                onClick={()=>update(current=>retrySameCell(current,mockQuestion(current.letters[current.currentCell!])))}>سؤال جديد لنفس الحرف</button>
            </> : <>
              <div className="letters-presenter__info">
                <strong>التحكم من الخلية مباشرة:</strong> اضغط حرف «{state.question.letter}» مرة ثانية ليصير <b>برتقالي</b>،
                وبعدها كبسة ليصير <b>أخضر</b>، وبعدها كبسة يرجع <b>محايد</b>.
                إذا رجع محايد، الكبسة التالية بتعيده برتقالي <b>بدون عرض السؤال مرة ثانية</b>. ما بتقدر تفتح حرف آخر لحد ما تعطي الحالي لونًا.
              </div>
              <button type="button" className="letters-demo__ghost"
                onClick={()=>update(current=>bothSurrender(current))}>استسلام الفريقين / كشف الإجابة</button>
            </>}
          </>}
          {state.stage==='between_rounds'&&<>
            <p>انتهت الجولة وحُسبت النتيجة. رح تتبدّل ألوان الفريقين في الجولة التالية.</p>
            <button type="button" className="letters-demo__primary" onClick={()=>update(current=>nextRound(current,Math.random))}>ابدأ الجولة التالية</button>
          </>}
          {state.stage==='finished'&&<>
            <p>اكتملت المباراة التجريبية. النتيجة والفائز والخاسر ظاهرين على اللوحة.</p>
            <button type="button" className="letters-demo__primary" onClick={reset}>ابدأ مباراة تجريبية جديدة</button>
          </>}
          <a className="letters-demo__primary letters-presenter__open-viewer" href={previewLink()}
            target="_blank" rel="noopener noreferrer">فتح شاشة المتسابقين في تبويب جديد</a>
          <p className="letters-presenter__viewer-note">الشاشة الثانية متزامنة مع المقدّم داخل نفس المتصفح والموقع فقط. هذا اختبار بدون إنشاء غرفة أو Neon.</p>
          <button type="button" className="letters-demo__ghost letters-presenter__viewer-toggle" aria-pressed={showViewer}
            onClick={()=>setShowViewer(value=>!value)}>
            {showViewer?'إخفاء معاينة المتسابقين':'معاينة شاشة المتسابقين'}
          </button>
          {showViewer&&viewer&&<div className="letters-presenter__viewer">
            <strong>👁 معاينة المتسابقين</strong>
            <p>{viewer.question?.text || stageLabels[viewer.stage]}</p>
            <small>{viewer.question?.revealedAnswer ?
              'الإجابة المكشوفة: '+viewer.question.revealedAnswer :
              viewer.question ? 'الإجابة مخفية عن المتسابقين' : 'بانتظار السؤال'}</small>
          </div>}
          <div className="letters-demo__hint">كل الخطوات هون تتم في المتصفح، باستخدام قواعد اللعبة نفسها. ما في غرف فعلية أو أسئلة منشورة.</div>
        </aside>
      </div>
    </>}
  </section>;
}
