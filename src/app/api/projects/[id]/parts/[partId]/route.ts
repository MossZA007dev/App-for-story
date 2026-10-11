import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parts, scenes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { partId } = await params;
    const part = db.select().from(parts).where(eq(parts.id, partId)).get();
    if (!part) {
      return NextResponse.json({ error: "ไม่พบข้อมูลภาคนี้" }, { status: 404 });
    }
    const partScenes = db.select().from(scenes).where(eq(scenes.partId, partId)).all();
    return NextResponse.json({ part: { ...part, scenes: partScenes } });
  } catch (error: unknown) {
    console.error("Failed to fetch part:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { partId } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = db.select().from(parts).where(eq(parts.id, partId)).get();
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบข้อมูลภาคนี้" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, any> = { updatedAt: now };

    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.scope !== undefined) updateData.scope = String(body.scope).trim();
    if (body.theme !== undefined) updateData.theme = String(body.theme).trim();
    if (body.peakSummary !== undefined) updateData.peakSummary = String(body.peakSummary).trim();
    if (body.status !== undefined) updateData.status = body.status;

    db.update(parts).set(updateData).where(eq(parts.id, partId)).run();

    const updated = db.select().from(parts).where(eq(parts.id, partId)).get();
    return NextResponse.json({ part: updated, message: "บันทึกข้อมูลภาคสำเร็จ" });
  } catch (error: unknown) {
    console.error("Failed to update part:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขข้อมูลภาค";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { id: projectId, partId } = await params;

    // Check count of parts in project
    const allParts = db
      .select({ id: parts.id })
      .from(parts)
      .where(eq(parts.projectId, projectId))
      .all();

    if (allParts.length <= 1) {
      return NextResponse.json(
        { error: "ไม่สามารถลบภาคนี้ได้ เนื่องจากเรื่องนี้ต้องมีอย่างน้อย 1 ภาค" },
        { status: 400 }
      );
    }

    db.delete(parts).where(eq(parts.id, partId)).run();
    return NextResponse.json({ success: true, message: "ลบภาคเรียบร้อยแล้ว" });
  } catch (error: unknown) {
    console.error("Failed to delete part:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบภาค";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
