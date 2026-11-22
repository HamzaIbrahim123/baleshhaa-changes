/**
 * Bundle 38: conservative validation of curated Arabic questions.
 * Must not publish typo/duplicate, wrong initial, answer leak, or vague short clue.
 * This validates structure, NOT every external encyclopedic fact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const dirname=path.dirname(fileURLToPath(import.meta.url));
const letters=[...'أبتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const originals=Array.from({length:4},(_,i)=>JSON.parse(fs.readFileSync(path.join(dirname,'../../Bundle-35/content',`pilot-0${i+1}.json`),'utf8'))).flat();
const added=Array.from({length:4},(_,i)=>JSON.parse(fs.readFileSync(path.join(dirname,`expansion-0${i+1}.json`),'utf8'))).flat();
const normalize=s=>s.normalize('NFKC').trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'')
  .replace(/[إآٱأ]/g,'أ').replace(/\s+/g,' ').toLowerCase();
const assert=(bool,message)=>{if(!bool)throw Error(message);};
const cats=new Map(),counts=Object.fromEntries(letters.map(x=>[x,0]));
const answerSet=new Map(),questionSet=new Map();
for(const item of [...originals,...added]){
 assert(typeof item.letter==='string'&&letters.includes(item.letter),'invalid letter');
 assert(typeof item.question==='string'&&item.question.length>=14&&item.question.length<=290,'bad clue length: '+item.question);
 assert(typeof item.answer==='string'&&item.answer.length>=2&&item.answer.length<=80,'bad answer length: '+item.answer);
 assert(typeof item.category==='string'&&item.category.length>=2&&item.category.length<=60,'bad category '+item.answer);
 assert(normalize(item.letter)[0]===normalize(item.answer)[0],'answer leading letter mismatch: '+item.letter+' '+item.answer);
 const q=normalize(item.question),a=normalize(item.answer),key=item.letter+'|'+a;
 assert(!answerSet.has(key),'duplicate answer '+key+'; first '+answerSet.get(key));
 assert(!questionSet.has(q),'duplicate question '+item.question);
 if(added.includes(item)){
  assert(!q.includes(a) || a.length<=4,'answer appears literally in clue '+item.letter+' '+item.answer);
  assert([1,2,3].includes(item.difficulty),'invalid difficulty');
 }
 answerSet.set(key,item.question);questionSet.set(q,item.answer);
 counts[item.letter]++;cats.set(item.category,(cats.get(item.category)||0)+1);
}
assert(originals.length===280,'pilot not 280');
assert(added.length===700,'expansion not 700');
assert(letters.every(x=>counts[x]===35),'not 35 per Arabic letter: '+JSON.stringify(counts));
const digest=createHash('sha256').update(JSON.stringify(added)).digest('hex');
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const batches=Array.from({length:5},(_,i)=>added.slice(i*140,(i+1)*140));
function sqlFor(batch){
 const vals=batch.map(x=>'('+[x.letter,x.question,x.answer,x.category].map(quote).join(',')+','+x.difficulty+')').join(',\n');
 return `INSERT INTO public.letter_questions
   (id,leading_letter,question_text,answer_text,category,difficulty,status,source_reference)
 SELECT md5('baleshhaa:expanded-38:v1|'||v.letter||'|'||v.question)::uuid,
 v.letter,v.question,v.answer,v.category,v.difficulty,'published',
 'original:expansion-38:editorial'
 FROM (VALUES \n${vals}\n) AS v(letter,question,answer,category,difficulty)
 ON CONFLICT DO NOTHING;`;
}
if(process.argv.includes('--sql')){
 process.stdout.write('-- Curated 700 original Arabic QAs. Dataset SHA256 '+digest+'\nBEGIN;\n');
 for(const batch of batches)process.stdout.write(sqlFor(batch)+'\n');
 process.stdout.write('COMMIT;\n');
}else{
 console.log(JSON.stringify({status:'structure-pass',total:originals.length+added.length,existing:originals.length,
  added:added.length,perLetter:counts,categories:Object.fromEntries([...cats].sort((a,b)=>b[1]-a[1])),checksum:digest},null,2));
}
