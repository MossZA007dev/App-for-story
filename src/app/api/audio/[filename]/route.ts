import { NextRequest, NextResponse } from "next/server";
import { audioStorage } from "@/lib/storage";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    const buffer = await audioStorage.getAudio(decodedFilename);

    if (!buffer) {
      return new NextResponse("Audio not found", { status: 404 });
    }

    const ext = path.extname(decodedFilename).toLowerCase();
    let contentType = "audio/mpeg";
    if (ext === ".wav") contentType = "audio/wav";
    else if (ext === ".ogg") contentType = "audio/ogg";
    else if (ext === ".m4a") contentType = "audio/mp4";
    else if (ext === ".aac") contentType = "audio/aac";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving audio:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
