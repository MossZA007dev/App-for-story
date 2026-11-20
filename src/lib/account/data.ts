import {db} from '@/lib/db';
import {accountProfiles,bookmarks,projects,scenes,readingProgress} from '@/lib/db/schema';
import {cloudScope} from '@/lib/cloud/context';
import {desc,eq,sql} from 'drizzle-orm';
export async function getAccountData(){
 const {user}=cloudScope();
 const profile=(await db.select().from(accountProfiles).where(eq(accountProfiles.userId,user.id)))[0];
 const saved=await db.select({id:bookmarks.id,projectId:bookmarks.projectId,projectTitle:projects.title,sceneId:bookmarks.sceneId,sceneTitle:scenes.title,blockIndex:bookmarks.blockIndex,note:bookmarks.note,createdAt:bookmarks.createdAt}).from(bookmarks).innerJoin(projects,eq(projects.id,bookmarks.projectId)).leftJoin(scenes,eq(scenes.id,bookmarks.sceneId)).where(eq(bookmarks.userId,user.id)).orderBy(desc(bookmarks.createdAt));
 const recent=await db.select({projectId:readingProgress.projectId,projectTitle:projects.title,sceneId:readingProgress.sceneId,sceneTitle:scenes.title,blockIndex:readingProgress.blockIndex,updatedAt:readingProgress.updatedAt}).from(readingProgress).innerJoin(projects,eq(projects.id,readingProgress.projectId)).innerJoin(scenes,eq(scenes.id,readingProgress.sceneId)).where(eq(readingProgress.userId,user.id)).orderBy(desc(readingProgress.updatedAt)).limit(8);
 const [stats]=await db.select({count:sql<number>`count(*)::int`}).from(projects);
 return {email:user.email||'',profile:{displayName:profile?.displayName||'',bio:profile?.bio||'',avatarUrl:profile?.avatarPath?`/api/account/avatar?v=${encodeURIComponent(profile.updatedAt)}`:'',updatedAt:profile?.updatedAt||''},bookmarks:saved,recent,projectCount:stats.count};
}
export type AccountData=Awaited<ReturnType<typeof getAccountData>>;
