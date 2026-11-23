import {NextResponse} from 'next/server';
import {z} from 'zod';
import {withAccount} from '@/lib/auth/account';
import {getSeasonMusic,saveSeasonMusic,MusicError} from '@/lib/audio/storyMusic';
import {audioStorage} from '@/lib/storage';
const settings=z.object({episodeId:z.string().min(1).optional(),mode:z.enum(['inherit','custom','silent']),url:z.string().max(4000).trim().default(''),title:z.string().trim().max(200).default(''),expectedUpdatedAt:z.string().min(1),clearSceneOverrides:z.boolean().default(false)}).strict();
type Context={params:Promise<{id:string;partId:string}>};
export async function GET(req:Request,context:Context){return withAccount(req,async()=>{try{const {id,partId}=await context.params;return NextResponse.json(await getSeasonMusic(id,partId));}catch(e){return failure(e);}});}
export async function POST(req:Request,context:Context){return withAccount(req,async()=>{
 let uploaded:string|undefined;
 try{
  const {id,partId}=await context.params;let input:unknown,file:File|null=null;
  if(req.headers.get('content-type')?.includes('multipart/form-data')){const form=await req.formData();input=JSON.parse(String(form.get('settings')||'{}'));const candidate=form.get('file');if(candidate instanceof File)file=candidate;}else input=await req.json();
  const setting=settings.parse(input);
  if(setting.url&&!/^(https?:\/\/|\/api\/audio\/[^/]+$)/i.test(setting.url))throw new MusicError('ใช้ลิงก์ http/https หรือไฟล์จากคลังเสียง');
  // Verify target and optimistic version before accepting an upload.
  const current=await getSeasonMusic(id,partId),target=setting.episodeId?current.episodes.find(ep=>ep.id===setting.episodeId):current.part;
  if(!target)throw new MusicError('ไม่พบ EP ในภาคนี้',404);
  if(target.updatedAt!==setting.expectedUpdatedAt)throw new MusicError('มีข้อมูลใหม่แล้ว กรุณาโหลดใหม่ก่อนบันทึก',409);
  if(file){const ext=file.name.split('.').pop()?.toLowerCase();if(!ext||!['mp3','wav','m4a','ogg','webm'].includes(ext)||file.size>4*1024*1024||!file.size)throw new MusicError('เลือกไฟล์ MP3, WAV, M4A, OGG หรือ WebM ขนาดไม่เกิน 4 MB');uploaded=`theme-${crypto.randomUUID()}.${ext}`;const saved=await audioStorage.saveAudio(Buffer.from(await file.arrayBuffer()),uploaded);setting.url=saved.url;setting.title=setting.title||file.name.replace(/\.[^.]+$/,'').slice(0,200);}
  await saveSeasonMusic(id,partId,setting);return NextResponse.json(await getSeasonMusic(id,partId));
 }catch(e){if(uploaded)await audioStorage.deleteAudio(uploaded).catch(()=>{});return failure(e);}
});}
function failure(e:unknown){return NextResponse.json({error:e instanceof MusicError?e.message:e instanceof z.ZodError?'ข้อมูลเพลงไม่ถูกต้อง':'บันทึกเพลงไม่สำเร็จ กรุณาลองใหม่'},{status:e instanceof MusicError?e.status:e instanceof z.ZodError?400:500});}
