import {parseStoryStructure} from './structuredImport';
import {parseClaudeScript,type CharacterMeta} from './dialogueParser';
/** Recover boundaries removed by the old one-scene importer without replacing edits. */
export function planLegacySceneSplit(merged:string,source:string,cast:CharacterMeta[]){
 const draft=parseStoryStructure(source);
 if(draft.parts.length!==1)throw new Error('ต้องระบุข้อความต้นฉบับของภาคเดียว');
 const entries=draft.parts[0].episodes.flatMap(ep=>ep.scenes.map(scene=>({episodeTitle:ep.title,scene})));
 if(entries.length<2)throw new Error('ไม่พบหลายฉากในต้นฉบับ');
 let previous=-1;
 const starts=entries.map(({scene})=>{
  const canonical=parseClaudeScript(scene.contentMarkdown,cast).rawCleanMarkdown;
  const anchor=canonical.split('\n\n').slice(0,2).join('\n\n');
  const index=merged.indexOf(anchor);
  if(!anchor||index<0||index<=previous||merged.indexOf(anchor,index+1)!==-1)throw new Error('จุดแบ่งไม่ชัดเจน จึงยังไม่แก้ไขต้นฉบับ');
  previous=index;return index;
 });
 const result=entries.map((e,i)=>({...e,contentMarkdown:merged.slice(i===0?0:starts[i],starts[i+1]??merged.length)}));
 if(result.map(e=>e.contentMarkdown).join('')!==merged)throw new Error('ข้อความไม่ครบ จึงยกเลิกการแบ่ง');
 return result;
}
