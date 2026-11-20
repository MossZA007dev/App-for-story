import { deleteStoryEpisode, StoryDeletionError } from "@/lib/story/deleteStoryContent";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { episodes, scenes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const UpdateEpisodeSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  try {
    const { episodeId } = await params;
    const ep = db.select().from(episodes).where(eq(episodes.id, episodeId)).get();
    if (!ep) {
      return NextResponse.json({ error: "ไม่พบข้อมูลตอน (EP) นี้" }, { status: 404 });
    }

    const epScenes = db
      .select()
      .from(scenes)
      .where(eq(scenes.episodeId, episodeId))
      .orderBy(scenes.order)
      .all();

    return NextResponse.json({
      ...ep,
      scenes: epScenes,
    });
  } catch (error: unknown) {
    console.error("Failed to get episode:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลตอน (EP)";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  try {
    const { episodeId } = await params;
    const body = await req.json();
    const validated = UpdateEpisodeSchema.parse(body);

    const existing = db.select().from(episodes).where(eq(episodes.id, episodeId)).get();
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบข้อมูลตอน (EP) นี้" }, { status: 404 });
    }

    const now = new Date().toISOString();
    db.update(episodes)
      .set({
        title: validated.title !== undefined ? validated.title.trim() : existing.title,
        summary: validated.summary !== undefined ? validated.summary.trim() : existing.summary,
        updatedAt: now,
      })
      .where(eq(episodes.id, episodeId))
      .run();

    const updated = db.select().from(episodes).where(eq(episodes.id, episodeId)).get();
    return NextResponse.json({
      success: true,
      episode: updated,
    });
  } catch (error: unknown) {
    console.error("Failed to update episode:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขตอน (EP)";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req:NextRequest,{params}:{params:Promise<{id:string;episodeId:string}>}) {
 try {const {id,episodeId}=await params;return NextResponse.json(deleteStoryEpisode(id,episodeId));}
 catch(e){return NextResponse.json({error:e instanceof StoryDeletionError?e.message:"ลบไม่สำเร็จ กรุณาลองใหม่"},{status:e instanceof StoryDeletionError?e.status:500});}
}
