/**
 * Bundle 26 — Letter Arena room lobby, independent of Seen Jeem.
 * Import this component in the app router in a subsequent integration bundle.
 * Host and viewer never share the same credentials or private game state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { BestOf, DisplayState, MatchState } from './engine';
import { colorForTeam } from './engine';
import { HostGameControls } from './HostGameControls';
import { RoomApiError, roomApi, watchHostRoom, watchRoom } from './roomClient';
import type { HostRoom, ViewerRoom } from './roomClient';
import './RoomLobby.css';

export type RoomLobbyMode = 'host' | 'viewer';
export type RoomLobbyProps = {
  mode: RoomLobbyMode;
  /** Link/code from the URL; only the six-character code is accepted. */
  initialCode?: string;
  onBack?: () => void;
  /** Called after host starts an actual round; gameplay UI connects later. */
  onRoomStarted?: (room: HostRoom) => void;
};

const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
function codeOf(value: string): string | null {
  const code = value.trim().toUpperCase();
  return ROOM_CODE.test(code) ? code : null;
}
function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'تعذّر الاتصال بالغرفة، حاول مجددًا.';
}
function nickname(n: string) { return n.trim().slice(0, 45); }
function roomStage(stage: MatchState['stage']): string {
  return ({
    lobby: 'بانتظار بدء المقدّم',
    playing: 'الجولة جارية',
    question: 'السؤال مفتوح',
    between_rounds: 'انتهت الجولة',
    finished: 'انتهت المواجهة',
    abandoned: 'تم إنهاء المباراة',
  })[stage];
}

function Header({ kind, onBack }: { kind: RoomLobbyMode; onBack?: () => void }) {
  return <header className="letters-room__header">
    <div className="letters-room__header-side">
      {onBack && <button type="button" className="letters-room__ghost" onClick={onBack}>رجوع</button>}
      <span className="letters-room__role">{kind === 'host' ? 'لوحة المقدّم' : 'شاشة المتسابقين'}</span>
    </div>
    <div className="letters-room__brand"><span>⬡</span> لعبة الحروف</div>
  </header>;
}
function TeamCards({ teams, wins, round }: { teams: [string, string]; wins?: [number, number]; round?: number }) {
  return <div className="letters-room__teams">
    {teams.map((name, index) => {
      const color = colorForTeam(index as 0 | 1, round || 1);
      return <div key={index} className={`letters-room__team letters-room__team--${color}`}>
        <span className="letters-room__team-name">{name}</span>
        <span className="letters-room__team-meta">{color === 'orange' ? 'برتقالي: يمين / يسار' : 'أخضر: أعلى / أسفل'}</span>
        <strong>{wins?.[index] || 0} جولات</strong>
      </div>;
    })}
  </div>;
}
function Board({ state }: { state: DisplayState }) {
  const route = new Set(state.winningPath);
  return <div className="letters-room__board" aria-label="لوحة لعبة الحروف">
    {state.letters.map((letter, i) => {
      const owner = state.owners[i] || 'neutral';
      const selected = state.currentCell === i || (state.currentCell === null && state.stage === 'playing' && state.turn === null && state.startingCell === i);
      return <div key={`${i}-${letter}`} className={`letters-room__hex letters-room__hex--${owner}${selected ? ' letters-room__hex--selected' : ''}${route.has(i) ? ' letters-room__hex--path' : ''}`} aria-label={`الحرف ${letter}${owner === 'neutral' ? '' : `، ${owner === 'orange' ? 'البرتقالي' : 'الأخضر'}`}`}>
        <span>{letter}</span>
      </div>;
    })}
  </div>;
}
function Outcome({ state }: { state: DisplayState }) {
  const win = state.winner;
  if (win === null || win === undefined) return null;
  const loser = win === 0 ? 1 : 0;
  return <div className="letters-room__outcome" aria-label="نتيجة المواجهة">
    <div className="letters-room__outcome-card letters-room__outcome-card--winner">
      <span>الفائز</span><strong>{state.teams[win]}</strong><small>{state.wins[win]} جولات</small>
    </div>
    <div className="letters-room__outcome-card letters-room__outcome-card--loser">
      <span>الخاسر</span><strong>{state.teams[loser]}</strong><small>{state.wins[loser]} جولات</small>
    </div>
  </div>;
}

function HostLobby({ initialCode, onBack, onRoomStarted }: Omit<RoomLobbyProps, 'mode'>) {
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [bestOf, setBestOf] = useState<BestOf | null>(null);
  const [room, setRoom] = useState<HostRoom | null>(null);
  const [recovered, setRecovered] = useState<HostRoom | null>(null);
  const [recoveredConfirm, setRecoveredConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [offline, setOffline] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const lookup = async () => {
      try {
        const code = codeOf(initialCode || '');
        const result = code ? await roomApi.host(code) : (await roomApi.active()).room;
        if (live && result) {
          // Explicit host link is intentional. A generic visit must NEVER jump
          // straight into an existing room with old teams and rounds.
          if (code) setRoom(result);
          else setRecovered(result);
        }
      } catch (err) {
        if (live) setError(failureMessage(err));
      } finally { if (live) setChecking(false); }
    };
    void lookup();
    return () => { live = false; };
  }, [initialCode]);

  useEffect(() => {
    if (!room?.room.code) return;
    return watchHostRoom(room.room.code, current => {
      if (!mounted.current) return;
      setRoom(previous => previous && previous.room.revision > current.room.revision ? previous : current);
      setOffline(false);
    }, () => { if (mounted.current) setOffline(true); });
  }, [room?.room.code]);

  const create = useCallback(async () => {
    const names: [string, string] = [nickname(team1), nickname(team2)];
    if (!names[0] || !names[1]) { setError('أدخل اسمَي الفريقين أولًا.'); return; }
    if (!bestOf) { setError('اختَر عدد الجولات قبل إنشاء الغرفة.'); return; }
    setError(''); setPending(true);
    try {
      const next = await roomApi.create({ teams: names, bestOf });
      if (mounted.current) setRoom(next);
    } catch (err) { if (mounted.current) setError(failureMessage(err)); }
    finally { if (mounted.current) setPending(false); }
  }, [team1, team2, bestOf]);

  const start = useCallback(async () => {
    if (!room || !room.room.displayConnected) return;
    setError(''); setPending(true);
    try {
      const updated = await roomApi.command(room.room.code, room.room.revision, { kind: 'start' }, crypto.randomUUID());
      if (mounted.current) { setRoom(updated); onRoomStarted?.(updated); }
    } catch (err) {
      if (mounted.current) {
        setError(failureMessage(err));
        if (err instanceof RoomApiError && err.code === 'REVISION_CONFLICT') {
          try { setRoom(await roomApi.host(room.room.code)); } catch { /* keep original feedback */ }
        }
      }
    } finally { if (mounted.current) setPending(false); }
  }, [room, onRoomStarted]);

  const share = async () => {
    if (!room) return;
    try { await navigator.clipboard.writeText(new URL(room.displayUrl, window.location.origin).href); setCopied(true); }
    catch { setError('تعذّر نسخ الرابط. انسخه يدويًا من الحقل.'); }
  };

  const cancelWaitingRoom = async () => {
    if (!room || room.hostState.stage !== 'lobby' || pending) return;
    setPending(true);
    setError('');
    try {
      await roomApi.command(room.room.code, room.room.revision, {kind:'end_match'}, crypto.randomUUID());
      if (mounted.current) {
        setRoom(null);
        setCancelConfirm(false);
        setError('');
      }
    } catch(err) {
      if (mounted.current) {
        setError(failureMessage(err));
        if (err instanceof RoomApiError && err.code === 'REVISION_CONFLICT') {
          try { setRoom(await roomApi.host(room.room.code)); }
          catch { /* Show the original error and keep the room. */ }
        }
      }
    } finally {
      if (mounted.current) setPending(false);
    }
  };

  const closeRecovered = async () => {
    if (!recovered || pending) return;
    setPending(true); setError('');
    try {
      await roomApi.command(recovered.room.code,recovered.room.revision,{kind:'end_match'},crypto.randomUUID());
      if(mounted.current) {
        setRecovered(null);setRecoveredConfirm(false);
        // Leave blank team fields and no preselected best-of for a fresh match.
        setTeam1('');setTeam2('');setBestOf(null);
      }
    } catch(e) {
      if(mounted.current) {
        setError(failureMessage(e));
        if(e instanceof RoomApiError && e.code==='REVISION_CONFLICT') {
          try { setRecovered(await roomApi.host(recovered.room.code)); } catch { /* keep feedback */ }
        }
      }
    } finally { if(mounted.current) setPending(false); }
  };

  return <div className="letters-room" dir="rtl">
    <Header kind="host" onBack={onBack} />
    <main className={'letters-room__main'+(room && room.hostState.stage!=='lobby' ? ' letters-room__main--in-game' : '')}>
      <div className="letters-room__eyebrow">بلّشها • غرف المباريات</div>
      <h1>{room ? 'غرفة لعبة الحروف' : recovered ? 'عندك غرفة سابقة' : 'جهّز المواجهة'}</h1>
      <p className="letters-room__intro">{room ? 'الغرفة جاهزة. تابع لوحتك أو شارك رابط الشاشة.' :
        recovered ? 'لقينا غرفة نشطة من قبل. اختَر إذا بدك تكملها أو تغلقها وتبدأ مباراة جديدة.' :
        'سمّي الفريقين واختَر نظام المباراة بنفسك قبل إنشاء الغرفة.'}</p>
      {checking && <p role="status" className="letters-room__notice">جاري التحقق من وجود غرفة محفوظة…</p>}
      {!!error && <div role="alert" className="letters-room__error">{error}</div>}
      {!checking && !room && recovered && <section className="letters-room__panel letters-room__recovered">
        <div className="letters-room__status">الغرفة السابقة: <strong dir="ltr">{recovered.room.code}</strong> • {recovered.hostState.stage==='lobby'?'لم تبدأ بعد':'مباراة جارية'}</div>
        <TeamCards teams={recovered.hostState.teams} wins={recovered.hostState.wins} round={recovered.hostState.round} />
        <div className="letters-room__recovered-actions">
          <button type="button" className="letters-room__primary" disabled={pending}
            onClick={()=>{setRoom(recovered);setRecovered(null);setRecoveredConfirm(false);}}>
            استكمال الغرفة السابقة
          </button>
          {!recoveredConfirm && <button type="button" className="letters-room__secondary" disabled={pending}
            onClick={()=>setRecoveredConfirm(true)}>إنهاء الغرفة السابقة وإنشاء جديدة</button>}
        </div>
        {recoveredConfirm && <div className="letters-room__notice" role="group" aria-label="تأكيد إغلاق الغرفة السابقة">
          <strong>تأكيد الإغلاق</strong>
          <p>الغرفة السابقة رح تنتهي، وما رح تقدر تكمل مباراتها. متأكد بدك تبدأ من جديد؟</p>
          <button type="button" className="letters-host__end" disabled={pending}
            onClick={()=>void closeRecovered()}>{pending?'جاري الإغلاق…':'نعم، إغلاق الغرفة السابقة'}</button>
          <button type="button" className="letters-room__ghost" disabled={pending}
            onClick={()=>setRecoveredConfirm(false)}>تراجع</button>
        </div>}
      </section>}
      {!checking && !room && !recovered && <section className="letters-room__panel letters-room__form">
        <label>اسم الفريق الأول<input maxLength={45} value={team1} onChange={(e: ChangeEvent<HTMLInputElement>) => setTeam1(e.target.value)} placeholder="الفريق الأول" /></label>
        <label>اسم الفريق الثاني<input maxLength={45} value={team2} onChange={(e: ChangeEvent<HTMLInputElement>) => setTeam2(e.target.value)} placeholder="الفريق الثاني" /></label>
        <fieldset><legend>نظام المباراة</legend><div className="letters-room__options">{([1, 3, 5] as BestOf[]).map(value => <label key={value} className={value === bestOf ? 'is-selected' : ''}><input type="radio" name="bestOf" checked={bestOf === value} onChange={() => setBestOf(value)} />{value === 1 ? 'جولة واحدة' : `أفضل من ${value}`}</label>)}</div></fieldset>
        <button type="button" className="letters-room__primary" disabled={pending || !nickname(team1) || !nickname(team2) || !bestOf} onClick={() => void create()}>{pending ? 'جاري الإنشاء…' : 'إنشاء الغرفة'}</button>
      </section>}
      {room && <section className={`letters-room__panel letters-room__lobby ${room.hostState.stage === 'lobby' ? '' : 'letters-room__lobby--active'}`}>
        <div className="letters-room__status"><span className={room.room.displayConnected ? 'connected' : ''}>●</span>{room.room.displayConnected ? 'شاشة المتسابقين متصلة' : 'بانتظار اتصال شاشة المتسابقين'}</div>
        {offline && <p className="letters-room__notice">الاتصال بالخادم متقطع. حالة الغرفة محفوظة.</p>}
        {room.hostState.stage === 'lobby' ? <>
          <div className="letters-room__code-label">رمز الغرفة</div>
          <div className="letters-room__room-code" dir="ltr">{room.room.code}</div>
          <label className="letters-room__share">رابط شاشة المتسابقين<input readOnly dir="ltr" value={new URL(room.displayUrl, typeof window !== 'undefined' ? window.location.origin : 'https://baleshhaa.invalid').href} /></label>
          <button type="button" className="letters-room__secondary" onClick={() => void share()}>{copied ? 'تم نسخ الرابط' : 'نسخ رابط العرض'}</button>
        </> : <details className="letters-room__link-details">
          <summary>رمز الغرفة {room.room.code} • رابط شاشة المتسابقين</summary>
          <label className="letters-room__share">رابط العرض<input readOnly dir="ltr" value={new URL(room.displayUrl, typeof window !== 'undefined' ? window.location.origin : 'https://baleshhaa.invalid').href} /></label>
          <button type="button" className="letters-room__secondary" onClick={() => void share()}>{copied ? 'تم نسخ الرابط' : 'نسخ رابط العرض'}</button>
        </details>}
        <TeamCards teams={room.hostState.teams} wins={room.hostState.wins} round={room.hostState.round} />
        {room.hostState.stage === 'lobby' ? <>
          <p className="letters-room__notice">افتح رابط المتسابقين من جهاز آخر. بعد ما تتصل الشاشة، ابدأ المباراة وراح تظهر الأسئلة الحقيقية على لوحة المقدّم.</p>
          <button className="letters-room__primary" type="button" onClick={() => void start()} disabled={pending || !room.room.displayConnected}>{pending ? 'جاري البدء…' : 'ابدأ المباراة'}</button>
          {!cancelConfirm ? <button className="letters-room__secondary" type="button" disabled={pending}
            onClick={() => setCancelConfirm(true)}>إلغاء الغرفة التجريبية</button> :
            <div className="letters-room__notice" role="group" aria-label="تأكيد إلغاء الغرفة">
              <p>هل تريد إغلاق الغرفة؟ هيك تقدر تنشئ غرفة جديدة بنفس الحساب بدون انتظار انتهاء صلاحية الغرفة.</p>
              <button className="letters-room__secondary" type="button" disabled={pending} onClick={() => void cancelWaitingRoom()}>{pending?'جاري الإغلاق…':'نعم، إغلاق الغرفة'}</button>
              <button className="letters-room__ghost" type="button" disabled={pending} onClick={() => setCancelConfirm(false)}>تراجع</button>
            </div>}
        </> : room.hostState.stage==='abandoned' ?
          <button className="letters-room__primary" type="button" onClick={() => { setRoom(null); setCancelConfirm(false); }}>إنشاء غرفة جديدة</button> :
          <HostGameControls room={room} onUpdate={setRoom} />}
      </section>}
    </main>
  </div>;
}

function ViewerLobby({ initialCode, onBack }: Pick<RoomLobbyProps, 'initialCode' | 'onBack'>) {
  const [input, setInput] = useState(initialCode || '');
  const [code, setCode] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerRoom | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const joinedCode = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const join = useCallback(async (raw: string) => {
    const clean = codeOf(raw);
    if (!clean) { setError('رمز الغرفة لازم يكون من 6 أحرف أو أرقام.'); return; }
    if (joinedCode.current === clean) return;
    setPending(true); setError('');
    try {
      // Reuse a valid saved viewer token first; don't rotate it on refresh.
      let current: ViewerRoom;
      try { current = await roomApi.viewer(clean); }
      catch { current = await roomApi.join(clean); }
      if (mounted.current) {
        joinedCode.current = clean; setViewer(current); setCode(clean);
      }
    } catch (err) { if (mounted.current) setError(failureMessage(err)); }
    finally { if (mounted.current) setPending(false); }
  }, []);

  useEffect(() => { if (initialCode && codeOf(initialCode)) void join(initialCode); }, [initialCode, join]);
  useEffect(() => {
    if (!code) return;
    return watchRoom(code, state => {
      if (!mounted.current) return;
      setViewer(state); setOffline(false);
    }, () => { if (mounted.current) setOffline(true); });
  }, [code]);

  const state = viewer?.state;
  return <div className="letters-room letters-room--display" dir="rtl">
    <Header kind="viewer" onBack={onBack} />
    <main className="letters-room__main">
      {!state && <section className="letters-room__panel letters-room__viewer-join">
        <div className="letters-room__eyebrow">شاشة العرض • بدون حساب</div>
        <h1>جاهزين نبلّش؟</h1>
        <p>افتح الرابط اللي وصلك من المقدّم أو اكتب رمز الغرفة.</p>
        <label>رمز الغرفة<input dir="ltr" maxLength={6} value={input} onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value.toUpperCase())} placeholder="ABC123" /></label>
        <button type="button" className="letters-room__primary" disabled={pending} onClick={() => void join(input)}>{pending ? 'جاري الربط…' : 'انضم لشاشة العرض'}</button>
      </section>}
      {!!error && <div className="letters-room__error" role="alert">{error}</div>}
      {offline && <div className="letters-room__notice">انقطع الاتصال مؤقتًا؛ العرض رح يستعيد حالته تلقائيًا.</div>}
      {state && <section className="letters-room__live" aria-live="polite">
        <div className="letters-room__score-head"><span>الجولة {state.round} • {roomStage(state.stage)}</span><span>رمز الغرفة: {viewer?.room.code}</span></div>
        <TeamCards teams={state.teams} wins={state.wins} round={state.round} />
        {state.stage === 'lobby' ? <div className="letters-room__waiting"><div className="letters-room__big-hex">⬡</div><h2>بانتظار المقدّم</h2><p>متصلين بالغرفة وجاهزين للبداية.</p></div>
          : <div className="letters-room__game-area"><div className="letters-room__question-panel">
            <div className="letters-room__eyebrow">{state.stage === 'question' ? 'السؤال الحالي' : 'لعبة الحروف'}</div>
            <h2>{state.question?.text || (state.stage === 'between_rounds' ? 'انتهت الجولة' : 'اختاروا الحرف التالي')}</h2>
            {state.question?.revealedAnswer && <div className="letters-room__answer">الإجابة: {state.question.revealedAnswer}</div>}
            {state.question && !state.question.revealedAnswer && <p>الإجابة عند المقدّم فقط.</p>}
            {state.stage === 'finished' && <Outcome state={state} />}
          </div><Board state={state} /></div>}
      </section>}
    </main>
  </div>;
}

/** Import and mount only after the app's router intentionally exposes this route. */
export function LettersRoomLobby(props: RoomLobbyProps) {
  return props.mode === 'host'
    ? <HostLobby initialCode={props.initialCode} onBack={props.onBack} onRoomStarted={props.onRoomStarted} />
    : <ViewerLobby initialCode={props.initialCode} onBack={props.onBack} />;
}
