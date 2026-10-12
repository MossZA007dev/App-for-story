"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Music,
  Volume2,
  VolumeX,
  Play,
  X,
  Check,
  ChevronDown,
  Search,
  Link2,
  ExternalLink,
  Flame,
  Snowflake,
  Swords,
  Cog,
  Heart,
  CloudRain,
  Zap,
} from "lucide-react";

export interface SfxItem {
  id: string;
  name: string;
  audioUrl: string;
  category?: string;
  volume?: number;
}

interface AudioBindingDropdownProps {
  assignedAudioValue?: string;
  projectSfxList: SfxItem[];
  customSfxMap: Record<string, string>;
  onSelectAudio: (val: string) => void;
  onCustomUrl: () => void;
  onOpenSfxTab: () => void;
  onPreviewAudio?: (val: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  compact?: boolean;
}

const BUILTIN_SYNTH = [
  {
    id: "wildfire",
    name: "เพลิงป่า / ระทึกขวัญ",
    eng: "Wildfire Drone",
    icon: Flame,
    color: "text-amber-400 bg-amber-500/20 border-amber-500/30",
  },
  {
    id: "winter",
    name: "ลมเหมันต์ / เงียบเหงา",
    eng: "Winter Winds",
    icon: Snowflake,
    color: "text-sky-300 bg-sky-500/20 border-sky-500/30",
  },
  {
    id: "war",
    name: "มหากาพย์ศึก / ตื่นเต้น",
    eng: "War Drums",
    icon: Swords,
    color: "text-red-400 bg-red-500/20 border-red-500/30",
  },
  {
    id: "shadows",
    name: "เงามืด / ลึกลับ",
    eng: "Shadows Ethereal",
    icon: Cog,
    color: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  },
  {
    id: "heartbeat",
    name: "หัวใจเต้น / ตึงเครียด",
    eng: "Heartbeat Tension",
    icon: Heart,
    color: "text-rose-400 bg-rose-500/20 border-rose-500/30",
  },
  {
    id: "rain",
    name: "สายฝน / หม่นหมอง",
    eng: "Rain & Melancholy",
    icon: CloudRain,
    color: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  },
];

const BUILTIN_SFX = [
  {
    id: "thunder",
    name: "ฟ้าผ่า / สะเทือนขวัญ",
    eng: "Thunder Impact",
    icon: Zap,
    color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  },
  {
    id: "blade",
    name: "ชักดาบ / คมดาบ",
    eng: "Blade Unsheathe",
    icon: Swords,
    color: "text-cyan-300 bg-cyan-500/20 border-cyan-500/30",
  },
];

export function AudioBindingDropdown({
  assignedAudioValue,
  projectSfxList,
  customSfxMap,
  onSelectAudio,
  onCustomUrl,
  onOpenSfxTab,
  onPreviewAudio,
  isOpen,
  onToggle,
  onClose,
  compact = false,
}: AudioBindingDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "synth" | "sfx" | "music">("all");

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setActiveTab("all");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Compute readable display label for active audio
  const displayLabel = useMemo(() => {
    if (!assignedAudioValue) return "";
    if (assignedAudioValue === "scene_bgm") return "🎶 เพลงประจำฉาก";
    if (assignedAudioValue === "stop") return "⏹️ ดับเพลง (เงียบ)";
    if (assignedAudioValue.startsWith("url:")) {
      const u = assignedAudioValue.replace(/^url:/, "");
      return `🔗 เพลงจากลิงก์: ${u.slice(0, 18)}...`;
    }
    if (assignedAudioValue.startsWith("sfx:")) {
      const sfxId = assignedAudioValue.replace(/^sfx:/, "");
      return customSfxMap[sfxId] || "🔊 เสียงประกอบ SFX";
    }
    const foundSynth = BUILTIN_SYNTH.find((s) => s.id === assignedAudioValue);
    if (foundSynth) return `🎶 ${foundSynth.name}`;
    const foundSfx = BUILTIN_SFX.find((s) => s.id === assignedAudioValue);
    if (foundSfx) return `⚡ ${foundSfx.name}`;
    return assignedAudioValue;
  }, [assignedAudioValue, customSfxMap]);

  // Filtered lists based on search & tab
  const q = searchQuery.toLowerCase().trim();

  const filteredSynth = useMemo(() => {
    if (activeTab === "sfx" || activeTab === "music") return [];
    if (!q) return BUILTIN_SYNTH;
    return BUILTIN_SYNTH.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.eng.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [activeTab, q]);

  const filteredBuiltinSfx = useMemo(() => {
    if (activeTab === "synth" || activeTab === "music") return [];
    if (!q) return BUILTIN_SFX;
    return BUILTIN_SFX.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.eng.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [activeTab, q]);

  const filteredCustomSfx = useMemo(() => {
    if (activeTab === "synth" || activeTab === "music") return [];
    const list = projectSfxList.filter((s) => s.category !== "music");
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeTab, q, projectSfxList]);

  const filteredCustomMusic = useMemo(() => {
    if (activeTab === "synth" || activeTab === "sfx") return [];
    const list = projectSfxList.filter((s) => s.category === "music");
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeTab, q, projectSfxList]);

  const isBound = Boolean(assignedAudioValue);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* TRIGGER BUTTON / PILL */}
      {isBound ? (
        <div className="inline-flex items-center gap-1 animate-fadeIn">
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-[10px] text-purple-300 font-thai font-semibold shadow-sm cursor-pointer transition-all active:scale-95 group/pill ${
              compact ? "px-1.5 py-0.5" : "px-2 py-0.5"
            }`}
            title="คลิกเพื่อเปลี่ยนเพลงหรือเสียงประกอบ"
          >
            <Music className="w-3 h-3 text-purple-400 flex-shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[150px]">
              {displayLabel}
            </span>
            <ChevronDown
              className={`w-2.5 h-2.5 text-purple-400/70 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {onPreviewAudio && assignedAudioValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewAudio(assignedAudioValue);
              }}
              className="p-0.5 hover:text-white text-purple-300 rounded transition-colors"
              title="ทดลองฟังเสียงนี้"
            >
              <Volume2 className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectAudio("");
            }}
            className="p-0.5 hover:text-red-400 text-slate-400 rounded transition-colors"
            title="ยกเลิกเพลงในบทนี้ (คงเพลงเดิม)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1 rounded-lg text-[10px] font-thai border transition-all active:scale-95 group ${
            compact ? "px-1.5 py-0.5" : "px-2 py-0.5"
          } ${
            isOpen
              ? "bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-sm"
              : "text-slate-400 hover:text-purple-300 hover:bg-slate-800/80 border-slate-700/60"
          }`}
          title="เปลี่ยนอารมณ์เพลงหรือใส่เสียงประกอบในประโยคนี้"
        >
          <Music className="w-3 h-3 text-slate-400 group-hover:text-purple-400" />
          <span>+ เพลง</span>
          <ChevronDown
            className={`w-2.5 h-2.5 opacity-60 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* FLOATING POPOVER CARD */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-[330px] sm:w-[380px] bg-[#0c101b]/98 backdrop-blur-2xl border border-purple-500/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200 font-thai p-2.5 space-y-2"
          style={{ maxHeight: "460px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Music className="w-3 h-3" />
              </div>
              <span className="font-bold text-xs text-slate-200">
                เลือกเพลง & บรรยากาศเสียง (Audio / SFX)
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเสียง, บรรยากาศ, SFX, เพลง..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400/80 transition-colors font-thai shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Category Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] font-thai">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-purple-500/25 text-purple-200 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("synth")}
              className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                activeTab === "synth"
                  ? "bg-purple-500/25 text-purple-200 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              บรรยากาศ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sfx")}
              className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                activeTab === "sfx"
                  ? "bg-purple-500/25 text-purple-200 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              SFX
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("music")}
              className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                activeTab === "music"
                  ? "bg-purple-500/25 text-purple-200 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              เพลง BGM
            </button>
          </div>

          {/* Option: Keep Previous Audio (No direct binding) */}
          <button
            type="button"
            onClick={() => {
              onSelectAudio("");
              onClose();
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
              !assignedAudioValue
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs flex-shrink-0">
                ⚪
              </div>
              <div className="min-w-0">
                <div className="text-xs truncate">คงเพลงเดิม (ไม่เปลี่ยน)</div>
                <div className="text-[10px] text-slate-400 font-normal truncate">
                  เล่นเพลงหรือบรรยากาศเดิมต่อเนื่องจากประโยคก่อนหน้า
                </div>
              </div>
            </div>
            {!assignedAudioValue && (
              <Check className="w-4 h-4 text-purple-400 flex-shrink-0 ml-1.5" />
            )}
          </button>

          {/* Scrollable Audio Options List */}
          <div className="overflow-y-auto space-y-3 max-h-56 pr-1 dialogue-scroll flex-1 min-h-0">
            {/* 1. AMBIENT SYNTH */}
            {filteredSynth.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-1 tracking-wider uppercase">
                  บรรยากาศเสียงสังเคราะห์ (Ambient Synth)
                </div>
                {filteredSynth.map((item) => {
                  const Icon = item.icon;
                  const isSelected = assignedAudioValue === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectAudio(item.id);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${item.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {item.name}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono truncate">
                            {item.eng}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {onPreviewAudio && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewAudio(item.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                            title="ทดลองฟัง (Preview)"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. SOUND EFFECTS (SFX) */}
            {(filteredBuiltinSfx.length > 0 || filteredCustomSfx.length > 0) && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-1 tracking-wider uppercase">
                  เอฟเฟกต์เสียง (Sound FX)
                </div>

                {filteredBuiltinSfx.map((item) => {
                  const Icon = item.icon;
                  const isSelected = assignedAudioValue === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectAudio(item.id);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${item.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {item.name}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono truncate">
                            {item.eng}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {onPreviewAudio && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewAudio(item.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                            title="ทดลองฟัง"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredCustomSfx.map((sfx) => {
                  const val = `sfx:${sfx.id}`;
                  const isSelected = assignedAudioValue === val;
                  return (
                    <div
                      key={sfx.id}
                      onClick={() => {
                        onSelectAudio(val);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 flex items-center justify-center flex-shrink-0 text-xs">
                          🔊
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {sfx.name}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">
                            SFX คลังเสียงนิยาย
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {onPreviewAudio && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewAudio(val);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                            title="ทดลองฟัง"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. NOVEL MUSIC / BGM */}
            {filteredCustomMusic.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-1 tracking-wider uppercase">
                  คลังเพลง & BGM ของนิยาย
                </div>
                {filteredCustomMusic.map((sfx) => {
                  const val = `sfx:${sfx.id}`;
                  const isSelected = assignedAudioValue === val;
                  return (
                    <div
                      key={sfx.id}
                      onClick={() => {
                        onSelectAudio(val);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center flex-shrink-0 text-xs">
                          🎵
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {sfx.name}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">
                            เพลงประกอบ (Music)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {onPreviewAudio && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewAudio(val);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                            title="ทดลองฟัง"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. MUSIC CONTROLS (Scene BGM & Stop) */}
            {activeTab === "all" && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-1 tracking-wider uppercase">
                  ควบคุมเพลงพิเศษ
                </div>
                {/* Return to scene BGM */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectAudio("scene_bgm");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-1.5 rounded-xl border text-left transition-all ${
                    assignedAudioValue === "scene_bgm"
                      ? "bg-purple-500/20 text-purple-200 border-purple-500/50 font-bold"
                      : "hover:bg-slate-800/80 text-slate-300 border-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center justify-center text-xs">
                      🎶
                    </div>
                    <div>
                      <div className="text-xs">กลับไปเล่นเพลงประจำฉาก</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        สลับกลับไปเล่นเพลงประจำฉากที่ตั้งไว้
                      </div>
                    </div>
                  </div>
                  {assignedAudioValue === "scene_bgm" && (
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0 ml-1.5" />
                  )}
                </button>

                {/* Cut to silence */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectAudio("stop");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-1.5 rounded-xl border text-left transition-all ${
                    assignedAudioValue === "stop"
                      ? "bg-red-500/20 text-red-200 border-red-500/50 font-bold"
                      : "hover:bg-slate-800/80 text-slate-300 border-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 flex items-center justify-center text-xs">
                      ⏹️
                    </div>
                    <div>
                      <div className="text-xs">ดับเพลง / เงียบสนิท (Cut to Silence)</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        หยุดเพลงและเสียงประกอบทั้งหมดในประโยคนี้
                      </div>
                    </div>
                  </div>
                  {assignedAudioValue === "stop" && (
                    <Check className="w-4 h-4 text-red-400 flex-shrink-0 ml-1.5" />
                  )}
                </button>
              </div>
            )}

            {filteredSynth.length === 0 &&
              filteredBuiltinSfx.length === 0 &&
              filteredCustomSfx.length === 0 &&
              filteredCustomMusic.length === 0 && (
                <div className="p-4 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <p className="text-xs">ไม่พบเสียงที่ตรงกับการค้นหา "{searchQuery}"</p>
                </div>
              )}
          </div>

          {/* Quick External URL & Vault Links */}
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onCustomUrl();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-purple-300 hover:bg-slate-800/80 transition-colors text-xs font-medium"
            >
              <Link2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span>ใส่ลิงก์เพลงภายนอก (YouTube / MP3)...</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSfxTab();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 transition-colors text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>ไปที่คลังเสียง SFX (อัปโหลดเสียงเพิ่ม)...</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
