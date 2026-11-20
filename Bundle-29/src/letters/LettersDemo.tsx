/** Bundle 29: OFFLINE board tester. No auth, room API, database or storage. */
import { useMemo, useState } from 'react';
import { CELL_COUNT, generateRound, winningPath } from './engine';
import type { Color, Owner } from './engine';
import './LettersDemo.css';

type Brush = Color | 'erase';
type Scenario = { id:string; title:string; orange:number[]; green:number[]; detail:string };
export const DEMO_SCENARIOS:readonly Scenario[] = [
  {id:'orange-line',title:'فوز برتقالي مستقيم',orange:[10,11,12,13,14],green:[],detail:'البرتقالي متصل من اليمين إلى اليسار.'},
  {id:'orange-bend',title:'فوز برتقالي متعرّج',orange:[5,6,12,13,14],green:[],detail:'البرتقالي يفوز حتى مع انحناء المسار.'},
  {id:'green-line',title:'فوز أخضر عمودي',orange:[],green:[2,7,12,17,22],detail:'الأخضر متصل من الأعلى إلى الأسفل.'},
  {id:'green-bend',title:'فوز أخضر متعرّج',orange:[],green:[1,6,12,17,23],detail:'الأخضر يفوز بمسار سداسي متعرّج.'},
  {id:'almost',title:'ناقص خلية',orange:[10,11,12,13],green:[],detail:'ما في فوز، لأن المسار لا يصل للحافة الثانية.'},
  {id:'scattered',title:'ألوان متفرقة',orange:[0,6,13,21],green:[4,8,16,24],detail:'الألوان المتفرقة لا تعني الفوز.'},
];
const blank = ():Owner[] => Array(CELL_COUNT).fill(null) as Owner[];
const newLetters = ():string[] => generateRound(Math.random).letters;
const teamName = (color:Color) => color === 'orange' ? 'الفريق البرتقالي' : 'الفريق الأخضر';

export function LettersDemo({onBack}:{onBack:()=>void}) {
  const [letters,setLetters] = useState<string[]>(newLetters);
  const [owners,setOwners] = useState<Owner[]>(blank);
  const [brush,setBrush] = useState<Brush>('orange');
  const [selectedScenario,setSelectedScenario] = useState('');
  const [hint,setHint] = useState('اختار لون واضغط الحروف، أو جرب واحدًا من السيناريوهات الجاهزة.');
  const orangePath = useMemo(()=>winningPath(owners,'orange'),[owners]);
  const greenPath = useMemo(()=>winningPath(owners,'green'),[owners]);
  const win:Color|null = orangePath.length ? 'orange' : greenPath.length ? 'green' : null;
  const path = useMemo(()=>new Set([...orangePath,...greenPath]),[orangePath,greenPath]);

  function colorCell(cell:number) {
    setOwners(previous=>{
      const copy=[...previous];
      const color:Owner = brush==='erase' ? null : brush;
      copy[cell] = previous[cell] === color ? null : color;
      return copy;
    });
    setSelectedScenario('');
    setHint('أنت في وضع التعديل اليدوي. الفوز يُحسب فورًا حسب مسار الخلايا المتصلة.');
  }
  function preset(example:Scenario) {
    const next=blank();
    example.orange.forEach(index=>{next[index]='orange';});
    example.green.forEach(index=>{next[index]='green';});
    setOwners(next);
    setSelectedScenario(example.id);
    setHint(example.detail);
  }
  function reset(shuffle:boolean) {
    setOwners(blank());
    if(shuffle) setLetters(newLetters());
    setSelectedScenario('');
    setHint(shuffle ? 'جولة جديدة: تم خلط الحروف ومسح الألوان.' : 'تم مسح ألوان الخلايا. ابدأ تجربة جديدة.');
  }

  return <section className="letters-demo" dir="rtl" aria-labelledby="letters-demo-title">
    <div className="letters-demo__top">
      <button type="button" className="letters-demo__ghost" onClick={onBack}>الرجوع للعبة الحروف</button>
      <strong>⬡ بلّشها / لوحة الاختبار</strong>
    </div>
    <header className="letters-demo__intro">
      <span>وضع اختبار محلي • بدون غرفة وبدون قاعدة بيانات</span>
      <h1 id="letters-demo-title">جرّب توصيل الحروف والفوز</h1>
      <p>شبكة من 25 حرفًا. <b>البرتقالي</b> يربط اليمين باليسار، و<b>الأخضر</b> يربط أعلى اللوحة بأسفلها. المسار ممكن يكون مستقيمًا أو متعرّجًا، لكن لازم الخلايا السداسية تتلامس.</p>
    </header>
    <div className="letters-demo__columns">
      <section className="letters-demo__panel" aria-label="لوحة حروف تفاعلية">
        <div className="letters-demo__teams">
          <div className="letters-demo__team letters-demo__team--orange"><b>الفريق البرتقالي</b><small>يمين ↔ يسار</small></div>
          <div className="letters-demo__team letters-demo__team--green"><b>الفريق الأخضر</b><small>أعلى ↕ أسفل</small></div>
        </div>
        <div className="letters-demo__board-wrap">
          <span className="letters-demo__direction letters-demo__direction--top">↑ أعلى</span>
          <span className="letters-demo__direction letters-demo__direction--right">يمين</span>
          <div className="letters-demo__board" role="group" aria-label="خمسة صفوف من الحروف">
            {Array.from({length:5},(_,row)=><div className="letters-demo__row" key={row}>
              {Array.from({length:5},(_,col)=>{
                const i=row*5+col, owner=owners[i], winning=path.has(i);
                const ownerLabel=owner==='orange'?'برتقالي':owner==='green'?'أخضر':'بدون لون';
                return <button key={i} type="button" onClick={()=>colorCell(i)}
                  className={'letters-demo__hex letters-demo__hex--'+(owner||'empty')+(winning?' letters-demo__hex--winning':'')}
                  aria-label={'حرف '+letters[i]+'، '+ownerLabel+(winning?'، ضمن المسار الفائز':'')}
                  title={'حرف '+letters[i]+'، '+ownerLabel}>
                  <span>{letters[i]}</span>{winning&&<span className="letters-demo__star" aria-hidden="true">★</span>}
                </button>;
              })}
            </div>)}
          </div>
          <span className="letters-demo__direction letters-demo__direction--left">يسار</span>
          <span className="letters-demo__direction letters-demo__direction--bottom">↓ أسفل</span>
        </div>
        <div className="letters-demo__outcome" aria-live="polite" aria-atomic="true">
          {win ? <>
            <h2>🏆 فاز {teamName(win)}!</h2>
            <div className="letters-demo__score">
              <div className={'letters-demo__score-card letters-demo__score-card--'+win}><span>الفائز</span><b>{teamName(win)}</b><small>حقق مسارًا متصلًا</small></div>
              <div className="letters-demo__score-card letters-demo__score-card--loser"><span>الخاسر</span><b>{teamName(win==='orange'?'green':'orange')}</b><small>لم يُكمل المسار</small></div>
            </div>
          </> : <><strong>لسه ما في فريق فائز</strong><p>أكمل مسارًا متصلًا بين الحافتين المطلوبتين حتى يظهر الفوز.</p></>}
        </div>
      </section>
      <aside className="letters-demo__panel letters-demo__tools">
        <h2>اختار لون الخلية</h2>
        <p>اختار لونًا واضغط على أي حرف. إذا ضغطت نفس اللون مرة ثانية بنمسحه. التلوين هون للتجربة فقط، مش بديل عن أسئلة اللعبة.</p>
        <div className="letters-demo__brushes" role="group" aria-label="أدوات تلوين الخلايا">
          <button type="button" className="letters-demo__brush letters-demo__brush--orange" aria-pressed={brush==='orange'} onClick={()=>setBrush('orange')}>● برتقالي</button>
          <button type="button" className="letters-demo__brush letters-demo__brush--green" aria-pressed={brush==='green'} onClick={()=>setBrush('green')}>● أخضر</button>
          <button type="button" className="letters-demo__brush" aria-pressed={brush==='erase'} onClick={()=>setBrush('erase')}>⌫ مسح</button>
        </div>
        <h2>جرّب سيناريو جاهز</h2>
        <p>اضغط على أي سيناريو حتى تشوف فوزًا صحيحًا أو حالة لا تُحسب فوزًا، وبعدين عدّل الخلايا بنفسك.</p>
        <div className="letters-demo__presets">
          {DEMO_SCENARIOS.map(s=><button type="button" key={s.id} className="letters-demo__preset"
            aria-pressed={selectedScenario===s.id} onClick={()=>preset(s)}>{s.title}</button>)}
        </div>
        <div className="letters-demo__hint" role="status">{hint}</div>
        <div className="letters-demo__bottom">
          <button type="button" className="letters-demo__ghost" onClick={()=>reset(false)}>مسح اللوحة</button>
          <button type="button" className="letters-demo__primary" onClick={()=>reset(true)}>جولة جديدة</button>
        </div>
        <p className="letters-demo__warning">هذا اختبار بصري داخل المتصفح فقط: ما بننشئ غرفة، وما بنسجّل دخول، وما بنكتب على Neon، وما بنستخدم أسئلة. نظام الغرف الحقيقي منفصل عنه.</p>
      </aside>
    </div>
  </section>;
}
