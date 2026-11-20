import {withAccount} from "@/lib/auth/account";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenes, soundEffects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audioStorage } from "@/lib/storage";
import { extractYouTubeVideoId } from "@/lib/audio/audioHelpers";
import path from "path";
import crypto from "crypto";
export async function POST(req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sceneId: string;
    }>;
}) {
return withAccount(req, async () => {
    try {
        const { id: projectId, sceneId } = await params;
        const contentType = req.headers.get("content-type") || "";
        const currentScene = (await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1))[0];
        if (!currentScene) {
            return NextResponse.json({ error: "ไม่พบข้อมูลฉากนี้" }, { status: 404 });
        }
        let bgmUrl = "";
        let bgmTitle = "";
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File | null;
            const customTitle = formData.get("title") as string | null;
            if (!file) {
                return NextResponse.json({ error: "ไม่พบไฟล์เสียงที่อัปโหลด" }, { status: 400 });
            }
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = path.extname(file.name) || ".mp3";
            const cleanOriginalName = path.basename(file.name, ext);
            const uniqueFilename = `scene-bgm-${sceneId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
            const saved = await audioStorage.saveAudio(buffer, uniqueFilename);
            bgmUrl = saved.url;
            bgmTitle = customTitle || cleanOriginalName || "เพลงประกอบประจำฉาก";
        }
        else {
            const body = await req.json();
            bgmUrl = body.bgmUrl || "";
            bgmTitle = body.bgmTitle || "เพลงประกอบประจำฉาก";
        }
        const now = new Date().toISOString();
        await db.update(scenes)
            .set({
            bgmUrl,
            bgmTitle,
            updatedAt: now,
        })
            .where(eq(scenes.id, sceneId));
        // Auto-save to Sound & Music Vault
        if (bgmUrl && bgmUrl.trim()) {
            try {
                const cleanUrl = bgmUrl.trim();
                const existing = (await db
                    .select()
                    .from(soundEffects)
                    .where(and(eq(soundEffects.projectId, projectId), eq(soundEffects.audioUrl, cleanUrl))).limit(1))[0];
                if (!existing) {
                    const isYt = Boolean(extractYouTubeVideoId(cleanUrl));
                    await db.insert(soundEffects)
                        .values({
                        id: crypto.randomUUID(),
                        projectId,
                        name: bgmTitle || (isYt ? "เพลงประกอบฉาก (YouTube)" : "เพลงประกอบประจำฉาก"),
                        category: "music",
                        audioUrl: cleanUrl,
                        sourceType: isYt ? "url" : (cleanUrl.startsWith("http") ? "url" : "upload"),
                        volume: 0.8,
                        tags: JSON.stringify(["เพลง", "BGM", "เพลงประจำฉาก"]),
                        description: `เพลงประกอบจากฉาก: ${currentScene.title || "ฉากนิยาย"}`,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }
            catch (vaultErr) {
                console.warn("Failed to auto-save scene audio to sound vault:", vaultErr);
            }
        }
        const updated = (await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1))[0];
        return NextResponse.json({
            success: true,
            scene: updated,
            bgmUrl,
            bgmTitle,
        });
    }
    catch (error: unknown) {
        console.error("Failed to upload scene audio:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลดเพลง";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
export async function DELETE(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sceneId: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { sceneId } = await params;
        const now = new Date().toISOString();
        await db.update(scenes)
            .set({
            bgmUrl: "",
            bgmTitle: "",
            updatedAt: now,
        })
            .where(eq(scenes.id, sceneId));
        return NextResponse.json({
            success: true,
            message: "ลบเพลงประกอบประจำฉากเรียบร้อยแล้ว",
        });
    }
    catch (error: unknown) {
        console.error("Failed to delete scene audio:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบเพลง";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
