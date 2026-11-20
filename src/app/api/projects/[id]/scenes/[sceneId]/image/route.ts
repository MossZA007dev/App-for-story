import {sql} from 'drizzle-orm';
import {cloudScope} from '@/lib/cloud/context';
import {withAccount} from "@/lib/auth/account";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenes, parts, projects, characters, images } from "@/lib/db/schema";
import { generateOpenAISceneImage, SceneImageError } from "@/lib/ai/openaiSceneImage";
import { StoryAssistantError } from "@/lib/ai/openaiStory";
import { audioDir } from "@/lib/audio/elevenlabs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
export const maxDuration = 300;
const schema = z.object({ content: z.string().max(80000).optional(), title: z.string().max(500).optional(), location: z.string().max(1000).optional(), direction: z.string().trim().max(3000).default(''), aspect: z.enum(['16:9', '1:1', '9:16']).default('16:9'), useReferences: z.boolean().default(true), characterIds: z.array(z.string().max(200)).max(16).optional() });
export async function POST(request: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sceneId: string;
    }>;
}) {
return withAccount(request, async () => {
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success)
        return NextResponse.json({ error: 'ตรวจรายละเอียดภาพและเนื้อหาฉาก (ไม่เกิน 80,000 ตัวอักษร)' }, { status: 400 });
    const { id, sceneId } = await params;
    const row = (await db.select({ scene: scenes, project: projects }).from(scenes).innerJoin(parts, eq(scenes.partId, parts.id)).innerJoin(projects, eq(parts.projectId, projects.id)).where(and(eq(scenes.id, sceneId), eq(projects.id, id))).limit(1))[0];
    if (!row)
        return NextResponse.json({ error: 'ไม่พบฉากในเรื่องนี้' }, { status: 404 });
    const content = input.data.content ?? row.scene.contentMarkdown ?? '';
    if (content.length > 80000)
        return NextResponse.json({ error: "เนื้อหาฉากยาวเกินกำหนด กรุณาแบ่งฉากก่อนสร้างภาพ" }, { status: 400 });
    if (!content.trim())
        return NextResponse.json({ error: 'เพิ่มบทหรือคำบรรยายฉากก่อน ระบบจะนำมาวิเคราะห์ภาพให้อัตโนมัติ' }, { status: 400 });
    const cast = await db.select().from(characters).where(eq(characters.projectId, id));
    if (input.data.characterIds?.some(characterId => !cast.some(c => c.id === characterId)))
        return NextResponse.json({ error: 'ตัวละครที่เลือกไม่ได้อยู่ในเรื่องนี้' }, { status: 400 });
    const status=await db.execute(sql`select pg_try_advisory_xact_lock(hashtext(${cloudScope().user.id+':image:'+sceneId})) as locked`);
    const lock=status.rows[0]?.locked;
    if (!lock)
        return NextResponse.json({ error: 'ฉากนี้กำลังสร้างภาพอยู่ กรุณารอให้เสร็จก่อน' }, { status: 409 });
    try {
        const result = await generateOpenAISceneImage({ title: input.data.title || row.scene.title, location: input.data.location ?? row.scene.location ?? '', content, universe: row.project.universe, worldNotes: (row.project.worldNotes || '').split('## ข้อความต้นฉบับที่นำเข้า')[0].slice(0, 8000), style: row.project.styleGuide || '', characters: cast, ...input.data });
        const imageId = crypto.randomUUID();
        await db.insert(images).values({ id: imageId, projectId: id, sceneId, prompt: result.prompt, provider: 'openai', filePath: result.url, kind: 'scene', approved: 0, metadata: JSON.stringify({ model: result.model, sceneSummary: result.summary, characters: result.characters, referencedCharacters: result.referencedCharacters, aspectRatio: input.data.aspect }), createdAt: new Date().toISOString() });
        return NextResponse.json({ image: (await db.select().from(images).where(eq(images.id, imageId)).limit(1))[0], summary: result.summary, referencedCharacters: result.referencedCharacters, warnings: result.warnings });
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof SceneImageError || error instanceof StoryAssistantError ? error.message : 'สร้างภาพฉากไม่สำเร็จ ภาพและบทเดิมยังอยู่' }, { status: 400 });
    }


});
}
