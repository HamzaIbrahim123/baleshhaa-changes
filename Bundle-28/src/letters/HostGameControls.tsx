/**
 * Bundle 28 — Host-only controls for the Letters game.
 * All moves go to the authoritative room service with expectedRevision.
 * The viewer never receives the answer until the server reveals it.
 */
import { useState } from 'react';
import type { MatchState, Team } from './engine';
import type { HostRoom, RoomCommand } from './roomClient';
import { RoomApiError, roomApi } from './roomClient';
import { colorForTeam } from './engine';
import './HostGameControls.css';

type HostState = MatchState & { editMode?: boolean };
export type HostGameControlsProps = { room: HostRoom; onUpdate: (room: HostRoom) => void };
const stageText = (state: HostState) =>
  state.stage === 'question' ? 'السؤال مفتوح' :
  state.stage === 'playing' ? 'اختر الحرف التالي' :
  state.stage === 'between_rounds' ? 'انتهت الجولة' :
  state.stage === 'finished' ? 'انتهت المباراة' : 'الغرفة مغلقة';

export function HostGameControls({ room, onUpdate }: HostGameControlsProps) {
  const state = room.hostState as HostState;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const canEdit = state.stage === 'playing' || state.stage === 'question';
  const editing = Boolean(state.editMode);
  const showQuestion = state.stage === 'question' && state.question !== null;
  const isRevealed = Boolean(state.question?.revealed);
  const winner = state.winner;

  async function send(command: RoomCommand) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await roomApi.command(room.room.code, room.room.revision, command, crypto.randomUUID());
      onUpdate(updated);
      if (command.kind === 'end_match') setConfirmEnd(false);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'تعذّر تنفيذ الأمر؛ جرّب مرة ثانية.';
      setError(message);
      if (unknownError instanceof RoomApiError && unknownError.code === 'REVISION_CONFLICT') {
        try { onUpdate(await roomApi.host(room.room.code)); }
        catch { /* Keep the error visible rather than replacing verified state. */ }
      }
    } finally { setBusy(false); }
  }

  function chooseCell(cell: number) {
    if (busy || !canEdit) return;
    if (editing) {
      void send({ kind: 'cycle_cell_color', cell });
    } else if (state.stage === 'playing' && state.owners[cell] === null
      && (state.turn !== null || state.startingCell === cell)) {
      void send({ kind: 'open_question', cell });
    }
  }

  const allowedTeam = (team: Team) =>
    state.attempt === 'turn' ? state.turn === team :
    state.attempt === 'opponent' ? state.turn !== team : true;
  const attemptHint = state.attempt === 'opening' ? 'الحرف الافتتاحي: الفريقان يتنافسان على الإجابة' :
    state.attempt === 'turn' ? 'الدور للفريق المحدد؛ إذا أخطأ ينتقل للخصم' :
    state.attempt === 'opponent' ? 'الفرصة الآن للفريق الآخر' :
    'فرصة مفتوحة للفريقين؛ لا تُعاد الإجابة نفسها';

  return <section className="letters-host" aria-label="تحكم المقدّم بالمباراة">
    <div className="letters-host__status">
      <div><span className="letters-room__eyebrow">لوحة المقدّم • الجولة {state.round}</span><h2>{stageText(state)}</h2></div>
      <span className="letters-host__revision">رمز الغرفة: <b dir="ltr">{room.room.code}</b></span>
    </div>

    {error && <div role="alert" className="letters-room__error">{error}</div>}
    {(state.stage === 'playing' || state.stage === 'question') && <div className="letters-host__actions">
      <button type="button" className="letters-room__secondary" aria-pressed={editing} disabled={busy}
        onClick={() => void send({ kind: 'toggle_edit_mode' })}>{editing ? 'إنهاء تعديل الألوان' : 'تعديل ألوان الحروف'}</button>
      <p>{editing ? 'وضع التصحيح: اضغط الخلية لتبديل لونها (محايد ← برتقالي ← أخضر)' :
        state.stage === 'playing' && state.turn === null ? 'ابدأ بالحرف المحدد بإطار مضيء؛ اختاره النظام عشوائيًا.' :
        'اضغط حرفًا متاحًا لفتح سؤال؛ ألوان الخلايا يحددها السيرفر.'}</p>
    </div>}

    {(state.stage === 'playing' || state.stage === 'question') && <div className="letters-host__play">
      <div className="letters-host__question">
        {showQuestion && state.question ? <>
          <p className="letters-room__eyebrow">الحرف: {state.question.letter}</p>
          <h3>{state.question.text}</h3>
          <div className="letters-host__secret"><small>الإجابة الصحيحة • للمقدّم فقط</small><strong>{state.question.answer}</strong></div>
          {isRevealed ? <>
            <p>تم كشف الإجابة على شاشة المتسابقين. تقدر تطلب سؤالًا جديدًا لنفس الحرف.</p>
            <button type="button" className="letters-room__primary" disabled={busy || editing}
              onClick={() => void send({ kind: 'retry_same_letter' })}>سؤال جديد لنفس الحرف</button>
          </> : <>
            <p>{attemptHint}</p>
            <div className="letters-host__award">
              {([0, 1] as Team[]).map(team => <button type="button" key={team}
                className={'letters-host__team-button letters-host__team-button--' + colorForTeam(team, state.round)}
                disabled={busy || editing || !allowedTeam(team)}
                onClick={() => void send({ kind: 'correct_answer', team })}>إجابة صحيحة: {state.teams[team]}</button>)}
            </div>
            <div className="letters-host__answer-actions">
              {state.attempt !== 'free' && <button type="button" className="letters-room__secondary"
                disabled={busy || editing} onClick={() => void send({ kind: 'wrong_answer' })}>الإجابة خاطئة / الفرصة التالية</button>}
              <button type="button" className="letters-room__secondary" disabled={busy || editing}
                onClick={() => void send({ kind: 'both_surrender' })}>الفريقان استسلما • كشف الإجابة</button>
            </div>
          </>}
        </> : <div className="letters-host__empty"><span>⬡</span><h3>بانتظار اختيار الحرف</h3><p>اختار خلية غير ملوّنة من اللوحة لعرض سؤالها. بنك أسئلة الحروف سيُفعّل في مرحلة منفصلة.</p></div>}
      </div>
      <div className="letters-room__board letters-host__board" aria-label="حروف المباراة">
        {state.letters.map((letter, i) => {
          const owner = state.owners[i] || 'neutral';
          const selected = state.currentCell === i || (state.stage === 'playing' && state.turn === null && state.startingCell === i);
          const clickable = editing || (state.stage === 'playing' && state.owners[i] === null
            && (state.turn !== null || state.startingCell === i));
          const winnerCell = state.winningPath.includes(i);
          return <button type="button" key={i} disabled={busy || !clickable} aria-pressed={selected}
            className={'letters-room__hex letters-room__hex--' + owner +
              (selected ? ' letters-room__hex--selected' : '') + (winnerCell ? ' letters-room__hex--path' : '')}
            title={editing ? 'غيّر لون الحرف ' + letter : clickable ? 'افتح سؤال حرف ' + letter : 'الحرف غير متاح'}
            aria-label={'الحرف ' + letter + (editing ? '، تعديل اللون' : '')}
            onClick={() => chooseCell(i)}><span>{letter}</span></button>;
        })}
      </div>
    </div>}

    {state.stage === 'between_rounds' && <>
      <div className="letters-host__result">الجولة {state.round} انتهت • الفائز: <strong>{winner === null ? '—' : state.teams[winner]}</strong></div>
      <button type="button" className="letters-room__primary" disabled={busy} onClick={() => void send({ kind: 'next_round' })}>ابدأ الجولة التالية</button>
    </>}
    {state.stage === 'finished' && winner !== null && <div className="letters-room__outcome" aria-label="النتيجة النهائية">
      <div className="letters-room__outcome-card letters-room__outcome-card--winner"><span>الفائز</span>
        <strong>{state.teams[winner]}</strong><small>{state.wins[winner]} جولات</small></div>
      <div className="letters-room__outcome-card letters-room__outcome-card--loser"><span>الخاسر</span>
        <strong>{state.teams[winner === 0 ? 1 : 0]}</strong>
        <small>{state.wins[winner === 0 ? 1 : 0]} جولات</small></div>
    </div>}
    {(state.stage === 'playing' || state.stage === 'question' || state.stage === 'between_rounds') && <div className="letters-host__finish">
      {!confirmEnd ? <button type="button" className="letters-host__end" disabled={busy}
          onClick={() => setConfirmEnd(true)}>إنهاء المباراة</button> :
        <div className="letters-host__confirm" role="group" aria-label="تأكيد إنهاء المباراة">
          <p>متأكد إنك بدك تنهي المباراة؟ رح تنغلق الغرفة الحالية.</p>
          <button type="button" className="letters-host__end" disabled={busy}
            onClick={() => void send({ kind: 'end_match' })}>نعم، إنهاء المباراة</button>
          <button type="button" className="letters-room__secondary" disabled={busy}
            onClick={() => setConfirmEnd(false)}>إلغاء</button>
        </div>}
    </div>}
    {state.stage === 'abandoned' && <p className="letters-room__notice">تم إنهاء الغرفة. ارجع لقائمة الألعاب لإنشاء مباراة جديدة.</p>}
  </section>;
}
