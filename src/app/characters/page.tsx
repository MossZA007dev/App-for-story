"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Users,
  Plus,
  Camera,
  Edit3,
  Trash2,
  Sparkles,
  ArrowRight,
  Shield,
  Flame,
  BookOpen,
  PenTool,
  Check,
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

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  // Helper renderer for character card
  const renderCharacterCard = (char: CharacterItem) => {
    const isSelf = char.characterType === "self";
    const isCanon = char.characterType === "canon";

    const ringBorder = isSelf
      ? "border-amber-400 ring-4 ring-amber-400/25"
      : isCanon
      ? "border-purple-400 ring-4 ring-purple-400/25"
      : "border-sky-400 ring-4 ring-sky-400/25";

    const badgeBg = isSelf
      ? "bg-amber-600 shadow-amber-600/40"
      : isCanon
      ? "bg-purple-600 shadow-purple-600/40"
      : "bg-sky-600 shadow-sky-600/40";

    const badgeLabel = isSelf ? "👑 ME" : isCanon ? "🎬 CANON" : "🧑‍🤝‍🧑 SQUAD";

    return (
      <div
        key={char.id}
        className="w-[250px] sm:w-[270px] min-h-[440px] rounded-3xl p-5 pt-20 relative flex flex-col items-center justify-between shadow-2xl transition-all duration-300 hover:-translate-y-2 group bg-[#D9D9D9] text-slate-900 border border-slate-300"
      >
        {/* Protruding Circular Avatar Container with Hover Quick Edit */}
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
          <div
            onClick={() => openEditModal(char)}
            className={`relative w-28 h-28 rounded-full overflow-hidden border-4 ${ringBorder} bg-[#374151] shadow-2xl flex items-center justify-center cursor-pointer group-hover:scale-105 transition-all`}
            title="คลิกเพื่อแก้ไขตัวละครหรือปรับตำแหน่งรูป"
          >
            {char.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={typeof char.avatarUrl === "string" ? char.avatarUrl : (char.avatarUrl as any)?.url || ""}
                alt={char.realNickname || char.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 font-heading font-bold text-xl uppercase">
                {isSelf ? "👑" : isCanon ? "🎬" : "🧑‍🤝‍🧑"}
                <span className="text-sm mt-0.5">
                  {(char.realNickname || char.name).slice(0, 2)}
                </span>
              </div>
            )}

            {/* Camera/Edit Hover Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <Camera className="w-6 h-6 drop-shadow" />
            </div>
          </div>

          {/* Badge floating OUTSIDE the photo (Never blocks the face!) */}
          <span
            className={`-mt-3.5 px-3 py-0.5 rounded-full text-[10px] font-bold font-mono text-white shadow-md z-30 border border-white/40 tracking-wider ${badgeBg}`}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Card Body Info */}
        <div className="w-full text-center space-y-3 pt-2">
          {/* Main Title & Subtitle */}
          <div className="space-y-0.5">
            <h3 className="font-heading font-bold text-xl text-slate-950 tracking-tight line-clamp-1">
              {isCanon ? char.name : char.realNickname || char.name}
            </h3>
            <p className="text-xs font-semibold text-slate-600 font-thai line-clamp-1">
              {isCanon ? (
                char.realNickname ? (
                  <span>ชื่อเรียก: <strong className="text-slate-900">{char.realNickname}</strong></span>
                ) : (
                  <span className="text-purple-800 font-medium">ตัวละครในจักรวาลเรื่อง</span>
                )
              ) : (
                <span>ในเรื่อง: <strong className="text-slate-900">{char.name}</strong></span>
              )}
            </p>
          </div>

          {/* MBTI & Role Pill Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {char.currentMbti && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-900 text-amber-300 shadow-sm">
                {char.currentMbti}
              </span>
            )}

            {char.gender && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-thai bg-slate-200 text-slate-700 font-medium">
                {char.gender}
              </span>
            )}

            {isCanon && char.faction && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-thai bg-purple-100 text-purple-900 border border-purple-200 font-bold truncate max-w-[130px]">
                {char.faction}
              </span>
            )}
          </div>

          {/* Faction & Role Box */}
          <div className="bg-white/80 rounded-2xl p-3 border border-slate-300 text-left space-y-1.5 text-xs font-thai shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ฝ่าย / สังกัด:</span>
              <span className="font-bold text-slate-900 truncate max-w-[130px]">
                {char.faction || (isCanon ? "ตามเนื้อเรื่อง" : "กลุ่มอิสระ")}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">บทบาท:</span>
              <span className="font-bold text-amber-700 truncate max-w-[130px]">
                {char.chosenRole || (isSelf ? "ตัวเอกผู้ข้ามมิติ" : isCanon ? "ตัวละครดั้งเดิม" : "สหายร่วมศึก")}
              </span>
            </div>
          </div>

          {/* Background Brief */}
          <p className="text-[11px] text-slate-600 font-thai line-clamp-2 px-1 text-center italic min-h-[32px]">
            &ldquo;{char.background || (isCanon ? "ตัวละครสำคัญตามเนื้อเรื่องดั้งเดิม" : "ข้ามมิติเข้ามาในโลกนี้พร้อมความทรงจำเดิม")}&rdquo;
          </p>
        </div>

        {/* Card Bottom Action Buttons */}
        <div className="w-full pt-4 border-t border-slate-300/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => openEditModal(char)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs font-thai shadow-sm transition-colors"
            title="แก้ไขข้อมูลตัวละคร"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>แก้ไข</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeleteCharacter(char.id, isCanon ? char.name : char.realNickname || char.name)}
            className="p-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
            title="ลบตัวละคร"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
            จัดการโปรไฟล์แก๊งตัวคุณและเพื่อน (Squad) พร้อมจัดหมวดหมู่ตัวละครในหนัง/ซีรีส์ (Canon) รองรับการสร้าง AU ได้หลายเรื่อง
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
      {/* 2. SEGMENTED TAB SWITCHER (Me & Squad Combined vs Movie/Canon Characters)   */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center justify-center space-y-3 pt-2">
        <div className="inline-flex items-center p-1 rounded-full bg-[#080d1a] border border-slate-800/90 shadow-2xl relative">
          {/* Tab 1: 👑🧑‍🤝‍🧑 แก๊งตัวฉันและเพื่อน (Me & Squad Friends Combined) */}
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

          {/* Tab 2: 🎬 ตัวละครในหนัง / จักรวาล (Movie & Canon Characters with Categorization) */}
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
      {/* 4. HORIZONTAL CHARACTER CARDS GRID                                        */}
      {/* ========================================================================= */}
      <div className="pt-4 pb-20">
        {activeTab === "squad" ? (
          /* SQUAD VIEW: ME + FRIENDS COMBINED */
          <div className="flex items-stretch justify-center flex-wrap gap-x-6 gap-y-24 pt-16 pb-8 px-4 overflow-visible">
            {displayedSquadCharacters.map(renderCharacterCard)}

            {/* Add New Character Card Slot */}
            <div
              onClick={() => openCreateModal("friend")}
              className="w-[250px] sm:w-[270px] min-h-[440px] rounded-3xl p-5 pt-20 relative flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-700 hover:border-amber-400 bg-slate-900/40 hover:bg-slate-900/80 transition-all duration-300 group shadow-xl"
            >
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-slate-700 group-hover:border-amber-400 bg-slate-800 group-hover:bg-amber-500/20 flex items-center justify-center shadow-2xl transition-all z-20">
                <Plus className="w-10 h-10 text-slate-400 group-hover:text-amber-400 transition-colors" />
              </div>

              <div className="text-center space-y-2 p-4">
                <span className="text-base font-bold font-thai text-white group-hover:text-amber-300 transition-colors block">
                  + เพิ่มตัวละคร (ฉันหรือเพื่อน)
                </span>
                <p className="text-xs text-slate-400 font-thai leading-relaxed">
                  กรอกชื่อเล่น MBTI และรูปถ่าย เพื่อพาคุณและแก๊งเพื่อนข้ามมิติไปด้วยกัน
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all font-thai">
                    <span>กดเพื่อสร้างตัวละคร</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === "grouped" && Object.keys(groupedCanonMap).length > 0 ? (
          /* CANON VIEW: GROUPED BY FACTION / CATEGORY */
          <div className="space-y-12">
            {Object.entries(groupedCanonMap).map(([factionName, chars]) => (
              <div key={factionName} className="space-y-4 bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
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

                <div className="flex items-stretch justify-center sm:justify-start flex-wrap gap-x-6 gap-y-24 pt-16 pb-8 overflow-visible">
                  {chars.map(renderCharacterCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* CANON VIEW: GRID VIEW */
          <div className="flex items-stretch justify-center flex-wrap gap-x-6 gap-y-24 pt-16 pb-8 px-4 overflow-visible">
            {displayedCanonCharacters.map(renderCharacterCard)}

            {/* Add New Movie / Canon Character Slot */}
            <div
              onClick={() => openCreateModal("canon")}
              className="w-[250px] sm:w-[270px] min-h-[440px] rounded-3xl p-5 pt-20 relative flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-purple-700/60 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/40 transition-all duration-300 group shadow-xl"
            >
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-purple-700 group-hover:border-purple-400 bg-slate-900 group-hover:bg-purple-600/30 flex items-center justify-center shadow-2xl transition-all z-20">
                <Clapperboard className="w-10 h-10 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </div>

              <div className="text-center space-y-2 p-4">
                <span className="text-base font-bold font-thai text-white group-hover:text-purple-300 transition-colors block">
                  + เพิ่มตัวละครในหนัง / จักรวาล
                </span>
                <p className="text-xs text-slate-400 font-thai leading-relaxed">
                  เพิ่มตัวละครดั้งเดิมในเรื่อง เช่น ลอร์ด, อัศวิน, นักเวท หรือตัวละครจากภาพยนตร์ เพื่อใช้จัดหมวดหมู่และดำเนินเรื่อง
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 group-hover:bg-purple-600 group-hover:text-white transition-all font-thai">
                    <span>กดเพื่อเพิ่มตัวละครในหนัง</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
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
