/** PostgreSQL repository for the shared-room Neon Function. SQL is parameterized. */
import { answerMatchesLetter } from './engine.mjs';

function mapDbFailure(err) {
  if (err?.code === '23505') {
    const e = new Error('Unique conflict');
    e.code = err.constraint === 'game_rooms_code_key' ? 'ROOM_CODE_TAKEN' : 'ROOM_ALREADY_ACTIVE';
    return e;
  }
  return err;
}

export function createPgRoomStore(pool) {
  return {
    async authenticate(tokenHash) {
      const r = await pool.query(`
        SELECT u.id FROM public.app_sessions s
        JOIN public.app_users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > now() AND u.disabled = false
        LIMIT 1`, [tokenHash]);
      return r.rows[0]?.id || null;
    },
    async create({ id, code, userId, bestOf, state, projection }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Expired rooms must not block the one-active-per-game constraint.
        await client.query(`UPDATE public.game_rooms
          SET status='abandoned',updated_at=now()
          WHERE host_user_id=$1 AND game_id='letters' AND expires_at<=now()
            AND status IN ('waiting','active')`, [userId]);
        const r = await client.query(`
          INSERT INTO public.game_rooms
            (id, code, game_id, host_user_id, status, series_length, revision, host_state, display_state)
          VALUES ($1,$2,'letters',$3,'waiting',$4,0,$5::jsonb,$6::jsonb)
          RETURNING *`, [id, code, userId, bestOf, JSON.stringify(state), JSON.stringify(projection)]);
        await client.query('COMMIT');
        return r.rows[0];
      } catch (e) {
        await client.query('ROLLBACK');
        throw mapDbFailure(e);
      } finally { client.release(); }
    },
    async activeForUser(userId) {
      const r = await pool.query(`
        SELECT * FROM public.game_rooms
        WHERE host_user_id=$1 AND game_id='letters' AND status IN ('waiting','active')
          AND expires_at > now()
        ORDER BY created_at DESC LIMIT 1`, [userId]);
      return r.rows[0] || null;
    },
    async byHost(code, userId) {
      const r = await pool.query(`
        SELECT * FROM public.game_rooms
        WHERE code=$1 AND host_user_id=$2 AND game_id='letters' LIMIT 1`, [code, userId]);
      return r.rows[0] || null;
    },
    async questionCounts(userId) {
      // Counts are private to the authenticated host; no question or answer data
      // is exposed to viewers. Seen items are never offered again to this host.
      const r = await pool.query(`
        SELECT q.leading_letter, COUNT(*)::integer AS remaining
        FROM public.letter_questions q
        WHERE q.status='published' AND NOT EXISTS (
          SELECT 1 FROM public.letter_user_question_usage u
          WHERE u.user_id=$1 AND u.question_id=q.id
        )
        GROUP BY q.leading_letter`, [userId]);
      return Object.fromEntries(r.rows.map(row => [row.leading_letter, Number(row.remaining)]));
    },
    async checkJoinRate(fingerprint) {
      const bucket = Math.floor(Date.now() / 300000) * 300000;
      const r = await pool.query(`
        INSERT INTO public.game_room_join_limits(fingerprint,bucket_start,attempts)
        VALUES ($1,to_timestamp($2::bigint / 1000.0),1)
        ON CONFLICT(fingerprint,bucket_start) DO UPDATE
          SET attempts=game_room_join_limits.attempts+1
        WHERE game_room_join_limits.attempts<30
        RETURNING attempts`, [fingerprint, bucket]);
      if (!r.rows.length) {
        const e = new Error('محاولات كثيرة؛ حاول بعد عدة دقائق.'); e.code = 'RATE_LIMITED'; throw e;
      }
    },
    async join(code, viewerHash) {
      const r = await pool.query(`
        UPDATE public.game_rooms SET viewer_token_hash=decode($2,'hex'),
          last_viewer_seen_at=now(), updated_at=now()
        WHERE code=$1 AND game_id='letters' AND status IN ('waiting','active')
          AND expires_at>now()
        RETURNING *`, [code, viewerHash]);
      return r.rows[0] || null;
    },
    async byViewer(code, viewerHash) {
      const r = await pool.query(`
        UPDATE public.game_rooms SET last_viewer_seen_at=now()
        WHERE code=$1 AND game_id='letters'
          AND viewer_token_hash=decode($2,'hex') AND expires_at>now()
        RETURNING *`, [code, viewerHash]);
      return r.rows[0] || null;
    },
    async runCommand(code, userId, commandId, expectedRevision, transition) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const current = await client.query(`
          SELECT * FROM public.game_rooms
          WHERE code=$1 AND host_user_id=$2 AND game_id='letters'
            AND expires_at>now()
          FOR UPDATE`, [code, userId]);
        const room = current.rows[0];
        if (!room) { const e = new Error('Room not found'); e.code = 'ROOM_NOT_FOUND'; throw e; }
        const duplicate = await client.query(`
          SELECT 1 FROM public.game_room_commands WHERE room_id=$1 AND command_id=$2`, [room.id, commandId]);
        if (duplicate.rows.length) {
          await client.query('COMMIT');
          return room;
        }
        const pickQuestion = async (letter, questionUserId, roomId) => {
          // Use the same connection as the room lock; usage is committed atomically.
          for (let attempt=0; attempt<5; attempt++) {
            const found = await client.query(`
              SELECT q.id, q.question_text, q.answer_text, q.leading_letter
              FROM public.letter_questions q
              WHERE q.leading_letter=$1 AND q.status='published'
                AND NOT EXISTS (
                  SELECT 1 FROM public.letter_user_question_usage u
                  WHERE u.question_id=q.id AND u.user_id=$2
                )
              ORDER BY random() LIMIT 1`, [letter, questionUserId]);
            const q = found.rows[0];
            if (!q) return null;
            // Reject invalid authoring data instead of sending the wrong answer.
            if (!answerMatchesLetter(q.answer_text, letter)) {
              const e = new Error('Published question has invalid leading letter');
              e.code='BAD_QUESTION_DATA'; throw e;
            }
            const inserted = await client.query(`
              INSERT INTO public.letter_user_question_usage(user_id,question_id,room_id)
              VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING question_id`, [questionUserId, q.id, roomId]);
            if (!inserted.rows.length) continue;
            return { id:q.id, text:q.question_text, answer:q.answer_text, letter };
          }
          return null;
        };
        const result = await transition(room, pickQuestion);
        const updated = await client.query(`
          UPDATE public.game_rooms
          SET status=$2, revision=$3, host_state=$4::jsonb,
              display_state=$5::jsonb, updated_at=now()
          WHERE id=$1 RETURNING *`, [room.id, result.status, result.next.revision,
          JSON.stringify(result.next), JSON.stringify(result.projection)]);
        await client.query(`
          INSERT INTO public.game_room_commands(room_id,command_id,revision,command_type)
          VALUES($1,$2,$3,$4)`, [room.id, commandId, result.next.revision, result.next.stage]);
        await client.query('COMMIT');
        return updated.rows[0];
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
    },
  };
}
