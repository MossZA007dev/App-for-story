import { getAnthropicClient } from "./anthropic";
import { db } from "../db";
import {
  projects,
  characters,
  parts,
  scenes,
  continuityLedgers,
  abilities,
} from "../db/schema";
import { eq, desc, asc, lt } from "drizzle-orm";
import { getAppSettings } from "../settings";

export interface BuildPromptParams {
  projectId: string;
  partId: string;
  sceneId?: string;
  targetOrder?: number;
  sceneTitle: string;
  location?: string;
  charactersPresent?: string[]; // IDs or Names
  directorsNote?: string;
  targetWords?: number;
  actionType?: "write_next" | "regenerate" | "expand" | "continue";
  existingContent?: string;
}

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
}

export async function assembleStoryPrompt(params: BuildPromptParams): Promise<AssembledPrompt> {
  const settings = await getAppSettings();
  const project = db.select().from(projects).where(eq(projects.id, params.projectId)).get();
  if (!project) throw new Error("ไม่พบโปรเจกต์");

  const currentPart = db.select().from(parts).where(eq(parts.id, params.partId)).get();
  if (!currentPart) throw new Error("ไม่พบข้อมูลภาค");

  // Fetch all characters
  const charList = db.select().from(characters).where(eq(characters.projectId, params.projectId)).all();
  const charactersWithDetails = charList.map((c) => {
    const abs = db.select().from(abilities).where(eq(abilities.characterId, c.id)).all();
    return {
      name: c.name,
      realNickname: c.realNickname ? `(ชื่อเล่นจริง: ${c.realNickname})` : "",
      type:
        c.characterType === "self"
          ? "ตัวผู้ใช้เอง (Self)"
          : c.characterType === "friend"
          ? "เพื่อนในแก๊ง (Friend)"
          : "ตัวละครในจักรวาลเดิม (Canon Character)",
      startMbti: c.startMbti,
      currentMbti: c.currentMbti,
      chosenRole: c.chosenRole,
      roleReason: c.roleReason,
      faction: c.faction,
      status: c.status,
      locationNow: c.locationNow,
      abilities: abs.map((a) => `${a.name} [ราคาที่ต้องจ่าย: ${a.cost || "ไม่มี"}]`),
    };
  });

  // Layer 3: Latest Continuity Ledger
  const latestLedger = db
    .select()
    .from(continuityLedgers)
    .where(eq(continuityLedgers.projectId, params.projectId))
    .orderBy(desc(continuityLedgers.createdAt))
    .limit(1)
    .get();

  const ledgerJson = latestLedger ? JSON.parse(latestLedger.ledgerData) : {};

  // Layer 4: Memory & Previous parts / scenes
  // 4.1 Past completed parts
  const pastParts = db
    .select()
    .from(parts)
    .where(eq(parts.projectId, params.projectId))
    .orderBy(asc(parts.number))
    .all()
    .filter((p) => p.number < currentPart.number);

  const pastPartSummaries = pastParts
    .map((p) => `ภาค ${p.number} (${p.title}): ${p.peakSummary || "ดำเนินเรื่องตามปกติ"}`)
    .join("\n");

  // 4.2 Recent 2-3 scenes in current part
  const recentScenes = db
    .select()
    .from(scenes)
    .where(eq(scenes.partId, params.partId))
    .orderBy(desc(scenes.order))
    .limit(3)
    .all()
    .reverse();

  const recentScenesText = recentScenes
    .map(
      (s) =>
        `[ฉากที่ ${s.order}: ${s.title} (สถานที่: ${s.location || "ไม่ระบุ"})]\nสรุป: ${
          s.summary || "(ไม่มีสรุป)"
        }\nเนื้อหาบางส่วน:\n${(s.contentMarkdown || "").slice(-600)}`
    )
    .join("\n\n---\n\n");

  // LAYER 1: System Prompt (Story Rules)
  const systemPrompt = `${project.storyRules}

[คำสั่งกำกับรูปแบบและสำนวนการเขียน]
- เขียนเป็นภาษาไทยอย่างสละสลวย โทนดาร์กดราม่าเข้มข้น ดิบ เรียล และให้อารมณ์ภาพยนตร์ (Cinematic Prose)
- ตัวละครที่เป็น "ฉันและแก๊งเพื่อน" ได้หลุดเข้ามาในจักรวาลนี้ ต้องมีปฏิสัมพันธ์กับโลกและตัวละครต้นฉบับอย่างสมจริง ไม่เป็นแมรี่ซู มีความกลัว ความกดดัน และความขัดแย้ง
- บรรยายเชิงรูปธรรม เห็นภาพการกระทำ ชัดเจนทั้งเสียง แสง เงา และกลิ่น ห้ามสรุปความรู้สึกแบบแห้งๆ
- ห้ามเขียนขัดแย้งกับ Continuity Ledger เด็ดขาด (ใครตายห้ามโผล่ ใครบาดเจ็บต้องมีอาการ)`;

  // LAYER 2, 3, 4, 5: Assembled User Prompt
  const targetWords = params.targetWords || project.targetSceneWords || 1200;

  const userPrompt = `[ชั้น 2: PROJECT CONTEXT & CHARACTER BIBLE]
จักรวาล: ${project.universe}
ขอบเขตไทม์ไลน์: ${project.timelineScope || "AU กำหนดเอง"}
ธีมหลัก: ${project.theme || "Dark Drama / AU"}
บันทึกโลก & จุดเบี่ยงเบน: ${project.worldNotes || "ไม่มี"}

รายชื่อตัวละคร (Character Bible):
${charactersWithDetails
  .map(
    (c) =>
      `- ${c.name} ${c.realNickname} [${c.type}]: สังกัด ${c.faction || "ไม่ระบุ"} | สถานะ: ${
        c.status
      } | ตำแหน่งปัจจุบัน: ${c.locationNow || "ไม่ระบุ"} | MBTI ปัจจุบัน: ${
        c.currentMbti
      } | บทบาท: ${c.chosenRole} | พลัง: ${
        c.abilities.join(", ") || "ไม่มีพลังพิเศษ"
      }`
  )
  .join("\n")}

[ชั้น 3: CONTINUITY LEDGER สถานะข้อเท็จจริงล่าสุด]
${JSON.stringify(ledgerJson, null, 2)}

[ชั้น 4: ความทรงจำย้อนหลัง (MEMORY & RECENT SCENES)]
สรุปภาคก่อนหน้า:
${pastPartSummaries || "เป็นภาคแรก (Part 1)"}

ฉากก่อนหน้าในชาปเตอร์นี้:
${recentScenesText || "นี่คือฉากแรกของภาคนี้"}

[ชั้น 5: คำสั่งเขียนฉากปัจจุบัน (CURRENT MISSION)]
ภาคปัจจุบัน: ภาค ${currentPart.number}: ${currentPart.title} (จุดพีค: ${
    currentPart.peakSummary || "ตามโครงเรื่อง"
  })
ชื่อฉากที่ต้องเขียน: ${params.sceneTitle}
สถานที่เกิดเหตุ: ${params.location || "ตามบริบทเรื่อง"}
ตัวละครที่อยู่ในฉากนี้: ${
    params.charactersPresent && params.charactersPresent.length > 0
      ? params.charactersPresent.join(", ")
      : "ตัวละครหลักที่เกี่ยวข้อง"
  }
ความยาวเป้าหมาย: ประมาณ ${targetWords} คำ (เขียนอย่างเต็มอิ่ม ละเอียด มีบทสนทนาและบรรยากาศ)
${
  params.directorsNote
    ? `\n⭐ [DIRECTOR'S NOTE - ทิศทางเฉพาะที่ผู้ใช้สั่ง]:\n"${params.directorsNote}"\n(ต้องปฏิบัติตามคำสั่งนี้อย่างเคร่งครัดและกลมกลืนกับเรื่อง)`
    : ""
}
${
  params.actionType === "regenerate"
    ? "\n* หมายเหตุ: นี่เป็นการเขียนฉากนี้ใหม่ ให้ปรับปรุงจังหวะอารมณ์และสำนวนให้ตราตรึงยิ่งขึ้น"
    : params.actionType === "expand"
    ? `\n* หมายเหตุ: ฉากเดิมมีเนื้อหาดังนี้ ขยายความและลงรายละเอียดฉากนี้ให้ลึกซึ้งยิ่งขึ้น:\n${params.existingContent}`
    : ""
}

กรุณาเริ่มเขียนเนื้อเรื่องของฉากนี้ในรูปแบบ Markdown ได้ทันที:`;

  return {
    systemPrompt,
    userPrompt,
    model: settings.anthropicModel || "claude-3-5-sonnet-20241022",
    temperature: settings.temperature ?? 0.7,
  };
}
