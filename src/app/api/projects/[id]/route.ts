import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  characters,
  parts,
  scenes,
  continuityLedgers,
  abilities,
  relationships,
  images,
} from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";

const UpdateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  universe: z.string().min(1).optional(),
  timelineScope: z.string().optional(),
  theme: z.string().optional(),
  worldNotes: z.string().optional(),
  storyRules: z.string().optional(),
  styleGuide: z.string().optional(),
  targetSceneWords: z.number().optional(),
  coverImage: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = db.select().from(projects).where(eq(projects.id, id)).get();

    if (!project) {
      return NextResponse.json({ error: "ไม่พบโปรเจกต์ที่ระบุ" }, { status: 404 });
    }

    // Characters with abilities
    const projectCharacters = db
      .select()
      .from(characters)
      .where(eq(characters.projectId, id))
      .all();

    const charactersWithAbilities = projectCharacters.map((char) => {
      const charAbilities = db
        .select()
        .from(abilities)
        .where(eq(abilities.characterId, char.id))
        .all();
      return {
        ...char,
        abilities: charAbilities,
        visualSheetParsed: char.visualSheet ? JSON.parse(char.visualSheet) : {},
        roleOptionsParsed: char.roleOptions ? JSON.parse(char.roleOptions) : [],
      };
    });

    // Parts with scenes
    const projectParts = db
      .select()
      .from(parts)
      .where(eq(parts.projectId, id))
      .orderBy(asc(parts.number))
      .all();

    const partsWithScenes = projectParts.map((part) => {
      const partScenes = db
        .select()
        .from(scenes)
        .where(eq(scenes.partId, part.id))
        .orderBy(asc(scenes.order))
        .all();
      return {
        ...part,
        scenes: partScenes,
      };
    });

    // Relationships
    const projectRelationships = db
      .select()
      .from(relationships)
      .where(eq(relationships.projectId, id))
      .all();

    // Latest Continuity Ledger
    const latestLedger = db
      .select()
      .from(continuityLedgers)
      .where(eq(continuityLedgers.projectId, id))
      .orderBy(desc(continuityLedgers.createdAt))
      .limit(1)
      .get();

    // Approved & Recent Images
    const projectImages = db
      .select()
      .from(images)
      .where(eq(images.projectId, id))
      .orderBy(desc(images.createdAt))
      .all();

    return NextResponse.json({
      project,
      characters: charactersWithAbilities,
      parts: partsWithScenes,
      relationships: projectRelationships,
      continuityLedger: latestLedger
        ? {
            ...latestLedger,
            ledgerData: JSON.parse(latestLedger.ledgerData),
          }
        : null,
      images: projectImages,
    });
  } catch (error: unknown) {
    console.error("Failed to get project details:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลโปรเจกต์";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = UpdateProjectSchema.parse(body);

    const now = new Date().toISOString();
    db.update(projects)
      .set({
        ...validated,
        updatedAt: now,
      })
      .where(eq(projects.id, id))
      .run();

    const updated = db.select().from(projects).where(eq(projects.id, id)).get();

    return NextResponse.json({
      success: true,
      project: updated,
    });
  } catch (error: unknown) {
    console.error("Failed to update project:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตโปรเจกต์";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    db.delete(projects).where(eq(projects.id, id)).run();

    return NextResponse.json({
      success: true,
      message: "ลบโปรเจกต์สำเร็จ",
    });
  } catch (error: unknown) {
    console.error("Failed to delete project:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบโปรเจกต์";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
