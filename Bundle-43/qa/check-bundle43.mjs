import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  colorForTeam, teamForColor, startMatch, nextRound, cycleOwner, winningPath, BOARD_SIZE,
} from '../backend/rooms/engine.mjs';

const app=readFileSync('Bundle-43/src/App.tsx','utf8');
const frontend=readFileSync('Bundle-43/src/letters/engine.ts','utf8');
const server=readFileSync('Bundle-43/backend/rooms/engine.mjs','utf8');
const legacyService=readFileSync('Bundle-37/backend/rooms/service.mjs','utf8');

assert.doesNotMatch(app,/page==='details'|go\('details'\)|'details'\|'setup'/,'remove duplicate explore page and obsolete route');
assert.doesNotMatch(app,/steps-progress|step-current|step-complete/,'remove stepper across setup and team entry');
assert.match(app,/onSeenJeem=\{openSetup\}/,'hero directs to current game setup');
assert.match(app,/if\(letters\)go\('letters'\);else openSetup\(\);/,'game card links to new setup');
const setupPos=app.indexOf("page==='setup'");
const bannerPos=app.indexOf('<section className="details-banner">');
const countPos=app.indexOf('كم تصنيف بدكم تختاروا؟');
const sectionsPos=app.indexOf('id="seen-jeem-categories"');
assert.ok(setupPos>0&&bannerPos>setupPos&&countPos>bannerPos&&sectionsPos>countPos,
 'Original Seen Jeem banner now in setup immediately above category selection');
assert.equal((app.match(/className="details-banner"/g)||[]).length,1,'no duplicate banner');
assert.match(app,/onClick=\{\(\)=>document\.getElementById\('seen-jeem-categories'\)\?\.scrollIntoView/,'start game scrolls to categories without launching match');
assert.match(app,/onClick=\{\(\)=>setModal\('how'\)\}>كيف تلعب\؟/,'How to Play behavior remains');
assert.match(app,/onClick=\{\(\)=>go\('home'\)\}>العودة للألعاب/,'back navigation is valid');
assert.match(app,/onExit=\{\(\)=>\{resetMatchDraft\(\);setCatalogRetry\(v=>v\+1\);go\('setup'\)\}\}/,'exit returns to setup');
assert.match(app,/onClick=\{\(\)=>go\('teams'\)\}>التالي: الفرق ووسائل المساعدة/,'team setup navigation kept');
assert.match(app,/<LiveMatch /,'Seen Jeem gameplay kept');
assert.match(app,/<LettersRoomLobby mode="host"/,'Letters host kept');
assert.match(app,/<LettersRoomLobby mode="viewer"/,'Letters spectator kept');

for(const [kind,source] of [['frontend',frontend],['server',server]]){
 assert.doesNotMatch(source,/round\s*%\s*2/,'no '+kind+' team color swap by round');
 assert.match(source,/team === 0 \? 'orange' : 'green'/,'first team is always orange '+kind);
 assert.match(source,/color === 'orange' \? 0 : 1/,'reverse map stable '+kind);
 assert.match(source,/winningPath\(/,'original connection detection retained');
}
assert.match(legacyService,/teamForColor\(selectedColor, state.round\)/,'server still derives turns from engine mapping');
assert.match(legacyService,/requireWinConfirmation===true/,'winning confirmation remains server-owned');
assert.match(legacyService,/command.kind === 'confirm_win'/,'win confirmation still required');
for(const round of [1,2,3,4,5]){
 assert.equal(colorForTeam(0,round),'orange','team1 round '+round);
 assert.equal(colorForTeam(1,round),'green','team2 round '+round);
 assert.equal(teamForColor('orange',round),0,'orange scoring '+round);
 assert.equal(teamForColor('green',round),1,'green scoring '+round);
}
assert.deepEqual(winningPath(Array.from({length:25},(_,i)=>i<5?'orange':null),'orange').length,5);
const rng=()=>0.37;
let match=startMatch('test-room',['A','B'],3,rng);
const orangePath=[0,1,2,3,4],greenPath=[0,5,10,15,20];
function scoreRound(state,color,path){
 const owners=Array(25).fill(null);
 for(const cell of path.slice(0,-1))owners[cell]=color;
 const last=path[path.length-1];
 const temp={...state,owners,stage:'playing',winner:null,winningPath:[]};
 // Simulate the host cycling the last letter (neutral → orange → green) directly.
 let next=cycleOwner(temp,last);
 if(color==='green'){
   assert.equal(next.owners[last],'orange');
   next=cycleOwner(next,last);
 }
 assert.equal(next.owners[last],color);
 return next;
}
match=scoreRound(match,'orange',orangePath);
assert.equal(match.stage,'between_rounds');
assert.equal(match.winner,0);
assert.deepEqual(match.wins,[1,0]);
match=nextRound(match,rng);
assert.equal(match.round,2);
match=scoreRound(match,'green',greenPath);
assert.equal(match.stage,'between_rounds');
assert.equal(match.winner,1,'green winner remains second team in round two');
assert.deepEqual(match.wins,[1,1]);
match=nextRound(match,rng);
assert.equal(match.round,3);
match=scoreRound(match,'orange',orangePath);
assert.equal(match.stage,'finished');
assert.equal(match.winner,0);
assert.deepEqual(match.wins,[2,1]);
console.log('PASS Bundle 43: landing merged; no stepper; static team colors in 1–5 rounds; winner & scores correct across 3 rounds.');
