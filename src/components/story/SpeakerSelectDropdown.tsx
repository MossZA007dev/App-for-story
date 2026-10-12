"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Check,
  ChevronDown,
  Plus,
  Camera,
  Edit3,
  BookOpen,
  Volume2,
  Crown,
  Users,
  Clapperboard,
  Sparkles,
  X,
} from "lucide-react";

export interface SpeakerCharacter {
  id: string;
  name: string;
  realNickname?: string;
  characterType?: "self" | "friend" | "canon" | "narrator";
  chosenRole?: string;
  currentMbti?: string;
  avatarUrl?: string;
  faction?: string;
}

interface SpeakerSelectDropdownProps {
  currentSpeakerId: string;
  currentSpeakerName: string;
  isNarrator: boolean;
  isSound: boolean;
  isSelf: boolean;
  isFriend: boolean;
  mbti?: string;
  characters: SpeakerCharacter[];
  onSelect: (targetKey: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function SpeakerSelectDropdown({
  currentSpeakerId,
  currentSpeakerName,
  isNarrator,
  isSound,
  isSelf,
  isFriend,
  mbti,
  characters,
  onSelect,
  isOpen,
  onToggle,
  onClose,
}: SpeakerSelectDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "squad" | "canon" | "system">("all");

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setActiveCategory("all");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside & Escape key listeners
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

  // Find active character object if any
  const currentCharacter = useMemo(() => {
    if (isNarrator || isSound) return null;
    return (
      characters.find(
        (c) =>
          c.id === currentSpeakerId ||
          c.name.toLowerCase() === currentSpeakerName.toLowerCase() ||
          (c.realNickname && c.realNickname.toLowerCase() === currentSpeakerName.toLowerCase())
      ) || null
    );
  }, [characters, currentSpeakerId, currentSpeakerName, isNarrator, isSound]);

  // Filtered & Grouped characters
  const { selfChars, squadChars, canonChars } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matches = (c: SpeakerCharacter) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.realNickname || "").toLowerCase().includes(q) ||
        (c.faction || "").toLowerCase().includes(q) ||
        (c.chosenRole || "").toLowerCase().includes(q)
      );
    };

    const self = characters.filter((c) => c.characterType === "self" && matches(c));
    const squad = characters.filter((c) => c.characterType === "friend" && matches(c));
    const canon = characters.filter((c) => (c.characterType === "canon" || !c.characterType) && matches(c));

    return { selfChars: self, squadChars: squad, canonChars: canon };
  }, [characters, searchQuery]);

  const showSystem =
    activeCategory === "all" || activeCategory === "system";
  const showSquad =
    activeCategory === "all" || activeCategory === "squad";
  const showCanon =
    activeCategory === "all" || activeCategory === "canon";

  // System items filtered by search
  const q = searchQuery.trim().toLowerCase();
  const showNarratorOption =
    showSystem &&
    (!q || "ผู้บรรยาย narrator".includes(q) || "บทบรรยาย".includes(q));
  const showSoundOption =
    showSystem &&
    (!q || "เสียงประกอบ sound fx sfx".includes(q) || "เอฟเฟกต์".includes(q));

  const totalMatches =
    (showNarratorOption ? 1 : 0) +
    (showSoundOption ? 1 : 0) +
    (showSquad ? selfChars.length + squadChars.length : 0) +
    (showCanon ? canonChars.length : 0);

  // Helper to get mini avatar display
  const renderAvatarCircle = (c?: SpeakerCharacter | null) => {
    if (isNarrator) {
      return (
        <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xs flex-shrink-0">
          📜
        </span>
      );
    }
    if (isSound) {
      return (
        <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-xs flex-shrink-0">
          ⚡
        </span>
      );
    }
    if (c?.avatarUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.avatarUrl}
          alt={c.name}
          className="w-5 h-5 rounded-full object-cover object-top border border-amber-400/30 flex-shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      );
    }
    if (c?.characterType === "self") {
      return (
        <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 flex items-center justify-center text-[10px] font-black flex-shrink-0">
          👑
        </span>
      );
    }
    if (c?.characterType === "friend") {
      return (
        <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center text-[10px] font-black flex-shrink-0">
          🧑‍🤝‍🧑
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
        🎬
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* ========================================================================= */}
      {/* 1. TRIGGER PILL BUTTON                                                    */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-thai font-bold transition-all shadow-sm border ${
          isOpen
            ? "ring-2 ring-amber-400/50 border-amber-400"
            : ""
        } ${
          isNarrator
            ? "bg-amber-950/30 border-amber-500/40 text-amber-300 hover:border-amber-400/80 hover:bg-amber-950/50"
            : isSound
            ? "bg-purple-950/30 border-purple-500/40 text-purple-300 hover:border-purple-400/80 hover:bg-purple-950/50"
            : isSelf
            ? "bg-gradient-to-r from-amber-950/40 to-amber-900/30 border-amber-500/60 text-amber-300 hover:border-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            : isFriend
            ? "bg-sky-950/30 border-sky-500/40 text-sky-300 hover:border-sky-400 hover:bg-sky-950/50"
            : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-slate-500 hover:bg-slate-800/90"
        }`}
        title="คลิกเพื่อเปลี่ยนผู้พูดในประโยคนี้"
      >
        {renderAvatarCircle(currentCharacter)}

        <span className="truncate max-w-[120px] sm:max-w-[170px] text-left">
          {currentSpeakerName || (isNarrator ? "ผู้บรรยาย" : "ตัวละคร")}
        </span>

        {/* Display Nickname if exists and different */}
        {currentCharacter?.realNickname &&
          currentCharacter.realNickname !== currentCharacter.name && (
            <span className="text-[10px] opacity-75 font-normal truncate max-w-[60px] hidden sm:inline">
              ({currentCharacter.realNickname})
            </span>
          )}

        {/* MBTI badge pill */}
        {mbti && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-black/50 text-amber-300/90 border border-white/5">
            {mbti}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-amber-300" : ""
          }`}
        />
      </button>

      {/* ========================================================================= */}
      {/* 2. FLOATING POPOVER DROPDOWN MENU                                         */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-[310px] sm:w-[350px] bg-[#0c101b]/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200 font-thai"
          style={{ maxHeight: "480px" }}
        >
          {/* Header: Fast Search Input */}
          <div className="p-2.5 pb-2 border-b border-slate-800/80 bg-slate-950/40 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อตัวละคร, ฉายา, หรือฝ่าย..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === "all"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("squad")}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === "squad"
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                👑 แก๊งฉัน & เพื่อน ({characters.filter(c => c.characterType === "self" || c.characterType === "friend").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("canon")}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === "canon"
                    ? "bg-purple-500 text-slate-950 font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                🎬 ตัวละครในเรื่อง ({characters.filter(c => c.characterType === "canon" || !c.characterType).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("system")}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === "system"
                    ? "bg-amber-600 text-white font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                📜 ระบบ
              </button>
            </div>
          </div>

          {/* List Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3 max-h-[320px]">
            {totalMatches === 0 ? (
              <div className="text-center py-6 px-3 space-y-2">
                <p className="text-xs text-slate-400">
                  ไม่พบตัวละครที่ตรงกับ &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onSelect("__quick_add_char__");
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500 hover:text-slate-950 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ สร้างเป็นตัวละครใหม่</span>
                </button>
              </div>
            ) : null}

            {/* Section 1: System / Narrator / Sound FX */}
            {showSystem && (showNarratorOption || showSoundOption) && (
              <div className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span>📜 ระบบ & บทบรรยาย</span>
                </div>

                {showNarratorOption && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelect("narrator");
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all group ${
                      isNarrator
                        ? "bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-sm"
                        : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-sm flex-shrink-0">
                        📜
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          ผู้บรรยาย (Narrator)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          บรรยายฉาก บรรยากาศ ความคิด และมุมมอง
                        </div>
                      </div>
                    </div>
                    {isNarrator && <Check className="w-4 h-4 text-amber-400 flex-shrink-0 ml-1.5" />}
                  </button>
                )}

                {showSoundOption && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelect("sound");
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all group ${
                      isSound
                        ? "bg-purple-500/15 border border-purple-500/40 text-purple-200 shadow-sm"
                        : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm flex-shrink-0">
                        ⚡
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          เสียงประกอบ (Sound FX)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          เสียงฟ้าร้อง, ดาบปะทะ, ฝีเท้า, ระเบิด
                        </div>
                      </div>
                    </div>
                    {isSound && <Check className="w-4 h-4 text-purple-400 flex-shrink-0 ml-1.5" />}
                  </button>
                )}
              </div>
            )}

            {/* Section 2: Protagonist (Me / Self) */}
            {showSquad && selfChars.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span>ตัวฉัน (Protagonist)</span>
                </div>

                {selfChars.map((c) => {
                  const isSelected = !isNarrator && !isSound && currentCharacter?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect(c.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all group ${
                        isSelected
                          ? "bg-gradient-to-r from-amber-500/20 to-amber-950/40 border border-amber-400/50 text-white shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.avatarUrl}
                            alt={c.name}
                            className="w-7 h-7 rounded-lg object-cover object-top border border-amber-400/50 flex-shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xs flex-shrink-0">
                            👑
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.realNickname && c.realNickname !== c.name && (
                              <span className="text-[10px] font-normal text-amber-300/80">
                                ({c.realNickname})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-amber-400/80 truncate">
                            {c.chosenRole || c.faction || "ตัวเอกของมหากาพย์"}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 3: Squad (Friends) */}
            {showSquad && squadChars.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>แก๊งเพื่อน (Squad)</span>
                </div>

                {squadChars.map((c) => {
                  const isSelected = !isNarrator && !isSound && currentCharacter?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect(c.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all group ${
                        isSelected
                          ? "bg-sky-500/15 border border-sky-400/50 text-white shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.avatarUrl}
                            alt={c.name}
                            className="w-7 h-7 rounded-lg object-cover object-top border border-sky-400/40 flex-shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-xs flex-shrink-0">
                            🧑‍🤝‍🧑
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors truncate flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.realNickname && c.realNickname !== c.name && (
                              <span className="text-[10px] font-normal text-sky-300/80">
                                ({c.realNickname})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {c.faction || c.chosenRole || "สหายร่วมชะตากรรม"}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-sky-400 flex-shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 4: Canon Characters (Movie / World) */}
            {showCanon && canonChars.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Clapperboard className="w-3 h-3" />
                  <span>ตัวละครในเรื่อง / หนัง (Canon)</span>
                </div>

                {canonChars.map((c) => {
                  const isSelected = !isNarrator && !isSound && currentCharacter?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect(c.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all group ${
                        isSelected
                          ? "bg-purple-500/15 border border-purple-400/50 text-white shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.avatarUrl}
                            alt={c.name}
                            className="w-7 h-7 rounded-lg object-cover object-top border border-slate-600 flex-shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                            🎬
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.realNickname && c.realNickname !== c.name && (
                              <span className="text-[10px] font-normal text-slate-400">
                                ({c.realNickname})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {c.faction || c.chosenRole || "ตัวละครในเรื่อง"}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer: Quick Management Actions */}
          <div className="p-2 border-t border-slate-800/90 bg-slate-950/70 space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelect("__quick_add_char__");
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/15 hover:text-amber-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มตัวละครใหม่ (สร้างด่วน)</span>
            </button>

            {currentCharacter && (
              <button
                type="button"
                onClick={() => {
                  onSelect("__change_avatar__");
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1 rounded-xl text-[11px] font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
              >
                <Camera className="w-3 h-3 text-amber-400" />
                <span className="truncate">เปลี่ยนรูปโปรไฟล์ ({currentSpeakerName})...</span>
              </button>
            )}

            <div className="flex items-center justify-between gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onSelect("__custom_speaker__");
                  onClose();
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] text-sky-300 hover:bg-sky-500/10 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>ชื่อผู้พูดอิสระ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelect("__manage_characters__");
                  onClose();
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                <span>Character Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
