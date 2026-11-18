import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import OpenAI from "openai";
import {audioDir} from "@/lib/audio/elevenlabs";
const settingsFile=()=>path.join(audioDir(),".private","openai-story.json");
export const DEFAULT_STORY_MODEL="gpt-5.4-mini";
export async function openAIStorySettings() {
  const saved=await fs.readFile(settingsFile(),"utf8").then(JSON.parse).catch(()=>({}));
  return {apiKey:String(saved.apiKey || process.env.OPENAI_API_KEY || ""),model:String(saved.model || process.env.OPENAI_STORY_MODEL || DEFAULT_STORY_MODEL)};
}
export async function saveOpenAIStorySettings(data:{apiKey?:string;model:string}) {
  const previous=await openAIStorySettings();
  const file=settingsFile();await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});const temp=file+"."+crypto.randomUUID();
  await fs.writeFile(temp,JSON.stringify({apiKey:data.apiKey || previous.apiKey,model:data.model}),{mode:0o600});await fs.rename(temp,file);
}
export class StoryAssistantError extends Error {}
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
    const status=error instanceof OpenAI.APIError ? error.status:undefined;
    throw new StoryAssistantError(status===401 || status===403 ? "ตรวจ OpenAI API Key และสิทธิ์ใช้โมเดลในหน้าตั้งค่า":status===429 ? "OpenAI จำกัดการใช้งานหรือเครดิต API ไม่พอ กรุณาตรวจบัญชี API":"เรียก OpenAI ไม่สำเร็จ เนื้อหาเดิมยังอยู่ กรุณาลองใหม่ภายหลัง");
  }
}
