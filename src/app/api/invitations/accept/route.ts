import {withAccount} from '@/lib/auth/account';
import {db} from '@/lib/db';
import {sql} from 'drizzle-orm';
import {createHash} from 'node:crypto';
export async function POST(request:Request){return withAccount(request,async()=>{const body=await request.json().catch(()=>null);if(typeof body?.token!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(body.token))return Response.json({error:'คำเชิญไม่ถูกต้อง'},{status:400});try{const result=await db.execute(sql`select public.accept_story_invitation(${createHash('sha256').update(body.token).digest('hex')}) as project_id`);return Response.json({projectId:result.rows[0]?.project_id});}catch{return Response.json({error:'คำเชิญหมดอายุ ถูกยกเลิก หรือมีคนใช้ไปแล้ว กรุณาขอลิงก์ใหม่จากเจ้าของเรื่อง'},{status:400});}});}
