import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenes, sceneVersions, images } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

const UpdateSceneSchema = z.object({
  title: z.string().optional(),
  location: z.string().optional(),
  charactersPresent: z.array(z.string()).optional(),
  contentMarkdown: z.string().optional(),
  summary: z.string().optional(),
  directorNote: z.string().optional(),
  bgmUrl: z.string().optional(),
  bgmTitle: z.string().optional(),
  dialogueBindings: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const { sceneId } = await params;
    const scene = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();

    if (!scene) {
      return NextResponse.json({ error: "ไม่พบข้อมูลฉากนี้" }, { status: 404 });
    }

    const versions = db
      .select()
      .from(sceneVersions)
      .where(eq(sceneVersions.sceneId, sceneId))
      .orderBy(desc(sceneVersions.versionNumber))
      .all();

    const sceneImages = db
      .select()
      .from(images)
      .where(eq(images.sceneId, sceneId))
      .orderBy(desc(images.createdAt))
      .all();

    return NextResponse.json({
      scene: {
        ...scene,
        charactersPresentParsed: scene.charactersPresent ? JSON.parse(scene.charactersPresent) : [],
      },
      versions,
      images: sceneImages,
    });
  } catch (error: unknown) {
    console.error("Failed to load scene details:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดฉาก";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const { sceneId } = await params;
    const body = await req.json();
    const validated = UpdateSceneSchema.parse(body);

    const currentScene = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
    if (!currentScene) {
      return NextResponse.json({ error: "ไม่พบข้อมูลฉาก" }, { status: 404 });
    }

    const now = new Date().toISOString();
    let newVersion = currentScene.version;

    // If content changes, archive existing version into scene_versions
    if (
      validated.contentMarkdown !== undefined &&
      validated.contentMarkdown !== currentScene.contentMarkdown
    ) {
      newVersion = (currentScene.version || 1) + 1;

      db.insert(sceneVersions)
        .values({
          id: crypto.randomUUID(),
          sceneId,
          versionNumber: newVersion,
          title: validated.title || currentScene.title,
          contentMarkdown: validated.contentMarkdown,
          summary: validated.summary || currentScene.summary,
          directorNote: validated.directorNote ?? currentScene.directorNote,
          createdAt: now,
        })
        .run();
    }

    const wordCount = validated.contentMarkdown !== undefined
      ? validated.contentMarkdown.split(/\s+/).filter(Boolean).length
      : currentScene.wordCount;

    db.update(scenes)
      .set({
        title: validated.title ?? currentScene.title,
        location: validated.location ?? currentScene.location,
        charactersPresent: validated.charactersPresent
          ? JSON.stringify(validated.charactersPresent)
          : currentScene.charactersPresent,
        contentMarkdown: validated.contentMarkdown ?? currentScene.contentMarkdown,
        summary: validated.summary ?? currentScene.summary,
        directorNote: validated.directorNote ?? currentScene.directorNote,
        bgmUrl: validated.bgmUrl ?? currentScene.bgmUrl,
        bgmTitle: validated.bgmTitle ?? currentScene.bgmTitle,
        dialogueBindings: validated.dialogueBindings ?? currentScene.dialogueBindings,
        wordCount,
        version: newVersion,
        updatedAt: now,
      })
      .where(eq(scenes.id, sceneId))
      .run();

    const updated = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();

    return NextResponse.json({
      success: true,
      scene: updated,
    });
  } catch (error: unknown) {
    console.error("Failed to update scene:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตฉาก";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const { sceneId } = await params;
    db.delete(scenes).where(eq(scenes.id, sceneId)).run();

    return NextResponse.json({
      success: true,
      message: "ลบฉากเรียบร้อยแล้ว",
    });
  } catch (error: unknown) {
    console.error("Failed to delete scene:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบฉาก";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
