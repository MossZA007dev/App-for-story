import {partStructureSnapshot} from './partStructureSnapshot';
import { db } from '@/lib/db';
import { parts, episodes, scenes, sceneVersions, images, continuityLedgers, relationships, projects } from '@/lib/db/schema';
import { and, eq, inArray, asc, sql } from 'drizzle-orm';
export class StoryDeletionError extends Error {
    constructor(message: string, public status = 404) { super(message); }
}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function removeScenes(tx: Tx, ids: string[]) {
    if (!ids.length)
        return;
    // Keep uploaded/generated assets in the library; only remove their scene association.
    await tx.update(images).set({ sceneId: null }).where(inArray(images.sceneId, ids));
    await tx.update(continuityLedgers).set({ sceneId: null }).where(inArray(continuityLedgers.sceneId, ids));
    await tx.update(relationships).set({ changedAtScene: null }).where(inArray(relationships.changedAtScene, ids));
    await tx.delete(sceneVersions).where(inArray(sceneVersions.sceneId, ids));
    await tx.delete(scenes).where(inArray(scenes.id, ids));
}
async function resequence(tx: Tx, partId: string) {
    for (const [i, s] of (await tx.select().from(scenes).where(eq(scenes.partId, partId)).orderBy(asc(scenes.order))).entries()) {
        if (s.order !== i + 1)
            await tx.update(scenes).set({ order: i + 1 }).where(eq(scenes.id, s.id));
    }
}
export function deleteStoryScene(projectId: string, sceneId: string) {
    return db.transaction(async (tx) => {
        const s = (await tx.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1))[0];
        if (!s || !(await tx.select().from(parts).where(and(eq(parts.id, s.partId), eq(parts.projectId, projectId))).limit(1))[0])
            throw new StoryDeletionError('ไม่พบฉากในเรื่องนี้');
        await removeScenes(tx, [sceneId]);
        await resequence(tx, s.partId);
        const now = new Date().toISOString();
        await tx.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId));
        return { success: true };
    });
}
export function deleteStoryEpisode(projectId: string, episodeId: string) {
    return db.transaction(async (tx) => {
        const ep = (await tx.select().from(episodes).where(and(eq(episodes.id, episodeId), eq(episodes.projectId, projectId))).limit(1))[0];
        if (!ep || !(await tx.select().from(parts).where(and(eq(parts.id, ep.partId), eq(parts.projectId, projectId))).limit(1))[0])
            throw new StoryDeletionError('ไม่พบตอนในเรื่องนี้');
        const children = await tx.select().from(scenes).where(and(eq(scenes.episodeId, episodeId), eq(scenes.partId, ep.partId)));
        await removeScenes(tx, children.map(s => s.id));
        await tx.delete(episodes).where(eq(episodes.id, episodeId));
        const remaining = await tx.select().from(episodes).where(eq(episodes.partId, ep.partId)).orderBy(asc(episodes.number));
        for (const [i, e] of remaining.entries()) {
            if (e.number !== i + 1)
                await tx.update(episodes).set({ number: i + 1 }).where(eq(episodes.id, e.id));
        }
        await resequence(tx, ep.partId);
        const now = new Date().toISOString();
        await tx.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId));
        const next = remaining[0], nextScene = next ? (await tx.select().from(scenes).where(eq(scenes.episodeId, next.id)).orderBy(asc(scenes.order)).limit(1))[0] : null;
        return { success: true, deletedScenes: children.length, nextEpisodeId: next?.id || '', nextSceneId: nextScene?.id || '' };
    });
}
export function deleteStoryPart(projectId: string, partId: string, expectedSnapshot?:string) {
    return db.transaction(async (tx) => {
        await tx.execute(sql`select id from public.projects where id=${projectId} for update`);
        const part = (await tx.select().from(parts).where(and(eq(parts.id, partId), eq(parts.projectId, projectId))).for('update').limit(1))[0];
        if (!part)
            throw new StoryDeletionError('ไม่พบภาคในเรื่องนี้');
        const children = await tx.select().from(scenes).where(eq(scenes.partId, partId)).for('update');
        const childEpisodes=await tx.select().from(episodes).where(eq(episodes.partId,partId)).for('update');
        if(expectedSnapshot&&expectedSnapshot!==partStructureSnapshot({id:part.id,title:part.title,number:part.number,updatedAt:part.updatedAt},childEpisodes.map(({id,updatedAt})=>({id,updatedAt})),children.map(({id,version,updatedAt})=>({id,version,updatedAt}))))throw new StoryDeletionError('ภาคนี้มีการเปลี่ยนแปลงหลังจากเปิดรายการ กรุณาโหลดใหม่และตรวจเนื้อหาก่อนลบ',409);
        await removeScenes(tx, children.map(s => s.id));
        await tx.delete(episodes).where(eq(episodes.partId, partId));
        await tx.delete(continuityLedgers).where(eq(continuityLedgers.partId, partId));
        await tx.delete(parts).where(eq(parts.id, partId));
        await tx.update(projects).set({ updatedAt: new Date().toISOString() }).where(eq(projects.id, projectId));
        const next = (await tx.select().from(parts).where(eq(parts.projectId, projectId)).orderBy(asc(parts.number)).limit(1))[0];
        const nextScene = next ? (await tx.select().from(scenes).where(eq(scenes.partId, next.id)).orderBy(asc(scenes.order)).limit(1))[0] : null;
        return { success: true, deletedScenes: children.length, nextPartId: next?.id || '', nextSceneId: nextScene?.id || '' };
    });
}
