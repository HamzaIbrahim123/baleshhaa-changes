import {createContext,useContext,type ReactNode} from 'react';
import './home-brand.css';
export const HomeNavigation=createContext<(()=>void)|null>(null);
export function HomeBrand({children,className='',disabled=false}:{children:ReactNode;className?:string;disabled?:boolean}){
 const home=useContext(HomeNavigation);
 return <button type="button" className={'baleshhaa-home-brand '+className} aria-label="بلّشها — الصفحة الرئيسية" title="الصفحة الرئيسية" disabled={disabled} onClick={()=>home?home():window.location.assign(window.location.pathname)}>{children}</button>
}