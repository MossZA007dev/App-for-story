import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() || "png";
      const filename = `avatar-${crypto.randomUUID()}.${ext}`;

      const saved = await storage.saveImage(buffer, filename);
      return NextResponse.json({ success: true, url: saved.url, filePath: saved.filePath });
    } else {
      const body = await req.json();
      const imageUrl = body.imageUrl;

      if (!imageUrl) {
        return NextResponse.json({ error: "ต้องระบุ URL รูปภาพ" }, { status: 400 });
      }

      // Download from URL and save locally
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("ไม่สามารถดาวน์โหลดรูปภาพจาก URL ได้");

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = `avatar-${crypto.randomUUID()}.jpg`;

      const saved = await storage.saveImage(buffer, filename);
      return NextResponse.json({ success: true, url: saved.url, filePath: saved.filePath });
    }
  } catch (error: unknown) {
    console.error("Avatar upload failed:", error);
    const msg = error instanceof Error ? error.message : "อัปโหลดรูปโปรไฟล์ล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
