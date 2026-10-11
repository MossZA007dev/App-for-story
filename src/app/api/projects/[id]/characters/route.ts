import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, abilities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

const CharacterCreateSchema = z.object({
  name: z.string().min(1, "ต้องระบุชื่อตัวละคร"),
  gender: z.string().optional().default(""),
  startMbti: z.string().optional().default(""),
  currentMbti: z.string().optional().default(""),
  roleOptions: z.string().optional().default("[]"),
  chosenRole: z.string().optional().default(""),
  roleReason: z.string().optional().default(""),
  faction: z.string().optional().default(""),
  background: z.string().optional().default(""),
  characterType: z.enum(["self", "friend", "canon"]).default("friend"),
  realNickname: z.string().optional().default(""),
  avatarUrl: z.string().optional().default(""),
  status: z.enum(["alive", "dead", "missing", "captive"]).default("alive"),
  locationNow: z.string().optional().default(""),
  visualSheet: z.record(z.unknown()).optional().default({}),
  abilities: z
    .array(
      z.object({
        name: z.string().min(1),
        origin: z.string().optional().default(""),
        linkToPersonality: z.string().optional().default(""),
        cost: z.string().optional().default(""),
        gainedAtPart: z.number().optional().default(1),
      })
    )
    .optional()
    .default([]),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const charList = db.select().from(characters).where(eq(characters.projectId, id)).all();

    const enriched = charList.map((c) => {
      const charAbilities = db.select().from(abilities).where(eq(abilities.characterId, c.id)).all();
      return {
        ...c,
        abilities: charAbilities,
        visualSheetParsed: c.visualSheet ? JSON.parse(c.visualSheet) : {},
        roleOptionsParsed: c.roleOptions ? JSON.parse(c.roleOptions) : [],
      };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    console.error("Failed to fetch characters:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดตัวละคร";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const validated = CharacterCreateSchema.parse(body);

    const charId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(characters)
      .values({
        id: charId,
        projectId,
        name: validated.name,
        gender: validated.gender,
        startMbti: validated.startMbti,
        currentMbti: validated.currentMbti || validated.startMbti,
        roleOptions: validated.roleOptions,
        chosenRole: validated.chosenRole,
        roleReason: validated.roleReason,
        faction: validated.faction,
        background: validated.background,
        characterType: validated.characterType,
        realNickname: validated.realNickname,
        avatarUrl: validated.avatarUrl,
        status: validated.status,
        locationNow: validated.locationNow,
        visualSheet: JSON.stringify(validated.visualSheet),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Insert abilities
    for (const ab of validated.abilities) {
      db.insert(abilities)
        .values({
          id: crypto.randomUUID(),
          characterId: charId,
          name: ab.name,
          origin: ab.origin,
          linkToPersonality: ab.linkToPersonality,
          cost: ab.cost,
          gainedAtPart: ab.gainedAtPart,
        })
        .run();
    }

    const created = db.select().from(characters).where(eq(characters.id, charId)).get();

    return NextResponse.json({
      success: true,
      character: created,
    });
  } catch (error: unknown) {
    console.error("Failed to create character:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างตัวละคร";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
