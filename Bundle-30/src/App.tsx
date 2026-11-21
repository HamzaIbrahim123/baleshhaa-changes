import {useEffect,useRef,useState, type FormEvent, type ReactNode} from 'react';
import {GAMES,HELPS,type HelpId} from './data';
import {apiAuth,apiAdmin,apiCatalog,ApiError,type AuthUser,type AdminStats,type PublicCategory,type SectionRow} from './api';
import AdminStudio from './AdminStudio';
import LiveMatch from './LiveMatch';
import {LettersRoomLobby} from './letters/RoomLobby';
import {LettersEntry} from './letters/LettersEntry';
import {LettersDemo} from './letters/LettersDemo';
import {LettersPresenterDemo} from './letters/LettersPresenterDemo';
import {gameApi,type GameProgress,type MatchRecord} from './liveApi';
import {categoryCoverSrc} from './categoryCover';

type Page='home'|'login'|'register'|'details'|'setup'|'teams'|'admin'|'live'|'letters'|'letters-host'|'letters-viewer'|'letters-demo'|'letters-presenter-demo';
const initialPage = (): Page => {
  try { return new URLSearchParams(window.location.search).get('display') === '1' ? 'letters-viewer' : 'home'; }
  catch { return 'home'; }
};
type TeamDraft={names:[string,string];helps:[HelpId[],HelpId[]]};
const initialTeamDraft=():TeamDraft=>({names:['الفريق الأول','الفريق الثاني'],helps:[[],[]]});
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
 const [page,setPage]=useState<Page>(initialPage);const [modal,setModal]=useState<'how'|'existing'|null>(null);
 const [user,setUser]=useState<AuthUser|null>(null);const previewName=user?.displayName??'';const [authPending,setAuthPending]=useState(false);
 const [adminStats,setAdminStats]=useState<AdminStats|null>(null);const [adminUsers,setAdminUsers]=useState<AuthUser[]>([]);const [adminError,setAdminError]=useState('');
 const [oldCredential,setOldCredential]=useState('');const [newCredential,setNewCredential]=useState('');const [newAdminUsername,setNewAdminUsername]=useState('');const [changeError,setChangeError]=useState('');const [changeBusy,setChangeBusy]=useState(false);
 const [authName,setAuthName]=useState('');const [authUsername,setAuthUsername]=useState('');const [authPassword,setAuthPassword]=useState('');const [showPassword,setShowPassword]=useState(false);const [authError,setAuthError]=useState('');
 const [search,setSearch]=useState('');const [count,setCount]=useState<4|6|8>(4);const [selected,setSelected]=useState<string[]>([]);
 const [liveCatalog,setLiveCatalog]=useState<{sections:SectionRow[];categories:PublicCategory[]}|null>(null);
 const [catalogLoading,setCatalogLoading]=useState(true);const [catalogError,setCatalogError]=useState('');const [catalogRetry,setCatalogRetry]=useState(0);
 const [categoryBalances,setCategoryBalances]=useState<GameProgress[]|null>(null);
 const [balanceError,setBalanceError]=useState(false);
 const [openInfo,setOpenInfo]=useState<string|null>(null);
 const [matchDraft,setMatchDraft]=useState<TeamDraft>(initialTeamDraft);const [launchedMatch,setLaunchedMatch]=useState<MatchRecord|null>(null);const [activeExisting,setActiveExisting]=useState<MatchRecord|null>(null);const [starting,setStarting]=useState(false);const [toast,setToast]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [slide,setSlide]=useState(0);const [mobileMenu,setMobileMenu]=useState(false);
 // These choices belong to one match draft, not to the account or catalogue.
 const previousAccountId=useRef<string|null|undefined>(undefined);
 const resetMatchDraft=()=>{
   setSelected([]);
   setMatchDraft(initialTeamDraft());
   setCount(4);
   setSearch('');
   setOpenInfo(null);
   setLaunchedMatch(null);
   setActiveExisting(null);
   setModal(null);
   setStarting(false);
 };
 useEffect(()=>{
   const currentId=user?.id??null;
   if(previousAccountId.current!==undefined && previousAccountId.current!==currentId){
     resetMatchDraft();
     setCategoryBalances(null);
     setBalanceError(false);
     setPage('home');
   }
   previousAccountId.current=currentId;
 },[user?.id]);
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
 const go=(p:Page)=>{
   if (typeof window !== 'undefined') {
     const url=new URL(window.location.href);
     if (p==='letters-viewer') { url.searchParams.set('display','1'); url.searchParams.delete('room'); }
     else { url.searchParams.delete('display'); url.searchParams.delete('room'); }
     window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
   }
   setPage(p);
 };
 const openLettersHost=()=>{
   if(!user){notice('سجّل الدخول أولًا عشان تنشئ غرفة لعبة الحروف.');go('login');return;}
   go('letters-host');
 };
 const openSetup=()=>{resetMatchDraft();setCatalogRetry(v=>v+1);go('setup')};
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
   resetMatchDraft();setCategoryBalances(null);setBalanceError(false);
    setUser(result.user);setAuthPassword('');go('home');
   notice('تم تسجيل الدخول وحفظ الحساب على السيرفر بنجاح.');
  }catch(error){
   const err=error instanceof ApiError?error:null;
   const message=err?.code==='USERNAME_TAKEN'?'اسم المستخدم مستخدم، جرّب اسمًا ثانيًا.':err?.code==='INVALID_CREDENTIALS'?'اسم المستخدم أو كلمة المرور غير صحيحة.':err?.code==='RATE_LIMITED'?'محاولات كثيرة، جرّب بعد 15 دقيقة.':err?.message||'تعذّر الاتصال بخادم Neon. لم يتم إنشاء أي حساب.';
   setAuthError(message);
  }finally{setAuthPending(false)}
 };
 const logout=async()=>{try{await apiAuth.logout();resetMatchDraft();setCategoryBalances(null);setBalanceError(false);setUser(null);setAdminStats(null);setAdminUsers([]);go('home')}catch{notice('تعذّر الاتصال بالخادم لتسجيل الخروج، حاول مرة ثانية.')}};
 const changeMyCredentials=async(e:FormEvent)=>{e.preventDefault();setChangeError('');setChangeBusy(true);try{await apiAuth.changeCredentials({oldPassword:oldCredential,newPassword:newCredential,newUsername:newAdminUsername.trim()||user?.username||''});setOldCredential('');setNewCredential('');resetMatchDraft();setCategoryBalances(null);setUser(null);go('login');notice('تم تحديث اسم المستخدم وكلمة المرور. سجّل الدخول بالبيانات الجديدة.')}catch(err){setChangeError(err instanceof ApiError?err.message:'تعذّر تحديث بيانات الدخول.')}finally{setChangeBusy(false)}};
 const eligibleCategories=liveCatalog?.categories.filter(c=>c.eligible)??[];
 const selectCount=(numberOfCategories:4|6|8)=>{setCount(numberOfCategories);setSelected(ids=>ids.slice(0,numberOfCategories))};
 const toggleCategory=(id:string)=>{
   const category=liveCatalog?.categories.find(c=>c.id===id);
   if(!category?.eligible)return;
   if(user){
     const balance=categoryBalances?.find(x=>x.id===id);
     if(!balance||balance.remainingGames<=0){notice(!categoryBalances?'جارٍ تحميل رصيدك، جرّب بعد ما يظهر.':'ما بقي ألعاب بهذا التصنيف لحسابك.');return}
   }
   setSelected(ids=>ids.includes(id)?ids.filter(x=>x!==id):ids.length<count?[...ids,id]:ids);
 };
 const setTeamName=(i:0|1,value:string)=>setMatchDraft(m=>({...m,names:m.names.map((old,j)=>j===i?value:old) as [string,string]}));
 const setTeamHelp=(i:0|1,id:HelpId)=>setMatchDraft(m=>({...m,helps:m.helps.map((old,j)=>j!==i?old:old.includes(id)?old.filter(x=>x!==id):old.length<3?[...old,id]:old) as [HelpId[],HelpId[]]}));
 const validSelection=selected.length===count && selected.every(id=>eligibleCategories.some(c=>c.id===id));
 const canLaunch=validSelection&&matchDraft.names.every(name=>name.trim().length>0)&&matchDraft.helps.every(h=>h.length===3);
 const createRealMatch=async()=>{
   const created=await gameApi.create({
     categoryIds:selected,
     teamNames:matchDraft.names.map(v=>v.trim()) as [string,string],
     teamHelps:matchDraft.helps.map(v=>[...v]) as [HelpId[],HelpId[]],
     testMode:false
   });
   setLaunchedMatch(created.match);setModal(null);setActiveExisting(null);go('live');
 };
 const startMatch=async()=>{
   if(starting||!canLaunch)return;
   if(!user){notice('سجّل الدخول حتى تبدأ المباراة وتحفظ استهلاك أسئلتك.');go('login');return}
   setStarting(true);
   try{
     const existing=await gameApi.active();
     if(existing.match){setActiveExisting(existing.match);setModal('existing');return}
     await createRealMatch();
   }catch(e){notice(e instanceof ApiError?e.message:e instanceof Error?e.message:'تعذّر بدء المباراة. جرّب مجددًا.')}
   finally{setStarting(false)}
 };
 const replaceExistingMatch=async()=>{
   if(!activeExisting||starting)return;
   setStarting(true);
   try{
     await gameApi.abandon(activeExisting.id);
     setActiveExisting(null);
     await createRealMatch();
   }catch(e){notice(e instanceof ApiError?e.message:'تعذّر إلغاء المباراة القديمة أو بدء الجديدة.')}
   finally{setStarting(false)}
 };
const liveCategoryCard=(c:PublicCategory,withSelect:boolean)=>{
   const ready=c.eligible;
   const isOpen=openInfo===c.id;
   const chosen=withSelect&&selected.includes(c.id);
   const isFull=withSelect&&!chosen&&selected.length>=count;
   const balance=categoryBalances?.find(item=>item.id===c.id);
   const allGames=Math.max(0,Math.min(Math.floor(c.count_200/2),Math.floor(c.count_400/2),Math.floor(c.count_600/2)));
   const availableGames=!user?allGames:balance?.remainingGames;
   const hasQuota=availableGames===0;
   const checking=!!user&&(!categoryBalances||balanceError);
   // Already-selected cards remain actionable, so you can change your mind.
   // Every other card is truly disabled once the requested number is reached.
   const blocked=withSelect&&!chosen&&(!ready||hasQuota||checking||isFull);
   const remainingText=!ready?'بانتظار الأسئلة':!user?n(allGames)+' لعبة للحساب الجديد':
      balanceError?'تعذّر تحميل رصيد الألعاب':!categoryBalances?'جارٍ تحميل رصيدك...':
      !balance?'الرصيد غير متاح':hasQuota?'نفد رصيد الألعاب':
      'باقي '+n(balance.remainingGames)+' من '+n(allGames)+' لعبة';
   const infoToggle=()=>setOpenInfo(id=>id===c.id?null:c.id);
   const coverSrc=categoryCoverSrc(c);
   const cover=<div className="catalogue-cover">
      {coverSrc?<img src={coverSrc} alt={`صورة التصنيف: ${c.title_ar}`} loading="lazy" decoding="async"/>:<div className="catalogue-image-missing">صورة غير متاحة</div>}
      {withSelect&&chosen&&<span className="catalogue-selected-mark" aria-hidden="true">✓</span>}
      <button type="button" className="catalogue-info-button" disabled={blocked} aria-expanded={isOpen}
        aria-label={`معلومات عن ${c.title_ar}`} title={`عن ${c.title_ar}`} onClick={infoToggle}>
        <span aria-hidden="true">i</span>
      </button>
      {isOpen&&!blocked&&<div className="catalogue-info-popover" role="region" aria-label={`معلومات عن ${c.title_ar}`}>
        <button className="catalogue-popover-close" type="button" onClick={()=>setOpenInfo(null)} aria-label="إغلاق الشرح">×</button>
        <strong>{c.title_ar}</strong><p>{c.description_ar||'تفاصيل التصنيف'}</p>
      </div>}
   </div>;
   return <article key={c.id}
      className={`catalogue-card ${!ready?'catalogue-pending':''} ${chosen?'catalogue-card-selected':''} ${blocked?'catalogue-card-disabled':''} ${withSelect?'catalogue-card-interactive':''}`}
      aria-disabled={withSelect?blocked:undefined}>
     {withSelect&&<button type="button" className="catalogue-card-hitarea"
       disabled={blocked} aria-pressed={chosen}
       aria-label={`${chosen?'إلغاء اختيار':'اختيار'} تصنيف ${c.title_ar}`}
       onClick={()=>toggleCategory(c.id)}/>}
     {cover}
     <strong className="catalogue-card-title">{c.title_ar}</strong>
     <span className={`catalogue-status ${ready?'catalogue-ready':''}`}>{ready?'متاح':'بانتظار الأسئلة'}</span>
     <div className={`catalogue-games-remaining ${hasQuota?'catalogue-games-empty':''}`} role="status"><span aria-hidden="true">🎯</span><span>{remainingText}</span></div>
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
 const helpIcon=(id:HelpId)=><Icon name={id==='friend'?'phone':id==='pit'?'pit':id==='two'?'two':id==='rest'?'rest':'trap'} size={21}/>;
 const helpCard=(help:typeof HELPS[number],i:0|1)=>{
   const isSelected=matchDraft.helps[i].includes(help.id);
   const isFull=matchDraft.helps[i].length>=3&&!isSelected;
   return <button key={help.id} type="button" disabled={isFull} onClick={()=>setTeamHelp(i,help.id)}
     className={`help-choice ${isSelected?'help-selected':''} ${i===1&&isSelected?'help-gold':''}`} aria-pressed={isSelected}>
     <div className="help-title"><span className="help-choice-icon">{helpIcon(help.id)}</span><span className={`select-square ${isSelected?'checked':''}`}>{isSelected?'✓':''}</span><b>{help.title}</b><span className="help-timing">{help.timing}</span></div>
     <p>{help.detail}</p>
   </button>;
 };
const navbar=<header className="navbar"><div className="container navbar-inner"><button className="brand-btn" onClick={()=>go('home')} aria-label="الصفحة الرئيسية"><GameLogo/></button><nav className={mobileMenu?'nav-links nav-open':'nav-links'} aria-label="التنقل الرئيسي"><button className="nav-active" onClick={()=>go('home')}>الألعاب</button><button onClick={()=>setModal('how')}>كيف تبدأ؟</button><button onClick={()=>document.getElementById('about')?.scrollIntoView({behavior:'smooth'})}>عن الموقع</button></nav><div className="nav-auth"><button type="button" className="sound-toggle" aria-pressed={soundEnabled} aria-label={soundEnabled?'كتم المؤثرات الصوتية':'تشغيل المؤثرات الصوتية'} title={soundEnabled?'كتم المؤثرات الصوتية':'تشغيل المؤثرات الصوتية'} onClick={()=>setSoundEnabled(v=>!v)}>{soundEnabled?'🔊':'🔇'} <span>{soundEnabled?'الصوت':'مكتوم'}</span></button>{user?<><span className="signed"><span className="avatar">{previewName.charAt(0)}</span> أهلًا، {previewName}</span>{user.role==='admin'&&<button className="tiny-link" onClick={()=>go('admin')}>لوحة الأدمن</button>}<button className="tiny-link" onClick={logout}>خروج</button></>:<><Button kind="primary" onClick={()=>{go('register')}}>إنشاء حساب</Button><Button kind="outline" onClick={()=>{go('login')}}>تسجيل الدخول</Button></>}</div><button className="mobile-toggle" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="إظهار القائمة"><Icon name="menu"/></button></div></header>;
 const crumb=(text:string)=><div className="crumb"><button onClick={()=>go('home')}>الألعاب</button><span>/</span><button onClick={()=>go('details')}>سين جيم</button><span>/</span><b>{text}</b></div>;
  const lettersFullScreen=page==='letters'||page==='letters-host'||page==='letters-viewer'||page==='letters-demo'||page==='letters-presenter-demo';
 const MainTag=lettersFullScreen?'div':'main';
 const footer=<footer className="footer" id="about"><p>بلّشها — ألعاب جماعية وأسئلة متجددة، وجلسة تجمعكم.</p><div><button onClick={()=>go('home')}>الألعاب</button><button onClick={()=>setModal('how')}>كيف تلعب؟</button></div></footer>;
 return <div className="app" dir="rtl">{page==='live'||lettersFullScreen?null:navbar}<MainTag className={page==='live'?'main live-root':lettersFullScreen?'letters-main':'container main'}>
  {page==='letters'&&<LettersEntry isSignedIn={!!user} backendConfigured={Boolean(import.meta.env.VITE_LETTERS_ROOM_API_BASE)} onHost={openLettersHost} onViewer={()=>go('letters-viewer')} onDemo={()=>go('letters-demo')} onPresenterDemo={()=>go('letters-presenter-demo')} onBack={()=>go('home')}/>}
  {page==='letters-demo'&&<LettersDemo onBack={()=>go('letters')}/>}
  {page==='letters-presenter-demo'&&<LettersPresenterDemo onBack={()=>go('letters')}/>}
  {page==='letters-host'&&<LettersRoomLobby mode="host" onBack={()=>go('letters')}/>}
  {page==='letters-viewer'&&<LettersRoomLobby mode="viewer" initialCode={new URLSearchParams(window.location.search).get('room')||undefined} onBack={()=>go('letters')}/>}
 {page==='home'&&<><section className="home-hero"><div className="hero-copy"><span className="eyebrow dark-eyebrow">ألعاب جماعية بمكان واحد</span><h1>اللّمّة أحلى مع اللعب!</h1><h2>اختار لعبتك، اجمع أصحابك، وابدأ التحدّي.</h2><p>تصفّح بدون حساب، وسجّل دخولك فقط لما تحب تبدأ. كل الألعاب موجودة بمكان واحد.</p><div className="hero-actions"><Button kind="gold" onClick={()=>document.getElementById('games')?.scrollIntoView({behavior:'smooth'})}>استعرض الألعاب</Button><Button kind="outline" onClick={()=>setModal('how')}>كيف نبدأ؟</Button></div></div><HeroArt/></section>
 <div className="feature-strip"><div><span>✓</span><strong>جهاز واحد</strong><small>يكفي للّمة</small></div><div><span>✓</span><strong>حساب واحد</strong><small>لكل الألعاب</small></div><div><span>✓</span><strong>بدون تعقيد</strong><small>افتح الموقع وتصفّح</small></div></div>
 <section className="home-section" id="games"><div className="section-heading"><div><h2>الألعاب اللي رح تجمعكم</h2><p>سين جيم متاحة للعب، وغرف لعبة الحروف للتجربة.</p></div><span>سين جيم متاحة • غرف الحروف للتجربة</span></div><div className="game-grid">{GAMES.map(game=>{const letters=game.id==='letters',enabled=game.status==='available'||letters;return <article className="game-card" key={game.id}><img src={game.image} alt={`صورة لعبة ${game.title}`}/><h3>{game.title}</h3><p>{game.description}</p><span className={`status ${enabled?'status-yes':''}`}>{letters?'تجربة الغرف':enabled?'متاح':'قريبًا'}</span><Button disabled={!enabled} onClick={()=>go(letters?'letters':'details')}>{letters?'استكشف لعبة الحروف':enabled?'استكشف اللعبة':'قريبًا'}</Button></article>})}</div></section>
 <section className="home-section steps" id="steps"><div className="section-heading"><div><h2>ثلاث خطوات وتبلّش</h2><p>ببساطة من أول زيارة، من غير خطوات تسجيل إلزامية للتصفّح.</p></div></div><div className="steps-grid">{[['01','تصفّح واختار','شوف الألعاب والتصنيفات مجانًا'],['02','سجّل لما تبدأ','اسم مستخدم وكلمة مرور'],['03','العبوا مع بعض','اختاروا الفريق وبلّشوا التحدّي']].map(([num,title,desc])=><div className="step-card" key={num}><span>{num}</span><b>{title}</b><small>{desc}</small></div>)}</div></section>{footer}</>}
 {(page==='register'||page==='login')&&<><div className="auth-page"><section className="auth-form-panel"><span className="overline">{page==='register'?'حساب جديد':'أهلًا بعودتك'}</span><h1>{page==='register'?'إنشاء حساب':'تسجيل الدخول'}</h1><p>{page==='register'?'سجّل معلومات بسيطة، وخلّي حسابك جاهز لأي لعبة تختارها.':'أدخل بياناتك وارجع للألعاب لتبدأ مباراتك.'}</p><form onSubmit={submitAuth}>{page==='register'&&<label>الاسم<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="اكتب اسمك" required autoComplete="name"/></label>}<label>اسم المستخدم<input value={authUsername} onChange={e=>setAuthUsername(e.target.value)} placeholder="اكتب اسم المستخدم" required autoComplete="username"/></label><label>كلمة المرور<div className="password-input"><input type={showPassword?'text':'password'} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={page==='register'?10:1} autoComplete={page==='register'?'new-password':'current-password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'إخفاء كلمة المرور':'عرض كلمة المرور'}><Icon name={showPassword?'eyeOff':'eye'}/></button></div></label>{authError&&<div className="error-message" role="alert">{authError}</div>}<p className="auth-hint">بدون بريد إلكتروني أو حساب Google.</p><Button type="submit" disabled={authPending} className="full-btn">{authPending?'جارٍ الاتصال بالخادم...':page==='register'?'إنشاء الحساب':'تسجيل الدخول'}</Button><p className="auth-switch">{page==='register'?'عندك حساب؟':'ما عندك حساب؟'} <button onClick={()=>{setAuthError('');go(page==='register'?'login':'register')}} type="button">{page==='register'?'تسجيل الدخول':'إنشاء حساب'}</button></p></form><div className="auth-disclaimer">الحسابات تُحفظ فعليًا في Neon، وكلمة المرور تُشفّر في الخادم ولا تُخزَّن في المتصفح.</div></section><aside className="auth-visual"><span className="eyebrow dark-eyebrow">ألعابكم كلها بمكان واحد</span><h2>اسم واحد، وبداية ألعاب كثيرة</h2><p>أنشئ حسابك مرة واحدة واستمتع بكل الألعاب اللي رح نضيفها.</p><HeroArt/><span className="auth-bottom-note">سين جيم الآن • ألعاب جديدة لاحقًا</span></aside></div>{footer}</>}
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
 {page==='details'&&<>{crumb('سين جيم')}
 <section className="details-banner">
  <div className="details-copy">
   <span className="eyebrow dark-eyebrow">تحدّي أسئلة للفريقين</span>
   <h1>سين جيم</h1>
   <p>اختاروا تصنيفاتكم، جهّزوا فريقين، ونافسوا بعض على النقاط بأسئلة حقيقية.</p>
   <small>تقدر تستكشف التصنيفات بدون حساب. تسجيل الدخول مطلوب عند بدء المباراة فقط.</small>
   <div className="hero-actions">
    <Button kind="gold" onClick={openSetup}>ابدأ اللعبة</Button>
    <Button kind="outline" onClick={()=>setModal('how')}>كيف تلعب؟</Button>
   </div>
  </div>
  <img src={GAMES[0].image} alt="سين جيم — بطاقة الأسئلة"/>
 </section>
 <div className="feature-strip">
  <div><strong>فريقان</strong><small>منافسة جماعية مباشرة</small></div>
  <div><strong>200 / 400 / 600</strong><small>أسئلة بمستويات نقاط</small></div>
  <div><strong>5 وسائل مساعدة</strong><small>كل فريق يختار 3</small></div>
 </div>
 <section className="home-section">
  <div className="section-heading"><div><h2>استكشف التصنيفات</h2><p>تصفّح أقسام سين جيم وتصنيفاتها وصورها من Neon.</p></div><span>{n(eligibleCategories.length)} تصنيف جاهز</span></div>
  <div className="search-wrap"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن تصنيف" aria-label="البحث عن تصنيف"/></div>
  {catalogSections}
  <div className="bottom-actions"><Button onClick={openSetup}>ابدأ اللعبة واختر التصنيفات</Button></div>
 </section>{footer}</>}
 {page==='setup'&&<>{crumb('اختيار التصنيفات')}
 <BasePanel className="setup-intro">
  <h1>اختار تصنيفات المباراة</h1><p>اختار عدد التصنيفات، وبعدها حدّد التصنيفات اللي بتحبوا تلعبوها. الصور والأعداد بتتحدّث من Neon مباشرة.</p>
  <div className="steps-progress"><span className="step-current">1 — التصنيفات</span><span>2 — الفرق ووسائل المساعدة</span></div>
 </BasePanel>
 <BasePanel><h2>كم تصنيف بدكم تختاروا؟</h2>
  <p>الفريقان بلعبوا جميع التصنيفات المختارة، وكل تصنيف فيه سؤالين 200 وسؤالين 400 وسؤالين 600.</p>
  <div className="count-options">{([4,6,8] as const).map(value=><button key={value} type="button" aria-pressed={count===value} className={count===value?'selected':''}
   disabled={eligibleCategories.length<value} onClick={()=>selectCount(value)}>{n(value)} تصنيفات</button>)}</div>
 </BasePanel>
 <section className="home-section">
  <div className="section-heading"><div><h2>اختار التصنيفات</h2><p>اضغط على الكارد كاملة للاختيار أو لإلغاء الاختيار. عند اكتمال العدد، باقي التصنيفات بتصير رمادية لحد ما تلغي اختيار واحد.</p></div>
   <span className="count-badge">{n(selected.length)} من {n(count)} تم اختيارها</span></div>
  <div className="search-wrap"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن تصنيف" aria-label="البحث عن تصنيف"/></div>
  {catalogSections}
  <div className="bottom-actions">
   <Button kind="outline" onClick={()=>go('details')}>رجوع لتفاصيل اللعبة</Button>
   <div className="bottom-next"><small>{validSelection?'التصنيفات جاهزة للمباراة':'اختار العدد المطلوب من التصنيفات المتاحة'}</small>
    <Button disabled={!validSelection||!!user&&(!categoryBalances||balanceError||selected.some(id=>(categoryBalances.find(c=>c.id===id)?.remainingGames??0)<=0))} onClick={()=>go('teams')}>التالي: الفرق ووسائل المساعدة</Button>
   </div>
  </div>
 </section>{footer}</>}
 {page==='teams'&&<>{crumb('الفرق ووسائل المساعدة')}
 <BasePanel className="setup-intro"><h1>الفرق ووسائل المساعدة</h1>
  <p>اكتبوا أسماء الفريقين، وكل فريق يختار 3 وسائل مساعدة من أصل 5 قبل بداية المباراة.</p>
  <div className="steps-progress"><span className="step-complete">✓ 1 — اختيار التصنيفات</span><span className="step-current">2 — الفرق والمساعدة</span></div>
 </BasePanel>
 <div className="team-info"><span>فريقان · 3 وسائل لكل فريق</span><small>{n(selected.length)} تصنيفات مختارة · المباراة الحقيقية</small></div>
 <section className="home-section">
  <div className="section-heading"><div><h2>جهّز الفريقين</h2><p>اختيارات كل فريق مستقلة عن الفريق الثاني.</p></div><span>اختاروا 3 مساعدات لكل فريق</span></div>
  <div className="team-setup-grid">{([0,1] as const).map(i=><BasePanel key={i} className={`team-panel team-panel-${i}`}>
   <div className="team-title"><h3>{i===0?'الفريق الأول':'الفريق الثاني'}</h3><span>{matchDraft.helps[i].length} من 3</span></div>
   <label>اسم الفريق {i===0?'الأول':'الثاني'}<input value={matchDraft.names[i]} onChange={e=>setTeamName(i,e.target.value)} placeholder="مثلاً: الصقور" maxLength={40}/></label>
   <h4>وسائل المساعدة</h4><p>اختار 3 من الخمسة، ممكن الفريقان يختاروا نفس الوسيلة.</p>
   <div className="team-help-list">{HELPS.map(help=>helpCard(help,i))}</div>
   <div className={`team-selected-count ${matchDraft.helps[i].length===3?'done':''}`}>{matchDraft.helps[i].length===3?'✓ تم اختيار المساعدات':`تم اختيار ${matchDraft.helps[i].length} من 3`}</div>
  </BasePanel>)}</div>
  <div className="bottom-actions"><Button kind="outline" onClick={()=>go('setup')}>العودة للتصنيفات</Button>
   <div className="bottom-next"><small>{user?'بتبدأ مباراة حقيقية وتحفظ استخدام أسئلتك':'بتحتاج تسجّل الدخول قبل بدء المباراة'}</small>
    <Button disabled={!canLaunch||starting} onClick={()=>void startMatch()}>{starting?'جارٍ بدء المباراة...':user?'ابدأ المباراة':'سجّل الدخول وابدأ'}</Button>
   </div>
  </div>
 </section>{footer}</>}
 {page==='live'&&<>{catalogError?<div className="live-error" role="alert">{catalogError}<Button kind="outline" onClick={()=>setCatalogRetry(v=>v+1)}>إعادة المحاولة</Button></div>:!liveCatalog||catalogLoading?<div className="live-loading-catalogue" role="status">جارٍ تحميل التصنيفات من Neon...</div>:<LiveMatch categories={liveCatalog.categories.filter(c=>c.eligible)} onExit={()=>{resetMatchDraft();setCatalogRetry(v=>v+1);go('details')}} onNewGame={()=>{resetMatchDraft();setCatalogRetry(v=>v+1);go('setup')}} onToggleSound={()=>setSoundEnabled(v=>!v)} soundEnabled={soundEnabled} initialMatch={launchedMatch}/>}{footer}</>}
 </MainTag>{modal==='how'&&<Modal title="كيف نلعب سين جيم؟" onClose={()=>setModal(null)}><div className="rules-list">{[['1. اختاروا التصنيفات','اختاروا 4 أو 6 أو 8 تصنيفات. كل تصنيف فيه سؤالان لكل من 200 و400 و600.'],['2. جهزوا الفريقين','اكتبوا اسم كل فريق، واختاروا 3 وسائل مساعدة من أصل 5 لكل فريق.'],['3. العبوا بالأدوار','الفريق الأول يبدأ، والفريقان يجاوبوا شفهيًا قبل عرض الإجابة.'],['4. اكشفوا الإجابة','حدّدوا أي فريق جاوب صح، أو «لا أحد»، وبعدين أكّدوا النتيجة.'],['5. اعرفوا الفائز','بنهاية المباراة يظهر الفريق الفائز فقط، أو نتيجة التعادل إذا تساوت النقاط.']].map(([a,b])=><div key={a}><b>{a}</b><p>{b}</p></div>)}</div><Button onClick={()=>setModal(null)}>فهمت</Button></Modal>}{modal==='existing'&&activeExisting&&<Modal title="في مباراة سابقة ما خلصت" onClose={()=>setModal(null)}>
  <p>عندك مباراة غير مكتملة. إذا اخترت إلغاءها، الأسئلة اللي انفتحت بتظل محسوبة، وغير المفتوحة بتظل متاحة. بعدها بنبدأ المباراة الجديدة.</p>
  <div className="modal-actions"><Button kind="outline" onClick={()=>setModal(null)}>لا، رجّعني</Button><Button kind="danger" disabled={starting} onClick={()=>void replaceExistingMatch()}>{starting?'جارٍ بدء الجديدة...':'إلغاء القديمة وبدء الجديدة'}</Button></div>
 </Modal>}
 {toast&&<div className="toast" role="status">{toast}</div>}</div>;
}
