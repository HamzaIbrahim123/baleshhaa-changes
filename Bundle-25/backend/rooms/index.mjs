/**
 * Neon Functions entrypoint. Deploy as a NEW baleshhaarooms Function; do NOT
 * replace baleshhaaapi or baleshhaagame. DATABASE_URL comes from Neon itself.
 * Bundle with `neon functions deploy baleshhaarooms --src backend/rooms/index.mjs`
 * after `npm install pg @neon/functions` in the backend workspace.
 */
import pg from 'pg';
import { attachDatabasePool } from '@neon/functions';
import { createPgRoomStore } from './db.mjs';
import { createRoomHandler } from './service.mjs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing: link this Neon Function to a database');
if (!process.env.ROOM_ALLOWED_ORIGINS) throw new Error('ROOM_ALLOWED_ORIGINS must list authorized Figma Make / website origins');
if (!process.env.ROOM_IP_PEPPER || process.env.ROOM_IP_PEPPER.length < 24) throw new Error('ROOM_IP_PEPPER must contain a strong secret');
const pool = new pg.Pool({ connectionString:process.env.DATABASE_URL, max:5,
  idleTimeoutMillis:30000, connectionTimeoutMillis:7000 });
attachDatabasePool(pool);
const store = createPgRoomStore(pool);
export default createRoomHandler(store, {
  corsOrigins:process.env.ROOM_ALLOWED_ORIGINS,
  ipPepper:process.env.ROOM_IP_PEPPER,
  publicAppUrl:process.env.ROOM_PUBLIC_APP_URL || '',
});
