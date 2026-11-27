/** Parameterized PostgreSQL adapter. Private state never goes to HTTP directly. */
const room=r=>r&&({id:r.id,code:r.code,hostUserId:r.host_user_id,state:r.private_state});
const member=r=>r&&({id:r.id,accountId:r.account_id,code:r.code,lastSeen:Number(r.last_seen),revoked:r.revoked_at!==null});
export function createPgStore(pool){return {
 async authenticate(hash){const r=await pool.query(`SELECT u.id,u.display_name AS name FROM public.app_sessions s JOIN public.app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND NOT u.disabled LIMIT 1`,[hash]);return r.rows[0]||null;},
 async rate(key,limit){const r=await pool.query(`INSERT INTO codenames.rate_limits(key,bucket,attempts) VALUES($1,floor(extract(epoch FROM clock_timestamp())/300)::bigint,1) ON CONFLICT(key,bucket) DO UPDATE SET attempts=codenames.rate_limits.attempts+1 WHERE codenames.rate_limits.attempts<$2 RETURNING attempts`,[key,limit]);return !!r.rows.length;},
 async transaction(fn){const c=await pool.connect();const q=(s,p=[])=>c.query(s,p);const one=async(s,p)=> (await q(s,p)).rows[0];try{await q('BEGIN');const tx={
 now:async()=>Number((await one('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS ms')).ms),
 lockAccount:async id=>{await q('SELECT id FROM public.app_users WHERE id=$1 FOR UPDATE',[id]);},
 byToken:async hash=>member(await one(`SELECT m.*,r.code, floor(extract(epoch FROM m.last_seen_at)*1000)::bigint AS last_seen FROM codenames.members m JOIN codenames.rooms r ON r.id=m.room_id WHERE m.token_hash=decode($1,'hex')`,[hash])),
 lockRoom:async code=>room(await one('SELECT * FROM codenames.rooms WHERE code=$1 AND expires_at>clock_timestamp() FOR UPDATE',[code])),
 createRoom:async x=>room(await one(`INSERT INTO codenames.rooms(code,host_user_id,private_state,expires_at) VALUES($1,$2,$3::jsonb,clock_timestamp()+interval '24 hours') RETURNING *`,[x.code,x.hostUserId,JSON.stringify(x.state)])),
 addMember:async (id,m)=>{await q(`INSERT INTO codenames.members(room_id,id,account_id,token_hash,last_seen_at) VALUES($1,$2,$3,decode($4,'hex'),to_timestamp($5::double precision/1000))`,[id,m.id,m.accountId,m.hash,m.now]);},
 member:async(id,hash)=>member(await one(`SELECT *,floor(extract(epoch FROM last_seen_at)*1000)::bigint AS last_seen FROM codenames.members WHERE room_id=$1 AND token_hash=decode($2,'hex')`,[id,hash])),
 accountMember:async(id,a)=>!!(await one('SELECT 1 FROM codenames.members WHERE room_id=$1 AND account_id=$2 AND revoked_at IS NULL',[id,a])),
 members:async id=>(await q(`SELECT *,floor(extract(epoch FROM last_seen_at)*1000)::bigint AS last_seen FROM codenames.members WHERE room_id=$1`,[id])).rows.map(member),
 touch:async(id,m,now)=>{await q('UPDATE codenames.members SET last_seen_at=to_timestamp($3::double precision/1000) WHERE room_id=$1 AND id=$2 AND revoked_at IS NULL',[id,m,now]);},
 revoke:async(id,m,now)=>{await q('UPDATE codenames.members SET revoked_at=to_timestamp($3::double precision/1000) WHERE room_id=$1 AND id=$2 AND revoked_at IS NULL',[id,m,now]);},
 save:async(id,s,status)=>{await q('UPDATE codenames.rooms SET private_state=$2::jsonb,revision=$3,status=$4,updated_at=clock_timestamp() WHERE id=$1',[id,JSON.stringify(s),s.revision,status]);},
 command:async(id,cmd)=>{const r=await one('SELECT member_id,request_hash FROM codenames.commands WHERE room_id=$1 AND command_id=$2',[id,cmd]);return r&&{memberId:r.member_id,hash:r.request_hash};},
 record:async(id,o)=>{await q('INSERT INTO codenames.commands(room_id,command_id,member_id,revision,command_kind,request_hash) VALUES($1,$2,$3,$4,$5,$6)',[id,o.id,o.memberId,o.revision,o.kind,o.hash]);},
 words:async previous=>(await q(`SELECT word FROM codenames.words WHERE enabled ORDER BY (normalized_key=ANY($1::text[])),random() LIMIT 256`,[previous])).rows.map(r=>r.word)
 };const result=await fn(tx);await q('COMMIT');return result;}catch(e){await q('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
};}
