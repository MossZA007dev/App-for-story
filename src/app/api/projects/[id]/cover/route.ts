import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { imagePath, imageId } = body;

    if (!imagePath && !imageId) {
      return NextResponse.json({ error: "ต้องระบุ imagePath หรือ imageId" }, { status: 400 });
    }

    let finalPath = imagePath;
    if (imageId) {
      const img = db.select().from(images).where(eq(images.id, imageId)).get();
      if (img) {
        finalPath = img.filePath;
        db.update(images)
          .set({ approved: 1, kind: "cover" })
          .where(eq(images.id, imageId))
          .run();
      }
    }

    if (!finalPath) {
      return NextResponse.json({ error: "ไม่พบรูปภาพที่ระบุ" }, { status: 404 });
    }

    const now = new Date().toISOString();
    db.update(projects)
      .set({
        coverImage: finalPath,
        updatedAt: now,
      })
      .where(eq(projects.id, projectId))
      .run();

    return NextResponse.json({
      success: true,
      coverImage: finalPath,
      message: "ตั้งภาพนี้เป็นภาพหน้าปกนิยายเรียบร้อยแล้ว",
    });
  } catch (error: unknown) {
    console.error("Failed to set project cover:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตั้งหน้าปก";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
