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
  characterCount: number;
  partCount: number;
  completedParts: number;
  sceneCount: number;
  totalWordCount: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white font-heading tracking-wide flex items-center gap-2">
            <span>MY SAGAS & PROJECTS</span>
            <span className="text-sm font-normal text-slate-400 font-thai">
              ({projects.length} เรื่อง)
            </span>
          </h2>
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
        ) : (
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
