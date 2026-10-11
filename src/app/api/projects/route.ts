import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, characters, parts, scenes, continuityLedgers, abilities } from "@/lib/db/schema";
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

    // Enrich each project with statistics
    const enriched = allProjects.map((proj) => {
      const charCount = db
        .select()
        .from(characters)
        .where(eq(characters.projectId, proj.id))
        .all().length;

      const projectParts = db
        .select()
        .from(parts)
        .where(eq(parts.projectId, proj.id))
        .all();

      const partIds = projectParts.map((p) => p.id);
      let sceneCount = 0;
      let totalWordCount = 0;

      for (const pId of partIds) {
        const pScenes = db.select().from(scenes).where(eq(scenes.partId, pId)).all();
        sceneCount += pScenes.length;
        totalWordCount += pScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0);
      }

      const completedParts = projectParts.filter((p) => p.status === "done").length;

      return {
        ...proj,
        characterCount: charCount,
        partCount: projectParts.length,
        completedParts,
        sceneCount,
        totalWordCount,
      };
    });

    return NextResponse.json(enriched);
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
