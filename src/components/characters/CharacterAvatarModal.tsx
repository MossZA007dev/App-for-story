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
} from "lucide-react";
import { toast } from "sonner";

export interface AvatarCharacterInfo {
  id: string;
  name: string;
  realNickname?: string;
  characterType?: "self" | "friend" | "canon";
  chosenRole?: string;
  avatarUrl?: string;
}

interface CharacterAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: AvatarCharacterInfo | null;
  projectId: string;
  onSuccess: (charId: string, newAvatarUrl: string) => void;
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [projectImages, setProjectImages] = useState<Array<{ id: string; filePath: string; caption?: string }>>([]);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && character) {
      const currentUrl = character.avatarUrl || "";
      setPreviewUrl(currentUrl);
      setUrlInput(currentUrl.startsWith("http") || currentUrl.startsWith("/") ? currentUrl : "");
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

  const displayName = character.realNickname || character.name || "ตัวละคร";
  const initials = displayName.slice(0, 2).toUpperCase();

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
    toast.info("เลือกใช้ลิงก์รูปภาพนี้แล้ว กด 'บันทึกรูปโปรไฟล์' เพื่อยืนยัน");
  };

  const handleSelectGalleryImage = (filePath: string) => {
    setPreviewUrl(filePath);
    setUrlInput(filePath);
    toast.info("เลือกภาพจากคลังแล้ว กด 'บันทึกรูปโปรไฟล์' เพื่อยืนยัน");
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl("");
    setUrlInput("");
    toast.info("ล้างรูปโปรไฟล์แล้ว (จะกลับไปใช้ตัวย่อ) กด 'บันทึก' เพื่อยืนยัน");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/projects/${projectId}/characters/${character.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: previewUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกรูปโปรไฟล์ไม่สำเร็จ");

      toast.success(`อัปเดตรูปโปรไฟล์ของ "${displayName}" เรียบร้อยแล้ว!`);
      onSuccess(character.id, previewUrl);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกรูปโปรไฟล์");
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
                ตั้งค่ารูปโปรไฟล์ตัวละคร
              </h2>
              <p className="text-xs text-slate-400">
                สำหรับแสดงบนการ์ดบทพูดในหน้าเขียน Studio และโหมดอ่าน Visual Novel
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

        {/* Character Preview Header Banner */}
        <div className="px-6 py-5 bg-gradient-to-b from-slate-800/40 to-transparent flex items-center gap-5 border-b border-slate-800/60">
          {/* Avatar Circle Preview */}
          <div className="relative group/circle flex-shrink-0">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-xl ${
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
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-heading font-bold text-2xl uppercase tracking-wider">
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
          </div>

          {/* Character Meta */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white truncate">
                {character.name}
              </h3>
              {character.realNickname && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-medium">
                  ({character.realNickname})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
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
                <span className="text-slate-400 truncate">
                  • {character.chosenRole}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {previewUrl
                ? "✨ ตัวละครมีรูปโปรไฟล์พร้อมใช้งานแล้ว"
                : "ℹ️ ปัจจุบันแสดงตัวอักษรย่อ สามารถอัปโหลดรูปภาพหรือใส่ลิงก์ด้านล่าง"}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "upload"
                ? "border-amber-400 text-amber-300 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>อัปโหลดรูปภาพ</span>
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "url"
                ? "border-amber-400 text-amber-300 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>ใส่ลิงก์ URL</span>
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "gallery"
                ? "border-amber-400 text-amber-300 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>คลังภาพในโปรเจกต์ ({projectImages.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isUploading
                    ? "border-amber-500/60 bg-amber-500/5 cursor-wait"
                    : "border-slate-700 hover:border-amber-400/80 bg-slate-950/60 hover:bg-slate-900/60"
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 text-amber-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-bold">กำลังอัปโหลดรูปภาพ...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        คลิกเพื่อเลือกไฟล์รูปภาพจากเครื่อง
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        รองรับ PNG, JPG, JPEG, GIF, WebP (แนะนำรูปสี่เหลี่ยมจัตุรัส หรือภาพใบหน้าบุคคล)
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">
                      เลือกไฟล์
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT URL */}
          {activeTab === "url" && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                วางลิงก์รูปภาพ (Direct Image / GIF URL):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/avatar.jpg หรือ .gif"
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  ดูตัวอย่าง
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                สามารถนำลิงก์รูปภาพจากอินเทอร์เน็ต เช่น Pinterest, Discord, Imgur, หรือ Giphy มาใส่ได้ทันที
              </p>
            </div>
          )}

          {/* TAB 3: PROJECT GALLERY */}
          {activeTab === "gallery" && (
            <div className="space-y-3">
              {loadingImages ? (
                <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>กำลังโหลดภาพในโปรเจกต์...</span>
                </div>
              ) : projectImages.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  <p>ยังไม่มีรูปภาพในโปรเจกต์นี้</p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    คุณสามารถอัปโหลดในแท็บ &quot;อัปโหลดรูปภาพ&quot; หรือใส่ลิงก์ได้เลย
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
                  {projectImages.map((img) => {
                    const isSelected = previewUrl === img.filePath;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => handleSelectGalleryImage(img.filePath)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group/item ${
                          isSelected
                            ? "border-amber-400 ring-2 ring-amber-400/50 scale-95"
                            : "border-slate-800 hover:border-slate-600 hover:scale-105"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.filePath}
                          alt={img.caption || "ภาพในโปรเจกต์"}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                            <Check className="w-6 h-6 text-amber-400 drop-shadow" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div>
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs text-red-400 hover:text-red-300 underline font-medium"
              >
                ลบรูปออก (ใช้ตัวย่อ &quot;{initials}&quot;)
              </button>
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
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึกรูปโปรไฟล์</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
