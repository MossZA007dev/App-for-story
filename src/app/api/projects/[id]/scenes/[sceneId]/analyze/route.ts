import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  scenes,
  characters,
  continuityLedgers,
  changeLogs,
  relationships,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeSceneContent } from "@/lib/ai/sceneAnalyzer";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const { id: projectId, sceneId } = await params;
    const body = await req.json().catch(() => ({}));
    const applyDirectly = !!body.applyDirectly;

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

    const scene = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
    if (!scene) return NextResponse.json({ error: "ไม่พบฉากนี้" }, { status: 404 });

    const charList = db.select().from(characters).where(eq(characters.projectId, projectId)).all();
    const characterNames = charList.map((c) =>
      c.realNickname ? `${c.name} (${c.realNickname})` : c.name
    );

    const latestLedger = db
      .select()
      .from(continuityLedgers)
      .where(eq(continuityLedgers.projectId, projectId))
      .orderBy(desc(continuityLedgers.createdAt))
      .limit(1)
      .get();

    const currentLedgerData = latestLedger ? JSON.parse(latestLedger.ledgerData) : {};

    // Run AI analysis
    const analysis = await analyzeSceneContent({
      sceneTitle: scene.title,
      sceneContent: scene.contentMarkdown || "",
      currentLedger: currentLedgerData,
      characterNames,
      universe: project.universe,
      styleGuide: project.styleGuide || "",
    });

    // Update scene summary if not present or empty
    if (!scene.summary || scene.summary.trim() === "") {
      db.update(scenes)
        .set({ summary: analysis.summary })
        .where(eq(scenes.id, sceneId))
        .run();
    }

    // If applyDirectly is true (user confirmed updates)
    if (applyDirectly) {
      const now = new Date().toISOString();

      // Merge ledger updates
      const updatedLedger = {
        deaths: [
          ...(currentLedgerData.deaths || []),
          ...analysis.ledgerUpdates.newDeaths,
        ],
        injuries_scars: [
          ...(currentLedgerData.injuries_scars || []),
          ...analysis.ledgerUpdates.newInjuries,
        ],
        who_knows_whom: [
          ...(currentLedgerData.who_knows_whom || []),
          ...analysis.ledgerUpdates.whoKnowsWhom,
        ],
        possessions_secrets: [
          ...(currentLedgerData.possessions_secrets || []),
          ...analysis.ledgerUpdates.newSecretsOrPossessions,
        ],
        locations: {
          ...(currentLedgerData.locations || {}),
          ...analysis.ledgerUpdates.locationUpdates,
        },
        canon_deviations: [
          ...(currentLedgerData.canon_deviations || []),
          ...analysis.ledgerUpdates.newCanonDeviations,
        ],
        open_threads: [
          ...(currentLedgerData.open_threads || []),
          ...analysis.ledgerUpdates.newOpenThreads,
        ],
      };

      // Set previous ledgers isCurrent to 0
      db.update(continuityLedgers)
        .set({ isCurrent: 0 })
        .where(eq(continuityLedgers.projectId, projectId))
        .run();

      // Insert new current ledger
      db.insert(continuityLedgers)
        .values({
          id: crypto.randomUUID(),
          projectId,
          sceneId,
          partId: scene.partId,
          ledgerData: JSON.stringify(updatedLedger),
          isCurrent: 1,
          createdAt: now,
        })
        .run();

      // Apply safe MBTI changes
      for (const mbtiChange of analysis.proposedMbtiChanges) {
        if (mbtiChange.isSafeEvolution) {
          const char = charList.find(
            (c) =>
              c.name.toLowerCase() === mbtiChange.characterName.toLowerCase() ||
              (c.realNickname &&
                c.realNickname.toLowerCase() === mbtiChange.characterName.toLowerCase())
          );
          if (char) {
            db.update(characters)
              .set({ currentMbti: mbtiChange.toMbti, updatedAt: now })
              .where(eq(characters.id, char.id))
              .run();

            db.insert(changeLogs)
              .values({
                id: crypto.randomUUID(),
                partId: scene.partId,
                characterId: char.id,
                mbtiBefore: mbtiChange.fromMbti,
                mbtiAfter: mbtiChange.toMbti,
                triggerEvent: mbtiChange.triggerEvent,
                beliefs: mbtiChange.beliefsChange,
                losses: mbtiChange.losses,
                createdAt: now,
              })
              .run();
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: unknown) {
    console.error("Scene analysis error:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการวิเคราะห์ฉาก";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
