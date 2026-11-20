import {db} from '@/lib/db';
import {scenes,parts} from '@/lib/db/schema';
import {and,eq,sql} from 'drizzle-orm';
export class SceneWriteError extends Error{constructor(message:string,public status:number,public code:string){super(message);}}
export async function lockSceneForWrite(projectId:string,sceneId:string,expectedVersion:number|undefined,requiresVersion=false){
 await db.execute(sql`select s.id from public.scenes s join public.parts p on p.id=s.part_id where s.id=${sceneId} and p.project_id=${projectId} for update of s`);
 const current=(await db.select({scene:scenes}).from(scenes).innerJoin(parts,eq(parts.id,scenes.partId)).where(and(eq(scenes.id,sceneId),eq(parts.projectId,projectId))))[0]?.scene;
 if(!current)throw new SceneWriteError('ไม่พบฉากในเรื่องนี้',404,'SCENE_NOT_FOUND');
 if(requiresVersion&&expectedVersion===undefined)throw new SceneWriteError('กรุณาโหลดฉากก่อนบันทึกเพื่อป้องกันการเขียนทับ',428,'VERSION_REQUIRED');
 if(expectedVersion!==undefined&&expectedVersion!==(current.version||1))throw new SceneWriteError('มีผู้ร่วมเขียนแก้ไขฉากนี้แล้ว ข้อความของคุณยังอยู่ กรุณาคัดลอกไว้ก่อนโหลดฉบับล่าสุด',409,'SCENE_CONFLICT');
 return current;
}
