import {withAccount} from '@/lib/auth/account';
import {cloudScope} from '@/lib/cloud/context';
import {db} from '@/lib/db';
import {bookmarks,projects,parts,scenes} from '@/lib/db/schema';
import {and,eq,isNull,desc} from 'drizzle-orm';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
const input=z.object({projectId:z.string().min(1).max(128),sceneId:z.string().min(1).max(128).nullable().optional(),blockIndex:z.number().int().min(0).max(1000000).default(0),note:z.string().trim().max(500).default('')}).strict();
export async function GET(request:Request){return withAccount(request,async()=>Response.json(await db.select().from(bookmarks).where(eq(bookmarks.userId,cloudScope().user.id)).orderBy(desc(bookmarks.createdAt))));}
export async function PUT(request:Request){return withAccount(request,async()=>{
 const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:'ข้อมูลบุ๊กมาร์กไม่ถูกต้อง'},{status:400});
 const data=parsed.data;
 if(!(await db.select({id:projects.id}).from(projects).where(eq(projects.id,data.projectId)))[0])return Response.json({error:'ไม่พบเรื่องหรือไม่มีสิทธิ์'},{status:404});
 if(data.sceneId&&!(await db.select({id:scenes.id}).from(scenes).innerJoin(parts,eq(parts.id,scenes.partId)).where(and(eq(scenes.id,data.sceneId),eq(parts.projectId,data.projectId))))[0])return Response.json({error:'ฉากไม่อยู่ในเรื่องนี้'},{status:400});
 // Serialized per account avoids duplicate first saves from two devices.
 const userId=cloudScope().user.id;
 const {sql}=await import('drizzle-orm');await db.execute(sql`select pg_advisory_xact_lock(hashtext(${userId+':bookmarks'}))`);
 const where=and(eq(bookmarks.userId,userId),eq(bookmarks.projectId,data.projectId),data.sceneId?eq(bookmarks.sceneId,data.sceneId):isNull(bookmarks.sceneId));
 const existing=(await db.select({id:bookmarks.id}).from(bookmarks).where(where))[0];
 const id=existing?.id||randomUUID();
 if(existing)await db.update(bookmarks).set({blockIndex:data.blockIndex,note:data.note}).where(where);
 else await db.insert(bookmarks).values({id,userId,...data,sceneId:data.sceneId||null,createdAt:new Date().toISOString()});
 return Response.json({id,saved:true});
});}
export async function DELETE(request:Request){return withAccount(request,async()=>{
 const body=await request.json().catch(()=>null);if(typeof body?.id!=='string')return Response.json({error:'ระบุบุ๊กมาร์กที่ต้องการลบ'},{status:400});
 await db.delete(bookmarks).where(and(eq(bookmarks.id,body.id),eq(bookmarks.userId,cloudScope().user.id)));return Response.json({deleted:true});
});}
