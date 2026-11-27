/** QA-only transport. Never send production auth tokens to the QA branch. */
export const CN_API = 'https://br-late-math-b9m0r7gn-baleshhaacodenames.compute.c-7.eu-central-1.aws.neon.tech/api';
const CN_AUTH_API = 'https://br-late-math-b9m0r7gn-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech/api';
export const AUTH_KEY = 'baleshhaa:cnqa:auth:v1';
const MEMBER_PREFIX = 'baleshhaa:cnqa:member:v1:';
const PENDING_KEY = 'baleshhaa:cnqa:pending-create:v1';
export const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
export type Team = 'red'|'blue';
export type Slot = `${Team}:${'leader'|'guesser'}`;
export type Player = {id:string;name:string;slot:Slot|null;connected:boolean;isHost:boolean};
export type CardColor = Team|'neutral'|'assassin';
export type ClueCount = number|'infinity';
export type BoardCard = {id:number;word:string;revealed:boolean;color?:CardColor};
export type GuessRecord = {cardId:number;word:string;color:CardColor;outcome:'correct'|'opponent'|'neutral'|'assassin'};
export type ClueRecord = {team:Team;leader:string;guesser:string;text:string|null;count:ClueCount|null;guesses:GuessRecord[];endReason:string|null};
export type RoomState = {board:BoardCard[];marks:number[];clue:{text:string;count:ClueCount;attempts:number}|null;history:ClueRecord[];winner:Team|null;reason:string|null;deadline:number|null;serverNow:number;pausedRemaining:number|null;starter:Team|null;canCut:boolean;lastReveal:{round:number;cardId:number;color:CardColor;outcome:GuessRecord['outcome'];revision:number}|null;revision:number;phase:'lobby'|'clue'|'guess'|'result'|'closed';timed:boolean;round:number;players:Player[];you:{id:string;slot:Slot|null;isHost:boolean};paused:boolean;turn:Team|null;remaining:Record<Team,number>;score:Record<Team,number>};
export type Room = {code:string;state:RoomState;duplicate?:boolean};
export type QAUser = {id:string;username:string;displayName:string};
export type QAAuth = {user:QAUser;token:string};
export type Command = {kind:'select_slot';slot:Slot}|{kind:'remove_player';playerId:string}|{kind:'start'|'end_game'|'next_round'|'skip'|'cut_turn'}|{kind:'give_clue';text:string;count:ClueCount}|{kind:'toggle_mark'|'confirm_guess';cardId:number};
export class CNError extends Error {
 constructor(readonly code:string,readonly status:number,readonly room?:Room){super(code);this.name='CNError'}
}
const messages:Record<string,string> = {CLUE_ONE_WORD:'التلميح لازم يكون كلمة واحدة.',CLUE_ON_BOARD:'التلميح لا يمكن أن يكون من كلمات اللوحة.',INVALID_CLUE_COUNT:'اختر رقمًا من 1 إلى 8 أو ∞.',WRONG_ROLE_OR_TURN:'هذا الإجراء ليس من دورك.',ROOM_PAUSED:'اللعبة متوقفة بانتظار عودة اللاعبين.',MARK_FIRST:'حدد البطاقة أولًا.',CARD_UNAVAILABLE:'تم كشف البطاقة بالفعل.',GUESS_REQUIRED:'أكّد تخمينًا واحدًا على الأقل قبل إنهاء دورك.',CUT_NOT_AVAILABLE:'لم ينتهِ الوقت بعد.',CLOCK_RECONCILE_REQUIRED:'انتهى وقت التلميح. انتظر تحديث الدور.',LOGIN_REQUIRED:'سجّل الدخول بحساب تجريبي أولًا.',INVALID_CREDENTIALS:'اسم المستخدم أو كلمة المرور غير صحيحة.',USERNAME_TAKEN:'اسم المستخدم مستخدم. اختَر اسمًا آخر.',RATE_LIMITED:'محاولات كثيرة، حاول لاحقًا.',ROOM_NOT_FOUND:'الغرفة غير موجودة أو انتهت صلاحيتها.',ROOM_FULL:'الغرفة ممتلئة.',LOBBY_ONLY:'بدأت اللعبة بالفعل.',ACCOUNT_ALREADY_JOINED:'هذا الحساب منضم للغرفة بالفعل.',MEMBERSHIP_REVOKED:'تمت إزالتك من الغرفة.',NOT_MEMBER:'لم تعد عضوًا في هذه الغرفة.',TOKEN_CONFLICT:'تعارض في الجلسة؛ ارجع إلى الغرفة السابقة.',STALE_REVISION:'تغيّرت حالة الغرفة. تم تحديثها، حاول مجددًا.',SLOT_TAKEN:'تم حجز هذا الدور.',FOUR_READY_REQUIRED:'يجب اتصال أربعة لاعبين واختيار الأدوار.',HOST_ONLY:'هذا الإجراء لصاحب الغرفة فقط.',HOST_LOBBY_ONLY:'هذا الإجراء متاح في غرفة الانتظار فقط.',INVALID_NAME:'أدخل اسمًا صحيحًا.',ROOM_CLOSED:'تم إغلاق الغرفة.',SERVICE_UNAVAILABLE:'خدمة الغرف التجريبية غير متاحة حاليًا.',ORIGIN_DENIED:'هذه النسخة متاحة على الموقع المنشور فقط.',NETWORK:'تعذّر الاتصال بالخادم. حاول مجددًا.',TIMEOUT:'انتهت مهلة الاتصال. حاول مجددًا.'};
export function errorMessage(error:unknown){return error instanceof CNError?(messages[error.code]??'تعذّر إكمال الطلب. حاول مجددًا.'): 'تعذّر إكمال الطلب. حاول مجددًا.';}
function read(key:string){try{return sessionStorage.getItem(key)}catch{return null}}
function write(key:string,value:string){try{sessionStorage.setItem(key,value)}catch{/* in-memory session still usable */}}
function remove(key:string){try{sessionStorage.removeItem(key)}catch{/* unavailable */}}
export function savedAuth():QAAuth|null{try{const a=JSON.parse(read(AUTH_KEY)||'null');return a?.token&&a?.user?.id?a:null}catch{return null}}
export function clearAuth(){remove(AUTH_KEY)}
export const newToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export const savedMember=(code:string)=>read(MEMBER_PREFIX+code);
export const rememberMember=(code:string,token:string)=>write(MEMBER_PREFIX+code,token);
export const forgetMember=(code:string)=>remove(MEMBER_PREFIX+code);
export function pendingCreate(accountId:string){const key=PENDING_KEY+':'+accountId;const token=read(key)||newToken();write(key,token);return token}
export function finishCreate(accountId:string){remove(PENDING_KEY+':'+accountId)}
export function inviteUrl(code:string){const url=new URL(window.location.href);url.search='';url.hash='';url.searchParams.set('cnqa','1');url.searchParams.set('cnroom',code);return url.toString()}
export function setRoomUrl(code?:string){const url=new URL(window.location.href);url.searchParams.set('cnqa','1');if(code)url.searchParams.set('cnroom',code);else url.searchParams.delete('cnroom');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)}
async function request<T>(base:string,path:string,body?:object,token?:string,account?:string,signal?:AbortSignal):Promise<T>{
 const controller=new AbortController();const abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});const timeout=window.setTimeout(abort,12000);
 try{const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(account?{'X-Account-Token':account}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});
  const data=await response.json().catch(()=>null);if(!response.ok)throw new CNError(data?.error?.code||'SERVICE_UNAVAILABLE',response.status,data?.state&&data?.code?data:undefined);if(!data)throw new CNError('SERVICE_UNAVAILABLE',503);return data as T;
 }catch(e){if(e instanceof CNError)throw e;throw new CNError(controller.signal.aborted?'TIMEOUT':'NETWORK',0)}finally{window.clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
}
export const qaAuth={async sign(mode:'login'|'register',username:string,password:string,displayName:string){const data=await request<QAAuth>(CN_AUTH_API,'/auth/'+mode,mode==='register'?{username,password,displayName}:{username,password});write(AUTH_KEY,JSON.stringify(data));return data}};
export const cnApi={
 create:(timed:boolean,memberToken:string,account:string)=>request<Room>(CN_API,'/rooms',{timed,memberToken},account),
 join:(code:string,name:string,memberToken:string,account?:string)=>request<Room>(CN_API,`/rooms/${code}/join`,{name,memberToken},undefined,account),
 state:(code:string,token:string,signal?:AbortSignal)=>request<Room>(CN_API,`/rooms/${code}/state`,undefined,token,undefined,signal),
 command:(code:string,token:string,revision:number,command:Command,account?:string,commandId=crypto.randomUUID())=>request<Room>(CN_API,`/rooms/${code}/commands`,{commandId,expectedRevision:revision,command},token,account),
};
