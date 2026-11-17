import {useEffect,useMemo,useRef,useState, type FormEvent, type ReactNode} from 'react';
import {CATEGORIES,GAMES,HELPS,getCategory,initialCategoryIds,makeCells,pointValues,sampleQuestion,type Cell,type HelpId} from './data';
import {apiAuth,apiAdmin,apiCatalog,API_BASE,ApiError,type AuthUser,type AdminStats,type PublicCategory,type SectionRow} from './api';
import AdminStudio from './AdminStudio';
import LiveMatch from './LiveMatch';
import {gameApi,type GameProgress} from './liveApi';
import {playGameSound} from './sfx';

type Page='home'|'login'|'register'|'details'|'setup'|'teams'|'board'|'question'|'reveal'|'result'|'admin'|'live';
type Match={categoryIds:string[];names:[string,string];helps:[HelpId[],HelpId[]];usedHelps:[HelpId[],HelpId[]];scores:[number,number];turn:0|1;usedCells:string[];active:Cell|null;activeHelp:HelpId|null;restOwner:0|1|null;ended:boolean};
const initialMatch=():Match=>({categoryIds:initialCategoryIds,names:['الفريق الأول','الفريق الثاني'],helps:[[],[]] as [HelpId[],HelpId[]],usedHelps:[[],[]],scores:[0,0],turn:0,usedCells:[],active:null,activeHelp:null,restOwner:null,ended:false});
const n=(num:number)=>num.toLocaleString('en-US');
function Icon({name,size=20}: {name:'hash'|'arrow'|'search'|'check'|'eye'|'eyeOff'|'minus'|'plus'|'question'|'phone'|'pit'|'two'|'rest'|'trap'|'trophy'|'menu'|'close';size?:number}){
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
  const shapes:Record<string,ReactNode>={hash:<><path d="M10 3 7 21M18 3l-3 18M3 9h18M2 16h18"/></>,arrow:<path d="m14 6-6 6 6 6"/>,search:<><circle cx="10.8" cy="10.8" r="7"/><path d="m16.2 16.2 5 5"/></>,check:<path d="m5 12 4.5 4.5L19 7"/>,eye:<><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,eyeOff:<><path d="m3 3 18 18M10.4 5.2A11 11 0 0 1 12 5c6.3 0 10 7 10 7a15 15 0 0 1-3.2 3.9M6 6.1A15 15 0 0 0 2 12s3.7 7 10 7c1.2 0 2.3-.2 3.3-.7"/></>,minus:<path d="M5 12h14"/>,plus:<path d="M12 5v14M5 12h14"/>,question:<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a3 3 0 1 1 5.3 1.9c-1.5 1-2.8 1.3-2.8 3.3M12 17.5h.01"/></>,phone:<><path d="M6 3H4a2 2 0 0 0-2 2c0 9.4 7.6 17 17 17a2 2 0 0 0 2-2v-2l-5-3-2 2a14 14 0 0 1-7-7l2-2-3-5Z"/></>,pit:<><ellipse cx="12" cy="18" rx="8.5" ry="3.1"/><path d="M12 3v10m-4-4 4 4 4-4"/><path d="m4 14-1.5 2M20 14l1.5 2"/></>,two:<><path d="M5 20v-6a2 2 0 0 1 4 0v1V5a2 2 0 0 1 4 0v8-9a2 2 0 0 1 4 0v11l1-2a2 2 0 0 1 3 2l-3 6H8a4 4 0 0 1-3-1Z"/><path d="M9 15v-2"/></>,rest:<><path d="M7 3v10M11 4v8M15 6v6M18 10v3c0 5-3 8-7 8S4 18 4 14v-4a2 2 0 0 1 3 0"/></>,trap:<><circle cx="11.5" cy="14" r="7.2"/><path d="M11.5 6.8V4.5h3.3l2-2M18.5 5l2 2M4 7.5l2 2M9 18a4 4 0 0 0 5 0"/></>,trophy:<><path d="M7 4h10v8c0 4-3 6-5 6s-5-2-5-6V4ZM8 6H3v4c0 3 2 5 5 5M16 6h5v4c0 3-2 5-5 5M12 18v3M8 21h8"/></>,menu:<path d="M4 7h16M4 12h16M4 17h16"/>,close:<path d="m5 5 14 14M19 5 5 19"/>};
  return <svg {...common}>{shapes[name]}</svg>;
}
function Button({children,onClick,kind='primary',disabled=false,type='button',className=''}:{children:ReactNode;onClick?:()=>void;kind?:'primary'|'outline'|'gold'|'muted'|'danger'|'soft';disabled?:boolean;type?:'button'|'submit';className?:string}){return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${kind} ${className}`}>{children}</button>}
function GameLogo(){return <div className="logo" aria-label="بلّشها"><span className="logo-mark"><Icon name="hash" size={20}/></span><strong>بلّشها*</strong></div>}
function HeroArt(){return <div className="hero-art" aria-hidden="true"><span className="hero-glow"/><span className="hero-gold"/><span className="hero-mint"/><div className="hero-game-card"><div className="hero-line"/><b>مين جاهز للتحدّي؟</b><span className="hero-points">600</span><div className="hero-option">اختار اللعب وابدأ</div><div className="hero-option hero-option-light"/></div><span className="hero-round">جولة جديدة</span><span className="hero-plus">+ 200</span></div>}
function BasePanel({children,className=''}:{children:ReactNode;className?:string}){return <section className={`panel ${className}`}>{children}</section>}
function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){useEffect(()=>{const f=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f)},[onClose]);return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="إغلاق" onClick={onClose}><Icon name="close"/></button><h2 id="modal-title">{title}</h2>{children}</div></div>}

export default function App(){
 const [page,setPage]=useState<Page>('home');const [modal,setModal]=useState<'how'|'finish'|'new'|null>(null);
 const [user,setUser]=useState<AuthUser|null>(null);const previewName=user?.displayName??'';const [authPending,setAuthPending]=useState(false);
 const [adminStats,setAdminStats]=useState<AdminStats|null>(null);const [adminUsers,setAdminUsers]=useState<AuthUser[]>([]);const [adminError,setAdminError]=useState('');
 const [oldCredential,setOldCredential]=useState('');const [newCredential,setNewCredential]=useState('');const [newAdminUsername,setNewAdminUsername]=useState('');const [changeError,setChangeError]=useState('');const [changeBusy,setChangeBusy]=useState(false);
 const [authName,setAuthName]=useState('');const [authUsername,setAuthUsername]=useState('');const [authPassword,setAuthPassword]=useState('');const [showPassword,setShowPassword]=useState(false);const [authError,setAuthError]=useState('');
 const [search,setSearch]=useState('');const [count,setCount]=useState<4|6|8>(4);const [selected,setSelected]=useState<string[]>(initialCategoryIds);
 const [liveCatalog,setLiveCatalog]=useState<{sections:SectionRow[];categories:PublicCategory[]}|null>(null);
 const [catalogLoading,setCatalogLoading]=useState(true);const [catalogError,setCatalogError]=useState('');const [catalogRetry,setCatalogRetry]=useState(0);
 const [categoryBalances,setCategoryBalances]=useState<GameProgress[]|null>(null);
 const [balanceError,setBalanceError]=useState(false);
 const [openInfo,setOpenInfo]=useState<string|null>(null);const [showDemoCategories,setShowDemoCategories]=useState(false);
 const [match,setMatch]=useState<Match>(initialMatch);const [answerChoice,setAnswerChoice]=useState<0|1|null|'unset'>('unset');const [revealedQuestionId,setRevealedQuestionId]=useState<string|null>(null);const [toast,setToast]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [slide,setSlide]=useState(0);const [mobileMenu,setMobileMenu]=useState(false);
 const [soundEnabled,setSoundEnabled]=useState<boolean>(()=>{try{return localStorage.getItem('baleshhaa:sound')!=='off'}catch{return true}});
 useEffect(()=>{try{localStorage.setItem('baleshhaa:sound',soundEnabled?'on':'off')}catch{/* Storage may be blocked. */}},[soundEnabled]);
 useEffect(()=>{const i=setInterval(()=>setSlide(n=>(n+1)%4),5200);return()=>clearInterval(i)},[]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});setMobileMenu(false)},[page]);
 useEffect(()=>{let mounted=true;apiAuth.me().then(r=>{if(mounted)setUser(r.user)}).catch(()=>{if(mounted)setUser(null)});return()=>{mounted=false}},[]);
 useEffect(()=>{
   let active=true;setCatalogLoading(true);setCatalogError('');
   apiCatalog.list('seen-jeem').then(catalog=>{if(active)setLiveCatalog(catalog)})
     .catch(e=>{if(active)setCatalogError(e instanceof ApiError?e.message:'تعذّر تحميل التصنيفات من Neon. حاول مجددًا.')})
     .finally(()=>{if(active)setCatalogLoading(false)});
   return()=>{active=false};
 },[catalogRetry]);
 // Refresh personalized remaining-game inventory when the catalogue opens or a match ends.
 useEffect(()=>{
   if(!user){setCategoryBalances(null);setBalanceError(false);return;}
   if(page!=='details'&&page!=='setup')return;
   let active=true;
   setCategoryBalances(null);setBalanceError(false);
   gameApi.progress().then(r=>{if(active)setCategoryBalances(r.categories)})
     .catch(()=>{if(active){setCategoryBalances(null);setBalanceError(true)}});
   return()=>{active=false};
 },[user?.id,page,catalogRetry]);
 useEffect(()=>{if(page!=='admin'||user?.role!=='admin')return;let active=true;setAdminError('');Promise.all([apiAdmin.stats(),apiAdmin.users()]).then(([a,b])=>{if(active){setAdminStats(a.stats);setAdminUsers(b.users)}}).catch(e=>{if(active)setAdminError(e instanceof ApiError?e.message:'تعذّر تحميل لوحة الأدمن')});return()=>{active=false}},[page,user?.role]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const notice=(text:string)=>{setToast(text);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),4300)};
 const go=(p:Page)=>setPage(p);
 const requirePreview=()=>{if(!user){go('register')}else go('setup')};
 const openReal=()=>{if(!user){go('login')}else go('live')};
 const submitAuth=async(e:FormEvent)=>{
  e.preventDefault();if(authPending)return;setAuthError('');
  const username=authUsername.trim().toLowerCase(),password=authPassword;
  if(!/^[a-z0-9_.-]{3,40}$/.test(username)||password.length<(page==='register'?10:1)){
   setAuthError('اسم المستخدم 3 أحرف إنجليزية على الأقل، وكلمة المرور الجديدة 10 أحرف على الأقل.');return
  }
  if(page==='register'&&!authName.trim()){setAuthError('اكتب اسمك أولًا.');return}
  setAuthPending(true);
  try{
   const result=page==='register'
    ?await apiAuth.register({displayName:authName.trim(),username,password})
    :await apiAuth.login({username,password});
   setUser(result.user);setAuthPassword('');go('home');
   notice('تم تسجيل الدخول وحفظ الحساب على السيرفر بنجاح.');
  }catch(error){
   const err=error instanceof ApiError?error:null;
   const message=err?.code==='USERNAME_TAKEN'?'اسم المستخدم مستخدم، جرّب اسمًا ثانيًا.':err?.code==='INVALID_CREDENTIALS'?'اسم المستخدم أو كلمة المرور غير صحيحة.':err?.code==='RATE_LIMITED'?'محاولات كثيرة، جرّب بعد 15 دقيقة.':err?.message||'تعذّر الاتصال بخادم Neon. لم يتم إنشاء أي حساب.';
   setAuthError(message);
  }finally{setAuthPending(false)}
 };
 const logout=async()=>{try{await apiAuth.logout();setUser(null);setAdminStats(null);setAdminUsers([]);go('home')}catch{notice('تعذّر الاتصال بالخادم لتسجيل الخروج، حاول مرة ثانية.')}};
 const changeMyCredentials=async(e:FormEvent)=>{e.preventDefault();setChangeError('');setChangeBusy(true);try{await apiAuth.changeCredentials({oldPassword:oldCredential,newPassword:newCredential,newUsername:newAdminUsername.trim()||user?.username||''});setOldCredential('');setNewCredential('');setUser(null);go('login');notice('تم تحديث اسم المستخدم وكلمة المرور. سجّل الدخول بالبيانات الجديدة.')}catch(err){setChangeError(err instanceof ApiError?err.message:'تعذّر تحديث بيانات الدخول.')}finally{setChangeBusy(false)}};
 const resetNew=()=>{setMatch(initialMatch());setRevealedQuestionId(null);setCount(4);setSelected(initialCategoryIds);setModal(null);go('setup')};
 const selectCount=(k:4|6|8)=>{setCount(k);setSelected(s=>s.slice(0,k))};
 const toggleCategory=(id:string)=>{const c=getCategory(id);if(!c.available)return;setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<count?[...s,id]:s)};
 const setTeamName=(i:0|1,v:string)=>setMatch(m=>({...m,names:m.names.map((a,j)=>j===i?v:a) as [string,string]}));
 const setTeamHelp=(i:0|1,id:HelpId)=>setMatch(m=>({...m,helps:m.helps.map((a,j)=>j!==i?a:a.includes(id)?a.filter(h=>h!==id):a.length<3?[...a,id]:a) as [HelpId[],HelpId[]]}));
 const startMatch=()=>{if(selected.length!==count){notice(`اختار ${count} تصنيفات أولًا.`);return}setRevealedQuestionId(null);setMatch(m=>({...m,categoryIds:selected,usedCells:[],active:null,activeHelp:null,scores:[0,0],turn:0,usedHelps:[[],[]],restOwner:null,ended:false}));go('board')};
 const changeScore=(i:0|1,d:number)=>setMatch(m=>({...m,scores:m.scores.map((s,j)=>j===i?s+d:s) as [number,number]}));
 // Rest is a defensive action by the OPPOSING team, on the board before the question.
 // The other help actions belong to the team whose turn it is.
 const helpAvailability=(id:HelpId,i:0|1):{enabled:boolean;reason:string}=>{
   const help=HELPS.find(h=>h.id===id);
   if(!help||!match.helps[i].includes(id))return {enabled:false,reason:'وسيلة غير مختارة لهذا الفريق'};
   if(match.usedHelps[i].includes(id))return {enabled:false,reason:'تم استخدام هذه الوسيلة'};
   if(id==='rest'){
     if(i===match.turn)return {enabled:false,reason:'استريح متاحة للخصم فقط أثناء دور الفريق الآخر'};
     if(page==='board'&&!match.active)return {enabled:true,reason:match.restOwner===i?'اضغط لإلغاء استريح قبل فتح السؤال':'استريح: اختاروا لاعبًا من الفريق صاحب الدور ليستريح'};
     return {enabled:false,reason:'استريح تُستخدم من الفريق الخصم قبل فتح السؤال فقط'};
   }
   if(i!==match.turn)return {enabled:false,reason:'متاحة للفريق صاحب الدور فقط'};
   if(match.activeHelp&&match.activeHelp!==id)return {enabled:false,reason:'تم اختيار وسيلة أخرى لهذا السؤال'};
   if(page==='board'&&!match.active&&help.timing==='قبل السؤال')return {enabled:true,reason:'متاحة قبل فتح السؤال'};
   if(page==='question'&&match.active&&revealedQuestionId!==match.active.id&&help.timing==='بعد السؤال')return {enabled:true,reason:'متاحة بعد فتح السؤال وقبل كشف الإجابة'};
   return {enabled:false,reason:help.timing==='قبل السؤال'?'تُستخدم قبل فتح السؤال فقط':'تُستخدم بعد فتح السؤال وقبل كشف الإجابة فقط'};
 };
 const useHelp=(id:HelpId,i:0|1)=>{
   const state=helpAvailability(id,i);
   if(!state.enabled){notice(state.reason);return}
   if(id==='rest'){
     const wasActive=match.restOwner===i;
     setMatch(m=>({...m,restOwner:wasActive?null:i}));
     if(!wasActive)notice(`استريح: ${match.names[i]} يختار لاعبًا من ${match.names[match.turn]} ما يشارك بالإجابة.`);
     return;
   }
   setMatch(m=>({...m,activeHelp:m.activeHelp===id?null:id}));
 };
 const backToBoard=()=>{
   // Leaving a question cancels any post-question selection, but preserves a pre-question help pending on the board.
   setMatch(m=>({...m,active:null,activeHelp:m.activeHelp&&HELPS.find(h=>h.id===m.activeHelp)?.timing==='قبل السؤال'?m.activeHelp:null}));
   setRevealedQuestionId(null);
   go('board');
 };
 const revealAnswer=()=>{if(match.active)setRevealedQuestionId(match.active.id);go('reveal')};

 const openCell=(cell:Cell)=>{if(match.usedCells.includes(cell.id))return;setRevealedQuestionId(null);setAnswerChoice('unset');setMatch(m=>({...m,active:cell}));go('question')};
 const confirmAnswer=()=>{
   const active=match.active;
   if(!active)return;
   if(answerChoice==='unset'){notice('اختار نتيجة الإجابة أولًا.');return}
   const recipient=(1-match.turn) as 0|1;
   if(match.activeHelp==='trap' && answerChoice!==recipient && answerChoice!==null){notice('في الفخ، الفريق المستهدف فقط هو اللي يجاوب.');return}
   setMatch(m=>{
     const scores:[number,number]=[...m.scores];
     const other=(1-m.turn) as 0|1;
     if(m.activeHelp==='trap'){
       // The throwing team never answers, gains points or loses points here.
       // The target gains full points on a correct answer, loses full points on a wrong one.
       scores[other]+=answerChoice===other?active.points:-active.points;
     }else if(answerChoice!==null && answerChoice!=='unset'){
       scores[answerChoice]+=active.points;
       if(m.activeHelp==='pit' && answerChoice===m.turn)scores[other]-=active.points;
     }
     const usedHelps=m.usedHelps.map((s,i)=>{
       const next=[...s];
       if(i===m.turn&&m.activeHelp)next.push(m.activeHelp);
       if(i===m.restOwner)next.push('rest');
       return [...new Set(next)] as HelpId[];
     }) as [HelpId[],HelpId[]];
     return {...m,scores,usedCells:[...m.usedCells,active.id],turn:(1-m.turn) as 0|1,active:null,activeHelp:null,restOwner:null,usedHelps}
   });
   if(soundEnabled&&match.activeHelp==='pit'&&answerChoice===match.turn)playGameSound('pit');
   if(soundEnabled&&match.activeHelp==='trap'&&answerChoice===null)playGameSound('trap');
   setAnswerChoice('unset');
   setRevealedQuestionId(null);
   go('board');
 };
 const finish=()=>{if(soundEnabled&&match.scores[0]!==match.scores[1])playGameSound('win');setMatch(m=>({...m,ended:true}));setModal(null);go('result')};
 const available=useMemo(()=>CATEGORIES.filter(c=>c.title.includes(search)||!search),[search]);
 const liveCategoryCard=(c:PublicCategory,withSelect:boolean)=>{
   const ready=c.eligible;
   const isOpen=openInfo===c.id;
   // One complete game consumes two questions from each of the three score levels.
   const allGames=Math.max(0,Math.min(Math.floor(c.count_200/2),Math.floor(c.count_400/2),Math.floor(c.count_600/2)));
   const personalBalance=categoryBalances?.find(item=>item.id===c.id);
   const remainingText=!ready?'0 لعبة جاهزة':!user?n(allGames)+' لعبة للحساب الجديد':
      balanceError?'تعذّر تحميل رصيد الألعاب':!categoryBalances?'جارٍ تحميل رصيدك...':
      !personalBalance?'الرصيد غير متاح':personalBalance.remainingGames<=0?'نفد رصيد الألعاب':
      'باقي '+n(personalBalance.remainingGames)+' من '+n(allGames)+' لعبة';
   const emptyBalance=ready&&!!user&&!!personalBalance&&personalBalance.remainingGames<=0;
   return <article className={`catalogue-card ${!ready?'catalogue-pending':''}`} key={c.id}>
     <div className="catalogue-cover">
       {c.imageUrl?<img src={API_BASE+c.imageUrl} alt={`رسم توضيحي لتصنيف ${c.title_ar}`} loading="lazy"/>:<div className="catalogue-image-missing">صورة قيد الإضافة</div>}
       <button type="button" className="catalogue-info-button" aria-expanded={isOpen} aria-label={`معلومات عن ${c.title_ar}`} title={`عن ${c.title_ar}`} onClick={()=>setOpenInfo(id=>id===c.id?null:c.id)}><span aria-hidden="true">i</span></button>
       {isOpen&&<div className="catalogue-info-popover" role="region" aria-label={`معلومات عن ${c.title_ar}`}>
         <button className="catalogue-popover-close" type="button" onClick={()=>setOpenInfo(null)} aria-label="إغلاق الشرح">×</button>
         <strong>{c.title_ar}</strong><p>{c.description_ar||'وصف التصنيف سيُضاف لاحقًا.'}</p>
       </div>}
     </div>
     <strong className="catalogue-card-title">{c.title_ar}</strong>
     <span className={`catalogue-status ${ready?'catalogue-ready':''}`}>{ready?'متاح':'بانتظار بنك الأسئلة'}</span>
     <div className={`catalogue-games-remaining ${emptyBalance?'catalogue-games-empty':''}`} role="status"><span aria-hidden="true">🎯</span><span>{remainingText}</span></div>
     {withSelect&&<small className="catalogue-card-note">بيتفعّل تلقائيًا لما تتوفر الأسئلة المعتمدة</small>}
   </article>;
 };
 const catalogSections=<div className="catalogue-sections">
   <p className="catalogue-count-note">اللعبة الكاملة في كل تصنيف = 6 أسئلة (200 × 2، 400 × 2، 600 × 2). {user?'الأرقام تخص حسابك.':'سجّل دخولك حتى تشوف عدد ألعابك المتبقية بعد اللعب.'}</p>
   {catalogLoading?<div className="catalogue-loading" role="status">جارٍ تحميل التصنيفات والصور من Neon...</div>:
   catalogError?<div className="catalogue-failure" role="alert"><p>{catalogError}</p><Button kind="outline" onClick={()=>setCatalogRetry(v=>v+1)}>إعادة المحاولة</Button></div>:
   !liveCatalog?.sections.length?<div className="catalogue-loading">ما في سيكشنز مضافة حاليًا.</div>:
   liveCatalog.sections.map(section=>{
     const cards=liveCatalog.categories.filter(c=>c.section_id===section.id&&c.title_ar.includes(search));
     if(search&&!cards.length)return null;
     return <section className="catalogue-section" key={section.id}>
       <div className="catalogue-section-header"><h3>{section.title_ar}</h3><span>{n(cards.length)} تصنيفات</span></div>
       <div className="category-grid catalogue-grid">{cards.map(c=>liveCategoryCard(c,page==='setup'))}</div>
     </section>;
   })}
 </div>;
 const outcome=match.scores[0]===match.scores[1]?null:match.scores[0]>match.scores[1]?0:1;
 const resultsLabel=outcome===null?'تعادل':match.names[outcome];
 const navbar=<header className="navbar"><div className="container navbar-inner"><button className="brand-btn" onClick={()=>go('home')} aria-label="الصفحة الرئيسية"><GameLogo/></button><nav className={mobileMenu?'nav-links nav-open':'nav-links'} aria-label="التنقل الرئيسي"><button className="nav-active" onClick={()=>go('home')}>الألعاب</button><button onClick={()=>setModal('how')}>كيف تبدأ؟</button><button onClick={()=>document.getElementById('about')?.scrollIntoView({behavior:'smooth'})}>عن الموقع</button></nav><div className="nav-auth"><button type="button" className="sound-toggle" aria-pressed={soundEnabled} aria-label={soundEnabled?'كتم المؤثرات الصوتية':'تشغيل المؤثرات الصوتية'} title={soundEnabled?'كتم المؤثرات الصوتية':'تشغيل المؤثرات الصوتية'} onClick={()=>setSoundEnabled(v=>!v)}>{soundEnabled?'🔊':'🔇'} <span>{soundEnabled?'الصوت':'مكتوم'}</span></button>{user?<><span className="signed"><span className="avatar">{previewName.charAt(0)}</span> أهلًا، {previewName}</span>{user.role==='admin'&&<button className="tiny-link" onClick={()=>go('admin')}>لوحة الأدمن</button>}<button className="tiny-link" onClick={logout}>خروج</button></>:<><Button kind="primary" onClick={()=>{go('register')}}>إنشاء حساب</Button><Button kind="outline" onClick={()=>{go('login')}}>تسجيل الدخول</Button></>}</div><button className="mobile-toggle" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="إظهار القائمة"><Icon name="menu"/></button></div></header>;
 const crumb=(text:string)=><div className="crumb"><button onClick={()=>go('home')}>الألعاب</button><span>/</span><button onClick={()=>go('details')}>سين جيم</button><span>/</span><b>{text}</b></div>;
 const previewBanner=<div className="info-banner"><strong>بنك الأسئلة الحقيقية بدأ</strong><span>دوري أبطال أوروبا وكأس العالم فيهما 90 سؤالًا لكل تصنيف في Neon. باقي التصنيفات بانتظار الأسئلة. الاستهلاك مرتبط بحساب اللاعب.</span></div>;
 const categoryCard=(c:typeof CATEGORIES[number],withSelect:boolean)=>{
    const chosen=withSelect&&selected.includes(c.id);
    const quotaReached=withSelect&&!chosen&&selected.length>=count&&c.available;
    const unavailable=!c.available;
    const disabled=(withSelect&&(quotaReached||unavailable))||(!withSelect&&unavailable);
    const reason=unavailable?(c.reason||'غير متاح حاليًا'):quotaReached?'اكتمل العدد المسموح':chosen?'تم الاختيار':withSelect?'اضغط للاختيار':'للاستكشاف';
    return <button key={c.id} type="button" disabled={disabled} onClick={()=>{if(withSelect)toggleCategory(c.id)}}
       aria-pressed={withSelect?chosen:undefined} aria-label={`${c.title}: ${reason}`}
       className={`category-card ${chosen?'category-selected':''} ${unavailable?'category-locked':''} ${quotaReached?'category-quota-locked':''}`}>
       <div className={`category-cover cover-${c.tint}`}>{c.icon}</div><strong>{c.title}</strong><small>{reason}</small>
       {(unavailable||quotaReached)&&<span className="category-shield" aria-hidden="true">{unavailable?'غير متاح':'العدد مكتمل'}</span>}
    </button>;
 };
 const helpIcon=(id:HelpId)=><Icon name={id==='friend'?'phone':id==='pit'?'pit':id==='two'?'two':id==='rest'?'rest':'trap'} size={21}/>;
 const helpCard=(help:typeof HELPS[number],i:0|1)=>{const isSelected=match.helps[i].includes(help.id);const isFull=match.helps[i].length>=3&&!isSelected;
  return <button key={help.id} type="button" disabled={isFull} onClick={()=>setTeamHelp(i,help.id)} className={`help-choice ${isSelected?'help-selected':''} ${i===1&&isSelected?'help-gold':''}`} aria-pressed={isSelected}>
    <div className="help-title"><span className="help-choice-icon">{helpIcon(help.id)}</span><span className={`select-square ${isSelected?'checked':''}`}>{isSelected?'✓':''}</span><b>{help.title}</b><span className="help-timing">{help.timing}</span></div><p>{help.detail}</p>
  </button>};
 const scoreCard=(i:0|1,compact=false)=><div className={`score-card ${match.turn===i?'score-active':''}`}><div className="score-name"><b>{match.names[i]}</b><div className="score-correction"><button aria-label={`اطرح 200 من ${match.names[i]}`} onClick={()=>changeScore(i,-200)}><Icon name="minus" size={17}/></button><strong>{n(match.scores[i])}</strong><button aria-label={`أضف 200 إلى ${match.names[i]}`} onClick={()=>changeScore(i,200)}><Icon name="plus" size={17}/></button></div><small>كل ضغطة تصحيح ±200 نقطة</small></div><div className="score-helps"><b>وسائل المساعدة</b><div className="score-helps-grid">{match.helps[i].map(id=>{const used=match.usedHelps[i].includes(id),sel=id==='rest'?match.restOwner===i:match.activeHelp===id&&match.turn===i;const help=HELPS.find(h=>h.id===id)!;const state=helpAvailability(id,i);return <button type="button" title={`${help.title} — ${help.timing} — ${state.reason}`} aria-label={`${help.title}، ${help.timing}، ${state.reason}`} aria-pressed={sel} disabled={!state.enabled} className={`score-help ${used?'spent':''} ${sel?'chosen':''} ${!state.enabled?'unavailable':''}`} key={id} onClick={()=>useHelp(id,i)}><span>{helpIcon(id)}</span><small>{help.title}</small></button>})}</div>{!compact&&<small>{match.restOwner===i?'استريح مفعّلة: اختاروا لاعبًا من الفريق الآخر ما يشارك بالإجابة':'الوسيلة تتفعّل في وقتها فقط، وبعد الاستخدام تصبح غير متاحة'}</small>}</div></div>;
 const scoreStrip=<div className="score-row">{scoreCard(0)}{scoreCard(1)}</div>;
 const footer=<footer className="footer" id="about"><p>بلّشها — الحسابات حقيقية، والأسئلة التجريبية بانتظار الاعتماد.</p><div><button onClick={()=>go('home')}>الألعاب</button><button onClick={()=>setModal('how')}>عن الموقع</button></div></footer>;
 return <div className="app" dir="rtl">{page==='live'?null:navbar}<main className={page==='live'?'main live-root':'container main'}>
 {page==='home'&&<><section className="home-hero"><div className="hero-copy"><span className="eyebrow dark-eyebrow">ألعاب جماعية بمكان واحد</span><h1>اللّمّة أحلى مع اللعب!</h1><h2>اختار لعبتك، اجمع أصحابك، وابدأ التحدّي.</h2><p>تصفّح بدون حساب، وسجّل دخولك فقط لما تحب تبدأ. كل الألعاب موجودة بمكان واحد.</p><div className="hero-actions"><Button kind="gold" onClick={()=>document.getElementById('games')?.scrollIntoView({behavior:'smooth'})}>استعرض الألعاب</Button><Button kind="outline" onClick={()=>setModal('how')}>كيف نبدأ؟</Button></div></div><HeroArt/></section>
 <div className="feature-strip"><div><span>✓</span><strong>جهاز واحد</strong><small>يكفي للّمة</small></div><div><span>✓</span><strong>حساب واحد</strong><small>لكل الألعاب</small></div><div><span>✓</span><strong>بدون تعقيد</strong><small>افتح الموقع وتصفّح</small></div></div>
 <section className="home-section" id="games"><div className="section-heading"><div><h2>الألعاب اللي رح تجمعكم</h2><p>جرّب سين جيم أولًا، واستكشف باقي التحدّيات القادمة.</p></div><span>لعبة متاحة الآن، والباقي بالطريق</span></div><div className="game-grid">{GAMES.map(game=><article className="game-card" key={game.id}><img src={game.image} alt={`صورة لعبة ${game.title}`}/><h3>{game.title}</h3><p>{game.description}</p><span className={`status ${game.status==='available'?'status-yes':''}`}>{game.status==='available'?'متاح':'قريبًا'}</span><Button disabled={game.status!=='available'} onClick={()=>go('details')}>{game.status==='available'?'استكشف اللعبة':'قريبًا'}</Button></article>)}</div></section>
 <section className="home-section steps" id="steps"><div className="section-heading"><div><h2>ثلاث خطوات وتبلّش</h2><p>ببساطة من أول زيارة، من غير خطوات تسجيل إلزامية للتصفّح.</p></div></div><div className="steps-grid">{[['01','تصفّح واختار','شوف الألعاب والتصنيفات مجانًا'],['02','سجّل لما تبدأ','اسم مستخدم وكلمة مرور'],['03','العبوا مع بعض','اختاروا الفريق وبلّشوا التحدّي']].map(([num,title,desc])=><div className="step-card" key={num}><span>{num}</span><b>{title}</b><small>{desc}</small></div>)}</div></section>{footer}</>}
 {(page==='register'||page==='login')&&<><div className="auth-page"><section className="auth-form-panel"><span className="overline">{page==='register'?'حساب جديد':'أهلًا بعودتك'}</span><h1>{page==='register'?'إنشاء حساب':'تسجيل الدخول'}</h1><p>{page==='register'?'سجّل معلومات بسيطة، وخلّي حسابك جاهز لأي لعبة تختارها.':'أدخل بياناتك للانتقال لتجربة اللعبة.'}</p><form onSubmit={submitAuth}>{page==='register'&&<label>الاسم<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="اكتب اسمك" required autoComplete="name"/></label>}<label>اسم المستخدم<input value={authUsername} onChange={e=>setAuthUsername(e.target.value)} placeholder="اكتب اسم المستخدم" required autoComplete="username"/></label><label>كلمة المرور<div className="password-input"><input type={showPassword?'text':'password'} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={page==='register'?10:1} autoComplete={page==='register'?'new-password':'current-password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'إخفاء كلمة المرور':'عرض كلمة المرور'}><Icon name={showPassword?'eyeOff':'eye'}/></button></div></label>{authError&&<div className="error-message" role="alert">{authError}</div>}<p className="auth-hint">بدون بريد إلكتروني أو حساب Google.</p><Button type="submit" disabled={authPending} className="full-btn">{authPending?'جارٍ الاتصال بالخادم...':page==='register'?'إنشاء الحساب':'تسجيل الدخول'}</Button><p className="auth-switch">{page==='register'?'عندك حساب؟':'ما عندك حساب؟'} <button onClick={()=>{setAuthError('');go(page==='register'?'login':'register')}} type="button">{page==='register'?'تسجيل الدخول':'إنشاء حساب'}</button></p></form><div className="auth-disclaimer">الحسابات تُحفظ فعليًا في Neon، وكلمة المرور تُشفّر في الخادم ولا تُخزَّن في المتصفح.</div></section><aside className="auth-visual"><span className="eyebrow dark-eyebrow">ألعابكم كلها بمكان واحد</span><h2>اسم واحد، وبداية ألعاب كثيرة</h2><p>أنشئ حسابك مرة واحدة واستمتع بكل الألعاب اللي رح نضيفها.</p><HeroArt/><span className="auth-bottom-note">سين جيم الآن • ألعاب جديدة لاحقًا</span></aside></div>{footer}</>}
  {page==='admin'&&<section className="admin-page" aria-label="لوحة إدارة بلّشها">
  <div className="section-heading"><div><span className="overline">Baleshhaa Admin</span><h1>لوحة الإدارة</h1><p>إحصاءات الحسابات من قاعدة Neon الفعلية. متاحة للأدمن فقط.</p></div><Button kind="outline" onClick={()=>go('home')}>العودة للموقع</Button></div>
  {user?.role!=='admin'?<BasePanel><p>ليس لديك صلاحية الوصول لهذه الصفحة.</p><Button onClick={()=>go('home')}>عودة</Button></BasePanel>:<>
  {adminError&&<div className="error-message" role="alert">{adminError}</div>}
  <div className="admin-stats">
   <BasePanel><span>المستخدمون</span><strong>{adminStats?n(Number(adminStats.users)):'…'}</strong></BasePanel>
   <BasePanel><span>المديرون</span><strong>{adminStats?n(Number(adminStats.admins)):'…'}</strong></BasePanel>
   <BasePanel><span>الجلسات النشطة</span><strong>{adminStats?n(Number(adminStats.active_sessions)):'…'}</strong></BasePanel>
   <BasePanel><span>الألعاب</span><strong>{adminStats?n(Number(adminStats.games)):'…'}</strong></BasePanel>
  </div>
  <AdminStudio/>
   <BasePanel><h2>تغيير بيانات دخول الأدمن</h2><p className="admin-muted">التغيير يتم فعليًا داخل Neon، ويؤدي إلى إنهاء جميع الجلسات وإعادة تسجيل الدخول.</p>
    <form className="admin-credentials" onSubmit={changeMyCredentials}>
     <label>اسم المستخدم الجديد<input value={newAdminUsername} onChange={e=>setNewAdminUsername(e.target.value)} placeholder={user?.username||'اسم المستخدم'} autoComplete="username" minLength={3}/></label>
     <label>كلمة المرور الحالية<input type="password" value={oldCredential} onChange={e=>setOldCredential(e.target.value)} autoComplete="current-password" required/></label>
     <label>كلمة المرور الجديدة<input type="password" value={newCredential} onChange={e=>setNewCredential(e.target.value)} minLength={10} autoComplete="new-password" required/></label>
     {changeError&&<p className="error-message">{changeError}</p>}
     <Button disabled={changeBusy} type="submit">{changeBusy?'جارٍ التحديث...':'تحديث بيانات الدخول'}</Button>
    </form>
  </BasePanel></>}
 </section>}
 {page==='details'&&<>{crumb('سين جيم')}<section className="details-banner"><div className="details-copy"><span className="eyebrow dark-eyebrow">تحدّي أسئلة للفريقين</span><h1>سين جيم</h1><p>اختاروا تصنيفاتكم، شكّلوا فريقين، واجمعوا النقاط مع بعض.</p><small>تقدر تستكشف اللعبة والتصنيفات بدون حساب. التسجيل مطلوب بس لما تبدأ المباراة.</small><div className="hero-actions"><Button kind="gold" onClick={openReal}>جرّب الأسئلة الحقيقية</Button><Button kind="outline" onClick={requirePreview}>معاينة إعداد 4/6/8</Button></div></div><img src={GAMES[0].image} alt="سين جيم — بطاقة الأسئلة"/></section><div className="feature-strip"><div><strong>فريقان</strong><small>منافسة جماعية مباشرة</small></div><div><strong>200 / 400 / 600</strong><small>أسئلة بمستويات نقاط</small></div><div><strong>5 وسائل مساعدة</strong><small>كل فريق يختار 3</small></div></div><div className="live-cta"><div><strong>جاهز تجرب الأسئلة الحقيقية؟</strong><p>90 سؤالًا لدوري الأبطال و90 لكأس العالم. نسخة اختبار بتصنيفين، واستهلاك مستقل لكل حساب.</p></div><Button kind="primary" onClick={openReal}>اختبار حقيقي بتصنيفين</Button></div><section className="home-section"><div className="section-heading"><div><h2>استكشف التصنيفات</h2><p>هاي الـ3 Sections والـ14 Category الحقيقية، مع صورها وأوصافها المحفوظة في Neon.</p></div><span>تصنيفان جاهزان للتجربة الآن</span></div><div className="search-wrap"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="اكتب اسم التصنيف" aria-label="البحث عن تصنيف"/></div>{catalogSections}{previewBanner}</section>{footer}</>}
 {page==='setup'&&<>{crumb('إعداد المباراة')}<BasePanel className="setup-intro"><h1>جهّزوا مباراة سين جيم</h1><p>اختار عدد التصنيفات، وبعدها حدّد التصنيفات اللي بدكم تلعبوها.</p><div className="steps-progress"><span className="step-current">1 — التصنيفات</span><span>2 — الفرق ووسائل المساعدة</span></div></BasePanel><BasePanel><h2>كم تصنيف بدكم تختاروا؟</h2><p>الفريقان بلعبوا جميع التصنيفات المختارة. كل تصنيف بالمباراة يحتوي سؤالين 200 وسؤالين 400 وسؤالين 600.</p><div className="count-options">{([4,6,8] as const).map(c=><button key={c} aria-pressed={count===c} className={count===c?'selected':''} onClick={()=>selectCount(c)}>{n(c)} تصنيفات</button>)}</div></BasePanel><section className="home-section"><div className="section-heading"><div><h2>اختار التصنيفات</h2><p>في مباراتك القادمة، كل تصنيف فيه 6 أسئلة، ودور كل فريق فيها حسب التسلسل.</p></div><span className="count-badge">{showDemoCategories?n(selected.length):"0"} من {n(count)} — {showDemoCategories?"معاينة":"بانتظار الأسئلة"}</span></div><div className="search-wrap"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="اكتب اسم التصنيف"/></div>{catalogSections}
 <div className="catalogue-demo-block">
   <div><strong>بدك تجرّب شكل المباراة حاليًا؟</strong><p>التصنيفات الحقيقية فوق محفوظة على Neon، لكنها غير قابلة للعب حتى تتوفر الأسئلة. تقدر تفتح تصنيفات المعاينة القديمة لتجربة الشاشات فقط.</p></div>
   <Button kind="outline" onClick={()=>{setShowDemoCategories(v=>!v);setOpenInfo(null)}}>{showDemoCategories?'إخفاء المعاينة':'عرض معاينة تجريبية'}</Button>
 </div>
 {showDemoCategories&&<div className="catalogue-demo-cards">
   <h3>تصنيفات تجريبية — لا تُحتسب ولا تُحفظ في Neon</h3>
   <div className="category-grid">{available.filter(c=>c.group==='football').map(c=>categoryCard(c,true))}{available.filter(c=>c.group==='other').map(c=>categoryCard(c,true))}</div>
 </div>}{previewBanner}<div className="bottom-actions"><Button kind="outline" onClick={()=>go('details')}>رجوع لتفاصيل اللعبة</Button><div className="bottom-next"><small>{showDemoCategories?'هذه مباراة للمعاينة فقط':'نبدأ اللعب بعد إضافة الأسئلة'}</small><Button disabled={!showDemoCategories||selected.length!==count} onClick={()=>go('teams')}>التالي: الفرق ووسائل المساعدة</Button></div></div></section></>}
 {page==='teams'&&<>{crumb('إعداد المباراة')}<BasePanel className="setup-intro"><h1>الفرق ووسائل المساعدة</h1><p>اكتبوا أسماء الفريقين، وكل فريق يختار 3 وسائل مساعدة من أصل 5 قبل بداية المباراة.</p><div className="steps-progress"><span className="step-complete">✓ 1 — اختيار التصنيفات مكتملة</span><span className="step-current">2 — الفرق والمساعدة · الحالية</span></div></BasePanel><div className="team-info"><span>فريقان · 3 وسائل لكل فريق · 5 وسائل متاحة</span><small>{n(selected.length)} تصنيفات مختارة — مثال توضيحي</small></div><section className="home-section"><div className="section-heading"><div><h2>جهّز الفريقين</h2><p>اختيارات كل فريق مستقلة عن الفريق الثاني.</p></div><span>5 وسائل أصلية — اختاروا 3 لكل فريق</span></div><div className="team-setup-grid">{([0,1] as const).map(i=><BasePanel key={i} className={`team-panel team-panel-${i}`}><div className="team-title"><h3>{i===0?'الفريق الأول':'الفريق الثاني'}</h3><span>{match.helps[i].length} من 3</span></div><label>اسم الفريق {i===0?'الأول':'الثاني'}<input value={match.names[i]} onChange={e=>setTeamName(i,e.target.value)} placeholder="مثلاً: الصقور" maxLength={60}/></label><h4>وسائل المساعدة</h4><p>اختار 3 من الخمسة، ممكن الفريقان يختاروا نفس الوسيلة.</p><div className="team-help-list">{HELPS.map(help=>helpCard(help,i))}</div><div className={`team-selected-count ${match.helps[i].length===3?'done':''}`}>{match.helps[i].length===3?'✓ تم اختيار 3 وسائل للفريق':`تم اختيار ${match.helps[i].length} من 3`}</div></BasePanel>)}</div>{previewBanner}<div className="bottom-actions"><Button kind="outline" onClick={()=>go('setup')}>العودة للتصنيفات</Button><Button disabled={match.helps.some(x=>x.length!==3)||match.names.some(x=>!x.trim())} onClick={startMatch}>ابدأ المباراة</Button></div></section></>}
 {page==='board'&&<section className="game-area"><div className="board-head"><div><h1>لوحة سين جيم — {n(match.categoryIds.length)} تصنيفات</h1><p>صورة التصنيف في الوسط، وأسئلة 200 / 400 / 600 على الجانبين</p></div><span className="adopted-badge">التصميم المعتمد</span></div><div className="board-status"><span className="turn-badge">دور الفريق: {match.names[match.turn]}</span><Button kind="danger" onClick={()=>setModal('finish')}>إنهاء المباراة</Button></div><div className="board-grid">{match.categoryIds.map((catId,i)=>{const c=getCategory(catId);const cells=makeCells(catId);return <div className="board-cat" key={catId}><div className="board-questions">{cells.filter(x=>x.side==='A').map(cell=><button key={cell.id} disabled={match.usedCells.includes(cell.id)} className={match.usedCells.includes(cell.id)?'used':''} onClick={()=>openCell(cell)}>{cell.points}</button>)}</div><div className={`board-art cover-${c.tint}`}><div className="board-art-icon">{c.icon==='🏆'?'🏆':i+1}</div><small>صورة التصنيف</small><strong>{c.title}</strong></div><div className="board-questions">{cells.filter(x=>x.side==='B').map(cell=><button key={cell.id} disabled={match.usedCells.includes(cell.id)} className={match.usedCells.includes(cell.id)?'used':''} onClick={()=>openCell(cell)}>{cell.points}</button>)}</div></div>})}</div>{scoreStrip}<div className="game-note">كل خانة رقم = سؤال واحد، وهناك خانتان لكل مستوى في التصنيف. الأسئلة حاليًا للعرض فقط.</div></section>}
 {(page==='question'||page==='reveal')&&match.active&&<section className="game-area">{crumb('سؤال '+n(match.active.points))}<div className="question-title"><h1>{page==='question'?'السؤال الحالي':'النتيجة وكشف الإجابة'}</h1><p>{match.activeHelp==='trap'? `تم استخدام الفخ: ${match.names[(1-match.turn) as 0|1]} فقط يجاوب على السؤال.`:page==='question'?'الفريقان يجاوبان شفهيًا، بدون كتابة أو عدّاد إلزامي':'حدّد الفريق صاحب الإجابة الصحيحة'}</p></div><div className="question-stages"><span className={page==='question'?'current':'done'}>1 — عرض السؤال</span><span className={page==='reveal'?'done':''}>2 — كشف الإجابة</span><span className={page==='reveal'?'current':''}>3 — احتساب النقاط</span></div><BasePanel className="question-box"><div className="question-meta"><span>{getCategory(match.active.categoryId).title} <b>{match.active.points}</b></span><span>سؤال نصّي</span></div><hr/><h2>{sampleQuestion(match.active.categoryId,match.active.points).text}</h2><small>سؤال تجريبي لعرض تصميم الشاشة فقط</small>{page==='question'?<div className="answer-hidden"><b>الإجابة مخفية الآن</b><small>بعد ما الفريقين يجاوبوا، اضغط «عرض الإجابة»</small></div>:<div className="answer-visible"><small>الإجابة الصحيحة</small><h3>{sampleQuestion(match.active.categoryId,match.active.points).answer}</h3></div>}<div className="question-foot"><span>{match.activeHelp==='trap'?`الفخ على ${match.names[(1-match.turn) as 0|1]}: إجابة صحيحة = +${n(match.active.points)}، خاطئة = −${n(match.active.points)}`:'ممكن يجاوب الفريق الثاني إجابة مختلفة أو ما يجاوب'}</span><span className="turn-badge">{match.activeHelp==='trap'?`الفخ على: ${match.names[(1-match.turn) as 0|1]}`:`الدور الأساسي: ${match.names[match.turn]}`}</span></div></BasePanel>{page==='reveal'&&<BasePanel className="answer-score">{match.activeHelp==='trap'?<>
<h2>هل {match.names[(1-match.turn) as 0|1]} جاوب صح؟</h2>
<div className="winner-choice trap-answer">
<button type="button" className={answerChoice===(1-match.turn)?'picked':''} aria-pressed={answerChoice===(1-match.turn)} onClick={()=>setAnswerChoice((1-match.turn) as 0|1)}><span>{answerChoice===(1-match.turn)?'✓':'◯'}</span><strong>نعم، جاوب صح</strong></button>
<button type="button" className={answerChoice===null?'picked':''} aria-pressed={answerChoice===null} onClick={()=>setAnswerChoice(null)}><span>{answerChoice===null?'✓':'◯'}</span><strong>لا، جاوب غلط</strong></button>
</div></>:<>
<h2>مين جاوب صح؟</h2>
<div className="winner-choice">{([0,1,null] as const).map(i=><button type="button" key={i??'none'} className={answerChoice===i?'picked':''} aria-pressed={answerChoice===i} onClick={()=>setAnswerChoice(i)}><span>{answerChoice===i?'✓':'◯'}</span><strong>{i===null?'لا أحد':match.names[i]}</strong></button>)}</div>
</>}</BasePanel>}{scoreStrip}<div className="bottom-actions"><Button kind="outline" onClick={()=>page==='reveal'?go('question'):backToBoard()}>{page==='reveal'?'العودة للسؤال':'العودة للّوحة'}</Button><div className="bottom-next"><small>ما في داعي تنتظر وقت محدد</small><Button disabled={page==='reveal'&&answerChoice==='unset'} onClick={page==='reveal'?confirmAnswer:revealAnswer}>{page==='reveal'?'تأكيد النتيجة ومتابعة المباراة':'عرض الإجابة'}</Button></div></div></section>}
 {page==='live'&&<><LiveMatch categories={(liveCatalog?.categories||[]).filter(c=>c.title_ar==='دوري أبطال أوروبا'||c.title_ar==='كأس العالم')} onExit={()=>{setCatalogRetry(v=>v+1);go('details')}} soundEnabled={soundEnabled}/>{footer}</>}
 {page==='result'&&<section className="game-area result-page">{crumb('النتيجة النهائية')}<div className="result-hero"><div className="result-copy"><span className="eyebrow dark-eyebrow">نهاية المباراة</span><h1>{outcome===null?'المباراة انتهت بالتعادل!':`${resultsLabel} هو الفائز!`}</h1><p>{outcome===null?'مباراة قوية من الفريقين! خلصتوا بنفس عدد النقاط.':'مبروك للفريق الفائز! لعبتوا مباراة حماسية، ووصلتوا للنهاية.'}</p><small>{outcome===null?'لا يوجد فريق خاسر أو فائز':'استحق الفوز بعد مباراة حماسية!'}</small><strong className="result-badge">{outcome===null?'النتيجة النهائية: تعادل':`الفوز لـ${resultsLabel}`}</strong></div><div className="trophy-scene" aria-hidden="true"><span className="trophy-back"/><div className="trophy-icon"><Icon name="trophy" size={135}/></div>{Array.from({length:30},(_,i)=><i key={i} className={`confetti confetti-${i%5}`} style={{left:`${(i*37)%93+3}%`,top:`${(i*19)%80+6}%`,animationDelay:`${(i%11)*.12}s`}}/>)}</div></div><div className="result-single"><div><strong>{outcome===null?'تعادل':resultsLabel}</strong><p>{outcome===null?'الفريقان بنفس النتيجة':'الفريق الفائز بالمباراة'}</p></div><span className="result-star">★</span><div><b>{n(outcome===null?match.scores[0]:match.scores[outcome])} نقطة</b><p>{outcome===null?'لكل فريق':'نقاط الفريق الفائز'}</p></div></div><BasePanel className="result-note"><h3>{outcome===null?'ولا فريق خسر — النتيجة تعادل!':'مباراة جميلة، والنتيجة انحسمت!'}</h3><p>هذه نتيجة تجريبية للـUI؛ في الموقع الحقيقي تُحسب النقاط من إجابات المباراة ووسائل المساعدة المستخدمة.</p></BasePanel><div className="bottom-actions"><Button kind="outline" onClick={()=>go('home')}>العودة للألعاب</Button><Button onClick={()=>setModal('new')}>بدء مباراة جديدة</Button></div></section>}
 </main>{modal==='how'&&<Modal title="كيف نلعب سين جيم؟" onClose={()=>setModal(null)}><div className="rules-list">{[['1. اختاروا التصنيفات','اختاروا 4 أو 6 أو 8 تصنيفات. كل تصنيف فيه سؤالان لكل من 200 و400 و600.'],['2. جهزوا الفريقين','اكتبوا اسم كل فريق، واختاروا 3 وسائل مساعدة من أصل 5 لكل فريق.'],['3. العبوا بالأدوار','الفريق الأول يبدأ، والفريقان يجاوبوا شفهيًا قبل عرض الإجابة.'],['4. اكشفوا الإجابة','حدّدوا أي فريق جاوب صح، أو «لا أحد»، وبعدين أكّدوا النتيجة.'],['5. اعرفوا الفائز','بنهاية المباراة يظهر الفريق الفائز فقط، أو نتيجة التعادل إذا تساوت النقاط.']].map(([a,b])=><div key={a}><b>{a}</b><p>{b}</p></div>)}</div><Button onClick={()=>setModal(null)}>فهمت</Button></Modal>}{modal==='finish'&&<Modal title="متأكد بدك تنهي المباراة؟" onClose={()=>setModal(null)}><p>رح تظهر النتيجة النهائية حسب النقاط المسجّلة لحد الآن. وإذا حاب تكمل، اضغط إلغاء.</p><div className="modal-actions"><Button kind="outline" onClick={()=>setModal(null)}>إلغاء</Button><Button onClick={finish}>نعم، إنهاء المباراة</Button></div></Modal>}{modal==='new'&&<Modal title="تبدأ مباراة جديدة؟" onClose={()=>setModal(null)}><p>رح ترجع لشاشة اختيار التصنيفات وتجهّز الفريقين لمباراة جديدة. المباراة الحالية لن تُحفظ على الخادم لأنها تجربة واجهة.</p><div className="modal-actions"><Button kind="outline" onClick={()=>setModal(null)}>إلغاء</Button><Button onClick={resetNew}>نعم، مباراة جديدة</Button></div></Modal>}{toast&&<div className="toast" role="status">{toast}</div>}</div>;
}
