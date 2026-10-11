import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images, projects } from "@/lib/db/schema";
import { storage } from "@/lib/storage";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const {
      imageData,
      originalImageId,
      sceneId,
      saveAsNew = true,
      setAsCover = false,
      caption,
    } = body;

    if (!imageData || typeof imageData !== "string") {
      return NextResponse.json({ error: "ไม่พบข้อมูลรูปภาพที่ครอบตัด (imageData)" }, { status: 400 });
    }

    // Extract base64 and mime type
    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64String = imageData;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64String = matches[2];
    } else {
      base64String = imageData.replace(/^data:image\/\w+;base64,/, "");
    }

    const buffer = Buffer.from(base64String, "base64");
    const ext = mimeType.includes("png") ? "png" : "jpg";
    const filename = `crop_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

    const saved = await storage.saveImage(buffer, filename, mimeType);
    const now = new Date().toISOString();

    let targetImageRecord: any = null;

    if (!saveAsNew && originalImageId) {
      const existing = db.select().from(images).where(eq(images.id, originalImageId)).get();
      if (existing) {
        db.update(images)
          .set({
            filePath: saved.url,
            approved: 1,
            caption: caption || existing.caption || "ภาพครอบตัด (Cropped)",
            kind: setAsCover ? "cover" : existing.kind,
          })
          .where(eq(images.id, originalImageId))
          .run();

        targetImageRecord = db.select().from(images).where(eq(images.id, originalImageId)).get();
      }
    }

    if (!targetImageRecord) {
      const newImageId = crypto.randomUUID();
      const defaultCaption = caption || (setAsCover ? "ภาพหน้าปกนิยาย (Cover)" : "ภาพครอบตัด (Cropped)");
      db.insert(images)
        .values({
          id: newImageId,
          projectId,
          sceneId: sceneId || null,
          characterId: null,
          prompt: defaultCaption,
          negativePrompt: "",
          provider: "cropped",
          seed: null,
          filePath: saved.url,
          kind: setAsCover ? "cover" : "scene",
          approved: 1,
          caption: defaultCaption,
          metadata: JSON.stringify({ croppedFrom: originalImageId || null }),
          createdAt: now,
        })
        .run();

      targetImageRecord = db.select().from(images).where(eq(images.id, newImageId)).get();
    }

    // If set as project cover, update projects table
    if (setAsCover) {
      db.update(projects)
        .set({
          coverImage: saved.url,
          updatedAt: now,
        })
        .where(eq(projects.id, projectId))
        .run();
    }

    return NextResponse.json({
      success: true,
      image: targetImageRecord,
      coverImage: setAsCover ? saved.url : undefined,
      message: setAsCover ? "ครอบตัดและตั้งเป็นภาพหน้าปกเรียบร้อย!" : "ครอบตัดและบันทึกรูปภาพเรียบร้อย!",
    });
  } catch (error: unknown) {
    console.error("Failed to crop image:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการครอบตัดรูปภาพ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
