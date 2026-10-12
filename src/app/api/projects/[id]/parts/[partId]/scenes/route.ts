import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenes, episodes, sceneVersions, images } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

const CreateSceneSchema = z.object({
  title: z.string().min(1, "ต้องระบุชื่อฉาก"),
  episodeId: z.string().optional(),
  location: z.string().optional().default(""),
  charactersPresent: z.array(z.string()).optional().default([]),
  contentMarkdown: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  directorNote: z.string().optional().default(""),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { partId } = await params;
    const sceneList = db
      .select()
      .from(scenes)
      .where(eq(scenes.partId, partId))
      .orderBy(asc(scenes.order))
      .all();

    const enriched = sceneList.map((s) => {
      const sceneImages = db.select().from(images).where(eq(images.sceneId, s.id)).all();
      return {
        ...s,
        charactersPresentParsed: s.charactersPresent ? JSON.parse(s.charactersPresent) : [],
        images: sceneImages,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    console.error("Failed to fetch scenes:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลฉาก";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { partId } = await params;
    const body = await req.json();
    const validated = CreateSceneSchema.parse(body);

    const sceneId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Determine target episode for this scene
    let targetEpisodeId = validated.episodeId;
    if (!targetEpisodeId) {
      const firstEp = db
        .select({ id: episodes.id })
        .from(episodes)
        .where(eq(episodes.partId, partId))
        .orderBy(asc(episodes.number))
        .limit(1)
        .get();
      targetEpisodeId = firstEp?.id;
    }

    // Find highest order in this part
    const lastScene = db
      .select({ order: scenes.order })
      .from(scenes)
      .where(eq(scenes.partId, partId))
      .orderBy(desc(scenes.order))
      .limit(1)
      .get();

    const nextOrder = (lastScene?.order ?? 0) + 1;
    const wordCount = validated.contentMarkdown.split(/\s+/).filter(Boolean).length;

    db.insert(scenes)
      .values({
        id: sceneId,
        partId,
        episodeId: targetEpisodeId,
        order: nextOrder,
        title: validated.title,
        location: validated.location,
        charactersPresent: JSON.stringify(validated.charactersPresent),
        contentMarkdown: validated.contentMarkdown,
        summary: validated.summary,
        wordCount,
        version: 1,
        directorNote: validated.directorNote,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Create initial version 1 record
    db.insert(sceneVersions)
      .values({
        id: crypto.randomUUID(),
        sceneId,
        versionNumber: 1,
        title: validated.title,
        contentMarkdown: validated.contentMarkdown,
        summary: validated.summary,
        directorNote: validated.directorNote,
        createdAt: now,
      })
      .run();

    const created = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();

    return NextResponse.json({
      success: true,
      scene: created,
    });
  } catch (error: unknown) {
    console.error("Failed to create scene:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างฉากใหม่";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
