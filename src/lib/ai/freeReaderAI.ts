import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { READER_STATUS_JSON_SCHEMA } from '@/lib/story/readerStatus';
import { audioDir } from '@/lib/audio/elevenlabs';
export const FREE_READER_MODEL = 'baidu/ernie-5.5-flash-preview:free';
export const FREE_READER_MODELS = [FREE_READER_MODEL, 'particle-ai/particle-1:free', 'inclusionai/ling-3.2-flash:free'];
import {readPrivateDocument,writePrivateDocument} from '@/lib/cloud/privateDocuments';
export class FreeReaderAIError extends Error {}
export async function readerAISettings(){const saved=await readPrivateDocument<{apiKey?:string}>('reader-ai');return {apiKey:saved?.apiKey||''};}
export async function saveReaderAIKey(apiKey:string){await writePrivateDocument('reader-ai',{apiKey});}
export async function runFreeReaderAI(instructions:string,input:string,signal?:AbortSignal) {
  const {apiKey}=await readerAISettings();
  if(!apiKey)throw new FreeReaderAIError('เพิ่ม OpenRouter API Key ใน ตั้งค่า → AI ฟรีสำหรับผู้อ่าน ก่อนใช้งาน');
  let response:Response;
  try {
    response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      // Server-owned free-only allowlist. Never accept model IDs or paid fallbacks from the client.
      body:JSON.stringify({models:FREE_READER_MODELS,messages:[{role:'system',content:instructions},{role:'user',content:input}],response_format:{type:'json_schema',json_schema:{name:'reader_character_state',strict:true,schema:READER_STATUS_JSON_SCHEMA}},provider:{require_parameters:true},reasoning:{effort:'low'},max_tokens:32768,stream:false}),
      signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(150000)]) : AbortSignal.timeout(150000),
    });
  } catch {throw new FreeReaderAIError('เชื่อมต่อ AI ฟรีไม่สำเร็จหรือหมดเวลา ลองใหม่ภายหลังได้ ข้อมูลเดิมยังอยู่');}
  if(!response.ok) {
    if(response.status===401)throw new FreeReaderAIError('OpenRouter ไม่ยอมรับ API Key กรุณาตรวจคีย์ในหน้าตั้งค่า');
    if(response.status===429)throw new FreeReaderAIError('โควตาหรือจำนวนคำขอโมเดลฟรีเต็มแล้ว กรุณารอแล้วลองใหม่ ระบบจะไม่สลับไปโมเดลเสียเงิน');
    if(response.status===402||response.status===403)throw new FreeReaderAIError('บัญชี OpenRouter ยังเรียกโมเดลฟรีนี้ไม่ได้ กรุณาตรวจสิทธิ์และข้อจำกัดบัญชี ระบบไม่ได้เรียกโมเดลเสียเงิน');
    if(response.status===400||response.status===413)throw new FreeReaderAIError('โมเดลฟรียังรับเนื้อหาหรือรูปแบบคำขอนี้ไม่ได้ ลองที่จุดอ่านสั้นลง หรือรอโมเดลอื่นพร้อมใช้งาน');
    throw new FreeReaderAIError('โมเดลฟรียังไม่พร้อมใช้งาน ลองใหม่ภายหลัง ระบบจะไม่ใช้โมเดลเสียเงินแทน');
  }
  const data=await response.json().catch(()=>null);
  const choice=data?.choices?.[0];
  if(data?.error||choice?.error)throw new FreeReaderAIError('ผู้ให้บริการ AI ฟรีส่งข้อผิดพลาดกลับมา ลองใหม่ภายหลังได้');
  if(choice?.finish_reason==='length')throw new FreeReaderAIError('คำตอบ AI ยาวเกินขีดจำกัดและถูกตัดก่อนจบ ลองใหม่ได้ ระบบจะไม่นำข้อมูลที่ไม่ครบมาแสดง');
  if(choice?.finish_reason==='content_filter'||choice?.message?.refusal)throw new FreeReaderAIError('โมเดลฟรีที่เลือกปฏิเสธเนื้อหาฉากนี้ จึงยังไม่มีผลวิเคราะห์');
  if(choice?.finish_reason!=='stop'||typeof choice?.message?.content!=='string'||!choice.message.content.trim())throw new FreeReaderAIError('โมเดลฟรีไม่ได้ส่งคำตอบที่สมบูรณ์ ลองใหม่ภายหลังได้');
  return {text:choice.message.content,model:typeof data.model==='string'?data.model:FREE_READER_MODEL};
}
