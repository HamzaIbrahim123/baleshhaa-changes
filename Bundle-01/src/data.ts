/** UI-only sample data transcribed from the approved Baleshha Figma screens.
 * Categories and question availability are illustrative, not a verified question bank.
 */
export type Game = { id: string; title: string; description: string; image: string; status: 'available'|'coming' };
export type Category = { id: string; title: string; icon: string; tint: string; group: 'football'|'other'; available: boolean };
export type HelpId = 'friend'|'pit'|'two'|'rest'|'trap';
export type Help = { id: HelpId; title: string; detail: string; timing: 'قبل السؤال'|'بعد السؤال' };
export type Cell = { categoryId: string; points: 200|400|600; side: 'A'|'B'; id: string };

export const GAMES: Game[] = [
  {id:'seen-jeem',title:'سين جيم',description:'أسئلة بمستويات 200 و400 و600 نقطة.',image:'/art/seen-jeem.webp',status:'available'},
  {id:'letters',title:'لعب الحروف',description:'لعبة جماعية تعتمد على الحروف.',image:'/art/letters.webp',status:'coming'},
  {id:'codenames',title:'كود نيمز',description:'فريقك يفهم تلميحاتك ويفوز.',image:'/art/codenames.webp',status:'coming'},
  {id:'thirty',title:'تحدي الثلاثين',description:'تحديات سريعة للأصحاب.',image:'/art/thirty.webp',status:'coming'},
];

export const CATEGORIES: Category[] = [
  {id:'real',title:'ريال مدريد (مثال)',icon:'R',tint:'periwinkle',group:'football',available:true},
  {id:'clasico',title:'الكلاسيكو (مثال)',icon:'VS',tint:'sand',group:'football',available:false},
  {id:'barcelona',title:'برشلونة (مثال)',icon:'B',tint:'blue',group:'football',available:true},
  {id:'champions',title:'دوري أبطال أوروبا (مثال)',icon:'★',tint:'green',group:'football',available:true},
  {id:'world',title:'كأس العالم (مثال)',icon:'🏆',tint:'periwinkle',group:'football',available:true},
  {id:'laliga',title:'الدوري الإسباني (مثال)',icon:'LA',tint:'green',group:'football',available:true},
  {id:'premier',title:'الدوري الإنجليزي (مثال)',icon:'PL',tint:'blue',group:'football',available:true},
  {id:'other1',title:'تصنيف ١ (مؤقت)',icon:'?',tint:'green',group:'other',available:true},
  {id:'other2',title:'تصنيف ٢ (مؤقت)',icon:'?',tint:'gray',group:'other',available:false},
  {id:'other3',title:'تصنيف ٣ (مؤقت)',icon:'?',tint:'sand',group:'other',available:true},
  {id:'other4',title:'تصنيف ٤ (مؤقت)',icon:'?',tint:'sand',group:'other',available:true},
  {id:'other5',title:'تصنيف ٥ (مؤقت)',icon:'?',tint:'green',group:'other',available:true},
];

export const HELPS: Help[] = [
  {id:'friend',title:'اتصال بصديق',detail:'اسأل شخصًا يساعدك في إجابة السؤال.',timing:'بعد السؤال'},
  {id:'pit',title:'الحفرة',detail:'جاوب صح لتكسب النقاط ويُخصم مثلها من خصمك.',timing:'قبل السؤال'},
  {id:'two',title:'جاوب جوابين',detail:'تقدر تجاوب بجوابين بدل جواب واحد.',timing:'بعد السؤال'},
  {id:'rest',title:'استريح',detail:'اختار لاعبًا من الفريق الثاني ما يشارك بالإجابة.',timing:'قبل السؤال'},
  {id:'trap',title:'الفخ',detail:'حوّل السؤال للخصم وإذا أخطأ تُخصم منه نقاط السؤال.',timing:'قبل السؤال'},
];
export const starterHelps: [HelpId[],HelpId[]] = [['friend','pit','two'],['friend','rest','trap']];
export const initialCategoryIds = ['real','world'];
export const pointValues = [200,400,600] as const;
export function makeCells(categoryId:string):Cell[]{return (['A','B'] as const).flatMap(side=>pointValues.map(points=>({categoryId,side,points,id:`${categoryId}:${side}:${points}`})));}
export function getCategory(id:string){return CATEGORIES.find(c=>c.id===id)!;}
export function sampleQuestion(categoryId:string,points:number){
 if(categoryId==='world'&&points===400) return {text:'ما المنتخب الذي فاز بكأس العالم ٢٠٢٢؟',answer:'منتخب الأرجنتين'};
 return {text:'سؤال تجريبي لعرض شكل الشاشة (سيُضاف السؤال الحقيقي لاحقًا).',answer:'إجابة تجريبية — لم يتم توفير بنك الأسئلة بعد'};
}
