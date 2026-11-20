import {db} from '@/lib/db';
import {parts,episodes,scenes,sceneVersions,images,continuityLedgers,relationships,projects} from '@/lib/db/schema';
import {and,eq,inArray,asc} from 'drizzle-orm';
export class StoryDeletionError extends Error {constructor(message:string,public status=404){super(message);}}
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
function removeScenes(tx:Tx,ids:string[]){
 if(!ids.length)return;
 // Keep uploaded/generated assets in the library; only remove their scene association.
 tx.update(images).set({sceneId:null}).where(inArray(images.sceneId,ids)).run();
 tx.update(continuityLedgers).set({sceneId:null}).where(inArray(continuityLedgers.sceneId,ids)).run();
 tx.update(relationships).set({changedAtScene:null}).where(inArray(relationships.changedAtScene,ids)).run();
 tx.delete(sceneVersions).where(inArray(sceneVersions.sceneId,ids)).run();
 tx.delete(scenes).where(inArray(scenes.id,ids)).run();
}
function resequence(tx:Tx,partId:string){tx.select().from(scenes).where(eq(scenes.partId,partId)).orderBy(asc(scenes.order)).all().forEach((s,i)=>{if(s.order!==i+1)tx.update(scenes).set({order:i+1}).where(eq(scenes.id,s.id)).run();});}
export function deleteStoryScene(projectId:string,sceneId:string){return db.transaction(tx=>{
 const s=tx.select().from(scenes).where(eq(scenes.id,sceneId)).get();
 if(!s||!tx.select().from(parts).where(and(eq(parts.id,s.partId),eq(parts.projectId,projectId))).get())throw new StoryDeletionError('ไม่พบฉากในเรื่องนี้');
 removeScenes(tx,[sceneId]);resequence(tx,s.partId);
 const now=new Date().toISOString();tx.update(projects).set({updatedAt:now}).where(eq(projects.id,projectId)).run();
 return {success:true};
});}
export function deleteStoryEpisode(projectId:string,episodeId:string){return db.transaction(tx=>{
 const ep=tx.select().from(episodes).where(and(eq(episodes.id,episodeId),eq(episodes.projectId,projectId))).get();
 if(!ep||!tx.select().from(parts).where(and(eq(parts.id,ep.partId),eq(parts.projectId,projectId))).get())throw new StoryDeletionError('ไม่พบตอนในเรื่องนี้');
 const children=tx.select().from(scenes).where(and(eq(scenes.episodeId,episodeId),eq(scenes.partId,ep.partId))).all();
 removeScenes(tx,children.map(s=>s.id));tx.delete(episodes).where(eq(episodes.id,episodeId)).run();
 const remaining=tx.select().from(episodes).where(eq(episodes.partId,ep.partId)).orderBy(asc(episodes.number)).all();
 remaining.forEach((e,i)=>{if(e.number!==i+1)tx.update(episodes).set({number:i+1}).where(eq(episodes.id,e.id)).run();});
 resequence(tx,ep.partId);const now=new Date().toISOString();tx.update(projects).set({updatedAt:now}).where(eq(projects.id,projectId)).run();
 const next=remaining[0],nextScene=next?tx.select().from(scenes).where(eq(scenes.episodeId,next.id)).orderBy(asc(scenes.order)).get():null;
 return {success:true,deletedScenes:children.length,nextEpisodeId:next?.id||'',nextSceneId:nextScene?.id||''};
});}
