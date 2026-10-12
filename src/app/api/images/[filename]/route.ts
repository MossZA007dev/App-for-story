import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import path from "path";

import fs from "fs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    let buffer = await storage.getImage(filename);
    let ext = path.extname(filename).toLowerCase();

    if (!buffer) {
      try {
        const fallbackPath = path.join(process.cwd(), "public", "images", "saga-got-cover.jpg");
        if (fs.existsSync(fallbackPath)) {
          buffer = await fs.promises.readFile(fallbackPath);
          ext = ".jpg";
        }
      } catch (err) {
        console.warn("Image fallback error:", err);
      }
    }

    if (!buffer) {
      return new NextResponse("Image not found", { status: 404 });
    }

    let contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg" || ext === ".jfif") contentType = "image/jpeg";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".mov") contentType = "video/quicktime";
    else if (ext === ".mkv") contentType = "video/x-matroska";

    const range = _request.headers.get("range");
    const totalSize = buffer.length;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunkSize = end - start + 1;
      const chunk = buffer.subarray(start, end + 1);

      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": totalSize.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
