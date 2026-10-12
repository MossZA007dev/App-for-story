"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2,
  Camera,
  Check,
  Sparkles,
  Loader2,
  Edit3,
  User,
  Crop,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarCropModal } from "./AvatarCropModal";

export interface AvatarCharacterInfo {
  id: string;
  name: string;
  realNickname?: string;
  characterType?: "self" | "friend" | "canon";
  chosenRole?: string;
  avatarUrl?: string;
}

export interface UpdatedCharacterInfo {
  name: string;
  realNickname?: string;
  chosenRole?: string;
  oldName?: string;
  oldNickname?: string;
}

interface CharacterAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: AvatarCharacterInfo | null;
  projectId: string;
  onSuccess: (charId: string, newAvatarUrl: string, updatedInfo?: UpdatedCharacterInfo) => void;
}

export function CharacterAvatarModal({
  isOpen,
  onClose,
  character,
  projectId,
  onSuccess,
}: CharacterAvatarModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "gallery">("upload");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [urlInput, setUrlInput] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");
  const [nicknameInput, setNicknameInput] = useState<string>("");
  const [roleInput, setRoleInput] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [projectImages, setProjectImages] = useState<Array<{ id: string; filePath: string; caption?: string }>>([]);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && character) {
      const currentUrl = character.avatarUrl || "";
      setPreviewUrl(currentUrl);
      setUrlInput(currentUrl.startsWith("http") || currentUrl.startsWith("/") ? currentUrl : "");
      setNameInput(character.name || "");
      setNicknameInput(character.realNickname || "");
      setRoleInput(character.chosenRole || "");
      setActiveTab("upload");

      // Load project images for gallery tab
      loadProjectImages();
    }
  }, [isOpen, character, projectId]);

  const loadProjectImages = async () => {
    try {
      setLoadingImages(true);
      const res = await fetch(`/api/projects/${projectId}/images`);
      if (res.ok) {
        const data = await res.json();
        setProjectImages(data.images || []);
      }
    } catch (err) {
      console.warn("Could not load project gallery images:", err);
    } finally {
      setLoadingImages(false);
    }
  };

  if (!isOpen || !character) return null;

  const liveDisplayName = nicknameInput.trim() || nameInput.trim() || "ตัวละคร";
  const initials = liveDisplayName.slice(0, 2).toUpperCase();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, GIF, WebP)");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/characters/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "อัปโหลดรูปภาพไม่สำเร็จ");

      setPreviewUrl(data.url);
      setUrlInput(data.url);
      toast.success("อัปโหลดรูปภาพสำเร็จแล้ว! อย่าลืมกดบันทึก");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      toast.error("กรุณาระบุลิงก์รูปภาพ");
      return;
    }
    setPreviewUrl(trimmed);
    toast.info("เลือกใช้ลิงก์รูปภาพนี้แล้ว กด 'บันทึก' เพื่อยืนยัน");
  };

  const handleSelectGalleryImage = (filePath: string) => {
    setPreviewUrl(filePath);
    setUrlInput(filePath);
    toast.info("เลือกภาพจากคลังแล้ว กด 'บันทึก' เพื่อยืนยัน");
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl("");
    setUrlInput("");
    toast.info("ล้างรูปโปรไฟล์แล้ว (จะกลับไปใช้ตัวย่อ) กด 'บันทึก' เพื่อยืนยัน");
  };

  const handleSave = async () => {
    const finalName = nameInput.trim() || character.name;
    const finalNickname = nicknameInput.trim();
    const finalRole = roleInput.trim();

    if (!finalName && !finalNickname) {
      toast.error("กรุณาระบุชื่อตัวละครหรือชื่อเล่น");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/projects/${projectId}/characters/${character.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          realNickname: finalNickname,
          chosenRole: finalRole,
          avatarUrl: previewUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกข้อมูลไม่สำเร็จ");

      const savedDisplayName = finalNickname || finalName;
      toast.success(`อัปเดตและซิงค์ข้อมูลของ "${savedDisplayName}" เรียบร้อยแล้ว!`);

      onSuccess(character.id, previewUrl, {
        name: finalName,
        realNickname: finalNickname,
        chosenRole: finalRole,
        oldName: character.name,
        oldNickname: character.realNickname || "",
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูลตัวละคร");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-thai">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                ตั้งค่าและแก้ไขตัวละคร
              </h2>
              <p className="text-xs text-slate-400">
                เปลี่ยนชื่อ รูปโปรไฟล์ และซิงค์บทพูดอัตโนมัติทั่วทั้งเรื่อง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character Preview & Name Editing Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-b from-slate-800/40 to-transparent flex items-start gap-4 border-b border-slate-800/60">
          {/* Avatar Circle Preview */}
          <div className="relative group/circle flex-shrink-0 mt-1">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-xl ${
                character.characterType === "self"
                  ? "border-amber-400 bg-amber-950/60 text-amber-300"
                  : character.characterType === "friend"
                  ? "border-sky-400 bg-sky-950/60 text-sky-300"
                  : "border-slate-500 bg-slate-800 text-slate-300"
              }`}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={liveDisplayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-heading font-bold text-xl uppercase tracking-wider">
                  {initials}
                </span>
              )}
            </div>

            {previewUrl && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute -top-1 -right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                title="ลบรูปโปรไฟล์ (กลับไปใช้ตัวย่อ)"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            {previewUrl && (
              <button
                type="button"
                onClick={() => setShowCropModal(true)}
                className="mt-1.5 px-2 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-all w-full shadow-sm"
                title="ปรับตำแหน่งและขยาย/ครอบตัดรูปโปรไฟล์"
              >
                <Crop className="w-3 h-3 text-sky-400" />
                <span>ปรับตำแหน่ง</span>
              </button>
            )}
          </div>

          {/* Character Meta & Name Editing Inputs */}
          <div className="space-y-2 min-w-0 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-amber-400" />
                  <span>ชื่อในเรื่อง / บทพูด</span>
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="เช่น เน็ด, อีฟ"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-thai shadow-inner"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-sky-400" />
                  <span>ชื่อเล่น / เพื่อนในกลุ่ม</span>
                </label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="เช่น มอส, อีฟ, นนท์"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-thai shadow-inner"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  character.characterType === "self"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : character.characterType === "friend"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {character.characterType === "self"
                  ? "👑 ตัวฉันเอง"
                  : character.characterType === "friend"
                  ? "🧑‍🤝‍🧑 เพื่อนในกลุ่ม"
                  : "⚔️ ตัวละครในเรื่อง"}
              </span>

              {character.chosenRole && (
                <span className="text-slate-400 text-[11px] truncate">
                  • {character.chosenRole}
                </span>
              )}

              <span className="text-[10px] text-amber-400/90 font-thai flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>แก้ชื่อจะซิงค์ไปยังบทพูดในฉากให้อัตโนมัติ</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "upload"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>อัปโหลดรูปภาพ</span>
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "url"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>ใส่ลิงก์ URL</span>
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "gallery"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>คลังภาพในโปรเจกต์ ({projectImages.length})</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: Upload File */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {isUploading ? "กำลังอัปโหลดไฟล์..." : "คลิกเพื่อเลือกไฟล์รูปภาพจากเครื่อง"}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  รองรับ PNG, JPG, JPEG, GIF, WebP (แนะนำรูปสี่เหลี่ยมจัตุรัส หรือภาพใบหน้าบุคคล)
                </p>

                <button
                  type="button"
                  disabled={isUploading}
                  className="mt-4 px-4 py-1.5 rounded-lg bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-200 text-xs font-semibold transition-all shadow"
                >
                  เลือกไฟล์
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Direct URL */}
          {activeTab === "url" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  วางลิงก์รูปภาพ (Direct Image URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    ดูตัวอย่าง
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  * ต้องเป็นลิงก์ไฟล์รูปภาพโดยตรงที่ขึ้นต้นด้วย http:// หรือ https://
                </p>
              </div>

              {urlInput && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlInput}
                      alt="URL preview"
                      className="w-full h-full object-cover"
                      onError={() => toast.error("ไม่สามารถโหลดภาพจาก URL นี้ได้ กรุณาตรวจสอบลิงก์")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 font-mono truncate">{urlInput}</p>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3" />
                      <span>พร้อมใช้ภาพนี้</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Project Gallery */}
          {activeTab === "gallery" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                เลือกรูปภาพที่มีอยู่ในคลังภาพของโปรเจกต์นี้มาใช้เป็นรูปโปรไฟล์:
              </p>

              {loadingImages ? (
                <div className="h-40 flex items-center justify-center text-slate-500 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>กำลังโหลดภาพในคลัง...</span>
                </div>
              ) : projectImages.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {projectImages.map((img) => {
                    const isSelected = previewUrl === img.filePath;
                    return (
                      <div
                        key={img.id}
                        onClick={() => handleSelectGalleryImage(img.filePath)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer group transition-all ${
                          isSelected
                            ? "border-amber-400 ring-2 ring-amber-400/50 shadow-lg scale-95"
                            : "border-slate-800 hover:border-slate-600"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.filePath}
                          alt={img.caption || "Gallery item"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center border border-slate-800 rounded-xl text-center text-slate-500 text-xs p-4">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span>ยังไม่มีรูปภาพในคลังของโปรเจกต์นี้</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {previewUrl && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>เลือกรูปภาพแล้ว</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก & ซิงค์...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึกและซิงค์ข้อมูล</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showCropModal && previewUrl && (
        <AvatarCropModal
          isOpen={showCropModal}
          onClose={() => setShowCropModal(false)}
          imageSrc={previewUrl}
          onCropComplete={(newUrl) => {
            setPreviewUrl(newUrl);
            setUrlInput(newUrl);
          }}
        />
      )}
    </div>
  );
}
