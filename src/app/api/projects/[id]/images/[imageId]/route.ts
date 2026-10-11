import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { storage } from "@/lib/storage";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const body = await req.json();

    const current = db.select().from(images).where(eq(images.id, imageId)).get();
    if (!current) return NextResponse.json({ error: "ไม่พบรูปภาพ" }, { status: 404 });

    db.update(images)
      .set({
        approved: body.approved !== undefined ? (body.approved ? 1 : 0) : current.approved,
        caption: body.caption !== undefined ? body.caption : current.caption,
      })
      .where(eq(images.id, imageId))
      .run();

    const updated = db.select().from(images).where(eq(images.id, imageId)).get();
    return NextResponse.json({ success: true, image: updated });
  } catch (error: unknown) {
    console.error("Failed to update image:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตรูปภาพ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const current = db.select().from(images).where(eq(images.id, imageId)).get();
    if (!current) return NextResponse.json({ error: "ไม่พบรูปภาพ" }, { status: 404 });

    // If local file, delete file
    if (current.filePath && current.filePath.startsWith("/api/images/")) {
      const filename = decodeURIComponent(current.filePath.replace("/api/images/", ""));
      await storage.deleteImage(filename).catch(() => {});
    }

    db.delete(images).where(eq(images.id, imageId)).run();
    return NextResponse.json({ success: true, message: "ลบรูปภาพสำเร็จ" });
  } catch (error: unknown) {
    console.error("Failed to delete image:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบรูปภาพ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
