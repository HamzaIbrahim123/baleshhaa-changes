/**
 * Bundle 36: verified live Room API client, including private per-presenter counts.
 * Bundle 25: typed Room API client matching the tested backend source.
 * API calls remain disabled until the separately deployed room Function is configured.
 * Never call the existing Seen Jeem API
 * for Letters room commands: it has different auth and match semantics.
 */
import type { BestOf, DisplayState, MatchState } from './engine';

export interface RoomSummary {
  code: string;
  gameId: 'letters' | 'codenames';
  status: 'waiting' | 'active' | 'finished' | 'abandoned';
  revision: number;
  displayConnected: boolean;
  createdAt: string;
}
export interface HostRoom {
  room: RoomSummary;
  hostState: MatchState;
  displayUrl: string;
  // QR is rendered client-side from displayUrl, not stored as another room.
}
export interface ViewerRoom {
  room: RoomSummary;
  state: DisplayState;
}
export interface CreateLettersRoom {
  teams: [string, string];
  bestOf: BestOf;
}
export interface HostQuestionCounts {
  roomCode: string;
  counts: Record<string, number>;
}
export type RoomCommand =
  | { kind: 'start' }
  | { kind: 'open_question'; cell: number }
  | { kind: 'both_surrender' }
  | { kind: 'retry_same_letter' }
  | { kind: 'toggle_edit_mode' }
  | { kind: 'cycle_cell_color'; cell: number; requireWinConfirmation?: boolean }
  | { kind: 'confirm_win' }
  | { kind: 'reject_win' }
  | { kind: 'next_round' }
  | { kind: 'end_match' };

export class RoomApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'RoomApiError';
  }
}
const AUTH_TOKEN = 'baleshhaa:auth-token:v1';
const VIEWER_PREFIX = 'baleshhaa:viewer-room:';
/** Public (NOT secret) API address of the separately deployed production Rooms Neon Function. */
export const LIVE_ROOMS_API_BASE =
  'https://br-autumn-pond-b92zfumu-baleshhaarooms.compute.c-7.eu-central-1.aws.neon.tech';
const trimBase = (s: string) => s.replace(/\/+$/, '');
/** QA deployments may override Vite env; the published Figma site works without env setup. */
export function roomsBackendConfigured(): boolean {
  return Boolean(LIVE_ROOMS_API_BASE);
}
function baseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const value = env?.VITE_LETTERS_ROOM_API_BASE?.trim() || LIVE_ROOMS_API_BASE;
  if (!value) throw new RoomApiError(0, 'ROOM_BACKEND_NOT_DEPLOYED', 'نظام الغرف لم يتم نشره على الخادم بعد.');
  return trimBase(value);
}
function readSession(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
async function request<T>(path: string, method: 'GET' | 'POST', audience: 'host' | 'viewer', payload?: object): Promise<T> {
  const hostToken = audience === 'host' ? localStorage.getItem(AUTH_TOKEN) : null;
  const roomCode = path.match(/^\/rooms\/([A-Za-z0-9]{6,8})/)?.[1];
  const viewerToken = audience === 'viewer' && roomCode ? readSession(VIEWER_PREFIX + roomCode) : null;
  const token = audience === 'host' ? hostToken : viewerToken;
  if (audience === 'host' && !token) throw new RoomApiError(401, 'LOGIN_REQUIRED', 'سجّل الدخول أولًا لإنشاء أو إدارة الغرفة.');
  const response = await fetch(baseUrl() + '/api' + path, {
    method, cache: 'no-store',
    headers: { ...(payload ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new RoomApiError(response.status, data?.error?.code || 'ROOM_ERROR', data?.error?.message || 'تعذّر الاتصال بالغرفة.');
  return data as T;
}
/** Server MUST verify the logged-in host, room ownership and revision atomically. */
export const roomApi = {
  create: (input: CreateLettersRoom) => request<HostRoom>('/rooms', 'POST', 'host', { gameId: 'letters', ...input }),
  host: (code: string) => request<HostRoom>('/rooms/' + encodeURIComponent(code) + '/host', 'GET', 'host'),
  counts: (code: string) => request<HostQuestionCounts>('/rooms/' + encodeURIComponent(code) + '/counts', 'GET', 'host'),
  active: () => request<{room:HostRoom|null}>('/rooms/active', 'GET', 'host'),
  /** Viewer POST /join is public but rate-limited; server returns a short-lived viewer token. */
  async join(code: string): Promise<ViewerRoom> {
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,8}$/.test(clean)) throw new RoomApiError(400, 'INVALID_ROOM_CODE', 'رمز الغرفة غير صحيح.');
    const result = await request<{ viewerToken: string; room: RoomSummary; state: DisplayState }>(
      '/rooms/' + clean + '/join', 'POST', 'viewer', {});
    sessionStorage.setItem(VIEWER_PREFIX + clean, result.viewerToken);
    return { room: result.room, state: result.state };
  },
  viewer: (code: string) => request<ViewerRoom>('/rooms/' + encodeURIComponent(code) + '/viewer', 'GET', 'viewer'),
  command: (code: string, expectedRevision: number, command: RoomCommand, commandId: string) =>
    request<HostRoom>('/rooms/' + encodeURIComponent(code) + '/commands', 'POST', 'host', { expectedRevision, commandId, command }),
};

/** Polling fallback while Neon Realtime is disabled. Cleanup on page unmount. */
export function watchRoom(code: string, onState: (room: ViewerRoom) => void, onError: (e: Error) => void, intervalMs = 1500): () => void {
  let stopped = false, inFlight = false;
  const tick = async () => {
    if (stopped || inFlight || document.visibilityState === 'hidden') return;
    inFlight = true;
    try { const result = await roomApi.viewer(code); if (!stopped) onState(result); }
    catch (e) { if (!stopped) onError(e instanceof Error ? e : new Error('تعذّر التحديث')); }
    finally { inFlight = false; }
  };
  const timer = window.setInterval(tick, Math.max(1000, intervalMs));
  void tick();
  return () => { stopped = true; window.clearInterval(timer); };
}


/** Host refresh while viewer connects/disconnects; never writes host state. */
export function watchHostRoom(code: string, onState: (room: HostRoom) => void, onError: (e: Error) => void, intervalMs = 2500): () => void {
  let stopped = false, inFlight = false;
  const tick = async () => {
    if (stopped || inFlight || document.visibilityState === 'hidden') return;
    inFlight = true;
    try { const result = await roomApi.host(code); if (!stopped) onState(result); }
    catch (e) { if (!stopped) onError(e instanceof Error ? e : new Error('تعذّر تحديث غرفة المقدّم')); }
    finally { inFlight = false; }
  };
  const timer = window.setInterval(tick, Math.max(1200, intervalMs));
  void tick();
  return () => { stopped = true; window.clearInterval(timer); };
}
