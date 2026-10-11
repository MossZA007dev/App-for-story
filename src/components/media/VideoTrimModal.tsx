"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  X,
  Scissors,
  Clock,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";

interface VideoTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string;
  videoId?: string;
  sceneId?: string;
  projectId: string;
  initialStartTime?: number;
  initialEndTime?: number | null;
  initialCaption?: string;
  onTrimSuccess: (updatedMedia: any) => void;
}

export function VideoTrimModal({
  isOpen,
  onClose,
  videoSrc,
  videoId,
  sceneId,
  projectId,
  initialStartTime = 0,
  initialEndTime = null,
  initialCaption = "",
  onTrimSuccess,
}: VideoTrimModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoopingTrim, setIsLoopingTrim] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const [startTime, setStartTime] = useState<number>(initialStartTime || 0);
  const [endTime, setEndTime] = useState<number>(initialEndTime || 0);
  const [captionInput, setCaptionInput] = useState<string>(initialCaption || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load video metadata
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setStartTime(initialStartTime || 0);
      setCaptionInput(initialCaption || "");
    }
  }, [isOpen, initialStartTime, initialCaption]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      const initialEnd = initialEndTime && initialEndTime > 0 && initialEndTime <= dur
        ? initialEndTime
        : Math.min(dur, Math.max((initialStartTime || 0) + 5, dur));
      setEndTime(initialEnd);
      videoRef.current.currentTime = initialStartTime || 0;
    }
  };

  // Keep playback within [startTime, endTime] when isLoopingTrim is active
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (isLoopingTrim && endTime > startTime && cur >= endTime) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(time, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleSetStartPoint = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    if (cur >= endTime && endTime > 0) {
      toast.warning("จุดเริ่มต้นต้องน้อยกว่าจุดสิ้นสุด");
      return;
    }
    setStartTime(cur);
    toast.success(`ตั้งจุดเริ่มต้นที่ ${cur.toFixed(1)}s`);
  };

  const handleSetEndPoint = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    if (cur <= startTime) {
      toast.warning("จุดสิ้นสุดต้องมากกว่าจุดเริ่มต้น");
      return;
    }
    setEndTime(cur);
    toast.success(`ตั้งจุดสิ้นสุดที่ ${cur.toFixed(1)}s`);
  };

  const adjustStart = (delta: number) => {
    setStartTime((prev) => {
      const next = Math.max(0, Math.min(prev + delta, endTime - 0.2));
      if (videoRef.current) videoRef.current.currentTime = next;
      return next;
    });
  };

  const adjustEnd = (delta: number) => {
    setEndTime((prev) => {
      const next = Math.min(duration, Math.max(prev + delta, startTime + 0.2));
      if (videoRef.current) videoRef.current.currentTime = next;
      return next;
    });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = (sec % 60).toFixed(1);
    return `${mins}:${parseFloat(secs) < 10 ? "0" : ""}${secs}`;
  };

  const handleSaveTrim = async () => {
    if (endTime <= startTime) {
      toast.error("จุดสิ้นสุดต้องมากกว่าจุดเริ่มต้น");
      return;
    }

    try {
      setIsSaving(true);
      toast.loading("กำลังบันทึกช่วงวิดีโอ...", { id: "trim-save" });

      const clipDuration = endTime - startTime;
      const metadataPayload = {
        isVideo: true,
        mediaType: "video",
        startTime,
        endTime,
        duration: duration || clipDuration,
        clipDuration,
        muted: isMuted,
        loop: true,
      };

      if (videoId) {
        // Update existing video record
        const res = await fetch(`/api/projects/${projectId}/images/${videoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: captionInput.trim() || undefined,
            metadata: metadataPayload,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

        toast.success(
          `✓ บันทึกช่วงวิดีโอ (${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s) เรียบร้อย!`,
          { id: "trim-save" }
        );
        onTrimSuccess(data.image);
      } else {
        // Video was newly passed or reference
        toast.success(
          `✓ กำหนดช่วงวิดีโอ (${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s) เรียบร้อย!`,
          { id: "trim-save" }
        );
        onTrimSuccess({
          filePath: videoSrc,
          metadata: JSON.stringify(metadataPayload),
          caption: captionInput,
        });
      }

      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "บันทึกช่วงวิดีโอล้มเหลว";
      toast.error(msg, { id: "trim-save" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const clipDuration = Math.max(0, endTime - startTime);
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#1e232d] border border-slate-700 shadow-2xl p-4 sm:p-6 space-y-4 text-white font-thai my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Scissors className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <span>เลือกช่วงของวิดีโอ (Video Clip Trimmer)</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {clipDuration.toFixed(1)} วินาที
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                เลือกช่วงเวลาที่ต้องการใช้ประกอบฉากหรือบทพูด วิดีโอจะวนลูปเฉพาะช่วงเวลานี้
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

        {/* Video Player Display */}
        <div className="relative aspect-video max-h-[380px] w-full mx-auto rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center group">
          <video
            ref={videoRef}
            src={videoSrc}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            muted={isMuted}
            playsInline
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Center Play Button Overlay */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute p-4 rounded-full bg-black/70 hover:bg-amber-500 text-white hover:text-slate-950 backdrop-blur-md transition-all shadow-xl group-hover:scale-110"
            >
              <Play className="w-8 h-8 fill-current ml-0.5" />
            </button>
          )}

          {/* Bottom Overlay Controls */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between p-2 rounded-lg bg-black/60 backdrop-blur-md text-xs font-mono">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded hover:bg-white/10 text-amber-400"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                title={isMuted ? "เปิดเสียงวิดีโอ" : "ปิดเสียงวิดีโอ"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <span className="text-slate-300">
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-thai">
              <span className="text-amber-400 font-bold">ช่วงที่เลือก:</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                {formatSeconds(startTime)} - {formatSeconds(endTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Range Selector */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          {/* Visual Track */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{formatSeconds(0)}</span>
              <span className="text-amber-400 font-bold font-thai">
                แถบเวลาวิดีโอ (คลิกเพื่อเลื่อนตำแหน่ง)
              </span>
              <span>{formatSeconds(duration)}</span>
            </div>

            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                handleSeek(pos * duration);
              }}
              className="relative h-6 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer overflow-hidden"
            >
              {/* Highlighted Trim Range */}
              <div
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(1, endPercent - startPercent)}%`,
                }}
                className="absolute top-0 bottom-0 bg-amber-500/40 border-l-2 border-r-2 border-amber-400 backdrop-blur-sm"
              />

              {/* Current Playhead */}
              <div
                style={{
                  left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] pointer-events-none"
              />
            </div>
          </div>

          {/* Quick Mark In/Out Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Start Point Controls */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <span>📍 จุดเริ่มต้น (In-Point)</span>
                </span>
                <span className="font-mono text-xs text-white font-bold bg-slate-800 px-2 py-0.5 rounded">
                  {formatSeconds(startTime)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSetStartPoint}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors"
                >
                  ตั้งตำแหน่งนี้เป็นจุดเริ่ม
                </button>
                <button
                  onClick={() => adjustStart(-0.5)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="-0.5 วินาที"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => adjustStart(0.5)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="+0.5 วินาที"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* End Point Controls */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <span>🏁 จุดสิ้นสุด (Out-Point)</span>
                </span>
                <span className="font-mono text-xs text-white font-bold bg-slate-800 px-2 py-0.5 rounded">
                  {formatSeconds(endTime)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSetEndPoint}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors"
                >
                  ตั้งตำแหน่งนี้เป็นจุดจบ
                </button>
                <button
                  onClick={() => adjustEnd(-0.5)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="-0.5 วินาที"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => adjustEnd(0.5)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="+0.5 วินาที"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLoopingTrim}
                onChange={(e) => setIsLoopingTrim(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span className="flex items-center gap-1 text-slate-300">
                <Repeat className="w-3.5 h-3.5 text-amber-400" />
                <span>เล่นวนลูปเฉพาะช่วงเวลาที่เลือก (Loop Preview)</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMuted}
                onChange={(e) => setIsMuted(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span className="text-slate-300">
                ปิดเสียงวิดีโอ (Mute) เพื่อให้เพลง BGM ทำงานสมบูรณ์
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              setStartTime(0);
              setEndTime(duration);
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            รีเซ็ตเต็มคลิป
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </button>

            <button
              disabled={isSaving}
              onClick={handleSaveTrim}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ยืนยันช่วงวิดีโอนี้ ({clipDuration.toFixed(1)}s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
