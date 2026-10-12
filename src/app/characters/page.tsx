"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Camera,
  Edit3,
  Trash2,
  ArrowRight,
  Shield,
  Flame,
  BookOpen,
  PenTool,
  Search,
  Filter,
  Layers,
  LayoutGrid,
  Clapperboard,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { CreateCharacterModal } from "@/components/characters/CreateCharacterModal";

interface CharacterItem {
  id: string;
  projectId: string;
  name: string;
  realNickname?: string;
  characterType: "self" | "friend" | "canon";
  startMbti?: string;
  currentMbti?: string;
  gender?: string;
  faction?: string;
  chosenRole?: string;
  roleReason?: string;
  background?: string;
  avatarUrl?: string;
  status?: string;
  locationNow?: string;
}

interface ProjectItem {
  id: string;
  title: string;
  universe: string;
  timelineScope?: string;
}

// Custom Heraldic Sigils matching Figma Frame 30
function DirewolfSigil() {
  return (
    <svg className="w-8 h-8 text-slate-900 drop-shadow-sm" viewBox="0 0 64 64" fill="currentColor">
      <path d="M12 36L15 29L22 30L27 22L36 24L44 16L48 20L45 25L53 26L60 33L56 37L58 41L49 39L45 45L37 42L31 49L25 44L19 47L15 42L9 41L12 36Z" />
      <circle cx="39" cy="27" r="2.5" fill="#D4CDB2" />
    </svg>
  );
}

function LionSigil() {
  return (
    <svg className="w-7 h-7 text-amber-950 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 2 6 5 6 8C4.5 9 3 11 3 14C3 18 6 21 11 21C11.5 21 12.5 20.9 13 20.8C14 21 15 21 16 20.5C18 19.5 19 18 19 16C20.5 15 21 13 21 11C21 7 17 2 12 2ZM10 13C9.4 13 9 12.6 9 12C9 11.4 9.4 11 10 11C10.6 11 11 11.4 11 12C11 12.6 10.6 13 10 13ZM14 13C13.4 13 13 12.6 13 12C13 11.4 13.4 11 14 11C14.6 11 15 11.4 15 12C15 12.6 14.6 13 14 13Z" />
    </svg>
  );
}

function getBannerData(char: CharacterItem) {
  const factionLower = (char.faction || "").toLowerCase();
  const nameLower = char.name.toLowerCase();

  if (factionLower.includes("stark") || nameLower.includes("stark") || factionLower.includes("grey wolf")) {
    return {
      topColor: "#D4CDB2",
      bottomColor: "#7B9070",
      sigil: <DirewolfSigil />,
      label: "STARK",
    };
  }
  if (factionLower.includes("lannister") || nameLower.includes("lannister")) {
    return {
      topColor: "#FDE68A",
      bottomColor: "#991B1B",
      sigil: <LionSigil />,
      label: "LANNISTER",
    };
  }
  if (factionLower.includes("targaryen") || nameLower.includes("targaryen") || factionLower.includes("dragon")) {
    return {
      topColor: "#FECACA",
      bottomColor: "#881337",
      sigil: <Flame className="w-7 h-7 text-red-950 drop-shadow-sm" />,
      label: "DRAGON",
    };
  }
  if (factionLower.includes("night's watch") || factionLower.includes("watch")) {
    return {
      topColor: "#D1D5DB",
      bottomColor: "#1F2937",
      sigil: <Shield className="w-7 h-7 text-slate-900 drop-shadow-sm" />,
      label: "WATCH",
    };
  }
  if (char.characterType === "self") {
    return {
      topColor: "#FEF08A",
      bottomColor: "#D97706",
      sigil: <Crown className="w-7 h-7 text-amber-950 drop-shadow-sm" />,
      label: "ME",
    };
  }
  if (char.characterType === "friend") {
    return {
      topColor: "#E0F2FE",
      bottomColor: "#0284C7",
      sigil: <Shield className="w-7 h-7 text-sky-950 drop-shadow-sm" />,
      label: "SQUAD",
    };
  }
  // Canon / Default
  return {
    topColor: "#D4CDB2",
    bottomColor: "#7B9070",
    sigil: <Clapperboard className="w-7 h-7 text-slate-900 drop-shadow-sm" />,
    label: (char.faction || "CANON").slice(0, 8).toUpperCase(),
  };
}

export default function CharactersDashboardPage() {
  const [activeTab, setActiveTab] = useState<"squad" | "canon">("squad");
  const [squadSubFilter, setSquadSubFilter] = useState<"all" | "self" | "friend">("all");
  const [selectedFaction, setSelectedFaction] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "grouped">("grid");

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [allCharacters, setAllCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"self" | "friend" | "canon">("friend");
  const [editingCharacter, setEditingCharacter] = useState<CharacterItem | null>(null);

  // Load Projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const cached = localStorage.getItem("saga_cached_projects_list");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            setSelectedProjectId(parsed[0].id);
            fetchCharacters(parsed[0].id);
            setLoading(false);
          }
        }
      } catch {}

      try {
        const res = await fetch("/api/projects");
        if (!res.ok) throw new Error("โหลดโปรเจกต์ไม่สำเร็จ");
        const data = await res.json();
        setProjects(data);
        try {
          localStorage.setItem("saga_cached_projects_list", JSON.stringify(data));
        } catch {}

        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
          fetchCharacters(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch Characters for Selected Project
  const fetchCharacters = async (projId: string) => {
    try {
      const res = await fetch(`/api/projects/${projId}/characters`);
      if (!res.ok) throw new Error("โหลดตัวละครไม่สำเร็จ");
      const data = await res.json();
      setAllCharacters(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    fetchCharacters(projId);
  };

  const handleDeleteCharacter = async (charId: string, charName: string) => {
    if (!confirm(`คุณต้องการลบตัวละคร "${charName}" ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/characters/${charId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");

      toast.success(`ลบตัวละคร "${charName}" เรียบร้อยแล้ว`);
      fetchCharacters(selectedProjectId);
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการลบตัวละคร");
    }
  };

  const openCreateModal = (type: "self" | "friend" | "canon") => {
    setModalType(type);
    setEditingCharacter(null);
    setModalOpen(true);
  };

  const openEditModal = (char: CharacterItem) => {
    setModalType(char.characterType);
    setEditingCharacter(char);
    setModalOpen(true);
  };

  // Squad Characters (Self + Friend)
  const squadCharacters = allCharacters
    .filter((c) => c.characterType === "self" || c.characterType === "friend")
    .sort((a, b) => {
      if (a.characterType === "self") return -1;
      if (b.characterType === "self") return 1;
      return 0;
    });

  const selfCount = squadCharacters.filter((c) => c.characterType === "self").length;
  const friendCount = squadCharacters.filter((c) => c.characterType === "friend").length;

  const displayedSquadCharacters = squadCharacters.filter((c) => {
    const matchesFilter =
      squadSubFilter === "all"
        ? true
        : squadSubFilter === "self"
        ? c.characterType === "self"
        : c.characterType === "friend";

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (c.realNickname || "").toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      (c.faction || "").toLowerCase().includes(query) ||
      (c.chosenRole || "").toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  // Movie / Canon Characters
  const canonCharacters = allCharacters.filter((c) => c.characterType === "canon");

  // Dynamic Factions / Categories list
  const canonFactions = Array.from(
    new Set(
      canonCharacters
        .map((c) => (c.faction || "").trim())
        .filter(Boolean)
    )
  );

  const displayedCanonCharacters = canonCharacters.filter((c) => {
    const matchesFaction =
      selectedFaction === "all"
        ? true
        : (c.faction || "").trim().toLowerCase() === selectedFaction.toLowerCase();

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.realNickname || "").toLowerCase().includes(query) ||
      (c.faction || "").toLowerCase().includes(query) ||
      (c.chosenRole || "").toLowerCase().includes(query) ||
      (c.background || "").toLowerCase().includes(query);

    return matchesFaction && matchesSearch;
  });

  // Grouped Canon Map by Faction
  const groupedCanonMap: Record<string, CharacterItem[]> = {};
  if (viewMode === "grouped") {
    canonFactions.forEach((fac) => {
      const list = displayedCanonCharacters.filter(
        (c) => (c.faction || "").trim().toLowerCase() === fac.toLowerCase()
      );
      if (list.length > 0) groupedCanonMap[fac] = list;
    });
    const unassigned = displayedCanonCharacters.filter(
      (c) => !(c.faction || "").trim() || !canonFactions.some(f => f.toLowerCase() === (c.faction || "").trim().toLowerCase())
    );
    if (unassigned.length > 0) {
      groupedCanonMap["ตัวละครอิสระ / อื่นๆ"] = unassigned;
    }
  }

  // =========================================================================
  // RENDER FIGMA EXACT PROFILE CARD (427x599 aspect-ratio: 67/94)
  // Frame 30 (Top Banner) + Rectangle 7 (Bottom Plate)
  // =========================================================================
  const renderFigmaCharacterCard = (char: CharacterItem) => {
    const banner = getBannerData(char);

    return (
      <div
        key={char.id}
        className="w-full sm:w-[320px] md:w-[340px] aspect-[67/94] rounded-[9px] relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.65)] group border border-slate-700/60 hover:border-amber-400/80 hover:shadow-[0_16px_45px_rgba(0,0,0,0.85)] transition-all duration-300 flex flex-col justify-end"
        style={{ borderRadius: "9px" }}
      >
        {/* Layer 1: Full-Bleed Portrait Background Image */}
        <div className="absolute inset-0 w-full h-full bg-[#181c24]">
          {char.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof char.avatarUrl === "string" ? char.avatarUrl : (char.avatarUrl as any)?.url || ""}
              alt={char.name}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e2330] to-[#0c0f17] text-slate-500">
              <span className="text-5xl mb-2 opacity-50">
                {char.characterType === "self" ? "👑" : char.characterType === "canon" ? "🎬" : "🧑‍🤝‍🧑"}
              </span>
              <span className="text-xs font-thai text-slate-400">ยังไม่มีรูปภาพตัวละคร</span>
              <button
                type="button"
                onClick={() => openEditModal(char)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-thai font-semibold hover:bg-amber-500 hover:text-slate-950 transition-all"
              >
                + อัปโหลดรูปภาพ
              </button>
            </div>
          )}

          {/* Cinematic Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35 pointer-events-none" />
        </div>

        {/* Layer 2: Top-Left Banner / Pennant (Exact Frame 30 from Figma) */}
        <div className="absolute top-0 left-3 z-30 pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]">
          <div className="relative w-[60px] sm:w-[68px] h-[104px] sm:h-[118px]">
            <svg
              viewBox="0 0 99 172"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-md"
            >
              {/* Parchment Top Tier */}
              <path d="M0 0H99V118.609L49.5 171L0 118.609V0Z" fill={banner.topColor} />
              {/* Faction Lower Chevron Tier */}
              <path d="M0 29H99V119.109L49.5 171.5L0 119.109V29Z" fill={banner.bottomColor} />
            </svg>

            {/* Emblem Centered in Upper Tier */}
            <div className="absolute top-3 inset-x-0 flex flex-col items-center justify-center">
              {banner.sigil}
              <span className="text-[9px] font-mono font-black text-slate-900 uppercase tracking-tighter mt-1 bg-white/30 px-1 rounded">
                {banner.label}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Edit Hover Button (Top-Right) */}
        <button
          type="button"
          onClick={() => openEditModal(char)}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title="แก้ไขข้อมูลหรือปรับตำแหน่งรูปภาพ"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Layer 3: Bottom Plate (Exact Rectangle 7 from Figma: path M0 0H189.727H319.46L417 83.3871V110H0V0Z) */}
        <div className="relative w-full z-20">
          {/* Vector SVG Plate */}
          <svg
            viewBox="0 0 417 110"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full drop-shadow-[0_4px_12.4px_rgba(0,0,0,0.4)] pointer-events-none"
          >
            <path
              d="M0 0H319.46L417 83.3871V110H0V0Z"
              fill="#89867B"
              fillOpacity="0.97"
              shapeRendering="crispEdges"
            />
          </svg>

          {/* Character Info on Plate */}
          <div className="relative z-10 px-3.5 pt-2.5 pb-2.5 space-y-1.5 text-slate-950 font-thai">
            {/* Top row: Name & MBTI/Gender Badges */}
            <div className="flex items-center justify-between gap-1.5 pr-7">
              <div className="min-w-0">
                <h3 className="font-heading font-black text-base sm:text-lg text-slate-950 tracking-tight leading-tight truncate">
                  {char.name}
                </h3>
                {char.realNickname && char.realNickname !== char.name && (
                  <p className="text-[10px] text-slate-800 font-bold truncate leading-none">
                    ({char.realNickname})
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {char.currentMbti && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-slate-950 text-amber-300 shadow-sm">
                    {char.currentMbti}
                  </span>
                )}
                {char.gender && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/15 text-slate-950">
                    {char.gender}
                  </span>
                )}
              </div>
            </div>

            {/* Middle row: Faction & Role */}
            <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5">
              <div className="truncate font-semibold text-slate-900">
                <span className="text-slate-800 font-medium">ฝ่าย: </span>
                <span className="font-black text-slate-950">{char.faction || "กลุ่มอิสระ"}</span>
              </div>
              <div className="truncate text-right font-semibold text-slate-900 flex-shrink-0 max-w-[130px]">
                <span className="text-amber-950 font-black">{char.chosenRole || "ตัวละครสำคัญ"}</span>
              </div>
            </div>

            {/* Bottom row: Lore snippet & Action Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-black/15">
              <span className="text-[10px] text-slate-800 italic truncate max-w-[155px]">
                &ldquo;{char.background || "ตัวละครในมหากาพย์"}&rdquo;
              </span>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(char);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-white text-[10px] font-bold font-thai shadow-sm transition-colors flex items-center gap-1"
                  title="แก้ไขข้อมูลตัวละคร"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>แก้ไข</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCharacter(char.id, char.name);
                  }}
                  className="p-1 rounded bg-red-950/20 hover:bg-red-900/40 text-red-950 text-[10px] transition-colors"
                  title="ลบตัวละคร"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 py-6 px-4 sm:px-8 max-w-[1850px] mx-auto space-y-8 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. BRAND & HEADER BAR                                                     */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-800/80 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-thai text-slate-400 mb-1">
            <Link href="/sagas" className="hover:text-white transition-colors">
              แดชบอร์ดเนื้อเรื่อง
            </Link>
            <span>/</span>
            <span className="text-amber-400 font-semibold">แดชบอร์ดตัวละคร</span>
          </div>

          <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <span>Saga Forge | แดชบอร์ดตัวละคร & จักรวาล (Character Bible Hub)</span>
          </h1>
          <p className="text-xs text-slate-400 font-thai mt-0.5">
            จัดการโปรไฟล์แก๊งตัวคุณและเพื่อน (Squad) พร้อมจัดหมวดหมู่ตัวละครในหนัง/ซีรีส์ (Canon) สไตล์การ์ดภาพยนตร์
          </p>
        </div>

        {/* Project Selector & Studio Quick Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0e131d] border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-thai">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 hidden sm:inline">จักรวาล:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none max-w-[200px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.title} ({p.universe})
                </option>
              ))}
            </select>
          </div>

          <Link
            href={selectedProjectId ? `/projects/${selectedProjectId}` : "/studio"}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-slate-800 text-xs font-thai font-semibold transition-colors"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>เข้าห้อง Studio</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEGMENTED TAB SWITCHER                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center justify-center space-y-3 pt-2">
        <div className="inline-flex items-center p-1 rounded-full bg-[#080d1a] border border-slate-800/90 shadow-2xl relative">
          {/* Tab 1: 👑🧑‍🤝‍🧑 แก๊งตัวฉันและเพื่อน (Me & Squad Combined) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("squad");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-thai font-bold transition-all ${
              activeTab === "squad"
                ? "bg-gradient-to-r from-amber-500 via-amber-600 to-sky-600 text-white shadow-[0_0_25px_rgba(245,158,11,0.45)] scale-102"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-sm">👑🧑‍🤝‍🧑</span>
            <span>แก๊งตัวฉันและเพื่อน ({selfCount + friendCount})</span>
          </button>

          {/* Tab 2: 🎬 ตัวละครในหนัง / จักรวาล (Movie & Canon) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("canon");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-thai font-bold transition-all ${
              activeTab === "canon"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_25px_rgba(147,51,234,0.5)] scale-102"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-sm">🎬</span>
            <span>ตัวละครในหนัง / จักรวาล ({canonCharacters.length})</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 font-thai text-center">
          {activeTab === "squad"
            ? "👑 ตัวฉันเอง (ME) และ 🧑‍🤝‍🧑 เพื่อนในกลุ่ม (SQUAD): รวมทีมข้ามมิติเพื่อพาแก๊งเพื่อนเข้าไปร่วมผจญภัยในทุกฉากและบทสนทนา"
            : "🎬 ตัวละครในหนัง / จักรวาล AU: จัดการตัวละครประจำเรื่อง พร้อมระบบจัดหมวดหมู่ตามฝ่ายและตระกูล"}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOOLBAR / CATEGORY FILTERS & CONTROLS                                  */}
      {/* ========================================================================= */}
      <div className="bg-[#0c1019] border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Filter Pills according to Tab */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {activeTab === "squad" ? (
            <>
              <span className="text-xs text-slate-400 font-thai flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>แสดง:</span>
              </span>
              <button
                type="button"
                onClick={() => setSquadSubFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-thai font-semibold transition-all ${
                  squadSubFilter === "all"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                ทั้งหมด ({selfCount + friendCount})
              </button>

              <button
                type="button"
                onClick={() => setSquadSubFilter("self")}
                className={`px-3 py-1.5 rounded-xl text-xs font-thai font-semibold transition-all flex items-center gap-1 ${
                  squadSubFilter === "self"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>👑 ตัวฉันเอง ({selfCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSquadSubFilter("friend")}
                className={`px-3 py-1.5 rounded-xl text-xs font-thai font-semibold transition-all flex items-center gap-1 ${
                  squadSubFilter === "friend"
                    ? "bg-sky-600 text-white font-bold shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>🧑‍🤝‍🧑 เพื่อนในแก๊ง ({friendCount})</span>
              </button>
            </>
          ) : (
            <>
              {/* Category / Faction Filter Pills for Canon */}
              <span className="text-xs text-purple-300 font-thai flex items-center gap-1 mr-1 font-semibold">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>หมวดหมู่ฝ่าย:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedFaction("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-thai font-semibold transition-all ${
                  selectedFaction === "all"
                    ? "bg-purple-600 text-white font-bold shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                ทั้งหมด ({canonCharacters.length})
              </button>

              {canonFactions.map((fac) => {
                const count = canonCharacters.filter((c) => (c.faction || "").trim() === fac).length;
                return (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => setSelectedFaction(fac)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-thai font-semibold transition-all ${
                      selectedFaction.toLowerCase() === fac.toLowerCase()
                        ? "bg-purple-600 text-white font-bold shadow-md"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {fac} ({count})
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Right: Search Input & Add Action */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === "squad"
                  ? "ค้นหาชื่อเล่น, ชื่อในเรื่อง หรือบทบาท..."
                  : "ค้นหาตัวละครในหนัง หรือฝ่าย..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-thai"
            />
          </div>

          {/* Group View Toggle for Canon */}
          {activeTab === "canon" && canonFactions.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "grid" ? "grouped" : "grid")}
              className={`p-2 rounded-xl border text-xs font-thai flex items-center gap-1.5 transition-colors ${
                viewMode === "grouped"
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
              }`}
              title={viewMode === "grid" ? "จัดกลุ่มตามฝ่าย (Grouped Sections)" : "แสดงแบบตารางปกติ (Grid View)"}
            >
              {viewMode === "grouped" ? <Layers className="w-4 h-4 text-purple-400" /> : <LayoutGrid className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {viewMode === "grouped" ? "แยกตามฝ่าย" : "มุมมองรวม"}
              </span>
            </button>
          )}

          {/* Add Character Quick Button */}
          <button
            type="button"
            onClick={() => openCreateModal(activeTab === "squad" ? "friend" : "canon")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs font-thai transition-all shadow-md ${
              activeTab === "squad"
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === "squad" ? "เพิ่มสมาชิกแก๊ง" : "เพิ่มตัวละครในหนัง"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FIGMA PROFILE CARDS GRID (Aspect 67/94, Frame 30, Rectangle 7)          */}
      {/* ========================================================================= */}
      <div className="pt-2 pb-20">
        {activeTab === "squad" ? (
          /* SQUAD VIEW: ME + FRIENDS COMBINED */
          <div className="flex items-stretch justify-center flex-wrap gap-6 sm:gap-8 pt-4 pb-8 px-2 overflow-visible">
            {displayedSquadCharacters.map(renderFigmaCharacterCard)}

            {/* Add New Character Card Slot (Matching Exact Aspect Ratio) */}
            <div
              onClick={() => openCreateModal("friend")}
              className="w-full sm:w-[320px] md:w-[340px] aspect-[67/94] rounded-[9px] relative overflow-hidden cursor-pointer border-2 border-dashed border-slate-700 hover:border-amber-400 bg-slate-900/40 hover:bg-slate-900/70 transition-all duration-300 group shadow-xl flex flex-col justify-between p-5"
              style={{ borderRadius: "9px" }}
            >
              {/* Top-left Banner Outline Placeholder */}
              <div className="w-[58px] sm:w-[64px] h-[98px] sm:h-[110px] border-2 border-dashed border-slate-700/80 rounded-b-xl flex flex-col items-center justify-center p-2">
                <Plus className="w-6 h-6 text-slate-500 group-hover:text-amber-400 transition-colors" />
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase mt-1">NEW</span>
              </div>

              {/* Center Invitation Message */}
              <div className="text-center space-y-2.5 px-2 py-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 group-hover:bg-amber-500/20 border border-slate-700 group-hover:border-amber-400 mx-auto flex items-center justify-center transition-all shadow-inner">
                  <Plus className="w-8 h-8 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <span className="text-base font-bold font-thai text-white group-hover:text-amber-300 transition-colors block">
                  + เพิ่มตัวละคร (ฉันหรือเพื่อน)
                </span>
                <p className="text-xs text-slate-400 font-thai leading-relaxed">
                  กรอกชื่อเล่น MBTI และรูปถ่าย เพื่อพาคุณและแก๊งเพื่อนข้ามมิติไปด้วยกัน
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all font-thai">
                    <span>กดเพื่อสร้างตัวละคร</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Bottom Plate Dashed Outline */}
              <div className="relative w-full h-[55px] opacity-40 group-hover:opacity-80 transition-opacity">
                <svg viewBox="0 0 417 110" preserveAspectRatio="none" className="w-full h-full">
                  <path
                    d="M0 0H319.46L417 83.3871V110H0V0Z"
                    fill="none"
                    stroke="#89867B"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        ) : viewMode === "grouped" && Object.keys(groupedCanonMap).length > 0 ? (
          /* CANON VIEW: GROUPED BY FACTION / CATEGORY */
          <div className="space-y-12">
            {Object.entries(groupedCanonMap).map(([factionName, chars]) => (
              <div key={factionName} className="space-y-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
                {/* Faction Category Banner Header */}
                <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white font-heading">
                        หมวดหมู่ฝ่าย: <span className="text-purple-300 font-thai">{factionName}</span>
                      </h2>
                      <p className="text-xs text-slate-400 font-thai">
                        ตัวละครดั้งเดิมในสังกัด ({chars.length} คน)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setModalType("canon");
                      setEditingCharacter(null);
                      setModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700/50 text-purple-200 text-xs font-thai transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มในฝ่ายนี้</span>
                  </button>
                </div>

                <div className="flex items-stretch justify-center sm:justify-start flex-wrap gap-6 sm:gap-8 pt-4 pb-4 overflow-visible">
                  {chars.map(renderFigmaCharacterCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* CANON VIEW: GRID VIEW */
          <div className="flex items-stretch justify-center flex-wrap gap-6 sm:gap-8 pt-4 pb-8 px-2 overflow-visible">
            {displayedCanonCharacters.map(renderFigmaCharacterCard)}

            {/* Add New Movie / Canon Character Slot */}
            <div
              onClick={() => openCreateModal("canon")}
              className="w-full sm:w-[320px] md:w-[340px] aspect-[67/94] rounded-[9px] relative overflow-hidden cursor-pointer border-2 border-dashed border-purple-700/60 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/40 transition-all duration-300 group shadow-xl flex flex-col justify-between p-5"
              style={{ borderRadius: "9px" }}
            >
              {/* Top-left Banner Outline Placeholder */}
              <div className="w-[58px] sm:w-[64px] h-[98px] sm:h-[110px] border-2 border-dashed border-purple-700/80 rounded-b-xl flex flex-col items-center justify-center p-2">
                <Clapperboard className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span className="text-[8px] font-mono font-bold text-purple-400 uppercase mt-1">CANON</span>
              </div>

              {/* Center Invitation Message */}
              <div className="text-center space-y-2.5 px-2 py-4">
                <div className="w-16 h-16 rounded-full bg-purple-900/30 group-hover:bg-purple-600/30 border border-purple-700 group-hover:border-purple-400 mx-auto flex items-center justify-center transition-all shadow-inner">
                  <Plus className="w-8 h-8 text-purple-300 group-hover:text-white transition-colors" />
                </div>
                <span className="text-base font-bold font-thai text-white group-hover:text-purple-300 transition-colors block">
                  + เพิ่มตัวละครในหนัง / จักรวาล
                </span>
                <p className="text-xs text-slate-400 font-thai leading-relaxed">
                  เพิ่มตัวละครดั้งเดิมในเรื่อง เช่น ลอร์ด, อัศวิน หรือตัวละครจากภาพยนตร์ เพื่อใช้จัดหมวดหมู่และดำเนินเรื่อง
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 group-hover:bg-purple-600 group-hover:text-white transition-all font-thai">
                    <span>กดเพื่อเพิ่มตัวละครในหนัง</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Bottom Plate Dashed Outline */}
              <div className="relative w-full h-[55px] opacity-40 group-hover:opacity-80 transition-opacity">
                <svg viewBox="0 0 417 110" preserveAspectRatio="none" className="w-full h-full">
                  <path
                    d="M0 0H319.46L417 83.3871V110H0V0Z"
                    fill="none"
                    stroke="#89867B"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM ACTION TOOLBAR                                                  */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-[#0d121c] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <p className="text-sm font-bold text-white font-thai">
            พร้อมนำตัวละครของคุณและเพื่อนๆ เข้าสู่เรื่องแล้วใช่ไหม?
          </p>
          <p className="text-xs text-slate-400 font-thai">
            AI จะใช้ข้อมูลตัวละคร MBTI และรูปถ่ายเหล่านี้ในการสร้างฉาก เขียนบทพูด และเจนภาพประกอบอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${selectedProjectId}/read`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-thai font-semibold transition-colors"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>เปิดโหมดอ่านนิยาย (Reader)</span>
          </Link>

          <Link
            href={`/projects/${selectedProjectId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-thai shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all"
          >
            <PenTool className="w-4 h-4" />
            <span>เข้าสู่ Studio เขียนนิยาย</span>
          </Link>
        </div>
      </div>

      {/* Universal Character Creator / Editor Modal */}
      <CreateCharacterModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialType={modalType}
        initialProjectId={selectedProjectId}
        editCharacter={editingCharacter}
        onSuccess={() => fetchCharacters(selectedProjectId)}
      />
    </div>
  );
}
