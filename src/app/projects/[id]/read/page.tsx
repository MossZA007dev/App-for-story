"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Film,
  Sparkles,
  MapPin,
  Clock,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Youtube,
  X,
  Music,
  SlidersHorizontal,
  PenTool,
  User,
  Users,
  Upload,
  Trash2,
  RotateCcw,
  Layers,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { ambientSound } from "@/lib/audio/ambientSynth";
import { extractYouTubeVideoId } from "@/lib/audio/audioHelpers";
import { PartModal } from "@/components/parts/PartModal";
import { SceneAudioModal } from "@/components/audio/SceneAudioModal";
import {
  parseSceneToDialogueBlocks,
  resolveImageForDialogueIndex,
  resolveAudioForDialogueIndex,
  getAudioMoodLabel,
  DialogueBlock,
} from "@/lib/story/dialogueParser";

interface SceneImage {
  id: string;
  prompt: string;
  filePath: string;
  kind: "portrait" | "scene" | "cover" | "movie_still" | "reference";
  approved: number;
  caption?: string;
  metadata?: string | null;
  provider?: string;
}

// Helper to check if media is video
const isVideoMedia = (img?: { filePath?: string; metadata?: string | null; provider?: string } | null) => {
  if (!img || !img.filePath) return false;
  const fp = img.filePath.toLowerCase();
  if (fp.endsWith(".mp4") || fp.endsWith(".webm") || fp.endsWith(".mov") || fp.endsWith(".mkv")) return true;
  if (img.provider === "video") return true;
  if (img.metadata) {
    try {
      const parsed = typeof img.metadata === "string" ? JSON.parse(img.metadata) : img.metadata;
      if (parsed.isVideo || parsed.mediaType === "video") return true;
    } catch {}
  }
  return false;
};

// Helper to get video trim timings
const getVideoTiming = (img?: { metadata?: string | null }) => {
  if (!img?.metadata) return { startTime: 0, endTime: null, isMuted: true };
  try {
    const parsed = typeof img.metadata === "string" ? JSON.parse(img.metadata) : img.metadata;
    return {
      startTime: typeof parsed.startTime === "number" ? parsed.startTime : 0,
      endTime: typeof parsed.endTime === "number" ? parsed.endTime : null,
      isMuted: parsed.muted !== undefined ? parsed.muted : true,
    };
  } catch {
    return { startTime: 0, endTime: null, isMuted: true };
  }
};

interface SceneItem {
  id: string;
  partId: string;
  order: number;
  title: string;
  location: string;
  charactersPresent: string;
  contentMarkdown: string;
  summary: string;
  wordCount: number;
  version: number;
  dialogueBindings?: string | null;
  charactersPresentParsed?: string[];
  images?: SceneImage[];
  bgmUrl?: string | null;
  bgmTitle?: string | null;
  updatedAt?: string;
  lastEditedBy?: string | null;
}

interface PartItem {
  id: string;
  number: number;
  title: string;
  scope: string;
  scenes: SceneItem[];
}

interface CharacterItem {
  id: string;
  name: string;
  characterType?: "self" | "friend" | "canon" | "narrator";
  realNickname?: string;
  avatarUrl?: string;
  currentMbti?: string;
  faction?: string;
  chosenRole?: string;
}

type AudioTrack =
  | "wildfire"
  | "winter"
  | "war"
  | "shadows"
  | "heartbeat"
  | "rain"
  | "thunder"
  | "blade";

export default function NovelReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const searchParams = useSearchParams();
  const initialSceneId = searchParams.get("sceneId");

  const [project, setProject] = useState<any>(null);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [activeScene, setActiveScene] = useState<SceneItem | null>(null);
  const [allScenesList, setAllScenesList] = useState<{ part: PartItem; scene: SceneItem }[]>([]);
  const [activeSceneImages, setActiveSceneImages] = useState<SceneImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeDialogueIndex, setActiveDialogueIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const dialogueBlockRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Audio Engine State
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [audioMode, setAudioMode] = useState<"ambient" | "custom">("custom");
  const [activeYouTubeVideoId, setActiveYouTubeVideoId] = useState<string | null>(null);
  const [activeYouTubeTitle, setActiveYouTubeTitle] = useState<string>("");
  const [isPlayingBgm, setIsPlayingBgm] = useState(false);
  const [isCustomAudioPlaying, setIsCustomAudioPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>("wildfire");
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showMiniVideoPlayer, setShowMiniVideoPlayer] = useState(false);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [isUploadingBgm, setIsUploadingBgm] = useState(false);
  const [isCreatingNextEp, setIsCreatingNextEp] = useState(false);

  const isAnyPlaying = isCustomAudioPlaying || isPlayingBgm;
  const isCustomAudioPlayingRef = useRef(isCustomAudioPlaying);
  useEffect(() => {
    isCustomAudioPlayingRef.current = isCustomAudioPlaying;
  }, [isCustomAudioPlaying]);

  const activeYouTubeVideoIdRef = useRef(activeYouTubeVideoId);
  useEffect(() => {
    activeYouTubeVideoIdRef.current = activeYouTubeVideoId;
  }, [activeYouTubeVideoId]);

  const [projectSfxList, setProjectSfxList] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/sfx`)
      .then((r) => r.json())
      .then((d) => {
        if (d.soundEffects) setProjectSfxList(d.soundEffects);
      })
      .catch(() => {});
  }, [projectId]);

  // Synchronize YouTube player state changes with React state
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "infoDelivery" && data?.info) {
          if (data.info.playerState === 1) {
            setIsCustomAudioPlaying(true);
          }
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Load scene images & details
  const loadSceneImages = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveSceneImages(data.images || []);
      setSelectedImageIndex(0);
      setActiveDialogueIndex(0);
      if (data.scene) {
        setActiveScene((prev) => (prev ? { ...prev, ...data.scene } : data.scene));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSceneItem = (scene: SceneItem) => {
    setActiveScene(scene);
    setActiveDialogueIndex(0);
    loadSceneImages(scene.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Part Modal (New Season / SS) State
  const [partModalOpen, setPartModalOpen] = useState(false);

  // Scene Audio Modal & Quick YouTube Input State
  const [showSceneAudioModal, setShowSceneAudioModal] = useState(false);
  const [quickYtUrl, setQuickYtUrl] = useState("");
  const [isSavingQuickYt, setIsSavingQuickYt] = useState(false);

  // Direct Screenshot Upload State
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadReaderScreenshot = async (file: File) => {
    if (!activeScene) {
      toast.error("ไม่พบข้อมูลฉากปัจจุบัน");
      return;
    }

    try {
      setIsUploadingScreenshot(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sceneId", activeScene.id);
      formData.append("caption", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch(`/api/projects/${projectId}/images/reference`, {
        method: "POST",
        body: formData,
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {}

      if (!res.ok) {
        if (
          res.status === 413 ||
          resText.includes("PAYLOAD_TOO_LARGE") ||
          resText.includes("Request Entity Too Large")
        ) {
          throw new Error("ไฟล์มีขนาดใหญ่เกินกว่าที่ Vercel รองรับ (ไม่เกิน 4.5 MB)");
        }
        throw new Error(data?.error || "อัปโหลดภาพไม่สำเร็จ");
      }

      const newImg = data.image;
      setActiveSceneImages((prev) => [newImg, ...prev]);
      setSelectedImageIndex(0);
      toast.success("📷 อัปโหลดภาพ Screenshot (SS) สำหรับฉากนี้เรียบร้อยแล้ว!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปโหลดภาพ");
    } finally {
      setIsUploadingScreenshot(false);
      if (screenshotInputRef.current) screenshotInputRef.current.value = "";
    }
  };

  const reloadProjectData = async (targetSceneId?: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();

      setProject(data.project);
      setParts(data.parts || []);
      setCharacters(data.characters || []);

      const flatList: { part: PartItem; scene: SceneItem }[] = [];
      (data.parts || []).forEach((p: PartItem) => {
        (p.scenes || []).forEach((s: SceneItem) => {
          flatList.push({ part: p, scene: s });
        });
      });
      setAllScenesList(flatList);

      const toSelectId = targetSceneId || initialSceneId;
      if (flatList.length > 0) {
        if (toSelectId) {
          const found = flatList.find((item) => item.scene.id === toSelectId);
          if (found) {
            setActiveScene(found.scene);
            loadSceneImages(found.scene.id);
            return;
          }
        }
        setActiveScene(flatList[0].scene);
        loadSceneImages(flatList[0].scene.id);
      }
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดเนื้อหานิยายได้");
    }
  };

  const handlePartModalSuccess = async (newPart: any, newScene?: any) => {
    await reloadProjectData(newScene?.id);
    if (newScene) {
      toast.success(`🎉 สร้าง ${newPart.title} (SS${newPart.number}) เรียบร้อย! เปิดฉากที่ 1 ให้ทันที`);
    }
  };

  // Fetch project and scene data
  useEffect(() => {
    setLoading(true);
    reloadProjectData().finally(() => setLoading(false));
  }, [projectId, initialSceneId]);

  // Real-Time Collaborative Live Sync for Reader View (Figma Mode)
  useEffect(() => {
    if (!activeScene?.id) return;

    const pollInterval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const res = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const remoteScene = data.scene;
        if (!remoteScene) return;

        const isContentDifferent = remoteScene.contentMarkdown !== activeScene.contentMarkdown;
        const isImagesDifferent = (data.images || []).length !== activeSceneImages.length;
        const isUpdatedNewer = Boolean(
          remoteScene.updatedAt &&
          activeScene.updatedAt &&
          remoteScene.updatedAt !== activeScene.updatedAt
        );

        if (isContentDifferent || isImagesDifferent || isUpdatedNewer) {
          setActiveScene((prev) => (prev ? { ...prev, ...remoteScene } : remoteScene));
          setActiveSceneImages(data.images || []);
        }
      } catch {
        // Silent catch for background poll
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [activeScene?.id, activeScene?.contentMarkdown, activeScene?.updatedAt, activeSceneImages.length, projectId]);

  // Stop sound when leaving page
  useEffect(() => {
    return () => {
      ambientSound.stop();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // Sync custom audio when activeScene changes
  useEffect(() => {
    if (activeScene?.bgmUrl) {
      const ytId = extractYouTubeVideoId(activeScene.bgmUrl);
      if (ytId) {
        setActiveYouTubeVideoId(ytId);
        setActiveYouTubeTitle(activeScene.bgmTitle || "เพลงประจำฉาก");
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        if (isCustomAudioPlaying) {
          setTimeout(() => {
            youtubeIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
            youtubeIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({
                event: "command",
                func: "setVolume",
                args: [Math.round((isMuted ? 0 : volume) * 100)],
              }),
              "*"
            );
          }, 350);
        }
      } else if (audioPlayerRef.current) {
        setActiveYouTubeVideoId(null);
        setActiveYouTubeTitle(activeScene.bgmTitle || "เพลงประจำฉาก");
        audioPlayerRef.current.src = activeScene.bgmUrl;
        audioPlayerRef.current.volume = isMuted ? 0 : volume;
        if (isCustomAudioPlaying) {
          audioPlayerRef.current.play().catch((e) => console.warn(e));
        }
      }
    } else {
      setActiveYouTubeVideoId(null);
      setActiveYouTubeTitle("");
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (youtubeIframeRef.current) {
        youtubeIframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      }
      setIsCustomAudioPlaying(false);
    }
  }, [activeScene?.id, activeScene?.bgmUrl]);

  // Master Play/Pause Toggle
  const handleToggleMasterPlay = () => {
    if (isAnyPlaying) {
      // STOP EVERYTHING RELIABLY
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
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
      setIsCustomAudioPlaying(false);
      setIsPlayingBgm(false);
      toast.info("หยุดเล่นเพลงเรียบร้อย");
      return;
    }

    // START PLAYING
    const targetYtId = activeYouTubeVideoId || extractYouTubeVideoId(activeScene?.bgmUrl);
    if (targetYtId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      setActiveYouTubeVideoId(targetYtId);
      setActiveYouTubeTitle(activeYouTubeTitle || activeScene?.bgmTitle || "YouTube Soundtrack");
      setIsCustomAudioPlaying(true);
      setAudioMode("custom");
      setTimeout(() => {
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "loadVideoById", args: [targetYtId] }),
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
            args: [Math.round((isMuted ? 0 : volume) * 100)],
          }),
          "*"
        );
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      }, 150);
      toast.success(`กำลังเล่นเพลง: ${activeYouTubeTitle || activeScene?.bgmTitle || "เพลงประจำฉาก"}`);
    } else if (activeScene?.bgmUrl && audioPlayerRef.current) {
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
      audioPlayerRef.current.src = activeScene.bgmUrl;
      audioPlayerRef.current.volume = isMuted ? 0 : volume;
      audioPlayerRef.current.play().catch((e) => console.warn(e));
      setIsCustomAudioPlaying(true);
      setAudioMode("custom");
      toast.success(`กำลังเล่นเพลง: ${activeScene.bgmTitle || "เพลงประจำฉาก"}`);
    } else {
      ambientSound.setVolume(isMuted ? 0 : volume);
      ambientSound.play(currentTrack);
      setIsPlayingBgm(true);
      setAudioMode("ambient");
      toast.success(`กำลังเล่นเพลงบรรยากาศ`);
    }
  };

  // Play Specific Ambient Track
  const handleSelectAmbientTrack = (track: AudioTrack) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
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
    setIsCustomAudioPlaying(false);
    ambientSound.setVolume(isMuted ? 0 : volume);
    ambientSound.play(track);
    setIsPlayingBgm(true);
    setCurrentTrack(track);
    setAudioMode("ambient");
    const trackLabels: Record<AudioTrack, string> = {
      wildfire: "เพลิงป่า (Wildfire Drone)",
      winter: "ลมเหมันต์ (Winter Winds)",
      war: "มหากาพย์ศึก (War Drums)",
      shadows: "เงาทมิฬ (Shadows Ethereal)",
      heartbeat: "หัวใจเต้น (Heartbeat Tension)",
      rain: "สายฝน (Rain & Melancholy)",
      thunder: "ฟ้าผ่า (Thunder Impact)",
      blade: "ชักดาบ (Blade Unsheathe)",
    };
    toast.success(`เล่นเสียงสังเคราะห์: ${trackLabels[track]}`);
  };

  // Play Custom Scene Track
  const handlePlayCustomTrack = () => {
    const targetYtId = activeYouTubeVideoId || extractYouTubeVideoId(activeScene?.bgmUrl);
    if (!targetYtId && !activeScene?.bgmUrl) return;
    ambientSound.stop();
    setIsPlayingBgm(false);
    if (targetYtId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      setActiveYouTubeVideoId(targetYtId);
      setActiveYouTubeTitle(activeYouTubeTitle || activeScene?.bgmTitle || "YouTube Soundtrack");
      setIsCustomAudioPlaying(true);
      setAudioMode("custom");
      setTimeout(() => {
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "loadVideoById", args: [targetYtId] }),
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
            args: [Math.round((isMuted ? 0 : volume) * 100)],
          }),
          "*"
        );
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      }, 150);
      toast.success(`เล่นเพลง: ${activeYouTubeTitle || activeScene?.bgmTitle || "เพลงประจำฉาก"}`);
    } else if (audioPlayerRef.current && activeScene?.bgmUrl) {
      audioPlayerRef.current.src = activeScene.bgmUrl;
      audioPlayerRef.current.volume = isMuted ? 0 : volume;
      audioPlayerRef.current.play().catch((e) => console.warn(e));
      setIsCustomAudioPlaying(true);
      setAudioMode("custom");
      toast.success(`เล่นเพลงประจำฉาก: ${activeScene.bgmTitle || "เพลงประจำฉาก"}`);
    }
  };

  const handlePauseCustomTrack = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
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
    setIsCustomAudioPlaying(false);
    toast.info("หยุดเพลงเรียบร้อย");
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (isMuted && clamped > 0) setIsMuted(false);
    ambientSound.setVolume(clamped);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = clamped;
    }
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [Math.round(clamped * 100)],
        }),
        "*"
      );
    }
  };

  // Upload Scene BGM directly in Reader
  const handleUploadSceneBgm = async (file: File) => {
    if (!activeScene) {
      toast.error("กรุณาเลือกฉากก่อนอัปโหลด");
      return;
    }
    try {
      setIsUploadingBgm(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}/audio`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");

      const updatedScene = { ...activeScene, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle };
      setActiveScene(updatedScene);
      setAllScenesList((prev) =>
        prev.map((item) =>
          item.scene.id === activeScene.id ? { ...item, scene: updatedScene } : item
        )
      );

      setAudioMode("custom");
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = data.bgmUrl;
        audioPlayerRef.current.volume = volume;
        audioPlayerRef.current.play().catch((e) => console.warn(e));
        setIsCustomAudioPlaying(true);
      }
      ambientSound.stop();
      setIsPlayingBgm(false);

      toast.success(`อัปโหลดเพลง "${data.bgmTitle}" สำเร็จและเริ่มเล่นทันที!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "อัปโหลดเพลงไม่สำเร็จ");
    } finally {
      setIsUploadingBgm(false);
    }
  };

  // Set / Change Scene BGM (supports YouTube URL & direct audio links)
  const handleSetSceneAudioUrl = async (url: string, title?: string) => {
    if (!activeScene) {
      toast.error("กรุณาเลือกฉากก่อนตั้งค่าเพลง");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bgmUrl: url.trim(),
          bgmTitle: title?.trim() || "เพลงประกอบประจำฉาก",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกเพลงไม่สำเร็จ");

      const updatedScene = { ...activeScene, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle };
      setActiveScene(updatedScene);
      setAllScenesList((prev) =>
        prev.map((item) =>
          item.scene.id === activeScene.id ? { ...item, scene: updatedScene } : item
        )
      );

      const ytId = extractYouTubeVideoId(data.bgmUrl);
      if (ytId) {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0;
        }
        setActiveYouTubeVideoId(ytId);
        setActiveYouTubeTitle(data.bgmTitle || "เพลงประจำฉาก");
        setIsCustomAudioPlaying(true);
        setAudioMode("custom");
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
              args: [Math.round((isMuted ? 0 : volume) * 100)],
            }),
            "*"
          );
          youtubeIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
        }, 200);
      } else if (audioPlayerRef.current) {
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
        setActiveYouTubeVideoId(null);
        setActiveYouTubeTitle(data.bgmTitle || "เพลงประจำฉาก");
        audioPlayerRef.current.src = data.bgmUrl;
        audioPlayerRef.current.volume = isMuted ? 0 : volume;
        audioPlayerRef.current.play().catch(() => {});
        setIsCustomAudioPlaying(true);
        setAudioMode("custom");
      }

      ambientSound.stop();
      setIsPlayingBgm(false);

      toast.success(`เปลี่ยนเพลงประจำฉากเป็น "${data.bgmTitle}" สำเร็จและเริ่มเล่นทันที!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "บันทึกเพลงไม่สำเร็จ");
    }
  };

  const handleQuickSaveYoutubeBgm = async () => {
    if (!quickYtUrl.trim()) return;
    try {
      setIsSavingQuickYt(true);
      let title = "เพลงประกอบ (YouTube)";
      const ytId = extractYouTubeVideoId(quickYtUrl.trim());
      if (ytId) {
        try {
          const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(quickYtUrl.trim())}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.title) title = data.title;
          }
        } catch {}
      }
      await handleSetSceneAudioUrl(quickYtUrl.trim(), title);
      setQuickYtUrl("");
    } finally {
      setIsSavingQuickYt(false);
    }
  };

  const handleDeleteSceneBgm = async () => {
    if (!activeScene) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}/audio`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบเพลงไม่สำเร็จ");

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
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
      setActiveYouTubeVideoId(null);
      setActiveYouTubeTitle("");
      setIsCustomAudioPlaying(false);

      const updatedScene = { ...activeScene, bgmUrl: null, bgmTitle: null };
      setActiveScene(updatedScene);
      setAllScenesList((prev) =>
        prev.map((item) =>
          item.scene.id === activeScene.id ? { ...item, scene: updatedScene } : item
        )
      );

      toast.success("ลบเพลงประจำฉากเรียบร้อย");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ลบเพลงไม่สำเร็จ");
    }
  };

  // Next EP Creator Handler
  const handleCreateNextEpisode = async () => {
    if (!activeScene) return;
    const targetPartId = activeScene.partId || (parts.length > 0 ? parts[0].id : "");
    if (!targetPartId) {
      toast.error("ไม่พบข้อมูลภาคสำหรับสร้างฉากถัดไป");
      return;
    }

    try {
      setIsCreatingNextEp(true);
      const nextOrder = (activeScene.order || 0) + 1;
      const res = await fetch(`/api/projects/${projectId}/parts/${targetPartId}/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `ฉากที่ ${nextOrder}: การเผชิญหน้าบทใหม่`,
          location: activeScene.location || "คิงส์แลนดิง (King's Landing)",
          charactersPresent: activeScene.charactersPresentParsed || [],
          contentMarkdown: `เสียงฝีเท้าหนักแน่นดังก้องขึ้นในความมืด...\n\n"พวกเราต้องเตรียมพร้อมสำหรับสิ่งที่จะเกิดขึ้นต่อไป"`,
          summary: `จุดเริ่มต้นของฉากที่ ${nextOrder}`,
          directorNote: "สานต่อความเข้มข้นจากฉากก่อนหน้า",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้าง Next EP ไม่สำเร็จ");

      const createdScene = data.scene;
      const currentPartObj = parts.find((p) => p.id === targetPartId) || parts[0];
      const newEntry = { part: currentPartObj, scene: createdScene };
      setAllScenesList((prev) => [...prev, newEntry]);

      // Select new scene
      setActiveScene(createdScene);
      loadSceneImages(createdScene.id);
      window.scrollTo({ top: 0, behavior: "smooth" });

      toast.success(`สร้างและเปิดอ่าน Next EP (ฉากที่ ${nextOrder}) เรียบร้อย!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "สร้างฉากถัดไปไม่สำเร็จ");
    } finally {
      setIsCreatingNextEp(false);
    }
  };

  // Find index in flat list for next/prev buttons
  const currentIndex = allScenesList.findIndex(
    (item) => item.scene.id === activeScene?.id
  );
  const prevSceneItem = currentIndex > 0 ? allScenesList[currentIndex - 1] : null;
  const nextSceneItem =
    currentIndex >= 0 && currentIndex < allScenesList.length - 1
      ? allScenesList[currentIndex + 1]
      : null;

  const currentPart = activeScene
    ? parts.find((p) => p.id === activeScene.partId)
    : null;

  // Parse markdown into Dialogue Blocks for Visual Novel Mode
  const parsedBlocks = activeScene
    ? parseSceneToDialogueBlocks(activeScene.contentMarkdown, characters)
    : [];

  // Parse Dialogue-to-Image Bindings from Scene
  const dialogueBindings: Record<string, string> = (() => {
    if (!activeScene?.dialogueBindings) return {};
    try {
      return typeof activeScene.dialogueBindings === "string"
        ? JSON.parse(activeScene.dialogueBindings)
        : activeScene.dialogueBindings;
    } catch {
      return {};
    }
  })();

  const resolvedMedia = resolveImageForDialogueIndex(
    activeDialogueIndex,
    dialogueBindings,
    activeSceneImages
  );
  const currentFeaturedImage =
    resolvedMedia.image ||
    (activeSceneImages.length > 0
      ? activeSceneImages[selectedImageIndex] || activeSceneImages[0]
      : null);

  // Synchronize featured image automatically when activeDialogueIndex changes
  useEffect(() => {
    if (activeSceneImages.length > 0 && parsedBlocks.length > 0) {
      const resolved = resolveImageForDialogueIndex(
        activeDialogueIndex,
        dialogueBindings,
        activeSceneImages
      );
      if (resolved.imageIndex >= 0 && resolved.imageIndex !== selectedImageIndex) {
        setSelectedImageIndex(resolved.imageIndex);
      }
    }
  }, [activeDialogueIndex, activeSceneImages, dialogueBindings, parsedBlocks.length]);

  // Synchronize audio / mood automatically when activeDialogueIndex changes
  useEffect(() => {
    if (!activeScene || parsedBlocks.length === 0) return;

    const audioResolved = resolveAudioForDialogueIndex(
      activeDialogueIndex,
      dialogueBindings,
      activeScene.bgmUrl
    );

    // If this dialogue beat has an explicit audio binding, transition audio/mood smoothly
    if (audioResolved.isDirectBinding) {
      if (audioResolved.action === "stop") {
        ambientSound.stop();
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0;
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
        setIsCustomAudioPlaying(false);
        setIsPlayingBgm(false);
        setActiveYouTubeVideoId(null);
        setActiveYouTubeTitle("");
      } else if (audioResolved.action === "play_scene_bgm") {
        if (activeScene.bgmUrl) {
          ambientSound.stop();
          setIsPlayingBgm(false);
          const ytId = extractYouTubeVideoId(activeScene.bgmUrl);
          if (ytId) {
            if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
              audioPlayerRef.current.currentTime = 0;
            }
            setActiveYouTubeVideoId(ytId);
            setActiveYouTubeTitle(activeScene.bgmTitle || "เพลงประจำฉาก");
            setIsCustomAudioPlaying(true);
            setAudioMode("custom");
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
                  args: [Math.round((isMuted ? 0 : volume) * 100)],
                }),
                "*"
              );
              youtubeIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                "*"
              );
            }, 150);
          } else if (audioPlayerRef.current) {
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
            setActiveYouTubeVideoId(null);
            setActiveYouTubeTitle(activeScene.bgmTitle || "เพลงประจำฉาก");
            audioPlayerRef.current.src = activeScene.bgmUrl;
            audioPlayerRef.current.volume = isMuted ? 0 : volume;
            audioPlayerRef.current.play().catch(() => {});
            setIsCustomAudioPlaying(true);
            setAudioMode("custom");
          }
        }
      } else if (audioResolved.action === "play_url") {
        const directUrl = audioResolved.value.replace(/^url:/, "");
        ambientSound.stop();
        setIsPlayingBgm(false);
        const ytId = extractYouTubeVideoId(directUrl);
        if (ytId) {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
          }
          setActiveYouTubeVideoId(ytId);
          setActiveYouTubeTitle(audioResolved.label || "เพลงประจำบทพูด");
          setIsCustomAudioPlaying(true);
          setAudioMode("custom");
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
                args: [Math.round((isMuted ? 0 : volume) * 100)],
              }),
              "*"
            );
            youtubeIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
          }, 150);
        } else if (audioPlayerRef.current) {
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
          setActiveYouTubeVideoId(null);
          setActiveYouTubeTitle(audioResolved.label || "เพลงประจำบทพูด");
          audioPlayerRef.current.src = directUrl;
          audioPlayerRef.current.volume = isMuted ? 0 : volume;
          audioPlayerRef.current.play().catch(() => {});
          setIsCustomAudioPlaying(true);
          setAudioMode("custom");
        }
      } else if (audioResolved.action === "play_ambient") {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0;
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
        setActiveYouTubeVideoId(null);
        setActiveYouTubeTitle("");
        setIsCustomAudioPlaying(false);
        ambientSound.setVolume(isMuted ? 0 : volume);
        ambientSound.play(audioResolved.value as any);
        setIsPlayingBgm(true);
        setCurrentTrack(audioResolved.value as any);
        setAudioMode("ambient");
      } else if (audioResolved.action === "play_sfx") {
        const sfxId = audioResolved.value.replace(/^sfx:/, "");
        const sfx = projectSfxList.find((s) => s.id === sfxId);
        if (sfx) {
          const ytId = extractYouTubeVideoId(sfx.audioUrl);
          if (ytId) {
            ambientSound.stop();
            setIsPlayingBgm(false);
            if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
              audioPlayerRef.current.currentTime = 0;
            }
            setActiveYouTubeVideoId(ytId);
            setActiveYouTubeTitle(sfx.name || "เพลงประจำบทพูด");
            setIsCustomAudioPlaying(true);
            setAudioMode("custom");
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
                  args: [Math.round((isMuted ? 0 : volume) * 100)],
                }),
                "*"
              );
              youtubeIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                "*"
              );
            }, 150);
          } else if (sfx.category === "music") {
            ambientSound.stop();
            setIsPlayingBgm(false);
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
            if (audioPlayerRef.current) {
              setActiveYouTubeVideoId(null);
              setActiveYouTubeTitle(sfx.name || "เพลงประจำบทพูด");
              audioPlayerRef.current.src = sfx.audioUrl;
              audioPlayerRef.current.volume = isMuted ? 0 : (sfx.volume ?? 0.8) * volume;
              audioPlayerRef.current.play().catch(() => {});
              setIsCustomAudioPlaying(true);
              setAudioMode("custom");
            }
          } else if (sfx.audioUrl.startsWith("synth:")) {
            ambientSound.setVolume(isMuted ? 0 : (sfx.volume ?? 0.8) * volume);
            ambientSound.play(sfx.audioUrl.replace(/^synth:/, "") as any);
          } else {
            try {
              const snd = new Audio(sfx.audioUrl);
              snd.volume = isMuted ? 0 : (sfx.volume ?? 0.8) * volume;
              snd.play().catch(() => {});
            } catch {}
          }
        }
      }
    } else {
      // NON-BOUND DIALOGUE BEAT:
      // The current beat has NO dialogue-specific audio binding.
      // A dialogue song plays strictly on the bound beat only.
      // 1. If the scene has a scene BGM (activeScene.bgmUrl):
      //    Transition back to scene BGM smoothly (if audio is active).
      // 2. If the scene has NO scene BGM:
      //    Stop all dialogue-specific audio immediately (silence).
      if (activeScene.bgmUrl) {
        const sceneYtId = extractYouTubeVideoId(activeScene.bgmUrl);
        if (sceneYtId) {
          if (activeYouTubeVideoIdRef.current !== sceneYtId) {
            setActiveYouTubeVideoId(sceneYtId);
            setActiveYouTubeTitle(activeScene.bgmTitle || "เพลงประจำฉาก");
            if (isCustomAudioPlayingRef.current) {
              if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current.currentTime = 0;
              }
              ambientSound.stop();
              setAudioMode("custom");
              setTimeout(() => {
                youtubeIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "command", func: "loadVideoById", args: [sceneYtId] }),
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
                    args: [Math.round((isMuted ? 0 : volume) * 100)],
                  }),
                  "*"
                );
                youtubeIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                  "*"
                );
              }, 150);
            }
          }
        } else {
          // Scene BGM is HTML5 direct audio file
          if (activeYouTubeVideoIdRef.current) {
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
            setActiveYouTubeVideoId(null);
            setActiveYouTubeTitle(activeScene.bgmTitle || "เพลงประจำฉาก");
            if (isCustomAudioPlayingRef.current && audioPlayerRef.current) {
              audioPlayerRef.current.src = activeScene.bgmUrl;
              audioPlayerRef.current.volume = isMuted ? 0 : volume;
              audioPlayerRef.current.play().catch(() => {});
              setAudioMode("custom");
            }
          } else if (audioPlayerRef.current && audioPlayerRef.current.src !== activeScene.bgmUrl) {
            setActiveYouTubeTitle(activeScene.bgmTitle || "เพลงประจำฉาก");
            if (isCustomAudioPlayingRef.current) {
              audioPlayerRef.current.src = activeScene.bgmUrl;
              audioPlayerRef.current.volume = isMuted ? 0 : volume;
              audioPlayerRef.current.play().catch(() => {});
              setAudioMode("custom");
            }
          }
        }
      } else {
        // Scene has NO scene BGM:
        // Dialogue-bound song must STOP completely!
        if (isCustomAudioPlayingRef.current || activeYouTubeVideoIdRef.current) {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
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
          setIsCustomAudioPlaying(false);
          setIsPlayingBgm(false);
          setActiveYouTubeVideoId(null);
          setActiveYouTubeTitle("");
        }
      }
    }
  }, [activeDialogueIndex, dialogueBindings, activeScene?.id, activeScene?.bgmUrl, activeScene?.bgmTitle, volume, isMuted, parsedBlocks.length]);

  // Smoothly scroll active dialogue block into view
  useEffect(() => {
    if (activeDialogueIndex >= 0 && dialogueBlockRefs.current[activeDialogueIndex]) {
      dialogueBlockRefs.current[activeDialogueIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeDialogueIndex]);

  // Keyboard navigation for dialogue stepping (ArrowUp, ArrowDown, Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea" || targetTag === "select") {
        return;
      }

      if (e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        if (parsedBlocks.length > 0) {
          e.preventDefault();
          setActiveDialogueIndex((prev) => Math.min(prev + 1, parsedBlocks.length - 1));
        }
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (parsedBlocks.length > 0) {
          e.preventDefault();
          setActiveDialogueIndex((prev) => Math.max(prev - 1, 0));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [parsedBlocks.length]);

  // Dialogue Step Handlers
  const handleStepDialogue = (direction: "next" | "prev") => {
    if (parsedBlocks.length === 0) return;
    if (direction === "next") {
      setActiveDialogueIndex((prev) => Math.min(prev + 1, parsedBlocks.length - 1));
    } else {
      setActiveDialogueIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleSelectDialogueBlock = (index: number) => {
    setActiveDialogueIndex(index);
  };

  const handleResetDialogue = () => {
    setActiveDialogueIndex(0);
  };

  // Active Dialogue Block & Caption
  const activeBlock = parsedBlocks[activeDialogueIndex];
  const hasActiveBinding = Boolean(dialogueBindings[String(activeDialogueIndex)]);

  const leftCardCaption =
    currentFeaturedImage?.caption ||
    (activeBlock ? activeBlock.text : (parsedBlocks.length > 0 ? parsedBlocks[0].text : "")) ||
    "กลิ่นของไฟป่า (Wildfire) ยังคงติดแน่นอยู่ในชั้นบรรยากาศ มันไม่ได้มีกลิ่นเหมือนฟืนไหม้ทั่วไป แต่เป็นกลิ่นฉุนแสบจมูกของสารเคมีโบราณที่เผาผลาญทั้งไม้ เหล็ก และเนื้อมนุษย์จนกลายเป็นเถ้าสีมรกต";

  // Formatted clean title without duplicate "ฉากที่ 1: ฉากที่ 1:"
  const rawTitle = activeScene?.title || "เถ้าถ่านสีมรกตเหนืออ่าวแบล็กวอเตอร์";
  const cleanSceneTitle = rawTitle.startsWith("ฉากที่")
    ? rawTitle
    : `ฉากที่ ${activeScene?.order || 1}: ${rawTitle}`;

  if (loading) {
    return (
      <div className="w-full mx-auto space-y-6 py-8 px-4 sm:px-8">
        <div className="h-16 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-[820px] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          <div className="lg:col-span-4 h-[820px] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#070A11] text-slate-100 pb-20 pt-2 px-4 sm:px-8 xl:px-10 space-y-5">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & BREADCRUMBS WITH MUSIC PLAYER (182x38px Figma Widget)     */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-800/80 pb-4 pt-1 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Breadcrumbs & Project Title */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-thai flex-wrap">
              <Link
                href="/sagas"
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>แดชบอร์ด</span>
              </Link>
              <span className="text-slate-600">/</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {project?.universe || "Dark AU"}
              </span>
              <span className="text-slate-400">
                ({project?.timelineScope || "Season 2 AU"})
              </span>
            </div>

            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-wide">
              {project?.title || "เงาทมิฬแห่งบัลลังก์เหล็ก (Shadows of the Iron Throne)"}
            </h1>
          </div>

          {/* Right: Ambient & Scene BGM Music Player Widget */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="relative">
              <div
                className={`w-[200px] h-[38px] rounded-xl px-2.5 flex items-center justify-between gap-2 border transition-all ${
                  isAnyPlaying
                    ? "bg-[#161a23] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40"
                    : "bg-[#111622] border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Play / Pause Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleMasterPlay}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isAnyPlaying
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  }`}
                  title={isAnyPlaying ? "หยุดเล่นเพลง" : "เปิดเพลงบรรยากาศ (BGM)"}
                >
                  {isAnyPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Animated Equalizer or Track Info */}
                <div
                  onClick={() => setShowAudioControls(!showAudioControls)}
                  className="flex-1 cursor-pointer overflow-hidden text-left"
                  title="คลิกเพื่อเลือกเพลงหรือปรับระดับเสียง"
                >
                  <div className="flex items-center gap-1.5">
                    {isAnyPlaying ? (
                      <div className="flex items-end gap-[2px] h-3.5 w-3.5 flex-shrink-0">
                        <span className="w-[2px] bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                        <span className="w-[2px] bg-amber-400 rounded-full animate-bounce [animation-delay:-0.1s] h-4" />
                        <span className="w-[2px] bg-amber-400 rounded-full animate-bounce [animation-delay:-0.2s] h-2" />
                      </div>
                    ) : (
                      <Music className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-[11px] font-thai font-semibold text-slate-200 truncate">
                      {isAnyPlaying
                        ? audioMode === "custom"
                          ? `🎵 ${activeYouTubeTitle || activeScene?.bgmTitle || "เพลงประจำฉาก"}`
                          : currentTrack === "wildfire"
                          ? "🔥 เพลิงป่า"
                          : currentTrack === "winter"
                          ? "❄️ ลมเหมันต์"
                          : currentTrack === "war"
                          ? "⚔️ กลองศึก"
                          : currentTrack === "shadows"
                          ? "🌑 เงาทมิฬ"
                          : currentTrack === "heartbeat"
                          ? "💓 หัวใจเต้น"
                          : currentTrack === "rain"
                          ? "🌧️ สายฝน"
                          : currentTrack === "thunder"
                          ? "⚡ ฟ้าผ่า"
                          : currentTrack === "blade"
                          ? "🗡️ ชักดาบ"
                          : "🎵 บรรยากาศ"
                        : activeScene?.bgmUrl
                        ? `🎵 ${activeScene.bgmTitle || "เพลงประจำฉาก"}`
                        : "เปิดเพลง BGM"}
                    </span>
                  </div>
                </div>

                {/* Track Selector / Volume settings button */}
                <button
                  type="button"
                  onClick={() => setShowAudioControls(!showAudioControls)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="ตัวเลือกเสียงบรรยากาศ & อัปโหลดเพลง"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* BGM Dropdown Settings Panel */}
              {showAudioControls && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0e131d] border border-slate-700 p-3.5 shadow-2xl z-50 animate-fadeIn space-y-3 font-thai">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      <span>ระบบเสียง & เพลงประกอบฉาก</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handlePauseCustomTrack();
                        ambientSound.stop();
                        setIsPlayingBgm(false);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 font-semibold border border-red-500/40 transition-colors"
                      title="หยุดเล่นเพลงและเสียงทั้งหมดทันที"
                    >
                      ⏹️ หยุดทั้งหมด
                    </button>
                  </div>

                  {/* 1. Custom Scene BGM Section */}
                  <div className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                        <span>🎵 เพลงเฉพาะประจำฉากนี้</span>
                      </span>
                      {activeScene?.bgmUrl && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          มีไฟล์เพลง
                        </span>
                      )}
                    </div>

                    {activeScene?.bgmUrl ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/40 border border-slate-700/60">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <button
                              type="button"
                              onClick={() => (isCustomAudioPlaying ? handlePauseCustomTrack() : handlePlayCustomTrack())}
                              className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 hover:bg-amber-400 transition-colors"
                              title={isCustomAudioPlaying ? "หยุดเพลงนี้" : "เล่นเพลงนี้"}
                            >
                              {isCustomAudioPlaying ? (
                                <Pause className="w-3 h-3 fill-current" />
                              ) : (
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                              )}
                            </button>
                            <span className="text-xs text-slate-200 truncate font-medium">
                              {extractYouTubeVideoId(activeScene.bgmUrl) ? "🎬 " : "🎵 "}
                              {activeScene.bgmTitle || "เพลงประจำฉาก"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {extractYouTubeVideoId(activeScene.bgmUrl) && (
                              <button
                                type="button"
                                onClick={() => setShowMiniVideoPlayer((prev) => !prev)}
                                className={`px-2 py-0.5 rounded text-[10px] font-thai font-semibold border transition-all ${
                                  showMiniVideoPlayer
                                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                                    : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
                                }`}
                                title="เปิด/ปิด จอวิดีโอ YouTube ขนาดเล็ก"
                              >
                                📺 {showMiniVideoPlayer ? "ปิดจอ" : "ดู MV"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleDeleteSceneBgm}
                              className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                              title="ลบเพลงประจำฉากนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Quick YouTube Link input */}
                        <div className="flex items-center gap-1.5 p-1 bg-black/50 border border-slate-700/80 rounded-lg">
                          <Youtube className="w-3.5 h-3.5 text-red-500 ml-1.5 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="วางลิงก์ YouTube เปลี่ยนเพลง..."
                            value={quickYtUrl}
                            onChange={(e) => setQuickYtUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleQuickSaveYoutubeBgm();
                              }
                            }}
                            className="flex-1 bg-transparent px-1 py-0.5 text-[11px] text-white placeholder-slate-500 outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleQuickSaveYoutubeBgm}
                            disabled={!quickYtUrl.trim() || isSavingQuickYt}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold disabled:opacity-40 transition-colors flex-shrink-0"
                          >
                            {isSavingQuickYt ? "..." : "บันทึก"}
                          </button>
                        </div>

                        {/* Change Options: Modal / MP3 Upload */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowSceneAudioModal(true)}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 text-[11px] font-bold border border-purple-800/60 transition-colors shadow-sm"
                            title="เลือกจากคลังเพลงหรือตั้งค่าแบบละเอียด"
                          >
                            <Music className="w-3 h-3 text-purple-400" />
                            <span>คลังเพลง / ละเอียด</span>
                          </button>

                          <label className="cursor-pointer flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors">
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadSceneBgm(file);
                              }}
                            />
                            <span>{isUploadingBgm ? "..." : "อัปโหลด MP3"}</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] text-slate-400">ยังไม่มีเพลงเฉพาะสำหรับฉากนี้</p>

                        {/* Quick YouTube Link input */}
                        <div className="flex items-center gap-1.5 p-1 bg-black/50 border border-slate-700/80 rounded-lg">
                          <Youtube className="w-3.5 h-3.5 text-red-500 ml-1.5 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="วางลิงก์ YouTube ที่นี่..."
                            value={quickYtUrl}
                            onChange={(e) => setQuickYtUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleQuickSaveYoutubeBgm();
                              }
                            }}
                            className="flex-1 bg-transparent px-1 py-0.5 text-[11px] text-white placeholder-slate-500 outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleQuickSaveYoutubeBgm}
                            disabled={!quickYtUrl.trim() || isSavingQuickYt}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold disabled:opacity-40 transition-colors flex-shrink-0"
                          >
                            {isSavingQuickYt ? "..." : "บันทึก"}
                          </button>
                        </div>

                        {/* Add Options: Modal / MP3 Upload */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowSceneAudioModal(true)}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-red-600 to-purple-600 hover:brightness-110 text-white text-[11px] font-bold shadow-md transition-all active:scale-95"
                            title="เลือกจากคลังเพลงหรือค้นหา YouTube แบบละเอียด"
                          >
                            <Music className="w-3 h-3" />
                            <span>คลังเพลง / ละเอียด</span>
                          </button>

                          <label className="cursor-pointer flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors shadow">
                            <Upload className="w-3 h-3" />
                            <span>{isUploadingBgm ? "..." : "อัปโหลด MP3"}</span>
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadSceneBgm(file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Synthetic Ambient Drones */}
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-medium">เสียงบรรยากาศสังเคราะห์ (Web Audio):</p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        onClick={() => handleSelectAmbientTrack("wildfire")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "wildfire" && isPlayingBgm
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        🔥 เพลิงป่า
                      </button>
                      <button
                        onClick={() => handleSelectAmbientTrack("winter")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "winter" && isPlayingBgm
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        ❄️ ลมเหมันต์
                      </button>
                      <button
                        onClick={() => handleSelectAmbientTrack("war")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "war" && isPlayingBgm
                            ? "bg-red-500/20 text-red-300 border-red-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        ⚔️ กลองศึก
                      </button>
                      <button
                        onClick={() => handleSelectAmbientTrack("shadows")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "shadows" && isPlayingBgm
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        🌑 เงาทมิฬ
                      </button>
                      <button
                        onClick={() => handleSelectAmbientTrack("heartbeat")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "heartbeat" && isPlayingBgm
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        💓 หัวใจเต้น
                      </button>
                      <button
                        onClick={() => handleSelectAmbientTrack("rain")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "rain" && isPlayingBgm
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        🌧️ สายฝน
                      </button>
                      <button
                        onClick={() => handleSelectAmbientTrack("thunder")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "thunder" && isPlayingBgm
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        ⚡ ฟ้าผ่า
                      </button>
                      <button
                        onClick={() => handleSelectAmbientTrack("blade")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          audioMode === "ambient" && currentTrack === "blade" && isPlayingBgm
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        🗡️ ชักดาบ
                      </button>
                    </div>
                  </div>

                  {/* 3. Master Volume Slider */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => {
                          const nextMute = !isMuted;
                          setIsMuted(nextMute);
                          const targetVol = nextMute ? 0 : volume;
                          ambientSound.setVolume(targetVol);
                          if (audioPlayerRef.current) audioPlayerRef.current.volume = targetVol;
                          if (youtubeIframeRef.current) {
                            youtubeIframeRef.current.contentWindow?.postMessage(
                              JSON.stringify({ event: "command", func: nextMute ? "mute" : "unMute", args: [] }),
                              "*"
                            );
                          }
                        }}
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                        title={isMuted ? "เปิดเสียง" : "ปิดเสียงชั่วคราว"}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-3.5 h-3.5 text-red-400" />
                        ) : volume < 0.5 ? (
                          <Volume1 className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>ระดับความดัง</span>
                      </button>
                      <span className="font-mono">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        if (isMuted) setIsMuted(false);
                        handleVolumeChange(parseFloat(e.target.value));
                      }}
                      className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Reader / Studio / Bible / Images / Quick Scene Selector) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs font-thai font-semibold">
          <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>📖 โหมดอ่านนิยาย (Reader)</span>
          </span>

          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <span>Studio แก้ไข & สตรีมฉาก</span>
          </Link>

          <Link
            href={`/projects/${projectId}?tab=characters`}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>User Character Bible</span>
          </Link>

          <Link
            href={`/projects/${projectId}?tab=images`}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>Image Studio</span>
          </Link>

          {/* Quick Scene Selector & New Part / SS button on Right */}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={activeScene?.id || ""}
              onChange={(e) => {
                const found = allScenesList.find((item) => item.scene.id === e.target.value);
                if (found) handleSelectSceneItem(found.scene);
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none max-w-[200px] truncate"
            >
              {allScenesList.map(({ part, scene }) => (
                <option key={scene.id} value={scene.id} className="bg-slate-900">
                  ภาค {part.number} • ฉาก {scene.order}: {scene.title}
                </option>
              ))}
            </select>

            {/* Live Sync Badge (Figma Mode) */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-emerald-500/30 text-[11px] font-thai text-emerald-300 shadow-sm"
              title="ระบบซิงค์เนื้อเรื่องจาก Studio อัตโนมัติทุก 4 วินาที (Figma Live Sync)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold hidden sm:inline">Live Sync</span>
            </div>

            <button
              type="button"
              onClick={() => setPartModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-thai font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
              title="เพิ่มภาคใหม่ / ซีซั่นใหม่ (SS)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>+ เพิ่มภาค / SS</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SPLIT-SCREEN CONTAINER (Perfect Symmetrical Height matching Figma) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-stretch w-full">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: Large Image Card (Figma width: 1196px, 2/3 of screen)        */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between rounded-[16px] p-5 sm:p-6 bg-[#313131] border border-slate-700/60 shadow-2xl h-[780px] sm:h-[840px] lg:h-[880px] xl:h-[920px]">
          {/* Main Cinematic Image Display (flex-1 so it dynamically fills vertical height) */}
          <div className="relative w-full flex-1 min-h-0 rounded-[13px] overflow-hidden bg-[#1e232d] group border border-black/20 mb-3">
            {currentFeaturedImage ? (
              <>
                {isVideoMedia(currentFeaturedImage) ? (
                  <video
                    key={currentFeaturedImage.id || currentFeaturedImage.filePath}
                    src={currentFeaturedImage.filePath}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedMetadata={(e) => {
                      const timing = getVideoTiming(currentFeaturedImage);
                      if (timing.startTime > 0) e.currentTarget.currentTime = timing.startTime;
                    }}
                    onTimeUpdate={(e) => {
                      const timing = getVideoTiming(currentFeaturedImage);
                      if (timing.endTime && e.currentTarget.currentTime >= timing.endTime) {
                        e.currentTarget.currentTime = timing.startTime || 0;
                        e.currentTarget.play().catch(() => {});
                      }
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={currentFeaturedImage.id || currentFeaturedImage.filePath}
                    src={currentFeaturedImage.filePath}
                    alt={currentFeaturedImage.caption || currentFeaturedImage.prompt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                  />
                )}

                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Image Type Tag Badge */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2 flex-wrap">
                  {isVideoMedia(currentFeaturedImage) ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950/90 text-purple-200 border border-purple-500/80 font-thai flex items-center gap-1.5 backdrop-blur-md shadow">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      <span>🎬 วิดีโอคลิปวนลูป</span>
                      {getVideoTiming(currentFeaturedImage).endTime ? (
                        <span className="font-mono text-[10px] text-purple-300">
                          ({getVideoTiming(currentFeaturedImage).startTime.toFixed(1)}s - {getVideoTiming(currentFeaturedImage).endTime?.toFixed(1)}s)
                        </span>
                      ) : null}
                    </span>
                  ) : currentFeaturedImage.kind === "movie_still" || currentFeaturedImage.kind === "reference" ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/90 text-red-200 border border-red-700/80 font-thai flex items-center gap-1.5 backdrop-blur-md shadow">
                      <Film className="w-3.5 h-3.5 text-red-400" />
                      <span>ภาพจริงจากหนัง / CANON STILL</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-slate-950 font-thai flex items-center gap-1.5 backdrop-blur-md shadow">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ภาพประกอบ AI (CINEMATIC SCENE)</span>
                    </span>
                  )}
                </div>

                {/* Upload More Screenshot (SS) Trigger */}
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadReaderScreenshot(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => screenshotInputRef.current?.click()}
                  disabled={isUploadingScreenshot}
                  className="absolute top-3.5 right-14 p-2 rounded-xl bg-black/70 hover:bg-black text-slate-300 hover:text-amber-300 backdrop-blur-md transition-all shadow"
                  title="อัปโหลดภาพ Screenshot (SS) เพิ่มสำหรับฉากนี้"
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Zoom Lightbox Trigger */}
                <button
                  onClick={() => setLightboxImage(currentFeaturedImage.filePath)}
                  className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all shadow"
                  title="ขยายภาพเต็มจอ"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadReaderScreenshot(f);
                  }}
                />
                <Film className="w-12 h-12 mb-3 text-slate-600" />
                <p className="font-thai font-semibold text-slate-300">ยังไม่มีภาพประกอบสำหรับฉากนี้</p>
                <p className="text-xs font-thai text-slate-500 mt-1 max-w-sm">
                  คุณสามารถอัปโหลดภาพ Screenshot (SS) จากหนัง หรือกลับไปที่ Studio เพื่อสั่ง AI สร้างภาพประกอบ
                </p>
                <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => screenshotInputRef.current?.click()}
                    disabled={isUploadingScreenshot}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-thai font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingScreenshot ? "กำลังอัปโหลด..." : "📷 อัปโหลดภาพ / Screenshot (SS)"}</span>
                  </button>
                  <Link
                    href={`/projects/${projectId}?sceneId=${activeScene?.id || ""}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-thai font-semibold transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5 text-amber-400" />
                    <span>ไปที่ Studio เพื่อใส่รูป / สร้าง AI</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail Strip if multiple images exist */}
          {activeSceneImages.length > 1 && (
            <div className="flex-shrink-0 space-y-1.5 mb-2">
              <p className="text-[11px] font-semibold text-slate-400 font-thai">
                ภาพประกอบทั้งหมดในฉากนี้ ({activeSceneImages.length} ภาพ):
              </p>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {activeSceneImages.map((img, idx) => {
                  const isSelected = selectedImageIndex === idx;
                  const isMovie = img.kind === "movie_still" || img.kind === "reference";

                  return (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`cursor-pointer relative aspect-video w-24 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                        isSelected
                          ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-1 ring-amber-400 scale-105"
                          : "border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500"
                      }`}
                    >
                      {isVideoMedia(img) ? (
                        <video
                          src={img.filePath}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={img.filePath}
                          alt={img.caption || ""}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-bold bg-black/80 text-white font-mono">
                        {isVideoMedia(img) ? "🎬 VDO" : isMovie ? "MOVIE" : "AI"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Atmospheric sensory caption underneath the image (Matching Figma & Screenshot) */}
          <div className="flex-shrink-0 p-3 pt-3 border-t border-slate-700/50 space-y-1">
            {activeBlock && (
              <div className="flex items-center gap-2 text-[11px] font-thai text-amber-400 font-bold">
                <span className="flex-shrink-0">🎬 ประโยคปัจจุบัน:</span>
                <span className="text-slate-300 font-normal truncate">
                  {activeBlock.speakerName ? `${activeBlock.speakerName}: ` : ""}&quot;{activeBlock.text}&quot;
                </span>
              </div>
            )}
            <p className="text-sm font-thai text-[#E2E8F0] leading-relaxed line-clamp-3">
              {leftCardCaption}
            </p>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Dialogue Card (Figma width: 596px, 1/3, Scrollable Stream) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between rounded-[16px] p-5 sm:p-6 bg-[#313131] border border-slate-700/60 shadow-2xl h-[780px] sm:h-[840px] lg:h-[880px] xl:h-[920px] space-y-3">
          {/* Header: Part subtitle & Clean Scene Title (No duplicated "ฉากที่ 1: ฉากที่ 1:") */}
          <div className="flex-shrink-0 space-y-2 border-b border-slate-700/50 pb-3">
            {currentPart && (
              <div className="text-[11px] font-mono font-bold text-[#FBBF24] tracking-wider uppercase">
                PART {currentPart.number}: {currentPart.title}
              </div>
            )}

            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {cleanSceneTitle}
            </h2>

            {/* Location & Time Info */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-thai">
              {activeScene?.location && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeScene.location}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>~{Math.max(1, Math.round((activeScene?.wordCount || 300) / 250))} นาที</span>
              </span>
            </div>
          </div>

          {/* Interactive Dialogue Reader Controls (Step Through Dialogue with Arrow Buttons) */}
          {parsedBlocks.length > 0 && (
            <div className="flex-shrink-0 bg-[#252525] rounded-xl p-2.5 border border-slate-700/60 shadow-md space-y-2">
              <div className="flex items-center justify-between gap-2">
                {/* Step Backward Arrow Button */}
                <button
                  onClick={() => handleStepDialogue("prev")}
                  disabled={activeDialogueIndex <= 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-thai font-semibold text-slate-200 border border-slate-700/80 transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="ประโยคก่อนหน้า (คีย์บอร์ด ↑)"
                >
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                  <span>ก่อนหน้า</span>
                </button>

                {/* Progress Counter & Step Bar */}
                <div className="flex-1 text-center px-1">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-thai text-slate-300">
                    <span className="font-mono font-bold text-amber-400">
                      {activeDialogueIndex + 1}
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="font-mono text-slate-400">
                      {parsedBlocks.length}
                    </span>
                    <span className="text-slate-400 text-[10px] hidden sm:inline">(ประโยค)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300"
                      style={{
                        width: `${((activeDialogueIndex + 1) / parsedBlocks.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Step Forward Arrow Button (Primary Highlight) */}
                <button
                  onClick={() => handleStepDialogue("next")}
                  disabled={activeDialogueIndex >= parsedBlocks.length - 1}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 disabled:opacity-35 disabled:hover:brightness-100 disabled:cursor-not-allowed text-xs font-thai font-black text-slate-950 transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] active:scale-95 cursor-pointer"
                  title="ประโยคถัดไป (คีย์บอร์ด ↓ หรือ Spacebar)"
                >
                  <span>ถัดไป</span>
                  <ChevronDown className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Keyboard shortcuts & auto-switch hint */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5 border-t border-slate-700/40">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.2 bg-slate-800 rounded text-[9px] text-slate-300 border border-slate-700">↑</kbd>
                  <kbd className="px-1 py-0.2 bg-slate-800 rounded text-[9px] text-slate-300 border border-slate-700">↓</kbd>
                  <span className="text-slate-400">หรือ</span>
                  <kbd className="px-1.5 py-0.2 bg-slate-800 rounded text-[9px] text-slate-300 border border-slate-700">Space</kbd>
                  <span>เลื่อนอ่านทีละประโยค</span>
                </span>

                <div className="flex items-center gap-2">
                  {hasActiveBinding && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>ภาพเปลี่ยนตามบทนี้</span>
                    </span>
                  )}
                  {activeDialogueIndex > 0 && (
                    <button
                      onClick={handleResetDialogue}
                      className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-0.5"
                      title="กลับไปประโยคแรก"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>เริ่มใหม่</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inner Dialogue Container (#2D2D2D, rounded-[18px]) - FULLY SCROLLABLE */}
          <div className="relative flex-1 min-h-0 rounded-[18px] bg-[#2D2D2D] p-4 sm:p-5 border border-slate-700/40 overflow-y-auto dialogue-scroll space-y-4 pr-3">
            {parsedBlocks.length > 0 ? (
              parsedBlocks.map((block, idx) => {
                const isActive = idx === activeDialogueIndex;
                const hasBinding = Boolean(dialogueBindings[String(idx)]);
                const assignedAudioVal = dialogueBindings[`audio_${idx}`];

                // 1. SOUND EFFECT ROW (Centered atmospheric text)
                if (block.type === "sound") {
                  return (
                    <div
                      key={block.id}
                      ref={(el) => {
                        dialogueBlockRefs.current[idx] = el;
                      }}
                      onClick={() => handleSelectDialogueBlock(idx)}
                      className={`py-3 px-4 text-center font-thai text-sm italic tracking-widest cursor-pointer rounded-xl transition-all ${
                        isActive
                          ? "bg-amber-500/20 text-amber-200 ring-2 ring-amber-400 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] font-bold scale-[1.01]"
                          : "text-slate-300 opacity-80 hover:opacity-100 hover:bg-black/20"
                      }`}
                    >
                      <div>{block.text}</div>
                      {assignedAudioVal && (
                        <div className="flex justify-center mt-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1 shadow-sm">
                            <Music className="w-2.5 h-2.5" />
                            <span>{getAudioMoodLabel(assignedAudioVal)}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                // Determine Avatar Attributes
                const isNarrator =
                  block.isNarrator ||
                  block.type === "narration" ||
                  block.speaker?.characterType === "narrator" ||
                  block.speaker?.name === "ผู้บรรยาย";
                const isSelf = !isNarrator && block.speaker?.characterType === "self";
                const isFriend = !isNarrator && block.speaker?.characterType === "friend";

                const narrChar = isNarrator
                  ? characters.find((c) => c.characterType === "narrator" || c.name === "ผู้บรรยาย")
                  : null;
                const avatarUrl = isNarrator
                  ? (narrChar?.avatarUrl || (block.speaker?.characterType === "narrator" ? block.speaker?.avatarUrl : ""))
                  : block.speaker?.avatarUrl;
                const displayName = isNarrator
                  ? (narrChar?.realNickname || narrChar?.name || "ผู้บรรยาย")
                  : (block.speaker?.realNickname || block.speaker?.name || block.speakerName || "ผู้พูด");
                const mbti = isNarrator ? (narrChar?.currentMbti || "") : block.speaker?.currentMbti;

                // Avatar Icon Component
                const AvatarIcon = () => (
                  <div
                    className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-md transition-transform hover:scale-110 ${
                      isActive
                        ? "border-amber-400 ring-2 ring-amber-400 bg-amber-500/30 text-amber-200 scale-105"
                        : isNarrator
                        ? "border-amber-500/80 bg-amber-950/40 text-amber-300"
                        : isSelf
                        ? "border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/60 text-amber-300"
                        : isFriend
                        ? "border-sky-400 ring-2 ring-sky-400/40 bg-sky-950/60 text-sky-300"
                        : "border-slate-500 bg-slate-800 text-slate-300"
                    }`}
                    title={`${displayName} (${isNarrator ? "ผู้บรรยาย" : isSelf ? "ตัวละครของฉัน" : isFriend ? "เพื่อน" : "ตัวละคร"})`}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : isNarrator ? (
                      <span className="text-base select-none" title="ผู้บรรยาย">📜</span>
                    ) : (
                      <span className="font-heading font-bold text-xs uppercase">
                        {displayName.slice(0, 2)}
                      </span>
                    )}
                  </div>
                );

                // NARRATION or SELF DIALOGUE on the LEFT
                if (block.side === "left") {
                  return (
                    <div
                      key={block.id}
                      ref={(el) => {
                        dialogueBlockRefs.current[idx] = el;
                      }}
                      onClick={() => handleSelectDialogueBlock(idx)}
                      className={`flex items-start gap-3.5 group p-2.5 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? "bg-amber-500/15 ring-2 ring-amber-400/90 border-l-4 border-l-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.01]"
                          : "hover:bg-black/20 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <AvatarIcon />

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-thai font-bold ${
                              isNarrator
                                ? "text-amber-300"
                                : isSelf
                                ? "text-amber-400"
                                : isFriend
                                ? "text-sky-400"
                                : "text-slate-300"
                            }`}
                          >
                            {isNarrator ? "📜 " : isSelf ? "👑 " : ""}{displayName}
                          </span>
                          {block.isNarrator && (
                            <span className="text-[10px] font-thai text-amber-300/80 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded font-semibold">
                              ผู้บรรยาย
                            </span>
                          )}
                          {mbti && (
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              [{mbti}]
                            </span>
                          )}
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-slate-950 font-mono shadow animate-pulse">
                              ▶ อ่านอยู่นี่
                            </span>
                          )}
                          {hasBinding && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>สลับภาพ</span>
                            </span>
                          )}
                          {assignedAudioVal && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1" title="เปลี่ยนอารมณ์เพลง/เสียง">
                              <Music className="w-2.5 h-2.5" />
                              <span>{getAudioMoodLabel(assignedAudioVal)}</span>
                            </span>
                          )}
                          {assignedAudioVal && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1" title="เปลี่ยนอารมณ์เพลง/เสียง">
                              <Music className="w-2.5 h-2.5" />
                              <span>{getAudioMoodLabel(assignedAudioVal)}</span>
                            </span>
                          )}
                        </div>
                        <p className={`font-thai text-sm leading-relaxed ${isActive ? "text-white font-medium" : "text-[#E2E8F0]"}`}>
                          {block.text}
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  // FRIEND or COUNTERPART on the RIGHT
                  return (
                    <div
                      key={block.id}
                      ref={(el) => {
                        dialogueBlockRefs.current[idx] = el;
                      }}
                      onClick={() => handleSelectDialogueBlock(idx)}
                      className={`flex items-start justify-end gap-3.5 group p-2.5 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? "bg-amber-500/15 ring-2 ring-amber-400/90 border-r-4 border-r-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.01]"
                          : "hover:bg-black/20 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <div className="flex-1 space-y-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasBinding && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>สลับภาพ</span>
                            </span>
                          )}
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-slate-950 font-mono shadow animate-pulse">
                              ▶ อ่านอยู่นี่
                            </span>
                          )}
                          {mbti && (
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              [{mbti}]
                            </span>
                          )}
                          <span
                            className={`text-xs font-thai font-bold ${
                              isFriend ? "text-sky-400" : isSelf ? "text-amber-400" : "text-slate-300"
                            }`}
                          >
                            {displayName}{isFriend ? " 🧑‍🤝‍🧑" : ""}
                          </span>
                        </div>
                        <p className={`font-thai text-sm leading-relaxed text-right ${isActive ? "text-white font-medium" : "text-[#E2E8F0]"}`}>
                          {block.text}
                        </p>
                      </div>

                      <AvatarIcon />
                    </div>
                  );
                }
              })
            ) : (
              <div className="text-center py-16 text-slate-500 font-thai">
                <p>ยังไม่มีบทพูดหรือเนื้อเรื่องในฉากนี้</p>
                <Link
                  href={`/projects/${projectId}`}
                  className="mt-3 inline-block text-amber-400 underline text-xs"
                >
                  ไปที่ Studio เพื่อสั่ง AI เขียนฉากนี้
                </Link>
              </div>
            )}

            {/* Floating Quick Step Pill */}
            {parsedBlocks.length > 0 && (
              <div className="sticky bottom-2 ml-auto w-fit flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl z-20">
                <button
                  onClick={() => handleStepDialogue("prev")}
                  disabled={activeDialogueIndex <= 0}
                  className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-all active:scale-95 cursor-pointer"
                  title="ประโยคก่อนหน้า"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                </button>
                <span className="font-mono text-[10px] font-bold text-slate-300 px-1.5">
                  {activeDialogueIndex + 1}/{parsedBlocks.length}
                </span>
                <button
                  onClick={() => handleStepDialogue("next")}
                  disabled={activeDialogueIndex >= parsedBlocks.length - 1}
                  className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-bold transition-all active:scale-95 cursor-pointer"
                  title="ประโยคถัดไป"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Chapter Switcher Controls */}
          <div className="flex-shrink-0 pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-700/50">
            {prevSceneItem ? (
              <button
                onClick={() => handleSelectSceneItem(prevSceneItem.scene)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-thai font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <p className="text-[10px] text-slate-500">ฉากก่อนหน้า</p>
                  <p className="truncate max-w-[140px]">{prevSceneItem.scene.title}</p>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextSceneItem ? (
              <button
                onClick={() => handleSelectSceneItem(nextSceneItem.scene)}
                className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold text-xs font-thai shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all transform active:scale-95 cursor-pointer"
              >
                <div className="text-left">
                  <p className="text-[10px] uppercase font-black text-slate-950/70 tracking-wider">NEXT EP ⏭️</p>
                  <p className="truncate max-w-[170px] text-xs font-black">
                    ฉากที่ {nextSceneItem.scene.order}: {nextSceneItem.scene.title}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCreateNextEpisode}
                  disabled={isCreatingNextEp}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-between gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-thai shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-slate-950/70 tracking-wider">NEXT EP ⏭️</p>
                    <p className="text-xs font-black">
                      {isCreatingNextEp ? "กำลังสร้าง Next EP..." : "✨ สร้าง & อ่านฉากถัดไปทันที (Next EP)"}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>

                <Link
                  href={`/projects/${projectId}`}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-thai transition-colors"
                  title="ไปที่ Studio เพื่อแต่งต่อด้วยตนเอง"
                >
                  <PenTool className="w-4 h-4 text-amber-400" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Audio Player for Custom Scene BGM */}
      <audio
        ref={audioPlayerRef}
        loop
        crossOrigin="anonymous"
        className="hidden"
        onPlay={() => setIsCustomAudioPlaying(true)}
        onPause={() => setIsCustomAudioPlaying(false)}
        onEnded={() => setIsCustomAudioPlaying(false)}
        onError={(e) => {
          console.warn("Reader audio error:", e);
          setIsCustomAudioPlaying(false);
          const ytId = extractYouTubeVideoId(activeScene?.bgmUrl);
          if (!ytId && activeScene?.bgmUrl) {
            toast.error("ไม่สามารถเล่นไฟล์เสียงจากลิงก์นี้ได้ ลิงก์อาจติด CORS หรือไม่ใช่ Direct Audio (.mp3, .wav)");
          }
        }}
      />

      {/* YouTube Background & Picture-in-Picture Player for Reader */}
      {(activeYouTubeVideoId || (activeScene?.bgmUrl && extractYouTubeVideoId(activeScene.bgmUrl))) && (
        <div
          className={
            showMiniVideoPlayer
              ? "fixed bottom-5 right-5 z-50 w-72 sm:w-80 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 transition-all duration-300 animate-in fade-in zoom-in-95"
              : "fixed bottom-1 right-1 w-[2px] h-[2px] opacity-[0.01] pointer-events-none overflow-hidden z-0"
          }
        >
          {showMiniVideoPlayer && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 font-thai">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="truncate font-semibold">{activeYouTubeTitle || activeScene?.bgmTitle || "YouTube Soundtrack"}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMiniVideoPlayer(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="ซ่อนหน้าต่างวิดีโอ (เพลงยังเล่นต่อในพื้นหลัง)"
              >
                ✕
              </button>
            </div>
          )}
          <iframe
            ref={youtubeIframeRef}
            src={`https://www.youtube-nocookie.com/embed/${activeYouTubeVideoId || extractYouTubeVideoId(activeScene?.bgmUrl || "")}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&loop=1&playlist=${activeYouTubeVideoId || extractYouTubeVideoId(activeScene?.bgmUrl || "")}`}
            title="Reader YouTube Audio Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className={showMiniVideoPlayer ? "w-full aspect-video" : "w-[2px] h-[2px] pointer-events-none"}
            onLoad={() => {
              if (isCustomAudioPlaying) {
                youtubeIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "command", func: "unMute", args: [] }),
                  "*"
                );
                youtubeIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({
                    event: "command",
                    func: "setVolume",
                    args: [Math.round((isMuted ? 0 : volume) * 100)],
                  }),
                  "*"
                );
                youtubeIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                  "*"
                );
              }
            }}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          {/\.(mp4|webm|mov|mkv)$/i.test(lightboxImage) ? (
            <video
              src={lightboxImage}
              controls
              autoPlay
              loop
              playsInline
              className="max-w-full max-h-[92vh] object-contain rounded-2xl shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={lightboxImage}
              alt="Fullscreen Preview"
              className="max-w-full max-h-[92vh] object-contain rounded-2xl shadow-2xl"
            />
          )}
        </div>
      )}

      {/* Part / Season (SS) Modal */}
      <PartModal
        isOpen={partModalOpen}
        onClose={() => setPartModalOpen(false)}
        projectId={projectId}
        mode="create"
        nextPartNumber={parts.reduce((max, p) => Math.max(max, p.number || 0), 0) + 1}
        onSuccess={handlePartModalSuccess}
      />

      {/* Scene Audio URL & YouTube Modal for Reader */}
      <SceneAudioModal
        isOpen={showSceneAudioModal}
        onClose={() => setShowSceneAudioModal(false)}
        currentUrl={activeScene?.bgmUrl}
        currentTitle={activeScene?.bgmTitle}
        vaultMusicList={projectSfxList.filter((s) => s.category === "music")}
        onSave={async (url, title) => {
          await handleSetSceneAudioUrl(url, title);
        }}
        onDelete={activeScene?.bgmUrl ? handleDeleteSceneBgm : undefined}
      />
    </div>
  );
}
