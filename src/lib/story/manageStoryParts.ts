import {db} from '@/lib/db';
import {projects,parts,episodes,scenes,abilities,characters} from '@/lib/db/schema';
import {and,eq,asc,inArray,sql} from 'drizzle-orm';
import {partStructureSnapshot} from './partStructureSnapshot';
export class PartOrderError extends Error{constructor(message:string,public status=400){super(message);}}
export async function getManagedParts(projectId:string){
 const list=await db.select().from(parts).where(eq(parts.projectId,projectId)).orderBy(asc(parts.number),asc(parts.id));if(!list.length)return [];
 const ids=list.map(p=>p.id);
 const allEpisodes=await db.select({id:episodes.id,partId:episodes.partId,updatedAt:episodes.updatedAt}).from(episodes).where(inArray(episodes.partId,ids));
 const allScenes=await db.select({id:scenes.id,partId:scenes.partId,version:scenes.version,updatedAt:scenes.updatedAt}).from(scenes).where(inArray(scenes.partId,ids));
 return list.map(p=>{const es=allEpisodes.filter(e=>e.partId===p.id).map(({id,updatedAt})=>({id,updatedAt})),ss=allScenes.filter(s=>s.partId===p.id).map(({id,version,updatedAt})=>({id,version,updatedAt}));return {id:p.id,title:p.title,number:p.number,episodeCount:es.length,sceneCount:ss.length,snapshot:partStructureSnapshot({id:p.id,title:p.title,number:p.number,updatedAt:p.updatedAt},es,ss)};});
}
export async function reorderStoryParts(projectId:string,partIds:string[],expectedOrder:string[]){return db.transaction(async tx=>{
 const project=await tx.execute(sql`select id from public.projects where id=${projectId} for update`);if(!project.rows.length)throw new PartOrderError('ไม่พบเรื่องหรือไม่มีสิทธิ์แก้ไข',404);
 const current=await tx.select().from(parts).where(eq(parts.projectId,projectId)).orderBy(asc(parts.number),asc(parts.id)).for('update');
 const ids=current.map(p=>p.id);
 if(new Set(partIds).size!==partIds.length||partIds.length!==ids.length||partIds.some(id=>!ids.includes(id)))throw new PartOrderError('ต้องส่งรายการภาคทั้งหมดของเรื่องนี้ โดยไม่ซ้ำหรือปนเรื่องอื่น');
 if(JSON.stringify(ids)!==JSON.stringify(expectedOrder))throw new PartOrderError('มีผู้ร่วมเขียนเปลี่ยนรายการหรือลำดับภาค กรุณาโหลดรายการล่าสุดแล้วลองใหม่',409);
 if(new Set(current.map(p=>p.number)).size!==current.length)throw new PartOrderError('พบเลขภาคซ้ำ จึงยังปรับข้อมูลอ้างอิงไม่ได้ กรุณาตรวจโครงสร้างภาคก่อน',409);
 const positions=new Map(partIds.map((id,i)=>[id,i+1])),numberMap=new Map(current.map(p=>[p.number,positions.get(p.id)!]));
 // Abilities store part numbers, so carry their markers with the original part IDs.
 const characterIds=(await tx.select({id:characters.id}).from(characters).where(eq(characters.projectId,projectId))).map(c=>c.id);
 const related=characterIds.length?await tx.select().from(abilities).where(inArray(abilities.characterId,characterIds)).for('update'):[];
 const now=new Date().toISOString();
 for(const [i,id]of partIds.entries())await tx.update(parts).set({number:-(i+1)}).where(and(eq(parts.id,id),eq(parts.projectId,projectId)));
 for(const [i,id]of partIds.entries())await tx.update(parts).set({number:i+1,updatedAt:now}).where(and(eq(parts.id,id),eq(parts.projectId,projectId)));
 for(const a of related){const gained=a.gainedAtPart===null?null:numberMap.get(a.gainedAtPart)??a.gainedAtPart,lost=a.lostAtPart===null?null:numberMap.get(a.lostAtPart)??a.lostAtPart;if(gained!==a.gainedAtPart||lost!==a.lostAtPart)await tx.update(abilities).set({gainedAtPart:gained,lostAtPart:lost}).where(eq(abilities.id,a.id));}
 await tx.update(projects).set({updatedAt:now}).where(eq(projects.id,projectId));
 return {success:true};
});}
