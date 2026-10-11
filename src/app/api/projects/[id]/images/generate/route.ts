import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, scenes, images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getImageProvider } from "@/lib/ai/images";
import crypto from "crypto";
import { z } from "zod";

const GenerateImageRequestSchema = z.object({
  sceneId: z.string().optional(),
  characterId: z.string().optional(),
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

    const provider = await getImageProvider();

    // Combine prompt with project style guide
    const fullPrompt = project.styleGuide
      ? `${validated.prompt}, ${project.styleGuide}`
      : validated.prompt;

    const result = await provider.generateImage({
      prompt: fullPrompt,
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
        }),
        createdAt: now,
      })
      .run();

    const created = db.select().from(images).where(eq(images.id, imageId)).get();

    return NextResponse.json({
      success: true,
      image: created,
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างภาพ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
