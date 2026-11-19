import { z } from 'zod';
export const StructureSchema=z.object({parts:z.array(z.object({title:z.string().trim().min(1).max(500),number:z.number().int().min(1).max(9999),episodes:z.array(z.object({title:z.string().trim().min(1).max(500),summary:z.string().max(160000),inferred:z.boolean(),scenes:z.array(z.object({title:z.string().trim().min(1).max(500),location:z.string().max(1000),contentMarkdown:z.string().max(160000)})).min(1).max(200)})).min(1).max(100)})).min(1).max(30)}).superRefine((d,ctx)=>{if(d.parts.flatMap(p=>p.episodes.flatMap(e=>e.scenes)).length>200 || JSON.stringify(d).length>350000)ctx.addIssue({code:'custom',message:'นำเข้าได้ไม่เกิน 200 ฉาก และข้อความ 160,000 ตัวอักษร'});});
export type StoryStructure=z.infer<typeof StructureSchema>;
const clean=(s:string)=>s.replace(/^\s*#{1,6}\s*/, '').replace(/\*\*|__/g,'').trim();
const digits=(s:string)=>Number(s.replace(/[๐-๙]/g,c=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c))));
export function parseStoryStructure(text:string,fallback='ภาคใหม่'):StoryStructure{
 if(!text.trim() || text.length>160000)throw new Error('วางข้อความไม่เกิน 160,000 ตัวอักษร');
 const result:StoryStructure={parts:[]};
 let part:StoryStructure['parts'][number]|undefined,ep:StoryStructure['parts'][number]['episodes'][number]|undefined;
 let scene:NonNullable<typeof ep>['scenes'][number]|undefined;
 const pending:string[]=[];
 const ensurePart=()=>{if(!part){part={title:fallback,number:1,episodes:[]};result.parts.push(part);}return part;};
 const ensureEp=()=>{const p=ensurePart();if(!ep){ep={title:p.title,summary:'',inferred:true,scenes:[]};p.episodes.push(ep);}return ep;};
 const flush=()=>{if(!pending.length)return;const body=pending.join('\n').trim();pending.length=0;if(!body)return;if(scene)scene.contentMarkdown=body;else{const e=ensureEp();e.summary=[e.summary,body].filter(Boolean).join('\n\n');}};
 for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
  const value=clean(line);
  // A delimiter or a whole-line numbered heading is required: years/dates in prose are not sections.
  const heading=value.match(/^(ภาค(?:ที่)?|ปีที่|ซีซั่น|season|part|year|ตอน(?:ที่)?|บท(?:ที่)?|episode|ep\.?|ฉาก(?:ที่)?|scene)\s*([0-9๐-๙]+)(?:\s*[:：.\-–—]\s*(.*)|\s*)$/i);
  if(heading){
   const kind=heading[1].toLowerCase(),num=digits(heading[2]);
   const title=(heading[3]||'').replace(/^[\s:：.\-–—]+/,'').trim();
   flush();
   if(/^(ภาค|ปีที่|ซีซั่น|season|part|year)/i.test(kind)){
    part={title:title||`${kind} ${num}`,number:num,episodes:[]};result.parts.push(part);ep=undefined;scene=undefined;
   }else if(/^(ตอน|บท|episode|ep)/i.test(kind)){
    ep={title:title||`ตอนที่ ${num}`,summary:'',inferred:false,scenes:[]};ensurePart().episodes.push(ep);scene=undefined;
   }else{
    scene={title:title||`ฉากที่ ${num}`,location:'',contentMarkdown:''};ensureEp().scenes.push(scene);
   }
   continue;
  }
  if(scene && !scene.location){const location=value.match(/^(?:สถานที่|location)\s*[:：]\s*(.+)$/i);if(location)scene.location=location[1].trim();}
  pending.push(line);
 }
 flush();
 for(const p of result.parts){
  for(const e of p.episodes){
   if(!e.scenes.length){e.scenes.push({title:e.title,location:'',contentMarkdown:e.summary});e.summary='';}
   if(e.inferred)e.title=p.title===fallback?e.scenes[0].title:p.title;
   for(const s of e.scenes){if(/^ฉากที่ \d+$/.test(s.title)){const first=s.contentMarkdown.split('\n').map(clean).find(l=>l && !/^(สถานที่|location|เสียง)\s*[:：]/i.test(l));if(first)s.title=first.slice(0,80);}}
  }
 }
 // Master fallback: every source scene becomes an episode when EP headings are absent.
 for(const p of result.parts){
  p.episodes=p.episodes.flatMap(e=>e.inferred?e.scenes.map((scene,index)=>({title:scene.title,summary:index===0?e.summary:'',inferred:true,scenes:[scene]})):[e]);
 }
 return StructureSchema.parse(result);
}
