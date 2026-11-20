import type { DialogueBlock } from './dialogueParser';
export type ReadingEmphasis = 'none' | 'shout' | 'impact';
/** Local visual cues only: never changes manuscript text or calls a model. */
export function readingEmphasis(block: Pick<DialogueBlock,'type'|'text'>): ReadingEmphasis {
  const text=block.text.trim();
  if(!text)return 'none';
  // Explicit quiet delivery takes precedence over expressive punctuation.
  if(/[（(\[][^)）\]]*(?:กระซิบ|พึมพำ|เสียงเบา|whisper|murmur)[^)）\]]*[)）\]]/i.test(text))return 'none';
  const bangs=(text.match(/[!！]/g)||[]).length;
  const loud = /ตะโกน|ตวาด|กรีดร้อง|คำราม|แผดเสียง|(?:shout|scream|yell|roar)(?:ing|ed|s)?\b/i.test(text.replace(/(?:ไม่ได้|ไม่ต้อง|อย่า|ห้าม|ไม่)\s*(?:ตะโกน|ตวาด|กรีดร้อง|คำราม|แผดเสียง)/g,''));
  const impact = /โครม|ตูม|ครืน|เปรี้ยง|ปัง|บึ้ม|ระเบิด|สนั่น|กระแทก|\b(?:bang|boom|crash|explosion|thunder)\b/i.test(text);
  if(block.type==='sound') {
    if(impact||bangs>=2)return 'impact';
    if(loud||bangs)return 'shout';
    return 'none';
  }
  if(/[!！]{2,}/.test(text))return 'impact';
  if(loud||(block.type==='dialogue'&&bangs>0))return 'shout';
  return 'none';
}

export function readingDelivery(block:Pick<DialogueBlock,'type'|'text'>):'plain'|'whisper'|'pause'{
 if(block.type==='sound')return 'plain';
 if(/[（(\[][^)）\]]*(?:กระซิบ|พึมพำ|เสียงเบา|whisper|murmur)[^)）\]]*[)）\]]/i.test(block.text))return 'whisper';
 if(/(?:\.{3}|…|ลังเล|หยุดคิด|เงียบไปครู่)/.test(block.text))return 'pause';
 return 'plain';
}
