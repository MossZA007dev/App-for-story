import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parts, episodes, scenes, sceneVersions, continuityLedgers } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const projectParts = db
      .select()
      .from(parts)
      .where(eq(parts.projectId, projectId))
      .orderBy(asc(parts.number))
      .all();

    const projectEpisodes = db
      .select()
      .from(episodes)
      .where(eq(episodes.projectId, projectId))
      .orderBy(asc(episodes.number))
      .all();

    const partsWithScenes = projectParts.map((part) => {
      const partScenes = db
        .select()
        .from(scenes)
        .where(eq(scenes.partId, part.id))
        .orderBy(asc(scenes.order))
        .all();

      const partEpisodes = projectEpisodes
        .filter((ep) => ep.partId === part.id)
        .map((ep) => ({
          ...ep,
          scenes: partScenes.filter((s) => s.episodeId === ep.id),
        }));

      return {
        ...part,
        episodes: partEpisodes,
        scenes: partScenes,
      };
    });

    return NextResponse.json({ parts: partsWithScenes });
  } catch (error: unknown) {
    console.error("Failed to fetch parts:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลภาค";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json().catch(() => ({}));

    // Find highest part number for this project
    const lastPart = db
      .select({ number: parts.number })
      .from(parts)
      .where(eq(parts.projectId, projectId))
      .orderBy(desc(parts.number))
      .limit(1)
      .get();

    const nextNumber = (lastPart?.number ?? 0) + 1;
    const now = new Date().toISOString();
    const partId = crypto.randomUUID();

    const partTitle =
      body.title && body.title.trim()
        ? body.title.trim()
        : `ภาคที่ ${nextNumber}: จุดเริ่มต้นบทใหม่`;

    const partScope =
      body.scope && body.scope.trim()
        ? body.scope.trim()
        : `Season ${nextNumber}`;

    const partTheme = body.theme?.trim() || "";
    const peakSummary = body.peakSummary?.trim() || "";

    // 1. Insert new Part / Season
    db.insert(parts)
      .values({
        id: partId,
        projectId,
        number: nextNumber,
        title: partTitle,
        scope: partScope,
        theme: partTheme,
        peakSummary,
        status: "planned",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 2. Automatically create initial Episode 1 for this new Part
    const epId = crypto.randomUUID();
    db.insert(episodes)
      .values({
        id: epId,
        projectId,
        partId,
        number: 1,
        title: "ตอนที่ 1",
        summary: "",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 3. Automatically create initial Scene 1 for this new Episode & Part
    const sceneId = crypto.randomUUID();
    const initialSceneTitle =
      body.initialSceneTitle && body.initialSceneTitle.trim()
        ? body.initialSceneTitle.trim()
        : `ฉากที่ 1: การเปิดม่านของภาคที่ ${nextNumber}`;

    const defaultContent = `[ผู้บรรยาย]: การเริ่มต้นของ ${partTitle}...\n\n`;

    db.insert(scenes)
      .values({
        id: sceneId,
        partId,
        episodeId: epId,
        order: 1,
        title: initialSceneTitle,
        location: "",
        charactersPresent: "[]",
        contentMarkdown: defaultContent,
        summary: "",
        wordCount: defaultContent.split(/\s+/).filter(Boolean).length,
        version: 1,
        directorNote: "",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    db.insert(sceneVersions)
      .values({
        id: crypto.randomUUID(),
        sceneId,
        versionNumber: 1,
        title: initialSceneTitle,
        contentMarkdown: defaultContent,
        summary: "",
        directorNote: "",
        createdAt: now,
      })
      .run();

    // 4. Initialize Continuity Ledger for this new Part
    const initialLedgerData = {
      deaths: [],
      injuries_scars: [],
      who_knows_whom: [],
      possessions_secrets: [],
      locations: {},
      canon_deviations: [],
      open_threads: [`การเริ่มต้นของภาคที่ ${nextNumber}`],
    };

    db.insert(continuityLedgers)
      .values({
        id: crypto.randomUUID(),
        projectId,
        sceneId: null,
        partId,
        ledgerData: JSON.stringify(initialLedgerData),
        isCurrent: 1,
        createdAt: now,
      })
      .run();

    const createdPart = db.select().from(parts).where(eq(parts.id, partId)).get();
    const createdEpisode = db.select().from(episodes).where(eq(episodes.id, epId)).get();
    const createdScene = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();

    return NextResponse.json({
      part: {
        ...createdPart,
        episodes: createdEpisode ? [{ ...createdEpisode, scenes: createdScene ? [createdScene] : [] }] : [],
        scenes: createdScene ? [createdScene] : [],
      },
      episode: createdEpisode,
      scene: createdScene,
      message: `สร้างภาคที่ ${nextNumber} (SS${nextNumber}) สำเร็จแล้ว`,
    });
  } catch (error: unknown) {
    console.error("Failed to create new part:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างภาคใหม่";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
