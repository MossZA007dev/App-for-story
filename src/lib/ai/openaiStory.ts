import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import OpenAI from "openai";
import {audioDir} from "@/lib/audio/elevenlabs";
import {readPrivateDocument,writePrivateDocument} from '@/lib/cloud/privateDocuments';
export const DEFAULT_STORY_MODEL="gpt-5.4-mini";
export async function openAIStorySettings(){const saved=await readPrivateDocument<{apiKey?:string;model?:string}>('openai-story');return {apiKey:saved?.apiKey||'',model:saved?.model||DEFAULT_STORY_MODEL};}
export async function saveOpenAIStorySettings(data:{apiKey?:string;model:string}){const previous=await openAIStorySettings();await writePrivateDocument('openai-story',{apiKey:data.apiKey??previous.apiKey,model:data.model});}
export class StoryAssistantError extends Error {}
export function openAIErrorMessage(error:unknown):string {
  const detail=error as {status?:number;code?:string;type?:string;name?:string};
  if(detail?.status===401 || detail?.code==='invalid_api_key')return 'OpenAI ปฏิเสธ API Key ที่แอปบันทึกไว้ (401 invalid_api_key) กรุณาใส่ API Key ที่ใช้งานได้ใหม่ใน ตั้งค่า → OpenAI แล้วบันทึก';
  if(detail?.code==='credit_balance_exhausted')return 'เครดิต OpenAI API หมดแล้ว กรุณาเพิ่มเครดิตใน OpenAI Platform → Settings → Billing ของบัญชีที่สร้าง API Key แล้วลองใหม่ การเปลี่ยน API Key ไม่เพิ่มเครดิต';
  if(detail?.type==='insufficient_quota' || detail?.code==='insufficient_quota' || detail?.code==='billing_hard_limit_reached')return 'เครดิตหรือวงเงิน API ของ OpenAI ไม่เพียงพอ กรุณาตรวจ Billing ของโปรเจกต์ที่สร้าง key';
  if(detail?.status===403)return 'OpenAI ไม่อนุญาตให้บัญชีหรือโปรเจกต์นี้ใช้โมเดล กรุณาตรวจสิทธิ์ของโปรเจกต์';
  if(detail?.status===404 || detail?.code==='model_not_found')return 'ไม่พบโมเดล OpenAI ที่ตั้งค่าไว้ หรือโปรเจกต์นี้ยังใช้ไม่ได้ กรุณาตรวจชื่อโมเดลในหน้าตั้งค่า';
  if(detail?.status===429)return 'OpenAI จำกัดจำนวนคำขอชั่วคราว กรุณารอสักครู่แล้วลองใหม่';
  if(detail?.name==='APIConnectionError' || detail?.name==='APIConnectionTimeoutError')return 'เชื่อมต่อ OpenAI ไม่สำเร็จหรือหมดเวลา กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่';
  return 'เรียก OpenAI ไม่สำเร็จ เนื้อหาเดิมยังอยู่ กรุณาลองใหม่ภายหลัง';
}

export function responseText(response:{status?:string;output_text?:string;output?:unknown[]}):string {
  if(response.status!=="completed")throw new StoryAssistantError("AI ยังส่งผลลัพธ์ไม่ครบ จึงยังไม่นำมาใช้ ลองลดความยาวหรือปรับคำสั่ง");
  const text=response.output_text?.trim();
  if(!text)throw new StoryAssistantError("AI ไม่ได้ส่งเนื้อหากลับมา อาจปฏิเสธคำขอนี้ กรุณาปรับคำสั่ง");
  return text;
}
export async function runOpenAIStory(instructions:string,input:string,action:"analyze"|"generate",signal?:AbortSignal) {
  const settings=await openAIStorySettings();
  if(!settings.apiKey)throw new StoryAssistantError("เพิ่ม OpenAI API Key ในหน้าตั้งค่าก่อนใช้ผู้ช่วยเขียน");
  const client=new OpenAI({apiKey:settings.apiKey,timeout:150000,maxRetries:0});
  try {
    const response=await client.responses.create({model:settings.model,instructions,input,max_output_tokens:action==="analyze" ? 4000:12000,store:false},{signal});
    return {text:responseText(response),model:settings.model};
  }catch(error){
    if(error instanceof StoryAssistantError)throw error;
    throw new StoryAssistantError(openAIErrorMessage(error));
  }
}
