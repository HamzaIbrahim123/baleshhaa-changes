/** Baleshhaa dynamic image store.
 * Image UUIDs (app_media.id) are stable. Image bytes live in Neon Object Storage.
 * Legacy Neon media is still served transparently using the same ID route.
 */
import {ApiError} from './api';
export const ASSET_BASE='https://br-autumn-pond-b92zfumu-baleshhaaassets.compute.c-7.eu-central-1.aws.neon.tech';
const TOKEN_KEY='baleshhaa:auth-token:v1';
const uuidRe=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function assetImageUrl(imageId:string|null|undefined):string|null{
 return imageId&&uuidRe.test(imageId)?ASSET_BASE+'/api/assets/'+imageId:null;
}
export const assetsApi={
 async upload(dataUrl:string):Promise<{id:string;imageUrl:string;reused:boolean}>{
  const token=localStorage.getItem(TOKEN_KEY);
  if(!token)throw new ApiError('UNAUTHORIZED','سجّل الدخول كمسؤول لرفع صورة.',401);
  const response=await fetch(ASSET_BASE+'/api/admin/assets',{
   method:'POST',
   headers:{'content-type':'application/json','authorization':'Bearer '+token},
   body:JSON.stringify({dataUrl}),cache:'no-store'
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new ApiError(result?.error?.code||'UPLOAD_ERROR',result?.error?.message||'تعذّر رفع الصورة إلى Neon Storage.',response.status);
  return result;
 }
};
