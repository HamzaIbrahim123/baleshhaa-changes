import {useCallback,useEffect,useState,type ChangeEvent,type FormEvent} from 'react';
import {apiAdmin,ApiError,API_BASE,type AuthUser,type GameRow,type SectionRow,type CategoryRow,type QuestionRow,type UserDetail} from './api';

type Tab='users'|'games'|'sections'|'categories'|'questions';
type Draft={slug:string;titleAr:string;descriptionAr:string;gameId:string;sectionId:string;categoryId:string;status:string;points:string;questionText:string;answerText:string;sourceReference:string;imageId:string};
const emptyDraft:Draft={slug:'',titleAr:'',descriptionAr:'',gameId:'',sectionId:'',categoryId:'',status:'active',points:'200',questionText:'',answerText:'',sourceReference:'',imageId:''};
const labels:Record<Tab,string>={users:'المستخدمون',games:'الألعاب',sections:'السيكشنز',categories:'التصنيفات',questions:'الأسئلة اليدوية'};
const userMessage=(e:unknown)=>e instanceof ApiError?e.message:'تعذّر الوصول للسيرفر. تحقق من الاتصال وحاول مجددًا.';
function readImage(file:File):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('تعذّر قراءة الصورة.'));reader.readAsDataURL(file)})}

export default function AdminStudio(){
 const [tab,setTab]=useState<Tab>('users');
 const [users,setUsers]=useState<AuthUser[]>([]);
 const [userDetail,setUserDetail]=useState<UserDetail|null>(null);
 const [games,setGames]=useState<GameRow[]>([]);
 const [sections,setSections]=useState<SectionRow[]>([]);
 const [categories,setCategories]=useState<CategoryRow[]>([]);
 const [questions,setQuestions]=useState<QuestionRow[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [editingId,setEditingId]=useState<string|null>(null);
 const [showForm,setShowForm]=useState(false);
 const [draft,setDraft]=useState<Draft>(emptyDraft);
 const [upload,setUpload]=useState<File|null>(null);
 const update=(key:keyof Draft,value:string)=>setDraft(d=>({...d,[key]:value}));

 const refresh=useCallback(async()=>{
  const [u,g,s,c,q]=await Promise.all([apiAdmin.users(),apiAdmin.games(),apiAdmin.sections(),apiAdmin.categories(),apiAdmin.questions()]);
  setUsers(u.users);setGames(g.games);setSections(s.sections);setCategories(c.categories);setQuestions(q.questions);
 },[]);
 useEffect(()=>{let mounted=true;setLoading(true);refresh().catch(e=>{if(mounted)setError(userMessage(e))}).finally(()=>{if(mounted)setLoading(false)});return()=>{mounted=false}},[refresh]);
 const changeTab=(next:Tab)=>{setTab(next);setEditingId(null);setShowForm(false);setDraft(emptyDraft);setUpload(null);setUserDetail(null);setError('');setSuccess('')};
 const beginNew=()=>{
  setEditingId(null);setShowForm(true);setUpload(null);
  setDraft({...emptyDraft, status:tab==='games'?'coming_soon':tab==='questions'?'draft':'active',gameId:games[0]?.id||'',sectionId:sections[0]?.id||'',categoryId:categories[0]?.id||''});
 };
 const beginEdit=(item:GameRow|SectionRow|CategoryRow|QuestionRow)=>{
  setEditingId(item.id);setShowForm(true);setUpload(null);
  setDraft({...emptyDraft,
   slug:'id' in item?item.id:'',
   titleAr:'title_ar' in item?item.title_ar:'',
   descriptionAr:'description_ar' in item?item.description_ar||'':'',
   gameId:'game_id' in item?item.game_id:games[0]?.id||'',
   sectionId:'section_id' in item?item.section_id:sections[0]?.id||'',
   categoryId:'category_id' in item?item.category_id:categories[0]?.id||'',
   status:item.status,
   points:'points' in item?String(item.points):'200',
   questionText:'question_text' in item?item.question_text:'',
   answerText:'answer_text' in item?item.answer_text:'',
   sourceReference:'source_reference' in item?item.source_reference||'':'',
   imageId:item.imageId||'',
  });
 };
 const viewUser=async(id:string)=>{setError('');try{const d=await apiAdmin.user(id);setUserDetail(d.user)}catch(e){setError(userMessage(e))}};
 const toggleUser=async(user:AuthUser)=>{
  if(user.role==='admin')return;
  const action=user.disabled?'تفعيل':'تعطيل';
  if(!window.confirm(`هل تريد ${action} حساب ${user.username}؟ ${!user.disabled?'سيتم إنهاء جلساته الحالية.':''}`))return;
  setBusy(true);setError('');
  try{await apiAdmin.userStatus(user.id,!user.disabled);await refresh();const r=await apiAdmin.user(user.id);setUserDetail(r.user);setSuccess(`تم ${action} الحساب في Neon.`)}
  catch(e){setError(userMessage(e))}finally{setBusy(false)}
 };
 const onFile=(e:ChangeEvent<HTMLInputElement>)=>{setError('');const f=e.target.files?.[0]||null;if(!f){setUpload(null);return}if(f.size>1048576||!['image/png','image/jpeg','image/webp'].includes(f.type)){e.target.value='';setError('اختار صورة PNG/JPG/WebP حجمها 1MB أو أقل.');return}setUpload(f)};
 const save=async(e:FormEvent)=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');setSuccess('');
  try{
   let imageId=draft.imageId||null;
   if(upload){const dataUrl=await readImage(upload);const result=await apiAdmin.media(dataUrl);imageId=result.id}
   if(tab==='games'){
    const payload={id:draft.slug,titleAr:draft.titleAr,descriptionAr:draft.descriptionAr,status:draft.status,imageId};
    if(editingId)await apiAdmin.gameUpdate(editingId,payload);else await apiAdmin.gameCreate(payload);
   }else if(tab==='sections'){
    const payload={gameId:draft.gameId,titleAr:draft.titleAr,descriptionAr:draft.descriptionAr,status:draft.status,imageId};
    if(editingId)await apiAdmin.sectionUpdate(editingId,payload);else await apiAdmin.sectionCreate(payload);
   }else if(tab==='categories'){
    if(!imageId)throw Error('صورة التصنيف ضرورية. ارفع صورة قبل الحفظ.');
    const payload={sectionId:draft.sectionId,titleAr:draft.titleAr,descriptionAr:draft.descriptionAr,status:draft.status,imageId};
    if(editingId)await apiAdmin.categoryUpdate(editingId,payload);else await apiAdmin.categoryCreate(payload);
   }else if(tab==='questions'){
    const payload={categoryId:draft.categoryId,questionText:draft.questionText,answerText:draft.answerText,points:Number(draft.points),status:draft.status,sourceReference:draft.sourceReference,imageId};
    if(editingId)await apiAdmin.questionUpdate(editingId,payload);else await apiAdmin.questionCreate(payload);
   }
   await refresh();setShowForm(false);setEditingId(null);setUpload(null);setSuccess(editingId?'تم تعديل السجل وحفظه في Neon.':'تم إضافة السجل إلى Neon بنجاح.');
  }catch(e){setError(userMessage(e)=== 'تعذّر الوصول للسيرفر. تحقق من الاتصال وحاول مجددًا.' && e instanceof Error?e.message:userMessage(e))}
  finally{setBusy(false)}
 };
 const list=(tab==='games'?games:tab==='sections'?sections:tab==='categories'?categories:questions) as (GameRow|SectionRow|CategoryRow|QuestionRow)[];
 const gameLabel=(id:string)=>games.find(g=>g.id===id)?.title_ar||id;
 const sectionLabel=(id:string)=>sections.find(s=>s.id===id)?.title_ar||id;
 const categoryLabel=(id:string)=>categories.find(c=>c.id===id)?.title_ar||id;
 const rowLabel=(item:GameRow|SectionRow|CategoryRow|QuestionRow)=>'title_ar' in item?item.title_ar:('question_text' in item?item.question_text:'');
 return <section className="admin-workspace" aria-label="إدارة المحتوى والمستخدمين">
  <div className="admin-workspace-head"><div><h2>إدارة الموقع والمحتوى</h2><p>الإضافات والتعديلات هنا تُحفظ في Neon، وليس في كود الموقع.</p></div><button type="button" className="btn btn-outline" onClick={()=>{setLoading(true);refresh().catch(e=>setError(userMessage(e))).finally(()=>setLoading(false))}}>تحديث البيانات</button></div>
  <div className="admin-workspace-tabs" role="tablist" aria-label="أقسام لوحة الإدارة">{(Object.keys(labels) as Tab[]).map(key=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>changeTab(key)}>{labels[key]}</button>)}</div>
  {error&&<p className="admin-workspace-error" role="alert">{error}</p>}
  {success&&<p className="admin-workspace-success" role="status">{success}</p>}
  {loading?<p className="admin-muted">جارٍ تحميل البيانات الحقيقية من Neon...</p>:tab==='users'?<>
   <p className="admin-muted">يمكن عرض تفاصيل الحساب وتعطيل اللاعبين أو إعادة تفعيلهم. الحذف النهائي مؤجّل لحماية البيانات. لا يمكن تعطيل الأدمن من هنا.</p>
   <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>اسم المستخدم</th><th>الاسم</th><th>الدور</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.username}</td><td>{u.displayName}</td><td>{u.role==='admin'?'مدير':'لاعب'}</td><td>{u.disabled?'معطّل':'نشط'}</td><td><div className="admin-actions"><button type="button" onClick={()=>viewUser(u.id)}>التفاصيل</button>{u.role==='player'&&<button disabled={busy} type="button" onClick={()=>toggleUser(u)}>{u.disabled?'تفعيل':'تعطيل'}</button>}</div></td></tr>)}</tbody></table></div>
   {userDetail&&<div className="admin-detail-panel"><button type="button" className="admin-close" onClick={()=>setUserDetail(null)}>إغلاق ✕</button><h3>تفاصيل الحساب</h3><p><strong>اسم المستخدم:</strong> {userDetail.username}</p><p><strong>الاسم:</strong> {userDetail.displayName}</p><p><strong>الصلاحية:</strong> {userDetail.role==='admin'?'مدير':'لاعب'}</p><p><strong>الحالة:</strong> {userDetail.disabled?'معطّل':'نشط'}</p><p><strong>جلسات فعالة:</strong> {userDetail.activeSessions}</p><p><strong>تاريخ التسجيل:</strong> {userDetail.createdAt?new Date(userDetail.createdAt).toLocaleDateString('ar-JO'):'—'}</p></div>}
  </>:<>
   <div className="admin-workspace-controls"><span>{labels[tab]} المسجّلة: {list.length}</span><button className="btn btn-primary" onClick={beginNew} type="button">إضافة {tab==='games'?'لعبة':tab==='sections'?'سيكشن':tab==='categories'?'تصنيف':'سؤال'}</button></div>
   {showForm&&<form className="admin-editor" onSubmit={save}>
    <h3>{editingId?'تعديل':'إضافة'} {tab==='games'?'لعبة':tab==='sections'?'سيكشن':tab==='categories'?'تصنيف':'سؤال'}</h3>
    {tab==='games'&&<label>المعرّف بالإنجليزي (مثل new-game)<input value={draft.slug} onChange={e=>update('slug',e.target.value)} disabled={!!editingId} required pattern="[a-z0-9-]{2,40}" placeholder="game-id"/></label>}
    {tab==='sections'&&<label>اللعبة التابعة<select value={draft.gameId} disabled={!!editingId} onChange={e=>update('gameId',e.target.value)} required>{games.map(g=><option value={g.id} key={g.id}>{g.title_ar}</option>)}</select></label>}
    {tab==='categories'&&<label>السيكشن التابع<select value={draft.sectionId} disabled={!!editingId} onChange={e=>update('sectionId',e.target.value)} required>{sections.map(s=><option value={s.id} key={s.id}>{s.title_ar} — {gameLabel(s.game_id)}</option>)}</select></label>}
    {tab==='questions'&&<label>التصنيف<select value={draft.categoryId} disabled={!!editingId} onChange={e=>update('categoryId',e.target.value)} required>{categories.map(c=><option key={c.id} value={c.id}>{c.title_ar} — {sectionLabel(c.section_id)}</option>)}</select></label>}
    {tab!=='questions'?<><label>الاسم بالعربي<input value={draft.titleAr} onChange={e=>update('titleAr',e.target.value)} maxLength={120} required/></label><label>الوصف (اختياري)<textarea value={draft.descriptionAr} onChange={e=>update('descriptionAr',e.target.value)} maxLength={1200} rows={2}/></label></>:<>
     <label>السؤال<textarea value={draft.questionText} onChange={e=>update('questionText',e.target.value)} maxLength={1200} required rows={3}/></label>
     <label>الإجابة<textarea value={draft.answerText} onChange={e=>update('answerText',e.target.value)} maxLength={1200} required rows={2}/></label>
     <label>قيمة السؤال<select value={draft.points} onChange={e=>update('points',e.target.value)}><option value="200">200</option><option value="400">400</option><option value="600">600</option></select></label>
     <label>مصدر السؤال (اختياري)<input value={draft.sourceReference} onChange={e=>update('sourceReference',e.target.value)} maxLength={500}/></label>
    </>}
    <label>الحالة<select value={draft.status} onChange={e=>update('status',e.target.value)}>
     {tab==='games'?<><option value="coming_soon">قريبًا</option><option value="active">متاح</option><option value="hidden">مخفي</option></>:tab==='questions'?<><option value="draft">مسودة</option><option value="published">معتمد / منشور</option></>:<><option value="active">ظاهر</option><option value="hidden">مخفي</option></>}
    </select></label>
    <label>{tab==='categories'?'صورة التصنيف (إلزامية)': 'الصورة (اختيارية)'} — PNG/JPG/WebP، حتى 1MB<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} required={tab==='categories'&&!draft.imageId}/></label>
    <p className="admin-muted">{draft.imageId?'في صورة محفوظة حاليًا. ارفع أخرى فقط لاستبدالها.':'ما في صورة محفوظة حاليًا.'}</p>
    {tab==='questions'&&<p className="admin-warning">السؤال الجديد يبدأ كمسودة؛ انشره فقط بعد مراجعة دقته وصحة إجابته.</p>}
    <div className="admin-editor-buttons"><button type="submit" className="btn btn-primary" disabled={busy||((tab==='sections'&&!games.length)||(tab==='categories'&&!sections.length)||(tab==='questions'&&!categories.length))}>{busy?'جارٍ الحفظ...':'حفظ في Neon'}</button><button type="button" className="btn btn-outline" onClick={()=>setShowForm(false)}>إلغاء</button></div>
   </form>}
   {!list.length?<p className="admin-empty">لسه ما في {labels[tab]} مضافة. ابدأ بإضافة أول سجل من الزر أعلاه.</p>:<div className="admin-content-list">{list.map(item=><article key={item.id} className="admin-content-row">
     {'imageUrl' in item&&item.imageUrl?<img alt="" src={API_BASE+item.imageUrl} className="admin-content-thumbnail"/>:<span className="admin-content-thumbnail admin-image-placeholder">بدون صورة</span>}
     <div><strong>{rowLabel(item)}</strong><small>{'game_id' in item?gameLabel(item.game_id):'section_id' in item?sectionLabel(item.section_id):'category_id' in item?categoryLabel(item.category_id):'id' in item?item.id:''}</small><small>{item.status==='active'?'ظاهر':item.status==='coming_soon'?'قريبًا':item.status==='hidden'?'مخفي':item.status==='published'?'منشور':'مسودة'}{'points' in item?` · ${item.points} نقطة`:''}</small></div>
     <button type="button" className="btn btn-outline" onClick={()=>beginEdit(item)}>تعديل</button>
    </article>)}</div>}
   {tab==='questions'&&<p className="admin-muted">الإضافة اليدوية تعمل الآن. الاستيراد الجماعي وتوليد AI ومشاركة الأسئلة داخل المباريات مراحل لاحقة.</p>}
  </>}
 </section>
}
