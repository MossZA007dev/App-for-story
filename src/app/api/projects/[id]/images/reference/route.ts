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

    let isVideo = false;
    let startTime = 0;
    let endTime: number | null = null;
    let duration: number | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      caption = (formData.get("caption") as string) || "";
      sceneId = (formData.get("sceneId") as string) || null;

      const startVal = formData.get("startTime");
      const endVal = formData.get("endTime");
      const durVal = formData.get("duration");
      if (startVal) startTime = parseFloat(startVal as string);
      if (endVal) endTime = parseFloat(endVal as string);
      if (durVal) duration = parseFloat(durVal as string);

      if (!file) {
        return NextResponse.json({ error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "jpg";
      const videoExts = ["mp4", "webm", "mov", "mkv", "avi", "m4v"];
      isVideo = file.type.startsWith("video/") || videoExts.includes(ext.toLowerCase());
      filename = `${isVideo ? "video" : "still"}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

      const saved = await storage.saveImage(buffer, filename, file.type);
      url = saved.url;
    } else {
      const body = await req.json();
      caption = body.caption || "";
      sceneId = body.sceneId || null;
      const imageUrl = body.imageUrl;
      if (body.startTime !== undefined) startTime = parseFloat(body.startTime);
      if (body.endTime !== undefined) endTime = parseFloat(body.endTime);
      if (body.duration !== undefined) duration = parseFloat(body.duration);
      if (body.isVideo) isVideo = true;

      if (!imageUrl) {
        return NextResponse.json({ error: "กรุณาระบุ URL ของภาพหรือวิดีโอ" }, { status: 400 });
      }

      // If it's a web URL, check if video
      const urlExt = imageUrl.split("?")[0].split(".").pop() || "";
      if (["mp4", "webm", "mov", "mkv"].includes(urlExt.toLowerCase())) {
        isVideo = true;
      }

      try {
        const fetchRes = await fetch(imageUrl);
        if (!fetchRes.ok) throw new Error("ไม่สามารถดาวน์โหลดไฟล์จาก URL ได้");
        const arrayBuf = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        filename = `${isVideo ? "video" : "still"}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${isVideo ? "mp4" : "jpg"}`;
        const saved = await storage.saveImage(buffer, filename, isVideo ? "video/mp4" : "image/jpeg");
        url = saved.url;
      } catch (e) {
        // Fallback to storing original URL
        console.warn("Could not download external media, storing URL directly:", e);
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
        prompt: caption || (isVideo ? "วิดีโอคลิปประกอบฉาก (Scene Video Reference)" : "ภาพประกอบจริงจากหนัง/ซีรีส์ (Movie Still Reference)"),
        negativePrompt: "",
        provider: isVideo ? "video" : "reference",
        seed: null,
        filePath: url,
        kind: "movie_still",
        approved: 1, // Movie stills/videos added by user are approved by default
        caption,
        metadata: JSON.stringify({
          isMovieStill: true,
          isVideo,
          mediaType: isVideo ? "video" : "image",
          startTime: isNaN(startTime) ? 0 : startTime,
          endTime: endTime !== null && !isNaN(endTime) ? endTime : null,
          duration: duration !== null && !isNaN(duration) ? duration : null,
          loop: true,
          muted: true,
        }),
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
