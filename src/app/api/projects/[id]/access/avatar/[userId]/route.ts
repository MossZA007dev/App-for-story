import {withAccount} from '@/lib/auth/account';
import {cloudScope} from '@/lib/cloud/context';
import {db} from '@/lib/db';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
export async function GET(request:Request,{params}:{params:Promise<{id:string;userId:string}>}){return withAccount(request,async()=>{const {id,userId}=await params;if(!z.string().uuid().safeParse(userId).success)return new Response(null,{status:404});const permission=await db.execute(sql`select public.owns_project(${id}) as owner`);if(!permission.rows[0]?.owner)return new Response(null,{status:403});const result=await db.execute(sql`select public.story_member_avatar(${id},${userId}::uuid) as path`);const path=result.rows[0]?.path;if(typeof path!=='string'||!path.startsWith(userId+'/'))return new Response(null,{status:404});const {data,error}=await cloudScope().supabase.storage.from('account-avatars').download(path);if(error||!data)return new Response(null,{status:404});return new Response(await data.arrayBuffer(),{headers:{'Content-Type':data.type||'image/jpeg','X-Content-Type-Options':'nosniff'}});});}
