import {withAccount} from '@/lib/auth/account';
import {cloudScope} from '@/lib/cloud/context';
import {db} from '@/lib/db';
import {accountProfiles} from '@/lib/db/schema';
import {getAccountData} from '@/lib/account/data';
import {z} from 'zod';
const profileInput=z.object({displayName:z.string().trim().min(1).max(60),bio:z.string().trim().max(300)}).strict();
export async function GET(request:Request){return withAccount(request,async()=>Response.json(await getAccountData()));}
export async function PATCH(request:Request){return withAccount(request,async()=>{
 const input=profileInput.safeParse(await request.json().catch(()=>null));
 if(!input.success)return Response.json({error:'ชื่อ 1–60 ตัวอักษร และแนะนำตัวไม่เกิน 300 ตัวอักษร'},{status:400});
 const updatedAt=new Date().toISOString();
 await db.insert(accountProfiles).values({userId:cloudScope().user.id,...input.data,updatedAt}).onConflictDoUpdate({target:accountProfiles.userId,set:{...input.data,updatedAt}});
 return Response.json({saved:true});
});}
