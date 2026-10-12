import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { soundEffects, projects, parts, scenes } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { audioStorage } from "@/lib/storage";
import { extractYouTubeVideoId } from "@/lib/audio/audioHelpers";
import crypto from "crypto";
import path from "path";

// Initial cinematic preset SFX if project sound effects library is empty
const INITIAL_PRESET_SFX = [
  {
    name: "🗡️ คมดาบ / ชักดาบออกจากฝัก (Blade Unsheathe)",
    category: "weapon",
    audioUrl: "synth:blade",
    sourceType: "synth" as const,
    volume: 0.85,
    tags: JSON.stringify(["ดาบ", "ต่อสู้", "อาวุธ", "action"]),
    description: "เสียงโลหะเสียดสีคมกริบ เหมาะสำหรับจังหวะเริ่มการประลองหรือชักอาวุธ",
  },
  {
    name: "⚡ ฟ้าผ่าสะเทือนขวัญ (Thunder Crash)",
    category: "shock",
    audioUrl: "synth:thunder",
    sourceType: "synth" as const,
    volume: 0.9,
    tags: JSON.stringify(["ฟ้าผ่า", "ระทึก", "ธรรมชาติ", "shock"]),
    description: "เสียงสายฟ้าฟาดกึกก้อง เหมาะกับฉากเปิดเผยความจริง หรือความโกรธเกรี้ยว",
  },
  {
    name: "💓 เสียงหัวใจเต้นตึงเครียด (Tension Heartbeat)",
    category: "emotion",
    audioUrl: "synth:heartbeat",
    sourceType: "synth" as const,
    volume: 0.8,
    tags: JSON.stringify(["หัวใจ", "ตึงเครียด", "ระทึก", "suspense"]),
    description: "เสียงจังหวะหัวใจบีบคั้น เหมาะสำหรับฉากซุ่มซ่อน ลุ้นระทึก หรือใกล้ตาย",
  },
  {
    name: "🌧️ สายฝนและพายุหมองหม่น (Melancholy Rain)",
    category: "atmosphere",
    audioUrl: "synth:rain",
    sourceType: "synth" as const,
    volume: 0.7,
    tags: JSON.stringify(["ฝน", "บรรยากาศ", "เศร้า", "weather"]),
    description: "เสียงหยาดฝนโปรยปรายสะท้อนความสูญเสียและบรรยากาศอันเหน็บหนาว",
  },
  {
    name: "⚔️ มหากาพย์กลองศึก (War Drums)",
    category: "action",
    audioUrl: "synth:war",
    sourceType: "synth" as const,
    volume: 0.85,
    tags: JSON.stringify(["ศึก", "กลอง", "สงคราม", "epic"]),
    description: "เสียงกลองสะเทือนดินประกาศการบุกเข้าประจัญบานของกองทัพ",
  },
  {
    name: "🌑 เสียงเงามืดกระซิบ (Shadows Ethereal)",
    category: "horror",
    audioUrl: "synth:shadows",
    sourceType: "synth" as const,
    volume: 0.75,
    tags: JSON.stringify(["เงามืด", "ลึกลับ", "เวทมนตร์", "mystery"]),
    description: "เสียงมิติวิญญาณแห่งความลี้ลับ เหมาะสำหรับฉากเวทมนตร์ดำหรือสถานที่ต้องสาป",
  },
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return NextResponse.json({ error: "ไม่พบข้อมูลโปรเจกต์" }, { status: 404 });
    }

    let items = db
      .select()
      .from(soundEffects)
      .where(eq(soundEffects.projectId, projectId))
      .orderBy(desc(soundEffects.createdAt))
      .all();

    // If never initialized before and empty, auto-seed starter cinematic presets once
    if (!project.sfxInitialized && items.length === 0) {
      const now = new Date().toISOString();
      for (const preset of INITIAL_PRESET_SFX) {
        db.insert(soundEffects)
          .values({
            id: crypto.randomUUID(),
            projectId,
            name: preset.name,
            category: preset.category,
            audioUrl: preset.audioUrl,
            sourceType: preset.sourceType,
            volume: preset.volume,
            tags: preset.tags,
            description: preset.description,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      db.update(projects)
        .set({ sfxInitialized: 1 })
        .where(eq(projects.id, projectId))
        .run();

      items = db
        .select()
        .from(soundEffects)
        .where(eq(soundEffects.projectId, projectId))
        .orderBy(desc(soundEffects.createdAt))
        .all();
    }

    // Auto-scan and sync music links from scenes and dialogue beats into Sound & Music Vault
    try {
      const projectParts = db
        .select({ id: parts.id })
        .from(parts)
        .where(eq(parts.projectId, projectId))
        .all();
      const partIds = projectParts.map((p) => p.id);

      if (partIds.length > 0) {
        const projectScenes = db
          .select({
            id: scenes.id,
            title: scenes.title,
            bgmUrl: scenes.bgmUrl,
            bgmTitle: scenes.bgmTitle,
            dialogueBindings: scenes.dialogueBindings,
          })
          .from(scenes)
          .where(inArray(scenes.partId, partIds))
          .all();

        const existingUrls = new Set(items.map((it) => it.audioUrl.trim()));
        let hasNewMusic = false;
        const now = new Date().toISOString();

        for (const sc of projectScenes) {
          // 1. Scene BGM Link
          if (sc.bgmUrl && sc.bgmUrl.trim() && !existingUrls.has(sc.bgmUrl.trim())) {
            const cleanUrl = sc.bgmUrl.trim();
            const isYt = Boolean(extractYouTubeVideoId(cleanUrl));
            const newId = crypto.randomUUID();
            db.insert(soundEffects)
              .values({
                id: newId,
                projectId,
                name: sc.bgmTitle || (isYt ? "เพลงประกอบฉาก (YouTube)" : "เพลงประกอบประจำฉาก"),
                category: "music",
                audioUrl: cleanUrl,
                sourceType: isYt ? "url" : (cleanUrl.startsWith("http") ? "url" : "upload"),
                volume: 0.8,
                tags: JSON.stringify(["เพลง", "BGM", "เพลงประจำฉาก"]),
                description: `เพลงประกอบจากฉาก: ${sc.title || "ฉากนิยาย"}`,
                createdAt: now,
                updatedAt: now,
              })
              .run();
            existingUrls.add(cleanUrl);
            hasNewMusic = true;
          }

          // 2. Dialogue Beat Audio Links
          if (sc.dialogueBindings) {
            try {
              const bindings =
                typeof sc.dialogueBindings === "string"
                  ? JSON.parse(sc.dialogueBindings)
                  : sc.dialogueBindings;
              if (bindings && typeof bindings === "object") {
                for (const [key, val] of Object.entries(bindings)) {
                  if (key.startsWith("audio_") && typeof val === "string" && val.startsWith("url:")) {
                    const cleanUrl = val.replace(/^url:/, "").trim();
                    if (cleanUrl && !existingUrls.has(cleanUrl)) {
                      const isYt = Boolean(extractYouTubeVideoId(cleanUrl));
                      const newId = crypto.randomUUID();
                      db.insert(soundEffects)
                        .values({
                          id: newId,
                          projectId,
                          name: isYt ? "เพลงประจำบทพูด (YouTube)" : "เพลงประจำบทพูด",
                          category: "music",
                          audioUrl: cleanUrl,
                          sourceType: "url",
                          volume: 0.8,
                          tags: JSON.stringify(["เพลง", "บทพูด", "BGM"]),
                          description: `เพลงที่ผูกกับบทพูดในฉาก: ${sc.title || "ฉากนิยาย"}`,
                          createdAt: now,
                          updatedAt: now,
                        })
                        .run();
                      existingUrls.add(cleanUrl);
                      hasNewMusic = true;
                    }
                  }
                }
              }
            } catch {}
          }
        }

        if (hasNewMusic) {
          items = db
            .select()
            .from(soundEffects)
            .where(eq(soundEffects.projectId, projectId))
            .orderBy(desc(soundEffects.createdAt))
            .all();
        }
      }
    } catch (syncErr) {
      console.warn("Failed to auto-sync scene music to vault:", syncErr);
    }

    return NextResponse.json({
      success: true,
      soundEffects: items,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch sound effects:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดคลังเสียง SFX";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return NextResponse.json({ error: "ไม่พบข้อมูลโปรเจกต์" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";
    let name = "";
    let category = "general";
    let audioUrl = "";
    let sourceType: "upload" | "url" | "synth" = "upload";
    let volume = 0.8;
    let tags = "[]";
    let description = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      name = (formData.get("name") as string)?.trim() || "";
      category = (formData.get("category") as string)?.trim() || "general";
      const customVolume = formData.get("volume") as string | null;
      if (customVolume) volume = Math.max(0, Math.min(1, parseFloat(customVolume)));
      tags = (formData.get("tags") as string)?.trim() || "[]";
      description = (formData.get("description") as string)?.trim() || "";

      if (!file) {
        return NextResponse.json({ error: "กรุณาแนบไฟล์เสียงที่ต้องการอัปโหลด" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || ".mp3";
      const cleanOriginalName = path.basename(file.name, ext);
      if (!name) name = cleanOriginalName;

      const uniqueFilename = `sfx-${projectId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      const saved = await audioStorage.saveAudio(buffer, uniqueFilename);
      audioUrl = saved.url;
      sourceType = "upload";
    } else {
      const body = await req.json();
      name = body.name?.trim() || "";
      category = body.category?.trim() || "general";
      audioUrl = body.audioUrl?.trim() || "";
      sourceType = body.sourceType || "url";
      if (typeof body.volume === "number") volume = Math.max(0, Math.min(1, body.volume));
      if (Array.isArray(body.tags)) tags = JSON.stringify(body.tags);
      else if (body.tags) tags = String(body.tags);
      description = body.description?.trim() || "";

      if (!name) {
        return NextResponse.json({ error: "กรุณาระบุชื่อเสียง SFX" }, { status: 400 });
      }
      if (!audioUrl) {
        return NextResponse.json({ error: "กรุณาระบุลิงก์เสียงหรือไฟล์เสียง" }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    db.insert(soundEffects)
      .values({
        id: newId,
        projectId,
        name,
        category,
        audioUrl,
        sourceType,
        volume,
        tags,
        description,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const created = db.select().from(soundEffects).where(eq(soundEffects.id, newId)).get();

    return NextResponse.json({
      success: true,
      soundEffect: created,
    });
  } catch (error: unknown) {
    console.error("Failed to create sound effect:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกเสียง SFX";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const url = new URL(req.url);
    let sfxId = url.searchParams.get("id") || url.searchParams.get("sfxId");

    if (!sfxId) {
      try {
        const body = await req.json();
        sfxId = body?.id || body?.sfxId;
      } catch {}
    }

    if (!sfxId) {
      return NextResponse.json({ error: "ไม่พบรหัสเสียง SFX ที่ต้องการลบ" }, { status: 400 });
    }

    const item = db
      .select()
      .from(soundEffects)
      .where(eq(soundEffects.id, sfxId))
      .get();

    if (!item) {
      // Idempotent: already deleted
      return NextResponse.json({
        success: true,
        message: "ลบเสียง SFX เรียบร้อยแล้ว",
        alreadyDeleted: true,
      });
    }

    if (item.sourceType === "upload" && item.audioUrl.startsWith("/api/audio/")) {
      const filename = decodeURIComponent(item.audioUrl.replace(/^\/api\/audio\//, ""));
      if (filename) {
        await audioStorage.deleteAudio(filename).catch((err) => {
          console.warn("Could not delete audio file from disk:", err);
        });
      }
    }

    db.delete(soundEffects).where(eq(soundEffects.id, sfxId)).run();

    return NextResponse.json({
      success: true,
      message: "ลบเสียง SFX เรียบร้อยแล้ว",
    });
  } catch (error: unknown) {
    console.error("Failed to delete sound effect via collection route:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบเสียง SFX";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

