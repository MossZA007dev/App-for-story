import {withAccount} from "@/lib/auth/account";
import { deleteStoryPart, StoryDeletionError } from "@/lib/story/deleteStoryContent";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parts, scenes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export async function GET(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        partId: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { partId } = await params;
        const part = (await db.select().from(parts).where(eq(parts.id, partId)).limit(1))[0];
        if (!part) {
            return NextResponse.json({ error: "ไม่พบข้อมูลภาคนี้" }, { status: 404 });
        }
        const partScenes = await db.select().from(scenes).where(eq(scenes.partId, partId));
        return NextResponse.json({ part: { ...part, scenes: partScenes } });
    }
    catch (error: unknown) {
        console.error("Failed to fetch part:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
export async function PUT(req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        partId: string;
    }>;
}) {
return withAccount(req, async () => {
    try {
        const { partId } = await params;
        const body = await req.json().catch(() => ({}));
        const existing = (await db.select().from(parts).where(eq(parts.id, partId)).limit(1))[0];
        if (!existing) {
            return NextResponse.json({ error: "ไม่พบข้อมูลภาคนี้" }, { status: 404 });
        }
        const now = new Date().toISOString();
        const updateData: Record<string, any> = { updatedAt: now };
        if (body.title !== undefined)
            updateData.title = String(body.title).trim();
        if (body.scope !== undefined)
            updateData.scope = String(body.scope).trim();
        if (body.theme !== undefined)
            updateData.theme = String(body.theme).trim();
        if (body.peakSummary !== undefined)
            updateData.peakSummary = String(body.peakSummary).trim();
        if (body.characterChangeSummary !== undefined) {
            if (typeof body.characterChangeSummary !== "string" || body.characterChangeSummary.length > 80000)
                return NextResponse.json({ error: "บันทึกภาคต้องเป็นข้อความไม่เกิน 80,000 ตัวอักษร" }, { status: 400 });
            updateData.characterChangeSummary = body.characterChangeSummary;
        }
        if (body.status !== undefined)
            updateData.status = body.status;
        await db.update(parts).set(updateData).where(eq(parts.id, partId));
        const updated = (await db.select().from(parts).where(eq(parts.id, partId)).limit(1))[0];
        return NextResponse.json({ part: updated, message: "บันทึกข้อมูลภาคสำเร็จ" });
    }
    catch (error: unknown) {
        console.error("Failed to update part:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขข้อมูลภาค";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
export async function DELETE(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        partId: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { id, partId } = await params;
        return NextResponse.json(await deleteStoryPart(id, partId));
    }
    catch (e) {
        return NextResponse.json({ error: e instanceof StoryDeletionError ? e.message : "ลบภาคไม่สำเร็จ กรุณาลองใหม่" }, { status: e instanceof StoryDeletionError ? e.status : 500 });
    }

});
}
