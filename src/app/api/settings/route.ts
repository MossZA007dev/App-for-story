import { NextRequest, NextResponse } from "next/server";
import { getAppSettings, updateAppSettings } from "@/lib/settings";
import { z } from "zod";

const SettingsUpdateSchema = z.object({
  anthropicApiKey: z.string().optional(),
  anthropicModel: z.string().optional(),
  imageProvider: z.string().optional(),
  imageApiKey: z.string().optional(),
  defaultSceneWords: z.number().min(300).max(5000).optional(),
  temperature: z.number().min(0).max(1).optional(),
  globalVisualStyle: z.string().optional(),
});

export async function GET() {
  try {
    const settings = await getAppSettings();

    // Mask API keys for safe display in UI
    const maskedAnthropicKey = settings.anthropicApiKey
      ? `••••••••${settings.anthropicApiKey.slice(-4)}`
      : "";
    const maskedImageKey = settings.imageApiKey
      ? `••••••••${settings.imageApiKey.slice(-4)}`
      : "";

    return NextResponse.json({
      ...settings,
      anthropicApiKey: maskedAnthropicKey,
      imageApiKey: maskedImageKey,
      hasAnthropicKey: !!settings.anthropicApiKey,
      hasImageKey: !!settings.imageApiKey,
    });
  } catch (error) {
    console.error("Failed to load settings:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลการตั้งค่าได้" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = SettingsUpdateSchema.parse(body);

    // If masked placeholder is submitted, do not overwrite with masked value
    const updatePayload: Record<string, unknown> = { ...validated };
    if (validated.anthropicApiKey && validated.anthropicApiKey.startsWith("••••")) {
      delete updatePayload.anthropicApiKey;
    }
    if (validated.imageApiKey && validated.imageApiKey.startsWith("••••")) {
      delete updatePayload.imageApiKey;
    }

    const updated = await updateAppSettings(updatePayload);

    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        anthropicApiKey: updated.anthropicApiKey ? `••••••••${updated.anthropicApiKey.slice(-4)}` : "",
        imageApiKey: updated.imageApiKey ? `••••••••${updated.imageApiKey.slice(-4)}` : "",
        hasAnthropicKey: !!updated.anthropicApiKey,
        hasImageKey: !!updated.imageApiKey,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to update settings:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
