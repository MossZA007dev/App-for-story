"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Key,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Cpu,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsState {
  anthropicApiKey: string;
  anthropicModel: string;
  geminiApiKey: string;
  geminiModel: string;
  textAiProvider: "claude" | "gemini";
  imageProvider: string;
  imageApiKey: string;
  defaultSceneWords: number;
  temperature: number;
  globalVisualStyle: string;
  hasAnthropicKey: boolean;
  hasGeminiKey: boolean;
  hasImageKey: boolean;
  hasEnvAnthropicKey: boolean;
  hasEnvGeminiKey: boolean;
  hasEnvImageKey: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    anthropicApiKey: "",
    anthropicModel: "claude-3-5-sonnet-20241022",
    geminiApiKey: "",
    geminiModel: "gemini-2.5-flash",
    textAiProvider: "claude",
    imageProvider: "openai",
    imageApiKey: "",
    defaultSceneWords: 1200,
    temperature: 0.7,
    globalVisualStyle:
      "dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed",
    hasAnthropicKey: false,
    hasGeminiKey: false,
    hasImageKey: false,
    hasEnvAnthropicKey: false,
    hasEnvGeminiKey: false,
    hasEnvImageKey: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [imageKeyInput, setImageKeyInput] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("โหลดการตั้งค่าไม่สำเร็จ");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        anthropicModel: settings.anthropicModel,
        geminiModel: settings.geminiModel,
        textAiProvider: settings.textAiProvider,
        imageProvider: settings.imageProvider,
        defaultSceneWords: Number(settings.defaultSceneWords),
        temperature: Number(settings.temperature),
        globalVisualStyle: settings.globalVisualStyle,
      };

      if (anthropicKeyInput.trim()) {
        payload.anthropicApiKey = anthropicKeyInput.trim();
      }
      if (geminiKeyInput.trim()) {
        payload.geminiApiKey = geminiKeyInput.trim();
      }
      if (imageKeyInput.trim()) {
        payload.imageApiKey = imageKeyInput.trim();
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      setSettings((prev) => ({
        ...prev,
        ...data.settings,
      }));
      setAnthropicKeyInput("");
      setGeminiKeyInput("");
      setImageKeyInput("");

      toast.success("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "บันทึกล้มเหลว";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-8 pb-24">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-amber-400" />
          <span>SYSTEM & AI SETTINGS</span>
        </h1>
        <p className="text-slate-400 text-xs font-thai mt-1">
          กำหนดค่า AI Providers (Google Gemini & Anthropic Claude) สำหรับสร้างฉาก วิเคราะห์รูปโปรไฟล์เพื่อน และสร้างภาพประกอบ
        </p>
      </div>

      {loading ? (
        <div className="h-96 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Text AI Provider Selection */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 bg-slate-900/50 space-y-3">
            <label className="text-xs font-bold text-amber-300 font-heading flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>DEFAULT STORY WRITER AI ENGINE (โมเดลหลักสำหรับแต่งบทละคร & ฉาก)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-thai text-xs">
              <label
                onClick={() => setSettings((p) => ({ ...p, textAiProvider: "claude" }))}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  settings.textAiProvider === "claude"
                    ? "border-amber-400/80 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="textAiProvider"
                  value="claude"
                  checked={settings.textAiProvider === "claude"}
                  onChange={() => setSettings((p) => ({ ...p, textAiProvider: "claude" }))}
                  className="mt-0.5 accent-amber-400"
                />
                <div>
                  <p className="font-bold text-amber-300 font-sans">Anthropic Claude 3.5 Sonnet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    สำนวนนิยายดาร์กดราม่าคมคาย ภาษาไทยสละสลวย อารมณ์ลึกซึ้ง
                  </p>
                </div>
              </label>

              <label
                onClick={() => setSettings((p) => ({ ...p, textAiProvider: "gemini" }))}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  settings.textAiProvider === "gemini"
                    ? "border-sky-400/80 bg-sky-500/10 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                    : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="textAiProvider"
                  value="gemini"
                  checked={settings.textAiProvider === "gemini"}
                  onChange={() => setSettings((p) => ({ ...p, textAiProvider: "gemini" }))}
                  className="mt-0.5 accent-sky-400"
                />
                <div>
                  <p className="font-bold text-sky-300 font-sans">Google Gemini 2.5 Flash</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    เร็วสูงมาก มี Free Tier และรองรับการดึงรูปโปรไฟล์ของเพื่อนมาเป็น Reference
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 1: Google Gemini API */}
          <div className="cinematic-card rounded-xl p-6 space-y-4 border-sky-900/40 bg-gradient-to-br from-slate-950 via-slate-900/90 to-sky-950/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h2 className="font-heading font-bold text-lg text-white">
                  GOOGLE GEMINI (VISION & MULTIMODAL)
                </h2>
              </div>
              {settings.hasGeminiKey ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>พร้อมใช้งาน</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>ยังไม่มี Key</span>
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-sky-400" />
                    <span>Google Gemini API Key</span>
                  </label>
                  {settings.hasGeminiKey && (
                    <span className="text-xs text-slate-400 font-mono">
                      ปัจจุบัน: {settings.geminiApiKey}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  placeholder={
                    settings.hasGeminiKey
                      ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยน (หรือกรอก Key ใหม่เพื่ออัปเดต)"
                      : "AIzaSy..."
                  }
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-thai pt-0.5">
                  <span className="flex items-center gap-1 text-sky-300">
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>ใช้สำหรับวิเคราะห์รูปหน้าโปรไฟล์เพื่อน และ Imagen 3</span>
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>รับ API Key ฟรีจาก Google AI Studio ↗</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    <span>โมเดล Gemini</span>
                  </label>
                  <select
                    value={settings.geminiModel}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, geminiModel: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                  >
                    <option value="gemini-2.5-flash">
                      Gemini 2.5 Flash (แนะนำ - วิเคราะห์รูปใบหน้าคมชัด & ตอบสนองไว)
                    </option>
                    <option value="gemini-2.0-flash">
                      Gemini 2.0 Flash (โมเดลยอดนิยม เสถียรและประหยัด)
                    </option>
                    <option value="gemini-1.5-pro">
                      Gemini 1.5 Pro (การคิดวิเคราะห์เชิงลึกขั้นสูง)
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    <span>อุณหภูมิความสร้างสรรค์ (Temperature: {settings.temperature})</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.temperature}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>0.1 (ตรงเป๊ะ)</span>
                    <span>0.7 (สมดุล)</span>
                    <span>1.0 (สร้างสรรค์สูงสุด)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Text AI (Anthropic Claude) */}
          <div className="cinematic-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="font-heading font-bold text-lg text-white">
                  ANTHROPIC CLAUDE
                </h2>
              </div>
              {settings.hasAnthropicKey ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>พร้อมใช้งาน</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  <span>ยังไม่มี Key</span>
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Anthropic API Key</span>
                  </label>
                  {settings.hasAnthropicKey && (
                    <span className="text-xs text-slate-400 font-mono">
                      ปัจจุบัน: {settings.anthropicApiKey}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  placeholder={
                    settings.hasAnthropicKey
                      ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยน (หรือกรอก Key ใหม่เพื่ออัปเดต)"
                      : "sk-ant-api03-..."
                  }
                  value={anthropicKeyInput}
                  onChange={(e) => setAnthropicKeyInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>โมเดล Claude</span>
                </label>
                <select
                  value={settings.anthropicModel}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, anthropicModel: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                >
                  <option value="claude-3-5-sonnet-20241022">
                    Claude 3.5 Sonnet (แนะนำสูงสุด - ภาษาไทยดาร์กดราม่าคมคาย)
                  </option>
                  <option value="claude-3-5-haiku-20241022">
                    Claude 3.5 Haiku (เร็ว ประหยัด Token เหมาะสำหรับทดสอบไวๆ)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Image AI Provider */}
          <div className="cinematic-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <h2 className="font-heading font-bold text-lg text-white">
                  IMAGE AI: VISUAL PROVIDER
                </h2>
              </div>
              {settings.imageProvider === "gemini" && settings.hasGeminiKey ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>พร้อมสร้างภาพ (Gemini Imagen 3)</span>
                </span>
              ) : settings.hasImageKey || settings.imageProvider === "mock" ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>พร้อมสร้างภาพ</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>รอระบุ API Key</span>
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    เลือก Image Provider Adapter
                  </label>
                  <select
                    value={settings.imageProvider}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, imageProvider: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                  >
                    <option value="gemini">Google Gemini (Imagen 3) - แนะนำสำหรับการอ้างอิงรูปหน้าเพื่อน</option>
                    <option value="openai">OpenAI (DALL-E 3) - มาตรฐาน HD</option>
                    <option value="replicate">Replicate (FLUX.1 Schnell / Dev)</option>
                    <option value="stability">Stability AI (SD3 / SDXL)</option>
                    <option value="mock">Local Mock Provider (ทดสอบโดยไม่เสียเครดิต API)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>{settings.imageProvider === "gemini" ? "Image API Key (ใช้ Gemini Key อัตโนมัติ)" : "Image API Key"}</span>
                    </label>
                    {settings.hasImageKey && settings.imageProvider !== "gemini" && (
                      <span className="text-xs text-slate-400 font-mono">
                        ปัจจุบัน: {settings.imageApiKey}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    disabled={settings.imageProvider === "mock" || settings.imageProvider === "gemini"}
                    placeholder={
                      settings.imageProvider === "gemini"
                        ? "ใช้ Gemini API Key จากด้านบนโดยตรง ไม่ต้องกรอกซ้ำ"
                        : settings.imageProvider === "mock"
                        ? "โหมด Mock ไม่จำเป็นต้องใช้ API Key"
                        : settings.hasImageKey
                        ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยน (หรือกรอก Key ใหม่เพื่ออัปเดต)"
                        : "sk-proj-..."
                    }
                    value={imageKeyInput}
                    onChange={(e) => setImageKeyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  Global Visual Style Guide (สไตล์ภาพรวมทุกฉาก)
                </label>
                <input
                  type="text"
                  value={settings.globalVisualStyle}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, globalVisualStyle: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 font-thai">
                  * Style Guide นี้จะถูกผนวกเข้ากับทุก Prompt ภาพ พร้อมกับลักษณะเด่นของรูปหน้าเพื่อนในทีม
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Cost & Token Estimation Info */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-heading">
              <DollarSign className="w-4 h-4" />
              <span>ESTIMATED USAGE & TOKEN GUIDE (การประเมินค่าใช้จ่ายโดยประมาณ)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-thai text-slate-400">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <p className="text-slate-300 font-semibold mb-1">Google Gemini (Flash + Vision)</p>
                <p>วิเคราะห์รูปโปรไฟล์ + สตรีมบท:</p>
                <p>มี Free Tier สูงสุด 15 RPM</p>
                <p className="text-sky-400 font-mono mt-1 font-semibold">ฟรี / ประหยัดมาก</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <p className="text-slate-300 font-semibold mb-1">Claude 3.5 Sonnet</p>
                <p>เขียนฉากดาร์กดราม่า 1,200 คำ:</p>
                <p>Prompt + Output: ~4,000 tokens</p>
                <p className="text-amber-400 font-mono mt-1 font-semibold">~$0.03 / ฉาก</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <p className="text-slate-300 font-semibold mb-1">การสร้างภาพฉาก (Imagen 3 / DALL-E)</p>
                <p>ความละเอียด 1024x1024:</p>
                <p>Imagen 3: ~$0.03 / ภาพ</p>
                <p className="text-amber-400 font-mono mt-1 font-semibold">DALL-E 3: ~$0.04 / ภาพ</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors font-thai shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
