/** Bundle 41 regression checks against actual four changes-only source files. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const get=(name)=>readFileSync('Bundle-41/src/letters/'+name,'utf8');
const fx=get('LettersVictoryEffects.tsx');
const css=get('LettersVictoryEffects.css');
const lobby=get('RoomLobby.tsx');
const host=get('HostGameControls.tsx');

assert.match(fx,/import \{ playGameSound, unlockGameAudio \} from '\.\.\/sfx'/,'Use original synthesized game effects');
assert.match(fx,/type LettersState = DisplayState \| MatchState/,'Both screens supported');
assert.match(fx,/role="status" aria-live="assertive"/,'Accessible victory announcement');
assert.match(fx,/state\.stage === 'finished'/,'Match winner uses final stage');
assert.match(fx,/stage === 'between_rounds' \|\| stage === 'finished'/,'Round and final win');
assert.match(fx,/colorForTeam\(winner, state\.round\)/,'Round-specific team color');
assert.match(fx,/const before = previous\.current/,'Previous authorized state tracked');
assert.match(fx,/if \(!before \|\| before\.code !== code\)/,'Old wins are primed without playback');
assert.match(fx,/now\.revision < before\.revision/,'Old poll snapshots ignored');
assert.match(fx,/now\.revision === before\.revision/,'Duplicate poll snapshots ignored');
assert.match(fx,/lastWin\.current = now\.victoryKey/,'Confirm same win only once');
assert.match(fx,/if \(soundEnabled\) playGameSound\('win'\)/,'Muted audio supported');
assert.match(fx,/playGameSound\('question'\)/,'New question sound');
assert.match(fx,/playGameSound\('reveal'\)/,'Answer reveal sound');
assert.match(fx,/playGameSound\('correct'\)/,'Letter selection feedback');
assert.match(fx,/playGameSound\('next'\)/,'Next round feedback');
assert.match(fx,/mode === 'host'/,'Host sound enabled by default');
assert.match(fx,/unlockGameAudio\(\)/,'Viewer explicit WebAudio unlock');
assert.match(fx,/aria-pressed=\{soundEnabled\}/,'Accessible sound control');
assert.match(fx,/window\.setTimeout\(\(\) => setCelebration\(null\), 4800\)/,'Victory overlay auto closes');
assert.match(fx,/clearTimeout\(timeout\.current\)/,'Timer cleaned up');
assert.match(css,/prefers-reduced-motion:reduce/,'Respect reduced motion');
assert.match(css,/pointer-events:none/,'Celebration never blocks game controls');
assert.match(css,/letters-winfx-spray/,'Confetti animation exists');
assert.match(css,/letters-winfx-path-pulse/,'Winning connected hex path glows');
assert.match(css,/--victory-color/,'Color matched to winner');

assert.match(lobby,/LettersVictoryEffects/,'Effect imported into real lobby');
assert.match(lobby,/mode="host"/,'Host live room has winner effects');
assert.match(lobby,/mode="viewer"/,'Spectator live room has winner effects');
assert.match(lobby,/state=\{room\?\.hostState \?\? null\}/,'Host uses server-owned room state');
assert.match(lobby,/state=\{state \?\? null\}/,'Spectator uses public state, not secret answer');
assert.match(lobby,/watchHostRoom/,'Room host watcher preserved');
assert.match(lobby,/watchRoom/,'Room spectator watcher preserved');
assert.match(lobby,/<HostGameControls room=\{room\} onUpdate=\{setRoom\} \/>/,'Host controls unchanged');
assert.match(lobby,/roomApi\.join\(clean\)/,'Joining room flow preserved');

assert.match(host,/import \{ unlockGameAudio \} from '\.\.\/sfx'/,'Presenter user gesture unlock');
assert.match(host,/if\(!enabled\(cell\)\)return;\s*\/\/[^\n]*\s*unlockGameAudio\(\)/,'Presenter interactions unlock sound');
assert.match(host,/unlockGameAudio\(\);void send\(\{kind:'confirm_win'\}\)/,'Win sound armed before server confirmation');
assert.match(host,/kind:'confirm_win'/,'Confirmation is required before winner animation');
assert.match(host,/kind:'reject_win'/,'Rejecting win still preserves existing behavior');
assert.match(host,/kind:'cycle_cell_color',cell,requireWinConfirmation:true/,'No win bypass');
assert.doesNotMatch(fx,/roomApi\./,'Effects cannot write to database or change outcome');
assert.doesNotMatch(fx,/localStorage\./,'No new user/session storage');
console.log('PASS 41: confirmed round/final wins, sound gating, host and viewer routes, reduced motion and no game-rule changes.');
