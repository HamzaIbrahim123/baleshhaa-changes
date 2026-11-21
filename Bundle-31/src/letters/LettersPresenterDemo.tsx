/**
 * Bundle 30 — offline presenter flow.
 * Real engine transitions, but example questions and state stay in React only.
 * No auth, API, session storage, local storage or Neon calls.
 */
import { useMemo, useRef, useState } from 'react';
import {
  bothSurrender, colorForTeam, nextRound, publicState, retrySameCell, startMatch,
} from './engine';
import { presenterCellEnabled, presenterClickCell } from './presenterLocalRules';
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
  const [showViewer,setShowViewer]=useState(false);
  const [error,setError]=useState('');
  const questionCounter=useRef(0);

  const viewer = useMemo(()=>state ? publicState(state) : null,[state]);
  const path=useMemo(()=>new Set(state?.winningPath || []),[state]);
  const matchWinner=state?.winner ?? null;
  const names:[string,string]=state?.teams || [teamA,teamB];

  function update(run:(current:MatchState)=>MatchState) {
    if(!state) return;
    try {
      const next=run(state);
      setState(next);
      setError('');
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
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر بدء التجربة.');
    }
  }

  function chooseCell(cell:number) {
    if(!state) return;
    update(current => presenterClickCell(current, cell, mockQuestion));
  }

  function reset() {
    setState(null);
    setShowViewer(false);
    setError('');
  }

  return <section className="letters-demo letters-presenter" dir="rtl" aria-labelledby="letters-presenter-title">
    <div className="letters-demo__top">
      <button type="button" className="letters-demo__ghost" onClick={onBack}>الرجوع للعبة الحروف</button>
      <strong>⬡ بلّشها / تجربة المقدّم</strong>
    </div>
    <header className="letters-demo__intro">
      <span>محاكاة محلية • لا حساب ولا غرفة ولا قاعدة بيانات</span>
      <h1 id="letters-presenter-title">تجربة دور المقدّم</h1>
      <p>هون تقدر تمشي بمباراة تجريبية من اختيار الفريقين إلى الأسئلة، وتلوين الخلايا، واحتساب الفوز والجولات. الأسئلة <b>أمثلة مؤقتة فقط</b> وليست من بنك الأسئلة الحقيقي.</p>
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
        <span>{state.stage==='question'?
          (state.question?.revealed?
            'تم كشف الإجابة. استخدم «سؤال جديد لنفس الحرف» قبل متابعة التلوين.' :
            'السؤال ظاهر. اضغط نفس الخلية مرة ثانية حتى تصير برتقالي؛ ثم أخضر؛ ثم محايد.'):
          state.turn===null?
            'ابدأ بالحرف المضيء اللي اختاره النظام عشوائيًا. كبسة أولى تفتح سؤاله.' :
            'اضغط حرفًا محايدًا لفتح سؤاله، أو اضغط حرفًا ملوّنًا لتغيير لونه مباشرة.'}</span>
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
                  const active=state.currentCell===i;
                  const available=presenterCellEnabled(state,i);
                  return <button type="button" key={i} disabled={!available}
                    onClick={()=>chooseCell(i)}
                    className={'letters-demo__hex letters-demo__hex--'+(owner||'empty')+
                    (path.has(i)?' letters-demo__hex--winning':'')+
                    (active||opening?' letters-demo__hex--active':'')}
                    aria-label={'الحرف '+state.letters[i]+(opening?'، الحرف الافتتاحي':'')+
                      (owner?', '+(owner==='orange'?'برتقالي':'أخضر'):'، غير ملوّن')}
                    title={available?(owner?'تغيير لون الخلية':active?'اضغط مرة ثانية للتلوين':'فتح سؤال الحرف'):'الخلية غير متاحة الآن'}>
                    <span>{state.letters[i]}</span>{path.has(i)&&<span className="letters-demo__star" aria-hidden="true">★</span>}
                  </button>;
                })}
              </div>)}
            </div>
            <span className="letters-demo__direction letters-demo__direction--left">يسار</span>
            <span className="letters-demo__direction letters-demo__direction--bottom">↓ أسفل</span>
          </div>
          {state.stage==='playing'&&<p className="letters-presenter__board-hint">الحروف البيضاء لسه غير محسومة. اختيار الحرف يفتح سؤالًا تجريبيًا.</p>}
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
            <p>أول كبسة على حرف محايد بتفتح سؤاله. بعدها بتحدد النتيجة بكبسات على نفس الخلية، بدون أزرار صح وخطأ.</p>
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
                المقدّم يقرر مين جاوب صح حسب قواعد اللعب المتفق عليها، من دون أزرار نقل فرصة.
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
