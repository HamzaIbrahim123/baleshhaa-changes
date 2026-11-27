import {useEffect,useRef} from 'react';
import type {GameSound} from './gameSound';
export default function AudioSettings({sound,onClose}:{sound:GameSound;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;const before=document.activeElement as HTMLElement|null;d.showModal();return()=>{d.close();before?.focus()}},[]);
 return <dialog ref={ref} dir="rtl" className="cn-audio-dialog" aria-labelledby="cn-audio-title" onCancel={e=>{e.preventDefault();onClose()}}>
 <header><div><small>AUDIO CONTROL</small><h2 id="cn-audio-title">إعدادات الصوت</h2></div><button type="button" className="cn-audio-close" aria-label="إغلاق" onClick={onClose}>×</button></header>
 <label className="cn-audio-master"><span>كتم جميع الأصوات</span><input type="checkbox" checked={sound.muted} onChange={sound.toggle}/></label>
 <label className="cn-audio-row"><span>الموسيقى <b dir="ltr">{sound.music}%</b></span><input type="range" min="0" max="100" step="5" value={sound.music} onChange={e=>sound.setMusic(Number(e.target.value))}/></label>
 <label className="cn-audio-row"><span>المؤثرات الصوتية <b dir="ltr">{sound.effects}%</b></span><input type="range" min="0" max="100" step="5" value={sound.effects} onChange={e=>sound.setEffects(Number(e.target.value))}/></label>
 <div className="cn-audio-preview"><small>تجربة الصوت</small><div><button type="button" disabled={sound.muted||sound.effects===0} onClick={()=>sound.preview('correct')}>تخمين صحيح</button><button type="button" disabled={sound.muted||sound.effects===0} onClick={()=>sound.preview('assassin')}>بطاقة سوداء</button><button type="button" disabled={sound.muted||sound.music===0} onClick={()=>sound.preview('victoryMusic')}>انتصار</button></div></div>
 <p>تُحفظ الإعدادات على هذا الجهاز فقط.</p><button type="button" className="btn btn-primary" onClick={onClose}>تم</button></dialog>
}
