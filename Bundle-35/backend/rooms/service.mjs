/**
 * Baleshhaa — shared rooms service. This is the REST protocol and authoritative
 * state transition layer. Persistence is supplied by a transactional repository.
 * No Figma Make secrets, PG credentials, or user answers reach public projections.
 */
import { randomBytes, createHash, randomInt, randomUUID } from 'node:crypto';
import {
  startMatch, openQuestion, recordWrongAnswer, bothSurrender,
  retrySameCell, awardCell, cycleOwner, nextRound, publicState, teamForColor,
} from './engine.mjs';

export class RoomFailure extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const bad = (code, message, status = 400) => { throw new RoomFailure(status, code, message); };
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const generateRoomCode = () => Array.from(randomBytes(6), b => alphabet[b % alphabet.length]).join('');
export const newViewerToken = () => randomBytes(32).toString('hex');
export const digest = value => createHash('sha256').update(value).digest('hex');
export const secureRng = () => randomInt(0, 0x100000000) / 0x100000000;
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = { lobby: 'waiting', playing: 'active', question: 'active', between_rounds: 'active', finished: 'finished', abandoned: 'abandoned' };
const isTeam = team => team === 0 || team === 1;
function legalMove(change) {
  try { return change(); }
  catch (e) { if (e instanceof RoomFailure) throw e; bad('INVALID_MOVE', 'هذه الحركة غير مسموحة بحالة السؤال أو الجولة الحالية.', 409); }
}

function requireCode(code) {
  const up = String(code || '').trim().toUpperCase();
  if (!CODE.test(up)) bad('INVALID_ROOM_CODE', 'رمز الغرفة غير صالح.');
  return up;
}
function requireToken(header) {
  const token = /^Bearer ([a-zA-Z0-9._~+\/-]{20,300}=*)$/.exec(header || '')?.[1];
  if (!token) bad('AUTH_REQUIRED', 'يلزم رمز دخول صالح.', 401);
  return token;
}
function checkInput(input) {
  if (!input || input.gameId !== 'letters' || ![1, 3, 5].includes(input.bestOf)
      || !Array.isArray(input.teams) || input.teams.length !== 2
      || input.teams.some(x => typeof x !== 'string' || !x.trim() || x.trim().length > 45)) {
    bad('INVALID_SETUP', 'أدخل أسماء الفريقين ونظام الجولات بشكل صحيح.');
  }
  return { teams: input.teams.map(x => x.trim()), bestOf: input.bestOf };
}
function summary(room, nowMs) {
  return {
    code: room.code,
    gameId: room.game_id,
    status: room.status,
    revision: Number(room.revision),
    displayConnected: room.last_viewer_seen_at != null && nowMs - new Date(room.last_viewer_seen_at).getTime() < 35000,
    createdAt: new Date(room.created_at).toISOString(),
  };
}
function hostEnvelope(room, displayUrl, nowMs) {
  return { room: summary(room, nowMs), hostState: room.host_state, displayUrl };
}
function viewerEnvelope(room, nowMs) {
  // Make the projection from private state on EVERY read, not from client data.
  return { room: summary(room, nowMs), state: publicState(room.host_state) };
}
function updateStatus(state) { return statuses[state.stage]; }
function assertLiveRoom(room, nowMs) {
  if (!room || new Date(room.expires_at).getTime() <= nowMs) bad('ROOM_NOT_FOUND', 'الغرفة غير موجودة أو انتهت صلاحيتها.', 404);
}
function assertActiveState(state) {
  if (state.stage === 'abandoned' || state.stage === 'finished') bad('ROOM_CLOSED', 'المباراة منتهية.', 409);
}
async function applyCommand(room, command, pickQuestion, rng, nowMs) {
  const state = room.host_state;
  if (!command || typeof command.kind !== 'string') bad('INVALID_COMMAND', 'الأمر غير صالح.');
  assertActiveState(state);
  if (command.kind === 'start') {
    if (state.stage !== 'lobby') bad('INVALID_STAGE', 'المباراة بدأت بالفعل.', 409);
    const seen = room.last_viewer_seen_at ? new Date(room.last_viewer_seen_at).getTime() : 0;
    if (!seen || nowMs - seen > 35000) bad('DISPLAY_NOT_CONNECTED', 'يلزم اتصال شاشة المتسابقين قبل البدء.', 409);
    return { ...startMatch(room.id, state.teams, state.bestOf, rng), revision: state.revision + 1, editMode: false, askedCells: [], focusedCell: null };
  }
  // Explicit correction is only for PREVIOUSLY asked cells (not current cell).
  // The first cell's normal click flow requires no edit-mode toggle.
  if (command.kind === 'toggle_edit_mode') {
    if (!['playing', 'question'].includes(state.stage)) bad('INVALID_STAGE', 'لا يمكن التعديل في هذه المرحلة.', 409);
    if ((state.askedCells || []).length < 2) bad('NO_PREVIOUS_CELL', 'لا يوجد حرف سابق للتصحيح بعد.', 409);
    return { ...state, editMode: !Boolean(state.editMode), revision: state.revision + 1 };
  }
  if (command.kind === 'cycle_cell_color') {
    const cell = command.cell;
    if (!Number.isInteger(cell) || cell < 0 || cell > 24) bad('INVALID_CELL', 'رقم الخلية غير صحيح.');
    const asked = state.askedCells || [];
    if (state.editMode) {
      if (!asked.includes(cell) || cell === state.focusedCell)
        bad('CELL_UNAVAILABLE', 'في وضع التعديل، اختَر خلية سابقة وليست السؤال الحالي.', 409);
      const revised = legalMove(() => cycleOwner(state, cell));
      // Preserve the current question even if correcting an earlier answer.
      return { ...revised, editMode: revised.stage === 'playing' || revised.stage === 'question' };
    }
    if (cell !== state.focusedCell || !asked.includes(cell))
      bad('CELL_UNAVAILABLE', 'افتح سؤال هذا الحرف أولًا، أو استخدم زر تعديل خلية سابقة.', 409);
    if (state.stage === 'question' && state.question?.revealed)
      bad('RETRY_REQUIRED', 'بعد كشف الإجابة، اطلب سؤالًا جديدًا لنفس الحرف.', 409);
    if (!['playing','question'].includes(state.stage)) bad('INVALID_STAGE', 'الخلية ليست متاحة الآن.', 409);
    const updated = legalMove(() => cycleOwner(state, cell));
    if (['finished','between_rounds'].includes(updated.stage)) {
      return { ...updated, editMode: false };
    }
    const selectedColor = updated.owners[cell];
    // Always close an open question on coloring; fifth click never reopens it.
    return { ...updated, stage: 'playing', question: null, attempt: null, currentCell: null,
      turn: selectedColor ? teamForColor(selectedColor, state.round) : state.turn,
      editMode: false, focusedCell: cell };
  }
  if (state.editMode) bad('EDIT_MODE_ACTIVE', 'أنهِ تعديل الألوان قبل متابعة اللعب.', 409);
  switch (command.kind) {
    case 'open_question': {
      const cell = command.cell;
      if (!Number.isInteger(cell) || cell < 0 || cell > 24) bad('INVALID_CELL', 'رقم الخلية غير صحيح.');
      const asked = state.askedCells || [];
      if (state.stage !== 'playing' || state.owners[cell] !== null || asked.includes(cell))
        bad('CELL_UNAVAILABLE', 'سؤال هذا الحرف ظهر سابقًا في الجولة، ولا يُعاد.', 409);
      if (state.focusedCell !== null && state.focusedCell !== undefined && state.owners[state.focusedCell] === null)
        bad('FOCUSED_CELL_UNASSIGNED', 'حدّد لون الحرف الحالي قبل فتح سؤال جديد.', 409);
      if (state.turn === null && cell !== state.startingCell)
        bad('STARTING_CELL_REQUIRED', 'ابدأ بالحرف المضيء أولًا.', 409);
      const letter = state.letters[cell];
      const question = await pickQuestion(letter, room.host_user_id, room.id);
      if (!question) bad('NO_QUESTION_AVAILABLE', `ما في أسئلة منشورة متاحة للحرف ${letter}.`, 409);
      const opened = legalMove(() => openQuestion(state, cell, question));
      return { ...opened, askedCells: [...asked, cell], focusedCell: cell };
    }
    case 'wrong_answer': bad('OLD_COMMAND_DISABLED', 'التحكم صار مباشرة من الخلية، بدون زر نقل فرصة.', 409);
    case 'both_surrender': return legalMove(() => bothSurrender(state));
    case 'retry_same_letter': {
      if (state.stage !== 'question' || state.currentCell === null || !state.question?.revealed)
        bad('RETRY_UNAVAILABLE', 'يلزم كشف الإجابة السابقة أولًا.', 409);
      const letter = state.letters[state.currentCell];
      const question = await pickQuestion(letter, room.host_user_id, room.id);
      if (!question) bad('NO_QUESTION_AVAILABLE', `نفدت الأسئلة المتاحة للحرف ${letter}.`, 409);
      return legalMove(() => retrySameCell(state, question));
    }
    case 'correct_answer': bad('OLD_COMMAND_DISABLED', 'لوّن الخلية نفسها لتحديد الفريق، بدل أزرار صح.', 409);
    case 'next_round': return { ...legalMove(() => nextRound(state, rng)), askedCells: [], focusedCell: null, editMode: false };
    case 'end_match': return { ...state, stage: 'abandoned', editMode: false, revision: state.revision + 1 };
    default: bad('UNKNOWN_COMMAND', 'نوع الأمر غير معروف.');
  }
}

/**
 * Store methods are implemented in db.mjs. A single PostgreSQL transaction
 * locks the room and saves a command + question usage + state atomically.
 */
export function createRoomService(store, options = {}) {
  const rng = options.rng || secureRng;
  const now = options.now || Date.now;
  const appUrl = options.publicAppUrl || '';
  const displayUrl = code => appUrl ? appUrl.replace(/\/$/, '') + '/?display=1&room=' + code : '/?display=1&room=' + code;
  const needHost = async header => {
    const userId = await store.authenticate(digest(requireToken(header)));
    if (!userId) bad('AUTH_REQUIRED', 'سجّل الدخول أولًا.', 401);
    return userId;
  };
  return {
    async create(header, body) {
      const userId = await needHost(header), setup = checkInput(body);
      for (let attempt = 0; attempt < 6; attempt++) {
        const id = randomUUID(), code = generateRoomCode();
        const base = startMatch(id, setup.teams, setup.bestOf, rng);
        const state = { ...base, stage: 'lobby', revision: 0, editMode: false, askedCells: [], focusedCell: null };
        try {
          const room = await store.create({ id, code, userId, bestOf: setup.bestOf, state, projection: publicState(state) });
          return hostEnvelope(room, displayUrl(code), now());
        } catch (e) {
          if (e?.code === 'ROOM_CODE_TAKEN') continue;
          if (e?.code === 'ROOM_ALREADY_ACTIVE') bad('ROOM_ALREADY_ACTIVE', 'عندك غرفة نشطة؛ استرجعها أو أنهِ المباراة السابقة.', 409);
          throw e;
        }
      }
      bad('ROOM_CODE_FAILURE', 'تعذّر إنشاء رمز غرفة فريد.', 503);
    },
    async active(header) {
      const userId = await needHost(header), room = await store.activeForUser(userId);
      if (!room || new Date(room.expires_at).getTime() <= now()) return { room: null };
      return { room: hostEnvelope(room, displayUrl(room.code), now()) };
    },
    async host(header, code) {
      const userId = await needHost(header), clean = requireCode(code);
      const room = await store.byHost(clean, userId);
      assertLiveRoom(room, now());
      return hostEnvelope(room, displayUrl(clean), now());
    },
    async counts(header, code) {
      const userId = await needHost(header), clean = requireCode(code);
      const room = await store.byHost(clean, userId);
      assertLiveRoom(room, now());
      const counts = await store.questionCounts(userId);
      return { roomCode: clean, counts };
    },
    async join(code, fingerprint) {
      const clean = requireCode(code);
      try { await store.checkJoinRate(fingerprint || 'unknown'); }
      catch (e) { if (e?.code === 'RATE_LIMITED') bad('RATE_LIMITED', 'محاولات كثيرة؛ حاول بعد عدة دقائق.', 429); throw e; }
      const token = newViewerToken();
      const room = await store.join(clean, digest(token), now());
      assertLiveRoom(room, now());
      return { viewerToken: token, ...viewerEnvelope(room, now()) };
    },
    async viewer(authHeader, code) {
      const clean = requireCode(code);
      const token = requireToken(authHeader);
      const room = await store.byViewer(clean, digest(token), now());
      assertLiveRoom(room, now());
      return viewerEnvelope(room, now());
    },
    async command(header, code, payload) {
      const userId = await needHost(header), clean = requireCode(code);
      if (!payload || !UUID.test(payload.commandId || '') || !Number.isSafeInteger(payload.expectedRevision)
        || payload.expectedRevision < 0) bad('INVALID_REVISION', 'رقم مراجعة الغرفة أو رقم الأمر غير صحيح.');
      let room;
      try { room = await store.runCommand(clean, userId, payload.commandId, payload.expectedRevision,
        async (lockedRoom, pickQuestion) => {
          assertLiveRoom(lockedRoom, now());
          if (Number(lockedRoom.revision) !== payload.expectedRevision) bad('REVISION_CONFLICT', 'حالة الغرفة تغيرت؛ حدّثها قبل تنفيذ الأمر.', 409);
          const next = await applyCommand(lockedRoom, payload.command, pickQuestion, rng, now());
          if (next.revision !== Number(lockedRoom.revision) + 1) bad('REVISION_INVALID', 'التعديل يجب أن يزيد رقم المراجعة مرة واحدة.', 409);
          return { next, status: updateStatus(next), projection: publicState(next) };
        }); }
      catch (e) { if (e?.code === 'ROOM_NOT_FOUND') bad('ROOM_NOT_FOUND', 'الغرفة غير موجودة.', 404); throw e; }
      assertLiveRoom(room, now());
      return hostEnvelope(room, displayUrl(clean), now());
    },
  };
}

const respond = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

/** HTTP handler is dependency injected: can be tested without a live Neon DB. */
export function createRoomHandler(store, options = {}) {
  const service = createRoomService(store, options);
  const allowed = new Set((options.corsOrigins || '').split(',').map(x => x.trim()).filter(Boolean));
  const pepper = options.ipPepper || 'unset-room-pepper';
  const cors = origin => origin && allowed.has(origin) ? {
    'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type', 'vary': 'Origin',
  } : {};
  return { async fetch(request) {
    const url = new URL(request.url), origin = request.headers.get('origin'), headers = cors(origin);
    if (origin && !allowed.has(origin)) return respond({ error: { code: 'CORS_DENIED', message: 'المصدر غير مصرح له.' } }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (url.pathname === '/health' && request.method === 'GET') return respond({ ok: true, api: 'rooms', version: 2 }, 200, headers);
    try {
      const path = url.pathname.replace(/\/$/, ''), auth = request.headers.get('authorization');
      if (!path.startsWith('/api/rooms')) return respond({ error: { code: 'NOT_FOUND', message: 'المسار غير موجود.' } }, 404, headers);
      let body;
      if (request.method === 'POST') {
        const raw = await request.text();
        if (raw.length > 32768) bad('PAYLOAD_TOO_LARGE', 'حجم الطلب كبير جدًا.', 413);
        try { body = JSON.parse(raw || '{}'); } catch { bad('INVALID_JSON', 'بيانات الطلب غير صالحة.'); }
      }
      let data;
      const match = /^\/api\/rooms\/([A-HJ-NP-Z2-9]{6})\/(host|join|viewer|commands|counts)$/.exec(path);
      if (path === '/api/rooms' && request.method === 'POST') data = await service.create(auth, body);
      else if (path === '/api/rooms/active' && request.method === 'GET') data = await service.active(auth);
      else if (match) {
        const [, code, route] = match;
        if (route === 'host' && request.method === 'GET') data = await service.host(auth, code);
        else if (route === 'counts' && request.method === 'GET') data = await service.counts(auth, code);
        else if (route === 'join' && request.method === 'POST') {
          const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown';
          const fingerprint = digest(pepper + ':' + ip.slice(0, 64));
          data = await service.join(code, fingerprint);
        } else if (route === 'viewer' && request.method === 'GET') data = await service.viewer(auth, code);
        else if (route === 'commands' && request.method === 'POST') data = await service.command(auth, code, body);
      }
      if (!data) bad('NOT_FOUND', 'المسار غير موجود.', 404);
      return respond(data, path === '/api/rooms' && request.method === 'POST' ? 201 : 200, headers);
    } catch (e) {
      const failure = e instanceof RoomFailure ? e : null;
      if (!failure) console.error('Room API internal error', e);
      return respond({ error: { code: failure?.code || 'INTERNAL_ERROR', message: failure?.message || 'خطأ بالخادم؛ حاول مجددًا.' } }, failure?.status || 500, headers);
    }
  }};
}
