"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import {
  GitBranch,
  Users,
  Clock,
  Shield,
  Heart,
  Skull,
  Activity,
  AlertTriangle,
  Flame,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface PartItem {
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
    location: string;
    summary: string;
    wordCount: number;
    createdAt: string;
  }>;
}

interface CharacterItem {
  id: string;
  name: string;
  characterType?: "self" | "friend" | "canon";
  realNickname?: string;
  startMbti?: string;
  currentMbti?: string;
  chosenRole?: string;
  faction?: string;
  status?: string;
}

interface RelationshipItem {
  id: string;
  charA: string;
  charB: string;
  type: string;
  trustLevel: number;
  note: string;
  changedAtScene?: string;
}

interface ChangeLogItem {
  id: string;
  partId: string;
  characterId: string;
  characterName: string;
  realNickname?: string;
  mbtiBefore: string;
  mbtiAfter: string;
  triggerEvent: string;
  beliefs: string;
  losses: string;
  createdAt: string;
}

interface LedgerData {
  deaths?: string[];
  injuries_scars?: string[];
  who_knows_whom?: string[];
  possessions_secrets?: string[];
  locations?: Record<string, string>;
  canon_deviations?: string[];
  open_threads?: string[];
}

export default function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLogItem[]>([]);
  const [currentLedger, setCurrentLedger] = useState<LedgerData>({});
  const [loading, setLoading] = useState(true);

  // Active view tab: "timeline" | "relationships" | "evolution" | "ledger"
  const [activeTab, setActiveTab] = useState<
    "timeline" | "relationships" | "evolution" | "ledger"
  >("timeline");

  // Relationship editor modal
  const [editingRel, setEditingRel] = useState<Partial<RelationshipItem> | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, timeRes, relRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/timeline`),
        fetch(`/api/projects/${projectId}/relationships`),
      ]);

      if (projRes.ok) {
        const pData = await projRes.json();
        setProject(pData.project);
        setCharacters(pData.project.characters || []);
      }

      if (timeRes.ok) {
        const tData = await timeRes.json();
        setParts(tData.parts || []);
        setChangeLogs(tData.changeLogs || []);
        if (tData.ledgers && tData.ledgers.length > 0) {
          setCurrentLedger(tData.ledgers[0].data || {});
        }
      }

      if (relRes.ok) {
        const rData = await relRes.json();
        setRelationships(rData.relationships || []);
        if (!characters.length && rData.characters) {
          setCharacters(rData.characters);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  const getCharName = (idOrName: string) => {
    const c = characters.find((ch) => ch.id === idOrName || ch.name === idOrName);
    if (!c) return idOrName;
    return c.realNickname ? `${c.name} (${c.realNickname})` : c.name;
  };

  const handleSaveRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRel || !editingRel.charA || !editingRel.charB) {
      toast.error("กรุณาระบุตัวละครทั้ง 2 ฝ่าย");
      return;
    }
    if (editingRel.charA === editingRel.charB) {
      toast.error("ไม่สามารถสร้างความสัมพันธ์กับตัวเองได้");
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRel),
      });

      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      toast.success("บันทึกความสัมพันธ์สำเร็จ");
      setEditingRel(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(msg);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm("คุณต้องการลบความสัมพันธ์นี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/relationships?relId=${relId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      toast.success("ลบความสัมพันธ์เรียบร้อย");
      setRelationships((prev) => prev.filter((r) => r.id !== relId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(msg);
    }
  };

  const getTrustColor = (trust: number) => {
    if (trust >= 3) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (trust >= 1) return "text-teal-300 bg-teal-500/10 border-teal-500/30";
    if (trust === 0) return "text-slate-300 bg-slate-800 border-slate-700";
    if (trust >= -2) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-red-400 bg-red-500/10 border-red-500/30";
  };

  const getTrustLabel = (trust: number) => {
    if (trust >= 4) return "สหายร่วมเป็นร่วมตาย (+5)";
    if (trust >= 2) return "พันธมิตรที่ไว้ใจได้ (+2 ถึง +3)";
    if (trust >= 1) return "มิตรภาพเบื้องต้น (+1)";
    if (trust === 0) return "ระแวง / คนแปลกหน้า (0)";
    if (trust >= -2) return "หวาดระแวง / ขัดผลประโยชน์ (-1 ถึง -2)";
    return "ศัตรูคู่อาฆาต / แค้นฝังลึก (-3 ถึง -5)";
  };

  if (loading && !project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <ProjectHeader
        projectId={projectId}
        title={project?.title || "Timeline & Relations"}
        universe={project?.universe || ""}
        timelineScope={project?.timelineScope}
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-thai transition-all flex items-center gap-2 ${
              activeTab === "timeline"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>ไทม์ไลน์ภาค & ฉาก (Parts Timeline)</span>
          </button>

          <button
            onClick={() => setActiveTab("relationships")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-thai transition-all flex items-center gap-2 ${
              activeTab === "relationships"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>กราฟ & ระดับความไว้ใจ (Relationship Matrix)</span>
          </button>

          <button
            onClick={() => setActiveTab("evolution")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-thai transition-all flex items-center gap-2 ${
              activeTab === "evolution"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>วิวัฒนาการ MBTI (Psychological Change Logs)</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-thai transition-all flex items-center gap-2 ${
              activeTab === "ledger"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>สถานะความต่อเนื่อง (Continuity Ledger)</span>
          </button>
        </div>

        {activeTab === "relationships" && (
          <button
            onClick={() =>
              setEditingRel({
                charA: characters[0]?.name || "",
                charB: characters[1]?.name || "",
                type: "พันธมิตรระแวงระวัง",
                trustLevel: 0,
                note: "",
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold font-thai hover:bg-amber-400"
          >
            <Plus className="w-4 h-4" />
            <span>+ ผูกสัมพันธ์ใหม่</span>
          </button>
        )}
      </div>

      {/* TAB 1: TIMELINE OF PARTS & SCENES */}
      {activeTab === "timeline" && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white font-heading">
                MULTI-PART STORY TIMELINE
              </h2>
              <p className="text-xs text-slate-400 font-thai">
                ภาพรวมลำดับภาค (Parts) และฉาก (Scenes) ความคืบหน้าของมหากาพย์
              </p>
            </div>
            <Link
              href={`/projects/${projectId}`}
              className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1 font-thai"
            >
              <span>ไปที่ Studio เพื่อเขียนต่อ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="relative border-l-2 border-amber-500/30 ml-4 pl-6 space-y-10">
            {parts.map((part) => (
              <div key={part.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-300">
                  {part.number}
                </div>

                {/* Part Card */}
                <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                        PART {part.number}
                      </span>
                      <h3 className="text-base font-bold text-white font-heading">
                        {part.title}
                      </h3>
                      {part.scope && (
                        <span className="text-xs text-slate-400 font-thai">({part.scope})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded font-semibold font-thai ${
                          part.status === "done"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : part.status === "drafting"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {part.status === "done"
                          ? "✓ สมบูรณ์แล้ว"
                          : part.status === "drafting"
                          ? "✍ กำลังเขียน"
                          : "วางโครงร่าง"}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {part.scenes.length} ฉาก
                      </span>
                    </div>
                  </div>

                  {part.theme && (
                    <p className="text-xs text-amber-300/80 font-thai">
                      <strong className="text-amber-400">ธีมหลักภาค:</strong> {part.theme}
                    </p>
                  )}

                  {part.peakSummary && (
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 font-thai leading-relaxed">
                      <span className="text-amber-400 font-semibold block mb-0.5">
                        จุดไคลแม็กซ์ของภาค:
                      </span>
                      {part.peakSummary}
                    </div>
                  )}

                  {/* Scenes in this Part */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-semibold text-slate-400 font-thai uppercase tracking-wider">
                      ฉากในภาคนี้ (Scenes):
                    </h4>
                    {part.scenes.length === 0 ? (
                      <p className="text-xs text-slate-600 font-thai italic">
                        ยังไม่มีฉากในภาคนี้
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {part.scenes.map((scene) => (
                          <div
                            key={scene.id}
                            className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white font-heading">
                                ฉาก {scene.order}: {scene.title}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {scene.wordCount} คำ
                              </span>
                            </div>
                            {scene.location && (
                              <p className="text-[11px] text-slate-400 font-thai">
                                📍 {scene.location}
                              </p>
                            )}
                            {scene.summary && (
                              <p className="text-xs text-slate-300 font-thai line-clamp-2 leading-relaxed">
                                {scene.summary}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: RELATIONSHIP MATRIX & TRUST LEVELS */}
      {activeTab === "relationships" && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white font-heading">
              CHARACTER RELATIONSHIP MATRIX (-5 ถึง +5)
            </h2>
            <p className="text-xs text-slate-400 font-thai">
              สายสัมพันธ์ ระดับความไว้ใจ และความผูกพันระหว่างผู้ใช้ แก๊งเพื่อน และตัวละคร Canon
            </p>
          </div>

          {relationships.length === 0 ? (
            <div className="cinematic-card rounded-xl p-8 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300 font-thai">
                ยังไม่มีข้อมูลความสัมพันธ์ที่บันทึกไว้
              </h3>
              <p className="text-xs text-slate-500 font-thai max-w-md mx-auto">
                เมื่อสั่งเขียนฉากและใช้ AI ตรวจสอบฉาก (Scene Analyzer) หรือคลิก &quot;+ ผูกสัมพันธ์ใหม่&quot;
                ด้านบน ระบบจะคำนวณระดับความไว้ใจและบันทึกไว้ที่นี่
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="cinematic-card rounded-xl p-5 border-slate-800 space-y-4 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold border ${getTrustColor(
                        rel.trustLevel
                      )}`}
                    >
                      {getTrustLabel(rel.trustLevel)}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => setEditingRel(rel)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRelationship(rel.id)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Characters Pair */}
                  <div className="flex items-center justify-between px-2 py-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-center flex-1">
                      <span className="text-xs font-bold text-white block">
                        {getCharName(rel.charA)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        {rel.trustLevel > 0 ? `+${rel.trustLevel}` : rel.trustLevel}
                      </span>
                      <div className="w-12 h-0.5 bg-slate-700 my-1 relative">
                        <div
                          className={`h-full ${
                            rel.trustLevel > 0 ? "bg-emerald-400" : "bg-red-400"
                          }`}
                          style={{
                            width: `${Math.abs(rel.trustLevel) * 20}%`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 font-thai">{rel.type}</span>
                    </div>

                    <div className="text-center flex-1">
                      <span className="text-xs font-bold text-white block">
                        {getCharName(rel.charB)}
                      </span>
                    </div>
                  </div>

                  {/* Note */}
                  {rel.note && (
                    <p className="text-xs text-slate-300 font-thai leading-relaxed italic bg-slate-900/40 p-2.5 rounded border border-slate-800/60">
                      &quot;{rel.note}&quot;
                    </p>
                  )}

                  {rel.changedAtScene && (
                    <div className="text-[11px] text-slate-500 font-thai text-right">
                      จุดเปลี่ยน: {rel.changedAtScene}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PSYCHOLOGICAL EVOLUTION & CHANGE LOGS */}
      {activeTab === "evolution" && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white font-heading">
              CHARACTER MBTI EVOLUTION LOGS
            </h2>
            <p className="text-xs text-slate-400 font-thai">
              ประวัติการเปลี่ยนแปลงทางจิตวิทยา จากอุดมคติสู่ความดาร์ก (MBTI Before &rarr; MBTI After)
            </p>
          </div>

          {changeLogs.length === 0 ? (
            <div className="cinematic-card rounded-xl p-8 text-center space-y-3">
              <TrendingUp className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300 font-thai">
                ยังไม่มีบันทึกการเปลี่ยน MBTI ของตัวละคร
              </h3>
              <p className="text-xs text-slate-500 font-thai max-w-md mx-auto">
                เมื่อเรื่องราวดำเนินไปและตัวละครเผชิญเหตุการณ์วิกฤต (Trauma/Betrayal)
                AI จะนำเสนอการเปลี่ยน MBTI และราคาความสูญเสีย (Losses) ที่นี่
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {changeLogs.map((log) => (
                <div
                  key={log.id}
                  className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-heading">
                        {log.characterName}
                        {log.realNickname && ` (${log.realNickname})`}
                      </span>
                      <span className="text-slate-600">&bull;</span>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {log.mbtiBefore}
                        </span>
                        <span className="text-amber-400">&rarr;</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {log.mbtiAfter}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs text-slate-500 font-thai">
                      {new Date(log.createdAt).toLocaleDateString("th-TH")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-thai">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-red-400 font-semibold block">⚡ ชนวนเหตุการณ์ (Trigger):</span>
                      <p className="text-slate-300">{log.triggerEvent}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-amber-400 font-semibold block">
                        🛡 ความเชื่อใหม่ (New Beliefs):
                      </span>
                      <p className="text-slate-300">{log.beliefs || "ไม่มีข้อมูล"}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 font-semibold block">
                        💔 สิ่งที่สูญเสียไป (Losses / Cost):
                      </span>
                      <p className="text-slate-300">{log.losses || "ไม่มีข้อมูล"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONTINUITY LEDGER OVERVIEW */}
      {activeTab === "ledger" && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white font-heading">
              CURRENT CONTINUITY LEDGER STATUS
            </h2>
            <p className="text-xs text-slate-400 font-thai">
              หัวใจสำคัญของการรักษาความสมจริง — ใครตาย ใครบาดเจ็บ ใครอยู่ที่ไหน และปมที่เปิดค้างไว้
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Deaths */}
            <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm font-heading">
                <Skull className="w-4 h-4" />
                <span>การเสียชีวิต (DEATHS)</span>
              </div>
              {currentLedger.deaths && currentLedger.deaths.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300 font-thai">
                  {currentLedger.deaths.map((d, i) => (
                    <li key={i} className="p-2 rounded bg-red-950/20 border border-red-900/30">
                      {d}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 font-thai italic">ยังไม่มีตัวละครใดเสียชีวิต</p>
              )}
            </div>

            {/* Injuries & Scars */}
            <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-heading">
                <Activity className="w-4 h-4" />
                <span>บาดแผล & แผลเป็นถาวร (INJURIES)</span>
              </div>
              {currentLedger.injuries_scars && currentLedger.injuries_scars.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300 font-thai">
                  {currentLedger.injuries_scars.map((inj, i) => (
                    <li key={i} className="p-2 rounded bg-amber-950/20 border border-amber-900/30">
                      {inj}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 font-thai italic">ไม่มีบาดแผลถาวร</p>
              )}
            </div>

            {/* Canon Deviations */}
            <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm font-heading">
                <GitBranch className="w-4 h-4" />
                <span>จุดหักเหจาก CANON (DEVIATIONS)</span>
              </div>
              {currentLedger.canon_deviations && currentLedger.canon_deviations.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300 font-thai">
                  {currentLedger.canon_deviations.map((cd, i) => (
                    <li key={i} className="p-2 rounded bg-sky-950/20 border border-sky-900/30">
                      {cd}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 font-thai italic">ยังไม่มีการเบี่ยงเบนสำคัญ</p>
              )}
            </div>

            {/* Open Threads */}
            <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm font-heading">
                <Flame className="w-4 h-4" />
                <span>ปมสัญญาที่ยังไม่คลี่ (OPEN THREADS)</span>
              </div>
              {currentLedger.open_threads && currentLedger.open_threads.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300 font-thai">
                  {currentLedger.open_threads.map((ot, i) => (
                    <li key={i} className="p-2 rounded bg-emerald-950/20 border border-emerald-900/30">
                      {ot}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 font-thai italic">ไม่มีปมค้าง</p>
              )}
            </div>

            {/* Secrets & Possessions */}
            <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm font-heading">
                <Shield className="w-4 h-4" />
                <span>ความลับ & สิ่งของสำคัญ (SECRETS / POSSESSIONS)</span>
              </div>
              {currentLedger.possessions_secrets && currentLedger.possessions_secrets.length > 0 ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300 font-thai">
                  {currentLedger.possessions_secrets.map((sec, i) => (
                    <li key={i} className="p-2 rounded bg-purple-950/20 border border-purple-900/30">
                      {sec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 font-thai italic">ไม่มีความลับสำคัญ</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RELATIONSHIP MODAL */}
      {editingRel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5">
            <h3 className="text-base font-bold text-white font-heading">
              {editingRel.id ? "แก้ไขระดับความสัมพันธ์" : "ผูกความสัมพันธ์ใหม่"}
            </h3>

            <form onSubmit={handleSaveRelationship} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-thai">ตัวละครฝ่าย A</label>
                  <select
                    value={editingRel.charA || ""}
                    onChange={(e) => setEditingRel({ ...editingRel, charA: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.realNickname ? `${c.name} (${c.realNickname})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-thai">ตัวละครฝ่าย B</label>
                  <select
                    value={editingRel.charB || ""}
                    onChange={(e) => setEditingRel({ ...editingRel, charB: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.realNickname ? `${c.name} (${c.realNickname})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-thai">
                  ระดับความไว้ใจ (Trust Level: -5 ถึง +5)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={1}
                    value={editingRel.trustLevel ?? 0}
                    onChange={(e) =>
                      setEditingRel({ ...editingRel, trustLevel: parseInt(e.target.value) })
                    }
                    className="flex-1 accent-amber-400"
                  />
                  <span className="font-mono text-sm font-bold text-amber-400 w-8 text-right">
                    {(editingRel.trustLevel ?? 0) > 0
                      ? `+${editingRel.trustLevel}`
                      : editingRel.trustLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-thai">
                  {getTrustLabel(editingRel.trustLevel ?? 0)}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-thai">รูปแบบความสัมพันธ์</label>
                <input
                  type="text"
                  placeholder="เช่น พันธมิตรระแวงระวัง, ศัตรูร่วมสาบาน, คนรักลับๆ"
                  value={editingRel.type || ""}
                  onChange={(e) => setEditingRel({ ...editingRel, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-thai"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-thai">บันทึกเพิ่มเติม / สาเหตุ</label>
                <textarea
                  rows={2}
                  placeholder="เช่น เกิดเหตุการณ์ช่วยชีวิตในตอนที่บุกปราสาท..."
                  value={editingRel.note || ""}
                  onChange={(e) => setEditingRel({ ...editingRel, note: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-thai"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRel(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-thai hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
