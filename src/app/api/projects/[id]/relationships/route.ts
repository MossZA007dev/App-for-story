import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { relationships, characters, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

    const allRelationships = db
      .select()
      .from(relationships)
      .where(eq(relationships.projectId, projectId))
      .all();

    const charList = db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .all();

    return NextResponse.json({
      success: true,
      relationships: allRelationships,
      characters: charList,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch relationships:", error);
    const msg = error instanceof Error ? error.message : "ดึงข้อมูลความสัมพันธ์ล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();

    const { charA, charB, type, trustLevel, note, changedAtScene, id } = body;

    if (!charA || !charB) {
      return NextResponse.json(
        { error: "กรุณาระบุตัวละครทั้งสองฝ่าย" },
        { status: 400 }
      );
    }

    const relId = id || crypto.randomUUID();

    // Check if relationship already exists
    const existing = db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.projectId, projectId),
          eq(relationships.charA, charA),
          eq(relationships.charB, charB)
        )
      )
      .get();

    const now = new Date().toISOString();

    if (existing) {
      db.update(relationships)
        .set({
          type: type || existing.type,
          trustLevel: typeof trustLevel === "number" ? trustLevel : existing.trustLevel,
          note: note !== undefined ? note : existing.note,
          changedAtScene: changedAtScene || existing.changedAtScene,
          updatedAt: now,
        })
        .where(eq(relationships.id, existing.id))
        .run();

      const updated = db.select().from(relationships).where(eq(relationships.id, existing.id)).get();
      return NextResponse.json({ success: true, relationship: updated });
    } else {
      const newRel = {
        id: relId,
        projectId,
        charA,
        charB,
        type: type || "พันธมิตรระแวงระวัง",
        trustLevel: typeof trustLevel === "number" ? trustLevel : 0,
        note: note || "",
        changedAtScene: changedAtScene || "",
        updatedAt: now,
      };

      db.insert(relationships).values(newRel).run();
      return NextResponse.json({ success: true, relationship: newRel }, { status: 201 });
    }
  } catch (error: unknown) {
    console.error("Failed to save relationship:", error);
    const msg = error instanceof Error ? error.message : "บันทึกความสัมพันธ์ล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const relId = searchParams.get("relId");

    if (!relId) {
      return NextResponse.json({ error: "Missing relId" }, { status: 400 });
    }

    db.delete(relationships)
      .where(and(eq(relationships.id, relId), eq(relationships.projectId, projectId)))
      .run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to delete relationship:", error);
    const msg = error instanceof Error ? error.message : "ลบความสัมพันธ์ล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
