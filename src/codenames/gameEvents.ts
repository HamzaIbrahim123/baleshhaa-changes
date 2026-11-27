import type {RoomState} from './client';
export const REVEAL_MS=1650;
export const VICTORY_MS=2350;
export function clueIdentity(s:RoomState){
 const h=s.history.at(-1);
 return s.phase==='guess'&&s.clue&&s.turn&&h?.text!=null?JSON.stringify([s.round,s.history.length,s.turn,h.text,h.count]):null;
}
/** Consume only new public events in a newer authoritative projection.
 * A first snapshot, older response, or round reset is not a historical replay. */
export function gameEvents(previous:RoomState|null,next:RoomState){
 const none={reveal:null as RoomState['lastReveal'],clue:false,turn:false,victory:false,mark:false};
 if(!previous||next.round!==previous.round||next.revision<=previous.revision||next.phase==='closed')return none;
 const reveal=next.lastReveal&&next.lastReveal.round===next.round&&next.lastReveal.revision>previous.revision&&next.board.some(c=>c.id===next.lastReveal!.cardId&&c.revealed&&c.color===next.lastReveal!.color)?next.lastReveal:null;
 const key=clueIdentity(next);
 return {reveal,clue:!!key&&key!==clueIdentity(previous),turn:!!next.turn&&next.turn!==previous.turn&&next.phase!=='result',victory:next.phase==='result'&&previous.phase!=='result'&&!!next.winner,mark:!reveal&&next.phase==='guess'&&previous.phase==='guess'&&next.turn===previous.turn&&(next.marks.length!==previous.marks.length||next.marks.some(id=>!previous.marks.includes(id)))};
}
