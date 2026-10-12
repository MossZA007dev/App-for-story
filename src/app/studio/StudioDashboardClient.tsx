"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PenTool,
  Image as ImageIcon,
  Users,
  GitBranch,
  BookOpen,
  Plus,
  Trash2,
  User,
  Search,
} from "lucide-react";
import { CreateCharacterModal } from "@/components/characters/CreateCharacterModal";
import { toast } from "sonner";
import type { SagaProjectItem } from "@/types/project";

interface StudioDashboardClientProps {
  initialProjects?: SagaProjectItem[];
}

export default function StudioDashboardClient({
  initialProjects = [],
}: StudioDashboardClientProps) {
  const [projects, setProjects] = useState<SagaProjectItem[]>(initialProjects);
  const [loading, setLoading] = useState(initialProjects.length === 0);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"self" | "friend">("self");

  useEffect(() => {
    // If not provided from server, check localStorage cache
    if (projects.length === 0) {
      try {
        const cached = localStorage.getItem("saga_cached_projects_list");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            setLoading(false);
          }
        }
      } catch {}
    } else {
      try {
        localStorage.setItem("saga_cached_projects_list", JSON.stringify(projects));
      } catch {}
    }

    // Silent background revalidation
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("/api/projects", { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data);
        try {
          localStorage.setItem("saga_cached_projects_list", JSON.stringify(data));
        } catch {}
      }
    } catch (err: any) {
      console.warn("Studio fetchProjects background:", err);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ "${title}"? ข้อมูลฉากและตัวละครทั้งหมดจะถูกลบถาวร`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      toast.success(`ลบโปรเจกต์ "${title}" เรียบร้อยแล้ว`);
      setProjects((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        try {
          localStorage.setItem("saga_cached_projects_list", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการลบโปรเจกต์");
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.universe.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.theme && p.theme.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#070A11] text-slate-100 flex flex-col justify-start pb-20">
      <div className="max-w-[1720px] mx-auto w-full px-4 sm:px-8 py-6 space-y-8">
        {/* Studio Top Banner & Quick Controls */}
        <div className="cinematic-card rounded-2xl p-6 sm:p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <PenTool className="w-3.5 h-3.5" />
                <span>Story Editing & Visual Studio Workspace</span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
                STUDIO แดชบอร์ดเนื้อเรื่อง (EDIT & ASSETS)
              </h1>

              <p className="text-slate-300 font-thai text-xs sm:text-sm leading-relaxed">
                ศูนย์กลางสำหรับแก้ไขเนื้อหา สตรีมมิ่งฉากใหม่ด้วย Claude ใส่รูปภาพ AI
                จับคู่ภาพจริงจากหนัง และจัดการตัวละครในกลุ่มเพื่อนของคุณ
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setModalType("self");
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai transition-all shadow-md hover:scale-[1.02]"
              >
                <User className="w-4 h-4" />
                <span>👑 สร้างตัวละครของคุณ (ตัวฉันเอง)</span>
              </button>

              <button
                onClick={() => {
                  setModalType("friend");
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs font-thai transition-all shadow-md hover:scale-[1.02]"
              >
                <Users className="w-4 h-4" />
                <span>🧑‍🤝‍🧑 สร้างกลุ่มเพื่อนของคุณ (Squad)</span>
              </button>

              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-thai border border-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างเรื่องใหม่</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h2
              className="text-white font-bold tracking-[0.5px] uppercase font-heading text-xl"
              style={{ fontFamily: "Cinzel, serif" }}
            >
              STORIES READY FOR EDITING
            </h2>
            <span className="text-[#94A3B8] font-normal text-sm font-thai">
              ({projects.length} เรื่อง)
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเรื่องที่จะ Edit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-64 font-thai"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="cinematic-card rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 border border-slate-800">
            <PenTool className="w-12 h-12 text-amber-500/50 mx-auto" />
            <h3 className="text-lg font-bold text-white font-heading">
              ยังไม่มีเรื่องราวสำหรับแก้ไข
            </h3>
            <p className="text-xs text-slate-400 font-thai">
              กดปุ่ม &quot;สร้างเรื่องใหม่&quot; ด้านบนเพื่อเริ่มต้นสร้างมหากาพย์เรื่องแรก
            </p>
          </div>
        ) : (
          /* Studio Editor Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const progressPct =
                project.partCount > 0
                  ? Math.round((project.completedParts / project.partCount) * 100)
                  : 0;

              return (
                <div
                  key={project.id}
                  className="cinematic-card rounded-2xl p-5 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-5 bg-[#0f1219] group"
                >
                  <div className="space-y-4">
                    {/* Top Row: Universe + Trash */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {project.universe}
                        </span>
                        {project.timelineScope && (
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 font-thai">
                            {project.timelineScope}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(project.id, project.title)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
                        title="ลบโปรเจกต์"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cover & Title Banner */}
                    <div className="flex gap-4 items-start">
                      <div className="w-20 h-28 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800">
                        <img
                          src={project.coverImage || "/images/saga-got-cover.jpg"}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes("saga-got-cover.jpg")) {
                              target.src = "/images/saga-got-cover.jpg";
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <Link
                          href={`/projects/${project.id}`}
                          className="block font-heading text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2"
                        >
                          {project.title}
                        </Link>
                        <p className="text-xs text-slate-400 font-thai line-clamp-2 leading-relaxed">
                          {project.theme || "ไม่มีคำอธิบายธีม"}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-thai text-slate-400">
                        <span>ความคืบหน้าภาค</span>
                        <span className="font-mono text-amber-400 font-semibold">
                          {project.completedParts} / {project.partCount} ภาค ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, progressPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Numbers Summary */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center font-mono">
                      <div>
                        <p className="text-[11px] text-slate-500 font-thai">ตัวละคร</p>
                        <p className="text-xs font-bold text-white">{project.characterCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-thai">ฉากทั้งหมด</p>
                        <p className="text-xs font-bold text-white">{project.sceneCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-thai">คำสะสม</p>
                        <p className="text-xs font-bold text-white">
                          {project.totalWordCount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Studio Navigation Buttons (Workspace, Images, Characters, Timeline) */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    {/* Primary Button: Open Story Workspace */}
                    <Link
                      href={`/projects/${project.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai shadow-md transition-all group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                      <PenTool className="w-4 h-4" />
                      <span>✍️ เข้า Studio แก้ไข & สตรีมมิ่งฉาก</span>
                    </Link>

                    {/* Sub-tools Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-thai">
                      <Link
                        href={`/projects/${project.id}/images`}
                        className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                        title="Image Studio: คัดเลือกจังหวะ & สร้างภาพ AI"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                        <span>ใส่รูปภาพ</span>
                      </Link>

                      <Link
                        href={`/projects/${project.id}/characters`}
                        className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                        title="Character Bible: ดูชีตตัวละคร & MBTI"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>ตัวละคร</span>
                      </Link>

                      <Link
                        href={`/projects/${project.id}/timeline`}
                        className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                        title="Timeline & Relations: ไทม์ไลน์และกราฟความสัมพันธ์"
                      >
                        <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                        <span>ไทม์ไลน์</span>
                      </Link>
                    </div>

                    {/* Reader preview link */}
                    <div className="pt-1 text-center">
                      <Link
                        href={`/projects/${project.id}/read`}
                        className="text-[11px] text-slate-400 hover:text-amber-300 inline-flex items-center gap-1 font-thai transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>พรีวิวดูในโหมดอ่านนิยาย (Reader View) &rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Universal Character Creator Modal */}
      <CreateCharacterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalType}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
