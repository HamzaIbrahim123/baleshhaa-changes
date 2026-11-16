/** Public API URL only. Never put Neon connection strings or privileged secrets in frontend code. */
export const API_BASE='https://br-autumn-pond-b92zfumu-baleshhaaapi.compute.c-7.eu-central-1.aws.neon.tech';
const TOKEN_KEY='baleshhaa:auth-token:v1';
export type AuthUser={id:string;username:string;displayName:string;role:'player'|'admin';createdAt?:string;disabled?:boolean};
export type AdminStats={users:number|string;admins:number|string;active_sessions:number|string;games:number|string};
export class ApiError extends Error{constructor(public code:string,message:string,public status:number){super(message);this.name='ApiError'}}
function getToken(){try{return localStorage.getItem(TOKEN_KEY)}catch{return null}}
function setToken(t:string){localStorage.setItem(TOKEN_KEY,t)}
function clearToken(){localStorage.removeItem(TOKEN_KEY)}
async function request<T>(path:string,method:'GET'|'POST'='GET',data?:object):Promise<T>{
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
    const result=await request<AuthReply>('/auth/register','POST',data);
    setToken(result.token);return result;
  },
  async login(data:{username:string;password:string}):Promise<AuthReply>{
    const result=await request<AuthReply>('/auth/login','POST',data);
    setToken(result.token);return result;
  },
  async changeCredentials(data:{oldPassword:string;newPassword:string;newUsername:string}):Promise<void>{
    await request<{ok:boolean;requiresLogin:boolean}>('/auth/change-credentials','POST',data);
    clearToken();
  },
  async logout():Promise<void>{
    if(getToken())await request<{ok:boolean}>('/auth/logout','POST');
    clearToken();
  },
};
export const apiAdmin={
  stats:()=>request<{stats:AdminStats}>('/admin/stats'),
  users:(page=1)=>request<{users:AuthUser[];page:number}>('/admin/users?page='+page),
};
