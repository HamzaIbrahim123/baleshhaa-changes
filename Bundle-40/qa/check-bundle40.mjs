/**
 * Bundle 40 — HTML/TSX UX regression checks.
 * Run from repo root with Node.js.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');
const app=read('Bundle-40/src/App.tsx');
const style=read('Bundle-40/src/index.css');
const entry=read('Bundle-40/src/letters/LettersEntry.tsx');
const entryStyle=read('Bundle-40/src/letters/LettersEntry.css');

assert.match(app,/function HomeHero\(/,'homepage carousel exists');
assert.match(app,/function LettersHeroArt\(/,'letters slide artwork exists');
assert.match(app,/window\.setTimeout\(/,'carousel advances automatically');
assert.match(app,/6500/,'carousel interval is explicitly configured');
assert.match(app,/setSlide\(0\)/,'first slide accessible manually');
assert.match(app,/setSlide\(1\)/,'letters slide accessible manually');
assert.match(app,/prefers-reduced-motion/,'motion preference respected');
assert.match(app,/aria-pressed=\{slide===0\}/,'hero page selector is accessible');
assert.match(app,/aria-pressed=\{slide===1\}/,'second page selector is accessible');
assert.match(app,/onSeenJeem=\{\(\)=>go\('details'\)\}/,'first slide opens correct game');
assert.match(app,/onLetters=\{\(\)=>go\('letters'\)\}/,'letters slide opens correct game');
assert.match(app,/onClick=\{\(\)=>go\(letters\?'letters':'details'\)\}/,'game cards preserve navigation');
assert.match(app,/enabled\?'استكشف اللعبة':'قريبًا'/,'Explore CTA shared across enabled games');
assert.doesNotMatch(app,/كيف نبدأ\؟/,'homepage how-to button removed');
assert.doesNotMatch(app,/كيف تبدأ\؟/,'global how-to nav removed');
assert.doesNotMatch(app,/className="feature-strip"><div><span>✓<\/span>/,'home-only check cards removed');
assert.match(app,/className="feature-strip">[\s\S]*?فريقان/,'Seen Jeem details badges preserved');
assert.match(app,/setModal\('how'\)\}>كيف تلعب\؟/,'Seen Jeem details instructions preserved');
assert.match(app,/<LettersRoomLobby mode="host"/,'real host route preserved');
assert.match(app,/<LettersRoomLobby mode="viewer"/,'real viewer route preserved');
assert.match(app,/<LiveMatch /,'Seen Jeem live play preserved');

assert.match(entry,/className="letters-entry__preview"/,'new original game board preview exists');
assert.match(entry,/className="letters-entry__preview-board"/,'original 25-cell hex grid renders');
assert.match(entry,/معاينة بصرية • بدون خادم/,'preview is not misrepresented as a real room');
assert.match(entry,/<details className="letters-entry__rules">/,'per-game instructions provided');
assert.match(entry,/onClick=\{onHost\}/,'real host entry button preserved');
assert.match(entry,/onClick=\{onViewer\}/,'real viewer entry button preserved');
assert.doesNotMatch(entry,/onClick=\{onDemo\}|onClick=\{onPresenterDemo\}/,'temporary standalone demo entry removed');
assert.doesNotMatch(entry,/هذه تجربة للغرف، وليست إطلاقًا كاملًا للعبة/,'outdated copy removed');
assert.match(style,/\.home-hero--rotating\{display:block/,'hero nested grid spans full width');
assert.match(style,/@media\(max-width:480px\)/,'small screens handled');
assert.match(entryStyle,/\.letters-entry__preview-hex/,'preview hexagon styling exists');
assert.match(entryStyle,/\.letters-entry__preview-frame/,'orange/green framed board exists');
console.log('PASS: carousel, navigation, buttons, removed home check cards, per-game how-to, game board and real room routes.');
