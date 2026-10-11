import { getAnthropicClient } from "./anthropic";
import { z } from "zod";

export const SceneAnalysisResponseSchema = z.object({
  summary: z.string().describe("สรุปเนื้อเรื่องของฉากนี้ 3-5 บรรทัด"),
  continuityCheck: z.object({
    hasContradiction: z.boolean(),
    warningDetails: z.string().describe("คำเตือนหากพบข้อขัดแย้ง เช่น คนที่ตายแล้วโผล่มา หรือบาดแผลที่หายไปผิดปกติ"),
    aiFixSuggestion: z.string().describe("ข้อเสนอแนะในการปรับแก้ให้สอดคล้อง"),
  }),
  ledgerUpdates: z.object({
    newDeaths: z.array(z.object({
      name: z.string(),
      cause: z.string(),
    })),
    newInjuries: z.array(z.string()),
    whoKnowsWhom: z.array(z.string()),
    newSecretsOrPossessions: z.array(z.string()),
    locationUpdates: z.record(z.string()),
    newCanonDeviations: z.array(z.string()),
    newOpenThreads: z.array(z.string()),
  }),
  proposedMbtiChanges: z.array(z.object({
    characterName: z.string(),
    fromMbti: z.string(),
    toMbti: z.string(),
    triggerEvent: z.string(),
    beliefsChange: z.string(),
    losses: z.string(),
    isSafeEvolution: z.boolean().describe("true ถ้าเป็นการเปลี่ยนอย่างสมเหตุสมผลทีละขั้น false ถ้าเร็วเกินไปในฉากเดียว"),
    warningIfRushed: z.string(),
  })),
  proposedRelationshipChanges: z.array(z.object({
    charA: z.string(),
    charB: z.string(),
    typeChange: z.string(),
    trustDelta: z.number().min(-5).max(5),
    note: z.string(),
  })),
  suggestedVisualMoments: z.array(z.object({
    momentTitle: z.string(),
    compositionDescription: z.string(),
    charactersInMoment: z.array(z.string()),
    englishPrompt: z.string().describe("Prompt ภาษาอังกฤษสำหรับสร้างภาพ AI โดยไม่ระบุนักแสดงจริง ผสานสไตล์ cinematic"),
  })).min(1).max(3),
});

export type SceneAnalysisResponse = z.infer<typeof SceneAnalysisResponseSchema>;

export async function analyzeSceneContent(params: {
  sceneTitle: string;
  sceneContent: string;
  currentLedger: Record<string, unknown>;
  characterNames: string[];
  universe: string;
  styleGuide: string;
}): Promise<SceneAnalysisResponse> {
  const { client, model } = await getAnthropicClient();

  const systemPrompt = `คุณคือ Master Continuity Supervisor และ Visual Director ประจำระบบ Saga Forge
หน้าที่ของคุณคือวิเคราะห์ฉากนิยายที่เพิ่งเขียนเสร็จ ตรวจสอบความถูกต้องต่อเนื่องกับ Continuity Ledger เดิมอย่างเข้มงวด
และคัดเลือกช่วงจังหวะทรงพลัง 3 moments สำหรับสร้างภาพ AI

กฎสำคัญ:
1. Continuity Check: ตรวจสอบว่ามีตัวละครที่เสียชีวิตไปแล้วโผล่มามีชีวิตหรือไม่ มีการย้ายสถานที่แบบเป็นไปไม่ได้หรือไม่
2. MBTI Evolution Rule: กฎเหล็กคือห้ามเปลี่ยน MBTI แบบก้าวกระโดดในฉากเดียว เว้นแต่มี Trigger Event รุนแรงระดับวิกฤตชีวิต และต้องเปลี่ยนทีละมิติ หากเปลี่ยนเร็วเกินไปให้ตั้ง isSafeEvolution = false พร้อมเตือน
3. Visual Moments: สกัด 1-3 จังหวะน่าวาด พร้อมเขียน English Prompt สไตล์ภาพยนตร์ที่ชัดเจนด้านมุมกล้อง แสง และสี ไม่ระบุชื่อดาราจริง

ตอบกลับเป็น JSON แท้เท่านั้น`;

  const userPrompt = `[ข้อมูลจักรวาลและสไตล์ภาพ]
จักรวาล: ${params.universe}
Visual Style Guide: ${params.styleGuide}

[รายชื่อตัวละครในเรื่อง]
${params.characterNames.join(", ")}

[Continuity Ledger สถานะข้อเท็จจริงก่อนฉากนี้]
${JSON.stringify(params.currentLedger, null, 2)}

[เนื้อหาฉากที่ต้องวิเคราะห์: "${params.sceneTitle}"]
${params.sceneContent}

กรุณาวิเคราะห์และตอบกลับในรูปแบบ JSON ตาม Schema ที่กำหนด:`;

  const response = await client.messages.create({
    model,
    max_tokens: 3000,
    temperature: 0.3, // Low temperature for factual analysis
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";
  const cleanedJson = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanedJson);
    return SceneAnalysisResponseSchema.parse(parsed);
  } catch (err) {
    console.error("Failed to parse scene analysis response:", rawText, err);
    throw new Error("AI วิเคราะห์ผลลัพธ์ฉากในรูปแบบที่ไม่ถูกต้อง");
  }
}
