import {db} from '@/lib/db';
import {sceneNarrations} from '@/lib/db/schema';
import {and,eq,sql} from 'drizzle-orm';
import {cloudScope} from '@/lib/cloud/context';
import {mediaExists} from '@/lib/storage';
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {audioDir,type Segment} from "./elevenlabs";
import {speakerOf,type VoiceCasting} from "./narrationCasting";
import type {DialogueBlock} from "@/lib/story/dialogueParser";
export type AttachedNarration={version:1;kind:"scene"|"preview";casting:VoiceCasting;sourceHash:string;attachedAt:string;segments:Segment[];sample?:string;previewSpeaker?:string};
export function sourceHash(blocks:DialogueBlock[]) {return crypto.createHash("sha256").update(JSON.stringify(blocks.map(block=>({text:block.text,type:block.type,speaker:speakerOf(block)})))).digest("hex");}
export async function readAttachedNarration(projectId:string,sceneId:string):Promise<AttachedNarration|null>{const row=(await db.select().from(sceneNarrations).where(and(eq(sceneNarrations.sceneId,sceneId),eq(sceneNarrations.projectId,projectId))))[0];return row?JSON.parse(row.manifest):null;}
export async function attachNarration(projectId:string,sceneId:string,data:AttachedNarration){for(const segment of data.segments){const filename=`narration-${segment.id}.mp3`;await db.execute(sql`insert into public.media_asset_projects(asset_id,project_id) select id,${projectId} from public.media_assets where id=${filename} and owner_id=${cloudScope().user.id} on conflict do nothing`);}await db.insert(sceneNarrations).values({projectId,sceneId,manifest:JSON.stringify(data),updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:sceneNarrations.sceneId,set:{manifest:JSON.stringify(data),updatedAt:new Date().toISOString()}});}
export async function attachedFilesReady(data:AttachedNarration){return (await Promise.all(data.segments.map(s=>mediaExists(`narration-${s.id}.mp3`)))).every(Boolean);}
