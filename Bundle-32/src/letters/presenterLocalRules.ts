/**
 * Bundle 32 — presenter click rules, offline-only.
 *
 * One question per cell per round. After first opening, the focused cell
 * cycles neutral -> orange -> green -> neutral -> orange... without reopening.
 * Other cells stay locked while the focused cell is neutral.
 * Previously asked cells are corrected in an explicit edit mode only.
 *
 * Uses the production engine for question validation, color changes,
 * winning paths and round results; does not change live room API behavior.
 */
import { cycleOwner, openQuestion, teamForColor } from './engine';
import type { MatchState, SecretQuestion } from './engine';

export type PresenterClickContext = {
  askedCells: readonly number[];
  focusedCell: number | null;
  correctionMode: boolean;
};
export type PresenterClickResult = {
  match: MatchState;
  askedCells: number[];
  focusedCell: number | null;
};

export function presenterCellEnabled(state: MatchState, cell: number, context: PresenterClickContext): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.owners.length) return false;
  if (state.stage !== 'playing' && state.stage !== 'question') return false;

  if (context.correctionMode) {
    // Only earlier asked cells may be corrected; do not replace the live question.
    return context.askedCells.includes(cell) && context.focusedCell !== cell;
  }

  if (context.focusedCell === cell) {
    return state.stage === 'playing' || Boolean(state.question && !state.question.revealed);
  }
  if (state.stage === 'question') return false;
  if (context.focusedCell !== null && state.owners[context.focusedCell] === null) return false;
  if (context.askedCells.includes(cell)) return false;

  // Opening question starts at the server-engine's random starting cell.
  if (state.turn === null) return cell === state.startingCell;
  return state.owners[cell] === null;
}

export function presenterClickCell(
  state: MatchState,
  cell: number,
  context: PresenterClickContext,
  getSampleQuestion: (letter: string) => Omit<SecretQuestion, 'revealed'>,
): PresenterClickResult {
  const unchanged = ():PresenterClickResult => ({
    match: state, askedCells: [...context.askedCells], focusedCell: context.focusedCell,
  });
  if (!presenterCellEnabled(state, cell, context)) return unchanged();

  if (context.correctionMode) {
    // Keep the current question open while correcting a previously owned cell.
    const corrected = cycleOwner(state, cell);
    return { match: corrected, askedCells: [...context.askedCells], focusedCell: context.focusedCell };
  }

  if (context.focusedCell === cell) {
    // The question was already opened for this cell: NEVER reopen it.
    const painted = cycleOwner(state, cell);
    if (painted.stage === 'finished' || painted.stage === 'between_rounds') {
      return { match: painted, askedCells: [...context.askedCells], focusedCell: cell };
    }
    const color = painted.owners[cell];
    return {
      match: {
        ...painted,
        stage: 'playing',
        currentCell: null,
        question: null,
        attempt: null,
        turn: color === null ? state.turn : teamForColor(color, state.round),
      },
      askedCells: [...context.askedCells],
      focusedCell: cell,
    };
  }

  // A new, previously unasked cell: first click opens a question only once.
  const opened = openQuestion(state, cell, getSampleQuestion(state.letters[cell]));
  return {
    match: opened,
    askedCells: [...context.askedCells, cell],
    focusedCell: cell,
  };
}
