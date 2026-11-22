/**
 * Bundle 41 — presentation effects only, driven by authoritative server room snapshots.
 * No room commands, scores, ownership rules or secret answers are mutated here.
 * All sounds are original WebAudio synthesis from ../sfx.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DisplayState, MatchState } from './engine';
import { colorForTeam } from './engine';
import { playGameSound, unlockGameAudio } from '../sfx';
import './LettersVictoryEffects.css';

type LettersState = DisplayState | MatchState;
type Mode = 'host' | 'viewer';
type Snapshot = {
  code: string;
  revision: number;
  stage: LettersState['stage'];
  round: number;
  victoryKey: string | null;
  questionKey: string | null;
  answerRevealed: boolean;
  ownerKey: string;
};
type Celebration = {
  eventKey: string;
  winner: string;
  color: 'orange' | 'green';
  round: number;
  final: boolean;
};
const confetti = Array.from({ length: 34 }, (_, i) => i);
const winStage = (stage: LettersState['stage']) => stage === 'between_rounds' || stage === 'finished';
function revealed(state: LettersState): boolean {
  const question = state.question;
  if (!question) return false;
  return ('revealed' in question && question.revealed === true) ||
    ('revealedAnswer' in question && Boolean(question.revealedAnswer));
}
function snapshot(code: string, state: LettersState): Snapshot {
  const winner = state.winner;
  const isVictory = winStage(state.stage) && winner !== null && winner !== undefined;
  return {
    code,
    revision: state.revision,
    stage: state.stage,
    round: state.round,
    victoryKey: isVictory ? [code, state.round, winner, state.wins[winner]].join(':') : null,
    questionKey: state.stage === 'question' && state.question
      ? [state.round, state.currentCell, state.question.text].join(':')
      : null,
    answerRevealed: revealed(state),
    ownerKey: state.owners.join(','),
  };
}

/**
 * First snapshot on mount/room join is BASELINE only: never replay an old win.
 * Successive polls with the same authoritative revision never replay effects.
 * A fresh round produces a new win key even if the same team wins again.
 */
export function LettersVictoryEffects({
  mode, code, state,
}: { mode: Mode; code: string | null; state: LettersState | null }) {
  const [soundEnabled, setSoundEnabled] = useState(mode === 'host');
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const previous = useRef<Snapshot | null>(null);
  const lastWin = useRef<string | null>(null);
  const timeout = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (timeout.current !== null) window.clearTimeout(timeout.current); };
  }, []);

  useEffect(() => {
    if (!code || !state) {
      previous.current = null;
      lastWin.current = null;
      setCelebration(null);
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      timeout.current = null;
      return;
    }
    const now = snapshot(code, state);
    const before = previous.current;
    if (!before || before.code !== code) {
      // Do not celebrate when reopening an already-finished room.
      previous.current = now;
      lastWin.current = now.victoryKey;
      return;
    }
    if (now.revision < before.revision) return;
    previous.current = now;
    if (now.revision === before.revision) return;

    const newVictory = now.victoryKey && now.victoryKey !== lastWin.current &&
      (!winStage(before.stage) || before.round !== now.round);
    if (newVictory && now.victoryKey !== null && state.winner !== null && state.winner !== undefined) {
      lastWin.current = now.victoryKey;
      const winner = state.winner;
      setCelebration({
        eventKey: now.victoryKey,
        winner: state.teams[winner],
        color: colorForTeam(winner, state.round),
        round: state.round,
        final: state.stage === 'finished',
      });
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setCelebration(null), 4800);
      if (soundEnabled) playGameSound('win');
      return;
    }
    if (!soundEnabled) return;
    // Quiet feedback for new questions, revealed answers and assigned letters.
    // These are mutually exclusive for each server revision.
    if (now.questionKey && before.questionKey !== now.questionKey) playGameSound('question');
    else if (now.questionKey && !before.answerRevealed && now.answerRevealed) playGameSound('reveal');
    else if (now.ownerKey !== before.ownerKey && state.stage === 'playing') playGameSound('correct');
    else if (now.round !== before.round && state.stage === 'playing') playGameSound('next');
  }, [code, state, soundEnabled]);

  const toggleSound = () => {
    if (!soundEnabled) unlockGameAudio(); // Direct user gesture, needed for spectator autoplay rules.
    setSoundEnabled(enabled => !enabled);
  };
  return <>
    <button type="button" className={'letters-winfx__sound'+(soundEnabled ? ' letters-winfx__sound--on' : '')}
      aria-pressed={soundEnabled} title="تشغيل أو كتم مؤثرات لعبة الحروف"
      onClick={toggleSound}>
      <span aria-hidden="true">{soundEnabled ? '🔊' : '🔈'}</span>
      {soundEnabled ? 'الصوت شغّال' : 'تفعيل الصوت'}
    </button>
    {celebration && <div key={celebration.eventKey}
      className={'letters-winfx__overlay letters-winfx__overlay--'+celebration.color}
      role="status" aria-live="assertive" aria-atomic="true">
      <div className="letters-winfx__confetti" aria-hidden="true">
        {confetti.map(i => {
          const variables = {
            '--piece-angle': (i * 360 / confetti.length) + 'deg',
            '--piece-distance': (160 + (i % 5) * 34) + 'px',
            '--piece-delay': ((i * 43) % 450) + 'ms',
          } as CSSProperties;
          return <i key={i} style={variables} />;
        })}
      </div>
      <div className="letters-winfx__celebration">
        <span className="letters-winfx__trophy" aria-hidden="true">🏆</span>
        <span className="letters-winfx__label">{celebration.final ? 'بطل المواجهة' : 'الفائز بالجولة '+celebration.round}</span>
        <strong>{celebration.winner}</strong>
        <span className="letters-winfx__subtitle">{celebration.final ? 'مبروك الفوز بالمباراة!' : 'اكتمل مسار الفوز!'}</span>
      </div>
    </div>}
  </>;
}
