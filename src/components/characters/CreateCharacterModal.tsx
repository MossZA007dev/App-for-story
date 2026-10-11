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
} from "lucide-react";
import { toast } from "sonner";

interface CharacterData {
  id?: string;
  name?: string;
  realNickname?: string;
  characterType?: "self" | "friend" | "canon";
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
  initialType?: "self" | "friend";
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
  const [characterType, setCharacterType] = useState<"self" | "friend">(
    (editCharacter?.characterType as "self" | "friend") || initialType
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

  // Projects list for selecting target project
  const [projectsList, setProjectsList] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    editCharacter?.projectId || initialProjectId || ""
  );

  useEffect(() => {
    if (isOpen) {
      if (editCharacter) {
        setCharacterType((editCharacter.characterType as "self" | "friend") || "self");
        setRealNickname(editCharacter.realNickname || "");
        setName(editCharacter.name || "");
        setStartMbti(editCharacter.currentMbti || editCharacter.startMbti || "INTJ");
        setGender(editCharacter.gender || "ชาย");
        setFaction(editCharacter.faction || "");
        setRoleWish(editCharacter.chosenRole || "");
        setBackground(editCharacter.background || "");
        setAvatarUrl(editCharacter.avatarUrl || "");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      setAvatarUrl(data.url);
      toast.success("อัปโหลดรูปโปรไฟล์ของคุณเรียบร้อยแล้ว!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "อัปโหลดรูปภาพล้มเหลว";
      toast.error(msg);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveNickname = realNickname.trim();
    if (!effectiveNickname) {
      toast.error("กรุณาระบุชื่อเล่นจริงของคุณหรือเพื่อน");
      return;
    }

    if (!selectedProjectId) {
      toast.error("กรุณาเลือกโปรเจกต์เนื้อเรื่องที่ต้องการเพิ่มตัวละคร");
      return;
    }

    const resolvedName = name.trim() || effectiveNickname;

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
              faction: faction.trim() || "กลุ่มอิสระ",
              chosenRole: roleWish.trim() || (characterType === "self" ? "ตัวเอกผู้ข้ามมิติ" : "สหายร่วมชะตากรรม"),
              background: background.trim() || "คนจากโลกปัจจุบันที่หลุดเข้ามาในโลกนี้พร้อมความทรงจำเดิม",
              avatarUrl: avatarUrl.trim() || "",
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "อัปเดตตัวละครไม่สำเร็จ");

        toast.success(`บันทึกการแก้ไข "${effectiveNickname}" เรียบร้อยแล้ว!`);
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
            faction: faction.trim() || "กลุ่มอิสระ",
            chosenRole: roleWish.trim() || (characterType === "self" ? "ตัวเอกผู้ข้ามมิติ" : "สหายร่วมชะตากรรม"),
            background: background.trim() || "คนจากโลกปัจจุบันที่หลุดเข้ามาในโลกนี้พร้อมความทรงจำเดิม",
            avatarUrl: avatarUrl.trim() || "",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "บันทึกตัวละครไม่สำเร็จ");

        toast.success(
          characterType === "self"
            ? `👑 บันทึกตัวละครของคุณ "${effectiveNickname}" เรียบร้อยแล้ว!`
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
                ? `✏️ แก้ไขข้อมูลตัวละคร: ${realNickname || editCharacter?.name}`
                : characterType === "self"
                ? "👑 สร้างตัวละครของคุณ (ตัวฉันเอง - ME)"
                : "🧑‍🤝‍🧑 เพิ่มเพื่อนในกลุ่มของคุณ (SQUAD FRIEND)"}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-thai">
            {isEditing
              ? "ปรับแต่งชื่อเล่น ชื่อในเรื่อง MBTI และรูปถ่ายโปรไฟล์ตัวละคร"
              : "กรอกชื่อจริงของคุณ MBTI และอัปโหลดรูปตัวเอง เพื่อให้ AI นำคุณและเพื่อนๆ ข้ามมิติไปโลดแล่นในมหากาพย์"}
          </p>
        </div>

        {/* Character Type Switcher (Me vs Friend) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setCharacterType("self")}
            className={`flex-1 py-2 rounded-lg text-xs font-thai font-semibold transition-all flex items-center justify-center gap-2 ${
              characterType === "self"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>👑 ตัวฉันเอง (Me Profile)</span>
          </button>
          <button
            type="button"
            onClick={() => setCharacterType("friend")}
            className={`flex-1 py-2 rounded-lg text-xs font-thai font-semibold transition-all flex items-center justify-center gap-2 ${
              characterType === "friend"
                ? "bg-sky-600 text-white font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🧑‍🤝‍🧑 เพื่อนในกลุ่ม (Squad Friend)</span>
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
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-900 border-2 border-amber-500/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
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
                  อัปโหลดรูปหน้าตรงหรือรูปถ่ายจริงของคุณเพื่อใช้เป็นโปรไฟล์และภาพอ้างอิง
                </span>
              </div>

              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors font-thai">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{avatarUrl ? "เปลี่ยนรูปถ่าย" : "เลือกรูปจากเครื่อง (JPG/PNG)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingPhoto}
                  />
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-[11px] text-red-400 hover:underline font-thai"
                  >
                    ลบรูป
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields: Grid 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                ฝ่าย / สังกัดที่อยากสังกัด
              </label>
              <input
                type="text"
                placeholder="เช่น House Stark, Night's Watch, กลุ่มอิสระ"
                value={faction}
                onChange={(e) => setFaction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 font-thai">
                บทบาทที่อยากได้
              </label>
              <input
                type="text"
                placeholder="เช่น จอมวางแผน, นักรบเงา, ผู้รอดชีวิต"
                value={roleWish}
                onChange={(e) => setRoleWish(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
              />
            </div>
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai transition-all shadow-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : isEditing
                  ? "บันทึกการแก้ไข"
                  : characterType === "self"
                  ? "บันทึกตัวละครของคุณ"
                  : "บันทึกตัวละครเพื่อน"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
