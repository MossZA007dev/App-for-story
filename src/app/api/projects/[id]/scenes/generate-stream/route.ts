import { NextRequest } from "next/server";
import { assembleStoryPrompt } from "@/lib/ai/storyPipeline";
import { getAnthropicClient } from "@/lib/ai/anthropic";
import { z } from "zod";

const GenerateStreamSchema = z.object({
  partId: z.string().min(1),
  sceneId: z.string().optional(),
  sceneTitle: z.string().min(1),
  location: z.string().optional().default(""),
  charactersPresent: z.array(z.string()).optional().default([]),
  directorsNote: z.string().optional().default(""),
  targetWords: z.number().optional().default(1200),
  actionType: z.enum(["write_next", "regenerate", "expand", "continue"]).optional().default("write_next"),
  existingContent: z.string().optional().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const validated = GenerateStreamSchema.parse(body);

    const { systemPrompt, userPrompt, model, temperature } = await assembleStoryPrompt({
      projectId,
      partId: validated.partId,
      sceneId: validated.sceneId,
      sceneTitle: validated.sceneTitle,
      location: validated.location,
      charactersPresent: validated.charactersPresent,
      directorsNote: validated.directorsNote,
      targetWords: validated.targetWords,
      actionType: validated.actionType,
      existingContent: validated.existingContent,
    });

    const { client } = await getAnthropicClient();

    // Create Claude stream
    const anthropicStream = client.messages.stream({
      model,
      max_tokens: 4096,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const encoder = new TextEncoder();
    const customReadableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of anthropicStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const text = chunk.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (streamError) {
          console.error("Stream generation error:", streamError);
          const errorMsg = streamError instanceof Error ? streamError.message : "เกิดข้อผิดพลาดในการสตรีมเนื้อเรื่อง";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(customReadableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Scene generation error:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเริ่มสร้างฉาก";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
