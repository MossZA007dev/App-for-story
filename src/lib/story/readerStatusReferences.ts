import {ReaderStatusError,type readerStatusContext} from './readerStatusContext';
type Context=ReturnType<typeof readerStatusContext>;
export function readerStatusInput(source:Context){
 return {universe:source.context.universe,characters:source.context.characters,partial:source.coverage.partial,passages:source.context.passages.map((p,i)=>({id:`p${i+1}`,speaker:p.speaker,text:p.text}))};
}
// AI selects source IDs. The application supplies actual quotations and locations,
// avoiding duplicated long quotations and guessed UUIDs in the model response.
export function expandReaderStatusReferences(raw:unknown,source:Context):unknown {
 if(Array.isArray(raw))return raw.map(v=>expandReaderStatusReferences(v,source));
 if(!raw||typeof raw!=='object')return raw;
 return Object.fromEntries(Object.entries(raw).map(([key,value])=>{
  if(key!=='evidence')return [key,expandReaderStatusReferences(value,source)];
  if(!Array.isArray(value))throw new ReaderStatusError('AI ยังส่งหลักฐานไม่ครบ จึงยังไม่แสดงผล');
  return [key,value.map(ref=>{
   if(typeof ref!=='string'||!/^p[1-9]\d*$/.test(ref))throw new ReaderStatusError('AI ระบุแหล่งอ้างอิงไม่ถูกต้อง จึงยังไม่แสดงผล');
   const p=source.context.passages[Number(ref.slice(1))-1];
   if(!p)throw new ReaderStatusError('AI อ้างอิงบทที่ไม่อยู่ในช่วงที่อ่าน จึงยังไม่แสดงผล');
   return {sceneId:p.sceneId,block:p.block,quote:p.text.slice(0,220).trim()};
  })];
 }));
}
