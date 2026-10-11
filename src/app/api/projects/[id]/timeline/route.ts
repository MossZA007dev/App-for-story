import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  parts,
  scenes,
  continuityLedgers,
  changeLogs,
  characters,
} from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

    // Fetch all parts ordered by part number
    const allParts = db
      .select()
      .from(parts)
      .where(eq(parts.projectId, projectId))
      .orderBy(asc(parts.number))
      .all();

    // Fetch all scenes for all parts
    const partsWithScenes = allParts.map((part) => {
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

    // Fetch all continuity ledgers
    const ledgers = db
      .select()
      .from(continuityLedgers)
      .where(eq(continuityLedgers.projectId, projectId))
      .orderBy(desc(continuityLedgers.createdAt))
      .all();

    // Fetch all character change logs
    const allChangeLogs = db
      .select({
        id: changeLogs.id,
        partId: changeLogs.partId,
        characterId: changeLogs.characterId,
        mbtiBefore: changeLogs.mbtiBefore,
        mbtiAfter: changeLogs.mbtiAfter,
        triggerEvent: changeLogs.triggerEvent,
        beliefs: changeLogs.beliefs,
        losses: changeLogs.losses,
        createdAt: changeLogs.createdAt,
        characterName: characters.name,
        realNickname: characters.realNickname,
      })
      .from(changeLogs)
      .leftJoin(characters, eq(changeLogs.characterId, characters.id))
      .all();

    return NextResponse.json({
      success: true,
      project,
      parts: partsWithScenes,
      ledgers: ledgers.map((l) => ({
        ...l,
        data: JSON.parse(l.ledgerData || "{}"),
      })),
      changeLogs: allChangeLogs,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch timeline data:", error);
    const msg = error instanceof Error ? error.message : "ดึงข้อมูลไทม์ไลน์ล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
