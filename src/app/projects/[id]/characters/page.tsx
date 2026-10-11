"use client";

import { useEffect, useState, use } from "react";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import {
  Users,
  Plus,
  Shield,
  Zap,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Skull,
  HelpCircle,
  Lock,
  Camera,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CharacterAvatarModal, AvatarCharacterInfo } from "@/components/characters/CharacterAvatarModal";

interface CharacterData {
  id: string;
  name: string;
  gender: string;
  startMbti: string;
  currentMbti: string;
  chosenRole: string;
  roleReason: string;
  faction: string;
  background: string;
  characterType?: "self" | "friend" | "canon";
  realNickname?: string;
  avatarUrl?: string;
  status: "alive" | "dead" | "missing" | "captive";
  locationNow: string;
  visualSheet: string;
  visualSheetParsed: {
    age?: string;
    build?: string;
    hair_eyes?: string;
    facial_traits?: string;
    clothing?: string;
    scars_marks?: string;
  };
  abilities: Array<{
    id: string;
    name: string;
    origin: string;
    linkToPersonality: string;
    cost: string;
  }>;
  changeLogs?: Array<{
    id: string;
    mbtiBefore: string;
    mbtiAfter: string;
    triggerEvent: string;
    beliefs: string;
    losses: string;
    createdAt: string;
  }>;
}

interface ProjectData {
  id: string;
  title: string;
  universe: string;
  timelineScope: string;
}

export default function CharacterBiblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Partial<CharacterData> | null>(null);
  const [newAbilityName, setNewAbilityName] = useState("");
  const [newAbilityCost, setNewAbilityCost] = useState("");

  // Quick Avatar Modal State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarModalChar, setAvatarModalChar] = useState<AvatarCharacterInfo | null>(null);

  const handleOpenAvatarModal = (char: CharacterData) => {
    setAvatarModalChar({
      id: char.id,
      name: char.name,
      realNickname: char.realNickname,
      characterType: char.characterType,
      chosenRole: char.chosenRole,
      avatarUrl: char.avatarUrl,
    });
    setAvatarModalOpen(true);
  };

  const handleAvatarSuccess = (charId: string, newAvatarUrl: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, avatarUrl: newAvatarUrl } : c))
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      setProject(data.project);
      setCharacters(data.characters || []);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลด Character Bible ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const openAddModal = () => {
    setEditingChar({
      id: "",
      name: "",
      gender: "ชาย",
      startMbti: "INTJ",
      currentMbti: "INTJ",
      chosenRole: "",
      roleReason: "",
      faction: "",
      background: "",
      avatarUrl: "",
      status: "alive",
      locationNow: "",
      visualSheetParsed: {
        age: "",
        build: "",
        hair_eyes: "",
        facial_traits: "",
        clothing: "",
        scars_marks: "",
      },
      abilities: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (char: CharacterData) => {
    setEditingChar({
      ...char,
      avatarUrl: char.avatarUrl || "",
      visualSheetParsed: char.visualSheetParsed || {},
      abilities: [...(char.abilities || [])],
    });
    setIsModalOpen(true);
  };

  const handleSaveCharacter = async () => {
    if (!editingChar || !editingChar.name?.trim()) {
      toast.error("กรุณากรอกชื่อตัวละคร");
      return;
    }

    try {
      const isNew = !editingChar.id;
      const url = isNew
        ? `/api/projects/${projectId}/characters`
        : `/api/projects/${projectId}/characters/${editingChar.id}`;

      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingChar.name,
          gender: editingChar.gender,
          startMbti: editingChar.startMbti,
          currentMbti: editingChar.currentMbti,
          chosenRole: editingChar.chosenRole,
          roleReason: editingChar.roleReason,
          faction: editingChar.faction,
          background: editingChar.background,
          characterType: editingChar.characterType || "friend",
          realNickname: editingChar.realNickname || "",
          avatarUrl: editingChar.avatarUrl || "",
          status: editingChar.status,
          locationNow: editingChar.locationNow,
          visualSheet: editingChar.visualSheetParsed,
          abilities: editingChar.abilities,
        }),
      });

      if (!res.ok) throw new Error("บันทึกข้อมูลตัวละครล้มเหลว");

      toast.success(isNew ? "เพิ่มตัวละครใหม่สำเร็จ" : "อัปเดตข้อมูลตัวละครสำเร็จ");
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      toast.error(msg);
    }
  };

  const handleDeleteCharacter = async (charId: string, name: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบตัวละคร "${name}" หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/characters/${charId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      toast.success(`ลบตัวละคร "${name}" เรียบร้อย`);
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "alive":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>มีชีวิตอยู่</span>
          </span>
        );
      case "dead":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/90 text-red-300 border border-red-800/80">
            <Skull className="w-3 h-3 text-red-400" />
            <span>เสียชีวิตแล้ว</span>
          </span>
        );
      case "missing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span>สูญหาย</span>
          </span>
        );
      case "captive":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/80">
            <Lock className="w-3 h-3 text-purple-400" />
            <span>ถูกจับกุม/คุมขัง</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {project && (
        <ProjectHeader
          projectId={project.id}
          title={project.title}
          universe={project.universe}
          timelineScope={project.timelineScope}
        />
      )}

      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>CHARACTER BIBLE</span>
            <span className="text-sm font-normal text-slate-400 font-thai">
              ({characters.length} ตัวละคร)
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-thai">
            คัมภีร์ตัวละคร: ติดตามพัฒนาการทางจิตวิทยา (MBTI Drift), Visual Sheet สำหรับภาพ AI,
            และพลังความสามารถ
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors font-thai text-xs shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มตัวละครใหม่</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-72 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
          <Users className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-1 font-thai">ยังไม่มีตัวละครในโปรเจกต์นี้</h3>
          <p className="text-slate-400 text-xs font-thai mb-4">
            เพิ่มตัวละครเพื่อนำไปสร้างฉากและสร้างภาพประกอบต่อเนื่อง
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai"
          >
            เพิ่มตัวละครคนแรก
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {characters.map((char) => {
            const hasMbtiShift =
              char.startMbti &&
              char.currentMbti &&
              char.startMbti !== char.currentMbti;

            return (
              <div
                key={char.id}
                className="cinematic-card rounded-xl p-6 border-slate-800 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Avatar Thumbnail */}
                      <button
                        type="button"
                        onClick={() => handleOpenAvatarModal(char)}
                        className={`relative group/avatar w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                          char.characterType === "self"
                            ? "border-amber-400 bg-amber-950/60 text-amber-300 hover:ring-2 hover:ring-amber-400/50"
                            : char.characterType === "friend"
                            ? "border-sky-400 bg-sky-950/60 text-sky-300 hover:ring-2 hover:ring-sky-400/50"
                            : "border-slate-500 bg-slate-800 text-slate-300 hover:ring-2 hover:ring-slate-400/50"
                        }`}
                        title={`คลิกเพื่อเปลี่ยนรูปโปรไฟล์ของ ${char.name}`}
                      >
                        {char.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={char.avatarUrl}
                            alt={char.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-heading font-bold text-sm uppercase">
                            {(char.realNickname || char.name).slice(0, 2)}
                          </span>
                        )}
                        <span className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Camera className="w-4 h-4" />
                        </span>
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading text-xl font-bold text-white">
                            {char.name}
                          </h3>
                        {char.characterType === "self" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-thai">
                            👑 ตัวฉันเอง (Self)
                          </span>
                        )}
                        {char.characterType === "friend" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60 font-thai">
                            🧑‍🤝‍🧑 เพื่อนในแก๊ง {char.realNickname ? `(ชื่อเล่น: ${char.realNickname})` : ""}
                          </span>
                        )}
                        {char.characterType === "canon" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-thai">
                            ⚔️ ตัวละครเดิมในเรื่อง
                          </span>
                        )}
                        {getStatusBadge(char.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-thai">
                        {char.faction && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            สังกัด: {char.faction}
                          </span>
                        )}
                        {char.gender && <span>เพศ: {char.gender}</span>}
                        {char.locationNow && <span>ตำแหน่ง: {char.locationNow}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(char)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                        title="แก้ไขตัวละคร"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCharacter(char.id, char.name)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                        title="ลบตัวละคร"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* MBTI Evolution Banner */}
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-thai">พัฒนาการทางจิตวิทยา (MBTI):</span>
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {char.startMbti || "ไม่ระบุ"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span
                        className={`px-2 py-0.5 rounded ${
                          hasMbtiShift
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {char.currentMbti || char.startMbti || "ไม่ระบุ"}
                      </span>
                    </div>
                  </div>

                  {/* Chosen Role & Narrative Purpose */}
                  {char.chosenRole && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-amber-400 font-thai">
                        บทบาทในเรื่อง: {char.chosenRole}
                      </span>
                      {char.roleReason && (
                        <p className="text-xs text-slate-300 font-thai line-clamp-2">
                          {char.roleReason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Visual Sheet Details */}
                  <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 font-thai">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Visual Sheet (ลักษณะสำหรับ Image AI):</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-thai">
                      <div>
                        <span className="text-slate-500">ใบหน้า/ดวงตา:</span>{" "}
                        {char.visualSheetParsed?.hair_eyes || "ไม่ระบุ"}
                      </div>
                      <div>
                        <span className="text-slate-500">รูปร่าง:</span>{" "}
                        {char.visualSheetParsed?.build || "สมส่วน"}
                      </div>
                      <div>
                        <span className="text-slate-500">เครื่องแต่งกาย:</span>{" "}
                        {char.visualSheetParsed?.clothing || "ตามสังกัด"}
                      </div>
                      <div>
                        <span className="text-slate-500">รอยแผลเป็น:</span>{" "}
                        {char.visualSheetParsed?.scars_marks || "ไม่มี"}
                      </div>
                    </div>
                  </div>

                  {/* Abilities list */}
                  {char.abilities && char.abilities.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 font-thai">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>พลังและความสามารถ:</span>
                      </div>
                      <div className="space-y-1">
                        {char.abilities.map((ab) => (
                          <div
                            key={ab.id}
                            className="text-xs bg-slate-950 p-2 rounded border border-slate-800 font-thai"
                          >
                            <span className="font-bold text-amber-300">{ab.name}</span>
                            {ab.cost && (
                              <span className="text-red-400 ml-2">
                                (ราคาที่ต้องจ่าย: {ab.cost})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer notes */}
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-thai flex items-center justify-between">
                  <span>สถานะปัจจุบัน: {char.status}</span>
                  <span>ID: {char.id.slice(0, 8)}...</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Character Modal */}
      {isModalOpen && editingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="cinematic-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 border-slate-700 space-y-5 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white">
                {editingChar.id ? "แก้ไขข้อมูลตัวละคร" : "เพิ่มตัวละครใหม่ใน Bible"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-4">
              {/* Avatar Section */}
              <div className="flex items-center gap-4 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-800 flex items-center justify-center flex-shrink-0 text-white shadow-md">
                  {editingChar.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editingChar.avatarUrl}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-heading font-bold text-base">
                      {(editingChar.realNickname || editingChar.name || "??").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <label className="text-xs font-semibold text-slate-300 font-thai flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>รูปโปรไฟล์ตัวละคร (Avatar)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="วางลิงก์ URL หรือกดปุ่มอัปโหลด..."
                      value={editingChar.avatarUrl || ""}
                      onChange={(e) =>
                        setEditingChar((prev) => ({ ...prev, avatarUrl: e.target.value }))
                      }
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>อัปโหลด</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const res = await fetch("/api/characters/avatar", {
                              method: "POST",
                              body: formData,
                            });
                            const d = await res.json();
                            if (res.ok && d.url) {
                              setEditingChar((prev) => ({ ...prev, avatarUrl: d.url }));
                              toast.success("อัปโหลดรูปโปรไฟล์สำเร็จ!");
                            } else {
                              toast.error(d.error || "อัปโหลดไม่สำเร็จ");
                            }
                          } catch {
                            toast.error("เกิดข้อผิดพลาดในการอัปโหลด");
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ชื่อตัวละครในเรื่อง <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingChar.name || ""}
                    onChange={(e) =>
                      setEditingChar((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">ประเภทตัวละคร</label>
                  <select
                    value={editingChar.characterType || "friend"}
                    onChange={(e) =>
                      setEditingChar((prev) => ({
                        ...prev,
                        characterType: e.target.value as "self" | "friend" | "canon",
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                  >
                    <option value="self">👑 ตัวฉันเอง (Self)</option>
                    <option value="friend">🧑‍🤝‍🧑 เพื่อนในแก๊ง (Friend)</option>
                    <option value="canon">⚔️ ตัวละครดั้งเดิมในเรื่อง (Canon)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ชื่อเล่นจริงในชีวิตจริง (Real Nickname)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น มอส, นนท์, ก้อย"
                    value={editingChar.realNickname || ""}
                    onChange={(e) =>
                      setEditingChar((prev) => ({ ...prev, realNickname: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">สถานะ</label>
                  <select
                    value={editingChar.status || "alive"}
                    onChange={(e) =>
                      setEditingChar((prev) => ({
                        ...prev,
                        status: e.target.value as "alive" | "dead" | "missing" | "captive",
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                  >
                    <option value="alive">มีชีวิตอยู่ (Alive)</option>
                    <option value="dead">เสียชีวิตแล้ว (Dead)</option>
                    <option value="missing">สูญหาย (Missing)</option>
                    <option value="captive">ถูกจองจำ/คุมขัง (Captive)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    MBTI ตั้งต้น
                  </label>
                  <input
                    type="text"
                    value={editingChar.startMbti || ""}
                    onChange={(e) =>
                      setEditingChar((prev) => ({ ...prev, startMbti: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    MBTI ปัจจุบัน (วิวัฒนาการ)
                  </label>
                  <input
                    type="text"
                    value={editingChar.currentMbti || ""}
                    onChange={(e) =>
                      setEditingChar((prev) => ({ ...prev, currentMbti: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ฝ่าย / สังกัด
                  </label>
                  <input
                    type="text"
                    value={editingChar.faction || ""}
                    onChange={(e) =>
                      setEditingChar((prev) => ({ ...prev, faction: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ตำแหน่งปัจจุบัน
                  </label>
                  <input
                    type="text"
                    value={editingChar.locationNow || ""}
                    onChange={(e) =>
                      setEditingChar((prev) => ({ ...prev, locationNow: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  บทบาทที่ได้รับ (Chosen Role)
                </label>
                <input
                  type="text"
                  value={editingChar.chosenRole || ""}
                  onChange={(e) =>
                    setEditingChar((prev) => ({ ...prev, chosenRole: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  หน้าที่และเป้าหมายในเส้นเรื่อง (Narrative Purpose)
                </label>
                <textarea
                  rows={2}
                  value={editingChar.roleReason || ""}
                  onChange={(e) =>
                    setEditingChar((prev) => ({ ...prev, roleReason: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Visual Sheet Details */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-300 font-thai">
                  Visual Sheet (ข้อมูลสำหรับรักษารูปลักษณ์ใน Image AI)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-thai">
                  <div>
                    <label className="text-slate-400 block mb-1">สีผม / แววตา:</label>
                    <input
                      type="text"
                      value={editingChar.visualSheetParsed?.hair_eyes || ""}
                      onChange={(e) =>
                        setEditingChar((prev) => ({
                          ...prev,
                          visualSheetParsed: {
                            ...prev?.visualSheetParsed,
                            hair_eyes: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">แผลเป็น / สัญลักษณ์เด่น:</label>
                    <input
                      type="text"
                      value={editingChar.visualSheetParsed?.scars_marks || ""}
                      onChange={(e) =>
                        setEditingChar((prev) => ({
                          ...prev,
                          visualSheetParsed: {
                            ...prev?.visualSheetParsed,
                            scars_marks: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">เครื่องแต่งกายประจำ:</label>
                    <input
                      type="text"
                      value={editingChar.visualSheetParsed?.clothing || ""}
                      onChange={(e) =>
                        setEditingChar((prev) => ({
                          ...prev,
                          visualSheetParsed: {
                            ...prev?.visualSheetParsed,
                            clothing: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">อายุ / รูปร่าง:</label>
                    <input
                      type="text"
                      value={editingChar.visualSheetParsed?.build || ""}
                      onChange={(e) =>
                        setEditingChar((prev) => ({
                          ...prev,
                          visualSheetParsed: {
                            ...prev?.visualSheetParsed,
                            build: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-thai"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveCharacter}
                className="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-xs font-thai shadow"
              >
                บันทึกตัวละคร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Character Avatar Modal */}
      <CharacterAvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        character={avatarModalChar}
        projectId={projectId}
        onSuccess={handleAvatarSuccess}
      />
    </div>
  );
}
