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
} from "lucide-react";
import { toast } from "sonner";

interface SettingsState {
  anthropicApiKey: string;
  anthropicModel: string;
  imageProvider: string;
  imageApiKey: string;
  defaultSceneWords: number;
  temperature: number;
  globalVisualStyle: string;
  hasAnthropicKey: boolean;
  hasImageKey: boolean;
  hasEnvAnthropicKey: boolean;
  hasEnvImageKey: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    anthropicApiKey: "",
    anthropicModel: "claude-3-5-sonnet-20241022",
    imageProvider: "openai",
    imageApiKey: "",
    defaultSceneWords: 1200,
    temperature: 0.7,
    globalVisualStyle:
      "dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed",
    hasAnthropicKey: false,
    hasImageKey: false,
    hasEnvAnthropicKey: false,
    hasEnvImageKey: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
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
        imageProvider: settings.imageProvider,
        defaultSceneWords: Number(settings.defaultSceneWords),
        temperature: Number(settings.temperature),
        globalVisualStyle: settings.globalVisualStyle,
      };

      if (anthropicKeyInput.trim()) {
        payload.anthropicApiKey = anthropicKeyInput.trim();
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-amber-400" />
          <span>SYSTEM & AI SETTINGS</span>
        </h1>
        <p className="text-slate-400 text-xs font-thai mt-1">
          กำหนดค่า Anthropic Claude สำหรับการเขียนเนื้อเรื่อง, Image Provider สำหรับภาพประกอบ,
          และพารามิเตอร์การเล่าเรื่อง
        </p>
      </div>

      {loading ? (
        <div className="h-96 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Text AI (Anthropic Claude) */}
          <div className="cinematic-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="font-heading font-bold text-lg text-white">
                  TEXT AI: ANTHROPIC CLAUDE
                </h2>
              </div>
              {settings.hasAnthropicKey ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>พร้อมใช้งาน</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-950/80 text-red-300 border border-red-800/60">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
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
                <p className="text-[11px] text-slate-500 font-thai">
                  * API Key ถูกเข้ารหัสและส่งผ่าน Server Route ฝั่ง Backend เท่านั้น ไม่เปิดเผยต่อ Client
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
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
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>0.1 (เคร่งครัดตามกฎ)</span>
                    <span>0.7 (สมดุลคมคาย)</span>
                    <span>1.0 (อิสระสร้างสรรค์)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Image AI Provider */}
          <div className="cinematic-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <h2 className="font-heading font-bold text-lg text-white">
                  IMAGE AI: VISUAL PROVIDER
                </h2>
              </div>
              {settings.hasImageKey || settings.imageProvider === "mock" ? (
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
                    <option value="openai">OpenAI (DALL-E 3) - ค่าเริ่มต้นแนะนำ</option>
                    <option value="replicate">Replicate (FLUX.1 Schnell / Dev)</option>
                    <option value="stability">Stability AI (SD3 / SDXL)</option>
                    <option value="mock">Local Mock Provider (ทดสอบโดยไม่เสียเครดิต API)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Image API Key</span>
                    </label>
                    {settings.hasImageKey && (
                      <span className="text-xs text-slate-400 font-mono">
                        ปัจจุบัน: {settings.imageApiKey}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    disabled={settings.imageProvider === "mock"}
                    placeholder={
                      settings.imageProvider === "mock"
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
                  * Style Guide นี้จะถูกผนวกเข้ากับทุก Prompt ภาพ พร้อมกับลักษณะเด่นของตัวละคร
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Cost & Token Estimation Info */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-heading">
              <DollarSign className="w-4 h-4" />
              <span>ESTIMATED USAGE & TOKEN GUIDE (การประเมินค่าใช้จ่ายโดยประมาณ)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-thai text-slate-400">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <p className="text-slate-300 font-semibold mb-1">การเขียน 1 ฉาก (1,200 คำ)</p>
                <p>Prompt: ~2,500 tokens</p>
                <p>Output: ~1,500 tokens</p>
                <p className="text-amber-400 font-mono mt-1 font-semibold">~$0.03 / ฉาก</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <p className="text-slate-300 font-semibold mb-1">Continuity Check & Ledger</p>
                <p>วิเคราะห์บริบท & สรุป:</p>
                <p>Input + Output: ~1,800 tokens</p>
                <p className="text-amber-400 font-mono mt-1 font-semibold">~$0.01 / ฉาก</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <p className="text-slate-300 font-semibold mb-1">การสร้างภาพประกอบ</p>
                <p>DALL-E 3 Standard HD:</p>
                <p>ความละเอียด 1024x1024</p>
                <p className="text-amber-400 font-mono mt-1 font-semibold">~$0.04 / ภาพ</p>
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
