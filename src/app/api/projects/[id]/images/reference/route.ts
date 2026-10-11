import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { storage } from "@/lib/storage";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const contentType = req.headers.get("content-type") || "";

    let filename = "";
    let caption = "";
    let sceneId: string | null = null;
    let url = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      caption = (formData.get("caption") as string) || "";
      sceneId = (formData.get("sceneId") as string) || null;

      if (!file) {
        return NextResponse.json({ error: "ไม่พบไฟล์ภาพที่อัปโหลด" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "jpg";
      filename = `still_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

      const saved = await storage.saveImage(buffer, filename, file.type);
      url = saved.url;
    } else {
      const body = await req.json();
      caption = body.caption || "";
      sceneId = body.sceneId || null;
      const imageUrl = body.imageUrl;

      if (!imageUrl) {
        return NextResponse.json({ error: "กรุณาระบุ URL ของภาพ" }, { status: 400 });
      }

      // If it's a web URL, fetch and save locally
      try {
        const fetchRes = await fetch(imageUrl);
        if (!fetchRes.ok) throw new Error("ไม่สามารถดาวน์โหลดภาพจาก URL ได้");
        const arrayBuf = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        filename = `still_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.jpg`;
        const saved = await storage.saveImage(buffer, filename, "image/jpeg");
        url = saved.url;
      } catch (e) {
        // Fallback to storing original URL
        console.warn("Could not download external image, storing URL directly:", e);
        url = imageUrl;
        filename = imageUrl;
      }
    }

    const imageId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(images)
      .values({
        id: imageId,
        projectId,
        sceneId,
        characterId: null,
        prompt: caption || "ภาพประกอบจริงจากหนัง/ซีรีส์ (Movie Still Reference)",
        negativePrompt: "",
        provider: "reference",
        seed: null,
        filePath: url,
        kind: "movie_still",
        approved: 1, // Movie stills added by user are approved by default
        caption,
        metadata: JSON.stringify({ isMovieStill: true }),
        createdAt: now,
      })
      .run();

    const created = db.select().from(images).where(eq(images.id, imageId)).get();

    return NextResponse.json({
      success: true,
      image: created,
    });
  } catch (error: unknown) {
    console.error("Failed to add reference image:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกภาพประกอบ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
