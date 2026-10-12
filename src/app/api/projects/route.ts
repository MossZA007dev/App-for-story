import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, characters, parts, scenes, continuityLedgers, abilities, images } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DEFAULT_STORY_RULES } from "@/lib/templates/defaultStoryRules";
import crypto from "crypto";
import { z } from "zod";

const CharacterInputSchema = z.object({
  name: z.string().min(1, "ต้องระบุชื่อตัวละคร"),
  gender: z.string().optional().default(""),
  startMbti: z.string().optional().default(""),
  currentMbti: z.string().optional().default(""),
  roleOptions: z.string().optional().default("[]"),
  chosenRole: z.string().optional().default(""),
  roleReason: z.string().optional().default(""),
  faction: z.string().optional().default(""),
  background: z.string().optional().default(""),
  characterType: z.enum(["self", "friend", "canon"]).optional().default("friend"),
  realNickname: z.string().optional().default(""),
  avatarUrl: z.string().optional().default(""),
  visualSheet: z.record(z.unknown()).optional().default({}),
  ability: z
    .object({
      name: z.string().default(""),
      origin: z.string().default(""),
      cost: z.string().default(""),
    })
    .optional(),
});

const CreateProjectSchema = z.object({
  title: z.string().min(1, "ต้องระบุชื่อเรื่อง"),
  universe: z.string().min(1, "ต้องระบุจักรวาล"),
  timelineScope: z.string().optional().default(""),
  theme: z.string().optional().default(""),
  worldNotes: z.string().optional().default(""),
  storyRules: z.string().optional().default(DEFAULT_STORY_RULES),
  styleGuide: z.string().optional().default("dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed"),
  targetSceneWords: z.number().default(1200),
  characters: z.array(CharacterInputSchema).optional().default([]),
});

export async function GET() {
  try {
    const allProjects = db.select().from(projects).orderBy(desc(projects.createdAt)).all();

    if (allProjects.length === 0) {
      return NextResponse.json([]);
    }

    // High performance bulk queries (O(1) in-memory aggregation instead of N+1 database queries)
    const allChars = db.select({ id: characters.id, projectId: characters.projectId }).from(characters).all();
    const allParts = db.select().from(parts).all();
    const allScenes = db.select({ id: scenes.id, partId: scenes.partId, wordCount: scenes.wordCount }).from(scenes).all();
    const allImages = db
      .select({ id: images.id, projectId: images.projectId, filePath: images.filePath })
      .from(images)
      .orderBy(desc(images.approved), desc(images.createdAt))
      .all();

    // 1. Group characters count by projectId
    const charsCountByProject = new Map<string, number>();
    for (const c of allChars) {
      if (c.projectId) {
        charsCountByProject.set(c.projectId, (charsCountByProject.get(c.projectId) || 0) + 1);
      }
    }

    // 2. Group scenes and word count by partId
    const scenesStatsByPart = new Map<string, { count: number; words: number }>();
    for (const s of allScenes) {
      if (s.partId) {
        const cur = scenesStatsByPart.get(s.partId) || { count: 0, words: 0 };
        cur.count += 1;
        cur.words += (s.wordCount || 0);
        scenesStatsByPart.set(s.partId, cur);
      }
    }

    // 3. Group parts, completed parts, scenes count, and word count by projectId
    const partsByProject = new Map<string, { count: number; completed: number; sceneCount: number; totalWords: number }>();
    for (const p of allParts) {
      if (p.projectId) {
        const cur = partsByProject.get(p.projectId) || { count: 0, completed: 0, sceneCount: 0, totalWords: 0 };
        cur.count += 1;
        if (p.status === "done") cur.completed += 1;

        const sStats = scenesStatsByPart.get(p.id);
        if (sStats) {
          cur.sceneCount += sStats.count;
          cur.totalWords += sStats.words;
        }

        partsByProject.set(p.projectId, cur);
      }
    }

    // 4. Map first approved/latest cover image by projectId
    const coverByProject = new Map<string, string>();
    for (const img of allImages) {
      if (img.projectId && !coverByProject.has(img.projectId)) {
        coverByProject.set(img.projectId, img.filePath);
      }
    }

    // 5. Enrich all projects instantly in memory
    const enriched = allProjects.map((proj) => {
      const pStats = partsByProject.get(proj.id) || { count: 0, completed: 0, sceneCount: 0, totalWords: 0 };
      const charCount = charsCountByProject.get(proj.id) || 0;
      const coverImg = coverByProject.get(proj.id);

      return {
        ...proj,
        characterCount: charCount,
        partCount: pStats.count,
        completedParts: pStats.completed,
        sceneCount: pStats.sceneCount,
        totalWordCount: pStats.totalWords,
        coverImage: proj.coverImage || coverImg || "/images/saga-got-cover.jpg",
      };
    });

    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch projects:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจกต์";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateProjectSchema.parse(body);

    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Insert Project
    db.insert(projects)
      .values({
        id: projectId,
        title: validated.title,
        universe: validated.universe,
        timelineScope: validated.timelineScope,
        theme: validated.theme,
        worldNotes: validated.worldNotes,
        storyRules: validated.storyRules || DEFAULT_STORY_RULES,
        styleGuide: validated.styleGuide,
        targetSceneWords: validated.targetSceneWords,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 2. Insert initial Part 1
    const part1Id = crypto.randomUUID();
    db.insert(parts)
      .values({
        id: part1Id,
        projectId,
        number: 1,
        title: "ภาคที่ 1: จุดเริ่มต้นแห่งเงามืด",
        scope: validated.timelineScope || "องก์ที่ 1",
        theme: validated.theme || "การเปิดตัวและความขัดแย้งตั้งต้น",
        peakSummary: "จุดหักเหแรกที่ผลักดันให้ตัวละครเข้าสู่เกมแห่งชะตากรรม",
        status: "planned",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 3. Insert initial Continuity Ledger
    const initialLedgerData = {
      deaths: [],
      injuries_scars: [],
      who_knows_whom: [],
      possessions_secrets: [],
      locations: {},
      canon_deviations: [],
      open_threads: ["การเริ่มต้นเรื่องราวและการเปิดเผยปมแรก"],
    };

    db.insert(continuityLedgers)
      .values({
        id: crypto.randomUUID(),
        projectId,
        sceneId: null,
        partId: part1Id,
        ledgerData: JSON.stringify(initialLedgerData),
        isCurrent: 1,
        createdAt: now,
      })
      .run();

    // 4. Insert initial Characters if provided
    for (const charInput of validated.characters) {
      const charId = crypto.randomUUID();
      const visualSheetStr = typeof charInput.visualSheet === "object"
        ? JSON.stringify(charInput.visualSheet)
        : "{}";

      db.insert(characters)
        .values({
          id: charId,
          projectId,
          name: charInput.name,
          gender: charInput.gender || "",
          startMbti: charInput.startMbti || "",
          currentMbti: charInput.currentMbti || charInput.startMbti || "",
          roleOptions: charInput.roleOptions || "[]",
          chosenRole: charInput.chosenRole || "",
          roleReason: charInput.roleReason || "",
          faction: charInput.faction || "",
          background: charInput.background || "",
          characterType: charInput.characterType || "friend",
          realNickname: charInput.realNickname || "",
          avatarUrl: charInput.avatarUrl || "",
          status: "alive",
          locationNow: "",
          visualSheet: visualSheetStr,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // If ability provided
      if (charInput.ability && charInput.ability.name) {
        db.insert(abilities)
          .values({
            id: crypto.randomUUID(),
            characterId: charId,
            name: charInput.ability.name,
            origin: charInput.ability.origin || "",
            cost: charInput.ability.cost || "",
            gainedAtPart: 1,
          })
          .run();
      }
    }

    return NextResponse.json({
      success: true,
      projectId,
      message: "สร้างโปรเจกต์สำเร็จ",
    });
  } catch (error: unknown) {
    console.error("Failed to create project:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างโปรเจกต์";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
