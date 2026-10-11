import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collaborators } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PUT /api/projects/[id]/collaborators/[collabId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collabId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, collabId } = resolvedParams;

    const body = await request.json();
    const {
      name,
      nickname,
      avatarUrl,
      characterId,
      role,
      canEditScenes,
      canUploadMedia,
      canGenerateAi,
    } = body;

    const existing = await db.query.collaborators.findFirst({
      where: and(
        eq(collaborators.id, collabId),
        eq(collaborators.projectId, projectId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบผู้ร่วมแต่งคนนี้" },
        { status: 404 }
      );
    }

    const updatedData: any = {};
    if (name !== undefined) updatedData.name = name.trim();
    if (nickname !== undefined) updatedData.nickname = nickname.trim();
    if (avatarUrl !== undefined) updatedData.avatarUrl = avatarUrl;
    if (characterId !== undefined) updatedData.characterId = characterId;
    if (role !== undefined) updatedData.role = role;
    if (canEditScenes !== undefined) updatedData.canEditScenes = canEditScenes ? 1 : 0;
    if (canUploadMedia !== undefined) updatedData.canUploadMedia = canUploadMedia ? 1 : 0;
    if (canGenerateAi !== undefined) updatedData.canGenerateAi = canGenerateAi ? 1 : 0;
    updatedData.lastActiveAt = new Date().toISOString();

    await db
      .update(collaborators)
      .set(updatedData)
      .where(eq(collaborators.id, collabId));

    const updated = await db.query.collaborators.findFirst({
      where: eq(collaborators.id, collabId),
    });

    return NextResponse.json({
      collaborator: updated,
      message: "อัปเดตข้อมูลผู้ร่วมแต่งเรียบร้อย",
    });
  } catch (error: any) {
    console.error("Error updating collaborator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update collaborator" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/collaborators/[collabId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collabId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: projectId, collabId } = resolvedParams;

    await db
      .delete(collaborators)
      .where(
        and(
          eq(collaborators.id, collabId),
          eq(collaborators.projectId, projectId)
        )
      );

    return NextResponse.json({
      message: "นำผู้ร่วมแต่งออกจากโปรเจกต์เรียบร้อย",
    });
  } catch (error: any) {
    console.error("Error deleting collaborator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete collaborator" },
      { status: 500 }
    );
  }
}
