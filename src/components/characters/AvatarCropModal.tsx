"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  Check,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedUrl: string) => void;
}

export function AvatarCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}: AvatarCropModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 320, height: 320 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const BOX_SIZE = 300; // Viewport container width & height in px

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const nw = imageRef.current.naturalWidth || 300;
      const nh = imageRef.current.naturalHeight || 300;
      const fitScale = Math.max(BOX_SIZE / nw, BOX_SIZE / nh);
      setNaturalSize({
        width: Math.round(nw * fitScale),
        height: Math.round(nh * fitScale),
      });
    }
  };

  // Drag handlers
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

  // Touch handlers for mobile
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(Math.max(0.6, prev + delta), 3.5));
  };

  const handleSaveCrop = async () => {
    if (!imageRef.current) return;

    try {
      setIsSaving(true);
      const EXPORT_SIZE = 512;
      const scaleFactor = EXPORT_SIZE / BOX_SIZE;

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("ไม่สามารถสร้าง Canvas Context ได้");
      }

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

      ctx.save();
      // Move to center
      ctx.translate(EXPORT_SIZE / 2, EXPORT_SIZE / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

      const drawW = naturalSize.width * scaleFactor;
      const drawH = naturalSize.height * scaleFactor;

      ctx.drawImage(imageRef.current, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

      const res = await fetch("/api/characters/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกรูปภาพที่ครอปไม่สำเร็จ");

      toast.success("ปรับตำแหน่งและบันทึกรูปโปรไฟล์เรียบร้อยแล้ว!");
      onCropComplete(data.url);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการครอปรูป");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-thai">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crop className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">
                ปรับตำแหน่งรูปโปรไฟล์ (Crop & Position)
              </h3>
              <p className="text-[11px] text-slate-400">
                ลากรูปเพื่อขยับตำแหน่ง หรือปรับขนาดให้อยู่ตรงกลางวงกลม
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Box */}
        <div className="flex flex-col items-center gap-3">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ width: BOX_SIZE, height: BOX_SIZE }}
            className="relative overflow-hidden rounded-2xl bg-black border border-slate-700 cursor-grab active:cursor-grabbing select-none flex items-center justify-center shadow-inner"
          >
            {/* Movable & Zoomable Image */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: isDragging ? "none" : "transform 0.05s ease-out",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                className="max-w-none pointer-events-none select-none"
                style={{
                  width: naturalSize.width,
                  height: naturalSize.height,
                }}
              />
            </div>

            {/* Circular Avatar Guide Mask Overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                style={{ width: BOX_SIZE - 20, height: BOX_SIZE - 20 }}
                className="rounded-full border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] ring-1 ring-white/20"
              />
            </div>

            {/* Hint overlay */}
            <div className="pointer-events-none absolute bottom-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-slate-300">
              <Move className="w-3 h-3 text-amber-400" />
              <span>ลากเพื่อเลื่อนตำแหน่งภาพ</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full space-y-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 text-xs">
              <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-mono text-amber-300 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Action buttons: Rotate & Reset */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleRotate}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                <span>หมุน 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>รีเซ็ตตำแหน่ง</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>ยืนยันตำแหน่งนี้</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
