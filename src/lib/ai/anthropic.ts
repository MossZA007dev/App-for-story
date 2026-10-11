import Anthropic from "@anthropic-ai/sdk";
import { getAppSettings } from "../settings";
import { z } from "zod";

export async function getAnthropicClient(): Promise<{ client: Anthropic; model: string }> {
  const settings = await getAppSettings();
  const apiKey = settings.anthropicApiKey;

  if (!apiKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Anthropic API Key กรุณาใส่ API Key ในหน้า Settings หรือกำหนด ANTHROPIC_API_KEY ใน Environment"
    );
  }

  const client = new Anthropic({
    apiKey,
  });

  return {
    client,
    model: settings.anthropicModel || "claude-3-5-sonnet-20241022",
  };
}

export const CharacterRoleProposalSchema = z.object({
  roleTitle: z.string(),
  roleConcept: z.string(),
  narrativeFunction: z.string(),
  innerConflict: z.string(),
  suggestedAbility: z.object({
    name: z.string(),
    origin: z.string(),
    cost: z.string(),
  }),
  visualPromptTrait: z.string(),
});

export const ProposeRolesResponseSchema = z.object({
  roles: z.array(CharacterRoleProposalSchema).length(3),
  aiSelectionRecommendationIndex: z.number().min(0).max(2),
  recommendationReason: z.string(),
});

export type CharacterRoleProposal = z.infer<typeof CharacterRoleProposalSchema>;
export type ProposeRolesResponse = z.infer<typeof ProposeRolesResponseSchema>;

export async function proposeCharacterRoles(params: {
  universe: string;
  theme: string;
  timelineScope: string;
  worldNotes?: string;
  character: {
    name: string;
    gender?: string;
    startMbti?: string;
    roleWishOrForbidden?: string;
    faction?: string;
    background?: string;
    characterType?: string;
    realNickname?: string;
  };
}): Promise<ProposeRolesResponse> {
  const { client, model } = await getAnthropicClient();

  const systemPrompt = `คุณคือ Senior Narrative Designer และผู้เชี่ยวชาญการเขียน Dark Drama / AU Fiction ประจำระบบ Saga Forge
หน้าที่ของคุณคือออกแบบบทบาท 3 ตัวเลือกที่แตกต่างกันอย่างสิ้นเชิง (ตามกฎ DIVERSITY RULES) สำหรับตัวละครที่กำหนดในจักรวาลนี้

กฎ DIVERSITY & DEPTH:
1. แต่ละบทบาทต้องผลักดันธีมหลักของเรื่อง มีปมขัดแย้งในใจ (Inner Conflict) และหน้าที่ต่อโครงเรื่อง (Narrative Function) ที่ชัดเจน
2. เคารพข้อมูลที่ผู้ใช้ระบุ: สิ่งที่อยากได้/ห้ามเป็น, ฝ่าย, ภูมิหลัง, และ MBTI ตั้งต้น
3. บทบาททั้ง 3 ต้องไม่ซ้ำแนวกัน (เช่น บทบาทที่ 1: ผู้คุมอำนาจที่มีชะตากรรมต้องแลก, บทบาทที่ 2: สปาย/ผู้ทรยศผู้ปิดบังตัวตน, บทบาทที่ 3: หมากที่ไร้อำนาจแต่กำลังกลายพันธุ์เป็นสัตว์ประหลาดทางจิตวิทยา)
4. เสนอพลังหรือความสามารถ 1 อย่างที่มี 'ราคาที่ต้องจ่าย' (Cost) เสมอ
5. คัดเลือก 1 บทบาทที่ AI แนะนำมากที่สุด พร้อมเหตุผลสั้นๆ

ตอบกลับเป็น JSON แท้เท่านั้น ตามโครงสร้างนี้:
{
  "roles": [
    {
      "roleTitle": "ชื่อบทบาทที่กระชับและทรงพลัง",
      "roleConcept": "คำอธิบายคอนเซปต์บทบาทและเป้าหมายในเรื่อง 2-3 ประโยค",
      "narrativeFunction": "หน้าที่ในเส้นเรื่องและผลกระทบต่อตัวละครอื่น",
      "innerConflict": "ความขัดแย้งในใจหรือจุดอ่อนตายตัว",
      "suggestedAbility": {
        "name": "ชื่อพลังหรือทักษะพิเศษ",
        "origin": "ที่มาของพลังที่ผูกกับจิตใจหรือชะตากรรม",
        "cost": "ราคาหรือผลกระทบทางกายภาพ/จิตใจเมื่อใช้"
      },
      "visualPromptTrait": "ลักษณะเด่นภายนอกและเครื่องแต่งกายสำหรับสร้างภาพ"
    }
  ],
  "aiSelectionRecommendationIndex": 0,
  "recommendationReason": "เหตุผลสั้นๆ ว่าทำไมบทบาทนี้จึงสร้างแรงกระแทกให้เนื้อเรื่องได้ดีที่สุด"
}`;

  const userPrompt = `[ข้อมูลจักรวาลและโปรเจกต์]
จักรวาล: ${params.universe}
ธีมหลัก: ${params.theme || "Dark Drama / AU"}
ขอบเขตเวลา: ${params.timelineScope || "กำหนดเอง"}
บันทึกโลก: ${params.worldNotes || "ไม่มี"}

[ข้อมูลตัวละครที่ต้องออกแบบบทบาท (คนจากชีวิตจริงที่หลุดเข้าไปในโลกนี้)]
สถานะ: ${params.character.characterType === "self" ? "ตัวผู้ใช้เอง (Self / Protagonist)" : "เพื่อนสนิทในแก๊ง (Friend)"}
ชื่อเล่นจริง: ${params.character.realNickname || "ไม่ระบุ"}
ชื่อ/ฉายาในจักรวาลนี้: ${params.character.name}
เพศ: ${params.character.gender || "ไม่ระบุ"}
MBTI ตั้งต้น: ${params.character.startMbti || "ไม่ระบุ"}
ฝ่าย / สังกัดที่อยากเข้า: ${params.character.faction || "ไม่ระบุ"}
บทบาทที่อยากได้ / ห้ามเป็น: ${params.character.roleWishOrForbidden || "ไม่มีข้อจำกัด"}
ภูมิหลังย่อ/สภาพตอนหลุดเข้ามา: ${params.character.background || "ไม่มี"}

กรุณาเสนอ 3 บทบาทที่ลึกซึ้งและมีความหลากหลายตามเกณฑ์ โดยปรับให้เข้ากับบรรยากาศมืดมน/เข้มข้นของจักรวาล ${params.universe} และมีเคมีต่อแก๊งเพื่อน`;

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.8,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";
  
  // Clean JSON formatting if code blocks present
  const cleanedJson = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanedJson);
    return ProposeRolesResponseSchema.parse(parsed);
  } catch (err) {
    console.error("Failed to parse proposed roles response:", responseText, err);
    throw new Error("AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
  }
}
