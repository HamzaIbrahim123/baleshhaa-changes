import {useEffect,useRef} from 'react';
import './board.css';
const rules=[
 ['جهّزوا الفريقين','أربعة لاعبين: قائد ومخمّن في كل فريق، وكل شخص على جهازه.'],
 ['شوفوا اللوحة','25 بطاقة؛ القائدان يعرفان الألوان، والمخمّنان يشوفان الكلمات فقط.'],
 ['أعطِ تلميحًا','القائد يكتب كلمة واحدة ويحدد عددًا من 1 إلى 8 أو ∞. لا تستخدم كلمة من اللوحة أو جزءًا منها.'],
 ['شكّ ثم أكّد','اضغط على الكلمة لوضع علامة شك تظهر للجميع. اضغط زر التأكيد على البطاقة لتثبيت تخمينك.'],
 ['خمن بذكاء','يمكن إنهاء الدور دون أي تخمين. كلمة فريقك تسمح بالمتابعة: العدد + 1 كحد أقصى، أو بلا حد مع ∞. كلمة الخصم أو المحايدة تنهي الدور؛ السوداء تخسّرك الجولة.'],
 ['انتبه للوقت','أول تلميح لكل قائد 3 دقائق، ثم دقيقة ونصف. للمخمّن دقيقتان. عند انتهاء وقت أي منهما يستطيع قائد الخصم إنهاء دوره. يمكن اللعب دون تايمر.'],
 ['احسبوا الفوز','أول فريق يكشف كل كلماته يفوز. يمكن بدء جولة جديدة بنفس الفريقين والنتيجة التراكمية.']
];
export default function CodeNamesRules({onClose}:{onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;const previous=document.activeElement as HTMLElement|null;d.showModal();return()=>{d.close();previous?.focus()}},[]);
 return <dialog ref={ref} className="cn-rules-dialog" dir="rtl" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}} aria-labelledby="cn-rules-title"><header><h2 id="cn-rules-title">كيف تلعب كود نيمز؟</h2><button type="button" className="cn-rules-x" onClick={onClose} aria-label="إغلاق">×</button></header><ol className="cn-rule-cards">{rules.map(([title,body],i)=><li key={title}><span className="cn-rule-number" aria-hidden="true">{i+1}</span><div className="cn-rule-copy"><b>{title}</b><p>{body}</p></div></li>)}</ol><button className="btn btn-primary" type="button" onClick={onClose}>فهمت</button></dialog>
}