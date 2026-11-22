/**
 * Bundle 35 — live-room presenter controls.
 * Uses only server-authorized room commands; no local game-state mutation.
 */
import { useEffect, useRef, useState } from 'react';
import type { MatchState } from './engine';
import type { HostRoom, RoomCommand } from './roomClient';
import { RoomApiError, roomApi } from './roomClient';
import './HostGameControls.css';

type PendingWin = {cell:number;proposedColor:'orange'|'green'|null;cycleBaseColor:'orange'|'green'|null;winner:0|1};
type HostState = MatchState & { editMode?: boolean; askedCells?: number[]; focusedCell?: number | null;
  pendingWin?:PendingWin|null;declinedWin?:{cell:number;color:'orange'|'green'|null}|null;};
export function HostGameControls({room,onUpdate}:{room:HostRoom;onUpdate:(room:HostRoom)=>void}) {
  const state=room.hostState as HostState;
  const asked=state.askedCells||[];
  // CurrentCell fallback keeps already-open live rooms usable across an upgrade.
  const focused=state.focusedCell??state.currentCell??null;
  const editing=Boolean(state.editMode);
  const current=state.stage==='question'?state.question:null;
  const currentLetter=focused===null?null:state.letters[focused];
  const canPlay=state.stage==='playing'||state.stage==='question';
  const [busy,setBusy]=useState(false);
  const inFlight=useRef(false);
  const confirmButton=useRef<HTMLButtonElement|null>(null);
  const pendingWin=state.pendingWin??null;
  const pendingTeam=pendingWin?state.teams[pendingWin.winner]:null;
  const pendingColor=pendingWin?.proposedColor===null?'محايد':
    pendingWin?.proposedColor==='orange'?'برتقالي':'أخضر';
  useEffect(()=>{
    if(pendingWin)confirmButton.current?.focus();
  },[pendingWin?.cell,pendingWin?.winner]);
  const [error,setError]=useState('');
  const [counts,setCounts]=useState<Record<string,number>|null>(null);
  const [confirmEnd,setConfirmEnd]=useState(false);
  const [countError,setCountError]=useState('');

  useEffect(()=>{
    let active=true;
    void roomApi.counts(room.room.code).then(({counts})=>{
      if(active){setCounts(counts);setCountError('');}
    }).catch(()=>{
      if(active)setCountError('تعذّر تحديث عدد الأسئلة المتبقية.');
    });
    return ()=>{active=false;};
  },[room.room.code,state.question?.id,state.round]);

  async function send(command:RoomCommand){
    if(inFlight.current)return;
    inFlight.current=true;
    setBusy(true);setError('');
    try{
      const updated=await roomApi.command(room.room.code,room.room.revision,command,crypto.randomUUID());
      onUpdate(updated);
      if(command.kind==='end_match')setConfirmEnd(false);
    }catch(e){
      setError(e instanceof Error?e.message:'تعذّر تنفيذ الحركة.');
      if(e instanceof RoomApiError&&e.code==='REVISION_CONFLICT'){
        try{onUpdate(await roomApi.host(room.room.code));}catch{/* previous error remains */}
      }
    }finally{inFlight.current=false;setBusy(false);}
  }

  function enabled(cell:number){
    if(!canPlay||busy||pendingWin)return false;
    if(editing)return asked.includes(cell)&&cell!==focused;
    if(cell===focused)return state.stage==='playing'||Boolean(current&&!current.revealed);
    if(state.stage!=='playing'||asked.includes(cell)||state.owners[cell]!==null)return false;
    if(focused!==null&&state.owners[focused]===null)return false;
    return state.turn!==null||cell===state.startingCell;
  }
  function click(cell:number){
    if(!enabled(cell))return;
    if(editing||cell===focused)void send({kind:'cycle_cell_color',cell,requireWinConfirmation:true});
    else void send({kind:'open_question',cell});
  }
  const winner=state.winner;
  return <section className="letters-host" data-bundle="37" aria-label="لوحة تحكم المقدّم">
    {pendingWin && <div className="letters-host__winning-backdrop">
      <div className="letters-host__winning-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="letters-win-heading" aria-describedby="letters-win-description"
        onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();}}}>
        <div className="letters-host__winning-icon" aria-hidden="true">⬡</div>
        <div className="letters-room__eyebrow">تأكيد قبل إعلان النتيجة</div>
        <h2 id="letters-win-heading">هل فاز فريق {pendingTeam}؟</h2>
        <p id="letters-win-description">
          تلوين حرف «{state.letters[pendingWin.cell]}» باللون {pendingColor} يكمل مسار الفوز.
          هل كانت الإجابة فعلًا لهذا الفريق؟
        </p>
        <div className="letters-host__winning-actions">
          <button type="button" className="letters-room__primary" ref={confirmButton}
            disabled={busy} onClick={()=>void send({kind:'confirm_win'})}>
            نعم، تأكيد فوز {pendingTeam}
          </button>
          <button type="button" className="letters-room__secondary"
            disabled={busy} onClick={()=>void send({kind:'reject_win'})}>
            لا، انتقل للون التالي
          </button>
        </div>
        <p className="letters-host__winning-note">
          لن تُحسب الجولة أو تظهر نتيجة الفوز على شاشة المتسابقين حتى تضغط «نعم».
          عند اختيار «لا»، لن تُسجَّل هذه النقطة، والكبسة التالية على الخلية تنتقل للون التالي.
        </p>
      </div>
    </div>}
    <div className="letters-host__status">
      <span className="letters-room__eyebrow">الجولة {state.round} • تحكّم المقدّم</span>
      <span className="letters-host__revision">الغرفة: <b dir="ltr">{room.room.code}</b> <small>v37</small></span>
    </div>
    {error&&<div role="alert" className="letters-room__error">{error}</div>}
    {canPlay&&<>
      <div className="letters-host__actions">
        {asked.length>=2&&<button type="button" className="letters-room__secondary" aria-pressed={editing}
          disabled={busy||Boolean(pendingWin)} onClick={()=>void send({kind:'toggle_edit_mode'})}>
          {editing?'إنهاء تعديل خلية سابقة':'تعديل خلية سابقة'}
        </button>}
        {editing&&<p>اضغط على خلية سابقة لتعديل لونها، ثم أنهِ وضع التعديل.</p>}
        {!editing&&focused!==null&&state.owners[focused]===null&&!current&&
          <p>حدّد لون الحرف الحالي قبل الانتقال لحرف جديد.</p>}
      </div>
      <div className="letters-host__play">
        <div className="letters-host__question">
          {currentLetter&&<div className="letters-host__remaining">
            <span>حرف {currentLetter}</span>
            <strong>{counts?.[currentLetter]??'—'} <small>سؤال متبقٍ لك</small></strong>
          </div>}
          {countError&&<p className="letters-room__notice">{countError}</p>}
          {current?<>
            <p className="letters-room__eyebrow">سؤال حرف {current.letter}</p>
            <h3>{current.text}</h3>
            <div className="letters-host__secret">
              <small>الإجابة الصحيحة • للمقدّم فقط</small>
              <strong>{current.answer}</strong>
            </div>
            {current.revealed?<>
              <p>انكشفت الإجابة. إذا استسلم الفريقان، اختَر سؤالًا جديدًا لنفس الحرف.</p>
              <button type="button" className="letters-room__primary" disabled={busy||editing}
                onClick={()=>void send({kind:'retry_same_letter'})}>سؤال جديد لنفس الحرف</button>
            </>:<>
              <p className="letters-host__hint">اضغط على حرف «{current.letter}» بنفس اللوحة لتحديد اللون.</p>
              <button type="button" className="letters-room__secondary" disabled={busy||editing}
                onClick={()=>void send({kind:'both_surrender'})}>استسلام الفريقين / كشف الإجابة</button>
            </>}
          </>:<div className="letters-host__empty letters-host__empty--quiet">
            <span aria-hidden="true">⬡</span>
            <p>{focused!==null&&state.owners[focused]===null?
              'لوّن الحرف الحالي حتى تكمل المباراة.':'اختَر حرفًا من اللوحة لعرض السؤال.'}</p>
          </div>}
        </div>
        <div className="letters-room__board letters-host__board" aria-label="خلايا الحروف">
          {state.letters.map((letter,i)=>{
            const color=state.owners[i]||'neutral';
            const selected=state.currentCell===i||
              (focused===i&&state.owners[i]===null)||
              (state.stage==='playing'&&state.turn===null&&state.startingCell===i);
            return <button type="button" key={i} disabled={!enabled(i)} aria-pressed={selected}
              className={'letters-room__hex letters-room__hex--'+color+
                (selected?' letters-room__hex--selected':'')+
                (state.winningPath.includes(i)?' letters-room__hex--path':'')}
              title={editing?'تصحيح خلية سابقة':asked.includes(i)?'تغيير اللون دون إعادة السؤال':'فتح سؤال حرف '+letter}
              aria-label={'حرف '+letter+(selected?'، محدد':'')+
                (counts?', '+(counts[letter]??0)+' سؤال متبقٍ':'')}
              onClick={()=>click(i)}><span>{letter}</span></button>;
          })}
        </div>
      </div>
    </>}
    {state.stage==='between_rounds'&&<>
      <div className="letters-host__result">الفائز بالجولة {state.round}: <strong>{winner===null?'—':state.teams[winner]}</strong></div>
      <button type="button" className="letters-room__primary" disabled={busy}
        onClick={()=>void send({kind:'next_round'})}>ابدأ الجولة التالية</button>
    </>}
    {state.stage==='finished'&&winner!==null&&
      <div className="letters-room__outcome" aria-label="النتيجة النهائية">
        <div className="letters-room__outcome-card letters-room__outcome-card--winner">
          <span>الفائز</span><strong>{state.teams[winner]}</strong><small>{state.wins[winner]} جولات</small>
        </div>
        <div className="letters-room__outcome-card letters-room__outcome-card--loser">
          <span>الخاسر</span><strong>{state.teams[winner===0?1:0]}</strong>
          <small>{state.wins[winner===0?1:0]} جولات</small>
        </div>
      </div>}
    {['playing','question','between_rounds'].includes(state.stage)&&
      <div className="letters-host__finish">
        {!confirmEnd?<button type="button" className="letters-host__end" disabled={busy}
          onClick={()=>setConfirmEnd(true)}>إنهاء المباراة</button>:
          <div className="letters-host__confirm" role="group" aria-label="تأكيد إنهاء المباراة">
            <p>متأكد بدك تنهي المباراة؟</p>
            <button type="button" className="letters-host__end" disabled={busy}
              onClick={()=>void send({kind:'end_match'})}>نعم، إنهاء المباراة</button>
            <button type="button" className="letters-room__secondary" disabled={busy}
              onClick={()=>setConfirmEnd(false)}>إلغاء</button>
          </div>}
      </div>}
  </section>;
}
