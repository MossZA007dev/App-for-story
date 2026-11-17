"use client";

import { useState, useEffect, useRef, useId } from "react";
import { X, User, Camera, Check, Crop, RefreshCw } from "lucide-react";
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
    editCharacter?.currentMbti || editCharacter?.startMbti || ""
  );
  const [gender, setGender] = useState(editCharacter?.gender || "");
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
  const formId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    editCharacter?.projectId || initialProjectId || ""
  );

  useEffect(() => {
    if (isOpen) {
      if (editCharacter) {
        setCharacterType((editCharacter.characterType as "self" | "friend" | "canon") || "self");
        setRealNickname(editCharacter.realNickname || "");
        setName(editCharacter.name || "");
        setStartMbti(editCharacter.currentMbti || editCharacter.startMbti || "");
        setGender(editCharacter.gender || "");
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
        setSelectedProjectId(initialProjectId || "");
        setCharacterType(initialType);
        setRealNickname("");
        setName("");
        setStartMbti("");
        setGender("");
        setFaction("");
        setRoleWish("");
        setBackground("");
        setAvatarUrl("");
      }
      fetchProjects();
    }
  }, [isOpen, initialType, editCharacter, initialProjectId]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("โหลดรายชื่อเรื่องไม่สำเร็จ");
      setProjectsList(await res.json());
    } catch (err) {
      setProjectsError(err instanceof Error ? err.message : "โหลดรายชื่อเรื่องไม่สำเร็จ");
    } finally {
      setProjectsLoading(false);
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
    e.target.value = "";
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
  const selectedProject = projectsList.find(project => project.id === selectedProjectId);

  return (
    <div className="character-form-backdrop">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        aria-describedby={`${formId}-description`}
        tabIndex={-1}
        className="character-form-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isSubmitting && !isUploadingPhoto) {
            event.stopPropagation();
            onClose();
          }
          if (event.key === "Tab") {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
              event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault(); first?.focus();
            }
          }
        }}
      >
        <header className="character-form-header">
          <div>
            <h2 id={`${formId}-title`}>{isEditing ? "แก้ไขตัวละคร" : "เพิ่มตัวละครในเรื่อง"}</h2>
            <p id={`${formId}-description`}>กำหนดตัวตนและบทบาทสำหรับเวอร์ชันนี้</p>
          </div>
          <button type="button" className="character-form-close" onClick={onClose} disabled={isSubmitting || isUploadingPhoto} aria-label="ปิดหน้าต่างตัวละคร"><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="character-form-layout">
          <div className="character-form-body">
            <div className="character-form-type" role="group" aria-label="ประเภทตัวละคร">
              {([['self', 'ตัวฉันเอง'], ['friend', 'เพื่อน'], ['canon', 'ตัวละครต้นฉบับ']] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={characterType === value} onClick={() => setCharacterType(value)} disabled={isSubmitting}>{label}</button>
              ))}
            </div>

            <div className="character-form-field character-form-project">
              <label htmlFor={`${formId}-project`}>เรื่องที่ตัวละครนี้อยู่ <span className="field-required">*</span></label>
              <select id={`${formId}-project`} required disabled={isEditing || projectsLoading || isSubmitting} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} aria-describedby={`${formId}-world`}>
                <option value="">{projectsLoading ? "กำลังโหลดเรื่อง…" : "เลือกเรื่อง…"}</option>
                {Array.from(new Set(projectsList.map(p => p.universe))).map(universe => (
                  <optgroup key={universe} label={universe}>{projectsList.filter(p => p.universe === universe).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</optgroup>
                ))}
              </select>
              <p id={`${formId}-world`} className="character-form-hint">{selectedProject ? `${selectedProject.universe} · ข้อมูลนี้ใช้เฉพาะเรื่องที่เลือก` : "คนเดียวกันมีชื่อและบทบาทต่างกันได้ในแต่ละเรื่อง"}</p>
              {projectsError && <p className="character-form-error" role="alert">{projectsError} <button type="button" onClick={fetchProjects}>ลองอีกครั้ง</button></p>}
              {!projectsLoading && !projectsError && projectsList.length === 0 && <p className="character-form-hint">ยังไม่มีเรื่อง <a href="/projects/new">สร้างเรื่องแรก</a>ก่อนเพิ่มตัวละคร</p>}
            </div>

            <section className="character-form-section" aria-labelledby={`${formId}-identity`}>
              <h3 id={`${formId}-identity`}>ข้อมูลตัวละคร</h3>
              <div
                className={`character-form-photo ${isDraggingAvatar ? "is-dragging" : ""}`}
                onDragOver={event => {event.preventDefault(); setIsDraggingAvatar(true);}}
                onDragLeave={event => {if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDraggingAvatar(false);}}
                onDrop={event => {event.preventDefault(); setIsDraggingAvatar(false); const file = event.dataTransfer.files?.[0]; if (file && !isUploadingPhoto && !isSubmitting) void uploadCharacterAvatarFile(file);}}
              >
                <div className="character-form-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="รูปตัวละคร" /> : <User size={30} strokeWidth={1.5} />}
                  {isUploadingPhoto && <span className="character-form-uploading" role="status" aria-label="กำลังอัปโหลดรูป"><RefreshCw size={20} className="animate-spin" /></span>}
                </div>
                <div className="character-form-photo-info">
                  <div className="character-form-photo-actions">
                    <label className={`character-form-upload ${isUploadingPhoto || isSubmitting ? "is-disabled" : ""}`}>
                      <Camera size={16} /><span>{isUploadingPhoto ? "กำลังอัปโหลด…" : avatarUrl ? "เปลี่ยนรูป" : "เพิ่มรูปตัวละคร"}</span>
                      <input type="file" accept="image/*,.jfif" aria-label="เลือกรูปตัวละคร" onChange={handleFileUpload} className="sr-only" disabled={isUploadingPhoto || isSubmitting} />
                    </label>
                    {avatarUrl && <button type="button" className="character-form-text-button" onClick={() => setShowCropModal(true)} disabled={isUploadingPhoto || isSubmitting}><Crop size={15} /> ปรับรูป</button>}
                    {avatarUrl && <button type="button" className="character-form-text-button is-danger" onClick={() => setAvatarUrl("")} disabled={isUploadingPhoto || isSubmitting}>นำรูปออก</button>}
                  </div>
                  <p className="character-form-hint">{isDraggingAvatar ? "ปล่อยรูปที่นี่" : "หรือลากรูปมาวาง · JPG, PNG, WebP · เพิ่มภายหลังได้"}</p>
                </div>
              </div>

              <div className="character-form-grid">
                {characterType === "canon" ? <>
                  <div className="character-form-field"><label htmlFor={`${formId}-name`}>ชื่อตัวละคร <span className="field-required">*</span></label><input id={`${formId}-name`} value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อจากเรื่องต้นฉบับ" required /></div>
                  <div className="character-form-field"><label htmlFor={`${formId}-nickname`}>ชื่อเรียกสั้น ๆ <span>ไม่บังคับ</span></label><input id={`${formId}-nickname`} value={realNickname} onChange={e => setRealNickname(e.target.value)} placeholder="ชื่อเล่นหรือคำเรียก" /></div>
                </> : <>
                  <div className="character-form-field"><label htmlFor={`${formId}-nickname`}>ชื่อเล่น <span className="field-required">*</span></label><input id={`${formId}-nickname`} value={realNickname} onChange={e => setRealNickname(e.target.value)} placeholder={characterType === "self" ? "ชื่อที่เพื่อนเรียกคุณ" : "ชื่อเล่นของเพื่อน"} required /></div>
                  <div className="character-form-field"><label htmlFor={`${formId}-name`}>ชื่อในเรื่อง <span>ไม่บังคับ</span></label><input id={`${formId}-name`} value={name} onChange={e => setName(e.target.value)} placeholder="ใช้ชื่อเล่นได้ถ้าเว้นว่าง" /></div>
                </>}
                <div className="character-form-field"><label htmlFor={`${formId}-mbti`}>บุคลิกภาพ <span>MBTI</span></label><select id={`${formId}-mbti`} value={startMbti} onChange={e => setStartMbti(e.target.value)}><option value="">ยังไม่ระบุ</option>{startMbti && !/^[IE][NS][TF][JP]$/.test(startMbti) && <option value={startMbti}>{startMbti}</option>}{["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"].map(value => <option key={value}>{value}</option>)}</select></div>
                <div className="character-form-field"><label htmlFor={`${formId}-gender`}>เพศ</label><select id={`${formId}-gender`} value={gender} onChange={e => setGender(e.target.value)}><option value="">ยังไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option><option value="ไม่ระบุ">อื่น ๆ / ไม่ระบุ</option></select></div>
              </div>
            </section>

            <section className="character-form-section" aria-labelledby={`${formId}-role`}>
              <h3 id={`${formId}-role`}>บทบาทในเรื่อง <span>เพิ่มหรือแก้ไขภายหลังได้</span></h3>
              <div className="character-form-grid">
                <div className="character-form-field"><label htmlFor={`${formId}-faction`}>ฝ่าย / สังกัด</label><input id={`${formId}-faction`} value={faction} onChange={e => setFaction(e.target.value)} placeholder="ตระกูล บ้าน หรือองค์กร" /></div>
                <div className="character-form-field"><label htmlFor={`${formId}-role-wish`}>บทบาท</label><input id={`${formId}-role-wish`} value={roleWish} onChange={e => setRoleWish(e.target.value)} placeholder="เช่น นักสำรวจ หรือผู้วางแผน" /></div>
                <div className="character-form-field character-form-full"><label htmlFor={`${formId}-background`}>ภูมิหลัง</label><textarea id={`${formId}-background`} value={background} onChange={e => setBackground(e.target.value)} placeholder="เขาเป็นใคร เข้ามาในโลกนี้ได้อย่างไร และต้องการอะไร" rows={3} /></div>
              </div>
            </section>
          </div>

          <footer className="character-form-footer">
            <p><span className="field-required">*</span> ข้อมูลที่ต้องกรอก</p>
            <div><button type="button" className="character-form-cancel" onClick={onClose} disabled={isSubmitting || isUploadingPhoto}>ยกเลิก</button><button type="submit" className="character-form-submit" disabled={isSubmitting || isUploadingPhoto || projectsLoading || !selectedProjectId}>{isSubmitting ? <RefreshCw size={17} className="animate-spin" /> : <Check size={17} />} {isSubmitting ? "กำลังบันทึก…" : isEditing ? "บันทึกการแก้ไข" : "เพิ่มตัวละคร"}</button></div>
          </footer>
        </form>
      </section>

      {showCropModal && avatarUrl && <AvatarCropModal isOpen={showCropModal} onClose={() => setShowCropModal(false)} imageSrc={avatarUrl} onCropComplete={newUrl => setAvatarUrl(newUrl)} />}
    </div>
  );
}
