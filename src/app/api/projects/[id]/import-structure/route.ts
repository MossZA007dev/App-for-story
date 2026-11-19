import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {projects,parts,episodes,scenes,sceneVersions,characters} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';
import crypto from 'node:crypto';
import {z} from 'zod';
import {StructureSchema} from '@/lib/story/structuredImport';
import {parseClaudeScript} from '@/lib/story/dialogueParser';
const Input=z.object({requestId:z.string().uuid(),structure:StructureSchema});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
 const {id}=await params;const input=Input.parse(await req.json());
 const result=db.transaction(tx=>{
  if(!tx.select().from(projects).where(eq(projects.id,id)).get())throw new Error('ไม่พบโปรเจกต์');
  // Stable IDs make a retry safe, including after a lost response.
  const stable=(suffix:string)=>crypto.createHash('sha256').update(id+input.requestId+suffix).digest('hex');
  const firstId=stable('scene-0-0-0');
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(input.structure)).digest('hex');
  const prior=tx.select().from(scenes).where(eq(scenes.id,firstId)).get();
  if(prior){if(!tx.select().from(sceneVersions).where(eq(sceneVersions.id,stable(`version-0-0-0-${fingerprint}`))).get())throw new Error('คำขอนำเข้าซ้ำมีข้อมูลต่างกัน กรุณาเปิดหน้านำเข้าใหม่');return {firstSceneId:firstId,partId:prior.partId,episodeId:prior.episodeId,reused:true};}
  const existing=tx.select().from(parts).where(eq(parts.projectId,id)).all();
  const used=new Set(existing.map(p=>p.number));let next=Math.max(0,...used)+1;
  const cast=tx.select().from(characters).where(eq(characters.projectId,id)).all();
  const names=new Set(cast.flatMap(c=>[c.name,c.realNickname||''].map(n=>n.toLowerCase())));
  const now=new Date().toISOString();let firstPartId='',firstEpisodeId='';
  input.structure.parts.forEach((p,pi)=>{
   const partId=stable(`part-${pi}`);let number=p.number;if(used.has(number)){while(used.has(next))next++;number=next++;}used.add(number);
   tx.insert(parts).values({id:partId,projectId:id,number,title:p.title,status:'drafting',createdAt:now,updatedAt:now}).run();
   if(!pi)firstPartId=partId;let order=0;
   p.episodes.forEach((ep,ei)=>{
    const episodeId=stable(`ep-${pi}-${ei}`);if(!pi&&!ei)firstEpisodeId=episodeId;
    tx.insert(episodes).values({id:episodeId,projectId:id,partId,number:ei+1,title:ep.title,summary:ep.summary,createdAt:now,updatedAt:now}).run();
    ep.scenes.forEach((s,si)=>{
     const parsed=parseClaudeScript(s.contentMarkdown,cast.map(c=>({id:c.id,name:c.name,realNickname:c.realNickname||undefined,characterType:c.characterType||undefined})));
     for(const name of parsed.detectedCharacters){if(names.has(name.toLowerCase()))continue;names.add(name.toLowerCase());tx.insert(characters).values({id:crypto.randomUUID(),projectId:id,name,realNickname:name,characterType:'canon',createdAt:now,updatedAt:now}).run();}
     const sceneId=stable(`scene-${pi}-${ei}-${si}`);
     tx.insert(scenes).values({id:sceneId,partId,episodeId,order:++order,title:s.title,location:s.location,contentMarkdown:s.contentMarkdown,charactersPresent:JSON.stringify(parsed.detectedCharacters),wordCount:s.contentMarkdown.split(/\s+/).filter(Boolean).length,version:1,directorNote:'',createdAt:now,updatedAt:now}).run();
     tx.insert(sceneVersions).values({id:stable(`version-${pi}-${ei}-${si}-${fingerprint}`),sceneId,versionNumber:1,title:s.title,contentMarkdown:s.contentMarkdown,directorNote:'',createdAt:now}).run();
    });
   });
  });
  return {firstSceneId:firstId,partId:firstPartId,episodeId:firstEpisodeId,reused:false};
 });
 return NextResponse.json(result);
 }catch(e){return NextResponse.json({error:e instanceof z.ZodError?'โครงสร้างนำเข้าไม่ถูกต้อง':e instanceof Error?e.message:'นำเข้าไม่สำเร็จ'},{status:400});}
}
