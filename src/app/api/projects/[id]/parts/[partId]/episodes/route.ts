import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { episodes, scenes, sceneVersions } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

const CreateEpisodeSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional().default(""),
  initialSceneTitle: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { partId } = await params;
    const epList = db
      .select()
      .from(episodes)
      .where(eq(episodes.partId, partId))
      .orderBy(asc(episodes.number))
      .all();

    const enriched = epList.map((ep) => {
      const epScenes = db
        .select()
        .from(scenes)
        .where(eq(scenes.episodeId, ep.id))
        .orderBy(asc(scenes.order))
        .all();
      return {
        ...ep,
        scenes: epScenes,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    console.error("Failed to fetch episodes:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลตอน (EP)";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { id: projectId, partId } = await params;
    const body = await req.json().catch(() => ({}));
    const validated = CreateEpisodeSchema.parse(body);

    const now = new Date().toISOString();
    const episodeId = crypto.randomUUID();

    // Determine next episode number for this part
    const lastEp = db
      .select({ number: episodes.number })
      .from(episodes)
      .where(eq(episodes.partId, partId))
      .orderBy(desc(episodes.number))
      .limit(1)
      .get();

    const nextNumber = (lastEp?.number ?? 0) + 1;
    const epTitle =
      validated.title && validated.title.trim()
        ? validated.title.trim()
        : `ตอนที่ ${nextNumber} (EP ${nextNumber})`;

    // 1. Insert new Episode
    db.insert(episodes)
      .values({
        id: episodeId,
        projectId,
        partId,
        number: nextNumber,
        title: epTitle,
        summary: validated.summary,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 2. Automatically create initial Scene 1 for this new Episode
    const sceneId = crypto.randomUUID();
    const initialSceneTitle =
      validated.initialSceneTitle && validated.initialSceneTitle.trim()
        ? validated.initialSceneTitle.trim()
        : `ฉากที่ 1: การเปิดม่านของตอนที่ ${nextNumber}`;

    const defaultContent = `[ผู้บรรยาย]: การเริ่มต้นของ ${epTitle}...\n\n`;

    db.insert(scenes)
      .values({
        id: sceneId,
        partId,
        episodeId,
        order: 1,
        title: initialSceneTitle,
        location: "",
        charactersPresent: "[]",
        contentMarkdown: defaultContent,
        summary: "",
        wordCount: defaultContent.split(/\s+/).filter(Boolean).length,
        version: 1,
        directorNote: "",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    db.insert(sceneVersions)
      .values({
        id: crypto.randomUUID(),
        sceneId,
        versionNumber: 1,
        title: initialSceneTitle,
        contentMarkdown: defaultContent,
        summary: "",
        directorNote: "",
        createdAt: now,
      })
      .run();

    const createdEp = db.select().from(episodes).where(eq(episodes.id, episodeId)).get();
    const createdScene = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();

    return NextResponse.json({
      success: true,
      episode: {
        ...createdEp,
        scenes: createdScene ? [createdScene] : [],
      },
      scene: createdScene,
      message: `สร้างตอนที่ ${nextNumber} (EP ${nextNumber}) สำเร็จแล้ว`,
    });
  } catch (error: unknown) {
    console.error("Failed to create episode:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างตอนใหม่ (EP)";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
