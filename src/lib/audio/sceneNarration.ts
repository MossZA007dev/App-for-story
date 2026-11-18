import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {audioDir,type Segment} from "./elevenlabs";
import {speakerOf,type VoiceCasting} from "./narrationCasting";
import type {DialogueBlock} from "@/lib/story/dialogueParser";
export type AttachedNarration={version:1;kind:"scene"|"preview";casting:VoiceCasting;sourceHash:string;attachedAt:string;segments:Segment[];sample?:string;previewSpeaker?:string};
export function sourceHash(blocks:DialogueBlock[]) {return crypto.createHash("sha256").update(JSON.stringify(blocks.map(block=>({text:block.text,type:block.type,speaker:speakerOf(block)})))).digest("hex");}
function manifestPath(projectId:string,sceneId:string) {const id=crypto.createHash("sha256").update(projectId+":"+sceneId).digest("hex");return path.join(audioDir(),".private","scenes",id+".json");}
export async function readAttachedNarration(projectId:string,sceneId:string):Promise<AttachedNarration|null> {
  try {const data=JSON.parse(await fs.readFile(manifestPath(projectId,sceneId),"utf8"));if(data.version!==1 || !Array.isArray(data.segments))return null;return data;}catch{return null;}
}
export async function attachNarration(projectId:string,sceneId:string,data:AttachedNarration) {
  const file=manifestPath(projectId,sceneId);await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+"."+crypto.randomUUID();await fs.writeFile(temp,JSON.stringify(data),{mode:0o600});await fs.rename(temp,file);
}
export async function attachedFilesReady(data:AttachedNarration) {return (await Promise.all(data.segments.map(segment=>fs.stat(path.join(audioDir(),`narration-${segment.id}.mp3`)).then(s=>s.size>0).catch(()=>false)))).every(Boolean);}
