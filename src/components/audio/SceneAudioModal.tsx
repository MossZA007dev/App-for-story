"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Link2,
  CheckCircle2,
  AlertCircle,
  X,
  Youtube,
  Radio,
  FileAudio,
} from "lucide-react";
import { extractYouTubeVideoId, getAudioSourceType } from "@/lib/audio/audioHelpers";

interface SceneAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl?: string | null;
  currentTitle?: string | null;
  onSave: (url: string, title?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function SceneAudioModal({
  isOpen,
  onClose,
  currentUrl = "",
  currentTitle = "",
  onSave,
  onDelete,
}: SceneAudioModalProps) {
  const [urlInput, setUrlInput] = useState(currentUrl || "");
  const [titleInput, setTitleInput] = useState(currentTitle || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);

  // Test playback inside modal
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(0.6);
  const [isMuted, setIsMuted] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const testYtIframeRef = useRef<HTMLIFrameElement | null>(null);

  const fetchAudioTitle = async (url: string, overwrite = false) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const ytId = extractYouTubeVideoId(trimmed);
    if (ytId) {
      try {
        setIsFetchingTitle(true);
        const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.title) {
            if (overwrite || !titleInput || titleInput.includes("เพลงประกอบ")) {
              setTitleInput(data.title);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch YouTube title:", err);
      } finally {
        setIsFetchingTitle(false);
      }
    } else {
      try {
        const urlObj = new URL(trimmed);
        const filename = urlObj.pathname.split("/").pop();
        if (filename && filename.includes(".")) {
          const cleanName = decodeURIComponent(filename.replace(/\.[^/.]+$/, ""));
          if (cleanName && (overwrite || !titleInput || titleInput.includes("เพลงประกอบ"))) {
            setTitleInput(cleanName);
          }
        }
      } catch {}
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUrlInput(currentUrl || "");
      setTitleInput(currentTitle || "");
      setIsPreviewPlaying(false);
      if (currentUrl && (!currentTitle || currentTitle.includes("เพลงประกอบจากลิงก์"))) {
        fetchAudioTitle(currentUrl);
      }
    } else {
      stopPreview();
    }
  }, [isOpen, currentUrl, currentTitle]);

  const sourceType = getAudioSourceType(urlInput);
  const ytVideoId = extractYouTubeVideoId(urlInput);

  const handleUrlInputChange = (val: string) => {
    setUrlInput(val);
    if (isPreviewPlaying) stopPreview();
    if (val.trim()) {
      fetchAudioTitle(val);
    }
  };

  const stopPreview = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
    }
    if (testYtIframeRef.current) {
      testYtIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
    }
    setIsPreviewPlaying(false);
  };

  const handleTogglePreview = () => {
    if (isPreviewPlaying) {
      stopPreview();
    } else {
      if (!urlInput.trim()) return;

      if (ytVideoId) {
        setIsPreviewPlaying(true);
        setTimeout(() => {
          testYtIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
          testYtIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "setVolume",
              args: [Math.round((isMuted ? 0 : previewVolume) * 100)],
            }),
            "*"
          );
        }, 300);
      } else {
        if (testAudioRef.current) {
          testAudioRef.current.src = urlInput.trim();
          testAudioRef.current.volume = isMuted ? 0 : previewVolume;
          testAudioRef.current
            .play()
            .then(() => setIsPreviewPlaying(true))
            .catch((err) => {
              console.warn("Audio test play error:", err);
              setIsPreviewPlaying(false);
            });
        }
      }
    }
  };

  const handlePreviewVolumeChange = (vol: number) => {
    setPreviewVolume(vol);
    if (testAudioRef.current) {
      testAudioRef.current.volume = isMuted ? 0 : vol;
    }
    if (testYtIframeRef.current) {
      testYtIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [Math.round((isMuted ? 0 : vol) * 100)],
        }),
        "*"
      );
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (testAudioRef.current) {
      testAudioRef.current.volume = nextMute ? 0 : previewVolume;
    }
    if (testYtIframeRef.current) {
      testYtIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: nextMute ? "mute" : "unMute",
          args: [],
        }),
        "*"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      setIsSaving(true);
      stopPreview();
      const finalTitle =
        titleInput.trim() ||
        (ytVideoId ? "เพลงประกอบ (YouTube)" : "เพลงประกอบประจำฉาก");
      await onSave(urlInput.trim(), finalTitle);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-thai">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ตั้งค่าเพลงประกอบประจำฉาก</h2>
              <p className="text-xs text-slate-400">
                รองรับทั้งลิงก์ YouTube และไฟล์เสียง Direct Audio (.mp3, .wav)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-sky-400" />
              <span>ลิงก์เพลงประกอบ (Audio URL / YouTube Link):</span>
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              placeholder="วางลิงก์ เช่น https://www.youtube.com/watch?v=... หรือ https://domain.com/song.mp3"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
              autoFocus
            />

            {/* Source Type Detection Badge */}
            {urlInput.trim() && (
              <div className="pt-1">
                {sourceType === "youtube" ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                    <Youtube className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="flex-1">
                      <strong>ตรวจพบคลิป YouTube:</strong> เล่นเพลงและวิดีโอ (Video ID: <code className="font-mono text-white">{ytVideoId}</code>)
                    </span>
                    {isFetchingTitle && (
                      <span className="text-[11px] text-amber-300 animate-pulse font-sans">กำลังดึงชื่อเพลง...</span>
                    )}
                  </div>
                ) : sourceType === "direct" ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      <strong>Direct Audio File:</strong> เล่นไฟล์เพลงตรงผ่านเบราว์เซอร์
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      ลิงก์ออนไลน์ทั่วไป (หากไม่ได้ยินเสียง ให้ใช้คลิป YouTube หรือไฟล์ตรง .mp3)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
                <span>ชื่อเพลง (แสดงในเครื่องเล่น):</span>
              </label>
              {ytVideoId && (
                <button
                  type="button"
                  onClick={() => fetchAudioTitle(urlInput, true)}
                  disabled={isFetchingTitle}
                  className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline font-medium flex items-center gap-1"
                >
                  <span>{isFetchingTitle ? "กำลังค้นหา..." : "🔄 ดึงชื่อจาก YouTube"}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="เช่น Game of Thrones Theme Song, Epic Battle Theme"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all font-thai"
            />
          </div>

          {/* Preset Buttons for One-Click Fill */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-semibold">ตัวอย่างลิงก์แนะนำ (คลิกเพื่อทดสอบ):</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setUrlInput("https://www.youtube.com/watch?v=s7L2PVdrb_8");
                  setTitleInput("Official Opening Credits: Game of Thrones (HBO)");
                  if (isPreviewPlaying) stopPreview();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                🎬 Game of Thrones Theme (YouTube)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrlInput("https://www.youtube.com/watch?v=hV63DbQ_qSc");
                  setTitleInput("Epic Dark Fantasy Music");
                  if (isPreviewPlaying) stopPreview();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                ⚔️ Epic Fantasy Theme (YouTube)
              </button>
            </div>
          </div>

          {/* Test Play & Volume Adjustment Box */}
          {urlInput.trim() && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Radio className={`w-3.5 h-3.5 ${isPreviewPlaying ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
                  <span>ทดสอบฟังเสียงและปรับความดัง:</span>
                </span>
                <span className="font-mono text-emerald-400 text-xs">
                  {Math.round((isMuted ? 0 : previewVolume) * 100)}%
                </span>
              </div>

              {/* YouTube Live Preview Video Player */}
              {ytVideoId && (
                <div className="space-y-1.5">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-lg">
                    <iframe
                      ref={testYtIframeRef}
                      src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
                      title="Test YouTube Player"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      onLoad={() => {
                        if (isPreviewPlaying) {
                          testYtIframeRef.current?.contentWindow?.postMessage(
                            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                            "*"
                          );
                          testYtIframeRef.current?.contentWindow?.postMessage(
                            JSON.stringify({
                              event: "command",
                              func: "setVolume",
                              args: [Math.round((isMuted ? 0 : previewVolume) * 100)],
                            }),
                            "*"
                          );
                        }
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center font-thai">
                    🎬 สามารถกดเล่น/หยุดบนตัววิดีโอ หรือใช้ปุ่ม &quot;ทดสอบฟัง&quot; ด้านล่างเพื่อปรับระดับเสียง
                  </p>
                </div>
              )}

              {/* Direct HTML5 Audio Player */}
              {!ytVideoId && (
                <audio
                  ref={testAudioRef}
                  controls
                  className="w-full h-9 rounded-lg"
                  onEnded={() => setIsPreviewPlaying(false)}
                  onError={() => setIsPreviewPlaying(false)}
                />
              )}

              <div className="flex items-center gap-3 pt-1">
                {/* Play/Pause Button */}
                <button
                  type="button"
                  onClick={handleTogglePreview}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isPreviewPlaying
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPreviewPlaying ? "หยุดเล่น" : "ทดสอบฟัง"}</span>
                </button>

                {/* Mute Button */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                >
                  {isMuted || previewVolume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : previewVolume < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                </button>

                {/* Volume Slider */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : previewVolume}
                  onChange={(e) => {
                    if (isMuted) setIsMuted(false);
                    handlePreviewVolumeChange(parseFloat(e.target.value));
                  }}
                  className="flex-1 accent-emerald-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            {onDelete && currentUrl ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm("ต้องการลบเพลงประกอบประจำฉากนี้ใช่หรือไม่?")) {
                    try {
                      setIsDeleting(true);
                      stopPreview();
                      await onDelete();
                      onClose();
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/60 transition-colors"
              >
                {isDeleting ? "กำลังลบ..." : "ลบเพลงนี้"}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopPreview();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving || !urlInput.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Music className="w-4 h-4" />
                <span>{isSaving ? "กำลังบันทึก..." : "💾 บันทึกและเริ่มเล่นทันที"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
