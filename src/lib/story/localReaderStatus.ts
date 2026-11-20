import type { ReaderStatus } from './readerStatus';
import type { readerStatusContext } from './readerStatusContext';
type Context = ReturnType<typeof readerStatusContext>;
// Extract quotations only. No model, external request, profile or future-state inference.
export function localReaderStatus(source: Context): ReaderStatus {
  const passages = source.context.passages;
  const aliases = (name: string) => {
    const c = source.context.characters.find(c => c.name === name);
    return [name, c?.nickname || ''].filter(Boolean);
  };
  const mentions = (text: string, name: string) => aliases(name).some(n => {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Latin short names must not match inside other words (Arm / armor).
    return /^[a-z\s]+$/i.test(n) ? new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i').test(text) : text.toLowerCase().includes(n.toLowerCase());
  });
  const citation = (p: typeof passages[number], around = 0) => ({
    sceneId: p.sceneId, block: p.block,
    quote: p.text.slice(Math.max(0, around - 60), Math.max(0, around - 60) + 220).trim(),
  });
  const characters: ReaderStatus['characters'] = [];
  for (const member of source.context.characters.slice(0, 30)) {
    const relevant = passages.filter(p => mentions(p.speaker, member.name) || mentions(p.text, member.name));
    if (!relevant.length) continue;
    const latest = relevant[relevant.length - 1];
    const abilities: ReaderStatus['characters'][number]['abilities'] = [];
    const relationships: ReaderStatus['characters'][number]['relationships'] = [];
    for (const p of [...relevant].reverse()) {
      // Ambiguous group narration is retained in the character evidence, not attributed as a personal skill.
      const subjects = source.context.characters.filter(c => mentions(p.text, c.name));
      const ownSpeech = mentions(p.speaker, member.name);
      const unambiguousNarration = !p.speaker && subjects.length === 1 && subjects[0].name === member.name;
      if (ownSpeech || unambiguousNarration) {
        const skill = /เวทมนตร์|คาถา|พลัง|แปรสภาพ|ปรุงยา|ดวล|ต่อสู้|รักษา|สมุนไพร|ดาบ|ยิงธนู|วางแผน|เจรจา|ซ่อม[^\s.!?]{0,35}|แฮ็ก|ขับยาน|hack(?:ing)?|sword|combat|healing|transfiguration|potions|occlumency|divination|engineering|[A-Z][a-z]+(?: [A-Z][a-z]+){0,3}(?=\s*!)/i.exec(p.text);
        if (skill && abilities.length < 8 && !abilities.some(a => a.name.toLowerCase() === skill[0].toLowerCase())) {
          const e = citation(p, skill.index);
          if (e.quote.length >= 4) abilities.push({name: skill[0].slice(0,150), state:'mentioned',detail:e.quote,evidence:[e]});
        }
      }
      // Show explicit relationship wording as a quotation, never infer a bond from co-occurrence.
      const relation = /เพื่อน|พี่ชาย|พี่สาว|น้องชาย|น้องสาว|พ่อ|แม่|ครอบครัว|ศัตรู|คู่แข่ง|ไว้ใจ|เชื่อใจ|เกลียด|รัก|ทรยศ|ช่วย|ปกป้อง|friend|enemy|rival|trust|betray|protect/i.exec(p.text);
      if (!relation) continue;
      for (const other of source.context.characters) {
        if (other.name === member.name || !mentions(p.text, other.name)) continue;
        if (!ownSpeech && !(mentions(p.text, member.name) && subjects.length === 2)) continue;
        const e = citation(p, relation.index);
        if (e.quote.length < 4 || relationships.some(r => r.with === other.name) || relationships.length >= 8) continue;
        relationships.push({with:other.name,kind:'unknown',label:'ข้อความเกี่ยวกับความสัมพันธ์',detail:e.quote,evidence:[e]});
      }
    }
    const e = citation(latest);
    if(e.quote.length < 4) continue;
    characters.push({name:member.name,summary:e.quote,evidence:[e],abilities,relationships});
  }
  return {
    overview:'รวบรวมข้อความล่าสุดที่กล่าวถึงตัวละคร พร้อมหัวข้อทักษะและความสัมพันธ์ที่ตรวจพบในบท อ่านหลักฐานประกอบเพื่อดูบริบททั้งหมด',
    comparison:{verdict:'insufficient',leaders:[],reason:'โหมดฟรีรวบรวมหลักฐานจากข้อความ ไม่ตัดสินอันดับความเก่งอัตโนมัติ เพราะการกล่าวถึงพลังหรือชัยชนะเพียงครั้งเดียวไม่พอจะเปรียบเทียบทุกตัวละคร',evidence:[]},
    characters,
  };
}
