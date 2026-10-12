"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Music,
  Radio,
  FileAudio,
  Link2,
  Copy,
  Check,
  FolderOpen,
  Filter,
  Sliders,
  AlertCircle,
  X,
  ExternalLink,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ambientSound } from "@/lib/audio/ambientSynth";
import { extractYouTubeVideoId } from "@/lib/audio/audioHelpers";

export interface SoundEffectItem {
  id: string;
  projectId: string;
  name: string;
  category: string;
  audioUrl: string;
  sourceType: "upload" | "url" | "synth";
  durationSeconds: number;
  volume: number;
  tags: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const SFX_CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "music", label: "🎵 คลังเพลง & BGM" },
  { id: "weapon", label: "🗡️ อาวุธ & การต่อสู้" },
  { id: "action", label: "⚔️ มหากาพย์สงคราม" },
  { id: "shock", label: "⚡ สายฟ้า & สะเทือนขวัญ" },
  { id: "atmosphere", label: "🌧️ สภาพอากาศ & ธรรมชาติ" },
  { id: "emotion", label: "💓 อารมณ์ & ตึงเครียด" },
  { id: "horror", label: "🌑 ลึกลับ & สยองขวัญ" },
  { id: "general", label: "✨ อื่นๆ (General)" },
];

export default function SoundEffectsVaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [sfxList, setSfxList] = useState<SoundEffectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Playback state
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playingVolume, setPlayingVolume] = useState<number>(0.8);
  const [activeYouTubeVideoId, setActiveYouTubeVideoId] = useState<string | null>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewYoutubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vaultType, setVaultType] = useState<"music" | "sfx">("music");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("music");
  const [tagsInput, setTagsInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [volumeInput, setVolumeInput] = useState(0.85);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewModalPlaying, setIsPreviewModalPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load project & SFX
  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSfx = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/sfx`);
      if (!res.ok) throw new Error("โหลดคลังเสียงไม่สำเร็จ");
      const data = await res.json();
      setSfxList(data.soundEffects || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการโหลดคลังเสียง SFX");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    loadSfx();
    return () => {
      stopAnyPlaying();
    };
  }, [projectId]);

  const stopAnyPlaying = () => {
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
    }
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
      youtubeIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "stopVideo", args: [] }),
        "*"
      );
      youtubeIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "mute", args: [] }),
        "*"
      );
    }
    ambientSound.stop();
    setActivePlayingId(null);
    setActiveYouTubeVideoId(null);
  };

  const handleTogglePlay = (item: SoundEffectItem) => {
    if (activePlayingId === item.id) {
      stopAnyPlaying();
      return;
    }

    stopAnyPlaying();
    setActivePlayingId(item.id);

    // If it's a procedural synth sound
    if (item.audioUrl.startsWith("synth:")) {
      const synthTrack = item.audioUrl.replace(/^synth:/, "") as any;
      ambientSound.setVolume(item.volume ?? 0.8);
      ambientSound.play(synthTrack);
      toast.info(`กำลังทดสอบเสียง: "${item.name}"`);
      return;
    }

    // If it's a YouTube video link
    const ytId = extractYouTubeVideoId(item.audioUrl);
    if (ytId) {
      setActiveYouTubeVideoId(ytId);
      setTimeout(() => {
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "loadVideoById", args: [ytId] }),
          "*"
        );
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "unMute", args: [] }),
          "*"
        );
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "setVolume",
            args: [Math.round((item.volume ?? 0.8) * 100)],
          }),
          "*"
        );
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      }, 150);
      toast.info(`กำลังเล่นเพลง (YouTube): "${item.name}"`);
      return;
    }

    // Direct audio or uploaded audio
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.src = item.audioUrl;
      activeAudioPlayerRef.current.volume = item.volume ?? 0.8;
      activeAudioPlayerRef.current
        .play()
        .then(() => {
          toast.info(`กำลังเล่นเสียง: "${item.name}"`);
        })
        .catch((e) => {
          console.warn("Audio playback failed:", e);
          setActivePlayingId(null);
          toast.error("ไม่สามารถเล่นไฟล์เสียงนี้ได้ กรุณาตรวจสอบลิงก์");
        });
    }
  };

  const handleDeleteSfx = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบเสียง "${name}" ออกจากคลังเสียงใช่หรือไม่?`)) return;

    const previousList = sfxList;
    try {
      if (activePlayingId === id) stopAnyPlaying();
      
      // Optimistically remove from state so the UI responds immediately
      setSfxList((prev) => prev.filter((s) => s.id !== id));

      // Attempt deletion via nested route first
      let res = await fetch(`/api/projects/${projectId}/sfx/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      // Fallback to query parameter on collection route if nested route failed (404/405/500)
      if (!res.ok) {
        res = await fetch(`/api/projects/${projectId}/sfx?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      }

      if (!res.ok) {
        // Revert optimistic state if deletion failed
        setSfxList(previousList);
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "ลบไม่สำเร็จ");
      }

      toast.success(`ลบเสียง "${name}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error(err);
      setSfxList(previousList);
      toast.error(err.message || "เกิดข้อผิดพลาดในการลบเสียง SFX");
    }
  };

  const handleCopyBindingCode = (item: SoundEffectItem) => {
    const code = `sfx:${item.id}`;
    navigator.clipboard.writeText(code);
    const label = item.category === "music" ? "เพลง" : "เสียง SFX";
    toast.success(`คัดลอกรหัสผูก${label}: "${code}" สำเร็จ! สามารถนำไปเลือกในช่องเสียงบทพูดได้เลย`);
  };

  // Submit new SFX / Music
  const handleOpenUploadModal = (defaultType: "music" | "sfx" = "music") => {
    setSelectedFile(null);
    setUrlInput("");
    setNameInput("");
    setVaultType(defaultType);
    setCategoryInput(defaultType === "music" ? "music" : "weapon");
    setUploadMode(defaultType === "music" ? "url" : "file");
    setTagsInput("");
    setDescriptionInput("");
    setVolumeInput(0.85);
    setIsPreviewModalPlaying(false);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!nameInput.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setNameInput(cleanName);
    }
  };

  const handleTogglePreviewModal = () => {
    if (isPreviewModalPlaying) {
      if (previewAudioPlayerRef.current) previewAudioPlayerRef.current.pause();
      setIsPreviewModalPlaying(false);
      return;
    }

    if (uploadMode === "file" && selectedFile) {
      const objUrl = URL.createObjectURL(selectedFile);
      if (previewAudioPlayerRef.current) {
        previewAudioPlayerRef.current.src = objUrl;
        previewAudioPlayerRef.current.volume = volumeInput;
        previewAudioPlayerRef.current
          .play()
          .then(() => setIsPreviewModalPlaying(true))
          .catch(() => setIsPreviewModalPlaying(false));
      }
    } else if (uploadMode === "url" && urlInput.trim()) {
      const ytId = extractYouTubeVideoId(urlInput.trim());
      if (ytId) {
        setIsPreviewModalPlaying(true);
        return;
      }
      if (previewAudioPlayerRef.current) {
        previewAudioPlayerRef.current.src = urlInput.trim();
        previewAudioPlayerRef.current.volume = volumeInput;
        previewAudioPlayerRef.current
          .play()
          .then(() => setIsPreviewModalPlaying(true))
          .catch(() => setIsPreviewModalPlaying(false));
      }
    }
  };

  const handleSaveNewSfx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadMode === "file" && !selectedFile) {
      toast.error("กรุณาเลือกไฟล์เสียงที่ต้องการอัปโหลด");
      return;
    }
    if (uploadMode === "url" && !urlInput.trim()) {
      toast.error("กรุณาระบุลิงก์เพลงหรือเสียง");
      return;
    }
    if (!nameInput.trim()) {
      toast.error("กรุณาระบุชื่อเพลงหรือเสียง");
      return;
    }

    try {
      setIsSubmitting(true);
      let res: Response;

      const tagArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (uploadMode === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("name", nameInput.trim());
        formData.append("category", categoryInput);
        formData.append("volume", String(volumeInput));
        formData.append("tags", JSON.stringify(tagArray));
        formData.append("description", descriptionInput.trim());

        res = await fetch(`/api/projects/${projectId}/sfx`, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(`/api/projects/${projectId}/sfx`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput.trim(),
            category: categoryInput,
            audioUrl: urlInput.trim(),
            sourceType: "url",
            volume: volumeInput,
            tags: tagArray,
            description: descriptionInput.trim(),
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      const label = categoryInput === "music" ? "เพลง" : "เสียง SFX";
      toast.success(`เพิ่ม${label} "${data.soundEffect.name}" ลงในคลังเรียบร้อยแล้ว!`);
      setSfxList((prev) => [data.soundEffect, ...prev]);
      setIsModalOpen(false);
      if (previewAudioPlayerRef.current) previewAudioPlayerRef.current.pause();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered SFX
  const filteredList = sfxList.filter((item) => {
    const matchCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchSearch =
      !searchTerm.trim() ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-[1720px] mx-auto w-full px-4 sm:px-8 py-6 space-y-6 pb-24 font-thai">
      {/* Hidden audio player for active card playback */}
      <audio
        ref={activeAudioPlayerRef}
        onEnded={() => setActivePlayingId(null)}
        onError={() => setActivePlayingId(null)}
        className="hidden"
      />
      <audio
        ref={previewAudioPlayerRef}
        onEnded={() => setIsPreviewModalPlaying(false)}
        onError={() => setIsPreviewModalPlaying(false)}
        className="hidden"
      />

      {/* Hidden YouTube player for card playback */}
      {activeYouTubeVideoId && (
        <div className="fixed bottom-1 right-1 w-[2px] h-[2px] opacity-[0.01] pointer-events-none overflow-hidden z-0">
          <iframe
            ref={youtubeIframeRef}
            src={`https://www.youtube-nocookie.com/embed/${activeYouTubeVideoId}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&loop=1&playlist=${activeYouTubeVideoId}`}
            title="SFX YouTube Preview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-[2px] h-[2px] pointer-events-none"
            onLoad={() => {
              youtubeIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "unMute", args: [] }),
                "*"
              );
              youtubeIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "setVolume", args: [Math.round(playingVolume * 100)] }),
                "*"
              );
              youtubeIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                "*"
              );
            }}
          />
        </div>
      )}

      {/* Project Header Navigation */}
      {project && (
        <ProjectHeader
          projectId={project.id}
          title={project.title}
          universe={project.universe}
          timelineScope={project.timelineScope}
        />
      )}

      {/* Title & Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              คลังเพลง & เสียงประกอบ (Sound & Music Vault)
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            รวบรวมเพลงประกอบฉาก เพลง YouTube และเสียงเอฟเฟกต์ SFX ทั้งหมดของนิยาย บันทึกและนำกลับมาเลือกใช้กับฉากหรือบทพูดได้ทันที
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenUploadModal("music")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs active:scale-95 transition-all shadow-sm"
          >
            <Music className="w-4 h-4" />
            <span>+ เพิ่มเพลงประกอบ (BGM)</span>
          </button>
          <button
            onClick={() => handleOpenUploadModal("sfx")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มเสียง SFX</span>
          </button>
        </div>
      </div>

      {/* Reassurance & Integration Info Banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs">
        <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div className="flex-1">
          <strong>🎵 บันทึกเพลงและเสียงอัตโนมัติ:</strong> ทุกเพลงที่คุณเคยใส่ลิงก์ไว้ในฉากหรือบทพูด รวมถึงเสียง SFX ที่อัปโหลดใหม่ จะถูกบันทึกเก็บไว้ในคลังนี้โดยอัตโนมัติ และจะปรากฏในตัวเลือกเสียงของบทพูดในหน้า Studio ทันที!
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อเสียง, แท็ก, หรือคำอธิบาย..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            แสดง <strong>{filteredList.length}</strong> จากทั้งหมด {sfxList.length} รายการ
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SFX_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                    : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SFX Grid List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>กำลังโหลดคลังเพลง & เสียงประกอบ...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
            <VolumeX className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-300">ไม่พบเพลงหรือเสียงประกอบที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            คุณสามารถเพิ่มเพลงประกอบ (YouTube / MP3) หรืออัปโหลดไฟล์เสียงเอฟเฟกต์เข้าคลังได้ทันที
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handleOpenUploadModal("music")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-colors"
            >
              <Music className="w-4 h-4" />
              <span>+ เพิ่มเพลงประกอบ</span>
            </button>
            <button
              onClick={() => handleOpenUploadModal("sfx")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มเสียง SFX</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => {
            const isPlaying = activePlayingId === item.id;
            const isMusic = item.category === "music";
            const isYt = Boolean(extractYouTubeVideoId(item.audioUrl));
            let tags: string[] = [];
            try {
              tags = JSON.parse(item.tags || "[]");
            } catch {}

            return (
              <div
                key={item.id}
                className={`relative group rounded-2xl p-4 transition-all duration-200 border ${
                  isPlaying
                    ? isMusic
                      ? "bg-slate-900/90 border-purple-500/80 shadow-lg shadow-purple-500/10"
                      : "bg-slate-900/90 border-amber-500/80 shadow-lg shadow-amber-500/10"
                    : "bg-slate-950/70 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700 shadow-md"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Play / Stop Button with Equalizer animation */}
                  <button
                    onClick={() => handleTogglePlay(item)}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isPlaying
                        ? isMusic
                          ? "bg-purple-500 text-white scale-105 shadow-md shadow-purple-500/30"
                          : "bg-amber-500 text-slate-950 scale-105 shadow-md shadow-amber-500/30"
                        : isMusic
                        ? "bg-purple-950/40 group-hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 group-hover:border-purple-500/60"
                        : "bg-slate-900 group-hover:bg-slate-800 text-amber-400 border border-slate-800 group-hover:border-amber-500/40"
                    }`}
                    title={isPlaying ? "หยุดเพลง/เสียง" : "ทดสอบฟังเพลง/เสียง"}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Sound Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-xs font-bold truncate transition-colors ${
                        isMusic
                          ? "text-white group-hover:text-purple-300"
                          : "text-white group-hover:text-amber-300"
                      }`}>
                        {item.name}
                      </h3>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSfx(item.id, item.name);
                        }}
                        className="opacity-70 group-hover:opacity-100 hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/50 active:scale-95 transition-all"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Category & Source Type Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isMusic
                          ? "bg-purple-950/60 text-purple-300 border-purple-500/40"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {isMusic ? "🎵 เพลงประกอบ / BGM" : SFX_CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 font-mono">
                        {isYt
                          ? "🎬 YouTube"
                          : item.sourceType === "upload"
                          ? "📁 ไฟล์อัปโหลด"
                          : item.sourceType === "synth"
                          ? "🎛️ ระบบเสียงในตัว"
                          : "🔗 ลิงก์ออนไลน์"}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 pt-0.5 font-light">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Quick Copy for Dialogue Binding */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="font-mono text-[10px] text-slate-400">
                      ระดับเสียง: {Math.round((item.volume ?? 0.8) * 100)}%
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyBindingCode(item)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border transition-all font-mono text-[10px] ${
                      isMusic
                        ? "text-purple-300 hover:text-purple-200 border-purple-500/30 hover:border-purple-500/60"
                        : "text-slate-300 hover:text-amber-300 border-slate-800 hover:border-amber-500/30"
                    }`}
                    title="คัดลอกรหัสผูกเสียงนี้เพื่อนำไปใส่ในบทพูด"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{isMusic ? "🎵 ผูกเพลงกับบท" : "🔊 ผูกเสียงกับบท"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Upload & Add Music / SFX Modal                                            */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-thai">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 text-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  vaultType === "music"
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                }`}>
                  {vaultType === "music" ? <Music className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {vaultType === "music" ? "เพิ่มเพลงประกอบ (Music / BGM) ลงในคลัง" : "เพิ่มเสียงเอฟเฟกต์ (SFX) ลงในคลัง"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {vaultType === "music"
                      ? "รองรับทั้งคลิปเพลง YouTube, ลิงก์ออนไลน์, และไฟล์เสียง (.mp3, .wav)"
                      : "รองรับทั้งการอัปโหลดไฟล์ (.mp3, .wav, .ogg, .m4a) และลิงก์ออนไลน์"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (previewAudioPlayerRef.current) previewAudioPlayerRef.current.pause();
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Vault Type Switcher: Music vs SFX */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setVaultType("music");
                  setCategoryInput("music");
                  setUploadMode("url");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  vaultType === "music"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>🎵 เพลงประกอบ (Music / BGM)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVaultType("sfx");
                  setCategoryInput("weapon");
                  setUploadMode("file");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  vaultType === "sfx"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>🔊 เสียงเอฟเฟกต์ (SFX)</span>
              </button>
            </div>

            {/* Source Mode Tabs (File vs URL) */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setUploadMode("url")}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  uploadMode === "url"
                    ? vaultType === "music" ? "bg-purple-600 text-white" : "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🔗 ใส่ลิงก์ {vaultType === "music" ? "(YouTube / Audio URL)" : "ออนไลน์"}
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  uploadMode === "file"
                    ? vaultType === "music" ? "bg-purple-600 text-white" : "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📁 อัปโหลดไฟล์ {vaultType === "music" ? "เพลง (.mp3, .wav)" : "เสียง SFX"}
              </button>
            </div>

            <form onSubmit={handleSaveNewSfx} className="space-y-4">
              {/* File Dropzone */}
              {uploadMode === "file" && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? "border-emerald-500/60 bg-emerald-950/20"
                      : "border-slate-700 hover:border-amber-400/60 bg-slate-950/60 hover:bg-slate-950"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <FileAudio className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-xs font-bold text-emerald-300 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        ขนาด: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • คลิกเพื่อเปลี่ยนไฟล์
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-300">
                        คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                      </p>
                      <p className="text-[11px] text-slate-500">
                        รองรับ MP3, WAV, OGG, M4A (ไม่เกิน 15 MB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* URL Input */}
              {uploadMode === "url" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {vaultType === "music"
                        ? "ลิงก์เพลงประกอบ (YouTube หรือ Direct MP3):"
                        : "ลิงก์เสียงออนไลน์ (Direct Audio URL):"}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={
                      vaultType === "music"
                        ? "เช่น https://www.youtube.com/watch?v=... หรือ https://domain.com/bgm.mp3"
                        : "เช่น https://domain.com/sound-effect.mp3"
                    }
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
                  />
                  {extractYouTubeVideoId(urlInput) && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1 pt-0.5">
                      <span>🎬 ตรวจพบคลิป YouTube: พร้อมเล่นพรีวิวและใช้เป็นเพลงประกอบ</span>
                    </p>
                  )}
                </div>
              )}

              {/* Sound / Music Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  {vaultType === "music" ? "ชื่อเพลงประกอบ (BGM):" : "ชื่อเสียง SFX:"}{" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={
                    vaultType === "music"
                      ? "เช่น Epic Battle Theme, เพลงฉากเปิดตัว, Sad Piano Melancholy"
                      : "เช่น ดาบฟาดฟัน, ประตูปิดกระแทก, เสียงเวทมนตร์เยือกแข็ง"
                  }
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  required
                />
              </div>

              {/* Category & Volume Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">หมวดหมู่:</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    {SFX_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">ระดับเสียงตั้งต้น:</label>
                    <span className="font-mono text-xs text-amber-400">
                      {Math.round(volumeInput * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={volumeInput}
                    onChange={(e) => setVolumeInput(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">คำอธิบายประกอบ / บริบทการใช้ (ตัวเลือก):</label>
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder={
                    vaultType === "music"
                      ? "เช่น เพลงประจำตัวละครเอก, ใช้ตอนไคลแมกซ์ของฉากต่อสู้"
                      : "เช่น ใช้เมื่อตัวละครฟันดาบโดนเกราะเหล็ก, เสียงเปิดประตูห้องใต้ดิน"
                  }
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* Test Play preview button inside modal */}
              {((uploadMode === "file" && selectedFile) || (uploadMode === "url" && urlInput.trim())) && (
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Radio className={`w-3.5 h-3.5 ${isPreviewModalPlaying ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
                      <span>ทดสอบฟังเสียงก่อนบันทึก:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleTogglePreviewModal}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isPreviewModalPlaying
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {isPreviewModalPlaying ? "หยุด" : "ทดสอบฟัง"}
                    </button>
                  </div>
                  {extractYouTubeVideoId(urlInput) && isPreviewModalPlaying && (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 mt-2">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${extractYouTubeVideoId(urlInput)}?autoplay=1&enablejsapi=1`}
                        title="YouTube Preview"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (previewAudioPlayerRef.current) previewAudioPlayerRef.current.pause();
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold shadow-lg active:scale-95 disabled:opacity-50 transition-all ${
                    vaultType === "music"
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-purple-500/20"
                      : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "กำลังบันทึก..."
                      : vaultType === "music"
                      ? "💾 บันทึกลงคลังเพลง (Music Vault)"
                      : "💾 บันทึกลงคลังเสียง SFX"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
