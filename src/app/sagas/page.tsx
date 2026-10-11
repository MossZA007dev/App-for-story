"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  PenTool,
  Users,
  GitBranch,
  Image as ImageIcon,
  Flame,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface SagaProject {
  id: string;
  title: string;
  universe: string;
  timelineScope?: string;
  theme: string;
  worldNotes?: string;
  coverImage?: string;
  characterCount: number;
  partCount: number;
  completedParts: number;
  sceneCount: number;
  totalWordCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function SagasDashboardPage() {
  const [projects, setProjects] = useState<SagaProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUniverse, setSelectedUniverse] = useState("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดรายการเนื้อเรื่องได้");
    } finally {
      setLoading(false);
    }
  };

  const universes = [
    "all",
    ...Array.from(new Set(projects.map((p) => p.universe).filter(Boolean))),
  ];

  const filteredProjects = projects.filter((p) => {
    const matchesUniverse =
      selectedUniverse === "all" || p.universe === selectedUniverse;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.universe.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.theme && p.theme.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesUniverse && matchesSearch;
  });

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#070A11] text-slate-100 flex flex-col justify-start">
      {/* Container matching Figma Layout */}
      <div className="max-w-[1720px] mx-auto w-full px-4 sm:px-8 py-6 space-y-8">
        {/* Top Header / Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          {/* Heading 2: MY SAGAS & PROJECTS (N เรื่อง) */}
          <div className="flex items-center gap-3">
            <h1
              className="text-white font-bold tracking-[0.5px] uppercase font-heading text-xl sm:text-2xl"
              style={{ fontFamily: "Cinzel, serif" }}
            >
              MY SAGAS & PROJECTS
            </h1>
            <span
              className="text-[#94A3B8] font-normal text-sm font-thai"
              style={{ fontFamily: "Sarabun, sans-serif" }}
            >
              ({projects.length} เรื่อง)
            </span>
          </div>

          {/* Search & Action Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อเรื่อง หรือจักรวาล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-48 sm:w-64 font-thai transition-colors"
              />
            </div>

            {/* Universe Filter Pills */}
            {universes.length > 2 && (
              <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                {universes.map((uni) => (
                  <button
                    key={uni}
                    onClick={() => setSelectedUniverse(uni)}
                    className={`px-2.5 py-1 rounded text-xs font-thai font-medium transition-colors ${
                      selectedUniverse === uni
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {uni === "all" ? "ทั้งหมด" : uni}
                  </button>
                ))}
              </div>
            )}

            {/* New Saga Button */}
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-thai shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างเรื่องใหม่</span>
            </Link>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <div className="cinematic-card rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 border border-slate-800">
            <Flame className="w-12 h-12 text-amber-500/50 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-white font-heading">
              ยังไม่มีเรื่องราวที่ตรงกับเงื่อนไข
            </h3>
            <p className="text-xs text-slate-400 font-thai leading-relaxed">
              เริ่มต้นสร้างมหากาพย์ AU แนวดาร์กดราม่าเรื่องแรกของคุณ นำแก๊งเพื่อนข้ามมิติสู่จักรวาลต่างๆ
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างมหากาพย์เรื่องแรก</span>
            </Link>
          </div>
        ) : (
          /* Sagas Showcase Cards Grid / Carousel matching Figma */
          <div className="overflow-x-auto pb-6 pt-2">
            <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-[32px] sm:gap-[40px] xl:gap-[50px] min-w-full">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col justify-between w-full sm:w-[354px] flex-shrink-0 rounded-[15px] p-[10px] bg-[#272727] hover:bg-[#2b2b2b] transition-all duration-300 border border-slate-800/60 hover:border-amber-500/40 shadow-xl group relative"
                  style={{ borderRadius: "15px", backgroundColor: "#272727" }}
                >
                  {/* Top Content Info */}
                  <div className="space-y-[13px] p-2 flex flex-col items-start">
                    {/* Universe Tag */}
                    <div
                      className="text-[#FCD34D] text-[12px] font-semibold leading-[16px] tracking-[-0.16px] uppercase font-thai"
                      style={{
                        fontFamily: "Sarabun, sans-serif",
                        color: "#FCD34D",
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    >
                      {project.universe}
                      {project.timelineScope && (
                        <span className="text-slate-400 font-normal lowercase ml-1">
                          &bull; {project.timelineScope}
                        </span>
                      )}
                    </div>

                    {/* Story Title */}
                    <Link
                      href={`/projects/${project.id}/read`}
                      className="group-hover:text-amber-300 transition-colors block"
                    >
                      <h2
                        className="text-[#F1F5F9] text-[20px] font-bold leading-[28px] tracking-[-0.16px] font-heading line-clamp-2"
                        style={{
                          fontFamily: "Cinzel, serif",
                          color: "#F1F5F9",
                          fontWeight: 700,
                          fontSize: "20px",
                          lineHeight: "28px",
                        }}
                      >
                        {project.title}
                      </h2>
                    </Link>

                    {/* Paragraph Theme Description */}
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
                      {project.theme || "การต่อสู้แย่งชิงอำนาจ และชะตากรรมที่ต้องแลกด้วยวิญญาณ"}
                    </p>
                  </div>

                  {/* Cinematic Cover Image Box (Directly links to reader, NO edit overlay on hover) */}
                  <Link
                    href={`/projects/${project.id}/read`}
                    className="relative w-full h-[338px] rounded-[20px] overflow-hidden my-2 bg-slate-950 block cursor-pointer"
                    title={`คลิกเพื่ออ่าน "${project.title}"`}
                  >
                    <img
                      src={project.coverImage || "/images/saga-got-cover.jpg"}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-[20px]"
                      style={{ borderRadius: "20px" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/saga-got-cover.jpg";
                      }}
                    />

                    {/* Clean Reading Gradient at Bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                    {/* Discreet Reading Meta Info */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/90 text-xs font-thai pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[11px] font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>คลิกเพื่ออ่าน</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-slate-700">
                        {project.partCount || 1} ภาค &bull; {project.sceneCount || 0} ฉาก
                      </span>
                    </div>
                  </Link>

                  {/* Card Bottom Bar */}
                  <div className="p-2 pt-1.5 flex items-center justify-between border-t border-slate-800/60 mt-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-thai">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{project.sceneCount || 0} ฉากพร้อมอ่าน</span>
                    </div>

                    <Link
                      href={`/projects/${project.id}/read`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai transition-all shadow-sm"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>อ่านแบบ Final</span>
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
        )}
      </div>
    </div>
  );
}
