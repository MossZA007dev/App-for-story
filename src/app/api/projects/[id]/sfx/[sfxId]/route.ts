import {withAccount} from "@/lib/auth/account";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { soundEffects, scenes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audioStorage } from "@/lib/storage";
export async function GET(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sfxId: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { id: projectId, sfxId } = await params;
        const item = (await db
            .select()
            .from(soundEffects)
            .where(and(eq(soundEffects.id, sfxId), eq(soundEffects.projectId, projectId))).limit(1))[0] || (await db.select().from(soundEffects).where(eq(soundEffects.id, sfxId)).limit(1))[0];
        if (!item) {
            return NextResponse.json({ error: "ไม่พบเสียง SFX นี้" }, { status: 404 });
        }
        return NextResponse.json({ success: true, soundEffect: item });
    }
    catch (error: unknown) {
        console.error("Failed to fetch sound effect:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดเสียง SFX";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
export async function PUT(req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sfxId: string;
    }>;
}) {
return withAccount(req, async () => {
    try {
        const { id: projectId, sfxId } = await params;
        const item = (await db
            .select()
            .from(soundEffects)
            .where(and(eq(soundEffects.id, sfxId), eq(soundEffects.projectId, projectId))).limit(1))[0] || (await db.select().from(soundEffects).where(eq(soundEffects.id, sfxId)).limit(1))[0];
        if (!item) {
            return NextResponse.json({ error: "ไม่พบเสียง SFX นี้" }, { status: 404 });
        }
        const body = await req.json();
        const now = new Date().toISOString();
        let updatedTags = item.tags;
        if (Array.isArray(body.tags))
            updatedTags = JSON.stringify(body.tags);
        else if (body.tags !== undefined)
            updatedTags = String(body.tags);
        const newName = body.name !== undefined ? body.name.trim() : item.name;
        await db.update(soundEffects)
            .set({
            name: newName,
            category: body.category !== undefined ? body.category.trim() : item.category,
            volume: typeof body.volume === "number" ? Math.max(0, Math.min(1, body.volume)) : item.volume,
            tags: updatedTags,
            description: body.description !== undefined ? body.description.trim() : item.description,
            updatedAt: now,
        })
            .where(eq(soundEffects.id, sfxId));
        // If this sound effect is tied to scenes as bgmUrl, update scenes.bgmTitle as well
        if (body.name !== undefined && item.audioUrl) {
            try {
                await db.update(scenes)
                    .set({ bgmTitle: newName })
                    .where(eq(scenes.bgmUrl, item.audioUrl));
            }
            catch (sceneErr) {
                console.warn("Could not sync bgmTitle to scenes:", sceneErr);
            }
        }
        const updated = (await db.select().from(soundEffects).where(eq(soundEffects.id, sfxId)).limit(1))[0];
        return NextResponse.json({ success: true, soundEffect: updated });
    }
    catch (error: unknown) {
        console.error("Failed to update sound effect:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตเสียง SFX";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
export const PATCH = PUT;
export async function DELETE(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sfxId: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { id: projectId, sfxId } = await params;
        const item = (await db
            .select()
            .from(soundEffects)
            .where(eq(soundEffects.id, sfxId)).limit(1))[0];
        if (!item) {
            // Idempotent: already deleted or not in database, return success
            return NextResponse.json({
                success: true,
                message: "ลบเสียง SFX เรียบร้อยแล้ว",
                alreadyDeleted: true,
            });
        }
        // If it was an uploaded file served from /api/audio/, remove file from disk
        if (item.sourceType === "upload" && item.audioUrl.startsWith("/api/audio/")) {
            const filename = decodeURIComponent(item.audioUrl.replace(/^\/api\/audio\//, ""));
            if (filename) {
                await audioStorage.deleteAudio(filename).catch((err) => {
                    console.warn("Could not delete audio file from disk:", err);
                });
            }
        }
        await db.delete(soundEffects).where(eq(soundEffects.id, sfxId));
        return NextResponse.json({
            success: true,
            message: "ลบเสียง SFX เรียบร้อยแล้ว",
        });
    }
    catch (error: unknown) {
        console.error("Failed to delete sound effect:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบเสียง SFX";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
