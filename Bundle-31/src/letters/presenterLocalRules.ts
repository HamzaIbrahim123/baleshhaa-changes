/**
 * Bundle 31: offline-only cell-click presenter rules.
 *
 * First click on neutral cell opens a question (starting cell chosen by engine).
 * Second click on that selected cell paints orange; third green; fourth neutral.
 * A previously painted cell can be corrected with the same three-color cycle.
 * Presenter chooses the winner; no wrong-answer / transfer button is needed.
 *
 * IMPORTANT: this uses the shared engine for winning paths/round outcomes but
 * DOES NOT change the real room backend/API authorization or commands.
 */
import { cycleOwner, openQuestion, teamForColor } from './engine';
import type { MatchState, SecretQuestion } from './engine';

export function presenterCellEnabled(state: MatchState, cell: number): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.owners.length) return false;
  if (state.stage === 'question') {
    return state.currentCell === cell && state.question !== null && !state.question.revealed;
  }
  if (state.stage !== 'playing') return false;
  // Paint a previously owned cell at any time; neutral cells open questions.
  return state.owners[cell] !== null || state.turn !== null || state.startingCell === cell;
}

export function presenterClickCell(
  state: MatchState,
  cell: number,
  getSampleQuestion: (letter: string) => Omit<SecretQuestion, 'revealed'>,
): MatchState {
  if (!presenterCellEnabled(state, cell)) return state;

  if (state.stage === 'playing' && state.owners[cell] === null) {
    return openQuestion(state, cell, getSampleQuestion(state.letters[cell]));
  }

  // For an open question, the second click assigns orange immediately.
  // Subsequent clicks cycle orange -> green -> neutral, with no team lock.
  const painted = cycleOwner(state, cell);
  if (painted.stage === 'finished' || painted.stage === 'between_rounds') {
    return painted;
  }

  const newColor = painted.owners[cell];
  const newTurn = newColor === null ? state.turn : teamForColor(newColor, state.round);

  // After assigning a color, close the question; this also removes the
  // answer from the local viewer projection until a new question opens.
  return {
    ...painted,
    stage: 'playing',
    currentCell: null,
    question: null,
    attempt: null,
    turn: newTurn,
  };
}
