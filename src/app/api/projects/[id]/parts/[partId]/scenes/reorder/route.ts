import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenes } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { z } from "zod";

const ReorderScenesSchema = z.object({
  sceneIds: z.array(z.string()).min(1, "ต้องระบุรายการไอดีฉาก"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  return handleReorder(req, await params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  return handleReorder(req, await params);
}

async function handleReorder(
  req: NextRequest,
  params: { id: string; partId: string }
) {
  try {
    const { partId } = params;
    const body = await req.json();
    const validated = ReorderScenesSchema.parse(body);

    const now = new Date().toISOString();

    // Update each scene's order sequentially (1-based order)
    for (let i = 0; i < validated.sceneIds.length; i++) {
      const sceneId = validated.sceneIds[i];
      const newOrder = i + 1;
      db.update(scenes)
        .set({
          order: newOrder,
          updatedAt: now,
        })
        .where(and(eq(scenes.id, sceneId), eq(scenes.partId, partId)))
        .run();
    }

    // Return the updated scenes list in ascending order
    const updatedScenes = db
      .select()
      .from(scenes)
      .where(eq(scenes.partId, partId))
      .orderBy(asc(scenes.order))
      .all();

    return NextResponse.json({
      success: true,
      message: "สลับลำดับฉากเรียบร้อยแล้ว",
      scenes: updatedScenes,
    });
  } catch (error: unknown) {
    console.error("Failed to reorder scenes:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสลับลำดับฉาก";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
