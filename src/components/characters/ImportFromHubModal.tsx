"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  User,
  Check,
  Search,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export interface HubCharacterItem {
  id: string;
  projectId: string;
  name: string;
  realNickname?: string;
  characterType: "self" | "friend" | "canon";
  gender?: string;
  startMbti?: string;
  currentMbti?: string;
  chosenRole?: string;
  roleReason?: string;
  faction?: string;
  background?: string;
  avatarUrl?: string;
  projectTitle?: string;
  projectUniverse?: string;
}

interface ImportFromHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCharacters: (selectedChars: HubCharacterItem[]) => void;
  currentCharactersList: Array<{ realNickname: string; name: string }>;
}

export function ImportFromHubModal({
  isOpen,
  onClose,
  onImportCharacters,
  currentCharactersList,
}: ImportFromHubModalProps) {
  const [characters, setCharacters] = useState<HubCharacterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "self" | "friend">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchHubCharacters();
      setSelectedIds([]);
      setSearchQuery("");
    }
  }, [isOpen]);

  const fetchHubCharacters = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/characters");
      if (!res.ok) throw new Error("ไม่สามารถโหลดตัวละครจาก Hub ได้");
      const data = await res.json();
      setCharacters(data.characters || []);
    } catch (err) {
      console.error(err);
      toast.error("โหลดตัวละครจาก Me & Squad Hub ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter characters
  const filteredList = characters.filter((char) => {
    if (filterType !== "all" && char.characterType !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNickname = (char.realNickname || "").toLowerCase().includes(q);
      const matchName = (char.name || "").toLowerCase().includes(q);
      const matchMbti = (char.currentMbti || char.startMbti || "").toLowerCase().includes(q);
      const matchFaction = (char.faction || "").toLowerCase().includes(q);
      return matchNickname || matchName || matchMbti || matchFaction;
    }
    return true;
  });

  const selfCount = characters.filter((c) => c.characterType === "self").length;
  const friendCount = characters.filter((c) => c.characterType === "friend").length;

  const handleToggleSelect = (charId: string) => {
    setSelectedIds((prev) =>
      prev.includes(charId) ? prev.filter((id) => id !== charId) : [...prev, charId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((c) => c.id));
    }
  };

  const handleConfirmImport = () => {
    const selected = characters.filter((c) => selectedIds.includes(c.id));
    if (selected.length === 0) {
      toast.error("กรุณาเลือกตัวละครอย่างน้อย 1 คน");
      return;
    }
    onImportCharacters(selected);
    onClose();
  };

  const handleImportSingle = (char: HubCharacterItem) => {
    onImportCharacters([char]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e121a] border border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col font-thai">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 flex-shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-heading tracking-wide">
                ดึงตัวละครจาก Saga Forge | Me & Squad Hub
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              เลือกตัวละครที่คุณหรือเพื่อนๆ เคยสร้างไว้ใน Me & Squad Hub เพื่อนำเข้าสู่เรื่องใหม่นี้ได้ทันทีโดยไม่ต้องกรอกข้อมูลซ้ำ
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "all"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ทั้งหมด ({characters.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("self")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterType === "self"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              👑 ตัวฉันเอง ({selfCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("friend")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterType === "friend"
                  ? "bg-sky-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🧑‍🤝‍🧑 เพื่อนในกลุ่ม ({friendCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, MBTI, สังกัด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Character List Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800"
                />
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  {characters.length === 0
                    ? "ยังไม่มีตัวละครใน Me & Squad Hub"
                    : "ไม่พบตัวละครที่ตรงกับเงื่อนไขการค้นหา"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {characters.length === 0
                    ? "คุณสามารถสร้างโปรไฟล์ตัวฉันเองและเพื่อนๆ ในหน้า แดชบอร์ดตัวละคร เพื่อใช้ซ้ำได้ทุกเรื่อง"
                    : "ลองเปลี่ยนคำค้นหาหรือตัวกรองประเภทตัวละคร"}
                </p>
              </div>

              {characters.length === 0 && (
                <a
                  href="/characters"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                >
                  <span>ไปที่ แดชบอร์ดตัวละคร (Me & Squad Hub)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((char) => {
                const isSelected = selectedIds.includes(char.id);
                const isSelf = char.characterType === "self";
                const isAlreadyInStory = currentCharactersList.some(
                  (c) =>
                    c.realNickname === char.realNickname ||
                    (c.name && char.name && c.name === char.name)
                );

                return (
                  <div
                    key={char.id}
                    onClick={() => handleToggleSelect(char.id)}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all relative flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-slate-900/90 border-amber-400 ring-1 ring-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border transition-all ${
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-slate-950"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 flex items-center justify-center shadow-md ${
                          isSelf
                            ? "border-amber-400 bg-amber-950/40 text-amber-300"
                            : "border-sky-400 bg-sky-950/40 text-sky-300"
                        }`}
                      >
                        {char.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={typeof char.avatarUrl === "string" ? char.avatarUrl : (char.avatarUrl as any)?.url || ""}
                            alt={char.realNickname || char.name}
                            className="w-full h-full object-cover"
                          />
                        ) : isSelf ? (
                          <User className="w-6 h-6 text-amber-400" />
                        ) : (
                          <Users className="w-6 h-6 text-sky-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-h-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                              isSelf
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                            }`}
                          >
                            {isSelf ? "👑 ตัวฉันเอง" : "🧑‍🤝‍🧑 เพื่อนในกลุ่ม"}
                          </span>

                          <span className="text-sm font-bold text-white truncate">
                            {char.realNickname || char.name}
                          </span>

                          {isAlreadyInStory && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              มีอยู่ในเรื่องแล้ว
                            </span>
                          )}
                        </div>

                        {char.name && (
                          <p className="text-xs text-slate-400 truncate">
                            ฉายา: <span className="text-slate-300">{char.name}</span>
                          </p>
                        )}

                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] text-slate-400">
                          {(char.currentMbti || char.startMbti) && (
                            <span className="font-mono bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 text-amber-400 font-bold">
                              MBTI: {char.currentMbti || char.startMbti}
                            </span>
                          )}
                          {char.gender && (
                            <span className="bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                              เพศ: {char.gender}
                            </span>
                          )}
                          {char.faction && (
                            <span className="bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 truncate max-w-[120px]">
                              {char.faction}
                            </span>
                          )}
                        </div>

                        {char.chosenRole && (
                          <p className="text-[11px] text-slate-300 line-clamp-1 pt-0.5">
                            บทบาท: {char.chosenRole}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: 1-click import button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        จาก: {char.projectUniverse || char.projectTitle || "Saga Forge"}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportSingle(char);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[11px] font-semibold border border-slate-700 transition-colors"
                      >
                        + นำเข้าคนนี้ทันที
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {filteredList.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-amber-400 hover:underline font-semibold"
              >
                {selectedIds.length === filteredList.length
                  ? "ยกเลิกเลือกทั้งหมด"
                  : "เลือกทั้งหมดในหน้านี้"}
              </button>
            )}
            <span>•</span>
            <span className="text-white font-semibold">
              เลือกแล้ว {selectedIds.length} ตัวละคร
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedIds.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>นำเข้าตัวละครที่เลือก ({selectedIds.length})</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
