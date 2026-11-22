/**
 * Bundle 26 — Neon Function entry point for shared Game Rooms.
 * Neon injects deployment environment at request dispatch, NOT necessarily at
 * module evaluation time. Never inspect ROOM_* or DATABASE_URL at import time.
 * Keep this new function separate from the Seen Jeem API and game Functions.
 */
import pg from 'pg';
import { attachDatabasePool } from '@neon/functions';
import { createPgRoomStore } from './db.mjs';
import { createRoomHandler } from './service.mjs';

let handler;

function initialize() {
  const databaseUrl = process.env.DATABASE_URL;
  const corsOrigins = process.env.ROOM_ALLOWED_ORIGINS;
  const ipPepper = process.env.ROOM_IP_PEPPER;
  if (!databaseUrl || !corsOrigins || !ipPepper || ipPepper.length < 24) {
    throw new Error('Room Function environment is incomplete');
  }
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 7000,
  });
  attachDatabasePool(pool);
  return createRoomHandler(createPgRoomStore(pool), {
    corsOrigins,
    ipPepper,
    publicAppUrl: process.env.ROOM_PUBLIC_APP_URL || '',
  });
}

/** Failure mode is a generic 503; secrets and database URLs never appear in HTTP. */
export default {
  async fetch(request) {
    try {
      if (!handler) handler = initialize();
      return await handler.fetch(request);
    } catch (error) {
      // A failed initialization should be retried if the platform recycles the env.
      if (!handler) console.error('Room Function initialization failed', error?.message || 'unknown');
      return new Response(JSON.stringify({
        error: { code: 'ROOM_BACKEND_UNAVAILABLE', message: 'خدمة الغرف غير جاهزة حاليًا.' },
      }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};