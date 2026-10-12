import OpenAI from "openai";
import { getAppSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";
import crypto from "crypto";

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  seed?: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

export interface GeneratedImageOutput {
  buffer: Buffer;
  url: string;
  filePath: string;
  seed?: string;
  provider: string;
  revisedPrompt?: string;
}

export interface ImageProvider {
  name: string;
  generateImage(options: GenerateImageOptions): Promise<GeneratedImageOutput>;
}

export class OpenAIImageProvider implements ImageProvider {
  name = "openai";

  async generateImage(options: GenerateImageOptions): Promise<GeneratedImageOutput> {
    const settings = await getAppSettings();
    const apiKey = settings.imageApiKey;

    if (!apiKey) {
      throw new Error("ยังไม่ได้ตั้งค่า Image API Key สำหรับ OpenAI ในหน้า Settings");
    }

    const openai = new OpenAI({ apiKey });

    // Call OpenAI DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: options.prompt,
      n: 1,
      size: options.size || "1024x1024",
      quality: options.quality || "standard",
      response_format: "b64_json",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      throw new Error("OpenAI ไม่ได้ส่งข้อมูลภาพกลับมา");
    }

    const buffer = Buffer.from(imageData.b64_json, "base64");
    const filename = `sf_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`;
    const saved = await storage.saveImage(buffer, filename, "image/png");

    return {
      buffer,
      url: saved.url,
      filePath: saved.filePath,
      seed: options.seed,
      provider: "openai",
      revisedPrompt: imageData.revised_prompt,
    };
  }
}

import { generateGeminiImage } from "@/lib/ai/gemini";

export class GeminiImageProvider implements ImageProvider {
  name = "gemini";

  async generateImage(options: GenerateImageOptions): Promise<GeneratedImageOutput> {
    let aspectRatio: "1:1" | "16:9" | "4:3" | "3:4" | "9:16" = "1:1";
    if (options.size === "1792x1024") aspectRatio = "16:9";
    else if (options.size === "1024x1792") aspectRatio = "9:16";

    const result = await generateGeminiImage({
      prompt: options.prompt,
      negativePrompt: options.negativePrompt,
      aspectRatio,
    });

    return {
      buffer: result.buffer,
      url: result.url,
      filePath: result.filePath,
      seed: options.seed,
      provider: "gemini",
      revisedPrompt: result.revisedPrompt,
    };
  }
}

// Fallback/Mock provider for local testing without spending API credits
export class MockImageProvider implements ImageProvider {
  name = "mock";

  async generateImage(options: GenerateImageOptions): Promise<GeneratedImageOutput> {
    // Generate a simple SVG canvas placeholder for testing
    const width = 1024;
    const height = 1024;
    const textSafe = options.prompt.slice(0, 80).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="50%" stop-color="#1f2937"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="#f6c453" stroke-width="2" opacity="0.4"/>
      <text x="50%" y="45%" font-family="sans-serif" font-size="28" fill="#f6c453" text-anchor="middle" font-weight="bold">SAGA FORGE CINEMATIC</text>
      <text x="50%" y="52%" font-family="sans-serif" font-size="18" fill="#9ca3af" text-anchor="middle">Generated Concept Scene</text>
      <foreignObject x="100" y="580" width="${width - 200}" height="300">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color: #cbd5e1; font-family: sans-serif; font-size: 16px; text-align: center; line-height: 1.5; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 8px;">
          ${textSafe}...
        </div>
      </foreignObject>
    </svg>`;

    const buffer = Buffer.from(svg, "utf-8");
    const filename = `sf_mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.svg`;
    const saved = await storage.saveImage(buffer, filename, "image/svg+xml");

    return {
      buffer,
      url: saved.url,
      filePath: saved.filePath,
      seed: options.seed || "12345",
      provider: "mock",
    };
  }
}

export async function getImageProvider(customProviderName?: string): Promise<ImageProvider> {
  const settings = await getAppSettings();
  const providerName = customProviderName || settings.imageProvider || "openai";

  if (providerName === "gemini") {
    return new GeminiImageProvider();
  }
  if (providerName === "mock") {
    return new MockImageProvider();
  }
  if (providerName === "openai") {
    return new OpenAIImageProvider();
  }

  // Default to Gemini if OpenAI key missing but Gemini key exists
  if (!settings.imageApiKey && settings.geminiApiKey) {
    return new GeminiImageProvider();
  }

  // Default to OpenAI provider
  return new OpenAIImageProvider();
}
