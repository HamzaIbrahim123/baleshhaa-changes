/**
 * Letter Arena — pure, deterministic game rules.
 * Call on a trusted server; never treat browser ownership edits as authoritative.
 * No database access, timers, network calls or storage side effects.
 */
export type Team = 0 | 1;
export type Color = 'orange' | 'green';
export type Owner = Color | null;
export type BestOf = 1 | 3 | 5;
export type Stage = 'lobby' | 'playing' | 'question' | 'between_rounds' | 'finished' | 'abandoned';
export type Attempt = 'opening' | 'turn' | 'opponent' | 'free';
export const ARABIC_LETTERS = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'] as const;
export const BOARD_SIZE = 5;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export interface SecretQuestion {
  id: string;
  text: string;
  answer: string;
  letter: string;
  revealed: boolean;
}
export interface MatchState {
  id: string;
  teams: [string, string];
  bestOf: BestOf;
  round: number;
  wins: [number, number];
  letters: string[];
  owners: Owner[];
  stage: Stage;
  currentCell: number | null;
  startingCell: number;
  turn: Team | null;
  attempt: Attempt | null;
  question: SecretQuestion | null;
  winner: Team | null;
  winningPath: number[];
  revision: number;
}
export interface DisplayState {
  id: string;
  teams: [string, string];
  bestOf: BestOf;
  round: number;
  wins: [number, number];
  letters: string[];
  owners: Owner[];
  stage: Stage;
  currentCell: number | null;
  startingCell: number;
  turn: Team | null;
  attempt: Attempt | null;
  question: { text: string; letter: string; revealedAnswer?: string } | null;
  winner: Team | null;
  winningPath: number[];
  revision: number;
}

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function inBounds(i: number): boolean { return Number.isInteger(i) && i >= 0 && i < CELL_COUNT; }
function randomIndex(size: number, rng: () => number): number {
  const value = rng();
  assert(Number.isFinite(value) && value >= 0 && value < 1, 'Invalid random source');
  return Math.floor(value * size);
}
function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, rng);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
/** Provide a secure RNG from the server for real games; inject seeded RNG in tests. */
export function generateRound(rng: () => number): { letters: string[]; firstCell: number } {
  const letters = shuffle(ARABIC_LETTERS, rng).slice(0, CELL_COUNT);
  return { letters: shuffle(letters, rng), firstCell: randomIndex(CELL_COUNT, rng) };
}
/** Fixed for every round: first team orange (left/right), second team green (top/bottom). */
export function colorForTeam(team: Team, _round: number): Color {
  return team === 0 ? 'orange' : 'green';
}
export function teamForColor(color: Color, _round: number): Team {
  return color === 'orange' ? 0 : 1;
}
/** odd-row horizontal offset; includes 6 edge neighbors, never diagonal corner touches. */
export function neighbors(index: number): number[] {
  assert(inBounds(index), 'Invalid cell');
  const r = Math.floor(index / BOARD_SIZE), c = index % BOARD_SIZE;
  const cells: Array<[number, number]> = [[r, c - 1], [r, c + 1]];
  const columns = r % 2 === 0 ? [c - 1, c] : [c, c + 1];
  for (const rr of [r - 1, r + 1]) for (const cc of columns) cells.push([rr, cc]);
  return cells.filter(([rr, cc]) => rr >= 0 && rr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE)
    .map(([rr, cc]) => rr * BOARD_SIZE + cc);
}
/** Returns one connected winning route, or an empty array. */
export function winningPath(owners: readonly Owner[], color: Color): number[] {
  assert(owners.length === CELL_COUNT, 'Invalid board length');
  const starts = Array.from({ length: CELL_COUNT }, (_, i) => i)
    .filter(i => owners[i] === color && (color === 'orange' ? i % BOARD_SIZE === 0 : i < BOARD_SIZE));
  const queue = [...starts], parents = new Map<number, number | null>();
  for (const i of starts) parents.set(i, null);
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const atGoal = color === 'orange' ? cell % BOARD_SIZE === BOARD_SIZE - 1 : cell >= CELL_COUNT - BOARD_SIZE;
    if (atGoal) {
      const route: number[] = [];
      let cursor: number | null = cell;
      while (cursor !== null) { route.push(cursor); cursor = parents.get(cursor) ?? null; }
      return route.reverse();
    }
    for (const next of neighbors(cell)) {
      if (owners[next] !== color || parents.has(next)) continue;
      parents.set(next, cell);
      queue.push(next);
    }
  }
  return [];
}

export function startMatch(id: string, names: [string, string], bestOf: BestOf, rng: () => number): MatchState {
  assert(id.trim().length > 0 && names.every(n => n.trim().length > 0), 'Missing match or team name');
  assert(bestOf === 1 || bestOf === 3 || bestOf === 5, 'Unsupported match format');
  const { letters, firstCell } = generateRound(rng);
  return { id, teams: [names[0].trim(), names[1].trim()], bestOf, round: 1, wins: [0, 0], letters,
    owners: Array(CELL_COUNT).fill(null), stage: 'playing', currentCell: null, startingCell: firstCell,
    turn: null, attempt: null, question: null, winner: null, winningPath: [], revision: 1 };
}
/** Arabic letters should match the first written letter of the answer (with alef variants normalized). */
export function initialLetter(answer: string): string {
  const clean = answer.trim().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/^[\s\p{P}\p{S}]+/gu, '');
  return clean[0]?.replace(/[إآٱأ]/, 'أ') || '';
}
export function answerMatchesLetter(answer: string, cellLetter: string): boolean {
  return initialLetter(answer) === initialLetter(cellLetter);
}
export function openQuestion(state: MatchState, cell: number, question: Omit<SecretQuestion, 'revealed' >): MatchState {
  assert(state.stage === 'playing', 'Question cannot be opened right now');
  assert(inBounds(cell) && state.owners[cell] === null, 'Cell is unavailable');
  assert(state.turn !== null || cell === state.startingCell, 'First letter must be randomly selected');
  assert(question.id.trim().length > 0 && question.text.trim().length > 0 && question.answer.trim().length > 0, 'Invalid question');
  assert(state.letters[cell] === question.letter && answerMatchesLetter(question.answer, question.letter), 'Question answer must start with selected letter');
  return { ...state, stage: 'question', currentCell: cell, attempt: state.turn === null ? 'opening' : 'turn',
    question: { ...question, revealed: false }, revision: state.revision + 1 };
}
export function recordWrongAnswer(state: MatchState): MatchState {
  assert(state.stage === 'question' && state.question !== null, 'No active question');
  const next: Attempt = state.attempt === 'turn' ? 'opponent' : 'free';
  return { ...state, attempt: next, revision: state.revision + 1 };
}
export function bothSurrender(state: MatchState): MatchState {
  assert(state.stage === 'question' && state.question !== null, 'No active question');
  return { ...state, question: { ...state.question, revealed: true }, attempt: 'free', revision: state.revision + 1 };
}
/** A second question for the *same* cell after both teams surrender. */
export function retrySameCell(state: MatchState, question: Omit<SecretQuestion, 'revealed'>): MatchState {
  assert(state.stage === 'question' && state.question?.revealed && state.currentCell !== null, 'Retry is not allowed');
  assert(question.id !== state.question.id, 'Cannot reuse revealed question');
  assert(question.letter === state.letters[state.currentCell] && answerMatchesLetter(question.answer, question.letter), 'Letter mismatch');
  return { ...state, question: { ...question, revealed: false }, attempt: 'free', revision: state.revision + 1 };
}
function finishCell(state: MatchState, owners: Owner[], assignedColor: Color): MatchState {
  const path = winningPath(owners, assignedColor);
  if (path.length === 0) return { ...state, owners, stage: 'playing', currentCell: null, attempt: null,
    question: null, winningPath: [], revision: state.revision + 1 };
  const victor = teamForColor(assignedColor, state.round), wins = [...state.wins] as [number, number];
  wins[victor]++;
  return { ...state, owners, wins, stage: wins[victor] >= (state.bestOf + 1) / 2 ? 'finished' : 'between_rounds',
    winner: victor, winningPath: path, currentCell: null, attempt: null, question: null, revision: state.revision + 1 };
}
export function awardCell(state: MatchState, team: Team): MatchState {
  assert(state.stage === 'question' && state.currentCell !== null && state.question, 'No question to award');
  assert(team === 0 || team === 1, 'Invalid team');
  if (state.attempt === 'turn') assert(team === state.turn, 'Only active team may answer first');
  if (state.attempt === 'opponent') assert(team !== state.turn, 'Opponent answers after the active team fails');
  const owners = [...state.owners];
  owners[state.currentCell] = colorForTeam(team, state.round);
  return finishCell({ ...state, turn: team }, owners, owners[state.currentCell]!);
}
/** Host correction mode: neutral → orange → green → neutral. Re-detect wins on every edit. */
export function cycleOwner(state: MatchState, cell: number): MatchState {
  assert(state.stage === 'playing' || state.stage === 'question', 'Cannot edit cells now');
  assert(inBounds(cell), 'Invalid cell');
  const owners = [...state.owners], before = owners[cell];
  owners[cell] = before === null ? 'orange' : before === 'orange' ? 'green' : null;
  // If editing while asking a question, do not drop its secret unless a win occurs.
  for (const color of ['orange', 'green'] as const) {
    if (winningPath(owners, color).length > 0) return finishCell(state, owners, color);
  }
  return { ...state, owners, revision: state.revision + 1 };
}
export function nextRound(state: MatchState, rng: () => number): MatchState {
  assert(state.stage === 'between_rounds', 'Match does not need another round');
  const next = generateRound(rng);
  return { ...state, stage: 'playing', round: state.round + 1, letters: next.letters,
    startingCell: next.firstCell, owners: Array(CELL_COUNT).fill(null), currentCell: null, attempt: null,
    turn: null, question: null, winner: null, winningPath: [], revision: state.revision + 1 };
}
export function publicState(state: MatchState): DisplayState {
  return { id: state.id, teams: [...state.teams] as [string, string], bestOf: state.bestOf,
    round: state.round, wins: [...state.wins] as [number, number], letters: [...state.letters],
    owners: [...state.owners], stage: state.stage, currentCell: state.currentCell, startingCell: state.startingCell,
    turn: state.turn, attempt: state.attempt,
    question: state.question ? { text: state.question.text, letter: state.question.letter,
      ...(state.question.revealed ? { revealedAnswer: state.question.answer } : {}) } : null,
    winner: state.winner, winningPath: [...state.winningPath], revision: state.revision };
}
