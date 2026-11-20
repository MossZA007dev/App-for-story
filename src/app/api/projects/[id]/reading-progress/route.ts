import {withAccount} from '@/lib/auth/account';
import {cloudScope} from '@/lib/cloud/context';
import {db} from '@/lib/db';
import {readingProgress,scenes,parts} from '@/lib/db/schema';
import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return withAccount(request,async()=>{const {id}=await params;const progress=(await db.select().from(readingProgress).where(and(eq(readingProgress.projectId,id),eq(readingProgress.userId,cloudScope().user.id))))[0];return Response.json(progress||null);});}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return withAccount(request,async()=>{
 const {id}=await params;const result=z.object({sceneId:z.string().min(1).max(128),blockIndex:z.number().int().min(0).max(1000000)}).strict().safeParse(await request.json().catch(()=>null));if(!result.success)return Response.json({error:'ตำแหน่งอ่านไม่ถูกต้อง'},{status:400});
 if(!(await db.select({id:scenes.id}).from(scenes).innerJoin(parts,eq(parts.id,scenes.partId)).where(and(eq(scenes.id,result.data.sceneId),eq(parts.projectId,id))))[0])return Response.json({error:'ไม่พบฉากในเรื่องนี้'},{status:404});
 const values={projectId:id,userId:cloudScope().user.id,...result.data,updatedAt:new Date().toISOString()};await db.insert(readingProgress).values(values).onConflictDoUpdate({target:[readingProgress.projectId,readingProgress.userId],set:{...result.data,updatedAt:values.updatedAt}});return Response.json({saved:true});
});}
