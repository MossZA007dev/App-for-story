import {and,eq,asc,sql} from 'drizzle-orm';
import {db} from '@/lib/db';
import {parts,episodes,scenes,soundEffects,mediaAssets} from '@/lib/db/schema';
import {cloudScope} from '@/lib/cloud/context';
import {resolveSceneMusic} from './sceneMusic';
export class MusicError extends Error {constructor(message:string,public status=400){super(message);}}
export async function resolveStoredSceneMusic<T extends {partId:string;episodeId?:string|null;bgmUrl?:string|null;bgmTitle?:string|null}>(scene:T){
 const part=(await db.select().from(parts).where(eq(parts.id,scene.partId)).limit(1))[0];
 const episode=scene.episodeId?(await db.select().from(episodes).where(and(eq(episodes.id,scene.episodeId),eq(episodes.partId,scene.partId))).limit(1))[0]:null;
 return resolveSceneMusic(scene,part,episode);
}
export async function getSeasonMusic(projectId:string,partId:string){
 const part=(await db.select().from(parts).where(and(eq(parts.id,partId),eq(parts.projectId,projectId))).limit(1))[0];
 if(!part)throw new MusicError('ไม่พบภาคนี้',404);
 const eps=await db.select().from(episodes).where(and(eq(episodes.partId,partId),eq(episodes.projectId,projectId))).orderBy(asc(episodes.number));
 const counts=await db.select({episodeId:scenes.episodeId,count:sql<number>`count(*)::int`}).from(scenes).where(and(eq(scenes.partId,partId),sql`coalesce(${scenes.bgmUrl},'') <> ''`)).groupBy(scenes.episodeId);
 return {part:{id:part.id,title:part.title,number:part.number,bgmUrl:part.bgmUrl,bgmTitle:part.bgmTitle,updatedAt:part.updatedAt,sceneOverrides:counts.reduce((n,r)=>n+r.count,0)},episodes:eps.map(ep=>({id:ep.id,title:ep.title,number:ep.number,bgmUrl:ep.bgmUrl,bgmTitle:ep.bgmTitle,bgmMode:ep.bgmMode,updatedAt:ep.updatedAt,sceneOverrides:counts.find(r=>r.episodeId===ep.id)?.count||0}))};
}
export type SaveMusic={episodeId?:string;mode:'inherit'|'custom'|'silent';url:string;title:string;expectedUpdatedAt:string;clearSceneOverrides:boolean};
export async function saveSeasonMusic(projectId:string,partId:string,setting:SaveMusic){
 return db.transaction(async tx=>{
  await tx.execute(sql`SELECT id FROM projects WHERE id=${projectId} FOR UPDATE`);
  const part=(await tx.select().from(parts).where(and(eq(parts.id,partId),eq(parts.projectId,projectId))).for('update'))[0];
  if(!part)throw new MusicError('ไม่พบภาคนี้',404);
  const episode=setting.episodeId?(await tx.select().from(episodes).where(and(eq(episodes.id,setting.episodeId),eq(episodes.partId,partId),eq(episodes.projectId,projectId))).for('update'))[0]:null;
  if(setting.episodeId&&!episode)throw new MusicError('ไม่พบ EP ในภาคนี้',404);
  if((episode||part).updatedAt!==setting.expectedUpdatedAt)throw new MusicError('เพลงหรือข้อมูลตอนถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก',409);
  if(!episode&&setting.mode==='silent')throw new MusicError('เลือกไม่มีเพลงหลักเพื่อลบเพลงประจำ SS');
  if(setting.mode==='custom'&&!setting.url)throw new MusicError('กรุณาเลือกเพลงหรือใส่ลิงก์');
  if(setting.mode==='custom'&&setting.url.startsWith('/api/audio/')){
   const filename=decodeURIComponent(setting.url.slice('/api/audio/'.length));
   const asset=(await tx.select().from(mediaAssets).where(and(eq(mediaAssets.id,filename),eq(mediaAssets.kind,'audio'))).limit(1))[0];
   if(!asset)throw new MusicError('ไม่พบไฟล์เพลง หรือไม่มีสิทธิ์ใช้ไฟล์นี้',404);
   if(asset.projectId!==projectId){
    const grant=await tx.execute(sql`SELECT asset_id FROM media_asset_projects WHERE asset_id=${filename} AND project_id=${projectId}`);
    if(!grant.rows.length){
     if(asset.ownerId!==cloudScope().user.id)throw new MusicError('ไฟล์นี้เป็นของเรื่องอื่น กรุณาใช้ไฟล์ของคุณหรือเพลงในเรื่องนี้',403);
     await tx.execute(sql`INSERT INTO media_asset_projects(asset_id,project_id) VALUES(${filename},${projectId}) ON CONFLICT DO NOTHING`);
    }
   }
  }
  const now=new Date().toISOString(),bgmUrl=setting.mode==='custom'?setting.url:'',bgmTitle=setting.mode==='custom'?(setting.title||'เพลงประกอบ'):'';
  if(episode)await tx.update(episodes).set({bgmMode:setting.mode,bgmUrl,bgmTitle,updatedAt:now}).where(eq(episodes.id,episode.id));
  else await tx.update(parts).set({bgmUrl,bgmTitle,updatedAt:now}).where(eq(parts.id,partId));
  if(setting.clearSceneOverrides)await tx.update(scenes).set({bgmUrl:'',bgmTitle:'',updatedAt:now}).where(and(eq(scenes.partId,partId),...(episode?[eq(scenes.episodeId,episode.id)]:[])));
  if(bgmUrl){const existing=(await tx.select({id:soundEffects.id}).from(soundEffects).where(and(eq(soundEffects.projectId,projectId),eq(soundEffects.audioUrl,bgmUrl))).limit(1))[0];if(!existing)await tx.insert(soundEffects).values({id:crypto.randomUUID(),projectId,name:bgmTitle,category:'music',audioUrl:bgmUrl,sourceType:bgmUrl.startsWith('/')?'upload':'url',description:episode?'เพลงประจำ EP':'เพลงหลักประจำ SS',tags:'["BGM","theme"]',createdAt:now,updatedAt:now});}
  return {success:true};
 });
}
