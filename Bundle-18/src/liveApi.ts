import {ApiError} from './api';
export const GAME_BASE='https://br-autumn-pond-b92zfumu-baleshhaagame.compute.c-7.eu-central-1.aws.neon.tech';
export type GameProgress={id:string;title_ar:string;left_200:number;left_400:number;left_600:number;remainingGames:number};
export type MatchRecord={id:string;category_ids:string[];team_names:[string,string];team_helps:[string[],string[]];test_mode:boolean;created_at:string};
export type OpenedQuestion={id:string;categoryId:string;points:200|400|600;text:string;imageId?:string|null;cellId:string};
const TOKEN_KEY='baleshhaa:auth-token:v1';
async function call<T>(path:string,method:'GET'|'POST'='GET',data?:object):Promise<T>{
 const token=localStorage.getItem(TOKEN_KEY);
 const response=await fetch(GAME_BASE+'/api'+path,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw new ApiError(result?.error?.code||'GAME_API_ERROR',result?.error?.message||'تعذّر التواصل مع خادم المباريات.',response.status);
 return result as T;
}
export const gameApi={
 progress:()=>call<{categories:GameProgress[]}>('/player/progress'),
 active:()=>call<{match:MatchRecord|null}>('/player/matches/active'),
 create:(data:{categoryIds:string[];teamNames:[string,string];teamHelps:[string[],string[]];testMode:boolean})=>call<{match:MatchRecord}>('/player/matches','POST',data),
 open:(id:string,data:{cellId:string;categoryId:string;points:200|400|600})=>call<{question:OpenedQuestion}>('/player/matches/'+id+'/open','POST',data),
 reveal:(id:string,cellId:string)=>call<{answer:string;sourceUrl:string}>('/player/matches/'+id+'/reveal','POST',{cellId}),
 finish:(id:string,scores:[number,number])=>call<{ok:boolean}>('/player/matches/'+id+'/finish','POST',{scores}),
 abandon:(id:string)=>call<{ok:boolean}>('/player/matches/'+id+'/abandon','POST',{}),
};
