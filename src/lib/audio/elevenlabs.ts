import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {castVoice,speakerOf,type VoiceCasting} from "./narrationCasting";
import type { DialogueBlock } from "@/lib/story/dialogueParser";

export const MODEL="eleven_v3";
export const audioDir=()=>process.env.VERCEL ? "/tmp/saga_data/audio":path.join(process.cwd(),"data/audio");
import {readPrivateDocument,writePrivateDocument} from '@/lib/cloud/privateDocuments';
import {audioStorage,mediaExists} from '@/lib/storage';
import {db} from '@/lib/db';
import {sql} from 'drizzle-orm';
import {cloudScope} from '@/lib/cloud/context';
export async function getElevenKey(){return (await readPrivateDocument<{apiKey:string}>('elevenlabs'))?.apiKey||'';}
export async function saveElevenKey(apiKey:string){await writePrivateDocument('elevenlabs',{apiKey});}
export class NarrationError extends Error {}
export async function elevenRequest(key:string,endpoint:string,init:RequestInit={}) {
  let response:Response;
  try {response=await fetch(`https://api.elevenlabs.io${endpoint}`,{...init,headers:{"xi-api-key":key,"Content-Type":"application/json",...init.headers},signal:AbortSignal.timeout(85000),cache:"no-store"});}
  catch {throw new NarrationError("เชื่อมต่อ ElevenLabs ไม่สำเร็จ ลองใหม่ภายหลัง");}
  if(!response.ok) throw new NarrationError(response.status===401 || response.status===403 ? "ตรวจ API Key และสิทธิ์ Text to Speech, Voices และ User ใน ElevenLabs":response.status===429 ? "ElevenLabs จำกัดการใช้งานหรือโควตาไม่พอ กรุณารอสักครู่":"ElevenLabs สร้างเสียงไม่สำเร็จ ไฟล์ที่สำเร็จแล้วจะยังอยู่ ลองใหม่ได้โดยไม่สร้างซ้ำ");
  return response;
}
export async function subscription(key:string) {
  const data=await (await elevenRequest(key,"/v1/user/subscription")).json();
  if(!Number.isFinite(data.character_count) || !Number.isFinite(data.character_limit)) throw new NarrationError("อ่านโควตาไม่สำเร็จ จึงยังไม่สร้างเสียง");
  return {tier:String(data.tier),remaining:Math.max(0,data.character_limit-data.character_count)};
}
export async function stockVoices(key:string) {
  const data=await (await elevenRequest(key,"/v2/voices?page_size=100&include_custom_rates=true")).json();
  // Stock voices avoid library premiums and cloning requirements on a free account.
  return (data.voices || []).filter((v:any)=>v.category==="premade" && (!v.available_for_tiers?.length || v.available_for_tiers.includes("free")))
    .map((v:any)=>({id:String(v.voice_id),name:String(v.name),description:String(v.description || ""),gender:String(v.labels?.gender || "unknown")}));
}
export async function modelRate(key:string) {
  const models=await (await elevenRequest(key,"/v1/models")).json();
  const model=models.find((item:any)=>item.model_id===MODEL && item.can_do_text_to_speech && item.languages?.some((lang:any)=>lang.language_id==="th"));
  const multiplier=model?.model_rates?.character_cost_multiplier;
  if(!model || !Number.isFinite(multiplier) || multiplier<=0) throw new NarrationError("ตรวจโมเดลภาษาไทยหรืออัตราเครดิตไม่สำเร็จ จึงยังไม่สร้างเสียง");
  return multiplier as number;
}
export type Segment={blockIndex:number;text:string;id:string;url:string;cached:boolean;voiceId?:string;speakerKey?:string;speakerName?:string};
function cleanText(text:string) {return text.replace(/!\[[^\]]*\]\([^)]*\)/g,"").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/https?:\/\/\S+/g,"").replace(/[*_`#]/g,"").trim();}
export async function buildSegments(blocks:DialogueBlock[],voiceId:string,preview?:string,casting?:VoiceCasting):Promise<Segment[]> {
  const items=preview!==undefined ? [{text:preview,blockIndex:-1,voiceId,speakerKey:"preview",speakerName:"เสียงทดลอง"}] : blocks.flatMap((block,index)=>block.type==="sound" ? []:[{text:block.text,blockIndex:index,voiceId:casting ? castVoice(speakerOf(block),casting):voiceId,speakerKey:speakerOf(block).key,speakerName:speakerOf(block).name}]);
  const segments:Segment[]=[];
  for(const item of items) {
    const text=cleanText(item.text);
    let chunk="";
    const words=Array.from(new Intl.Segmenter("th",{granularity:"word"}).segment(text),part=>part.segment);
    const pieces:string[]=[];
    for(const word of words) for(const piece of word.match(/[\s\S]{1,1800}/gu) || []) {if(chunk.length+piece.length>1800) {if(chunk.trim()) pieces.push(chunk.trim());chunk="";}chunk+=piece;}
    if(chunk.trim()) pieces.push(chunk.trim());
    for(const text of pieces) {
      const id=crypto.createHash("sha256").update(JSON.stringify({model:MODEL,voiceId:item.voiceId,text})).digest("hex");
      const filename=`narration-${id}.mp3`;
      const cached=await mediaExists(filename);
      segments.push({blockIndex:item.blockIndex,voiceId:item.voiceId,speakerKey:item.speakerKey,speakerName:item.speakerName,text,id,url:`/api/audio/${filename}`,cached});
    }
  }
  return segments;
}
export async function generateSegment(key:string,voiceId:string,segment:Segment,dependencies={subscription,stockVoices,modelRate,elevenRequest}) {
  const filename=`narration-${segment.id}.mp3`;
  if(await mediaExists(filename))return {...segment,cached:true};
  const result=await db.execute(sql`select pg_try_advisory_xact_lock(hashtext(${cloudScope().user.id+':elevenlabs'})) as locked`);
  if(!result.rows[0]?.locked)throw new NarrationError('มีการสร้างเสียงอยู่ กรุณาลองใหม่ภายหลัง');
  {
    const quota=await dependencies.subscription(key);
    if(!["free","starter"].includes(quota.tier)) throw new NarrationError("โหมดนี้รองรับบัญชี Free และ Starter เท่านั้น ยังฟังไฟล์ที่มีแล้วได้");
    const voices=await dependencies.stockVoices(key);
    if(!voices.some((voice:{id:string})=>voice.id===voiceId)) throw new NarrationError("เลือกเสียงสำเร็จรูปที่ใช้กับบัญชีฟรีได้ก่อน");
    const rate=await dependencies.modelRate(key);
    if(Math.ceil(segment.text.length*rate)>quota.remaining) throw new NarrationError("เครดิตในแพ็กเกจไม่พอสำหรับข้อความนี้ กรุณารอโควตารอบใหม่หรือลดข้อความ");
    const response=await dependencies.elevenRequest(key,`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,{method:"POST",body:JSON.stringify({text:segment.text,model_id:MODEL,language_code:"th",voice_settings:{stability:0.5,similarity_boost:0.75}})});
    const buffer=Buffer.from(await response.arrayBuffer());
    if(!buffer.length || !response.headers.get("content-type")?.startsWith("audio/")) throw new NarrationError("ไม่ได้รับไฟล์เสียงที่สมบูรณ์ กรุณาตรวจประวัติ ElevenLabs ก่อนลองใหม่");
    await audioStorage.saveAudio(buffer,filename);
    return {...segment,cached:true};
  }
}
