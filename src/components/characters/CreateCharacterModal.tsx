"use client";

import { useState, useEffect } from "react";
import {
  X,
  Upload,
  User,
  Users,
  Camera,
  Sparkles,
  Check,
  Shield,
  Flame,
  Trash2,
  Crop,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarCropModal } from "./AvatarCropModal";

interface CharacterData {
  id?: string;
  name?: string;
  realNickname?: string;
  characterType?: "self" | "friend" | "canon" | "narrator";
  startMbti?: string;
  currentMbti?: string;
  gender?: string;
  faction?: string;
  chosenRole?: string;
  background?: string;
  avatarUrl?: string;
  projectId?: string;
}

interface CreateCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: "self" | "friend" | "canon";
  initialProjectId?: string;
  editCharacter?: CharacterData | null;
  onSuccess?: () => void;
}

interface ProjectOption {
  id: string;
  title: string;
  universe: string;
}

export function CreateCharacterModal({
  isOpen,
  onClose,
  initialType = "self",
  initialProjectId,
  editCharacter,
  onSuccess,
}: CreateCharacterModalProps) {
  const [characterType, setCharacterType] = useState<"self" | "friend" | "canon">(
    (editCharacter?.characterType as "self" | "friend" | "canon") || initialType
  );
  const [realNickname, setRealNickname] = useState(editCharacter?.realNickname || "");
  const [name, setName] = useState(editCharacter?.name || "");
  const [startMbti, setStartMbti] = useState(
    editCharacter?.currentMbti || editCharacter?.startMbti || "INTJ"
  );
  const [gender, setGender] = useState(editCharacter?.gender || "ชาย");
  const [faction, setFaction] = useState(editCharacter?.faction || "");
  const [roleWish, setRoleWish] = useState(editCharacter?.chosenRole || "");
  const [background, setBackground] = useState(editCharacter?.background || "");
  const [avatarUrl, setAvatarUrl] = useState(editCharacter?.avatarUrl || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);

  // Projects list for selecting target project
  const [projectsList, setProjectsList] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    editCharacter?.projectId || initialProjectId || ""
  );

  useEffect(() => {
    if (isOpen) {
      if (editCharacter) {
        setCharacterType((editCharacter.characterType as "self" | "friend" | "canon") || "self");
        setRealNickname(editCharacter.realNickname || "");
        setName(editCharacter.name || "");
        setStartMbti(editCharacter.currentMbti || editCharacter.startMbti || "INTJ");
        setGender(editCharacter.gender || "ชาย");
        setFaction(editCharacter.faction || "");
        setRoleWish(editCharacter.chosenRole || "");
        setBackground(editCharacter.background || "");
        setAvatarUrl(
          typeof editCharacter.avatarUrl === "string"
            ? editCharacter.avatarUrl
            : typeof (editCharacter.avatarUrl as any)?.url === "string"
            ? (editCharacter.avatarUrl as any).url
            : ""
        );
        if (editCharacter.projectId) {
          setSelectedProjectId(editCharacter.projectId);
        }
      } else {
        setCharacterType(initialType);
        setRealNickname("");
        setName("");
        setStartMbti("INTJ");
        setGender("ชาย");
        setFaction("");
        setRoleWish("");
        setBackground("");
        setAvatarUrl("");
      }
      fetchProjects();
    }
  }, [isOpen, initialType, editCharacter, initialProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(initialProjectId || data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const uploadCharacterAvatarFile = async (file: File) => {
    const isImage = file.type.startsWith("image/") || /\.(jfif|jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name);
    if (!isImage) {
      toast.error("กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, JFIF, GIF, WebP)");
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/characters/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "อัปโหลดรูปภาพไม่สำเร็จ");

      const finalUrl =
        typeof data.url === "string"
          ? data.url
          : typeof data.url === "object" && data.url !== null
          ? data.url.url || data.url.filePath || ""
          : "";

      setAvatarUrl(finalUrl);
      setShowCropModal(true);
      toast.success("อัปโหลดรูปสำเร็จ! สามารถปรับตำแหน่งรูปภาพได้เลย");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "อัปโหลดรูปภาพล้มเหลว";
      toast.error(msg);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadCharacterAvatarFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputNickname = String(realNickname || "").trim();
    const inputName = String(name || "").trim();

    if (characterType === "canon") {
      if (!inputName && !inputNickname) {
        toast.error("กรุณาระบุชื่อตัวละครในหนัง");
        return;
      }
    } else {
      if (!inputNickname) {
        toast.error("กรุณาระบุชื่อเล่นจริงของคุณหรือเพื่อน");
        return;
      }
    }

    if (!selectedProjectId) {
      toast.error("กรุณาเลือกโปรเจกต์เนื้อเรื่องที่ต้องการเพิ่มตัวละคร");
      return;
    }

    const effectiveNickname = inputNickname || inputName;
    const resolvedName = inputName || inputNickname;
    const safeAvatarUrl =
      typeof avatarUrl === "string"
        ? avatarUrl.trim()
        : typeof (avatarUrl as any)?.url === "string"
        ? (avatarUrl as any).url.trim()
        : "";
    const safeFaction = String(faction || "").trim() || (characterType === "canon" ? "ฝ่ายในเรื่อง" : "กลุ่มอิสระ");
    const safeRole =
      String(roleWish || "").trim() ||
      (characterType === "self"
        ? "ตัวเอกผู้ข้ามมิติ"
        : characterType === "canon"
        ? "ตัวละครในจักรวาลเรื่อง"
        : "สหายร่วมชะตากรรม");
    const safeBackground =
      String(background || "").trim() ||
      (characterType === "canon"
        ? "ตัวละครสำคัญตามเนื้อเรื่องดั้งเดิม"
        : "คนจากโลกปัจจุบันที่หลุดเข้ามาในโลกนี้พร้อมความทรงจำเดิม");

    try {
      setIsSubmitting(true);

      if (editCharacter && editCharacter.id) {
        // UPDATE existing character
        const res = await fetch(
          `/api/projects/${selectedProjectId}/characters/${editCharacter.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: resolvedName,
              realNickname: effectiveNickname,
              characterType,
              currentMbti: startMbti,
              startMbti,
              gender,
              faction: safeFaction,
              chosenRole: safeRole,
              background: safeBackground,
              avatarUrl: safeAvatarUrl,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "อัปเดตตัวละครไม่สำเร็จ");

        toast.success(`บันทึกการแก้ไข "${resolvedName}" เรียบร้อยแล้ว!`);
      } else {
        // CREATE new character
        const res = await fetch(`/api/projects/${selectedProjectId}/characters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: resolvedName,
            realNickname: effectiveNickname,
            characterType,
            startMbti,
            currentMbti: startMbti,
            gender,
            faction: safeFaction,
            chosenRole: safeRole,
            background: safeBackground,
            avatarUrl: safeAvatarUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "บันทึกตัวละครไม่สำเร็จ");

        toast.success(
          characterType === "self"
            ? `👑 บันทึกตัวละครของคุณ "${effectiveNickname}" เรียบร้อยแล้ว!`
            : characterType === "canon"
            ? `🎬 บันทึกตัวละครในหนัง "${resolvedName}" เรียบร้อยแล้ว!`
            : `🧑‍🤝‍🧑 เพิ่มเพื่อน "${effectiveNickname}" เข้ากลุ่มเรียบร้อยแล้ว!`
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(editCharacter && editCharacter.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1219] border border-slate-800 rounded-2xl max-w-xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white font-heading tracking-wide">
              {isEditing
                ? `✏️ แก้ไขข้อมูลตัวละคร: ${name || realNickname || editCharacter?.name}`
                : characterType === "self"
                ? "👑 สร้างตัวละครของคุณ (ตัวฉันเอง - ME)"
                : characterType === "canon"
                ? "🎬 เพิ่มตัวละครในหนัง / จักรวาล (MOVIE / CANON)"
                : "🧑‍🤝‍🧑 เพิ่มเพื่อนในกลุ่มของคุณ (SQUAD FRIEND)"}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-thai">
            {isEditing
              ? "ปรับแต่งชื่อเล่น ชื่อในเรื่อง MBTI และรูปถ่ายโปรไฟล์ตัวละคร"
              : characterType === "canon"
              ? "ระบุชื่อตัวละครในภาพยนตร์ ฝ่าย/ตระกูล และอัปโหลดภาพโปสเตอร์/โปรไฟล์เพื่อใช้จัดหมวดหมู่และดำเนินเรื่อง"
              : "กรอกชื่อจริงของคุณ MBTI และอัปโหลดรูปตัวเอง เพื่อให้ AI นำคุณและเพื่อนๆ ข้ามมิติไปโลดแล่นในมหากาพย์"}
          </p>
        </div>

        {/* Character Type Switcher (Me vs Friend vs Canon) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setCharacterType("self")}
            className={`flex-1 py-2 rounded-lg text-xs font-thai font-semibold transition-all flex items-center justify-center gap-1.5 ${
              characterType === "self"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>👑 ตัวฉันเอง (Me)</span>
          </button>
          <button
            type="button"
            onClick={() => setCharacterType("friend")}
            className={`flex-1 py-2 rounded-lg text-xs font-thai font-semibold transition-all flex items-center justify-center gap-1.5 ${
              characterType === "friend"
                ? "bg-sky-600 text-white font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🧑‍🤝‍🧑 เพื่อนในกลุ่ม (Squad)</span>
          </button>
          <button
            type="button"
            onClick={() => setCharacterType("canon")}
            className={`flex-1 py-2 rounded-lg text-xs font-thai font-semibold transition-all flex items-center justify-center gap-1.5 ${
              characterType === "canon"
                ? "bg-purple-600 text-white font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🎬 ในหนัง (Canon)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Target Saga Project Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-300 font-thai flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>เลือกเรื่องที่ต้องการให้ตัวละครนี้สังกัด</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
            >
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.universe})
                </option>
              ))}
            </select>
          </div>

          {/* Avatar Photo Upload & Preview Section */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingAvatar(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingAvatar(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingAvatar(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadCharacterAvatarFile(file);
            }}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center gap-4 transition-all ${
              isDraggingAvatar
                ? "bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/30 scale-[1.01]"
                : "bg-slate-950/80 border-slate-800"
            }`}
          >
            {/* Avatar Preview */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-900 border-2 border-amber-500/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={typeof avatarUrl === "string" ? avatarUrl : (avatarUrl as any)?.url || ""}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-9 h-9 text-slate-500" />
              )}

              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Photo Uploader Controls */}
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <div>
                <span className="text-xs font-bold text-white font-thai block">
                  รูปถ่ายของคุณ (Avatar Photo)
                </span>
                <span className="text-[11px] text-slate-400 font-thai">
                  {isDraggingAvatar
                    ? "ปล่อยรูปภาพที่นี่ (Drop Avatar Photo)"
                    : "คลิกหรือลากวางรูปถ่ายจริงจากเครื่องมาที่นี่ (รองรับ JPG, JFIF, PNG, WebP)"}
                </span>
              </div>

              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors font-thai">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{avatarUrl ? "เปลี่ยนรูปถ่าย" : "เลือกรูปจากเครื่อง (JPG/PNG/JFIF)"}</span>
                  <input
                    type="file"
                    accept="image/*,.jfif"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingPhoto}
                  />
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setShowCropModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/40 transition-colors font-thai shadow-sm"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>ปรับตำแหน่ง / ครอปรูป</span>
                  </button>
                )}

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-[11px] text-red-400 hover:underline font-thai ml-1"
                  >
                    ลบรูป
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields: Grid 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {characterType === "canon" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-300 font-thai flex items-center gap-1">
                    <span>ชื่อตัวละครในหนัง / จักรวาล</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Arya Stark, Jaime Lannister, Harry Potter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-thai"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ชื่อเล่น / คำเรียกสั้นๆ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อารยา, เจมี่ (เว้นว่างได้)"
                    value={realNickname}
                    onChange={(e) => setRealNickname(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-thai"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ชื่อเล่นจริงในชีวิตจริง <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={characterType === "self" ? "เช่น มอส, ก้อย, แบงค์" : "เช่น นนท์, บาส, ท็อป"}
                    value={realNickname}
                    onChange={(e) => setRealNickname(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ชื่อ/ฉายาในจักรวาลเรื่อง (In-universe Name)
                  </label>
                  <input
                    type="text"
                    placeholder={`เช่น Lord ${realNickname || "Moss"} of Winterfell (เว้นว่างได้)`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
                  />
                </div>
              </>
            )}
          </div>

          {/* Form Fields: Grid 2 (MBTI & Gender) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 font-thai">
                MBTI บุคลิกภาพ
              </label>
              <select
                value={startMbti}
                onChange={(e) => setStartMbti(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              >
                {[
                  "INTJ",
                  "INTP",
                  "ENTJ",
                  "ENTP",
                  "INFJ",
                  "INFP",
                  "ENFJ",
                  "ENFP",
                  "ISTJ",
                  "ISFJ",
                  "ESTJ",
                  "ESFJ",
                  "ISTP",
                  "ISFP",
                  "ESTP",
                  "ESFP",
                ].map((mbti) => (
                  <option key={mbti} value={mbti}>
                    {mbti}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 font-thai">เพศ</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
                <option value="ไม่ระบุ">ไม่ระบุ / อื่นๆ</option>
              </select>
            </div>
          </div>

          {/* Faction & Role Wish */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 font-thai">
                {characterType === "canon"
                  ? "ฝ่าย / สังกัด / หมวดหมู่ (Faction / Category)"
                  : "ฝ่าย / สังกัดที่อยากสังกัด"}
              </label>
              <input
                type="text"
                placeholder={
                  characterType === "canon"
                    ? "เช่น House Stark, House Lannister, Night's Watch, Faceless Men"
                    : "เช่น House Stark, Night's Watch, กลุ่มอิสระ"
                }
                value={faction}
                onChange={(e) => setFaction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 font-thai">
                {characterType === "canon" ? "บทบาทในเรื่อง / ตำแหน่ง" : "บทบาทที่อยากได้"}
              </label>
              <input
                type="text"
                placeholder={
                  characterType === "canon"
                    ? "เช่น นักฆ่าไร้หน้า, ผู้พิทักษ์แดนเหนือ, ลอร์ดผู้บัญชาการ"
                    : "เช่น จอมวางแผน, นักรบเงา, ผู้รอดชีวิต"
                }
                value={roleWish}
                onChange={(e) => setRoleWish(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
              />
            </div>
          </div>

          {/* Background / Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 font-thai">
              {characterType === "canon" ? "ปูมหลัง / ข้อมูลตัวละครย่อ" : "ข้อมูลภูมิหลังตัวละคร"}
            </label>
            <textarea
              rows={2}
              placeholder={
                characterType === "canon"
                  ? "เช่น บุตรสาวคนเล็กของเน็ด สตาร์ค ที่ได้รับการฝึกฝนวิชาจากสมาคมนักฆ่าไร้หน้า..."
                  : "เช่น คนจากโลกปัจจุบันที่หลุดเข้ามาในโลกนี้พร้อมความทรงจำเดิม..."
              }
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-thai transition-colors"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs font-thai transition-all shadow-lg disabled:opacity-50 ${
                characterType === "canon"
                  ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : isEditing
                  ? "บันทึกการแก้ไข"
                  : characterType === "self"
                  ? "บันทึกตัวละครของคุณ"
                  : characterType === "canon"
                  ? "บันทึกตัวละครในหนัง"
                  : "บันทึกตัวละครเพื่อน"}
              </span>
            </button>
          </div>
        </form>
      </div>

      {showCropModal && avatarUrl && (
        <AvatarCropModal
          isOpen={showCropModal}
          onClose={() => setShowCropModal(false)}
          imageSrc={typeof avatarUrl === "string" ? avatarUrl : (avatarUrl as any)?.url || ""}
          onCropComplete={(newUrl) => setAvatarUrl(newUrl)}
        />
      )}
    </div>
  );
}
