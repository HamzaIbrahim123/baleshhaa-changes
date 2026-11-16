import {randomBytes,scrypt as rawScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(rawScrypt),DATABASE_URL=process.env.DATABASE_URL;
if(!DATABASE_URL)throw Error('Missing injected DATABASE_URL');
const dbEndpoint='https://'+new URL(DATABASE_URL).hostname+'/sql';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const error=(status,code,message)=>json({error:{code,message}},status);
const usernameRE=/^[a-z0-9_.-]{3,40}$/;
async function sql(query,params=[]){
 const r=await fetch(dbEndpoint,{method:'POST',headers:{'content-type':'application/json','Neon-Connection-String':DATABASE_URL},body:JSON.stringify({query,params}),signal:AbortSignal.timeout(20000)});
 const result=await r.json().catch(()=>null);
 if(!r.ok){console.error('Postgres failed',r.status,result?.code||'unknown');throw Error('DATABASE_ERROR')}
 return result?.rows||[];
}
async function hashPassword(p){const salt=randomBytes(16),k=await scrypt(p,salt,64,{N:16384,r:8,p:1,maxmem:67108864});return 'scrypt$16384$8$1$'+salt.toString('base64url')+'$'+k.toString('base64url')}
async function checkPassword(p,h){try{const [alg,n,r,pa,salt,key]=h.split('$');if(alg!=='scrypt')return false;const ref=Buffer.from(key,'base64url'),k=await scrypt(p,Buffer.from(salt,'base64url'),ref.length,{N:+n,r:+r,p:+pa,maxmem:67108864});return timingSafeEqual(k,ref)}catch{return false}}
const sha=t=>createHash('sha256').update(t).digest('hex');
const expose=u=>({id:u.id,username:u.username,displayName:u.display_name,role:u.role,createdAt:u.created_at});
async function session(req){const auth=req.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_-]{32,}$/.test(auth))return null;const rows=await sql("SELECT u.id,u.username,u.display_name,u.role,u.created_at FROM app_sessions s JOIN app_users u ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.disabled=false LIMIT 1",[sha(auth.slice(7))]);return rows[0]||null}
async function sessionFor(id){const t=randomBytes(32).toString('base64url');await sql("INSERT INTO app_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')",[id,sha(t)]);return t}
async function limit(key,max){const rows=await sql("INSERT INTO auth_rate_limits(key,hits,window_start) VALUES($1,1,now()) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN auth_rate_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE auth_rate_limits.hits+1 END, window_start=CASE WHEN auth_rate_limits.window_start<now()-interval '15 minutes' THEN now() ELSE auth_rate_limits.window_start END RETURNING hits",[key]);return Number(rows[0]?.hits||999)<=max}
async function readBody(req){const raw=await req.text();if(raw.length>4096)throw Error('BAD_BODY');return JSON.parse(raw||'{}')}
const originList=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
function cors(origin){if(!origin)return {};const allowed=originList.includes(origin)||/^http:\/\/localhost(?::\d+)?$/.test(origin)||/^https:\/\/[a-z0-9-]+\.figma\.(site|com)$/.test(origin);return allowed?{'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS','access-control-max-age':'600',vary:'Origin'}:{}}
let adminSeeded=false;
async function seedInitialAdmin(){
 if(adminSeeded||!process.env.INITIAL_ADMIN_HASH)return;
 const username=process.env.INITIAL_ADMIN_USERNAME||'baleshhaa_admin';
 if(!usernameRE.test(username))throw Error('Invalid bootstrap admin username');
 await sql("INSERT INTO app_users(username,display_name,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(username) DO NOTHING",[username,'Baleshhaa Admin',process.env.INITIAL_ADMIN_HASH]);
 adminSeeded=true;
}
async function handle(req){
 await seedInitialAdmin();
 const url=new URL(req.url),p=url.pathname.replace(/\/+$/,'')||'/';
 if(p==='/'||p==='/api/health'){const [r]=await sql('SELECT current_database() AS db');return json({ok:true,service:'baleshhaa-live-api',database:r?.db})}
 if(p==='/api/games'&&req.method==='GET')return json({games:await sql('SELECT id,title_ar,status FROM games ORDER BY sort_order')});
 if(p==='/api/auth/register'&&req.method==='POST'){
  const b=await readBody(req),username=String(b.username||'').trim().toLowerCase(),displayName=String(b.displayName||'').trim(),password=String(b.password||'');
  if(!usernameRE.test(username)||!displayName||displayName.length>100||password.length<10||password.length>128)return error(422,'VALIDATION_ERROR','تحقق من الاسم وكلمة المرور (10 أحرف على الأقل).');
  if(!await limit('register:'+username,5))return error(429,'RATE_LIMITED','انتظر 15 دقيقة قبل المحاولة.');
  if((await sql('SELECT id FROM app_users WHERE username=$1',[username])).length)return error(409,'USERNAME_TAKEN','اسم المستخدم موجود.');
  const hash=await hashPassword(password);let rows;
  try{rows=await sql('INSERT INTO app_users(username,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,username,display_name,role,created_at',[username,displayName,hash])}
  catch{return error(409,'USERNAME_TAKEN','اسم المستخدم موجود.')}
  return json({user:expose(rows[0]),token:await sessionFor(rows[0].id)},201)
 }
 if(p==='/api/auth/login'&&req.method==='POST'){
  const b=await readBody(req),username=String(b.username||'').trim().toLowerCase(),password=String(b.password||'');
  if(!usernameRE.test(username)||password.length>128)return error(401,'INVALID_CREDENTIALS','بيانات الدخول غير صحيحة.');
  if(!await limit('login:'+username,12))return error(429,'RATE_LIMITED','انتظر 15 دقيقة قبل المحاولة.');
  const [u]=await sql('SELECT id,username,display_name,password_hash,role,disabled,created_at FROM app_users WHERE username=$1',[username]);
  if(!u||u.disabled===true||u.disabled==='t'||!await checkPassword(password,u.password_hash))return error(401,'INVALID_CREDENTIALS','بيانات الدخول غير صحيحة.');
  return json({user:expose(u),token:await sessionFor(u.id)})
 }
 const user=await session(req);
 if(!user)return error(401,'UNAUTHORIZED','سجل الدخول أولًا.');
 if(p==='/api/auth/me'&&req.method==='GET')return json({user:expose(user)});
 if(p==='/api/auth/change-credentials'&&req.method==='POST'){
  const data=await readBody(req),old=String(data.oldPassword||''),newPass=String(data.newPassword||''),username=String(data.newUsername||user.username).trim().toLowerCase();
  if(!usernameRE.test(username)||newPass.length<10||newPass.length>128)return error(422,'VALIDATION_ERROR','كلمة المرور الجديدة 10 أحرف على الأقل.');
  const [dbUser]=await sql('SELECT password_hash FROM app_users WHERE id=$1',[user.id]);
  if(!dbUser||!await checkPassword(old,dbUser.password_hash))return error(401,'INVALID_CREDENTIALS','كلمة المرور الحالية غير صحيحة.');
  try{await sql('UPDATE app_users SET username=$1,password_hash=$2,updated_at=now() WHERE id=$3',[username,await hashPassword(newPass),user.id])}catch{return error(409,'USERNAME_TAKEN','اسم المستخدم مستخدم.')}
  await sql('DELETE FROM app_sessions WHERE user_id=$1',[user.id]);
  return json({ok:true,requiresLogin:true})
 }
 if(p==='/api/auth/logout'&&req.method==='POST'){await sql('DELETE FROM app_sessions WHERE token_hash=$1',[sha((req.headers.get('authorization')||'').slice(7))]);return json({ok:true})}
 if(p.startsWith('/api/admin/')){
  if(user.role!=='admin')return error(403,'FORBIDDEN','للأدمن فقط.');
  if(p==='/api/admin/stats'&&req.method==='GET'){const [stats]=await sql("SELECT (SELECT count(*)::int FROM app_users) AS users,(SELECT count(*)::int FROM app_users WHERE role='admin') AS admins,(SELECT count(*)::int FROM app_sessions WHERE expires_at>now()) AS active_sessions,(SELECT count(*)::int FROM games) AS games");return json({stats})}
  if(p==='/api/admin/users'&&req.method==='GET'){const page=Math.max(1,Math.min(10000,Number(url.searchParams.get('page'))||1)),rows=await sql('SELECT id,username,display_name,role,disabled,created_at FROM app_users ORDER BY created_at DESC LIMIT 20 OFFSET $1',[(page-1)*20]);return json({users:rows.map(u=>({...expose(u),disabled:u.disabled===true||u.disabled==='t'})),page})}
 }
 return error(404,'NOT_FOUND','Endpoint not found')
}
export default {async fetch(req){const origin=req.headers.get('origin'),head=cors(origin);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:head});if(origin&&!head['access-control-allow-origin'])return error(403,'ORIGIN_NOT_ALLOWED','Origin not allowed');try{const r=await handle(req);for(const [k,v]of Object.entries(head))r.headers.set(k,v);return r}catch(e){console.error('API failed',e instanceof Error?e.message:'error');const r=error(500,'SERVER_ERROR','حدث خطأ في السيرفر.');for(const [k,v]of Object.entries(head))r.headers.set(k,v);return r}}};