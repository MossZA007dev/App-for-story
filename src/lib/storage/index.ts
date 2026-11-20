import {and,eq} from 'drizzle-orm';
import {db} from '@/lib/db';
import {mediaAssets} from '@/lib/db/schema';
import {cloudScope} from '@/lib/cloud/context';
export interface StorageAdapter{saveImage(buffer:Buffer,filename:string,mimeType?:string):Promise<{filePath:string;url:string}>;getImage(filename:string):Promise<Buffer|null>;deleteImage(filename:string):Promise<boolean>;getImageUrl(filename:string):string;}
const valid=(name:string)=>{if(!name||name!==name.split(/[\\/]/).pop()||name.includes('..')||name.length>240)throw new Error('Invalid media filename');return name;};
function mime(name:string){const ext=name.split('.').pop()?.toLowerCase();return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',ogg:'audio/ogg'} as Record<string,string>)[ext||'']||'application/octet-stream';}
async function find(kind:'images'|'audio',filename:string){return (await db.select().from(mediaAssets).where(and(eq(mediaAssets.id,valid(filename)),eq(mediaAssets.kind,kind))))[0];}
async function save(kind:'images'|'audio',buffer:Buffer,filename:string,contentType=mime(filename)){
 valid(filename);if(!buffer.length||buffer.length>52428800)throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 50 MB');const {user,supabase,projectId}=cloudScope();const storagePath=`${user.id}/${kind}/${filename}`;
 const existing=await find(kind,filename);if(existing){if(existing.ownerId!==user.id)throw new Error('Media filename is in use');return {filePath:`/api/${kind}/${encodeURIComponent(filename)}`,url:`/api/${kind}/${encodeURIComponent(filename)}`};}
 const {error}=await supabase.storage.from('story-media').upload(storagePath,buffer,{contentType,upsert:false});if(error)throw new Error('อัปโหลดสื่อไม่สำเร็จ');
 try{await db.insert(mediaAssets).values({id:filename,ownerId:user.id,projectId:projectId||null,kind,storagePath,contentType,createdAt:new Date().toISOString()});}catch(error){await supabase.storage.from('story-media').remove([storagePath]);throw error;}
 const url=`/api/${kind}/${encodeURIComponent(filename)}`;return {filePath:url,url};
}
async function read(kind:'images'|'audio',filename:string){const asset=await find(kind,filename);if(!asset)return null;const {data,error}=await cloudScope().supabase.storage.from('story-media').download(asset.storagePath);if(error||!data)return null;return Buffer.from(await data.arrayBuffer());}
async function remove(kind:'images'|'audio',filename:string){const asset=await find(kind,filename);if(!asset)return false;const {error}=await cloudScope().supabase.storage.from('story-media').remove([asset.storagePath]);if(error)return false;await db.delete(mediaAssets).where(eq(mediaAssets.id,asset.id));return true;}
export const storage:StorageAdapter={saveImage:(b,n,t)=>save('images',b,n,t),getImage:n=>read('images',n),deleteImage:n=>remove('images',n),getImageUrl:n=>`/api/images/${encodeURIComponent(valid(n))}`};
export const audioStorage={saveAudio:(b:Buffer,n:string)=>save('audio',b,n),getAudio:(n:string)=>read('audio',n),deleteAudio:(n:string)=>remove('audio',n)};
export async function mediaExists(filename:string,kind:'audio'|'images'='audio'){return !!await find(kind,filename);}
export async function mediaDownloadUrl(filename:string,kind:'images'|'audio'){
 const asset=await find(kind,filename);if(!asset)return null;
 const {data,error}=await cloudScope().supabase.storage.from('story-media').createSignedUrl(asset.storagePath,60);
 if(error||!data)return null;return data.signedUrl;
}
