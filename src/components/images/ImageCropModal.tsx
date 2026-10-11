"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  Check,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  Layers,
  Sparkles,
  Move,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export type AspectRatioType = "16:9" | "3:4" | "1:1" | "free";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageId?: string;
  sceneId?: string;
  projectId: string;
  onCropSuccess: (savedImage: any, isCover?: boolean) => void;
  defaultAspect?: AspectRatioType;
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  imageId,
  sceneId,
  projectId,
  onCropSuccess,
  defaultAspect = "16:9",
}: ImageCropModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(defaultAspect);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [setAsCover, setSetAsCover] = useState<boolean>(false);
  const [saveAsNew, setSaveAsNew] = useState<boolean>(true);
  const [captionInput, setCaptionInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset transforms whenever opening or imageSrc changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setSetAsCover(false);
      setSaveAsNew(true);
      setCaptionInput("");
    }
  }, [isOpen, imageSrc]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle Touch for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Perform Crop using HTML Canvas
  const handleSaveCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;

    try {
      setIsSaving(true);
      toast.loading("กำลังประมวลผลและบันทึกภาพที่ครอบตัด...", { id: "crop-proc" });

      const img = imageRef.current;
      const cropContainer = containerRef.current;
      const containerRect = cropContainer.getBoundingClientRect();

      // Desired export dimensions based on aspect ratio
      let targetWidth = 1280;
      let targetHeight = 720; // 16:9 default

      if (aspectRatio === "3:4") {
        targetWidth = 900;
        targetHeight = 1200;
      } else if (aspectRatio === "1:1") {
        targetWidth = 1000;
        targetHeight = 1000;
      } else if (aspectRatio === "free") {
        targetWidth = Math.round(containerRect.width * 2);
        targetHeight = Math.round(containerRect.height * 2);
      }

      // Create an off-screen canvas
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("ไม่สามารถสร้าง Canvas Context ได้");
      }

      // Fill with dark neutral background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Save state
      ctx.save();

      // Move origin to center of canvas
      ctx.translate(targetWidth / 2, targetHeight / 2);

      // Rotate
      ctx.rotate((rotation * Math.PI) / 180);

      // Calculate how the image is scaled inside the viewport
      const scaleX = targetWidth / containerRect.width;
      const scaleY = targetHeight / containerRect.height;
      const renderScale = Math.min(scaleX, scaleY) * zoom;

      // Translate pan
      ctx.translate(pan.x * scaleX, pan.y * scaleY);

      // Draw the image centered
      const drawWidth = img.naturalWidth * (containerRect.width / img.width) * (targetWidth / containerRect.width) * zoom;
      const drawHeight = img.naturalHeight * (containerRect.height / img.height) * (targetHeight / containerRect.height) * zoom;

      // Draw using natural dimensions scaled
      const baseScale = Math.max(
        containerRect.width / (img.naturalWidth || 1),
        containerRect.height / (img.naturalHeight || 1)
      );

      const computedW = img.naturalWidth * baseScale * (targetWidth / containerRect.width) * zoom;
      const computedH = img.naturalHeight * baseScale * (targetHeight / containerRect.height) * zoom;

      ctx.drawImage(
        img,
        -computedW / 2,
        -computedH / 2,
        computedW,
        computedH
      );

      ctx.restore();

      // Export base64 JPEG
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      // Send to API
      const res = await fetch(`/api/projects/${projectId}/images/crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: dataUrl,
          originalImageId: imageId,
          sceneId: sceneId || undefined,
          saveAsNew,
          setAsCover,
          caption: captionInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกภาพ");

      toast.success(
        setAsCover
          ? "✓ ครอปตัดรูปภาพ และตั้งเป็นหน้าปกนิยายเรียบร้อยแล้ว!"
          : "✓ ครอปตัดรูปภาพและบันทึกเรียบร้อยแล้ว!",
        { id: "crop-proc" }
      );

      onCropSuccess(data.image, setAsCover);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "ครอบตัดภาพล้มเหลว";
      toast.error(msg, { id: "crop-proc" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Viewport aspect ratio container class
  const getAspectClass = () => {
    switch (aspectRatio) {
      case "16:9":
        return "aspect-video max-w-2xl";
      case "3:4":
        return "aspect-[3/4] max-h-[520px] max-w-sm";
      case "1:1":
        return "aspect-square max-w-md";
      case "free":
      default:
        return "aspect-video max-w-2xl";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#1e232d] border border-slate-700 shadow-2xl p-4 sm:p-6 space-y-4 text-white font-thai my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Crop className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <span>ครอบตัดรูปภาพ (Crop Studio)</span>
                {setAsCover && (
                  <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500 text-slate-950 font-bold">
                    👑 ตั้งเป็นหน้าปก
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                ลากเพื่อเลื่อนตำแหน่ง ซูมเข้า-ออก หรือเลือกอัตราส่วนภาพที่ต้องการ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Selector Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold mr-1">อัตราส่วน:</span>
          {[
            { id: "16:9" as AspectRatioType, label: "🎬 16:9 (ฉากภาพยนตร์ / Visual Novel)" },
            { id: "3:4" as AspectRatioType, label: "📖 3:4 (หน้าปกนิยาย / Book Cover)" },
            { id: "1:1" as AspectRatioType, label: "👤 1:1 (จัตุรัส / Avatar)" },
            { id: "free" as AspectRatioType, label: "📐 Free (กำหนดเอง)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setAspectRatio(tab.id);
                if (tab.id === "3:4") setSetAsCover(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                aspectRatio === tab.id
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Viewport Area */}
        <div className="flex items-center justify-center p-3 bg-slate-950/80 rounded-xl border border-slate-800 min-h-[360px] sm:min-h-[420px] overflow-hidden select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative w-full ${getAspectClass()} mx-auto rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-2xl cursor-grab active:cursor-grabbing bg-black`}
          >
            {/* Rule of Thirds Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 opacity-30 border border-amber-400/40">
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-white/40" />
              <div className="border-r border-white/40" />
              <div />
            </div>

            {/* Transformable Source Image */}
            <div className="w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: isDragging ? "none" : "transform 0.15s ease-out",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
                className="pointer-events-none select-none max-w-none origin-center"
              />
            </div>

            {/* Hint overlay */}
            <div className="absolute bottom-2 left-2 z-20 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 text-[11px] text-slate-300 backdrop-blur-sm">
              <Move className="w-3 h-3 text-amber-400" />
              <span>คลิกแล้วลากเพื่อเลื่อนภาพ</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Zoom, Rotate, Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <ZoomOut className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-amber-400 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotate & Reset Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
              title="หมุนตามเข็มนาฬิกา 90 องศา"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>หมุน 90°</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              title="รีเซ็ตตำแหน่งและการซูม"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>

        {/* Options & Cover Toggle */}
        <div className="space-y-3 pt-1 border-t border-slate-800 text-xs">
          {/* Cover Toggle Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/15 transition-colors">
            <input
              type="checkbox"
              checked={setAsCover}
              onChange={(e) => setSetAsCover(e.target.checked)}
              className="rounded border-amber-500 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <div className="flex-1">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                <span>👑 ตั้งภาพที่ครอปนี้เป็น &quot;ภาพหน้าปกนิยาย&quot; ทันที</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                จะนำภาพนี้ไปแสดงเป็นปกหน้าแรกใน Dashboard และหน้าอ่านนิยาย
              </p>
            </div>
          </label>

          {/* Overwrite or Save as New Radio */}
          {imageId && (
            <div className="flex items-center gap-4 text-xs text-slate-300 px-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cropSaveMode"
                  checked={saveAsNew}
                  onChange={() => setSaveAsNew(true)}
                  className="text-amber-500 focus:ring-0"
                />
                <span>บันทึกเป็นรูปภาพใหม่ (เพิ่มเข้าคลังภาพ)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cropSaveMode"
                  checked={!saveAsNew}
                  onChange={() => setSaveAsNew(false)}
                  className="text-amber-500 focus:ring-0"
                />
                <span>บันทึกทับภาพเดิม</span>
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            ยกเลิก
          </button>

          <button
            disabled={isSaving}
            onClick={handleSaveCrop}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกภาพ...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>ยืนยันการครอบตัด & บันทึก</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
