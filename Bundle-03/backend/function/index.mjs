/** Baleshhaa Neon Function — auth + admin-managed game content.
 * DATABASE_URL is injected into Neon Functions; never send it to browser or GitHub.
 */
import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(rawScrypt);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw Error('Missing Neon-injected DATABASE_URL');
const dbEndpoint = 'https://' + new URL(DATABASE_URL).hostname + '/sql';
const usernameRE = /^[a-z0-9_.-]{3,40}$/;
const slugRE = /^[a-z0-9-]{2,40}$/;
const uuidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
function problem(status, code, message) { return json({ error: { code, message } }, status); }
async function sql(query, params = []) {
  const r = await fetch(dbEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Neon-Connection-String': DATABASE_URL },
    body: JSON.stringify({ query, params }), signal: AbortSignal.timeout(20000)
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) { console.error('DB error', r.status, data?.code || 'unknown'); throw Error('DATABASE_ERROR'); }
  return data?.rows || [];
}
const sha = value => createHash('sha256').update(value).digest('hex');
async function hashPassword(p) {
  const salt = randomBytes(16);
  const key = await scrypt(p, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 67108864 });
  return 'scrypt$16384$8$1$' + salt.toString('base64url') + '$' + key.toString('base64url');
}
async function checkPassword(p, hash) {
  try {
    const [alg, n, r, pa, salt, key] = hash.split('$');
    if (alg !== 'scrypt') return false;
    const ref = Buffer.from(key, 'base64url');
    const k = await scrypt(p, Buffer.from(salt, 'base64url'), ref.length, { N: +n, r: +r, p: +pa, maxmem: 67108864 });
    return timingSafeEqual(k, ref);
  } catch { return false; }
}
function expose(u) {
  return { id: u.id, username: u.username, displayName: u.display_name, role: u.role,
    disabled: u.disabled === true || u.disabled === 't', createdAt: u.created_at };
}
async function session(request) {
  const h = request.headers.get('authorization') || '';
  if (!/^Bearer [A-Za-z0-9_-]{32,}$/.test(h)) return null;
  const [u] = await sql(`SELECT u.id,u.username,u.display_name,u.role,u.disabled,u.created_at
    FROM app_sessions s JOIN app_users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND u.disabled=false LIMIT 1`, [sha(h.slice(7))]);
  return u || null;
}
async function makeSession(id) {
  const token = randomBytes(32).toString('base64url');
  await sql("INSERT INTO app_sessions(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '7 days')", [id, sha(token)]);
  return token;
}
async function limit(key, max) {
  const [r] = await sql(`INSERT INTO auth_rate_limits(key,hits,window_start) VALUES($1,1,now())
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN auth_rate_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE auth_rate_limits.hits+1 END,
    window_start=CASE WHEN auth_rate_limits.window_start<now()-interval '15 minutes' THEN now() ELSE auth_rate_limits.window_start END RETURNING hits`, [key]);
  return Number(r?.hits ?? 999) <= max;
}
async function body(req, max = 4096) {
  const declared = Number(req.headers.get('content-length'));
  if (declared > max) throw Object.assign(Error('Too large'), { status: 413 });
  const txt = await req.text();
  if (txt.length > max) throw Object.assign(Error('Too large'), { status: 413 });
  try { return JSON.parse(txt || '{}'); }
  catch { throw Object.assign(Error('Invalid JSON'), { status: 400 }); }
}
const clean = (v, max = 120) => typeof v === 'string' ? v.trim().slice(0, max + 1) : '';
const field = (v, max = 120) => { const s = clean(v, max); return s.length > 0 && s.length <= max ? s : null; };
const validStatus = (v, list) => list.includes(v) ? v : null;
const validId = s => typeof s === 'string' && uuidRE.test(s);
const assetPath = id => id ? '/api/media/' + id : null;
function mediaUrlify(row) { return { ...row, imageUrl: assetPath(row.image_id), imageId: row.image_id, image_id: undefined }; }
function cors(origin) {
  if (!origin) return {};
  const allowed = allowedOrigins.includes(origin) || /^http:\/\/localhost(?::\d+)?$/.test(origin)
    || /^https:\/\/[a-z0-9-]+\.figma\.(?:site|com)$/.test(origin);
  return allowed ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-max-age': '600', vary: 'Origin' } : {};
}
let seeded = false;
async function seedAdmin() {
  if (seeded || !process.env.INITIAL_ADMIN_HASH) return;
  const uname = process.env.INITIAL_ADMIN_USERNAME || 'baleshhaa_admin';
  if (!usernameRE.test(uname)) throw Error('Invalid admin bootstrap username');
  await sql(`INSERT INTO app_users(username,display_name,password_hash,role)
    SELECT $1,$2,$3,'admin' WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE role='admin')
    ON CONFLICT(username) DO NOTHING`, [uname, 'Baleshhaa Admin', process.env.INITIAL_ADMIN_HASH]);
  seeded = true;
}

function statusOk(flag, values) { return validStatus(flag, values) !== null; }

async function route(req) {
  await seedAdmin();
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method;
  if (p === '/' || p === '/api/health') {
    const [r] = await sql('SELECT current_database() AS db');
    return json({ ok: true, service: 'baleshhaa-live-api', database: r?.db });
  }
  if (p === '/api/games' && method === 'GET') {
    const games = await sql('SELECT id,title_ar,status,description_ar,image_id FROM games WHERE status <> $1 ORDER BY sort_order,title_ar', ['hidden']);
    return json({ games: games.map(mediaUrlify) });
  }
  if (p === '/api/catalog' && method === 'GET') {
    const gameId = clean(url.searchParams.get('gameId') || 'seen-jeem', 40);
    const sections = await sql(`SELECT id,game_id,title_ar,description_ar,image_id FROM app_sections WHERE game_id=$1 AND status='active' ORDER BY sort_order,title_ar`, [gameId]);
    const categories = await sql(`SELECT c.id,c.section_id,c.title_ar,c.description_ar,c.image_id,
      count(q.id) FILTER (WHERE q.status='published' AND q.points=200)::int AS count_200,
      count(q.id) FILTER (WHERE q.status='published' AND q.points=400)::int AS count_400,
      count(q.id) FILTER (WHERE q.status='published' AND q.points=600)::int AS count_600
      FROM app_categories c JOIN app_sections s ON s.id=c.section_id LEFT JOIN app_questions q ON q.category_id=c.id
      WHERE s.game_id=$1 AND s.status='active' AND c.status='active'
      GROUP BY c.id ORDER BY c.sort_order,c.title_ar`, [gameId]);
    return json({ sections: sections.map(mediaUrlify), categories: categories.map(c => ({ ...mediaUrlify(c),
      eligible: Number(c.count_200)>=2 && Number(c.count_400)>=2 && Number(c.count_600)>=2,
      // Real match/question API is a later milestone. Eligibility is informational only.
      playable: false })) });
  }
  const imageId = p.match(/^\/api\/media\/([0-9a-f-]{36})$/i)?.[1];
  if (imageId && method === 'GET' && validId(imageId)) {
    const [img] = await sql('SELECT mime_type,encode(image_data,\'base64\') AS data FROM app_media WHERE id=$1', [imageId]);
    if (!img) return problem(404, 'NOT_FOUND', 'الصورة غير موجودة.');
    return new Response(Buffer.from(img.data, 'base64'), { headers: { 'content-type': img.mime_type, 'cache-control': 'public,max-age=3600', 'x-content-type-options': 'nosniff' } });
  }
  if (p === '/api/auth/register' && method === 'POST') {
    const b = await body(req), username = clean(b.username, 40).toLowerCase(), name = field(b.displayName, 100), password = String(b.password || '');
    if (!usernameRE.test(username) || !name || password.length < 10 || password.length > 128)
      return problem(422, 'VALIDATION_ERROR', 'تحقق من الاسم وكلمة المرور (10 أحرف على الأقل).');
    if (!await limit('register:' + username, 5)) return problem(429, 'RATE_LIMITED', 'انتظر قبل المحاولة.');
    if ((await sql('SELECT id FROM app_users WHERE username=$1', [username])).length)
      return problem(409, 'USERNAME_TAKEN', 'اسم المستخدم موجود.');
    let rows;
    try { rows = await sql('INSERT INTO app_users(username,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,username,display_name,role,disabled,created_at', [username, name, await hashPassword(password)]); }
    catch { return problem(409, 'USERNAME_TAKEN', 'اسم المستخدم موجود.'); }
    return json({ user: expose(rows[0]), token: await makeSession(rows[0].id) }, 201);
  }
  if (p === '/api/auth/login' && method === 'POST') {
    const b = await body(req), username = clean(b.username, 40).toLowerCase(), password = String(b.password || '');
    if (!usernameRE.test(username) || password.length > 128) return problem(401, 'INVALID_CREDENTIALS', 'بيانات الدخول غير صحيحة.');
    if (!await limit('login:' + username, 12)) return problem(429, 'RATE_LIMITED', 'محاولات كثيرة، جرّب لاحقًا.');
    const [u] = await sql('SELECT id,username,display_name,password_hash,role,disabled,created_at FROM app_users WHERE username=$1', [username]);
    if (!u || u.disabled === true || u.disabled === 't' || !await checkPassword(password, u.password_hash))
      return problem(401, 'INVALID_CREDENTIALS', 'بيانات الدخول غير صحيحة.');
    return json({ user: expose(u), token: await makeSession(u.id) });
  }
  const user = await session(req);
  if (!user) return problem(401, 'UNAUTHORIZED', 'سجّل الدخول أولًا.');
  if (p === '/api/auth/me' && method === 'GET') return json({ user: expose(user) });
  if (p === '/api/auth/logout' && method === 'POST') {
    await sql('DELETE FROM app_sessions WHERE token_hash=$1', [sha((req.headers.get('authorization') || '').slice(7))]);
    return json({ ok: true });
  }
  if (p === '/api/auth/change-credentials' && method === 'POST') {
    const b = await body(req), old = String(b.oldPassword || ''), next = String(b.newPassword || ''), username = clean(b.newUsername || user.username, 40).toLowerCase();
    if (!usernameRE.test(username) || next.length < 10 || next.length > 128) return problem(422, 'VALIDATION_ERROR', 'كلمة المرور الجديدة 10 أحرف على الأقل.');
    const [u] = await sql('SELECT password_hash FROM app_users WHERE id=$1', [user.id]);
    if (!u || !await checkPassword(old, u.password_hash)) return problem(401, 'INVALID_CREDENTIALS', 'كلمة المرور الحالية غير صحيحة.');
    try { await sql('UPDATE app_users SET username=$1,password_hash=$2,updated_at=now() WHERE id=$3', [username, await hashPassword(next), user.id]); }
    catch { return problem(409, 'USERNAME_TAKEN', 'اسم المستخدم مستخدم.'); }
    await sql('DELETE FROM app_sessions WHERE user_id=$1', [user.id]);
    return json({ ok: true, requiresLogin: true });
  }
  if (!p.startsWith('/api/admin/')) return problem(404, 'NOT_FOUND', 'الصفحة غير موجودة.');
  if (user.role !== 'admin') return problem(403, 'FORBIDDEN', 'الصلاحية للأدمن فقط.');

  if (p === '/api/admin/stats' && method === 'GET') {
    const [stats] = await sql(`SELECT
      (SELECT count(*)::int FROM app_users) AS users,
      (SELECT count(*)::int FROM app_users WHERE role='admin') AS admins,
      (SELECT count(*)::int FROM app_sessions WHERE expires_at>now()) AS active_sessions,
      (SELECT count(*)::int FROM games) AS games,
      (SELECT count(*)::int FROM app_sections) AS sections,
      (SELECT count(*)::int FROM app_categories) AS categories,
      (SELECT count(*)::int FROM app_questions) AS questions`);
    return json({ stats });
  }
  if (p === '/api/admin/users' && method === 'GET') {
    const page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1));
    const rows = await sql('SELECT id,username,display_name,role,disabled,created_at FROM app_users ORDER BY created_at DESC LIMIT 20 OFFSET $1', [(page - 1) * 20]);
    return json({ users: rows.map(expose), page });
  }
  const userId = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})(?:\/(status))?$/i);
  if (userId && validId(userId[1])) {
    if (!userId[2] && method === 'GET') {
      const [row] = await sql(`SELECT u.id,u.username,u.display_name,u.role,u.disabled,u.created_at,
        (SELECT count(*)::int FROM app_sessions s WHERE s.user_id=u.id AND s.expires_at>now()) AS active_sessions
        FROM app_users u WHERE u.id=$1`, [userId[1]]);
      return row ? json({ user: { ...expose(row), activeSessions: row.active_sessions } }) : problem(404, 'NOT_FOUND', 'الحساب غير موجود.');
    }
    if (userId[2] === 'status' && method === 'PATCH') {
      const b = await body(req);
      if (typeof b.disabled !== 'boolean') return problem(422, 'VALIDATION_ERROR', 'حالة الحساب غير صحيحة.');
      if (userId[1] === user.id) return problem(403, 'SELF_MODIFICATION', 'لا يمكن تعطيل حسابك بنفسك.');
      const [result] = await sql('UPDATE app_users SET disabled=$1,updated_at=now() WHERE id=$2 AND role=\'player\' RETURNING id,username,display_name,role,disabled,created_at', [b.disabled, userId[1]]);
      if (!result) return problem(403, 'FORBIDDEN', 'يمكن تعطيل حسابات اللاعبين فقط.');
      if (b.disabled) await sql('DELETE FROM app_sessions WHERE user_id=$1', [userId[1]]);
      return json({ user: expose(result) });
    }
  }
  if (p === '/api/admin/games' && method === 'GET') {
    const rows = await sql('SELECT id,title_ar,description_ar,image_id,status,sort_order FROM games ORDER BY sort_order,title_ar');
    return json({ games: rows.map(mediaUrlify) });
  }
  if (p === '/api/admin/games' && method === 'POST') {
    const b = await body(req), id = clean(b.id, 40).toLowerCase(), title = field(b.titleAr), status = validStatus(b.status || 'coming_soon', ['active','coming_soon','hidden']);
    if (!slugRE.test(id) || !title || !status || (b.imageId && !validId(b.imageId))) return problem(422, 'VALIDATION_ERROR', 'راجع بيانات اللعبة.');
    try {
      const [row] = await sql('INSERT INTO games(id,title_ar,description_ar,status,sort_order,image_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,title_ar,description_ar,image_id,status,sort_order',
        [id, title, clean(b.descriptionAr, 1200), status, Number.isInteger(b.sortOrder) ? b.sortOrder : 0, b.imageId || null]);
      return json({ game: mediaUrlify(row) }, 201);
    } catch { return problem(409, 'CONFLICT', 'معرّف اللعبة مستخدم أو الصورة غير موجودة.'); }
  }
  const gameId = p.match(/^\/api\/admin\/games\/([a-z0-9-]{2,40})$/)?.[1];
  if (gameId && method === 'PATCH') {
    const b = await body(req), title = field(b.titleAr), status = validStatus(b.status, ['active','coming_soon','hidden']);
    if (!title || !status || (b.imageId && !validId(b.imageId))) return problem(422,'VALIDATION_ERROR','بيانات اللعبة غير صحيحة.');
    const [r] = await sql('UPDATE games SET title_ar=$1,description_ar=$2,status=$3,image_id=$4 WHERE id=$5 RETURNING id,title_ar,description_ar,image_id,status,sort_order',
      [title, clean(b.descriptionAr, 1200), status, b.imageId || null, gameId]);
    return r ? json({ game: mediaUrlify(r) }) : problem(404,'NOT_FOUND','اللعبة غير موجودة.');
  }
  if (p === '/api/admin/sections' && method === 'GET') {
    const rows = await sql('SELECT id,game_id,title_ar,description_ar,image_id,status,sort_order FROM app_sections ORDER BY sort_order,title_ar LIMIT 250');
    return json({ sections: rows.map(mediaUrlify) });
  }
  if (p === '/api/admin/sections' && method === 'POST') {
    const b = await body(req), title = field(b.titleAr), gameId = clean(b.gameId, 40), status = validStatus(b.status || 'active', ['active','hidden']);
    if (!title || !slugRE.test(gameId) || !status || (b.imageId && !validId(b.imageId))) return problem(422,'VALIDATION_ERROR','بيانات السيكشن غير صحيحة.');
    try {
      const [r] = await sql('INSERT INTO app_sections(game_id,title_ar,description_ar,image_id,status) VALUES($1,$2,$3,$4,$5) RETURNING id,game_id,title_ar,description_ar,image_id,status,sort_order',
        [gameId, title, clean(b.descriptionAr, 1200), b.imageId || null, status]);
      return json({ section: mediaUrlify(r) }, 201);
    } catch { return problem(409,'CONFLICT','اللعبة أو الصورة غير موجودة.'); }
  }
  const sectionId = p.match(/^\/api\/admin\/sections\/([0-9a-f-]{36})$/i)?.[1];
  if (sectionId && method === 'PATCH' && validId(sectionId)) {
    const b = await body(req), title = field(b.titleAr), status = validStatus(b.status, ['active','hidden']);
    if (!title || !status || (b.imageId && !validId(b.imageId))) return problem(422,'VALIDATION_ERROR','بيانات السيكشن غير صحيحة.');
    const [r] = await sql('UPDATE app_sections SET title_ar=$1,description_ar=$2,status=$3,image_id=$4,updated_at=now() WHERE id=$5 RETURNING id,game_id,title_ar,description_ar,image_id,status,sort_order',
      [title, clean(b.descriptionAr, 1200), status, b.imageId || null, sectionId]);
    return r ? json({ section: mediaUrlify(r) }) : problem(404,'NOT_FOUND','السيكشن غير موجود.');
  }
  if (p === '/api/admin/categories' && method === 'GET') {
    const rows = await sql('SELECT id,section_id,title_ar,description_ar,image_id,status,sort_order FROM app_categories ORDER BY sort_order,title_ar LIMIT 350');
    return json({ categories: rows.map(mediaUrlify) });
  }
  if (p === '/api/admin/categories' && method === 'POST') {
    const b = await body(req), title = field(b.titleAr), status = validStatus(b.status || 'active', ['active','hidden']);
    if (!title || !validId(b.sectionId) || !validId(b.imageId) || !status) return problem(422,'VALIDATION_ERROR','التصنيف يحتاج اسمًا وصورة وسيكشن.');
    try {
      const [r] = await sql('INSERT INTO app_categories(section_id,title_ar,description_ar,image_id,status) VALUES($1,$2,$3,$4,$5) RETURNING id,section_id,title_ar,description_ar,image_id,status,sort_order',
        [b.sectionId,title,clean(b.descriptionAr,1200),b.imageId,status]);
      return json({ category:mediaUrlify(r) },201);
    } catch { return problem(409,'CONFLICT','السيكشن أو الصورة غير موجودة.'); }
  }
  const catId = p.match(/^\/api\/admin\/categories\/([0-9a-f-]{36})$/i)?.[1];
  if (catId && method === 'PATCH' && validId(catId)) {
    const b = await body(req), title = field(b.titleAr), status = validStatus(b.status, ['active','hidden']);
    if (!title || !validId(b.imageId) || !status) return problem(422,'VALIDATION_ERROR','التصنيف يحتاج اسمًا وصورة صحيحة.');
    const [r] = await sql('UPDATE app_categories SET title_ar=$1,description_ar=$2,image_id=$3,status=$4,updated_at=now() WHERE id=$5 RETURNING id,section_id,title_ar,description_ar,image_id,status,sort_order',
      [title,clean(b.descriptionAr,1200),b.imageId,status,catId]);
    return r ? json({category:mediaUrlify(r)}) : problem(404,'NOT_FOUND','التصنيف غير موجود.');
  }
  if (p === '/api/admin/questions' && method === 'GET') {
    const id = url.searchParams.get('categoryId');
    if (id && !validId(id)) return problem(422,'VALIDATION_ERROR','معرّف التصنيف غير صحيح.');
    const rows = id
      ? await sql('SELECT id,category_id,question_text,answer_text,points,status,image_id,source_reference,created_at FROM app_questions WHERE category_id=$1 ORDER BY created_at DESC LIMIT 150', [id])
      : await sql('SELECT id,category_id,question_text,answer_text,points,status,image_id,source_reference,created_at FROM app_questions ORDER BY created_at DESC LIMIT 150');
    return json({questions:rows.map(mediaUrlify)});
  }
  if (p === '/api/admin/questions' && method === 'POST') {
    const b = await body(req), q = field(b.questionText, 1200), a = field(b.answerText, 1200), pts = Number(b.points);
    const status = validStatus(b.status || 'draft',['draft','published']);
    if (!q || !a || !validId(b.categoryId) || ![200,400,600].includes(pts) || !status || (b.imageId && !validId(b.imageId)))
      return problem(422,'VALIDATION_ERROR','السؤال يحتاج تصنيفًا ونصًا وإجابة ومستوى نقاط.');
    try {
      const [r] = await sql('INSERT INTO app_questions(category_id,question_text,answer_text,points,status,image_id,source_reference,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,category_id,question_text,answer_text,points,status,image_id,source_reference,created_at',
        [b.categoryId,q,a,pts,status,b.imageId||null,clean(b.sourceReference,500),user.id]);
      return json({question:mediaUrlify(r)},201);
    } catch { return problem(409,'CONFLICT','التصنيف أو الصورة غير موجودين.'); }
  }
  const questionId = p.match(/^\/api\/admin\/questions\/([0-9a-f-]{36})$/i)?.[1];
  if (questionId && method === 'PATCH' && validId(questionId)) {
    const b = await body(req), q = field(b.questionText,1200), a = field(b.answerText,1200),pts=Number(b.points),status=validStatus(b.status,['draft','published']);
    if (!q || !a || ![200,400,600].includes(pts) || !status || (b.imageId && !validId(b.imageId))) return problem(422,'VALIDATION_ERROR','بيانات السؤال غير صحيحة.');
    const [r] = await sql('UPDATE app_questions SET question_text=$1,answer_text=$2,points=$3,status=$4,image_id=$5,source_reference=$6,updated_at=now() WHERE id=$7 RETURNING id,category_id,question_text,answer_text,points,status,image_id,source_reference,created_at',
      [q,a,pts,status,b.imageId||null,clean(b.sourceReference,500),questionId]);
    return r ? json({question:mediaUrlify(r)}) : problem(404,'NOT_FOUND','السؤال غير موجود.');
  }
  if (p === '/api/admin/media' && method === 'POST') {
    const b = await body(req, 1450000);
    const match = typeof b.dataUrl === 'string' && b.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return problem(422,'INVALID_MEDIA','الصورة يجب أن تكون PNG أو JPG أو WebP.');
    const bytes=Buffer.from(match[2],'base64');
    if (!bytes.length || bytes.length>1048576) return problem(413,'IMAGE_TOO_LARGE','الحد الأقصى للصورة 1MB.');
    const h=bytes.subarray(0,16).toString('hex');
    const valid=match[1]==='image/png'?h.startsWith('89504e470d0a1a0a'):
      match[1]==='image/jpeg'?h.startsWith('ffd8ff'):
      (bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP');
    if (!valid) return problem(422,'INVALID_MEDIA','محتوى الصورة لا يطابق نوعها.');
    const [r]=await sql('INSERT INTO app_media(owner_user_id,mime_type,byte_count,image_data) VALUES ($1,$2,$3,decode($4,\'base64\')) RETURNING id',
      [user.id,match[1],bytes.length,bytes.toString('base64')]);
    return json({id:r.id,imageUrl:assetPath(r.id)},201);
  }
  return problem(404,'NOT_FOUND','الصفحة غير موجودة.');
}
export default {
  async fetch(req) {
    const origin=req.headers.get('origin'),headers=cors(origin);
    if(req.method==='OPTIONS') return new Response(null,{status:origin&&!headers['access-control-allow-origin']?403:204,headers});
    if(origin&&!headers['access-control-allow-origin']) return problem(403,'ORIGIN_NOT_ALLOWED','المصدر غير مسموح.');
    try {
      const response=await route(req);
      for(const [k,v] of Object.entries(headers)) response.headers.set(k,v);
      return response;
    }catch(e){
      console.error('Baleshhaa API failed',e instanceof Error?e.message:'unknown');
      const response=problem(e?.status===413?413:e?.status===400?400:500,e?.status===413?'TOO_LARGE':e?.status===400?'BAD_JSON':'SERVER_ERROR','تعذّر تنفيذ الطلب.');
      for(const [k,v] of Object.entries(headers))response.headers.set(k,v);
      return response;
    }
  }
};
