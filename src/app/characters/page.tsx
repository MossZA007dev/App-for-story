"use client";

import { useEffect, useState, use } from "react";
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
  ChevronRight,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState<"self" | "friend">("friend");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [allCharacters, setAllCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"self" | "friend">("self");
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

  const openCreateModal = (type: "self" | "friend") => {
    setModalType(type);
    setEditingCharacter(null);
    setModalOpen(true);
  };

  const openEditModal = (char: CharacterItem) => {
    setModalType(char.characterType === "self" ? "self" : "friend");
    setEditingCharacter(char);
    setModalOpen(true);
  };

  // Filter characters according to active tab
  const displayedCharacters = allCharacters.filter((c) =>
    activeTab === "self" ? c.characterType === "self" : c.characterType === "friend"
  );

  const currentProject = projects.find((p) => p.id === selectedProjectId);

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
            <span>Saga Forge | แดชบอร์ดตัวละคร (Me & Squad Hub)</span>
          </h1>
          <p className="text-xs text-slate-400 font-thai mt-0.5">
            จัดการโปรไฟล์ตัวฉันเองและแก๊งเพื่อน เพื่อให้ AI พาคุณและเพื่อนๆ ข้ามมิติไปอยู่ในทุกฉากและบทสนทนา
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
      {/* 2. SEGMENTED TAB SWITCHER (Exact Pill Style from Figma/Screenshot)         */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center justify-center space-y-3 pt-2">
        <div className="inline-flex items-center p-1 rounded-full bg-[#080d1a] border border-slate-800/90 shadow-2xl relative">
          {/* Tab 1: 👑 ตัวฉันเอง (Me Profile) */}
          <button
            type="button"
            onClick={() => setActiveTab("self")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-thai font-bold transition-all ${
              activeTab === "self"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-102"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-sm">👑</span>
            <span>ตัวฉันเอง (Me Profile)</span>
          </button>

          {/* Tab 2: 🧑‍🤝‍🧑 เพื่อนในกลุ่ม (Squad Friend) - Cyan highlight matching screenshot */}
          <button
            type="button"
            onClick={() => setActiveTab("friend")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-thai font-bold transition-all ${
              activeTab === "friend"
                ? "bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-[0_0_20px_rgba(2,132,199,0.5)] scale-102"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-sm">🧑‍🤝‍🧑</span>
            <span>เพื่อนในกลุ่ม (Squad Friend)</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 font-thai text-center">
          {activeTab === "self"
            ? "👑 ตัวละครของคุณ (ตัวฉันเอง): จะถูกระบุเป็นตัวเอก พร้อม Profile Avatar สีทองในหน้าอ่านนิยาย"
            : "🧑‍🤝‍🧑 เพื่อนในกลุ่มของคุณ: แก๊งเพื่อนที่ข้ามมิติไปด้วยกัน พร้อม Profile Avatar สีฟ้าในบทสนทนา"}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. HORIZONTAL CHARACTER CARDS GRID                                        */}
      {/* ========================================================================= */}
      <div className="pt-8 pb-20">
        <div className="flex items-stretch justify-center flex-wrap gap-x-6 gap-y-24 pt-16 pb-8 px-4 overflow-visible">
          {/* Existing Character Cards */}
          {displayedCharacters.map((char) => {
            const isSelf = char.characterType === "self";

            return (
              <div
                key={char.id}
                className="w-[250px] sm:w-[270px] min-h-[440px] rounded-3xl p-5 pt-20 relative flex flex-col items-center justify-between shadow-2xl transition-all duration-300 hover:-translate-y-2 group bg-[#D9D9D9] text-slate-900 border border-slate-300"
              >
                {/* Protruding Circular Avatar Container with Hover Quick Edit */}
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                  <div
                    onClick={() => openEditModal(char)}
                    className={`relative w-28 h-28 rounded-full overflow-hidden border-4 ${
                      isSelf
                        ? "border-amber-400 ring-4 ring-amber-400/20"
                        : "border-sky-400 ring-4 ring-sky-400/20"
                    } bg-[#374151] shadow-2xl flex items-center justify-center cursor-pointer group-hover:scale-105 transition-all`}
                    title="คลิกเพื่อแก้ไขตัวละครหรือปรับตำแหน่งรูป"
                  >
                    {char.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={typeof char.avatarUrl === "string" ? char.avatarUrl : (char.avatarUrl as any)?.url || ""}
                        alt={char.realNickname || char.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 font-heading font-bold text-xl uppercase">
                        {isSelf ? "👑" : "🧑‍🤝‍🧑"}
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
                    className={`-mt-3.5 px-3 py-0.5 rounded-full text-[10px] font-bold font-mono text-white shadow-md z-30 border border-white/40 tracking-wider ${
                      isSelf ? "bg-amber-600 shadow-amber-600/40" : "bg-sky-600 shadow-sky-600/40"
                    }`}
                  >
                    {isSelf ? "👑 ME" : "🧑‍🤝‍🧑 SQUAD"}
                  </span>
                </div>

                {/* Card Body Info */}
                <div className="w-full text-center space-y-3 pt-2">
                  {/* Real Nickname & In-Universe Name */}
                  <div className="space-y-0.5">
                    <h3 className="font-heading font-bold text-xl text-slate-950 tracking-tight">
                      {char.realNickname || char.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 font-thai">
                      ในเรื่อง: <span className="text-slate-900 font-bold">{char.name}</span>
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
                  </div>

                  {/* Faction & Role */}
                  <div className="bg-white/80 rounded-2xl p-3 border border-slate-300 text-left space-y-1.5 text-xs font-thai shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">ฝ่าย / สังกัด:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[130px]">
                        {char.faction || "กลุ่มอิสระ"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">บทบาท:</span>
                      <span className="font-bold text-amber-700 truncate max-w-[130px]">
                        {char.chosenRole || (isSelf ? "ตัวเอกผู้ข้ามมิติ" : "สหายร่วมศึก")}
                      </span>
                    </div>
                  </div>

                  {/* Background Brief */}
                  <p className="text-[11px] text-slate-600 font-thai line-clamp-2 px-1 text-center italic">
                    &ldquo;{char.background || "ข้ามมิติเข้ามาในโลกนี้พร้อมความทรงจำเดิม"}&rdquo;
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
                    onClick={() => handleDeleteCharacter(char.id, char.realNickname || char.name)}
                    className="p-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                    title="ลบตัวละคร"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add New Character Card Slot ("+ สร้างตัวละครเพิ่ม") */}
          <div
            onClick={() => openCreateModal(activeTab)}
            className="w-[250px] sm:w-[270px] min-h-[440px] rounded-3xl p-5 pt-20 relative flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-700 hover:border-amber-400 bg-slate-900/40 hover:bg-slate-900/80 transition-all duration-300 group shadow-xl"
          >
            {/* Protruding Circle with Plus Icon */}
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-slate-700 group-hover:border-amber-400 bg-slate-800 group-hover:bg-amber-500/20 flex items-center justify-center shadow-2xl transition-all z-20">
              <Plus className="w-10 h-10 text-slate-400 group-hover:text-amber-400 transition-colors" />
            </div>

            <div className="text-center space-y-2 p-4">
              <span className="text-base font-bold font-thai text-white group-hover:text-amber-300 transition-colors block">
                {activeTab === "self"
                  ? "+ สร้างโปรไฟล์ตัวฉันเอง"
                  : "+ เพิ่มเพื่อนในกลุ่ม Squad"}
              </span>
              <p className="text-xs text-slate-400 font-thai leading-relaxed">
                {activeTab === "self"
                  ? "กรอกชื่อเล่น MBTI และอัปโหลดรูปตัวเอง เพื่อเริ่มเขียนนิยายในฐานะตัวเอก"
                  : "กรอกชื่อเพื่อน MBTI และใส่รูปเพื่อน เพื่อร่วมผจญภัยไปด้วยกัน"}
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
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM ACTION TOOLBAR                                                  */}
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
