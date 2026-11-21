/**
 * Bundle 35 editorial integrity gate + deterministic idempotent SQL generator.
 * Original Arabic pilot questions. No copied TV or YouTube question scripts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const letters=[...'أبتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const rows=Array.from({length:4},(_,i)=>JSON.parse(fs.readFileSync(path.join(root,`pilot-0${i+1}.json`),'utf8'))).flat();
const assert=(c,s)=>{if(!c)throw new Error(s);};
const initial=s=>s.trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/^[\s\p{P}\p{S}]+/gu,'')[0]?.replace(/[إآٱأ]/,'أ');
const counts=Object.fromEntries(letters.map(l=>[l,0]));
const questions=new Set(),answersByLetter=new Set(),cats=new Set();
for(const r of rows){
 assert(letters.includes(r.letter),'Unknown letter '+r.letter);
 assert(typeof r.question==='string' && r.question.length>=12 && r.question.length<=260,'Invalid question length '+r.question);
 assert(typeof r.answer==='string' && r.answer.length>0 && r.answer.length<=75,'Invalid answer '+r.answer);
 assert(initial(r.answer)===initial(r.letter),'Wrong leading letter '+JSON.stringify(r));
 assert(typeof r.category==='string' && r.category.length>=3 && r.category.length<=60,'Invalid category');
 assert([1,2,3].includes(r.difficulty),'Invalid difficulty');
 const key=r.question.trim().replace(/\s+/g,' ').toLowerCase();
 const answerKey=r.letter+'|'+r.answer.replace(/[\u064B-\u065F\u0670\u0640]/g,'').trim().toLowerCase();
 assert(!questions.has(key),'Duplicate question: '+r.question);
 assert(!answersByLetter.has(answerKey),'Duplicate answer within letter: '+r.answer);
 questions.add(key);answersByLetter.add(answerKey);counts[r.letter]++;cats.add(r.category);
}
assert(rows.length===280,'Expected 280 questions, got '+rows.length);
assert(letters.every(l=>counts[l]===10),'Expected ten each: '+JSON.stringify(counts));
assert(cats.size>=9,'Insufficient topic diversity');
const checksum=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
if(process.argv.includes('--sql')){
 const esc=s=>"'"+s.replaceAll("'","''")+"'";
 const batches=Array.from({length:4},(_,i)=>rows.slice(i*70,(i+1)*70));
 console.log('-- Bundle 35 pilot: original, editorially checked, ten questions per Arabic letter.');
 console.log('-- Dataset SHA256: '+checksum);
 console.log('BEGIN;');
 for(const batch of batches){
  const values=batch.map(r=>'('+[r.letter,r.question,r.answer,r.category].map(esc).join(',')+','+r.difficulty+')').join(',\n');
  console.log(`INSERT INTO public.letter_questions
    (id,leading_letter,question_text,answer_text,category,difficulty,status,source_reference)
    SELECT md5('baleshhaa:pilot-35:v1|' || v.letter || '|' || v.question)::uuid,
      v.letter,v.question,v.answer,v.category,v.difficulty,'published','original:pilot-35-v1'
    FROM (VALUES \n${values}\n) AS v(letter,question,answer,category,difficulty)
    ON CONFLICT(id) DO NOTHING;`);
 }
 console.log('COMMIT;');
}else{
 console.log(JSON.stringify({valid:true,total:rows.length,perLetter:counts,categories:[...cats].sort(),sha256:checksum},null,2));
}
