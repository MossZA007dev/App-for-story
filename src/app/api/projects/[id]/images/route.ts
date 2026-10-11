import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images, projects, scenes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const sceneId = searchParams.get("sceneId");
    const kind = searchParams.get("kind");

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

    let query = db
      .select({
        id: images.id,
        projectId: images.projectId,
        sceneId: images.sceneId,
        characterId: images.characterId,
        prompt: images.prompt,
        negativePrompt: images.negativePrompt,
        provider: images.provider,
        seed: images.seed,
        filePath: images.filePath,
        kind: images.kind,
        approved: images.approved,
        caption: images.caption,
        metadata: images.metadata,
        createdAt: images.createdAt,
        sceneTitle: scenes.title,
        sceneOrder: scenes.order,
      })
      .from(images)
      .leftJoin(scenes, eq(images.sceneId, scenes.id))
      .where(eq(images.projectId, projectId))
      .orderBy(desc(images.createdAt));

    const allImages = query.all();

    let filtered = allImages;
    if (sceneId) {
      filtered = filtered.filter((img) => img.sceneId === sceneId);
    }
    if (kind) {
      filtered = filtered.filter((img) => img.kind === kind);
    }

    return NextResponse.json({
      success: true,
      images: filtered,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch images:", error);
    const msg = error instanceof Error ? error.message : "ดึงข้อมูลรูปภาพล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
