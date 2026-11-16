/** Public Neon Function API origin, never a DATABASE_URL. */
export const API_BASE='https://br-autumn-pond-b92zfumu-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech';
const TOKEN_KEY='baleshhaa:auth-token:v1';
export type AuthUser={id:string;username:string;displayName:string;role:'player'|'admin';createdAt?:string;disabled?:boolean};
export type UserDetail=AuthUser&{activeSessions:number};
export type AdminStats={users:number|string;admins:number|string;active_sessions:number|string;games:number|string;sections?:number|string;categories?:number|string;questions?:number|string};
export type GameRow={id:string;title_ar:string;description_ar:string;status:'active'|'coming_soon'|'hidden';imageId:string|null;imageUrl:string|null;sort_order:number};
export type SectionRow={id:string;game_id:string;title_ar:string;description_ar:string;status:'active'|'hidden';imageId:string|null;imageUrl:string|null;sort_order:number};
export type CategoryRow={id:string;section_id:string;title_ar:string;description_ar:string;status:'active'|'hidden';imageId:string;imageUrl:string;sort_order:number};
export type QuestionRow={id:string;category_id:string;question_text:string;answer_text:string;points:200|400|600;status:'draft'|'published';source_reference:string;imageId:string|null;imageUrl:string|null;created_at?:string};
export type PublicCategory=CategoryRow&{eligible:boolean;playable:boolean;count_200:number;count_400:number;count_600:number};
export class ApiError extends Error{constructor(public code:string,message:string,public status:number){super(message);this.name='ApiError'}}
const getToken=()=>{try{return localStorage.getItem(TOKEN_KEY)}catch{return null}};
const setToken=(value:string)=>localStorage.setItem(TOKEN_KEY,value);
const clearToken=()=>localStorage.removeItem(TOKEN_KEY);
async function request<T>(path:string,method:'GET'|'POST'|'PATCH'='GET',data?:object):Promise<T>{
 const token=getToken();
 const response=await fetch(API_BASE+'/api'+path,{method,
  headers:{...(data?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
  body:data?JSON.stringify(data):undefined,
  cache:'no-store',
 });
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw new ApiError(payload?.error?.code||'API_ERROR',payload?.error?.message||'تعذّر إكمال الطلب من الخادم.',response.status);
 return payload as T;
}
type AuthReply={user:AuthUser;token:string};
export const apiAuth={
 async me():Promise<{user:AuthUser|null}>{
  if(!getToken())return {user:null};
  try{return await request<{user:AuthUser}>('/auth/me')}
  catch(e){if(e instanceof ApiError&&e.status===401){clearToken();return {user:null}}throw e}
 },
 async register(data:{displayName:string;username:string;password:string}):Promise<AuthReply>{
  const result=await request<AuthReply>('/auth/register','POST',data);setToken(result.token);return result;
 },
 async login(data:{username:string;password:string}):Promise<AuthReply>{
  const result=await request<AuthReply>('/auth/login','POST',data);setToken(result.token);return result;
 },
 async changeCredentials(data:{oldPassword:string;newPassword:string;newUsername:string}):Promise<void>{
  await request<{ok:boolean;requiresLogin:boolean}>('/auth/change-credentials','POST',data);clearToken();
 },
 async logout():Promise<void>{if(getToken())await request<{ok:boolean}>('/auth/logout','POST');clearToken()},
};
export const apiAdmin={
 stats:()=>request<{stats:AdminStats}>('/admin/stats'),
 users:(page=1)=>request<{users:AuthUser[];page:number}>('/admin/users?page='+page),
 user:(id:string)=>request<{user:UserDetail}>('/admin/users/'+id),
 userStatus:(id:string,disabled:boolean)=>request<{user:AuthUser}>('/admin/users/'+id+'/status','PATCH',{disabled}),
 games:()=>request<{games:GameRow[]}>('/admin/games'),
 gameCreate:(data:object)=>request<{game:GameRow}>('/admin/games','POST',data),
 gameUpdate:(id:string,data:object)=>request<{game:GameRow}>('/admin/games/'+id,'PATCH',data),
 sections:()=>request<{sections:SectionRow[]}>('/admin/sections'),
 sectionCreate:(data:object)=>request<{section:SectionRow}>('/admin/sections','POST',data),
 sectionUpdate:(id:string,data:object)=>request<{section:SectionRow}>('/admin/sections/'+id,'PATCH',data),
 categories:()=>request<{categories:CategoryRow[]}>('/admin/categories'),
 categoryCreate:(data:object)=>request<{category:CategoryRow}>('/admin/categories','POST',data),
 categoryUpdate:(id:string,data:object)=>request<{category:CategoryRow}>('/admin/categories/'+id,'PATCH',data),
 questions:(categoryId?:string)=>request<{questions:QuestionRow[]}>('/admin/questions'+(categoryId?'?categoryId='+encodeURIComponent(categoryId):'')),
 questionCreate:(data:object)=>request<{question:QuestionRow}>('/admin/questions','POST',data),
 questionUpdate:(id:string,data:object)=>request<{question:QuestionRow}>('/admin/questions/'+id,'PATCH',data),
 media:(dataUrl:string)=>request<{id:string;imageUrl:string}>('/admin/media','POST',{dataUrl}),
};
export const apiCatalog={list:(gameId='seen-jeem')=>request<{sections:SectionRow[];categories:PublicCategory[]}>('/catalog?gameId='+encodeURIComponent(gameId))};
