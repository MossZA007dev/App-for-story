import { NextRequest, NextResponse } from "next/server";
import { proposeCharacterRoles } from "@/lib/ai/anthropic";
import { z } from "zod";

const RequestSchema = z.object({
  universe: z.string().min(1, "กรุณาระบุจักรวาลเรื่อง"),
  theme: z.string().default(""),
  timelineScope: z.string().default(""),
  worldNotes: z.string().optional(),
  character: z.object({
    name: z.string().min(1, "กรุณาระบุชื่อตัวละคร"),
    gender: z.string().optional(),
    startMbti: z.string().optional(),
    roleWishOrForbidden: z.string().optional(),
    faction: z.string().optional(),
    background: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RequestSchema.parse(body);

    const result = await proposeCharacterRoles(validated);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("AI propose roles failed:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการประมวลผลของ AI";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
