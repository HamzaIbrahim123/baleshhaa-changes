import { createHash } from "node:crypto";
const conn=process.env.DATABASE_URL;
if(!conn)throw Error("Missing Neon injected DATABASE_URL");
const endpoint="https://"+new URL(conn).hostname+"/sql";
const idRe=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const origins=(process.env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const error=(status,code,message)=>json({error:{code,message}},status);
const hash=t=>createHash("sha256").update(t).digest("hex");
async function sql(query,params=[]){
 const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","Neon-Connection-String":conn},
 body:JSON.stringify({query,params}),signal:AbortSignal.timeout(16000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok){console.error("Database status",r.status,data?.code);throw Error("DATABASE_ERROR");}
 return data?.rows||[];
}
async function payload(req){const t=await req.text();if(t.length>8000)throw Error("PAYLOAD_TOO_LARGE");try{return JSON.parse(t||"{}")}catch{throw Error("BAD_JSON")}}
function validUserToken(req){const h=req.headers.get("authorization")||"";return /^Bearer [A-Za-z0-9_-]{32,}$/.test(h)?h.slice(7):null}
async function currentUser(req){
 const token=validUserToken(req);if(!token)return null;
 const [u]=await sql("SELECT u.id,u.username FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.disabled LIMIT 1",[hash(token)]);
 return u||null;
}
function cors(origin){
 const good=origin&&(origins.includes(origin)||/^https:\/\/[a-z0-9-]+\.figma\.(site|com)$/.test(origin)||/^http:\/\/localhost(:\d+)?$/.test(origin));
 return good?{"access-control-allow-origin":origin,"vary":"Origin","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type"}:{};
}
async function route(req){
 const url=new URL(req.url),p=url.pathname.replace(/\/+$/,"")||"/",method=req.method;
 if((p==="/"||p==="/api/health")&&method==="GET"){
  const [x]=await sql("SELECT current_database() AS db");
  return json({ok:true,service:"baleshhaa-game",db:x?.db});
 }
 const user=await currentUser(req);
 if(!user)return error(401,"UNAUTHORIZED","سجّل الدخول أولًا.");
 if(p==="/api/player/progress"&&method==="GET"){
  const rows=await sql(`SELECT c.id,c.title_ar,
    count(q.id) FILTER (WHERE q.points=200 AND usage.question_id IS NULL)::int AS left_200,
    count(q.id) FILTER (WHERE q.points=400 AND usage.question_id IS NULL)::int AS left_400,
    count(q.id) FILTER (WHERE q.points=600 AND usage.question_id IS NULL)::int AS left_600
    FROM app_categories c JOIN app_sections s ON s.id=c.section_id
    LEFT JOIN app_questions q ON q.category_id=c.id AND q.status='published'
    LEFT JOIN app_user_question_usage usage ON usage.user_id=$1 AND usage.question_id=q.id
    WHERE s.game_id='seen-jeem' AND s.status='active' AND c.status='active'
    GROUP BY c.id,c.title_ar ORDER BY c.title_ar`,[user.id]);
  return json({categories:rows.map(r=>({...r,remainingGames:Math.floor(Math.min(Number(r.left_200),Number(r.left_400),Number(r.left_600))/2)}))});
 }
 if(p==="/api/player/matches/active"&&method==="GET"){
  const [match]=await sql("SELECT id,category_ids,team_names,team_helps,test_mode,created_at FROM app_matches WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1",[user.id]);
  return json({match:match||null});
 }
 if(p==="/api/player/matches"&&method==="POST"){
  const b=await payload(req),cats=b.categoryIds,names=b.teamNames,helps=b.teamHelps,test=b.testMode===true,len=Array.isArray(cats)?cats.length:0;
  if(!(test?len===2:[4,6,8].includes(len))||!cats.every(x=>typeof x==="string"&&idRe.test(x))||new Set(cats).size!==len||
    !Array.isArray(names)||names.length!==2||!names.every(x=>typeof x==="string"&&x.trim().length>=1&&x.trim().length<=40)||
    !Array.isArray(helps)||helps.length!==2||!helps.every(x=>Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(h=>["friend","pit","two","rest","trap"].includes(h))))
   return error(422,"VALIDATION_ERROR","تحقق من التصنيفات واسمَي الفريقين ووسائل المساعدة.");
  const existing=await sql("SELECT id FROM app_matches WHERE user_id=$1 AND status='active' LIMIT 1",[user.id]);
  if(existing.length)return error(409,"MATCH_IN_PROGRESS","يوجد لديك مباراة غير مكتملة. أنهها أو ألغها قبل بدء مباراة أخرى.");
  const counts=await sql(`SELECT q.category_id,q.points,count(*)::int AS remaining
    FROM app_questions q JOIN app_categories c ON c.id=q.category_id
    JOIN app_sections s ON s.id=c.section_id
    LEFT JOIN app_user_question_usage u ON u.question_id=q.id AND u.user_id=$1
    WHERE q.category_id=ANY(string_to_array($2,',')::uuid[]) AND q.status='published'
      AND c.status='active' AND s.status='active' AND s.game_id='seen-jeem' AND u.question_id IS NULL
    GROUP BY q.category_id,q.points`,[user.id,cats.join(",")]);
  if(cats.some(cat=>[200,400,600].some(pts=>!counts.some(x=>x.category_id===cat&&Number(x.points)===pts&&Number(x.remaining)>=2))))
   return error(422,"INSUFFICIENT_QUESTIONS","لا يوجد سؤالان متاحان من كل مستوى في أحد التصنيفات.");
  try{
   const [m]=await sql(`INSERT INTO app_matches(user_id,category_ids,team_names,team_helps,test_mode)
     VALUES($1,string_to_array($2,',')::uuid[],$3::jsonb,$4::jsonb,$5::boolean)
     RETURNING id,category_ids,team_names,team_helps,test_mode,created_at`,
     [user.id,cats.join(","),JSON.stringify(names.map(x=>x.trim())),JSON.stringify(helps),test]);
   return json({match:m},201);
  }catch{return error(409,"MATCH_IN_PROGRESS","لديك مباراة غير مكتملة، راجعها أولًا.");}
 }
 const match=p.match(/^\/api\/player\/matches\/([0-9a-f-]{36})\/(open|reveal|finish|abandon)$/i);
 if(match){
  if(!idRe.test(match[1])||method!=="POST")return error(405,"INVALID_REQUEST","الطلب غير مسموح");
  const matchId=match[1],action=match[2],b=await payload(req);
  if(action==="open"){
   const cat=b.categoryId,cell=b.cellId,pts=Number(b.points);
   if(typeof cat!=="string"||!idRe.test(cat)||typeof cell!=="string"||![200,400,600].includes(pts)||
      ![cat+":A:"+pts,cat+":B:"+pts].includes(cell))return error(422,"INVALID_CELL","اختيار السؤال غير صحيح.");
   try{
    const [q]=await sql("SELECT * FROM app_open_match_question($1::uuid,$2::uuid,$3::varchar,$4::uuid,$5::integer)",
     [user.id,matchId,cell,cat,pts]);
    if(!q)return error(409,"NO_QUESTION","لا يوجد سؤال جديد.");
    const [image]=await sql("SELECT q.image_id,m.credit_author,m.credit_license,m.credit_source_url FROM app_questions q LEFT JOIN app_media m ON m.id=q.image_id WHERE q.id=$1",[q.question_id]);
    const imageAttribution=image?.image_id&&image?.credit_source_url&&image?.credit_author&&image?.credit_license
      ?{author:image.credit_author,license:image.credit_license,url:image.credit_source_url}:null;
    return json({question:{id:q.question_id,categoryId:q.category_id,points:Number(q.points),text:q.question_text,imageId:image?.image_id||null,imageAttribution,cellId:cell}});
   }catch{return error(409,"QUESTION_UNAVAILABLE","تعذّر فتح السؤال أو تم استخدام هذا المكان.");}
  }
  if(action==="reveal"){
   const cell=b.cellId;
   if(typeof cell!=="string"||cell.length>100)return error(422,"INVALID_CELL","اختيار السؤال غير صحيح.");
   const [r]=await sql(`UPDATE app_match_questions mq SET revealed_at=COALESCE(mq.revealed_at,now())
     FROM app_matches m, app_questions q
     WHERE mq.match_id=m.id AND m.id=$1 AND m.user_id=$2 AND m.status='active'
       AND mq.cell_id=$3 AND q.id=mq.question_id
     RETURNING q.answer_text,q.source_reference`,[matchId,user.id,cell]);
   return r?json({answer:r.answer_text,sourceUrl:r.source_reference}):error(404,"QUESTION_NOT_OPEN","السؤال لم يُفتح.");
  }
  if(action==="finish"||action==="abandon"){
   const scores=action==="finish"?b.scores:null;
   if(action==="finish"&&(!Array.isArray(scores)||scores.length!==2||!scores.every(x=>Number.isInteger(x)&&Math.abs(x)<1000000)))
    return error(422,"INVALID_SCORE","نتيجة المباراة غير صحيحة.");
   const [r]=await sql(`UPDATE app_matches SET status=$1,final_scores=$2::jsonb,updated_at=now()
     WHERE id=$3 AND user_id=$4 AND status='active' RETURNING id,status`,
     [action==="finish"?"finished":"abandoned",scores?JSON.stringify(scores):"null",matchId,user.id]);
   return r?json({ok:true,match:r}):error(404,"MATCH_NOT_ACTIVE","المباراة غير نشطة.");
  }
 }
 return error(404,"NOT_FOUND","العنوان غير معروف");
}
export default {async fetch(req){
 const origin=req.headers.get("origin"),headers=cors(origin);
 if(req.method==="OPTIONS")return new Response(null,{status:origin&&!headers["access-control-allow-origin"]?403:204,headers});
 if(origin&&!headers["access-control-allow-origin"])return error(403,"ORIGIN_FORBIDDEN","المصدر غير مسموح");
 try{const r=await route(req);for(const [k,v] of Object.entries(headers))r.headers.set(k,v);return r}
 catch(e){console.error("Game API:",e?.message||"unknown");const r=error(500,"SERVER_ERROR","تعذّر تنفيذ الطلب.");for(const [k,v] of Object.entries(headers))r.headers.set(k,v);return r}
}};