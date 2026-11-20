import {NextResponse} from 'next/server';
import {redirect} from 'next/navigation';
import {sql,eq} from 'drizzle-orm';
import {authClient} from './server';
import {systemDatabase} from '@/lib/db';
import {withCloudScope} from '@/lib/cloud/context';
import {cloudConfigured} from '@/lib/cloud/config';
import type {CloudScope} from '@/lib/cloud/context';
import {characters,scenes,parts,projects} from '@/lib/db/schema';
async function accountRun<T>(run:()=>Promise<T>,request?:Request):Promise<T>{
 const supabase=await authClient(),{data:{user},error}=await supabase.auth.getUser();
 if(error||!user)throw new Error('AUTH_REQUIRED');
 return systemDatabase().transaction(async tx=>{
  await tx.execute(sql`set local role authenticated`);
  await tx.execute(sql`select set_config('request.jwt.claims',${JSON.stringify({sub:user.id,role:'authenticated'})},true),set_config('request.jwt.claim.sub',${user.id},true)`);
  let projectId:string|undefined;
  if(request){const paths=new URL(request.url).pathname.split('/').filter(Boolean);
   if(paths[1]==='projects'&&paths[2]&&!['import'].includes(paths[2]))projectId=paths[2];
   if(paths[1]==='characters'&&paths[2])projectId=(await tx.select({projectId:characters.projectId}).from(characters).where(eq(characters.id,paths[2])).limit(1))[0]?.projectId;
   if(projectId&&!(await tx.select({id:projects.id}).from(projects).where(eq(projects.id,projectId)).limit(1))[0])throw new Error('NOT_FOUND');
  }
  if(projectId&&request&&!['GET','HEAD','OPTIONS'].includes(request.method)&&!new URL(request.url).pathname.endsWith('/reading-progress')&&!new URL(request.url).pathname.endsWith('/reader-status')){
   const permission=await tx.execute(sql`select public.can_write_project(${projectId}) as allowed`);
   if(!permission.rows[0]?.allowed)throw new Error('WRITE_FORBIDDEN');
  }
  return withCloudScope({db:tx as unknown as CloudScope['db'],user,supabase,projectId},run);
 });
}
export async function withAccount(request:Request,run:()=>Promise<Response>):Promise<Response>{
 if(!cloudConfigured())return NextResponse.json({error:'ระบบส่วนกลางยังไม่ตั้งค่า กรุณาเปิดหน้าตั้งค่าระบบ',code:'CLOUD_NOT_CONFIGURED'},{status:503});
 if(!['GET','HEAD','OPTIONS'].includes(request.method)){
  const origin=request.headers.get('origin');const expected=new URL(process.env.NEXT_PUBLIC_SITE_URL||request.url).origin;
  if(!origin||origin!==expected)return NextResponse.json({error:'คำขอต้องมาจากหน้าเว็บนี้เท่านั้น'},{status:403});
 }
 try{return await accountRun(async()=>{let response=await run();if(response.headers.get('content-type')?.includes('text/event-stream'))response=new Response(await response.arrayBuffer(),{status:response.status,headers:response.headers});response.headers.set('Cache-Control','private, no-store');return response;},request);}
 catch(e){const message=e instanceof Error?e.message:'';if(message==='AUTH_REQUIRED')return NextResponse.json({error:'กรุณาเข้าสู่ระบบ',code:'AUTH_REQUIRED'},{status:401});if(message==='WRITE_FORBIDDEN')return NextResponse.json({error:'บัญชีนี้มีสิทธิ์อ่านอย่างเดียว กรุณาขอสิทธิ์แก้ไขจากเจ้าของเรื่อง'},{status:403});if(message==='NOT_FOUND')return NextResponse.json({error:'ไม่พบเรื่องหรือไม่มีสิทธิ์เข้าถึง'},{status:404});return NextResponse.json({error:'ทำรายการไม่สำเร็จ ข้อมูลเดิมยังอยู่ กรุณาลองใหม่'},{status:500});}
}
export async function withServerAccount<T>(run:()=>Promise<T>){if(!cloudConfigured())redirect('/setup');try{return await accountRun(run);}catch(e){if(e instanceof Error&&e.message==='AUTH_REQUIRED')redirect('/login');throw e;}}
