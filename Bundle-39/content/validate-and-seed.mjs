/** Bundle 39 — deterministic editorial content verification + idempotent PostgreSQL seed. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const dir=path.dirname(fileURLToPath(import.meta.url));
const letters=[...'أبتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const old=[...Array.from({length:4},(_,i)=>read(path.join(dir,'../../Bundle-35/content',`pilot-0${i+1}.json`))),
 ...Array.from({length:8},(_,i)=>read(path.join(dir,'../../Bundle-38/content',`expansion-0${i+1}.json`)))].flat();
const latest=Array.from({length:4},(_,i)=>read(path.join(dir,`additions-0${i+1}.json`))).flat();
const norm=s=>s.normalize('NFKC').trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'')
 .replace(/[اإآٱأ]/g,'أ').replace(/\s+/g,' ').toLowerCase();
const ensure=(ok,msg)=>{if(!ok)throw Error(msg);};
ensure(old.length===1680,'Expected prior 1680 questions, got '+old.length);
ensure(latest.length===529,'Expected 529 newly authored questions, got '+latest.length);
const answerSet=new Map(),clueSet=new Map();
const counts=Object.fromEntries(letters.map(l=>[l,0]));
const newCounts=Object.fromEntries(letters.map(l=>[l,0]));
const topics=new Map(),difficulty=new Map();
for(const row of [...old,...latest]){
 ensure(letters.includes(row.letter),'Wrong letter: '+row.letter);
 ensure(typeof row.answer==='string'&&row.answer.length>=2&&row.answer.length<=90,'Wrong answer length: '+row.answer);
 ensure(typeof row.question==='string'&&row.question.length>=(latest.includes(row)?18:5)&&row.question.length<=400,'Wrong question length for '+row.answer);
 ensure(typeof row.category==='string'&&row.category.length>=2&&row.category.length<=64,'Wrong category for '+row.answer);
 ensure(norm(row.answer)[0]===norm(row.letter)[0],'Wrong leading letter: '+row.answer+' for '+row.letter);
 const a=row.letter+'|'+norm(row.answer),q=norm(row.question);
 ensure(!answerSet.has(a),'Duplicate answer: '+a+' vs '+answerSet.get(a));
 ensure(!clueSet.has(q),'Duplicate question: '+row.question);
 answerSet.set(a,row.question);clueSet.set(q,row.answer);
 if(latest.includes(row)){
  ensure([1,2,3].includes(row.difficulty),'Wrong difficulty for '+row.answer);
  ensure(!norm(row.question).includes(norm(row.answer)) || norm(row.answer).length<5,'Literal answer leak for '+row.answer);
  newCounts[row.letter]++;
  topics.set(row.category,(topics.get(row.category)||0)+1);
  difficulty.set(row.difficulty,(difficulty.get(row.difficulty)||0)+1);
 }
 counts[row.letter]++;
}
ensure(letters.length===28&&letters.every(l=>counts[l]>=73&&counts[l]<=80),'Unexpected per-letter range: '+JSON.stringify(counts));
ensure(letters.every(l=>newCounts[l]>=13&&newCounts[l]<=20),'Incomplete new letters '+JSON.stringify(newCounts));
const hash=createHash('sha256').update(JSON.stringify(latest)).digest('hex');
const q=s=>"'"+s.replaceAll("'","''")+"'";
const chunkSize=77;
const chunks=Array.from({length:Math.ceil(latest.length/chunkSize)},(_,i)=>latest.slice(i*chunkSize,(i+1)*chunkSize));
function statement(batch){
 const vals=batch.map(x=>'('+[x.letter,x.question,x.answer,x.category].map(q).join(',')+','+x.difficulty+')').join(',\n');
 return `INSERT INTO public.letter_questions
 (id,leading_letter,question_text,answer_text,category,difficulty,status,source_reference)
 SELECT md5('baleshhaa:39:v1|'||v.letter||'|'||v.question)::uuid,
 v.letter,v.question,v.answer,v.category,v.difficulty,'published','original:bundle39:editorial'
 FROM (VALUES\n${vals}\n) AS v(letter,question,answer,category,difficulty)
 ON CONFLICT DO NOTHING;`;
}
if(process.argv.includes('--sql')){
 console.log('-- Bundle39: 529 curated new Arabic questions; SHA256 '+hash+'\nBEGIN;');
 for(const c of chunks)console.log(statement(c));
 console.log('COMMIT;');
} else console.log(JSON.stringify({status:'STRUCTURAL_PASS',prior:old.length,added:latest.length,total:old.length+latest.length,perLetter:counts,addedPerLetter:newCounts,categories:Object.fromEntries([...topics].sort((a,b)=>b[1]-a[1])),difficulty:Object.fromEntries(difficulty),seedStatements:chunks.length,sha256:hash},null,2));
