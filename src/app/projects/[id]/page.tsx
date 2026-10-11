"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import {
  BookOpen,
  Users,
  Film,
  Sparkles,
  ArrowRight,
  Scroll,
  Shield,
  Layers,
  Clock,
  ChevronRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface ProjectDetail {
  id: string;
  title: string;
  universe: string;
  timelineScope: string;
  theme: string;
  worldNotes: string;
  storyRules: string;
  styleGuide: string;
}

interface PartDetail {
  id: string;
  number: number;
  title: string;
  scope: string;
  theme: string;
  peakSummary: string;
  status: "planned" | "drafting" | "done";
  scenes: Array<{
    id: string;
    order: number;
    title: string;
    wordCount: number;
    summary: string;
  }>;
}

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [parts, setParts] = useState<PartDetail[]>([]);
  const [characters, setCharacters] = useState<Array<{ id: string; name: string; chosenRole: string; currentMbti: string; status: string }>>([]);
  const [continuityLedger, setContinuityLedger] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const data = await res.json();
        setProject(data.project);
        setParts(data.parts || []);
        setCharacters(data.characters || []);
        setContinuityLedger(data.continuityLedger?.ledgerData || null);
      } catch (err) {
        console.error(err);
        toast.error("ไม่สามารถโหลดโปรเจกต์ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800 col-span-2" />
          <div className="h-64 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 font-thai">ไม่พบโปรเจกต์</p>
        <Link href="/" className="text-amber-400 underline text-sm mt-2 inline-block">
          กลับสู่แดชบอร์ด
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectId={project.id}
        title={project.title}
        universe={project.universe}
        timelineScope={project.timelineScope}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Story Parts & Scenes Hub */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cinematic-card rounded-xl p-6 border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>โครงสร้างภาค (PARTS & ARCS)</span>
              </h2>
              <span className="text-xs text-slate-400 font-thai">
                {parts.length} ภาคทั้งหมด
              </span>
            </div>

            <div className="space-y-4">
              {parts.map((part) => (
                <div
                  key={part.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Part {part.number}
                        </span>
                        <h3 className="font-bold text-white text-base font-heading">
                          {part.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-thai">
                        ธีมภาค: {part.theme || "ไม่ได้ระบุ"} {part.scope ? `(${part.scope})` : ""}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        part.status === "done"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : part.status === "drafting"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {part.status === "done"
                        ? "เขียนเสร็จแล้ว"
                        : part.status === "drafting"
                        ? "กำลังเขียน"
                        : "วางแผนไว้"}
                    </span>
                  </div>

                  {part.peakSummary && (
                    <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 font-thai">
                      <span className="text-amber-400 font-semibold">จุดหักเหหลัก (Peak):</span>{" "}
                      {part.peakSummary}
                    </div>
                  )}

                  {/* Scenes preview */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-thai">
                      {part.scenes.length > 0
                        ? `${part.scenes.length} ฉาก (${part.scenes
                            .reduce((a, s) => a + s.wordCount, 0)
                            .toLocaleString()} คำ)`
                        : "ยังไม่มีฉากในชาปเตอร์นี้"}
                    </span>

                    <span className="inline-flex items-center gap-1 text-amber-400 font-thai">
                      <span>พร้อมเขียนใน Phase 2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* World Notes & Canon Deviations */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3">
            <h3 className="font-heading text-sm font-bold text-white flex items-center gap-2">
              <Scroll className="w-4 h-4 text-amber-400" />
              <span>WORLD NOTES & CANON DEVIATIONS</span>
            </h3>
            <p className="text-xs text-slate-300 font-thai whitespace-pre-wrap leading-relaxed">
              {project.worldNotes || "ไม่มีบันทึกจุดเบี่ยงเบนจากต้นฉบับ"}
            </p>
          </div>
        </div>

        {/* Right 1 Col: Character Quick Glance & Continuity Snapshot */}
        <div className="space-y-6">
          {/* Character Quick Bible */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>CHARACTERS ({characters.length})</span>
              </h3>
              <Link
                href={`/projects/${projectId}/characters`}
                className="text-xs text-amber-400 hover:underline font-thai"
              >
                ดูทั้งหมด →
              </Link>
            </div>

            <div className="space-y-2.5">
              {characters.slice(0, 6).map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white font-heading">{c.name}</p>
                    <p className="text-[11px] text-slate-400 font-thai line-clamp-1">
                      {c.chosenRole || "ตัวละคร"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-amber-400 text-[11px] font-semibold">
                      {c.currentMbti || "MBTI"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Continuity Ledger Snapshot */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3">
            <h3 className="font-heading text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>CONTINUITY LEDGER STATUS</span>
            </h3>
            <p className="text-xs text-slate-400 font-thai">
              บันทึกสถานะข้อเท็จจริงล่าสุด ณ ปัจจุบันของเรื่อง
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1.5">
              <p>
                <span className="text-amber-400 font-semibold">Open Threads:</span>{" "}
                {Array.isArray(continuityLedger?.open_threads)
                  ? continuityLedger.open_threads.length
                  : 1}{" "}
                ปม
              </p>
              <p>
                <span className="text-red-400 font-semibold">Casualties:</span>{" "}
                {Array.isArray(continuityLedger?.deaths) ? continuityLedger.deaths.length : 0} คน
              </p>
              <p>
                <span className="text-emerald-400 font-semibold">Injuries:</span>{" "}
                {Array.isArray(continuityLedger?.injuries_scars)
                  ? continuityLedger.injuries_scars.length
                  : 0}{" "}
                แผล
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
