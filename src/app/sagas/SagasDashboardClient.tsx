"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  PenTool,
  Users,
  Flame,
  Search,
} from "lucide-react";
import { CollaboratorModal } from "@/components/collaboration/CollaboratorModal";
import type { SagaProjectItem } from "@/types/project";

interface SagasDashboardClientProps {
  initialProjects?: SagaProjectItem[];
}

export default function SagasDashboardClient({ initialProjects = [] }: SagasDashboardClientProps) {
  const [projects, setProjects] = useState<SagaProjectItem[]>(initialProjects);
  const [loading, setLoading] = useState(initialProjects.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUniverse, setSelectedUniverse] = useState("all");
  const [selectedCollabProject, setSelectedCollabProject] = useState<SagaProjectItem | null>(null);

  useEffect(() => {
    // If not provided from server, check localStorage
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

    // Background revalidation
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
      console.warn("fetchProjects:", err);
    } finally {
      clearTimeout(timer);
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
    <div className="library-page">
      <section className="library-intro">
        <div><p className="library-eyebrow">เรื่องราวของคุณ</p><h1>วันนี้ อยากอ่านเรื่องไหน<span className="brand-dot">?</span></h1><p className="text-slate-400 mt-3">เรื่องโปรด โลกใบใหม่ และเวลาสักหน่อยให้ตัวเอง</p></div>
        <span className="library-count">{projects.length} เรื่องในคลัง</span>
      </section>
      <section aria-label="ค้นหานิยาย" className="library-filters">
        <label className="library-search"><Search size={19} aria-hidden="true" /><span className="sr-only">ค้นหาชื่อเรื่อง จักรวาล หรือธีม</span><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อเรื่อง จักรวาล หรือธีม…" /></label>
        <label className="library-universe"><span className="sr-only">กรองจักรวาล</span><select value={selectedUniverse} onChange={e => setSelectedUniverse(e.target.value)}>{universes.map(u => <option key={u} value={u}>{u === "all" ? "ทุกจักรวาล" : u}</option>)}</select></label>
        <span className="text-sm text-slate-400" aria-live="polite">{filteredProjects.length} เรื่อง</span>
      </section>
      {loading && projects.length === 0 ? <div className="bookshelf" aria-label="กำลังโหลดนิยาย" aria-busy="true">{[1,2,3].map(i => <div key={i} className="h-96 bg-slate-900 rounded-xl animate-pulse" />)}</div> : filteredProjects.length === 0 ? (
        <div className="library-empty"><BookOpen size={36} className="mx-auto text-amber-300" /><h2>{projects.length ? "ไม่พบเรื่องที่ค้นหา" : "ชั้นหนังสือกำลังรอเรื่องแรก"}</h2><p>{projects.length ? "ลองเปลี่ยนคำค้นหรือเลือกจักรวาลอื่น" : "สร้างเรื่องใหม่ แล้วกลับมาอ่านได้ที่นี่"}</p>{projects.length ? <button onClick={() => {setSearchQuery(""); setSelectedUniverse("all");}} className="reader-primary">ล้างตัวกรอง</button> : <Link href="/projects/new" className="reader-primary">สร้างเรื่องแรก</Link>}</div>
      ) : <><section className="reading-picks" aria-label="หยิบมาอ่าน"><div className="shelf-section-heading"><h2>หยิบมาอ่าน</h2><span>ให้เรื่องราวพาคุณไป</span></div><div className="reading-pick-grid">{filteredProjects.slice(0,3).map((project,index)=><Link key={project.id} href={`/projects/${project.id}/read`} className={`reading-pick reading-pick-${index}`}><img src={project.coverImage || '/images/story-placeholder.svg'} alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/images/story-placeholder.svg';}}/><div><span>{project.universe}</span><h3>{project.title}</h3><p><BookOpen size={14}/> เปิดอ่านเรื่องนี้ <span aria-hidden="true">↗</span></p></div></Link>)}</div></section><div className="shelf-section-heading"><h2>หนังสือของคุณ</h2><span>{filteredProjects.length} เรื่องในคลัง</span></div><div className="bookshelf">{filteredProjects.map((project, index) => (
        <Fragment key={project.id}><article className="book-card">
          <Link href={`/projects/${project.id}/read`} className="book-cover" aria-label={`อ่าน ${project.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.coverImage || "/images/story-placeholder.svg"} alt="" loading={index === 0 ? "eager" : "lazy"} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/story-placeholder.svg"; }} />
            <span className="book-cover-action"><BookOpen size={17} /> เริ่มอ่าน</span>
          </Link>
          <div className="book-details"><p className="book-universe">{project.universe}</p><Link href={`/projects/${project.id}/read`}><h2>{project.title}</h2></Link><p className="book-description">{project.theme || "ยังไม่มีคำโปรยสำหรับเรื่องนี้"}</p><p className="book-meta">{project.partCount || 0} ภาค <span>·</span> {project.sceneCount || 0} ฉาก</p>
          <div className="book-actions"><Link className="reader-primary" href={`/projects/${project.id}/read`}><BookOpen size={16} /> อ่านเรื่องนี้</Link><Link className="book-tool" href={`/projects/${project.id}`} aria-label={`เขียนต่อ ${project.title}`} title="เขียนต่อ"><PenTool size={17} /></Link><button className="book-tool" onClick={() => setSelectedCollabProject(project)} aria-label={`เชิญเพื่อนร่วมแต่ง ${project.title}`} title="เชิญเพื่อนร่วมแต่ง"><Users size={17} /></button></div></div>
        </article></Fragment>
      ))}</div></>}
      {selectedCollabProject && <CollaboratorModal isOpen onClose={() => setSelectedCollabProject(null)} projectId={selectedCollabProject.id} projectTitle={selectedCollabProject.title} universe={selectedCollabProject.universe} />}
    </div>
  );
}
