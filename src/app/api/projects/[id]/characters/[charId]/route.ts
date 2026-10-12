import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, abilities, changeLogs, scenes, parts, collaborators } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

const UpdateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.string().optional(),
  startMbti: z.string().optional(),
  currentMbti: z.string().optional(),
  roleOptions: z.string().optional(),
  chosenRole: z.string().optional(),
  roleReason: z.string().optional(),
  faction: z.string().optional(),
  background: z.string().optional(),
  characterType: z.enum(["self", "friend", "canon"]).optional(),
  realNickname: z.string().optional(),
  avatarUrl: z.string().optional(),
  status: z.enum(["alive", "dead", "missing", "captive"]).optional(),
  locationNow: z.string().optional(),
  visualSheet: z.record(z.unknown()).optional(),
  abilities: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        origin: z.string().optional(),
        linkToPersonality: z.string().optional(),
        cost: z.string().optional(),
        gainedAtPart: z.number().optional(),
      })
    )
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  try {
    const { charId } = await params;
    const char = db.select().from(characters).where(eq(characters.id, charId)).get();

    if (!char) {
      return NextResponse.json({ error: "ไม่พบข้อมูลตัวละคร" }, { status: 404 });
    }

    const charAbilities = db.select().from(abilities).where(eq(abilities.characterId, charId)).all();
    const logs = db
      .select()
      .from(changeLogs)
      .where(eq(changeLogs.characterId, charId))
      .orderBy(desc(changeLogs.createdAt))
      .all();

    return NextResponse.json({
      character: {
        ...char,
        abilities: charAbilities,
        changeLogs: logs,
        visualSheetParsed: char.visualSheet ? JSON.parse(char.visualSheet) : {},
        roleOptionsParsed: char.roleOptions ? JSON.parse(char.roleOptions) : [],
      },
    });
  } catch (error: unknown) {
    console.error("Failed to load character details:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดตัวละคร";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  try {
    const { id: projectId, charId } = await params;
    const body = await req.json();
    const validated = UpdateCharacterSchema.parse(body);

    const oldChar = db.select().from(characters).where(eq(characters.id, charId)).get();
    if (!oldChar) {
      return NextResponse.json({ error: "ไม่พบข้อมูลตัวละคร" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      ...validated,
      updatedAt: now,
    };

    if (validated.visualSheet) {
      updateData.visualSheet = JSON.stringify(validated.visualSheet);
    }
    delete updateData.abilities;

    db.update(characters)
      .set(updateData)
      .where(eq(characters.id, charId))
      .run();

    // If abilities provided, sync them
    if (validated.abilities) {
      db.delete(abilities).where(eq(abilities.characterId, charId)).run();
      for (const ab of validated.abilities) {
        db.insert(abilities)
          .values({
            id: ab.id || crypto.randomUUID(),
            characterId: charId,
            name: ab.name,
            origin: ab.origin || "",
            linkToPersonality: ab.linkToPersonality || "",
            cost: ab.cost || "",
            gainedAtPart: ab.gainedAtPart || 1,
          })
          .run();
      }
    }

    // SYNC DATA ACROSS THE PROJECT:
    // If name or realNickname or avatarUrl changed, sync with collaborators and scenes!
    const oldName = oldChar.name;
    const newName = validated.name || oldChar.name;
    const oldNickname = oldChar.realNickname || "";
    const newNickname = validated.realNickname !== undefined ? validated.realNickname : oldNickname;

    // 1. Sync Collaborators
    try {
      db.update(collaborators)
        .set({
          ...(validated.name ? { name: validated.name } : {}),
          ...(validated.realNickname !== undefined ? { nickname: validated.realNickname } : {}),
          ...(validated.avatarUrl !== undefined ? { avatarUrl: validated.avatarUrl } : {}),
        })
        .where(eq(collaborators.characterId, charId))
        .run();
    } catch (collabErr) {
      console.warn("Could not sync collaborator:", collabErr);
    }

    // 2. Sync Scenes (charactersPresent & contentMarkdown dialogues)
    if ((oldName !== newName && validated.name) || (oldNickname !== newNickname && validated.realNickname !== undefined)) {
      try {
        const projectParts = db.select().from(parts).where(eq(parts.projectId, projectId)).all();
        for (const part of projectParts) {
          const partScenes = db.select().from(scenes).where(eq(scenes.partId, part.id)).all();
          for (const sc of partScenes) {
            let updatedContent = sc.contentMarkdown || "";
            let updatedChars = sc.charactersPresent || "";
            let changed = false;

            // Sync charactersPresent
            if (updatedChars) {
              if (oldName !== newName && validated.name) {
                if (updatedChars.startsWith("[")) {
                  try {
                    const parsed: string[] = JSON.parse(updatedChars);
                    const mapped = parsed.map((n) => (n === oldName ? newName : n));
                    updatedChars = JSON.stringify(mapped);
                    changed = true;
                  } catch {}
                } else {
                  const partsArr = updatedChars.split(",").map((s) => s.trim());
                  const mapped = partsArr.map((n) => (n === oldName ? newName : n));
                  updatedChars = mapped.join(", ");
                  changed = true;
                }
              }
              if (oldNickname && newNickname && oldNickname !== newNickname) {
                if (updatedChars.startsWith("[")) {
                  try {
                    const parsed: string[] = JSON.parse(updatedChars);
                    const mapped = parsed.map((n) => (n === oldNickname ? newNickname : n));
                    updatedChars = JSON.stringify(mapped);
                    changed = true;
                  } catch {}
                } else {
                  const partsArr = updatedChars.split(",").map((s) => s.trim());
                  const mapped = partsArr.map((n) => (n === oldNickname ? newNickname : n));
                  updatedChars = mapped.join(", ");
                  changed = true;
                }
              }
            }

            // Sync contentMarkdown dialogues
            if (updatedContent && oldName !== newName && validated.name) {
              const escOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const reg1 = new RegExp(`^(\\*{0,2})${escOld}(\\*{0,2})([:：])`, "gm");
              const reg2 = new RegExp(`^(\\*{0,2})${escOld}(\\*{0,2})\\s*(\\()`, "gm");
              const nextContent = updatedContent.replace(reg1, `$1${newName}$2$3`).replace(reg2, `$1${newName}$2 $3`);
              if (nextContent !== updatedContent) {
                updatedContent = nextContent;
                changed = true;
              }
            }

            if (changed) {
              db.update(scenes)
                .set({
                  contentMarkdown: updatedContent,
                  charactersPresent: updatedChars,
                  updatedAt: now,
                })
                .where(eq(scenes.id, sc.id))
                .run();
            }
          }
        }
      } catch (sceneErr) {
        console.warn("Could not sync scenes for character rename:", sceneErr);
      }
    }

    const updated = db.select().from(characters).where(eq(characters.id, charId)).get();

    return NextResponse.json({
      success: true,
      character: updated,
    });
  } catch (error: unknown) {
    console.error("Failed to update character:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขตัวละคร";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  try {
    const { charId } = await params;
    db.delete(characters).where(eq(characters.id, charId)).run();

    return NextResponse.json({
      success: true,
      message: "ลบตัวละครสำเร็จ",
    });
  } catch (error: unknown) {
    console.error("Failed to delete character:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบตัวละคร";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
