/** Baleshhaa game catalogue and play rules.
 * Real categories and questions are loaded from Neon.
 * No placeholder categories or fake questions are shipped in the production UI.
 */
export type Game={id:string;title:string;description:string;image:string;status:'available'|'coming'};
export type HelpId='friend'|'pit'|'two'|'rest'|'trap';
export type Help={id:HelpId;title:string;detail:string;timing:'قبل السؤال'|'بعد السؤال'};
export type Cell={categoryId:string;points:200|400|600;side:'A'|'B';id:string};

export const GAMES: Game[] = [
  {id:'seen-jeem',title:'سين جيم',description:'أسئلة بمستويات 200 و400 و600 نقطة.',image:'/art/seen-jeem.webp',status:'available'},
  {id:'letters',title:'لعب الحروف',description:'لعبة جماعية تعتمد على الحروف.',image:'/art/letters.webp',status:'coming'},
  {id:'codenames',title:'كود نيمز',description:'فريقك يفهم تلميحاتك ويفوز.',image:'/art/codenames.webp',status:'coming'},
  {id:'thirty',title:'تحدي الثلاثين',description:'تحديات سريعة للأصحاب.',image:'/art/thirty.webp',status:'coming'},
];

export const HELPS: Help[] = [
  {id:'friend',title:'اتصال بصديق',detail:'اسأل شخصًا يساعدك في إجابة السؤال.',timing:'بعد السؤال'},
  {id:'pit',title:'الحفرة',detail:'جاوب صح لتكسب النقاط ويُخصم مثلها من خصمك.',timing:'قبل السؤال'},
  {id:'two',title:'جاوب جوابين',detail:'تقدر تجاوب بجوابين بدل جواب واحد.',timing:'بعد السؤال'},
  {id:'rest',title:'استريح',detail:'أثناء دور الخصم، اختار لاعبًا من فريقه ما يشارك في إجابة السؤال.',timing:'قبل السؤال'},
  {id:'trap',title:'الفخ',detail:'حوّل السؤال للخصم وإذا أخطأ تُخصم منه نقاط السؤال.',timing:'بعد السؤال'},
];

export const pointValues=[200,400,600] as const;
export function makeCells(categoryId:string):Cell[]{
 return (['A','B'] as const).flatMap(side=>pointValues.map(points=>({
  categoryId,side,points,id:`${categoryId}:${side}:${points}`
 })));
}
