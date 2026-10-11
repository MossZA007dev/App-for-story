import { db } from "./db";
import { appSettings } from "./db/schema";
import { eq } from "drizzle-orm";

export interface SettingsData {
  anthropicApiKey: string;
  anthropicModel: string;
  imageProvider: string;
  imageApiKey: string;
  defaultSceneWords: number;
  temperature: number;
  globalVisualStyle: string;
  hasEnvAnthropicKey: boolean;
  hasEnvImageKey: boolean;
}

export async function getAppSettings(): Promise<SettingsData> {
  const row = db.select().from(appSettings).where(eq(appSettings.id, "global")).get();

  const envAnthropicKey = process.env.ANTHROPIC_API_KEY || "";
  const envImageKey = process.env.IMAGE_API_KEY || "";
  const envImageProvider = process.env.IMAGE_PROVIDER || "openai";

  const anthropicApiKey = row?.anthropicApiKey || envAnthropicKey;
  const imageApiKey = row?.imageApiKey || envImageKey;
  const imageProvider = row?.imageProvider || envImageProvider;
  const anthropicModel = row?.anthropicModel || "claude-3-5-sonnet-20241022";
  const defaultSceneWords = row?.defaultSceneWords ?? 1200;
  const temperature = row?.temperature ?? 0.7;
  const globalVisualStyle =
    row?.globalVisualStyle ||
    "dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed";

  return {
    anthropicApiKey,
    anthropicModel,
    imageProvider,
    imageApiKey,
    defaultSceneWords,
    temperature,
    globalVisualStyle,
    hasEnvAnthropicKey: !!envAnthropicKey,
    hasEnvImageKey: !!envImageKey,
  };
}

export async function updateAppSettings(data: Partial<Omit<SettingsData, "hasEnvAnthropicKey" | "hasEnvImageKey">>) {
  const now = new Date().toISOString();
  const existing = db.select().from(appSettings).where(eq(appSettings.id, "global")).get();

  if (existing) {
    db.update(appSettings)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(appSettings.id, "global"))
      .run();
  } else {
    db.insert(appSettings)
      .values({
        id: "global",
        anthropicApiKey: data.anthropicApiKey || "",
        anthropicModel: data.anthropicModel || "claude-3-5-sonnet-20241022",
        imageProvider: data.imageProvider || "openai",
        imageApiKey: data.imageApiKey || "",
        defaultSceneWords: data.defaultSceneWords || 1200,
        temperature: data.temperature ?? 0.7,
        globalVisualStyle:
          data.globalVisualStyle ||
          "dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed",
        updatedAt: now,
      })
      .run();
  }

  return getAppSettings();
}
