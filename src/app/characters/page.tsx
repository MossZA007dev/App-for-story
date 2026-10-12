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

// Clan Heraldic Themes & Banner URLs matching exact Figma Frames (Frame 30, Frame 38, Frame 33, Frame 34)
interface ClanTheme {
  fill: string;
  fillOpacity: number;
  bannerUrl: string;
  titleColor: string;
  subtitleColor: string;
  roleColor: string;
  loreColor: string;
  badgeBg: string;
  badgeText: string;
  genderBg: string;
  genderText: string;
  dividerBorder: string;
  editBtnBg: string;
  editBtnText: string;
  deleteBtnBg: string;
  deleteBtnText: string;
}

function getClanTheme(char: CharacterItem): ClanTheme {
  const factionLower = (char.faction || "").toLowerCase();
  const nameLower = (char.name || "").toLowerCase();

  // 1. House Stark (Frame 30: Beige/Green Direwolf, Lower Fill: #7B9070)
  if (
    factionLower.includes("stark") ||
    nameLower.includes("stark") ||
    factionLower.includes("wolf") ||
    factionLower.includes("สตาร์ค") ||
    factionLower.includes("หมาป่า")
  ) {
    return {
      fill: "#7B9070",
      fillOpacity: 0.97,
      bannerUrl: "/images/banners/clan_stark.png",
      titleColor: "text-white font-black drop-shadow-sm",
      subtitleColor: "text-slate-100 font-bold",
      roleColor: "text-amber-200 font-black drop-shadow-sm",
      loreColor: "text-slate-200 italic",
      badgeBg: "bg-slate-950/80 shadow-sm",
      badgeText: "text-amber-300 font-black",
      genderBg: "bg-black/25",
      genderText: "text-slate-100 font-bold",
      dividerBorder: "border-white/20",
      editBtnBg: "bg-slate-950 hover:bg-slate-900",
      editBtnText: "text-amber-300 hover:text-white",
      deleteBtnBg: "bg-black/25 hover:bg-red-950/60",
      deleteBtnText: "text-red-200 hover:text-red-100",
    };
  }

  // 2. House Lannister (Frame 38: Crimson #86090A with Golden Lion)
  if (
    factionLower.includes("lannister") ||
    nameLower.includes("lannister") ||
    factionLower.includes("lion") ||
    factionLower.includes("แลนนิสเตอร์") ||
    factionLower.includes("สิงโต")
  ) {
    return {
      fill: "#86090A",
      fillOpacity: 0.97,
      bannerUrl: "/images/banners/clan_lannister.png",
      titleColor: "text-amber-100 font-black drop-shadow-sm",
      subtitleColor: "text-rose-200 font-bold",
      roleColor: "text-amber-300 font-black drop-shadow-sm",
      loreColor: "text-rose-200/90 italic",
      badgeBg: "bg-black/60 shadow-sm",
      badgeText: "text-amber-300 font-black",
      genderBg: "bg-black/30",
      genderText: "text-rose-100 font-bold",
      dividerBorder: "border-amber-400/25",
      editBtnBg: "bg-black/60 hover:bg-black/90",
      editBtnText: "text-amber-300 hover:text-amber-200",
      deleteBtnBg: "bg-black/30 hover:bg-rose-950/60",
      deleteBtnText: "text-rose-300 hover:text-rose-100",
    };
  }

  // 3. House Targaryen (Frame 33: Black #0E0D13 with Crimson 3-Headed Dragon)
  if (
    factionLower.includes("targaryen") ||
    nameLower.includes("targaryen") ||
    factionLower.includes("dragon") ||
    factionLower.includes("ทาร์แกเรียน") ||
    factionLower.includes("มังกร")
  ) {
    return {
      fill: "#0E0D13",
      fillOpacity: 0.98,
      bannerUrl: "/images/banners/clan_targaryen.png",
      titleColor: "text-white font-black drop-shadow-sm",
      subtitleColor: "text-slate-300 font-bold",
      roleColor: "text-red-400 font-black drop-shadow-sm",
      loreColor: "text-slate-400 italic",
      badgeBg: "bg-red-950/70 border border-red-900/60 shadow-sm",
      badgeText: "text-red-300 font-black",
      genderBg: "bg-white/10",
      genderText: "text-slate-200 font-bold",
      dividerBorder: "border-red-900/40",
      editBtnBg: "bg-red-950/80 hover:bg-red-900 border border-red-800/50",
      editBtnText: "text-red-200 hover:text-white",
      deleteBtnBg: "bg-white/10 hover:bg-red-950/60",
      deleteBtnText: "text-red-400 hover:text-red-200",
    };
  }

  // 4. House Tyrell (Frame 34: Forest Green #016701 with Golden Blooming Rose)
  if (
    factionLower.includes("tyrell") ||
    nameLower.includes("tyrell") ||
    factionLower.includes("rose") ||
    factionLower.includes("ไทเรล") ||
    factionLower.includes("กุหลาบ")
  ) {
    return {
      fill: "#016701",
      fillOpacity: 0.97,
      bannerUrl: "/images/banners/clan_tyrell.png",
      titleColor: "text-amber-100 font-black drop-shadow-sm",
      subtitleColor: "text-emerald-100 font-bold",
      roleColor: "text-amber-300 font-black drop-shadow-sm",
      loreColor: "text-emerald-100/90 italic",
      badgeBg: "bg-black/50 shadow-sm",
      badgeText: "text-amber-300 font-black",
      genderBg: "bg-black/25",
      genderText: "text-emerald-100 font-bold",
      dividerBorder: "border-emerald-300/25",
      editBtnBg: "bg-black/50 hover:bg-black/80",
      editBtnText: "text-amber-300 hover:text-amber-200",
      deleteBtnBg: "bg-black/25 hover:bg-black/50",
      deleteBtnText: "text-red-300 hover:text-red-100",
    };
  }

  // 5. Night's Watch (Obsidian/Crow Shield)
  if (
    factionLower.includes("watch") ||
    factionLower.includes("night's watch") ||
    factionLower.includes("วอทช์") ||
    factionLower.includes("อีกา")
  ) {
    return {
      fill: "#181F2A",
      fillOpacity: 0.98,
      bannerUrl: "/images/banners/clan_watch.png",
      titleColor: "text-white font-black drop-shadow-sm",
      subtitleColor: "text-slate-300 font-bold",
      roleColor: "text-sky-300 font-black drop-shadow-sm",
      loreColor: "text-slate-400 italic",
      badgeBg: "bg-slate-900/90 border border-slate-700/60 shadow-sm",
      badgeText: "text-sky-300 font-black",
      genderBg: "bg-white/10",
      genderText: "text-slate-300 font-bold",
      dividerBorder: "border-slate-700/50",
      editBtnBg: "bg-slate-900 hover:bg-slate-800 border border-slate-700/60",
      editBtnText: "text-sky-300 hover:text-white",
      deleteBtnBg: "bg-white/10 hover:bg-red-950/60",
      deleteBtnText: "text-red-400 hover:text-red-200",
    };
  }

  // 6. Protagonist / Self (Golden Royal Crown Banner #854D0E)
  if (char.characterType === "self") {
    return {
      fill: "#854D0E",
      fillOpacity: 0.97,
      bannerUrl: "/images/banners/clan_me.png",
      titleColor: "text-amber-100 font-black drop-shadow-sm",
      subtitleColor: "text-amber-200 font-bold",
      roleColor: "text-amber-300 font-black drop-shadow-sm",
      loreColor: "text-amber-200/90 italic",
      badgeBg: "bg-black/60 shadow-sm",
      badgeText: "text-amber-300 font-black",
      genderBg: "bg-black/30",
      genderText: "text-amber-100 font-bold",
      dividerBorder: "border-amber-400/30",
      editBtnBg: "bg-black/60 hover:bg-black/90",
      editBtnText: "text-amber-300 hover:text-white",
      deleteBtnBg: "bg-black/30 hover:bg-black/60",
      deleteBtnText: "text-red-300 hover:text-red-200",
    };
  }

  // 7. Squad / Friend (Allied Sky Shield Banner #0369A1)
  if (char.characterType === "friend") {
    return {
      fill: "#0369A1",
      fillOpacity: 0.97,
      bannerUrl: "/images/banners/clan_squad.png",
      titleColor: "text-white font-black drop-shadow-sm",
      subtitleColor: "text-sky-100 font-bold",
      roleColor: "text-sky-200 font-black drop-shadow-sm",
      loreColor: "text-sky-100/90 italic",
      badgeBg: "bg-black/50 shadow-sm",
      badgeText: "text-sky-300 font-black",
      genderBg: "bg-black/25",
      genderText: "text-white font-bold",
      dividerBorder: "border-sky-300/30",
      editBtnBg: "bg-black/60 hover:bg-black/90",
      editBtnText: "text-sky-200 hover:text-white",
      deleteBtnBg: "bg-black/25 hover:bg-black/50",
      deleteBtnText: "text-red-300 hover:text-red-200",
    };
  }

  // Default / Canon Medieval (Figma Frame 30 Rectangle 7 #89867B)
  return {
    fill: "#89867B",
    fillOpacity: 0.97,
    bannerUrl: "/images/banners/clan_stark.png",
    titleColor: "text-slate-950 font-black",
    subtitleColor: "text-slate-900 font-bold",
    roleColor: "text-amber-950 font-black",
    loreColor: "text-slate-800 italic",
    badgeBg: "bg-slate-950 shadow-sm",
    badgeText: "text-amber-300 font-black",
    genderBg: "bg-black/15",
    genderText: "text-slate-950 font-bold",
    dividerBorder: "border-black/15",
    editBtnBg: "bg-slate-950 hover:bg-slate-900",
    editBtnText: "text-amber-300 hover:text-white",
    deleteBtnBg: "bg-red-950/20 hover:bg-red-900/40",
    deleteBtnText: "text-red-950",
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
    const clanTheme = getClanTheme(char);

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

        {/* Layer 2: Medieval Clan Banner (Exact Figma Frame 30/38/33/34) */}
        <div className="absolute top-0 left-2.5 sm:left-3.5 z-30 pointer-events-none filter drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clanTheme.bannerUrl}
            alt={char.faction || "Clan Banner"}
            className="w-[72px] sm:w-[80px] md:w-[84px] h-auto object-contain transition-transform duration-300 group-hover:-translate-y-0.5"
          />
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

        {/* Layer 3: Bottom Plate (Exact Figma Rectangle 7: width 417 / 427 = 97.66%, height 110, path M0 0H319.46L417 83.3871V110H0V0Z) */}
        <div className="relative w-[97.66%] self-start z-20">
          {/* Vector SVG Plate */}
          <svg
            viewBox="0 0 417 110"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full drop-shadow-[0_4px_12.4px_rgba(0,0,0,0.24)] pointer-events-none"
          >
            <path
              d="M0 0H319.46L417 83.3871V110H0V0Z"
              fill={clanTheme.fill}
              fillOpacity={clanTheme.fillOpacity}
              shapeRendering="crispEdges"
            />
          </svg>

          {/* Character Info on Plate */}
          <div className="relative z-10 px-3 sm:px-3.5 pt-2 pb-2.5 space-y-1 sm:space-y-1.5 font-thai">
            {/* Top row: Name & Badges (Safely bounded before the diagonal cut starts at 76.6% -> pr-[26%]) */}
            <div className="flex items-center justify-between gap-1.5 pr-[26%]">
              <div className="min-w-0 flex-1">
                <h3 className={`font-heading font-black text-sm sm:text-base md:text-lg tracking-tight leading-tight truncate ${clanTheme.titleColor}`}>
                  {char.name}
                </h3>
                {char.realNickname && char.realNickname !== char.name && (
                  <p className={`text-[10px] font-bold truncate leading-none mt-0.5 ${clanTheme.subtitleColor}`}>
                    ({char.realNickname})
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {char.currentMbti && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${clanTheme.badgeBg} ${clanTheme.badgeText}`}>
                    {char.currentMbti}
                  </span>
                )}
                {char.gender && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${clanTheme.genderBg} ${clanTheme.genderText}`}>
                    {char.gender}
                  </span>
                )}
              </div>
            </div>

            {/* Middle row: Faction & Role (Safely bounded before diagonal slope at y≈45 -> pr-[15%]) */}
            <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5 pr-[15%]">
              <div className={`truncate font-semibold ${clanTheme.subtitleColor}`}>
                <span className="font-medium opacity-80">ฝ่าย: </span>
                <span className="font-black">{char.faction || "กลุ่มอิสระ"}</span>
              </div>
              <div className={`truncate text-right font-black flex-shrink-0 max-w-[125px] ${clanTheme.roleColor}`}>
                {char.chosenRole || "ตัวละครสำคัญ"}
              </div>
            </div>

            {/* Bottom row: Lore snippet & Action Buttons (Below y=83.3871, full plate width available) */}
            <div className={`flex items-center justify-between pt-1 border-t ${clanTheme.dividerBorder}`}>
              <span className={`text-[10px] truncate max-w-[145px] ${clanTheme.loreColor}`}>
                &ldquo;{char.background || "ตัวละครในมหากาพย์"}&rdquo;
              </span>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(char);
                  }}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold font-thai shadow-sm transition-colors flex items-center gap-1 ${clanTheme.editBtnBg} ${clanTheme.editBtnText}`}
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
                  className={`p-1 rounded text-[10px] transition-colors ${clanTheme.deleteBtnBg} ${clanTheme.deleteBtnText}`}
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
