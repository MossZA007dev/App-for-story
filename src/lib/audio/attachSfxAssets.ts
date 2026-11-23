import {and,eq,sql} from 'drizzle-orm';
import {db} from '@/lib/db';
import {mediaAssets,soundEffects} from '@/lib/db/schema';
import {cloudScope} from '@/lib/cloud/context';
import {readSfxCue,sourceForCue} from './sfxCues';
/** Attach only caller-owned private files, or files already shared with this story. */
export async function attachSfxAssets(projectId:string,serialized:string){
 const bindings=JSON.parse(serialized) as Record<string,string>;
 const cues=Object.entries(bindings).filter(([key])=>/^sfx_\d+$/.test(key)).map(([,value])=>readSfxCue(value)).filter(c=>c&&c.mode!=='stop');
 if(!cues.length)return;
 return db.transaction(async tx=>{
 const tracks=await tx.select().from(soundEffects).where(eq(soundEffects.projectId,projectId));
 const files=new Set<string>();for(const cue of cues){if(!cue)continue;const source=sourceForCue(cue,tracks);if(!source)throw new Error('ไม่พบไฟล์ SFX ที่เล่นได้ในเรื่องนี้');if(source.startsWith('/api/audio/'))files.add(decodeURIComponent(source.slice(11)));}
 for(const file of files){const asset=(await tx.select().from(mediaAssets).where(and(eq(mediaAssets.id,file),eq(mediaAssets.kind,'audio'))).limit(1))[0];if(!asset)throw new Error('ไม่พบไฟล์ SFX หรือไม่มีสิทธิ์ใช้ไฟล์');if(asset.projectId===projectId)continue;
  const grant=await tx.execute(sql`SELECT asset_id FROM media_asset_projects WHERE asset_id=${file} AND project_id=${projectId}`);if(grant.rows.length)continue;
  if(asset.ownerId!==cloudScope().user.id)throw new Error('ไม่สามารถนำไฟล์ส่วนตัวของผู้อื่นมาแชร์ต่อได้');
  await tx.execute(sql`INSERT INTO media_asset_projects(asset_id,project_id) VALUES(${file},${projectId}) ON CONFLICT DO NOTHING`);
 }
 });
}
