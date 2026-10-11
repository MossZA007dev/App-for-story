"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Users,
  Film,
  Sparkles,
  ArrowRight,
  Trash2,
  Scroll,
  TrendingUp,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectItem {
  id: string;
  title: string;
  universe: string;
  timelineScope: string;
  theme: string;
  worldNotes: string;
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  characterCount: number;
  partCount: number;
  completedParts: number;
  sceneCount: number;
  totalWordCount: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"showcase" | "grid">("showcase");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("โหลดข้อมูลโปรเจกต์ไม่สำเร็จ");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดรายการโปรเจกต์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ "${title}"? ข้อมูลฉากและตัวละครทั้งหมดจะถูกลบถาวร`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      toast.success(`ลบโปรเจกต์ "${title}" เรียบร้อยแล้ว`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการลบโปรเจกต์");
    }
  };

  const totalWords = projects.reduce((sum, p) => sum + (p.totalWordCount || 0), 0);
  const totalScenes = projects.reduce((sum, p) => sum + (p.sceneCount || 0), 0);
  const totalCharacters = projects.reduce((sum, p) => sum + (p.characterCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-slate-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Part AU Storytelling Engine</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-white">
              SAGA FORGE DASHBOARD
            </h1>
            <p className="text-slate-300 font-thai text-base leading-relaxed">
              เครื่องมือสร้างนิยายแนวดาร์กดราม่าแบบหลายภาค พร้อม AI Continuity Engine
              รักษาความต่อเนื่องของตัวละคร บาดแผล ความสัมพันธ์ และภาพประกอบเชิงภาพยนตร์
            </p>
          </div>

          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span className="font-thai">สร้างโปรเจกต์นิยายใหม่</span>
          </Link>
        </div>

        {/* Global Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-amber-400 border border-slate-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-white">{projects.length}</p>
              <p className="text-xs text-slate-400 font-thai">โปรเจกต์ทั้งหมด</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-amber-400 border border-slate-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-white">{totalCharacters}</p>
              <p className="text-xs text-slate-400 font-thai">ตัวละครใน Bible</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-amber-400 border border-slate-700">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-white">{totalScenes}</p>
              <p className="text-xs text-slate-400 font-thai">ฉากที่เขียนแล้ว</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-amber-400 border border-slate-700">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-white">{totalWords.toLocaleString()}</p>
              <p className="text-xs text-slate-400 font-thai">คำทั้งหมดสะสม</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white font-heading tracking-wide flex items-center gap-2">
              <span>MY SAGAS & PROJECTS</span>
              <span className="text-sm font-normal text-slate-400 font-thai">
                ({projects.length} เรื่อง)
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("showcase")}
                className={`px-3 py-1 rounded text-xs font-thai font-semibold transition-all ${
                  viewMode === "showcase"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎬 โชว์เคสภาพปก (Figma)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 rounded text-xs font-thai font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📋 จัดการ & ความคืบหน้า
              </button>
            </div>

            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 font-thai"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>สร้างเรื่องใหม่</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-thai">ยังไม่มีโปรเจกต์นิยาย</h3>
            <p className="text-slate-400 max-w-md mx-auto mb-6 text-sm font-thai">
              เริ่มต้นสร้างมหากาพย์เรื่องแรก กำหนดจักรวาลและสร้างตัวละครให้ AI ช่วยออกแบบบทบาท
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors font-thai"
            >
              <Plus className="w-4 h-4" />
              <span>เริ่มสร้างโปรเจกต์แรก</span>
            </Link>
          </div>
        ) : viewMode === "showcase" ? (
          /* SHOWCASE VIEW MATCHING FIGMA DESIGN */
          <div className="overflow-x-auto pb-6 pt-2">
            <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-6 sm:gap-8 min-w-full">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="flex flex-col justify-between w-full sm:w-[354px] flex-shrink-0 rounded-[15px] p-[10px] bg-[#272727] hover:bg-[#2b2b2b] transition-all duration-300 border border-slate-800/60 hover:border-amber-500/40 shadow-xl group relative"
                  style={{ borderRadius: "15px", backgroundColor: "#272727" }}
                >
                  {/* Top Details */}
                  <div className="space-y-[13px] p-2 flex flex-col items-start">
                    <div
                      className="text-[#FCD34D] text-[12px] font-semibold leading-[16px] tracking-[-0.16px] uppercase font-thai"
                      style={{
                        fontFamily: "Sarabun, sans-serif",
                        color: "#FCD34D",
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    >
                      {proj.universe}
                      {proj.timelineScope && (
                        <span className="text-slate-400 font-normal lowercase ml-1">
                          &bull; {proj.timelineScope}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/projects/${proj.id}/read`}
                      className="group-hover:text-amber-300 transition-colors block"
                    >
                      <h3
                        className="text-[#F1F5F9] text-[20px] font-bold leading-[28px] tracking-[-0.16px] font-heading line-clamp-2"
                        style={{
                          fontFamily: "Cinzel, serif",
                          color: "#F1F5F9",
                          fontWeight: 700,
                          fontSize: "20px",
                          lineHeight: "28px",
                        }}
                      >
                        {proj.title}
                      </h3>
                    </Link>

                    <p
                      className="text-[#B4B4B4] text-[12px] font-normal leading-[16px] tracking-[-0.16px] font-thai line-clamp-2 min-h-[32px]"
                      style={{
                        fontFamily: "Sarabun, sans-serif",
                        color: "#B4B4B4",
                        fontWeight: 400,
                        fontSize: "12px",
                        lineHeight: "16px",
                      }}
                    >
                      {proj.theme || "ความเสื่อมทรามของอำนาจ และชะตากรรมที่ต้องแลกด้วยวิญญาณ"}
                    </p>
                  </div>

                  {/* Big Cover Image */}
                  <div className="relative w-full h-[338px] rounded-[20px] overflow-hidden my-2 bg-slate-950">
                    <img
                      src={proj.coverImage || "/images/saga-got-cover.jpg"}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-[20px]"
                      style={{ borderRadius: "20px" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/saga-got-cover.jpg";
                      }}
                    />

                    {/* Hover Quick Action Overlay */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[20px] p-5 flex flex-col justify-between items-center text-center">
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-amber-300 tracking-wider uppercase">
                          SAGA FORGE
                        </span>
                        <p className="text-xs text-slate-200 font-thai line-clamp-2 px-2">
                          {proj.title}
                        </p>
                      </div>

                      {/* Main Navigation Actions */}
                      <div className="w-full space-y-2">
                        <Link
                          href={`/projects/${proj.id}/read`}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai shadow-lg transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>📖 อ่านนิยาย (Split-Screen Reader)</span>
                        </Link>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/projects/${proj.id}`}
                            className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white text-[11px] font-thai border border-slate-700 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>เขียนใน Studio</span>
                          </Link>

                          <Link
                            href={`/projects/${proj.id}/images`}
                            className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white text-[11px] font-thai border border-slate-700 transition-colors"
                          >
                            <Film className="w-3.5 h-3.5 text-sky-400" />
                            <span>Image Studio</span>
                          </Link>
                        </div>
                      </div>

                      {/* Stats Pills in Overlay */}
                      <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{proj.partCount || 1} ภาค</span>
                        <span>&bull;</span>
                        <span>{proj.sceneCount || 0} ฉาก</span>
                        <span>&bull;</span>
                        <span>{proj.characterCount || 0} ตัวละคร</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Bar */}
                  <div className="p-2 pt-1 flex items-center justify-between border-t border-slate-800/60 mt-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-thai">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{proj.sceneCount || 0} ฉากพร้อมอ่าน</span>
                    </div>

                    <Link
                      href={`/projects/${proj.id}/read`}
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-thai transition-colors"
                    >
                      <span>เปิดอ่าน</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}

              {/* Add New Saga Card */}
              <Link
                href="/projects/new"
                className="w-full sm:w-[354px] flex-shrink-0 rounded-[15px] p-[10px] bg-[#1a1c22]/50 hover:bg-[#20222a] border-2 border-dashed border-slate-800 hover:border-amber-500/50 transition-all duration-300 flex flex-col items-center justify-center min-h-[480px] group text-center space-y-4"
                style={{ borderRadius: "15px" }}
              >
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3
                    className="text-base font-bold text-white font-heading group-hover:text-amber-300 transition-colors"
                    style={{ fontFamily: "Cinzel, serif" }}
                  >
                    + CREATE NEW SAGA
                  </h3>
                  <p className="text-xs text-slate-400 font-thai max-w-[220px]">
                    เพิ่มมหากาพย์เรื่องใหม่ พาแก๊งเพื่อนข้ามมิติไปยังจักรวาลที่คุณชื่นชอบ
                  </p>
                </div>
              </Link>
            </div>
          </div>
        ) : (
          /* MANAGEMENT GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const progressPct =
                proj.partCount > 0 ? Math.round((proj.completedParts / proj.partCount) * 100) : 0;

              return (
                <div
                  key={proj.id}
                  className="cinematic-card rounded-xl p-6 flex flex-col justify-between group hover:border-amber-500/50"
                >
                  <div className="space-y-4">
                    {/* Header badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {proj.universe}
                        </span>
                        {proj.timelineScope && (
                          <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                            {proj.timelineScope}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(proj.id, proj.title)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800/80 transition-colors"
                        title="ลบโปรเจกต์"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title & Theme */}
                    <div>
                      <Link
                        href={`/projects/${proj.id}`}
                        className="block font-heading text-xl font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1"
                      >
                        {proj.title}
                      </Link>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-thai">
                        {proj.theme || "ไม่มีคำอธิบายธีม"}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-thai">ความคืบหน้าภาค</span>
                        <span className="font-mono text-amber-400 font-semibold">
                          {proj.completedParts} / {proj.partCount} ภาค ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, progressPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center font-mono">
                      <div>
                        <p className="text-xs text-slate-500 font-thai">ตัวละคร</p>
                        <p className="text-sm font-bold text-slate-200">{proj.characterCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-thai">ฉากทั้งหมด</p>
                        <p className="text-sm font-bold text-slate-200">{proj.sceneCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-thai">จำนวนคำ</p>
                        <p className="text-sm font-bold text-slate-200">
                          {proj.totalWordCount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Links */}
                  <div className="pt-4 mt-2 flex items-center justify-between gap-3">
                    <Link
                      href={`/projects/${proj.id}/characters`}
                      className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1.5 font-thai transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Character Bible</span>
                    </Link>

                    <Link
                      href={`/projects/${proj.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-semibold border border-amber-500/30 transition-all font-thai group-hover:bg-amber-500 group-hover:text-slate-950"
                    >
                      <span>เปิด Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
