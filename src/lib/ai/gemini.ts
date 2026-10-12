import { GoogleGenAI } from "@google/genai";
import { getAppSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";
import crypto from "crypto";
import path from "path";

export interface CharacterAvatarReference {
  id?: string;
  name: string;
  nickname?: string;
  role?: string;
  avatarUrl?: string;
  avatarBuffer?: Buffer;
  mimeType?: string;
}

export async function getGeminiClient(customApiKey?: string): Promise<{ ai: GoogleGenAI; apiKey: string; model: string }> {
  const settings = await getAppSettings();
  const apiKey = customApiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error("ยังไม่ได้ตั้งค่า Google Gemini API Key กรุณาระบุในหน้า Settings (/settings)");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = settings.geminiModel || "gemini-2.5-flash";

  return { ai, apiKey, model };
}

/**
 * Loads an avatar image buffer given its URL (local storage path or external URL)
 */
export async function loadAvatarBuffer(avatarUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!avatarUrl) return null;

  try {
    // If it's a local /api/images/... URL or file name
    const filename = path.basename(avatarUrl.split("?")[0]);
    const localBuf = await storage.getImage(filename);
    if (localBuf) {
      const ext = path.extname(filename).toLowerCase();
      let mimeType = "image/jpeg";
      if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";
      return { buffer: localBuf, mimeType };
    }

    // If it's a full remote URL (http/https)
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      const res = await fetch(avatarUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return { buffer, mimeType: contentType.split(";")[0] };
      }
    }
  } catch (err) {
    console.warn(`Failed to load avatar buffer for ${avatarUrl}:`, err);
  }

  return null;
}

/**
 * Multimodal Face & Profile Analysis:
 * Sends the real profile pictures of characters in the scene to Gemini Vision.
 * Gemini analyzes their facial structure, hair, skin tone, features, and creates
 * a detailed cinematic prompt preserving their real facial likeness for the scene.
 */
export async function enrichPromptWithAvatars(
  basePrompt: string,
  characters: CharacterAvatarReference[],
  customApiKey?: string
): Promise<{ enrichedPrompt: string; referencedNames: string[] }> {
  const referencedNames: string[] = [];
  const validAvatars: Array<{ name: string; role: string; mimeType: string; base64: string }> = [];

  for (const char of characters) {
    let buf = char.avatarBuffer;
    let mime = char.mimeType || "image/jpeg";

    if (!buf && char.avatarUrl) {
      const loaded = await loadAvatarBuffer(char.avatarUrl);
      if (loaded) {
        buf = loaded.buffer;
        mime = loaded.mimeType;
      }
    }

    if (buf) {
      validAvatars.push({
        name: char.nickname || char.name,
        role: char.role || "Hero / Main Character",
        mimeType: mime,
        base64: buf.toString("base64"),
      });
      referencedNames.push(char.nickname || char.name);
    }
  }

  if (validAvatars.length === 0) {
    return { enrichedPrompt: basePrompt, referencedNames: [] };
  }

  try {
    const { ai, model } = await getGeminiClient(customApiKey);

    // Build multimodal contents for Gemini
    const contents: any[] = [];

    validAvatars.forEach((item, idx) => {
      contents.push({
        text: `[REFERENCE PHOTO #${idx + 1}]: Character "${item.name}", Role: "${item.role}".`,
      });
      contents.push({
        inlineData: {
          mimeType: item.mimeType,
          data: item.base64,
        },
      });
    });

    contents.push({
      text: `You are a master cinematic concept artist and character director for epic visual stories.
Above are the REAL profile/avatar photos of the squad characters appearing in this scene.
Carefully examine each person's exact physical likeness:
- Facial anatomy (jawline, cheekbones, nose shape, lip structure, eye shape, eyebrows)
- Hairstyle, hair texture, color
- Skin tone and distinguishing facial features
- Age appearance and emotional aura

Target Scene Context / Action:
"${basePrompt}"

TASK:
Synthesize an ultra-detailed, evocative English visual prompt (around 100-160 words) that depicts this scene with these characters.
Preserve their exact facial features and likeness from their reference photos, seamlessly portraying them in their respective story outfits and roles within the dramatic cinematic scene.
Emphasize cinematic lighting, atmospheric depth, photorealistic textures, 8k resolution film still.
OUTPUT ONLY the synthesized generation prompt, with no greetings or conversational markdown.`,
    });

    const response = await ai.models.generateContent({
      model,
      contents,
    });

    const enriched = response.text?.trim();
    if (enriched && enriched.length > 20) {
      return { enrichedPrompt: enriched, referencedNames };
    }
  } catch (err) {
    console.error("Gemini avatar multimodal enrichment failed, falling back to base prompt:", err);
  }

  return { enrichedPrompt: basePrompt, referencedNames };
}

/**
 * Generate an image using Google Gemini (Imagen 3: imagen-3.0-generate-002)
 */
export async function generateGeminiImage(options: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "1:1" | "16:9" | "4:3" | "3:4" | "9:16";
  customApiKey?: string;
}): Promise<{ buffer: Buffer; url: string; filePath: string; provider: string; revisedPrompt?: string }> {
  const { ai } = await getGeminiClient(options.customApiKey);

  // Supported Imagen 3 aspect ratios: "1:1", "3:4", "4:3", "9:16", "16:9"
  const validAspectRatio = options.aspectRatio || "1:1";

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt: options.prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: validAspectRatio,
      outputMimeType: "image/jpeg",
      negativePrompt: options.negativePrompt || undefined,
    },
  });

  const generatedImage = response.generatedImages?.[0];
  const imageBytes = generatedImage?.image?.imageBytes;

  if (!imageBytes) {
    throw new Error("Google Gemini (Imagen 3) ไม่ได้ส่งข้อมูลภาพกลับมา กรุณาตรวจสอบสิทธิ์ของ API Key");
  }

  const buffer = Buffer.from(imageBytes, "base64");
  const filename = `sf_gemini_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.jpg`;
  const saved = await storage.saveImage(buffer, filename, "image/jpeg");

  return {
    buffer,
    url: saved.url,
    filePath: saved.filePath,
    provider: "gemini",
    revisedPrompt: options.prompt,
  };
}
