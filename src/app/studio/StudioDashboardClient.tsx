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
  ArrowUpRight,
  MoreHorizontal,
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
  const [universeFilter, setUniverseFilter] = useState("");

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
      if (Array.isArray(data)) {
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
    (p) => (!universeFilter || p.universe === universeFilter) && (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.universe.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.theme && p.theme.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="studio-dashboard w-full min-h-[calc(100vh-64px)] bg-background text-slate-100 flex flex-col justify-start pb-20">
      <div className="max-w-[1720px] mx-auto w-full px-4 sm:px-8 py-6 space-y-8">
        {/* Studio Top Banner & Quick Controls */}
        <div className="studio-welcome">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <PenTool className="w-3.5 h-3.5" />
                <span>ทุกเรื่องราว ในทุกจักรวาล</span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
                ทุกเรื่อง เริ่มจากจินตนาการ
              </h1>

              <p className="text-slate-300 font-thai text-xs sm:text-sm leading-relaxed">
                เลือกเรื่องที่อยากเขียนต่อ แล้วสร้างฉากต่อไปในแบบของคุณ
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
                <span>เพิ่มตัวฉันเอง</span>
              </button>

              <button
                onClick={() => {
                  setModalType("friend");
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs font-thai transition-all shadow-md hover:scale-[1.02]"
              >
                <Users className="w-4 h-4" />
                <span>เพิ่มเพื่อน</span>
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

        <section className="studio-project-filters" aria-label="ค้นหาเรื่องที่จะแต่ง">
          <div className="studio-projects-heading"><h2>เรื่องราวของคุณ <span>{filteredProjects.length} เรื่อง</span></h2><Link href="/characters">จัดการตัวละคร <ArrowUpRight size={13}/></Link></div>
          <div className="studio-filter-fields"><label className="studio-filter-search"><Search size={17}/><span className="sr-only">ค้นหาเรื่องที่จะแต่ง</span><input type="search" placeholder="ค้นหาชื่อเรื่องหรือจักรวาล…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></label><select aria-label="กรองเรื่องตามจักรวาล" value={universeFilter} onChange={e=>setUniverseFilter(e.target.value)}><option value="">ทุกจักรวาล</option>{Array.from(new Set(projects.map(p=>p.universe))).map(u=><option key={u}>{u}</option>)}</select></div>
        </section>
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
          <div className="studio-story-grid">
            {filteredProjects.map((project) => {
              const progressPct=project.partCount>0 ? Math.min(100,Math.max(0,Math.round(project.completedParts/project.partCount*100))):0;
              const hasCover=Boolean(project.coverImage && !project.coverImage.includes('story-placeholder'));
              return <article key={project.id} className={`studio-story-card ${hasCover?'has-cover':'no-cover'}`}>
                <div className="studio-story-art">
                  <Link className="studio-art-link" href={`/projects/${project.id}`} aria-label={`เปิดห้องเขียน ${project.title}`}>
                    <img src={project.coverImage || '/images/story-placeholder.svg'} alt="" loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/images/story-placeholder.svg';e.currentTarget.closest('article')?.classList.add('no-cover');}} />
                  </Link>
                  <div className="studio-story-shade" />
                  <span className="studio-universe-tag">{project.universe}</span>
                  <details className="studio-story-menu"><summary aria-label={`ตัวเลือกเรื่อง ${project.title}`}><MoreHorizontal size={19}/></summary><div><button type="button" onClick={()=>handleDelete(project.id,project.title)}><Trash2 size={15}/>ลบเรื่องนี้</button></div></details>
                  <div className="studio-story-title"><p>{project.partCount} ภาค <span>·</span> {project.sceneCount} ฉาก{project.timelineScope && <> <span>·</span> {project.timelineScope}</>}</p><Link href={`/projects/${project.id}`}><h3>{project.title}</h3></Link><p className="studio-story-description">{project.theme || 'เรื่องราวบทใหม่ กำลังรอให้คุณเขียนต่อ'}</p></div>
                </div>
                <div className="studio-story-content">
                  <dl className="studio-story-stats"><div><dt>ตัวละคร</dt><dd>{project.characterCount.toLocaleString()}</dd></div><div><dt>ฉากทั้งหมด</dt><dd>{project.sceneCount.toLocaleString()}</dd></div><div><dt>คำสะสม</dt><dd>{project.totalWordCount.toLocaleString()}</dd></div></dl>
                  <div className="studio-story-progress"><div><span>ความคืบหน้าภาค</span><span>{project.completedParts} / {project.partCount} <small>({progressPct}%)</small></span></div><progress aria-label={`ความคืบหน้า ${project.title}`} value={progressPct} max={100}/></div>
                  <div className="studio-story-primary-actions"><Link className="studio-write-link" href={`/projects/${project.id}`}><PenTool size={17}/>เขียนต่อ<ArrowUpRight size={16}/></Link><Link className="studio-read-link" href={`/projects/${project.id}/read`}><BookOpen size={17}/>เปิดอ่าน</Link></div>
                  <nav className="studio-story-tools" aria-label={`เครื่องมือ ${project.title}`}><Link href={`/projects/${project.id}/images`}><ImageIcon size={16}/>ภาพประกอบ</Link><Link href={`/projects/${project.id}/characters`}><Users size={16}/>ตัวละคร</Link><Link href={`/projects/${project.id}/timeline`}><GitBranch size={16}/>ไทม์ไลน์</Link></nav>
                </div>
              </article>;
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
