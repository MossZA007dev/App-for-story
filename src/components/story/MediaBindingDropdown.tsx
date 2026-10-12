"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Image as ImageIcon,
  Film,
  Upload,
  Link2,
  X,
  Check,
  ChevronDown,
} from "lucide-react";

export function isVideoMedia(
  img?: { filePath?: string; metadata?: string | null; provider?: string } | null
): boolean {
  if (!img || !img.filePath) return false;
  const fp = img.filePath.toLowerCase();
  if (
    fp.endsWith(".mp4") ||
    fp.endsWith(".webm") ||
    fp.endsWith(".mov") ||
    fp.endsWith(".mkv")
  )
    return true;
  if (img.provider === "video") return true;
  if (img.metadata) {
    try {
      const meta = JSON.parse(img.metadata);
      if (meta?.type === "video" || meta?.provider === "video") return true;
    } catch {}
  }
  return false;
}

export interface MediaImageItem {
  id: string;
  prompt?: string;
  filePath: string;
  kind?: string;
  caption?: string;
  metadata?: string | null;
  provider?: string;
}

interface MediaBindingDropdownProps {
  assignedImageId?: string;
  assignedImage?: MediaImageItem | null;
  sceneImages: MediaImageItem[];
  onSelectImage: (idOrUrl: string) => void;
  onUploadNew: () => void;
  onCustomUrl: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  compact?: boolean;
}

export function MediaBindingDropdown({
  assignedImageId,
  assignedImage,
  sceneImages,
  onSelectImage,
  onUploadNew,
  onCustomUrl,
  isOpen,
  onToggle,
  onClose,
  compact = false,
}: MediaBindingDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const isBound = Boolean(assignedImageId || assignedImage);
  const targetImage = assignedImage || sceneImages.find((img) => img.id === assignedImageId);
  const isVideo = isVideoMedia(targetImage || { filePath: assignedImageId });

  const displayCaption = targetImage?.caption ||
    (assignedImageId?.startsWith("url:") ? "สื่อจากลิงก์" : targetImage ? `ภาพในฉาก` : "ภาพที่ผูกไว้");

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* TRIGGER BUTTON / PILL */}
      {isBound ? (
        <div className="inline-flex items-center gap-1 animate-fadeIn">
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[10px] text-amber-300 font-thai font-semibold shadow-sm cursor-pointer transition-all active:scale-95 group/pill ${
              compact ? "px-1.5 py-0.5" : "px-2 py-0.5"
            }`}
            title="คลิกเพื่อเปลี่ยนภาพหรือวิดีโอที่ผูกกับบทนี้"
          >
            {isVideo ? (
              <Film className="w-3 h-3 text-purple-400 flex-shrink-0" />
            ) : targetImage?.filePath ? (
              <img
                src={targetImage.filePath}
                alt=""
                className="w-3.5 h-3.5 rounded object-cover flex-shrink-0 border border-amber-500/50"
              />
            ) : (
              <ImageIcon className="w-3 h-3 text-amber-400 flex-shrink-0" />
            )}
            <span className="truncate max-w-[110px] sm:max-w-[150px]">
              {displayCaption}
            </span>
            <ChevronDown className={`w-2.5 h-2.5 text-amber-400/70 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectImage("");
            }}
            className="p-0.5 hover:text-red-400 text-slate-400 rounded transition-colors"
            title="ยกเลิกการผูกภาพนี้ (คงภาพเดิม)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1 rounded-lg text-[10px] font-thai border transition-all active:scale-95 group ${
            compact ? "px-1.5 py-0.5" : "px-2 py-0.5"
          } ${
            isOpen
              ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm"
              : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 border-slate-700/60"
          }`}
          title="ผูกรูปภาพหรือวิดีโอเข้ากับบทพูดนี้"
        >
          <ImageIcon className="w-3 h-3 text-slate-400 group-hover:text-amber-400" />
          <span>+ ภาพ</span>
          <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* FLOATING POPOVER CARD */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-[310px] sm:w-[350px] bg-[#0c101b]/98 backdrop-blur-2xl border border-amber-500/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200 font-thai p-2.5 space-y-2"
          style={{ maxHeight: "420px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400">
                <ImageIcon className="w-3 h-3" />
              </div>
              <span className="font-bold text-xs text-slate-200">
                เลือกภาพ / วิดีโอในบทพูด
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Option: Keep previous image (No direct binding) */}
          <button
            type="button"
            onClick={() => {
              onSelectImage("");
              onClose();
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
              !assignedImageId
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs flex-shrink-0">
                ⚪
              </div>
              <div className="min-w-0">
                <div className="text-xs truncate">ไม่ผูกภาพ (คงภาพเดิม)</div>
                <div className="text-[10px] text-slate-400 font-normal truncate">
                  แสดงภาพต่อเนื่องจากประโยคก่อนหน้า
                </div>
              </div>
            </div>
            {!assignedImageId && (
              <Check className="w-4 h-4 text-amber-400 flex-shrink-0 ml-1.5" />
            )}
          </button>

          {/* Section: Scene Images */}
          <div className="space-y-1 min-h-0 flex-1 flex flex-col">
            <div className="text-[11px] font-bold text-slate-400 px-1 pt-0.5 flex items-center justify-between">
              <span>ภาพและคลิปในฉากนี้ ({sceneImages.length})</span>
            </div>

            {sceneImages.length === 0 ? (
              <div className="p-4 text-center text-slate-500 space-y-1 bg-slate-950/60 rounded-xl border border-slate-800/60 my-1">
                <p className="text-xs font-semibold text-slate-400">ยังไม่มีรูปภาพในฉากนี้</p>
                <p className="text-[10px] text-slate-500">
                  อัปโหลดรูปภาพใหม่ หรือใช้ AI สร้างรูปภาพประกอบฉากได้ทันที
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-1.5 max-h-48 pr-1 dialogue-scroll">
                {sceneImages.map((img, i) => {
                  const isSelected = assignedImageId === img.id;
                  const isVid = isVideoMedia(img);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        onSelectImage(img.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-1.5 rounded-xl text-left transition-all group ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-sm"
                          : "hover:bg-slate-800/80 text-slate-300 border border-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black border border-slate-700/80 flex-shrink-0">
                          {isVid ? (
                            <div className="w-full h-full flex items-center justify-center bg-purple-950/40 text-purple-300">
                              <Film className="w-4 h-4" />
                            </div>
                          ) : (
                            <img
                              src={img.filePath}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-mono text-amber-300">
                            #{i + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-800 text-amber-300 flex-shrink-0">
                              {isVid ? "🎬 วิดีโอ" : "🖼️ ภาพ"}
                            </span>
                            <span className="text-xs font-semibold truncate text-slate-200">
                              {img.caption || `ภาพที่ #${i + 1}`}
                            </span>
                          </div>
                          {img.prompt && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                              {img.prompt}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-400 flex-shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Upload / URL Actions */}
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onUploadNew();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 transition-colors text-xs font-medium"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>📁 อัปโหลดภาพหรือคลิปใหม่สำหรับบทนี้...</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCustomUrl();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-sky-300 hover:bg-slate-800/80 transition-colors text-xs font-medium"
            >
              <Link2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span>🔗 ระบุลิงก์ภายนอก (URL / GIF / วิดีโอ)...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
