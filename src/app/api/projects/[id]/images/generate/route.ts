import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, scenes, characters, images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getImageProvider } from "@/lib/ai/images";
import { enrichPromptWithAvatars, CharacterAvatarReference } from "@/lib/ai/gemini";
import crypto from "crypto";
import { z } from "zod";

const GenerateImageRequestSchema = z.object({
  sceneId: z.string().optional(),
  characterId: z.string().optional(),
  characterIds: z.array(z.string()).optional(),
  useAvatarReferences: z.boolean().optional().default(true),
  provider: z.string().optional(),
  prompt: z.string().min(1, "ต้องระบุ Prompt"),
  negativePrompt: z.string().optional().default(""),
  kind: z.enum(["portrait", "scene", "cover", "movie_still", "reference"]).default("scene"),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const validated = GenerateImageRequestSchema.parse(body);

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

    // 1. Gather characters to use as avatar references
    const allProjectCharacters = db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .all();

    const selectedCharRefs: CharacterAvatarReference[] = [];

    if (validated.useAvatarReferences) {
      if (validated.characterIds && validated.characterIds.length > 0) {
        // Specific character IDs requested
        for (const cid of validated.characterIds) {
          const found = allProjectCharacters.find((c) => c.id === cid);
          if (found && found.avatarUrl) {
            selectedCharRefs.push({
              id: found.id,
              name: found.name,
              nickname: found.realNickname || found.name,
              role: found.chosenRole || "",
              avatarUrl: found.avatarUrl,
            });
          }
        }
      } else if (validated.characterId) {
        // Single character requested
        const found = allProjectCharacters.find((c) => c.id === validated.characterId);
        if (found && found.avatarUrl) {
          selectedCharRefs.push({
            id: found.id,
            name: found.name,
            nickname: found.realNickname || found.name,
            role: found.chosenRole || "",
            avatarUrl: found.avatarUrl,
          });
        }
      } else if (validated.sceneId) {
        // Scene ID provided: check charactersPresent in that scene
        const scene = db.select().from(scenes).where(eq(scenes.id, validated.sceneId)).get();
        if (scene) {
          let names: string[] = [];
          try {
            const cp = scene.charactersPresent || "";
            if (cp.startsWith("[")) {
              names = JSON.parse(cp);
            } else if (cp) {
              names = cp.split(",").map((s) => s.trim()).filter(Boolean);
            }
          } catch {
            names = [];
          }

          for (const char of allProjectCharacters) {
            if (!char.avatarUrl) continue;
            const matchesPresent =
              names.includes(char.name) ||
              (char.realNickname && names.includes(char.realNickname)) ||
              names.includes(char.id);

            if (matchesPresent) {
              selectedCharRefs.push({
                id: char.id,
                name: char.name,
                nickname: char.realNickname || char.name,
                role: char.chosenRole || "",
                avatarUrl: char.avatarUrl,
              });
            }
          }

          // If no match found from charactersPresent, include any characters with avatars mentioned in prompt
          if (selectedCharRefs.length === 0) {
            for (const char of allProjectCharacters) {
              if (!char.avatarUrl) continue;
              const n1 = char.name.toLowerCase();
              const n2 = (char.realNickname || "").toLowerCase();
              const pLower = validated.prompt.toLowerCase();
              if (pLower.includes(n1) || (n2 && pLower.includes(n2))) {
                selectedCharRefs.push({
                  id: char.id,
                  name: char.name,
                  nickname: char.realNickname || char.name,
                  role: char.chosenRole || "",
                  avatarUrl: char.avatarUrl,
                });
              }
            }
          }
        }
      }
    }

    // Combine prompt with project style guide
    const basePrompt = project.styleGuide
      ? `${validated.prompt}, ${project.styleGuide}`
      : validated.prompt;

    // 2. Multimodal Face & Visual Enrichment with Gemini
    let promptToGenerate = basePrompt;
    let referencedNames: string[] = [];

    if (selectedCharRefs.length > 0) {
      try {
        const enriched = await enrichPromptWithAvatars(basePrompt, selectedCharRefs);
        promptToGenerate = enriched.enrichedPrompt;
        referencedNames = enriched.referencedNames;
      } catch (enrichErr) {
        console.warn("Avatar enrichment skipped:", enrichErr);
      }
    }

    // 3. Generate the Image using the selected/configured provider
    const provider = await getImageProvider(validated.provider);

    const result = await provider.generateImage({
      prompt: promptToGenerate,
      negativePrompt: validated.negativePrompt,
      size: validated.size || "1024x1024",
    });

    const imageId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(images)
      .values({
        id: imageId,
        projectId,
        sceneId: validated.sceneId || null,
        characterId: validated.characterId || null,
        prompt: validated.prompt,
        negativePrompt: validated.negativePrompt,
        provider: result.provider,
        seed: result.seed,
        filePath: result.url,
        kind: validated.kind,
        approved: 0,
        metadata: JSON.stringify({
          revisedPrompt: result.revisedPrompt,
          styleGuideUsed: project.styleGuide,
          referencedCharacters: referencedNames,
          enrichedPrompt: promptToGenerate !== basePrompt ? promptToGenerate : undefined,
        }),
        createdAt: now,
      })
      .run();

    const created = db.select().from(images).where(eq(images.id, imageId)).get();

    return NextResponse.json({
      success: true,
      image: created,
      referencedCharacters: referencedNames,
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างภาพ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
