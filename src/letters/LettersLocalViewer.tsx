import {HomeBrand} from '../HomeBrand';
/**
 * Bundle 32 — a read-only OFFLINE spectator tab.
 * Communicates with one presenter tab using BroadcastChannel (same origin).
 * Only engine.publicState() reaches this component; secret answers stay private
 * until revealed. No auth, room API, database or persistent storage.
 */
import { useEffect, useMemo, useState } from 'react';
import type { DisplayState, Team } from './engine';
import { colorForTeam } from './engine';
import './LettersDemo.css';
import './LettersLocalViewer.css';

const fmt=(n:number)=>n.toLocaleString('ar');
const stageLabel:Record<DisplayState['stage'],string>={
  lobby:'بانتظار البداية',playing:'اختاروا الحرف',question:'السؤال الحالي',
  between_rounds:'انتهت الجولة',finished:'انتهت المباراة',abandoned:'انتهت التجربة',
};

function isPublicSnapshot(value:unknown):value is DisplayState {
  if(!value || typeof value!=='object')return false;
  const item=value as Partial<DisplayState>;
  return Array.isArray(item.letters) && item.letters.length===25 &&
    Array.isArray(item.owners) && item.owners.length===25 &&
    Array.isArray(item.teams) && item.teams.length===2 &&
    Array.isArray(item.wins) && item.wins.length===2 &&
    typeof item.round==='number' && typeof item.stage==='string';
}

export function LettersLocalViewer({previewId,onBack}:{previewId:string;onBack:()=>void}) {
  const [state,setState]=useState<DisplayState|null>(null);
  const [connected,setConnected]=useState(false);
  const [supported,setSupported]=useState(true);

  useEffect(()=>{
    if(!previewId || typeof BroadcastChannel==='undefined') {
      setSupported(typeof BroadcastChannel!=='undefined');return;
    }
    let active=true, lastSeen=0;
    const channel=new BroadcastChannel('baleshhaa:letters-demo:'+previewId);
    channel.onmessage=(message:MessageEvent)=>{
      if(!active || message.data?.kind!=='snapshot')return;
      const payload:unknown=message.data.payload;
      if(payload!==null && !isPublicSnapshot(payload))return;
      setState(payload);
      setConnected(true);
      lastSeen=Date.now();
    };
    const request=()=>channel.postMessage({kind:'viewer-ready'});
    request();
    const ping=window.setInterval(request,2000);
    const watchdog=window.setInterval(()=>{
      if(lastSeen && Date.now()-lastSeen>6500)setConnected(false);
    },2000);
    return ()=>{active=false;clearInterval(ping);clearInterval(watchdog);channel.close();};
  },[previewId]);

  const winning=useMemo(()=>new Set(state?.winningPath||[]),[state]);
  const winner=state?.winner??null;
  return <section className="letters-demo letters-local-viewer" dir="rtl" aria-labelledby="letters-viewer-title">
    <header className="letters-local-viewer__header">
      <button type="button" className="letters-demo__ghost" onClick={onBack}>الرجوع للألعاب</button>
      <div><span className="letters-demo__tag">شاشة المتسابقين • اختبار محلي</span><h1 id="letters-viewer-title"><HomeBrand>⬡ بلّشها* / لعبة الحروف</HomeBrand></h1></div>
      <span className={'letters-local-viewer__status'+(connected?' is-connected':'')}>
        {connected?'● متصلة بتبويب المقدّم':'● بانتظار المقدّم'}
      </span>
    </header>
    {!supported ? <div className="letters-demo__panel letters-local-viewer__waiting">
      <h2>المتصفح لا يدعم مزامنة التبويبات التجريبية.</h2>
      <p>استخدم Chrome أو متصفحًا حديثًا لعرض تجربة الشاشتين.</p>
    </div> : !state ? <div className="letters-demo__panel letters-local-viewer__waiting">
      <span className="letters-local-viewer__icon">⬡</span>
      <h2>بانتظار بدء المقدّم للمباراة</h2>
      <p>افتح تجربة دور المقدّم في تبويب آخر على نفس الموقع والمتصفح، ثم ابدأ المباراة.</p>
    </div> : <>
      <div className="letters-local-viewer__heading">
        <span>الجولة {fmt(state.round)} • {stageLabel[state.stage]}</span>
        {!connected&&<span className="letters-local-viewer__disconnected">انقطع الاتصال التجريبي مؤقتًا؛ تُعرض آخر حالة معروفة</span>}
      </div>
      <div className="letters-presenter__teams letters-local-viewer__teams">
        {([0,1] as Team[]).map(team=><div key={team}
          className={'letters-local-viewer__team letters-local-viewer__team--'+colorForTeam(team,state.round)}>
          <span>{state.teams[team]}</span><strong>{fmt(state.wins[team])}</strong>
          <small>{colorForTeam(team,state.round)==='orange'?'برتقالي • يمين / يسار':'أخضر • فوق / تحت'}</small>
        </div>)}
      </div>
      <div className="letters-local-viewer__layout">
        <section className="letters-demo__panel letters-local-viewer__board-panel" aria-label="لوحة المتسابقين">
          <div className="letters-demo__board-wrap">
            <span className="letters-demo__direction letters-demo__direction--top">أعلى ↑</span>
            <span className="letters-demo__direction letters-demo__direction--right">يمين</span>
            <div className="letters-demo__board" role="img" aria-label="لوحة 25 حرفًا للعرض فقط">
              {Array.from({length:5},(_,row)=><div className="letters-demo__row" key={row}>
                {Array.from({length:5},(_,col)=>{
                  const index=row*5+col;
                  const owner=state.owners[index] || 'empty';
                  const selected=state.currentCell===index ||
                    (state.currentCell===null&&state.stage==='playing'&&state.turn===null&&state.startingCell===index);
                  return <div key={index} className={'letters-demo__hex letters-demo__hex--'+owner+
                    (winning.has(index)?' letters-demo__hex--winning':'')+
                    (selected?' letters-demo__hex--active':'')} aria-label={'الحرف '+state.letters[index]}>
                    <span>{state.letters[index]}</span>
                    {winning.has(index)&&<span className="letters-demo__star" aria-hidden="true">★</span>}
                  </div>;
                })}
              </div>)}
            </div>
            <span className="letters-demo__direction letters-demo__direction--left">يسار</span>
            <span className="letters-demo__direction letters-demo__direction--bottom">↓ أسفل</span>
          </div>
        </section>
        <section className="letters-demo__panel letters-local-viewer__info" aria-label="السؤال والنتيجة">
          {state.stage==='question'&&state.question ? <>
            <span className="letters-local-viewer__eyebrow">السؤال الحالي • حرف {state.question.letter}</span>
            <h2>{state.question.text}</h2>
            {state.question.revealedAnswer ?
              <div className="letters-local-viewer__answer"><small>الإجابة بعد الكشف</small><strong>{state.question.revealedAnswer}</strong></div> :
              <div className="letters-local-viewer__hidden-answer">الإجابة مخفية عن شاشة المتسابقين حتى يقرر المقدّم كشفها.</div>}
          </> : (state.stage==='between_rounds'||state.stage==='finished')&&winner!==null ? <>
            <h2>🏆 {state.stage==='finished'?'انتهت المباراة':'انتهت الجولة'}</h2>
            <div className="letters-local-viewer__outcome">
              <div className="letters-local-viewer__outcome-card letters-local-viewer__outcome-card--winner">
                <span>الفائز</span><strong>{state.teams[winner]}</strong><small>{fmt(state.wins[winner])} جولات</small>
              </div>
              <div className="letters-local-viewer__outcome-card letters-local-viewer__outcome-card--loser">
                <span>الخاسر</span><strong>{state.teams[winner===0?1:0]}</strong>
                <small>{fmt(state.wins[winner===0?1:0])} جولات</small>
              </div>
            </div>
          </> : <>
            <span className="letters-local-viewer__icon">⬡</span>
            <h2>{stageLabel[state.stage]}</h2>
            <p>تابع الحروف والتلوين من شاشة المقدّم. ما في أي أزرار تحكّم على شاشة المتسابقين.</p>
          </>}
        </section>
      </div>
    </>}
    <p className="letters-local-viewer__footnote">هذه شاشة اختبار محلية للمتابعة فقط. اتصالها يعمل بين تبويبات نفس الموقع والمتصفح، وليس بين أجهزة مختلفة أو عبر الإنترنت.</p>
  </section>;
}
