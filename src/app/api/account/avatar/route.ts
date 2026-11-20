import {withAccount} from '@/lib/auth/account';
import {cloudScope} from '@/lib/cloud/context';
import {db} from '@/lib/db';
import {accountProfiles} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';
import {randomUUID} from 'node:crypto';
export async function GET(request:Request){return withAccount(request,async()=>{
 const {user,supabase}=cloudScope();const profile=(await db.select().from(accountProfiles).where(eq(accountProfiles.userId,user.id)))[0];
 if(!profile?.avatarPath)return new Response(null,{status:404});
 const {data,error}=await supabase.storage.from('account-avatars').download(profile.avatarPath);
 if(error||!data)return new Response(null,{status:404});
 return new Response(await data.arrayBuffer(),{headers:{'Content-Type':data.type||'image/jpeg','X-Content-Type-Options':'nosniff'}});
});}
function imageType(bytes:Buffer){
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'image/webp';
 return null;
}
export async function POST(request:Request){return withAccount(request,async()=>{
 if(Number(request.headers.get('content-length')||0)>2200000)return Response.json({error:'รูปต้องมีขนาดไม่เกิน 2 MB'},{status:413});
 const form=await request.formData().catch(()=>null),file=form?.get('avatar');
 if(!(file instanceof File)||!file.size||file.size>2097152)return Response.json({error:'เลือกรูป JPG, PNG หรือ WebP ไม่เกิน 2 MB'},{status:400});
 const buffer=Buffer.from(await file.arrayBuffer()),contentType=imageType(buffer);if(!contentType)return Response.json({error:'รองรับเฉพาะรูป JPG, PNG และ WebP'},{status:400});
 const {user,supabase}=cloudScope(),bucket=supabase.storage.from('account-avatars');
 const previous=(await db.select().from(accountProfiles).where(eq(accountProfiles.userId,user.id)))[0];
 const path=`${user.id}/${randomUUID()}.${contentType==='image/jpeg'?'jpg':contentType==='image/png'?'png':'webp'}`;
 const result=await bucket.upload(path,buffer,{contentType,upsert:false});if(result.error)return Response.json({error:'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่'},{status:502});
 const updatedAt=new Date().toISOString();
 try{await db.insert(accountProfiles).values({userId:user.id,avatarPath:path,updatedAt}).onConflictDoUpdate({target:accountProfiles.userId,set:{avatarPath:path,updatedAt}});}catch(error){await bucket.remove([path]);throw error;}
 // Old files stay private; delete only after the new upload and database write succeed.
 if(previous?.avatarPath)await bucket.remove([previous.avatarPath]);
 return Response.json({avatarUrl:`/api/account/avatar?v=${encodeURIComponent(updatedAt)}`});
});}
export async function DELETE(request:Request){return withAccount(request,async()=>{
 const {user,supabase}=cloudScope();const previous=(await db.select().from(accountProfiles).where(eq(accountProfiles.userId,user.id)))[0];
 await db.update(accountProfiles).set({avatarPath:'',updatedAt:new Date().toISOString()}).where(eq(accountProfiles.userId,user.id));
 if(previous?.avatarPath)await supabase.storage.from('account-avatars').remove([previous.avatarPath]);return Response.json({removed:true});
});}
