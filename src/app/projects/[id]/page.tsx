"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PenTool,
  Sparkles,
  RefreshCw,
  Edit3,
  BookOpen,
  Film,
  Image as ImageIcon,
  Plus,
  Trash2,
  Check,
  X,
  History,
  Shield,
  Upload,
  Link2,
  Layers,
  MapPin,
  Clock,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Music,
  Volume2,
  Play,
  Pause,
  ZoomIn,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  User,
  Users,
  Crop,
  Crown,
  Scissors,
  Video,
  VolumeX,
  Volume1,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { ambientSound } from "@/lib/audio/ambientSynth";
import { extractYouTubeVideoId } from "@/lib/audio/audioHelpers";
import { SceneAudioModal } from "@/components/audio/SceneAudioModal";
import { ImageCropModal, AspectRatioType } from "@/components/images/ImageCropModal";
import { VideoTrimModal } from "@/components/media/VideoTrimModal";
import { CollaboratorModal } from "@/components/collaboration/CollaboratorModal";
import { ClaudeScriptImportModal } from "@/components/story/ClaudeScriptImportModal";
import {
  parseSceneToDialogueBlocks,
  parseClaudeScript,
  splitMultiSceneScript,
  blocksToMarkdown,
  resolveImageForDialogueIndex,
  resolveAudioForDialogueIndex,
  getAudioMoodLabel,
  AUDIO_MOOD_OPTIONS,
  autoDistributeDialogueImages,
  DialogueBlock,
  CharacterMeta,
  SceneImageMeta,
} from "@/lib/story/dialogueParser";

interface CharacterSummary {
  id: string;
  name: string;
  characterType?: "self" | "friend" | "canon";
  realNickname?: string;
  chosenRole?: string;
  currentMbti?: string;
  avatarUrl?: string;
}

interface SceneImage {
  id: string;
  prompt: string;
  filePath: string;
  kind: "portrait" | "scene" | "cover" | "movie_still" | "reference";
  approved: number;
  caption?: string;
  metadata?: string;
  createdAt: string;
}

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
  directorNote: string;
  dialogueBindings?: string | null;
  createdAt: string;
  updatedAt: string;
  charactersPresentParsed?: string[];
  images?: SceneImage[];
  bgmUrl?: string | null;
  bgmTitle?: string | null;
  lastEditedBy?: string | null;
}

interface PartItem {
  id: string;
  number: number;
  title: string;
  scope: string;
  theme: string;
  peakSummary: string;
  status: "planned" | "drafting" | "done";
  scenes: SceneItem[];
}

type AudioTrack = "none" | "custom" | "wildfire" | "winter" | "war" | "shadows";

export default function StoryWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  // Project & Parts State
  const [project, setProject] = useState<any>(null);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [activePartId, setActivePartId] = useState<string>("");
  const [activeSceneId, setActiveSceneId] = useState<string>("");
  const [activeScene, setActiveScene] = useState<SceneItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable Dialogue Beats State
  const [dialogueBlocks, setDialogueBlocks] = useState<DialogueBlock[]>([]);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const dialogueRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smoothly scroll active dialogue block into view when stepping through dialogue
  useEffect(() => {
    if (activeBlockIndex >= 0 && dialogueRowRefs.current[activeBlockIndex]) {
      dialogueRowRefs.current[activeBlockIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeBlockIndex]);
  const [localDialogueBindings, setLocalDialogueBindings] = useState<Record<string, string>>({});
  const [activeMediaPicker, setActiveMediaPicker] = useState<{ blockIdx: number; type: "image" | "audio" } | null>(null);
  const [directorsNote, setDirectorsNote] = useState("");
  const [sceneTitleInput, setSceneTitleInput] = useState("");
  const [sceneLocationInput, setSceneLocationInput] = useState("");
  const [sceneCaptionInput, setSceneCaptionInput] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isRawMarkdownMode, setIsRawMarkdownMode] = useState(false);
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingScene, setIsSavingScene] = useState(false);

  // Images State
  const [sceneImages, setSceneImages] = useState<SceneImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showAiImageModal, setShowAiImageModal] = useState(false);
  const [aiImagePromptInput, setAiImagePromptInput] = useState("");
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [cropModalData, setCropModalData] = useState<{
    isOpen: boolean;
    imageSrc: string;
    imageId?: string;
    defaultAspect?: AspectRatioType;
  } | null>(null);
  const [videoTrimData, setVideoTrimData] = useState<{
    isOpen: boolean;
    videoSrc: string;
    videoId?: string;
    startTime?: number;
    endTime?: number | null;
    caption?: string;
  } | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);

  // Audio / Music State
  const studioAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack>("none");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.6);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showMiniVideoPlayer, setShowMiniVideoPlayer] = useState(false);

  // Streaming State (Anthropic Claude)
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // Modals
  const [showNewSceneModal, setShowNewSceneModal] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [newSceneLocation, setNewSceneLocation] = useState("");
  const [newSceneSelectedChars, setNewSceneSelectedChars] = useState<string[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [sceneVersions, setSceneVersions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isApplyingLedger, setIsApplyingLedger] = useState(false);

  // Collaborators & Author Persona State
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showClaudeImportModal, setShowClaudeImportModal] = useState(false);
  const [currentAuthorName, setCurrentAuthorName] = useState("");

  // File Inputs
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const blockImageUploadRef = useRef<HTMLInputElement | null>(null);
  const targetUploadBlockIdxRef = useRef<number | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Load Project Data
  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projRes, collabRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/collaborators`),
      ]);

      if (!projRes.ok) throw new Error("โหลดข้อมูลโปรเจกต์ไม่สำเร็จ");
      const data = await projRes.json();

      setProject(data.project);
      setParts(data.parts || []);
      setCharacters(data.characters || []);

      if (collabRes.ok) {
        const cData = await collabRes.json();
        setCollaborators(cData.collaborators || []);
      }

      // Initialize author persona
      const savedAuthor = typeof window !== "undefined" ? localStorage.getItem(`author_persona_${projectId}`) : null;
      const selfChar = (data.characters || []).find((c: any) => c.characterType === "self");
      if (savedAuthor) {
        setCurrentAuthorName(savedAuthor);
      } else if (selfChar) {
        setCurrentAuthorName(selfChar.realNickname || selfChar.name);
      } else {
        setCurrentAuthorName("ฉัน (ผู้แต่ง)");
      }

      if (data.parts && data.parts.length > 0) {
        const firstPart = data.parts[0];
        setActivePartId(firstPart.id);
        if (firstPart.scenes && firstPart.scenes.length > 0) {
          const firstScene = firstPart.scenes[0];
          setActiveSceneId(firstScene.id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการโหลดโปรเจกต์");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // 2. Load Active Scene Details
  const loadSceneDetails = async (sceneId: string, preserveAudioPlayback: boolean = false) => {
    if (!sceneId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`);
      if (!res.ok) throw new Error("โหลดรายละเอียดฉากไม่สำเร็จ");
      const data = await res.json();

      let sceneData = data.scene;
      if (!sceneData?.bgmUrl) {
        try {
          const cached = localStorage.getItem(`saga_bgm_${sceneId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.bgmUrl) {
              sceneData = { ...sceneData, bgmUrl: parsed.bgmUrl, bgmTitle: parsed.bgmTitle };
              fetch(`/api/projects/${projectId}/scenes/${sceneId}/audio`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
              }).catch(() => {});
            }
          }
        } catch {}
      }

      setActiveScene(sceneData);
      if (sceneData?.bgmUrl) {
        setCurrentAudioTrack("custom");
      } else if (currentAudioTrack === "custom") {
        setCurrentAudioTrack("none");
      }
      setSceneImages(data.images || []);
      setSelectedImageIndex(0);
      setActiveBlockIndex(0);
      setDirectorsNote(data.scene.directorNote || "");
      setSceneTitleInput(data.scene.title || "");
      setSceneLocationInput(data.scene.location || "");
      setEditableMarkdown(data.scene.contentMarkdown || "");
      setSceneVersions(data.versions || []);
      setHasUnsavedChanges(false);

      // Parse Dialogue Blocks
      const parsed = parseSceneToDialogueBlocks(data.scene.contentMarkdown || "", characters);
      setDialogueBlocks(parsed);

      // Parse Dialogue-to-Image Bindings
      if (data.scene.dialogueBindings) {
        try {
          const parsedBindings =
            typeof data.scene.dialogueBindings === "string"
              ? JSON.parse(data.scene.dialogueBindings)
              : data.scene.dialogueBindings;
          setLocalDialogueBindings(parsedBindings || {});
        } catch {
          setLocalDialogueBindings({});
        }
      } else {
        setLocalDialogueBindings({});
      }

      // Configure BGM playback state only when switching scenes or when not explicitly preserved
      if (!preserveAudioPlayback) {
        setIsAudioPlaying(false);
        ambientSound.stop();
        if (studioAudioPlayerRef.current) {
          studioAudioPlayerRef.current.pause();
        }
        if (youtubeIframeRef.current) {
          youtubeIframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*"
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeSceneId) {
      loadSceneDetails(activeSceneId);
    }
  }, [activeSceneId]);

  // Auto-sync on window focus if there are no unsaved changes (preserve ongoing music playback)
  useEffect(() => {
    const handleFocus = () => {
      if (activeSceneId && !hasUnsavedChanges) {
        loadSceneDetails(activeSceneId, true);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeSceneId, hasUnsavedChanges]);

  // Safeguard: warn user before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "คุณมีการแก้ไขที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Switch Active Part
  const handleSelectPart = (partId: string) => {
    if (hasUnsavedChanges && activeSceneId) {
      handleSaveAll(true);
    }
    setActivePartId(partId);
    const p = parts.find((item) => item.id === partId);
    if (p && p.scenes && p.scenes.length > 0) {
      setActiveSceneId(p.scenes[0].id);
    } else {
      setActiveSceneId("");
      setActiveScene(null);
      setSceneImages([]);
      setDialogueBlocks([]);
    }
  };

  // Switch Active Scene
  const handleSelectScene = (sceneId: string) => {
    if (hasUnsavedChanges && activeSceneId) {
      handleSaveAll(true);
    }
    setActiveSceneId(sceneId);
    setIsRawMarkdownMode(false);
    setStreamingText("");
  };

  // 3. Audio Controller
  const handleSelectAudioTrack = (track: AudioTrack) => {
    setCurrentAudioTrack(track);

    if (studioAudioPlayerRef.current) {
      studioAudioPlayerRef.current.pause();
    }
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
    }
    ambientSound.stop();
    setIsAudioPlaying(false);

    if (track === "none") {
      toast.info("ปิดเพลงประกอบประจำฉาก");
      return;
    }

    if (track === "custom") {
      if (activeScene?.bgmUrl) {
        const ytId = extractYouTubeVideoId(activeScene.bgmUrl);
        if (ytId) {
          setIsAudioPlaying(true);
          setTimeout(() => {
            youtubeIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
            youtubeIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({
                event: "command",
                func: "setVolume",
                args: [Math.round((isAudioMuted ? 0 : audioVolume) * 100)],
              }),
              "*"
            );
          }, 350);
          toast.success(`เล่นเพลง (YouTube): ${activeScene.bgmTitle || "เพลงประจำฉาก"}`);
        } else if (studioAudioPlayerRef.current) {
          studioAudioPlayerRef.current.src = activeScene.bgmUrl;
          studioAudioPlayerRef.current.volume = isAudioMuted ? 0 : audioVolume;
          studioAudioPlayerRef.current
            .play()
            .then(() => setIsAudioPlaying(true))
            .catch((e) => {
              console.warn(e);
              setIsAudioPlaying(false);
              toast.error("ไม่สามารถเล่นไฟล์เสียงจากลิงก์นี้ได้ ลิงก์อาจติด CORS หรือไม่ใช่ไฟล์เสียงตรง (.mp3)");
            });
          toast.success(`เล่นเพลง: ${activeScene.bgmTitle || "เพลงประจำฉาก"}`);
        }
      } else {
        toast.error("ฉากนี้ยังไม่ได้อัปโหลดหรือใส่ลิงก์เพลง");
      }
      return;
    }

    // Ambient Synth Tracks
    ambientSound.setVolume(isAudioMuted ? 0 : audioVolume);
    ambientSound.play(track);
    setIsAudioPlaying(true);
    const trackNames: Record<string, string> = {
      wildfire: "เพลิงป่า (Wildfire Drone)",
      winter: "ลมเหมันต์ (Winter Winds)",
      war: "มหากาพย์ศึก (War Drums)",
      shadows: "เงาทมิฬ (Shadows Ethereal)",
    };
    toast.success(`เล่นเสียงสังเคราะห์: ${trackNames[track]}`);
  };

  const handleToggleAudioPlay = () => {
    if (isAudioPlaying) {
      if (studioAudioPlayerRef.current) studioAudioPlayerRef.current.pause();
      if (youtubeIframeRef.current) {
        youtubeIframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      }
      ambientSound.stop();
      setIsAudioPlaying(false);
      toast.info("หยุดเพลง");
    } else {
      if (currentAudioTrack === "custom" && activeScene?.bgmUrl) {
        const ytId = extractYouTubeVideoId(activeScene.bgmUrl);
        if (ytId) {
          setIsAudioPlaying(true);
          youtubeIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
          youtubeIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "setVolume",
              args: [Math.round((isAudioMuted ? 0 : audioVolume) * 100)],
            }),
            "*"
          );
          toast.success(`เล่นเพลง: ${activeScene.bgmTitle || "เพลงประจำฉาก"}`);
        } else if (studioAudioPlayerRef.current) {
          studioAudioPlayerRef.current.volume = isAudioMuted ? 0 : audioVolume;
          studioAudioPlayerRef.current
            .play()
            .then(() => setIsAudioPlaying(true))
            .catch((e) => {
              console.warn(e);
              setIsAudioPlaying(false);
              toast.error("ไม่สามารถเล่นไฟล์เสียงได้ กรุณาตรวจสอบลิงก์หรืออัปโหลดไฟล์เพลง");
            });
        }
      } else if (currentAudioTrack !== "none" && currentAudioTrack !== "custom") {
        ambientSound.setVolume(isAudioMuted ? 0 : audioVolume);
        ambientSound.play(currentAudioTrack);
        setIsAudioPlaying(true);
      } else if (activeScene?.bgmUrl) {
        handleSelectAudioTrack("custom");
      } else {
        handleSelectAudioTrack("wildfire");
      }
    }
  };

  const handleVolumeChange = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setAudioVolume(clamped);
    if (isAudioMuted && clamped > 0) {
      setIsAudioMuted(false);
    }
    ambientSound.setVolume(clamped);
    if (studioAudioPlayerRef.current) {
      studioAudioPlayerRef.current.volume = clamped;
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

  const handleToggleMute = () => {
    const nextMute = !isAudioMuted;
    setIsAudioMuted(nextMute);
    const targetVol = nextMute ? 0 : audioVolume;
    ambientSound.setVolume(targetVol);
    if (studioAudioPlayerRef.current) {
      studioAudioPlayerRef.current.volume = targetVol;
    }
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: nextMute ? "mute" : "unMute",
          args: [],
        }),
        "*"
      );
      if (!nextMute) {
        youtubeIframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "setVolume",
            args: [Math.round(audioVolume * 100)],
          }),
          "*"
        );
      }
    }
    toast.info(nextMute ? "ปิดเสียงชั่วคราว (Muted)" : `เปิดเสียง: ${Math.round(audioVolume * 100)}%`);
  };

  // Set Audio via Direct URL (MP3 / Audio stream / YouTube)
  const handleSetAudioUrl = async (url: string, title?: string) => {
    if (!activeSceneId || !url.trim()) return;

    try {
      setIsUploadingAudio(true);
      const isYt = Boolean(extractYouTubeVideoId(url.trim()));
      const fallbackTitle = isYt ? "เพลงประกอบ (YouTube)" : "เพลงประกอบจากลิงก์";

      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bgmUrl: url.trim(),
          bgmTitle: title?.trim() || fallbackTitle,
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {}

      if (!res.ok) throw new Error(data?.error || `บันทึกเพลงไม่สำเร็จ (HTTP ${res.status})`);

      const updated = { ...activeScene!, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle };
      try {
        localStorage.setItem(
          `saga_bgm_${activeSceneId}`,
          JSON.stringify({ bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle })
        );
      } catch {}
      setActiveScene(updated);
      setParts((prevParts) =>
        prevParts.map((part) => ({
          ...part,
          scenes: part.scenes.map((s) => (s.id === activeSceneId ? updated : s)),
        }))
      );

      setCurrentAudioTrack("custom");
      ambientSound.stop();

      const ytId = extractYouTubeVideoId(data.bgmUrl);
      if (ytId) {
        if (studioAudioPlayerRef.current) studioAudioPlayerRef.current.pause();
        setIsAudioPlaying(true);
        setTimeout(() => {
          youtubeIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
          youtubeIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "setVolume",
              args: [Math.round((isAudioMuted ? 0 : audioVolume) * 100)],
            }),
            "*"
          );
        }, 500);
      } else if (studioAudioPlayerRef.current) {
        studioAudioPlayerRef.current.src = data.bgmUrl;
        studioAudioPlayerRef.current.volume = isAudioMuted ? 0 : audioVolume;
        studioAudioPlayerRef.current
          .play()
          .then(() => setIsAudioPlaying(true))
          .catch((e) => {
            console.warn(e);
            toast.error("ไม่สามารถเล่นไฟล์เสียงจากลิงก์นี้ได้ ลิงก์อาจติด CORS หรือไม่ใช่ไฟล์เสียงตรง (.mp3)");
          });
      }

      toast.success(`ตั้งค่าเพลง "${data.bgmTitle}" สำเร็จและเริ่มเล่นทันที!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกเพลง");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Upload Scene Audio (MP3/WAV)
  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSceneId) return;

    const fileSizeMB = file.size / (1024 * 1024);
    const isVercelHost = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");

    // Vercel Serverless Function has hard payload limit of 4.5MB
    if (isVercelHost && fileSizeMB > 4.5) {
      toast.error(
        `ไฟล์นี้มีขนาด ${fileSizeMB.toFixed(1)} MB (Vercel จำกัดขนาดอัปโหลดไว้ไม่เกิน 4.5 MB) — กรุณาใช้งานผ่าน Cloudflare Tunnel หรือใส่ลิงก์เพลงแทน`,
        { duration: 8000 }
      );
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
      return;
    }

    try {
      setIsUploadingAudio(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}/audio`, {
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
          throw new Error(
            `ไฟล์มีขนาดใหญ่เกินกว่าที่ Vercel รองรับ (${fileSizeMB.toFixed(1)} MB > 4.5 MB) — แนะนำให้ใช้งานผ่าน Cloudflare Tunnel หรือใส่ลิงก์เพลงแทน`
          );
        }
        throw new Error(data?.error || `อัปโหลดเพลงไม่สำเร็จ (HTTP ${res.status})`);
      }

      const updated = { ...activeScene!, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle };
      try {
        localStorage.setItem(
          `saga_bgm_${activeSceneId}`,
          JSON.stringify({ bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle })
        );
      } catch {}
      setActiveScene(updated);
      setParts((prevParts) =>
        prevParts.map((part) => ({
          ...part,
          scenes: part.scenes.map((s) => (s.id === activeSceneId ? updated : s)),
        }))
      );

      setCurrentAudioTrack("custom");
      if (studioAudioPlayerRef.current) {
        studioAudioPlayerRef.current.src = data.bgmUrl;
        studioAudioPlayerRef.current.volume = audioVolume;
        studioAudioPlayerRef.current.play().catch((e) => console.warn(e));
        setIsAudioPlaying(true);
      }
      ambientSound.stop();

      toast.success(`อัปโหลดเพลง "${data.bgmTitle}" สำเร็จและเริ่มเล่นทันที!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปโหลดเพลง");
    } finally {
      setIsUploadingAudio(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  };

  // Delete Scene Audio
  const handleDeleteAudio = async () => {
    if (!activeSceneId) return;
    if (!confirm("คุณต้องการลบเพลงประกอบประจำฉากนี้ใช่หรือไม่?")) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}/audio`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบเพลงไม่สำเร็จ");

      try {
        localStorage.removeItem(`saga_bgm_${activeSceneId}`);
      } catch {}

      if (studioAudioPlayerRef.current) studioAudioPlayerRef.current.pause();
      if (youtubeIframeRef.current) {
        youtubeIframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      }
      ambientSound.stop();
      setIsAudioPlaying(false);
      setCurrentAudioTrack("none");

      const updated = { ...activeScene!, bgmUrl: null, bgmTitle: null };
      setActiveScene(updated);
      setParts((prevParts) =>
        prevParts.map((part) => ({
          ...part,
          scenes: part.scenes.map((s) => (s.id === activeSceneId ? updated : s)),
        }))
      );

      toast.success("ลบเพลงประกอบประจำฉากเรียบร้อย");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ลบเพลงไม่สำเร็จ");
    }
  };

  // 4. Image Upload & Management
  const handleUploadSceneImage = async (file: File, bindToBlockIdx?: number) => {
    if (!activeSceneId) return;

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sceneId", activeSceneId);
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
        if (res.status === 413 || resText.includes("PAYLOAD_TOO_LARGE") || resText.includes("Request Entity Too Large")) {
          throw new Error(
            `ไฟล์มีขนาดใหญ่เกินกว่าที่ Vercel รองรับ (${(file.size / (1024 * 1024)).toFixed(1)} MB > 4.5 MB) — กรุณาใช้งานผ่าน Cloudflare Tunnel ซึ่งรองรับไฟล์ใหญ่ได้ถึง 100 MB`
          );
        }
        throw new Error(data?.error || "อัปโหลดภาพไม่สำเร็จ");
      }

      const newImg = data.image;
      const updatedImages = [newImg, ...sceneImages];
      setSceneImages(updatedImages);
      setSelectedImageIndex(0);

      // If user uploaded directly from a dialogue line, bind it immediately!
      if (bindToBlockIdx !== undefined && bindToBlockIdx >= 0) {
        const nextBindings = { ...localDialogueBindings, [String(bindToBlockIdx)]: newImg.id };
        setLocalDialogueBindings(nextBindings);
        setHasUnsavedChanges(true);
        toast.success(`อัปโหลดและผูกกับประโยค #${bindToBlockIdx + 1} สำเร็จ!`);
      } else {
        toast.success(`อัปโหลด "${newImg.caption || file.name}" สำเร็จ!`);
      }

      // If uploaded a video file, open the VideoTrimModal automatically!
      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
      if (isVideo) {
        toast.info("คุณสามารถเลือกช่วงเวลาของวิดีโอนี้ได้ทันที");
        setVideoTrimData({
          isOpen: true,
          videoSrc: newImg.filePath,
          videoId: newImg.id,
          startTime: 0,
          endTime: null,
          caption: newImg.caption || file.name,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setIsUploadingImage(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
      if (blockImageUploadRef.current) blockImageUploadRef.current.value = "";
      targetUploadBlockIdxRef.current = null;
    }
  };

  // Helper to check if a media item is a video
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

  // Helper to extract video range timings
  const getVideoTiming = (img?: { metadata?: string | null } | null) => {
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

  // Video trim success handler
  const handleTrimSuccess = (updatedMedia: any) => {
    setSceneImages((prev) => {
      const idx = prev.findIndex((img) => img.id === updatedMedia.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedMedia };
        return next;
      }
      return [updatedMedia, ...prev];
    });
  };

  // Crop success handler
  const handleCropSuccess = (savedImage: any, isCover?: boolean) => {
    setSceneImages((prev) => {
      const exists = prev.findIndex((img) => img.id === savedImage.id);
      if (exists !== -1) {
        const next = [...prev];
        next[exists] = savedImage;
        return next;
      }
      return [savedImage, ...prev];
    });
    setSelectedImageIndex(0);
    if (isCover) {
      setProject((prev: any) => (prev ? { ...prev, coverImage: savedImage.filePath } : prev));
    }
  };
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("คุณต้องการลบภาพนี้ออกจากคลังฉากนี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบภาพไม่สำเร็จ");

      const filtered = sceneImages.filter((img) => img.id !== imageId);
      setSceneImages(filtered);
      setSelectedImageIndex(0);

      // Remove bindings referencing this image
      const updatedBindings = { ...localDialogueBindings };
      Object.keys(updatedBindings).forEach((key) => {
        if (updatedBindings[key] === imageId) delete updatedBindings[key];
      });
      setLocalDialogueBindings(updatedBindings);
      setHasUnsavedChanges(true);

      toast.success("ลบภาพเรียบร้อยแล้ว");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ลบภาพไม่สำเร็จ");
    }
  };

  // Set image as novel cover
  const handleSetAsCover = async (image: SceneImage | SceneImageMeta | string) => {
    const imagePath = typeof image === "string" ? image : image.filePath;
    const imageId = typeof image === "string" ? undefined : image.id;
    try {
      const res = await fetch(`/api/projects/${projectId}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath, imageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ตั้งภาพหน้าปกไม่สำเร็จ");
      setProject((prev: any) => (prev ? { ...prev, coverImage: imagePath } : prev));
      toast.success("👑 ตั้งภาพนี้เป็นหน้าปกนิยายเรียบร้อยแล้ว!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการตั้งหน้าปก");
    }
  };

  // AI Image Generator
  const handleGenerateAiImage = async () => {
    if (!aiImagePromptInput.trim()) {
      toast.error("กรุณาระบุ Prompt คำอธิบายภาพ");
      return;
    }

    try {
      setIsGeneratingAiImage(true);
      const res = await fetch(`/api/projects/${projectId}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: activeSceneId,
          prompt: aiImagePromptInput,
          kind: "scene",
          size: "1024x1024",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างภาพ AI ไม่สำเร็จ");

      toast.success("สร้างภาพ AI สำเร็จและเพิ่มเข้าคลังภาพของฉากนี้แล้ว!");
      setShowAiImageModal(false);
      setAiImagePromptInput("");
      if (activeSceneId) loadSceneDetails(activeSceneId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการสร้างภาพ");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // 5. Dialogue Blocks Manipulation (Interactive Visual Novel Editor)
  const handleUpdateBlockText = (index: number, newText: string) => {
    setDialogueBlocks((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], text: newText };
      }
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateBlockSpeaker = (index: number, targetKey: string) => {
    setDialogueBlocks((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;

      if (targetKey === "narrator") {
        next[index] = {
          ...cur,
          type: "narration",
          isNarrator: true,
          side: "left",
          speaker: characters.find((c) => c.characterType === "self") || null,
          speakerName: characters.find((c) => c.characterType === "self")?.realNickname || "ผู้บรรยาย",
        };
      } else if (targetKey === "sound") {
        next[index] = {
          ...cur,
          type: "sound",
          isNarrator: false,
          side: "left",
          speaker: null,
          speakerName: "เสียงประกอบ",
        };
      } else {
        const char = characters.find(
          (c) =>
            c.id === targetKey ||
            c.name.toLowerCase() === targetKey.toLowerCase() ||
            (c.realNickname && c.realNickname.toLowerCase() === targetKey.toLowerCase())
        );
        const isSelf = char?.characterType === "self" || /^(ฉัน|ผม|ข้า|เรา)$/i.test(targetKey);
        const side = isSelf ? "left" : "right";
        next[index] = {
          ...cur,
          type: "dialogue",
          isNarrator: false,
          side,
          speaker: char || {
            id: `temp-${encodeURIComponent(targetKey)}`,
            name: targetKey,
            realNickname: targetKey,
            characterType: isSelf ? "self" : "friend",
          },
          speakerName: char?.realNickname || char?.name || targetKey || "ตัวละคร",
        };
      }
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleToggleBlockSide = (index: number) => {
    setDialogueBlocks((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          side: next[index].side === "left" ? "right" : "left",
        };
      }
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleAssignBlockImage = (index: number, imageId: string) => {
    const updated = { ...localDialogueBindings };
    if (!imageId) {
      delete updated[String(index)];
    } else {
      updated[String(index)] = imageId;
      // Immediately preview this image on the left card!
      const imgIdx = sceneImages.findIndex((img) => img.id === imageId);
      if (imgIdx !== -1) setSelectedImageIndex(imgIdx);
    }
    setLocalDialogueBindings(updated);
    setHasUnsavedChanges(true);

    toast.success(imageId ? `ผูกภาพกับประโยค #${index + 1} เรียบร้อย` : `ยกเลิกการผูกภาพประโยค #${index + 1}`);
  };

  // Assign audio / mood change to a specific dialogue beat
  const handleAssignBlockAudio = (index: number, audioValue: string) => {
    const updated = { ...localDialogueBindings };
    const audioKey = `audio_${index}`;

    if (!audioValue) {
      delete updated[audioKey];
      toast.info(`ยกเลิกอารมณ์เพลงประโยค #${index + 1}`);
    } else {
      updated[audioKey] = audioValue;
      handlePreviewAudioBinding(audioValue);
      const label = getAudioMoodLabel(audioValue);
      toast.success(`ผูกอารมณ์ "${label}" กับประโยค #${index + 1} เรียบร้อย!`);
    }

    setLocalDialogueBindings(updated);
    setHasUnsavedChanges(true);
  };

  // Preview an audio binding immediately in Studio
  const handlePreviewAudioBinding = (audioValue: string) => {
    if (!audioValue || audioValue === "stop") {
      ambientSound.stop();
      if (studioAudioPlayerRef.current) studioAudioPlayerRef.current.pause();
      if (youtubeIframeRef.current) {
        youtubeIframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      }
      setIsAudioPlaying(false);
      return;
    }

    if (audioValue === "scene_bgm") {
      if (activeScene?.bgmUrl) {
        ambientSound.stop();
        const ytId = extractYouTubeVideoId(activeScene.bgmUrl);
        if (ytId) {
          if (studioAudioPlayerRef.current) studioAudioPlayerRef.current.pause();
          setIsAudioPlaying(true);
          youtubeIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
          youtubeIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "setVolume",
              args: [Math.round((isAudioMuted ? 0 : audioVolume) * 100)],
            }),
            "*"
          );
        } else if (studioAudioPlayerRef.current) {
          studioAudioPlayerRef.current.src = activeScene.bgmUrl;
          studioAudioPlayerRef.current.volume = isAudioMuted ? 0 : audioVolume;
          studioAudioPlayerRef.current.play().catch(() => {});
          setIsAudioPlaying(true);
        }
      }
      return;
    }

    if (audioValue.startsWith("url:")) {
      const urlStr = audioValue.replace(/^url:/, "");
      ambientSound.stop();
      const ytId = extractYouTubeVideoId(urlStr);
      if (ytId) {
        if (studioAudioPlayerRef.current) studioAudioPlayerRef.current.pause();
        setIsAudioPlaying(true);
        youtubeIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      } else if (studioAudioPlayerRef.current) {
        studioAudioPlayerRef.current.src = urlStr;
        studioAudioPlayerRef.current.volume = isAudioMuted ? 0 : audioVolume;
        studioAudioPlayerRef.current.play().catch(() => {});
        setIsAudioPlaying(true);
      }
      return;
    }

    // Ambient Synth Theme
    if (studioAudioPlayerRef.current) studioAudioPlayerRef.current.pause();
    if (youtubeIframeRef.current) {
      youtubeIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
    }
    ambientSound.setVolume(isAudioMuted ? 0 : audioVolume);
    ambientSound.play(audioValue as any);
    setIsAudioPlaying(true);
  };

  const handleAddBlock = (
    type: "self" | "friend" | "narration" | "sound",
    insertAtIdx?: number
  ) => {
    const selfChar = characters.find((c) => c.characterType === "self") || null;
    const friendChar = characters.find((c) => c.characterType === "friend") || null;

    let newBlock: DialogueBlock;
    const newId = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (type === "self") {
      newBlock = {
        id: newId,
        type: "dialogue",
        isNarrator: false,
        side: "left",
        speaker: selfChar,
        speakerName: selfChar?.realNickname || selfChar?.name || "ฉัน",
        text: "บทพูดใหม่ของฉัน...",
        originalIndex: 0,
      };
    } else if (type === "friend") {
      newBlock = {
        id: newId,
        type: "dialogue",
        isNarrator: false,
        side: "right",
        speaker: friendChar,
        speakerName: friendChar?.realNickname || friendChar?.name || "เพื่อน",
        text: "บทพูดใหม่ของเพื่อน...",
        originalIndex: 0,
      };
    } else if (type === "sound") {
      newBlock = {
        id: newId,
        type: "sound",
        side: "left",
        speaker: null,
        speakerName: "เสียงประกอบ",
        text: "เสียงลมพัดผ่านแผ่วเบา..........",
        originalIndex: 0,
      };
    } else {
      newBlock = {
        id: newId,
        type: "narration",
        isNarrator: true,
        side: "left",
        speaker: selfChar,
        speakerName: selfChar?.realNickname || "ผู้บรรยาย",
        text: "คำบรรยายฉากและบรรยากาศ...",
        originalIndex: 0,
      };
    }

    setDialogueBlocks((prev) => {
      const next = [...prev];
      if (insertAtIdx !== undefined && insertAtIdx >= 0) {
        next.splice(insertAtIdx + 1, 0, newBlock);
      } else {
        next.push(newBlock);
      }
      return next;
    });

    setHasUnsavedChanges(true);
    toast.success("เพิ่มประโยคใหม่เรียบร้อย");
  };

  const handleDeleteBlock = (index: number) => {
    if (!confirm(`คุณต้องการลบประโยคที่ #${index + 1} ใช่หรือไม่?`)) return;

    setDialogueBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });

    // Re-index bindings (handles both image bindings "0", "1" and audio bindings "audio_0", "audio_1")
    const updatedBindings: Record<string, string> = {};
    Object.keys(localDialogueBindings).forEach((key) => {
      if (key.startsWith("audio_")) {
        const numKey = parseInt(key.replace("audio_", ""), 10);
        if (numKey < index) {
          updatedBindings[key] = localDialogueBindings[key];
        } else if (numKey > index) {
          updatedBindings[`audio_${numKey - 1}`] = localDialogueBindings[key];
        }
      } else {
        const numKey = parseInt(key, 10);
        if (numKey < index) {
          updatedBindings[key] = localDialogueBindings[key];
        } else if (numKey > index) {
          updatedBindings[String(numKey - 1)] = localDialogueBindings[key];
        }
      }
    });
    setLocalDialogueBindings(updatedBindings);
    setHasUnsavedChanges(true);
    toast.info("ลบประโยคเรียบร้อย");
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= dialogueBlocks.length) return;

    setDialogueBlocks((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });

    // Swap bindings for both image and audio
    const updatedBindings = { ...localDialogueBindings };
    const curVal = updatedBindings[String(index)];
    const targetVal = updatedBindings[String(targetIdx)];
    if (curVal) updatedBindings[String(targetIdx)] = curVal;
    else delete updatedBindings[String(targetIdx)];
    if (targetVal) updatedBindings[String(index)] = targetVal;
    else delete updatedBindings[String(index)];

    const curAudio = updatedBindings[`audio_${index}`];
    const targetAudio = updatedBindings[`audio_${targetIdx}`];
    if (curAudio) updatedBindings[`audio_${targetIdx}`] = curAudio;
    else delete updatedBindings[`audio_${targetIdx}`];
    if (targetAudio) updatedBindings[`audio_${index}`] = targetAudio;
    else delete updatedBindings[`audio_${index}`];

    setLocalDialogueBindings(updatedBindings);

    setHasUnsavedChanges(true);
  };

  // Auto-distribute images across dialogue beats
  const handleAutoDistributeImages = () => {
    if (sceneImages.length === 0) {
      toast.error("ไม่มีภาพประกอบในฉากนี้สำหรับจับคู่อัตโนมัติ");
      return;
    }
    if (dialogueBlocks.length === 0) {
      toast.error("ไม่มีบทพูดในฉากนี้");
      return;
    }

    const distributed = autoDistributeDialogueImages(dialogueBlocks.length, sceneImages);
    setLocalDialogueBindings(distributed);
    setHasUnsavedChanges(true);
    toast.success(`จับคู่อัตโนมัติ ${Object.keys(distributed).length} ภาพ กระจายตามบทพูดเรียบร้อย!`);
  };

  // Auto-register new characters discovered from Claude script into the project DB
  const autoRegisterNewCharacters = async (detectedNames: string[]) => {
    let currentChars = [...characters];
    const missingNames = detectedNames.filter(
      (name) =>
        !currentChars.some(
          (c) =>
            c.name.toLowerCase() === name.toLowerCase() ||
            (c.realNickname && c.realNickname.toLowerCase() === name.toLowerCase())
        )
    );

    if (missingNames.length === 0) return currentChars;

    try {
      const createdList = await Promise.all(
        missingNames.map(async (charName) => {
          try {
            const res = await fetch(`/api/projects/${projectId}/characters`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: charName,
                realNickname: charName,
                characterType: "friend",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              return data.character;
            }
          } catch (err) {
            console.error("Failed to auto-create character:", charName, err);
          }
          return {
            id: `temp-${encodeURIComponent(charName)}`,
            name: charName,
            realNickname: charName,
            characterType: "friend",
          };
        })
      );

      const validNew = createdList.filter(Boolean);
      if (validNew.length > 0) {
        currentChars = [...currentChars, ...validNew];
        setCharacters(currentChars);
        toast.info(`เพิ่มตัวละครใหม่เข้าโปรเจกต์: ${validNew.map((c: any) => c.name).join(", ")}`);
      }
    } catch (err) {
      console.error("Error auto registering characters", err);
    }

    return currentChars;
  };

  // Convert raw Claude script and apply into current scene
  const handleConvertAndApplyScript = async (
    scriptText: string,
    options: { notify?: boolean } = { notify: true }
  ) => {
    if (!scriptText.trim()) {
      toast.error("ไม่มีข้อความบทสคริปต์สำหรับแปลง");
      return;
    }

    // 1. Initial parse
    const initialParsed = parseClaudeScript(scriptText, characters);

    // 2. Auto-register any new characters found
    const updatedChars = await autoRegisterNewCharacters(initialParsed.detectedCharacters);

    // 3. Re-parse with updated characters to bind character objects and sides
    const finalParsed = parseClaudeScript(scriptText, updatedChars);

    // 4. Update scene title if found and appropriate
    if (finalParsed.sceneTitle) {
      setSceneTitleInput(finalParsed.sceneTitle);
    }

    // 5. Update scene location if found
    if (finalParsed.location) {
      setSceneLocationInput(finalParsed.location);
    }

    // 6. Update dialogue blocks and raw markdown
    setDialogueBlocks(finalParsed.blocks);
    setEditableMarkdown(finalParsed.rawCleanMarkdown || scriptText);
    setIsRawMarkdownMode(false);
    setHasUnsavedChanges(true);

    if (options.notify) {
      const charSummary =
        finalParsed.detectedCharacters.length > 0
          ? ` (พบตัวละคร: ${finalParsed.detectedCharacters.join(", ")})`
          : "";
      toast.success(`จัดบทสนทนาเรียบร้อย ${finalParsed.blocks.length} ประโยค${charSummary}`);
    }
  };

  // Bulk import multiple scenes into current part
  const handleImportAllScenes = async (bulkText: string) => {
    if (!activePartId) {
      toast.error("กรุณาเลือกภาคก่อนสร้างฉาก");
      return;
    }

    const multiScenes = splitMultiSceneScript(bulkText);
    if (multiScenes.length <= 1) {
      await handleConvertAndApplyScript(bulkText);
      return;
    }

    try {
      toast.info(`กำลังสร้าง ${multiScenes.length} ฉากลงในภาคนี้...`);

      // 1. Collect all characters across all scenes and register them
      const allDetectedChars = new Set<string>();
      for (const sc of multiScenes) {
        const p = parseClaudeScript(sc.content, characters);
        p.detectedCharacters.forEach((c) => allDetectedChars.add(c));
      }
      const updatedChars = await autoRegisterNewCharacters(Array.from(allDetectedChars));

      // 2. Create scenes
      let firstCreatedSceneId = "";
      for (let i = 0; i < multiScenes.length; i++) {
        const sc = multiScenes[i];
        const parsed = parseClaudeScript(sc.content, updatedChars);
        const res = await fetch(`/api/projects/${projectId}/parts/${activePartId}/scenes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: sc.title || parsed.sceneTitle || `ฉากที่ ${i + 1}`,
            location: sc.location || parsed.location || "",
            charactersPresent: parsed.detectedCharacters,
            contentMarkdown: parsed.rawCleanMarkdown || sc.content,
            directorNote: "",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (i === 0) firstCreatedSceneId = data.scene.id;
        }
      }

      await loadProjectData();
      if (firstCreatedSceneId) {
        setActiveSceneId(firstCreatedSceneId);
      }
      toast.success(`สร้างฉากใหม่ทั้งหมด ${multiScenes.length} ฉากเรียบร้อยแล้ว!`);
    } catch (err: any) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการสร้างหลายฉาก");
    }
  };

  // 6. Save Scene (Saves Dialogue Markdown, Bindings, Title, Location)
  const handleSaveAll = async (silent: boolean = false) => {
    if (!activeSceneId) return;

    try {
      setIsSavingScene(true);
      const markdownToSave = isRawMarkdownMode
        ? editableMarkdown
        : blocksToMarkdown(dialogueBlocks);

      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sceneTitleInput.trim() || activeScene?.title,
          location: sceneLocationInput.trim() || activeScene?.location,
          contentMarkdown: markdownToSave,
          dialogueBindings: JSON.stringify(localDialogueBindings),
          directorNote: directorsNote,
          lastEditedBy: currentAuthorName || undefined,
          bgmUrl: activeScene?.bgmUrl || undefined,
          bgmTitle: activeScene?.bgmTitle || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      const sceneWithBgm = {
        ...data.scene,
        bgmUrl: data.scene?.bgmUrl || activeScene?.bgmUrl || null,
        bgmTitle: data.scene?.bgmTitle || activeScene?.bgmTitle || null,
      };

      setActiveScene(sceneWithBgm);
      setEditableMarkdown(markdownToSave);
      setHasUnsavedChanges(false);
      setIsEditingTitle(false);

      // Update parts list in memory
      setParts((prevParts) =>
        prevParts.map((part) => ({
          ...part,
          scenes: part.scenes.map((s) => (s.id === activeSceneId ? sceneWithBgm : s)),
        }))
      );

      if (!silent) {
        toast.success("บันทึกการแก้ไขฉากและบทพูดเรียบร้อยแล้ว!");
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } finally {
      setIsSavingScene(false);
    }
  };

  // Debounced Auto-Save: automatically saves 3 seconds after you stop editing
  useEffect(() => {
    if (!hasUnsavedChanges || !activeSceneId || isSavingScene) return;

    const timer = setTimeout(() => {
      handleSaveAll(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, activeSceneId, dialogueBlocks, editableMarkdown, sceneTitleInput, sceneLocationInput, localDialogueBindings, directorsNote]);

  // 7. AI Story Streaming (Claude 3.5 Sonnet)
  const handleStartStream = async (actionType: "write_next" | "regenerate" = "write_next") => {
    if (!activeScene) return;

    try {
      setIsStreaming(true);
      setStreamingText("");

      const charsPresent = activeScene.charactersPresentParsed || [];

      const res = await fetch(`/api/projects/${projectId}/scenes/generate-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: activePartId,
          sceneId: activeScene.id,
          sceneTitle: sceneTitleInput || activeScene.title,
          location: sceneLocationInput || activeScene.location,
          charactersPresent: charsPresent,
          directorNote: directorsNote,
          existingContent: actionType === "write_next" ? blocksToMarkdown(dialogueBlocks) : "",
          action: actionType,
        }),
      });

      if (!res.ok) throw new Error("เริ่มการสร้างเนื้อเรื่องไม่สำเร็จ");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullStory = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullStory += chunk;
          setStreamingText(fullStory);
        }
      }

      // Convert streamed story into editable dialogue blocks!
      const parsedBlocks = parseSceneToDialogueBlocks(fullStory, characters);
      setDialogueBlocks(parsedBlocks);
      setEditableMarkdown(fullStory);
      setHasUnsavedChanges(true);

      toast.success("AI ประพันธ์เนื้อเรื่องเสร็จสิ้น! คุณสามารถแก้ไขบทพูดได้ทันที");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการเขียนเนื้อเรื่อง");
    } finally {
      setIsStreaming(false);
    }
  };

  // 8. Create New Scene Handler
  const handleCreateScene = async () => {
    if (!newSceneTitle.trim() || !activePartId) {
      toast.error("กรุณาระบุชื่อฉากและเลือกภาค");
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/parts/${activePartId}/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSceneTitle,
          location: newSceneLocation,
          charactersPresent: newSceneSelectedChars,
          contentMarkdown: `"พวกเราต้องรีบไปจากที่นี่ก่อนที่ทหารจะมาถึง"`,
          directorNote: "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างฉากไม่สำเร็จ");

      toast.success("สร้างฉากใหม่เรียบร้อยแล้ว");
      setShowNewSceneModal(false);
      setNewSceneTitle("");
      setNewSceneLocation("");
      setNewSceneSelectedChars([]);

      await loadProjectData();
      setActiveSceneId(data.scene.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการสร้างฉาก");
    }
  };

  // 9. Continuity Analysis
  const handleRunAnalysis = async () => {
    if (!activeSceneId) return;
    try {
      setIsAnalyzing(true);
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyDirectly: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "การวิเคราะห์ล้มเหลว");
      setAnalysisResult(data.analysis);
      setShowAnalysisModal(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการวิเคราะห์ Continuity");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmLedgerUpdate = async () => {
    if (!activeSceneId) return;
    try {
      setIsApplyingLedger(true);
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyDirectly: true }),
      });
      if (!res.ok) throw new Error("อัปเดต Ledger ไม่สำเร็จ");
      toast.success("อัปเดตสถานะลง Continuity Ledger เรียบร้อยแล้ว!");
      setShowAnalysisModal(false);
      loadSceneDetails(activeSceneId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "บันทึก Ledger ล้มเหลว");
    } finally {
      setIsApplyingLedger(false);
    }
  };

  // Click dialogue row to preview its bound image and audio mood
  const handleSelectDialogueRow = (index: number) => {
    setActiveBlockIndex(index);
    const resolved = resolveImageForDialogueIndex(index, localDialogueBindings, sceneImages);
    if (resolved.imageIndex >= 0) {
      setSelectedImageIndex(resolved.imageIndex);
    }
    const audioResolved = resolveAudioForDialogueIndex(index, localDialogueBindings, activeScene?.bgmUrl);
    if (audioResolved.isDirectBinding) {
      handlePreviewAudioBinding(audioResolved.value);
    }
  };

  // Compute Active Images & Captions (Dynamically resolves image/video bound to current dialogue beat)
  const currentPart = parts.find((p) => p.id === activePartId);
  const resolvedMedia = resolveImageForDialogueIndex(
    activeBlockIndex,
    localDialogueBindings,
    sceneImages
  );
  const currentFeaturedImage =
    resolvedMedia.image ||
    (sceneImages.length > 0 ? sceneImages[selectedImageIndex] || sceneImages[0] : null);

  const activeBlock = dialogueBlocks[activeBlockIndex];
  const leftCardCaption =
    sceneCaptionInput ||
    currentFeaturedImage?.caption ||
    (activeBlock ? activeBlock.text : dialogueBlocks[0]?.text) ||
    "กลิ่นของไฟป่า (Wildfire) ยังคงติดแน่นอยู่ในชั้นบรรยากาศ มันไม่ได้มีกลิ่นเหมือนฟืนไหม้ทั่วไป แต่เป็นกลิ่นฉุนแสบจมูกของสารเคมีโบราณที่เผาผลาญทั้งไม้ เหล็ก และเนื้อมนุษย์จนกลายเป็นเถ้าสีมรกต";

  return (
    <div className="space-y-4">
      {/* Project Header */}
      {project && (
        <ProjectHeader
          projectId={project.id}
          title={project.title}
          universe={project.universe}
          timelineScope={project.timelineScope}
        />
      )}

      {/* ========================================================================= */}
      {/* 0. CO-AUTHOR PERSONA & SQUAD COLLABORATION STATUS RIBBON                  */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 font-thai flex items-center gap-1.5">
              <span>✍️ คุณกำลังแต่งในนาม:</span>
            </span>

            <select
              value={currentAuthorName}
              onChange={(e) => {
                const val = e.target.value;
                setCurrentAuthorName(val);
                if (typeof window !== "undefined") {
                  localStorage.setItem(`author_persona_${projectId}`, val);
                }
                toast.info(`สลับชื่อผู้แต่งเป็น: "${val}"`);
              }}
              className="bg-slate-950 border border-slate-700 hover:border-amber-400 rounded-lg px-3 py-1 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer font-thai"
            >
              {characters
                .filter((c) => c.characterType === "self")
                .map((c) => (
                  <option key={c.id} value={c.realNickname || c.name}>
                    👑 {c.realNickname || c.name} (เจ้าของเรื่อง)
                  </option>
                ))}
              {collaborators.map((collab) => (
                <option key={collab.id} value={collab.nickname || collab.name}>
                  🧑‍🤝‍🧑 {collab.name} {collab.nickname ? `(${collab.nickname})` : ""}
                </option>
              ))}
              {characters
                .filter((c) => c.characterType === "friend")
                .map((c) => (
                  <option key={c.id} value={c.realNickname || c.name}>
                    🧑‍🤝‍🧑 {c.realNickname || c.name} (เพื่อนในแก๊ง)
                  </option>
                ))}
              <option value="ผู้แต่งร่วม (Guest Author)">
                ✏️ ผู้แต่งร่วม (Guest Author)
              </option>
            </select>
          </div>

          {activeScene?.lastEditedBy && (
            <span className="text-[11px] font-thai text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
              ฉากนี้แก้ไขล่าสุดโดย: <strong className="text-amber-300">{activeScene.lastEditedBy}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCollabModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-sky-500/20 hover:from-amber-500/30 hover:to-sky-500/30 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold font-thai transition-all shadow-sm active:scale-95"
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 เชิญเพื่อนมาร่วมแต่ง / แชร์ลิงก์</span>
            {collaborators.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold font-mono">
                {collaborators.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SCENE & AUDIO CONTROL RIBBON (Sleek, unified, easy-to-use)             */}
      {/* ========================================================================= */}
      <div className="cinematic-card rounded-2xl p-3 sm:p-4 border-slate-700/60 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 shadow-xl">
        {/* Left: Part & Scene Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Part Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
            <Layers className="w-4 h-4 text-amber-400" />
            <select
              value={activePartId}
              onChange={(e) => handleSelectPart(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none font-thai cursor-pointer"
            >
              {parts.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  ภาค {p.number}: {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Scene / Episode Dropdown */}
          {currentPart && currentPart.scenes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
              <FileText className="w-4 h-4 text-amber-400" />
              <select
                value={activeSceneId}
                onChange={(e) => handleSelectScene(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none font-thai max-w-[220px] truncate cursor-pointer"
              >
                {currentPart.scenes.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    ฉาก {s.order}: {s.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  if (activeSceneId) {
                    toast.promise(loadSceneDetails(activeSceneId), {
                      loading: "กำลังซิงค์ข้อมูลล่าสุด...",
                      success: "ซิงค์ข้อมูล บทพูด และรูปภาพล่าสุดเรียบร้อย!",
                      error: "เกิดข้อผิดพลาดในการซิงค์",
                    });
                  }
                }}
                title="กดเพื่อดึงการแก้ไขล่าสุดจากเพื่อนร่วมแต่ง"
                className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all ml-0.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* New Scene Button */}
          <button
            onClick={() => setShowNewSceneModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-thai font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มฉากใหม่</span>
          </button>
        </div>

        {/* Center / Right: Scene BGM Audio Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Scene BGM & Volume Controller */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-sm">
            {/* Animated Equalizer when playing */}
            {isAudioPlaying ? (
              <div className="flex items-end gap-0.5 h-3.5 px-0.5" title="กำลังเล่นเพลง">
                <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-3.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            ) : (
              <Music className="w-4 h-4 text-emerald-400" />
            )}

            {/* Audio Track Dropdown */}
            <select
              value={currentAudioTrack}
              onChange={(e) => {
                if (e.target.value === "modal_open") {
                  setShowAudioModal(true);
                  return;
                }
                handleSelectAudioTrack(e.target.value as AudioTrack);
              }}
              className="bg-transparent text-xs font-bold text-white focus:outline-none font-thai cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
            >
              <option value="none" className="bg-slate-900">⚪ ไม่มีเพลงประกอบ</option>
              {activeScene?.bgmUrl && (
                <option value="custom" className="bg-slate-900 text-emerald-300 font-bold">
                  {extractYouTubeVideoId(activeScene.bgmUrl) ? "🎬 " : "🎶 "}
                  {activeScene.bgmTitle || "เพลงประจำฉาก"}
                </option>
              )}
              <option value="modal_open" className="bg-slate-900 text-sky-400 font-bold">
                ➕ ใส่ลิงก์ / เปลี่ยนเพลง...
              </option>
              <option value="wildfire" className="bg-slate-900">🔥 เพลิงป่า (Wildfire Drone)</option>
              <option value="winter" className="bg-slate-900">❄️ ลมเหมันต์ (Winter Winds)</option>
              <option value="war" className="bg-slate-900">⚔️ มหากาพย์ศึก (War Drums)</option>
              <option value="shadows" className="bg-slate-900">🌑 เงาทมิฬ (Shadows Ethereal)</option>
            </select>

            {/* Play/Pause Button */}
            <button
              onClick={handleToggleAudioPlay}
              className={`p-1 rounded-lg transition-all shadow-sm active:scale-95 ${
                isAudioPlaying
                  ? "bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
                  : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
              title={isAudioPlaying ? "หยุดเพลง (Pause)" : "เล่นเพลง (Play)"}
            >
              {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Vertical Divider */}
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            {/* Volume & Mute Controls */}
            <div className="flex items-center gap-1.5" title="ปรับระดับเสียงเพลง">
              {/* Mute Button */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-1 rounded-lg transition-colors ${
                  isAudioMuted || audioVolume === 0
                    ? "text-red-400 hover:bg-red-950/40"
                    : "text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                }`}
                title={isAudioMuted ? "เปิดเสียง (Unmute)" : "ปิดเสียงชั่วคราว (Mute)"}
              >
                {isAudioMuted || audioVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : audioVolume < 0.5 ? (
                  <Volume1 className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Volume Decrease (-) */}
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.max(0, audioVolume - 0.1))}
                className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded text-xs font-mono font-bold transition-colors"
                title="ลดเสียง 10%"
              >
                -
              </button>

              {/* Volume Slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isAudioMuted ? 0 : audioVolume}
                onChange={(e) => {
                  if (isAudioMuted) setIsAudioMuted(false);
                  handleVolumeChange(parseFloat(e.target.value));
                }}
                className="w-14 sm:w-20 accent-emerald-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                title={`ความดัง: ${Math.round((isAudioMuted ? 0 : audioVolume) * 100)}%`}
              />

              {/* Volume Increase (+) */}
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.min(1, audioVolume + 0.1))}
                className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded text-xs font-mono font-bold transition-colors"
                title="เพิ่มเสียง 10%"
              >
                +
              </button>

              {/* Volume Percentage Text */}
              <span className="font-mono text-[10px] text-slate-400 w-6 text-right select-none">
                {Math.round((isAudioMuted ? 0 : audioVolume) * 100)}%
              </span>
            </div>

            {/* YouTube MV Picture-in-Picture Toggle */}
            {activeScene?.bgmUrl && extractYouTubeVideoId(activeScene.bgmUrl) && (
              <button
                type="button"
                onClick={() => setShowMiniVideoPlayer((prev) => !prev)}
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-thai font-semibold border transition-all ${
                  showMiniVideoPlayer
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
                }`}
                title="เปิด/ปิด จอวิดีโอ YouTube ขนาดเล็ก (PiP)"
              >
                📺 {showMiniVideoPlayer ? "ปิดจอ" : "ดู MV"}
              </button>
            )}
          </div>

          {/* Upload Custom Audio Button */}
          <button
            onClick={() => audioFileInputRef.current?.click()}
            disabled={isUploadingAudio}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-thai font-semibold transition-all shadow-sm active:scale-95"
            title="อัปโหลดไฟล์เพลง MP3 หรือ WAV สำหรับฉากนี้ (ไม่เกิน 4.5 MB บน Vercel หรือไม่จำกัดบน Tunnel)"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isUploadingAudio ? "กำลังอัปโหลด..." : "อัปโหลดเพลง"}</span>
          </button>

          {/* Direct Audio URL / YouTube Modal Trigger */}
          <button
            onClick={() => setShowAudioModal(true)}
            disabled={isUploadingAudio}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-700 text-xs font-thai font-semibold transition-all shadow-sm active:scale-95"
            title="ตั้งค่าหรือเปลี่ยนลิงก์เพลงประกอบ (YouTube หรือ Direct Audio Link)"
          >
            <Link2 className="w-3.5 h-3.5 text-sky-400" />
            <span>ใส่ลิงก์เพลง</span>
          </button>

          {activeScene?.bgmUrl && (
            <button
              onClick={handleDeleteAudio}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
              title="ลบเพลงประกอบประจำฉากนี้"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}

          {/* Save All Changes Button */}
          <button
            onClick={() => handleSaveAll(false)}
            disabled={isSavingScene}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs font-thai transition-all shadow-md active:scale-95 ${
              hasUnsavedChanges
                ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {isSavingScene ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            )}
            <span>{isSavingScene ? "กำลังเซฟอัตโนมัติ..." : hasUnsavedChanges ? "บันทึกการแก้ไข (Auto-Save 3วิ)" : "✓ บันทึกแล้ว"}</span>
          </button>

          {/* Reader View Link */}
          <Link
            href={`/projects/${projectId}/read${activeScene ? `?sceneId=${activeScene.id}` : ""}`}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold hover:brightness-110 font-thai text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>เปิดโหมดอ่านนิยาย (Reader View) →</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SPLIT-SCREEN WORKSPACE (Exact Layout matching Image 2 & Figma)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-stretch w-full">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: Visual Stage & Image Gallery (Figma width: 1196px, 2/3)     */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between rounded-[16px] p-5 sm:p-6 bg-[#313131] border border-slate-700/60 shadow-2xl h-[780px] sm:h-[840px] lg:h-[880px] xl:h-[920px]">
          {/* Main Cinematic Image Display (flex-1 dynamically fills vertical space) */}
          <div className="relative w-full flex-1 min-h-0 rounded-[13px] overflow-hidden bg-[#1e232d] group border border-black/20 mb-3">
            {currentFeaturedImage ? (
              <>
                {isVideoMedia(currentFeaturedImage) ? (
                  <video
                    key={currentFeaturedImage.id}
                    src={currentFeaturedImage.filePath}
                    autoPlay
                    loop
                    muted={isVideoMuted}
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
                    className="w-full h-full object-cover transition-all duration-700 animate-fadeIn"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={currentFeaturedImage.id}
                    src={currentFeaturedImage.filePath}
                    alt={currentFeaturedImage.caption || currentFeaturedImage.prompt}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-102 animate-fadeIn"
                  />
                )}

                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Top Floating Controls */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2 flex-wrap max-w-[85%]">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/95 text-slate-950 font-thai flex items-center gap-1.5 backdrop-blur-md shadow">
                    {isVideoMedia(currentFeaturedImage) ? (
                      <Video className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isVideoMedia(currentFeaturedImage)
                        ? "🎬 VIDEO CLIP"
                        : currentFeaturedImage.kind === "movie_still"
                        ? "CANON MOVIE STILL"
                        : "CINEMATIC SCENE"}
                    </span>
                  </span>

                  {project?.coverImage === currentFeaturedImage.filePath && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 font-thai flex items-center gap-1 shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                      <Crown className="w-3.5 h-3.5" />
                      <span>ภาพหน้าปกนิยาย</span>
                    </span>
                  )}

                  <button
                    onClick={() => imageFileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/80 hover:bg-black text-white font-thai flex items-center gap-1.5 backdrop-blur-md border border-slate-700 shadow transition-all active:scale-95"
                  >
                    <Upload className="w-3 h-3 text-amber-400" />
                    <span>{isUploadingImage ? "กำลังอัปโหลด..." : "+ อัปโหลดภาพ/วิดีโอ"}</span>
                  </button>

                  {isVideoMedia(currentFeaturedImage) ? (
                    <button
                      onClick={() => {
                        const timing = getVideoTiming(currentFeaturedImage);
                        setVideoTrimData({
                          isOpen: true,
                          videoSrc: currentFeaturedImage.filePath,
                          videoId: currentFeaturedImage.id,
                          startTime: timing.startTime,
                          endTime: timing.endTime,
                          caption: currentFeaturedImage.caption || "",
                        });
                      }}
                      className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/80 hover:bg-black text-amber-300 font-thai flex items-center gap-1.5 backdrop-blur-md border border-amber-500/50 shadow transition-all active:scale-95"
                      title="เลือกช่วงเวลาของวิดีโอที่จะเล่นวนลูป"
                    >
                      <Scissors className="w-3 h-3 text-amber-400" />
                      <span>เลือกช่วงคลิป</span>
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setCropModalData({
                          isOpen: true,
                          imageSrc: currentFeaturedImage.filePath,
                          imageId: currentFeaturedImage.id,
                          defaultAspect: "16:9",
                        })
                      }
                      className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/80 hover:bg-black text-amber-300 font-thai flex items-center gap-1.5 backdrop-blur-md border border-slate-700 hover:border-amber-500/50 shadow transition-all active:scale-95"
                      title="ครอบตัดรูปภาพนี้ (Crop)"
                    >
                      <Crop className="w-3 h-3 text-amber-400" />
                      <span>ครอปรูป</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleSetAsCover(currentFeaturedImage)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold font-thai flex items-center gap-1.5 backdrop-blur-md border shadow transition-all active:scale-95 ${
                      project?.coverImage === currentFeaturedImage.filePath
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-black/80 hover:bg-black text-amber-400 border-amber-500/40 hover:border-amber-400"
                    }`}
                    title="ตั้งรูปหรือคลิปนี้เป็นภาพหน้าปกของนิยายเรื่องนี้"
                  >
                    <Crown className="w-3 h-3" />
                    <span>{project?.coverImage === currentFeaturedImage.filePath ? "หน้าปกปัจจุบัน" : "ตั้งเป็นหน้าปก"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setAiImagePromptInput(
                        `${activeScene?.title || ""}, ${activeScene?.location || ""}, dark fantasy cinematic lighting`
                      );
                      setShowAiImageModal(true);
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/80 hover:bg-black text-amber-300 font-thai flex items-center gap-1.5 backdrop-blur-md border border-amber-500/30 shadow transition-all active:scale-95"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>สร้างด้วย AI</span>
                  </button>
                </div>

                {/* Top Right Controls: Mute toggle & Zoom Lightbox */}
                <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
                  {isVideoMedia(currentFeaturedImage) && (
                    <button
                      onClick={() => setIsVideoMuted(!isVideoMuted)}
                      className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all shadow"
                      title={isVideoMuted ? "เปิดเสียงวิดีโอ" : "ปิดเสียงวิดีโอ (Mute)"}
                    >
                      {isVideoMuted ? (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setLightboxImage(currentFeaturedImage.filePath)}
                    className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all shadow"
                    title="ขยายภาพ/วิดีโอเต็มจอ"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Film className="w-14 h-14 mb-3 text-slate-600" />
                <p className="font-thai font-bold text-slate-200 text-base">ยังไม่มีภาพประกอบสำหรับฉากนี้</p>
                <p className="text-xs font-thai text-slate-400 mt-1 max-w-md">
                  คุณสามารถอัปโหลดรูปภาพของคุณเอง หรือสั่งให้ AI สร้างภาพประกอบตามเนื้อเรื่องได้ทันที
                </p>
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => imageFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>+ อัปโหลดรูปภาพจากเครื่อง</span>
                  </button>
                  <button
                    onClick={() => {
                      setAiImagePromptInput(
                        `${activeScene?.title || ""}, ${activeScene?.location || ""}, dark fantasy cinematic lighting`
                      );
                      setShowAiImageModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs font-thai flex items-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>สั่งให้ AI วาดรูป</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail Strip: Image Gallery for this EP */}
          <div className="flex-shrink-0 space-y-1.5 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 font-thai flex items-center gap-1.5">
                <Film className="w-3 h-3 text-amber-400" />
                <span>คลังภาพในฉากนี้ ({sceneImages.length} ภาพ):</span>
              </span>
              <button
                onClick={() => imageFileInputRef.current?.click()}
                className="text-[11px] text-amber-400 hover:underline font-thai font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>เพิ่มภาพใหม่</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {sceneImages.map((img, idx) => {
                const isSelected = selectedImageIndex === idx;
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`cursor-pointer group relative aspect-video w-24 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                      isSelected
                        ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-1 ring-amber-400 scale-105"
                        : "border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {isVideoMedia(img) ? (
                      <div className="w-full h-full relative bg-black flex items-center justify-center">
                        <video
                          src={img.filePath}
                          muted
                          playsInline
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                          <Play className="w-4 h-4 text-white/80 fill-current" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={img.filePath}
                        alt={img.caption || ""}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Cover indicator */}
                    {project?.coverImage === img.filePath && (
                      <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-bold flex items-center gap-0.5 shadow z-10">
                        <Crown className="w-2.5 h-2.5" />
                        <span>ปก</span>
                      </div>
                    )}

                    {/* Video badge */}
                    {isVideoMedia(img) && (
                      <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/80 text-amber-300 text-[9px] font-bold flex items-center gap-0.5 backdrop-blur-sm z-10">
                        <Video className="w-2.5 h-2.5" />
                        <span>VDO</span>
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {isVideoMedia(img) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const timing = getVideoTiming(img);
                            setVideoTrimData({
                              isOpen: true,
                              videoSrc: img.filePath,
                              videoId: img.id,
                              startTime: timing.startTime,
                              endTime: timing.endTime,
                              caption: img.caption || "",
                            });
                          }}
                          className="p-1 rounded bg-black/80 hover:bg-amber-950 text-slate-300 hover:text-amber-300"
                          title="เลือกช่วงเวลาของวิดีโอนี้ (Trim)"
                        >
                          <Scissors className="w-2.5 h-2.5 text-amber-400" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCropModalData({
                              isOpen: true,
                              imageSrc: img.filePath,
                              imageId: img.id,
                              defaultAspect: "16:9",
                            });
                          }}
                          className="p-1 rounded bg-black/80 hover:bg-amber-950 text-slate-300 hover:text-amber-300"
                          title="ครอปรูปนี้"
                        >
                          <Crop className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetAsCover(img);
                        }}
                        className="p-1 rounded bg-black/80 hover:bg-amber-950 text-slate-300 hover:text-amber-400"
                        title="ตั้งรูปหรือคลิปนี้เป็นหน้าปก"
                      >
                        <Crown className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img.id);
                        }}
                        className="p-1 rounded bg-black/80 hover:bg-red-950 text-slate-400 hover:text-red-300"
                        title="ลบภาพนี้"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Fast Add Thumbnail Tile */}
              <button
                onClick={() => imageFileInputRef.current?.click()}
                className="aspect-video w-24 rounded-lg border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/60 flex flex-col items-center justify-center gap-1 flex-shrink-0 text-slate-400 hover:text-amber-300 transition-all cursor-pointer"
                title="อัปโหลดรูปภาพเพิ่ม"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[10px] font-thai">อัปโหลด</span>
              </button>
            </div>
          </div>

          {/* Atmospheric sensory caption underneath the image (Matching Image 2) */}
          <div className="flex-shrink-0 p-3 pt-3 border-t border-slate-700/50 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-thai text-amber-400 font-bold">
              <span>🎬 คำบรรยายใต้ภาพ / บทพูดที่กำลังแสดง:</span>
              <button
                onClick={() => {
                  const val = prompt("แก้ไขคำบรรยายใต้ภาพ:", leftCardCaption);
                  if (val !== null) setSceneCaptionInput(val);
                }}
                className="text-slate-400 hover:text-white font-normal underline"
              >
                แก้ไขคำบรรยาย
              </button>
            </div>
            <p className="text-sm font-thai text-[#E2E8F0] leading-relaxed line-clamp-3">
              {leftCardCaption}
            </p>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Dialogue Card (Figma width: 596px, 1/3, Editable Beats)     */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between rounded-[16px] p-5 sm:p-6 bg-[#313131] border border-slate-700/60 shadow-2xl h-[780px] sm:h-[840px] lg:h-[880px] xl:h-[920px] space-y-3">
          {/* Header: Part subtitle & Clean Scene Title (Editable!) */}
          <div className="flex-shrink-0 space-y-2 border-b border-slate-700/50 pb-3">
            {currentPart && (
              <div className="text-[11px] font-mono font-bold text-[#FBBF24] tracking-wider uppercase">
                PART {currentPart.number}: {currentPart.title}
              </div>
            )}

            {/* Editable Scene Title */}
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sceneTitleInput}
                  onChange={(e) => {
                    setSceneTitleInput(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full bg-slate-900 border border-amber-400 rounded-lg px-2.5 py-1 text-base font-bold text-white font-thai focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  ตกลง
                </button>
              </div>
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug hover:text-amber-300 cursor-pointer flex items-center gap-2 group"
                title="คลิกเพื่อแก้ไขชื่อฉาก"
              >
                <span>{sceneTitleInput || activeScene?.title || "ฉากที่ 1"}</span>
                <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 opacity-60" />
              </h2>
            )}

            {/* Location & AI Toolbar Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2 text-xs font-thai">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <input
                    type="text"
                    value={sceneLocationInput}
                    onChange={(e) => {
                      setSceneLocationInput(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="ระบุสถานที่..."
                    className="bg-transparent text-xs text-slate-200 focus:outline-none w-28 truncate"
                  />
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 font-mono text-[11px]">
                  <span>{dialogueBlocks.length} ประโยค</span>
                </span>
              </div>

              {/* AI & Markdown Toggle Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={isStreaming}
                  onClick={() => handleStartStream("write_next")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  title="สั่งให้ AI ประพันธ์บทพูดและเนื้อเรื่องต่อ"
                >
                  {isStreaming ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>{isStreaming ? "AI กำลังเขียน..." : "AI แต่งต่อ"}</span>
                </button>

                <button
                  onClick={() => setShowClaudeImportModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold font-thai transition-all active:scale-95 shadow-sm"
                  title="วางบทสคริปต์จาก Claude เพื่อจัดบทและตัวละครอัตโนมัติ"
                >
                  <PenTool className="w-3 h-3 text-sky-400" />
                  <span>วางบท Claude</span>
                </button>

                <button
                  onClick={handleAutoDistributeImages}
                  disabled={sceneImages.length === 0 || dialogueBlocks.length === 0}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 text-xs transition-colors"
                  title="กระจายภาพทั้งหมดในฉากนี้ตามบทพูดโดยอัตโนมัติ"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <button
                  onClick={() => setIsRawMarkdownMode(!isRawMarkdownMode)}
                  className={`p-1 rounded-lg text-xs transition-colors border ${
                    isRawMarkdownMode
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                  }`}
                  title={isRawMarkdownMode ? "สลับเป็นโหมดจัดบทพูด (Visual Mode)" : "สลับเป็นโหมด Markdown ดิบ"}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  disabled={isAnalyzing}
                  onClick={handleRunAnalysis}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 text-xs transition-colors"
                  title="ตรวจ Continuity & Moments"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Studio Reader Stepper Bar */}
          {dialogueBlocks.length > 0 && !isRawMarkdownMode && !isStreaming && (
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-xs font-thai shadow-lg mb-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>ทดลองอ่านตามบท:</span>
                </span>
                <span className="font-mono text-slate-300">
                  บทที่ <strong className="text-amber-300 font-bold">{activeBlockIndex + 1}</strong> / {dialogueBlocks.length}
                </span>
                {localDialogueBindings[String(activeBlockIndex)] && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>มีภาพ/คลิปผูกไว้</span>
                  </span>
                )}
                {localDialogueBindings['audio_' + activeBlockIndex] && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <Music className="w-2.5 h-2.5" />
                    <span>มีเสียงผูกไว้</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeBlockIndex <= 0}
                  onClick={() => handleSelectDialogueRow(Math.max(0, activeBlockIndex - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                  title="ประโยคก่อนหน้า"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>ก่อนหน้า</span>
                </button>

                <button
                  type="button"
                  disabled={activeBlockIndex >= dialogueBlocks.length - 1}
                  onClick={() => handleSelectDialogueRow(Math.min(dialogueBlocks.length - 1, activeBlockIndex + 1))}
                  className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all active:scale-95 cursor-pointer"
                  title="กดอ่านประโยคถัดไป (รูปภาพ/คลิป และเสียงเพลงจะเปลี่ยนตามบทนั้นทันที)"
                >
                  <span>ถัดไป</span>
                  <ArrowDown className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                <Link
                  href={`/projects/${projectId}/read${activeScene ? `?sceneId=${activeScene.id}` : ""}`}
                  target="_blank"
                  className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 font-bold text-xs transition-colors shadow-sm"
                  title="เปิดอ่านในมุมมองผู้อ่านเต็มจอ (Visual Novel)"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>เปิดโหมดอ่านเต็มจอ ↗</span>
                </Link>
              </div>
            </div>
          )}

          {/* Inner Dialogue Container (#2D2D2D, rounded-[18px]) - FULLY INTERACTIVE & EDITABLE */}
          <div className="relative flex-1 min-h-0 rounded-[18px] bg-[#2D2D2D] p-4 sm:p-5 border border-slate-700/40 overflow-y-auto dialogue-scroll space-y-3 pr-2.5">
            {isStreaming ? (
              <div className="space-y-4 p-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-thai animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>AI กำลังประพันธ์เนื้อเรื่องแบบ Real-Time...</span>
                </div>
                <div className="font-thai text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-2 h-4 bg-amber-400 ml-1 animate-pulse" />
                </div>
              </div>
            ) : isRawMarkdownMode ? (
              <div className="space-y-3 h-full flex flex-col">
                <div className="flex items-center justify-between text-xs text-slate-400 font-thai">
                  <span className="flex items-center gap-1.5 font-bold text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>แก้ไขเนื้อเรื่องแบบ Markdown ดิบ (Raw Script)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConvertAndApplyScript(editableMarkdown)}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3 h-3 stroke-[2.5]" />
                      <span>⚡ แปลงบท & จัดตัวละครอัตโนมัติ</span>
                    </button>
                    <button
                      onClick={() => setIsRawMarkdownMode(false)}
                      className="text-slate-400 hover:text-white underline text-xs"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>

                {/* Helpful tip banner */}
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-thai flex items-center justify-between gap-2">
                  <span>
                    💡 <strong>คำแนะนำ:</strong> คุณสามารถวางบทที่คัดลอกจาก Claude ทั้งหมดลงในช่องนี้ได้เลย ระบบจะแยกชื่อตัวละคร บทพูด เสียงประกอบ และคำบรรยายให้อัตโนมัติเมื่อกดปุ่มแปลงบท
                  </span>
                  <button
                    onClick={() => setShowClaudeImportModal(true)}
                    className="flex-shrink-0 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-bold"
                  >
                    เปิดหน้าต่างช่วยนำเข้า
                  </button>
                </div>

                <textarea
                  value={editableMarkdown}
                  onChange={(e) => {
                    setEditableMarkdown(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="วางบทสคริปต์จาก Claude หรือแก้ไข Markdown ได้ที่นี่..."
                  rows={18}
                  className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 font-thai leading-relaxed focus:outline-none focus:border-amber-400 shadow-inner"
                />

                <div className="flex items-center justify-between text-xs font-thai text-slate-400 pt-1">
                  <span>{editableMarkdown.split(/\r?\n/).filter(Boolean).length} บรรทัด</span>
                  <button
                    onClick={() => handleConvertAndApplyScript(editableMarkdown)}
                    className="text-amber-400 hover:text-amber-300 underline font-bold"
                  >
                    → กลับสู่โหมดจัดบทพูด (Visual Mode)
                  </button>
                </div>
              </div>
            ) : dialogueBlocks.length > 0 ? (
              dialogueBlocks.map((block, idx) => {
                const isActive = idx === activeBlockIndex;
                const assignedImageId = localDialogueBindings[String(idx)];
                const assignedImage = sceneImages.find((img) => img.id === assignedImageId);
                const assignedAudioValue = localDialogueBindings[`audio_${idx}`];

                // 1. SOUND EFFECT ROW (Centered atmospheric text)
                if (block.type === "sound") {
                  return (
                    <div
                      key={block.id}
                      ref={(el) => { dialogueRowRefs.current[idx] = el; }}
                      onClick={() => handleSelectDialogueRow(idx)}
                      className={`group relative p-2.5 rounded-xl border text-center transition-all ${
                        isActive
                          ? "bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/60 shadow-lg"
                          : "border-transparent hover:border-slate-700/60 hover:bg-black/20"
                      }`}
                    >
                      <input
                        type="text"
                        value={block.text}
                        onChange={(e) => handleUpdateBlockText(idx, e.target.value)}
                        className="w-full bg-transparent text-center text-slate-300 font-thai text-sm italic tracking-widest focus:outline-none focus:text-white"
                        placeholder="*ระบุเสียงประกอบ เช่น เสียงลมพัด...*"
                      />

                      {/* Line Tools Bar on Hover / Active */}
                      <div className="flex items-center justify-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                        {/* Image & Video Select */}
                        <select
                          value={assignedImageId || ""}
                          onChange={(e) => {
                            if (e.target.value === "__upload_new__") {
                              targetUploadBlockIdxRef.current = idx;
                              blockImageUploadRef.current?.click();
                            } else if (e.target.value === "__custom_url__") {
                              const customUrl = window.prompt("กรุณาระบุลิงก์รูปภาพ หรือ วิดีโอ/GIF ภายนอก:");
                              if (customUrl && customUrl.trim()) {
                                handleAssignBlockImage(idx, `url:${customUrl.trim()}`);
                              }
                            } else {
                              handleAssignBlockImage(idx, e.target.value);
                            }
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-thai border focus:outline-none cursor-pointer ${
                            assignedImageId
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                              : "bg-slate-900 text-slate-400 border-slate-700"
                          }`}
                        >
                          <option value="">⚪ คงภาพเดิม</option>
                          {sceneImages.map((img, i) => (
                            <option key={img.id} value={img.id}>
                              {isVideoMedia(img) ? "🎬 วิดีโอ" : "🖼️ ภาพ"} #{i + 1}: {img.caption || img.prompt.slice(0, 20)}
                            </option>
                          ))}
                          <option value="__upload_new__">+ 📁 อัปโหลดภาพหรือคลิปใหม่...</option>
                          <option value="__custom_url__">+ 🔗 ลิงก์รูป/คลิปภายนอก...</option>
                        </select>

                        {/* Audio / Mood Select */}
                        <select
                          value={assignedAudioValue || ""}
                          onChange={(e) => {
                            if (e.target.value === "__custom_url__") {
                              const customUrl = window.prompt("กรุณาระบุลิงก์ไฟล์เสียง/เพลงภายนอก (MP3/WAV):");
                              if (customUrl && customUrl.trim()) {
                                handleAssignBlockAudio(idx, `url:${customUrl.trim()}`);
                              }
                            } else {
                              handleAssignBlockAudio(idx, e.target.value);
                            }
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-thai border focus:outline-none cursor-pointer ${
                            assignedAudioValue
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold"
                              : "bg-slate-900 text-slate-400 border-slate-700"
                          }`}
                          title="เปลี่ยนอารมณ์เพลง / เสียงประกอบ"
                        >
                          <option value="">🎶 คงเพลงเดิม</option>
                          <optgroup label="บรรยากาศเสียงสังเคราะห์">
                            {AUDIO_MOOD_OPTIONS.filter((o) => o.group === "บรรยากาศ").map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="เอฟเฟกต์เสียง">
                            {AUDIO_MOOD_OPTIONS.filter((o) => o.group === "เอฟเฟกต์").map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="ควบคุมเพลง">
                            {AUDIO_MOOD_OPTIONS.filter((o) => o.group === "เพลง").map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                            <option value="__custom_url__">+ 🎵 ลิงก์เพลงภายนอก...</option>
                          </optgroup>
                        </select>

                        <button
                          onClick={() => handleMoveBlock(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => handleMoveBlock(idx, "down")}
                          disabled={idx === dialogueBlocks.length - 1}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                          title="เลื่อนลง"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(idx)}
                          className="p-1 rounded bg-slate-800 hover:bg-red-950 text-red-400"
                          title="ลบประโยคนี้"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Assigned Mood Audio Preview Pill */}
                      {assignedAudioValue && (
                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/35 text-[10px] text-purple-300 font-thai">
                            <Music className="w-3 h-3 text-purple-400" />
                            <span>{getAudioMoodLabel(assignedAudioValue)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewAudioBinding(assignedAudioValue);
                              }}
                              className="p-0.5 hover:text-white"
                              title="ทดลองฟังเสียงนี้"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignBlockAudio(idx, "");
                              }}
                              className="p-0.5 hover:text-red-400"
                              title="ยกเลิกเพลง"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                // Determine Attributes
                const isSelf = block.speaker?.characterType === "self";
                const isFriend = block.speaker?.characterType === "friend";
                const avatarUrl = block.speaker?.avatarUrl;
                const displayName =
                  block.speaker?.realNickname || block.speaker?.name || block.speakerName || "ผู้พูด";
                const mbti = block.speaker?.currentMbti;

                // Avatar Icon Component
                const AvatarIcon = () => (
                  <div
                    className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-md transition-transform ${
                      isSelf
                        ? "border-amber-400 bg-amber-950/60 text-amber-300"
                        : isFriend
                        ? "border-sky-400 bg-sky-950/60 text-sky-300"
                        : "border-slate-500 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-heading font-bold text-xs uppercase">
                        {displayName.slice(0, 2)}
                      </span>
                    )}
                  </div>
                );

                // LEFT OR RIGHT DIALOGUE ROW
                return (
                  <div
                    key={block.id}
                    ref={(el) => { dialogueRowRefs.current[idx] = el; }}
                    onClick={() => handleSelectDialogueRow(idx)}
                    className={`group relative p-2.5 rounded-xl border transition-all ${
                      isActive
                        ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/60 shadow-lg"
                        : "border-transparent hover:border-slate-700/60 hover:bg-black/20"
                    }`}
                  >
                    {/* Top Row Header: Dropdowns on left, Action tools on right (clean flex layout, no overlapping!) */}
                    <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800/60 flex-wrap">
                      {/* Left: Speaker Selector & Media Bindings */}
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <select
                          value={
                            block.isNarrator
                              ? "narrator"
                              : block.speaker?.id || block.speaker?.name || "narrator"
                          }
                          onChange={(e) => handleUpdateBlockSpeaker(idx, e.target.value)}
                          className={`bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-thai font-bold focus:outline-none cursor-pointer max-w-[170px] sm:max-w-[210px] truncate ${
                            isSelf ? "text-amber-400" : isFriend ? "text-sky-400" : "text-slate-300"
                          }`}
                        >
                          <option value="narrator">📜 ผู้บรรยาย (Narrator)</option>
                          <option value="sound">⚡ เสียงประกอบ (Sound FX)</option>
                          {characters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.characterType === "self" ? "👑 " : c.characterType === "friend" ? "🧑‍🤝‍🧑 " : ""}
                              {c.name} {c.realNickname ? `(${c.realNickname})` : ""}
                            </option>
                          ))}
                          {block.speaker &&
                            !block.isNarrator &&
                            !characters.some(
                              (c) =>
                                c.id === block.speaker?.id ||
                                c.name.toLowerCase() === (block.speaker?.name || "").toLowerCase()
                            ) && (
                              <option value={block.speaker.id || block.speaker.name}>
                                🎭 {block.speaker.realNickname || block.speaker.name}
                              </option>
                            )}
                        </select>

                        {mbti && (
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            [{mbti}]
                          </span>
                        )}

                        {/* Image / Video Binding: Compact pill or picker */}
                        {activeMediaPicker?.blockIdx === idx && activeMediaPicker.type === "image" ? (
                          <div className="flex items-center gap-1 animate-fadeIn">
                            <select
                              autoFocus
                              value={assignedImageId || ""}
                              onChange={(e) => {
                                if (e.target.value === "__upload_new__") {
                                  targetUploadBlockIdxRef.current = idx;
                                  blockImageUploadRef.current?.click();
                                } else if (e.target.value === "__custom_url__") {
                                  const customUrl = window.prompt("กรุณาระบุลิงก์รูปภาพ หรือ วิดีโอ/GIF ภายนอก (เช่น https://.../ice.jpg หรือ .gif หรือ .mp4):");
                                  if (customUrl && customUrl.trim()) {
                                    handleAssignBlockImage(idx, `url:${customUrl.trim()}`);
                                  }
                                } else {
                                  handleAssignBlockImage(idx, e.target.value);
                                }
                                setActiveMediaPicker(null);
                              }}
                              onBlur={() => setActiveMediaPicker(null)}
                              className="rounded-lg px-2 py-0.5 text-[11px] font-thai bg-slate-950 text-amber-300 border border-amber-500/60 focus:outline-none cursor-pointer max-w-[200px] truncate shadow-md"
                            >
                              <option value="">⚪ ไม่ผูกภาพ (คงภาพเดิม)</option>
                              {sceneImages.map((img, i) => (
                                <option key={img.id} value={img.id}>
                                  {isVideoMedia(img) ? "🎬 วิดีโอ" : "🖼️ ภาพ"} #{i + 1}: {img.caption || img.prompt.slice(0, 20)}
                                </option>
                              ))}
                              <option value="__upload_new__">+ 📁 อัปโหลดภาพ/วิดีโอใหม่สำหรับบทนี้...</option>
                              <option value="__custom_url__">+ 🔗 ใส่ลิงก์รูป/วิดีโอ/GIF ภายนอก...</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setActiveMediaPicker(null)}
                              className="p-0.5 rounded text-slate-400 hover:text-white"
                              title="ปิด"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (assignedImage || assignedImageId) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-300 font-thai font-semibold shadow-sm">
                            <span
                              onClick={() => setActiveMediaPicker({ blockIdx: idx, type: "image" })}
                              className="cursor-pointer hover:underline truncate max-w-[140px] sm:max-w-[180px]"
                              title="คลิกเพื่อเปลี่ยนภาพที่ผูกกับบทนี้"
                            >
                              {isVideoMedia(assignedImage || { filePath: assignedImageId }) ? "🎬" : "🖼️"}{" "}
                              {assignedImage?.caption || (assignedImageId?.startsWith("url:") ? "สื่อจากลิงก์" : "ภาพประจำบท")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAssignBlockImage(idx, "")}
                              className="p-0.5 hover:text-red-400 rounded transition-colors"
                              title="ยกเลิกการผูกภาพนี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveMediaPicker({ blockIdx: idx, type: "image" })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-thai text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 border border-slate-700/60 transition-all active:scale-95"
                            title="ผูกรูปภาพหรือวิดีโอเข้ากับบทพูดนี้"
                          >
                            <ImageIcon className="w-3 h-3 text-slate-400" />
                            <span>+ ภาพ</span>
                          </button>
                        )}

                        {/* Audio Mood Binding: Compact pill or picker */}
                        {activeMediaPicker?.blockIdx === idx && activeMediaPicker.type === "audio" ? (
                          <div className="flex items-center gap-1 animate-fadeIn">
                            <select
                              autoFocus
                              value={assignedAudioValue || ""}
                              onChange={(e) => {
                                if (e.target.value === "__custom_url__") {
                                  const customUrl = window.prompt("กรุณาระบุลิงก์ไฟล์เสียง/เพลงภายนอก (MP3/WAV/Direct URL):");
                                  if (customUrl && customUrl.trim()) {
                                    handleAssignBlockAudio(idx, `url:${customUrl.trim()}`);
                                  }
                                } else {
                                  handleAssignBlockAudio(idx, e.target.value);
                                }
                                setActiveMediaPicker(null);
                              }}
                              onBlur={() => setActiveMediaPicker(null)}
                              className="rounded-lg px-2 py-0.5 text-[11px] font-thai bg-slate-950 text-purple-300 border border-purple-500/60 focus:outline-none cursor-pointer max-w-[190px] truncate shadow-md"
                            >
                              <option value="">⚪ คงเพลงเดิม (ไม่เปลี่ยน)</option>
                              <optgroup label="บรรยากาศเสียงสังเคราะห์">
                                {AUDIO_MOOD_OPTIONS.filter((o) => o.group === "บรรยากาศ").map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="เอฟเฟกต์เสียง">
                                {AUDIO_MOOD_OPTIONS.filter((o) => o.group === "เอฟเฟกต์").map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="ควบคุมเพลง">
                                {AUDIO_MOOD_OPTIONS.filter((o) => o.group === "เพลง").map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                                <option value="__custom_url__">+ 🎵 ใส่ลิงก์เพลงภายนอก...</option>
                              </optgroup>
                            </select>
                            <button
                              type="button"
                              onClick={() => setActiveMediaPicker(null)}
                              className="p-0.5 rounded text-slate-400 hover:text-white"
                              title="ปิด"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : assignedAudioValue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/40 text-[10px] text-purple-300 font-thai font-semibold shadow-sm">
                            <span
                              onClick={() => setActiveMediaPicker({ blockIdx: idx, type: "audio" })}
                              className="cursor-pointer hover:underline truncate max-w-[120px] sm:max-w-[160px]"
                              title="คลิกเพื่อเปลี่ยนอารมณ์เพลง/เสียง"
                            >
                              🎶 {getAudioMoodLabel(assignedAudioValue)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePreviewAudioBinding(assignedAudioValue)}
                              className="p-0.5 hover:text-white rounded transition-colors"
                              title="ทดลองฟังเสียงนี้"
                            >
                              <Volume2 className="w-3 h-3 text-purple-300" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAssignBlockAudio(idx, "")}
                              className="p-0.5 hover:text-red-400 rounded transition-colors"
                              title="ยกเลิกเพลงในบทนี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveMediaPicker({ blockIdx: idx, type: "audio" })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-thai text-slate-400 hover:text-purple-300 hover:bg-slate-800/80 border border-slate-700/60 transition-all active:scale-95"
                            title="เปลี่ยนอารมณ์เพลงหรือใส่เสียงประกอบในประโยคนี้"
                          >
                            <Music className="w-3 h-3 text-slate-400" />
                            <span>+ เพลง</span>
                          </button>
                        )}
                      </div>

                      {/* Right: Action Buttons Toolbar (In normal flow with flex-shrink-0 - NEVER overlapping!) */}
                      <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 flex-shrink-0 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleBlockSide(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-thai font-semibold transition-colors ${
                            block.side === "right"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          }`}
                          title="สลับฝั่งซ้าย/ขวา"
                        >
                          {block.side === "left" ? "ชิดขวา" : "ชิดซ้าย"}
                        </button>
                        <button
                          onClick={() => handleAddBlock("self", idx)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                          title="แทรกประโยคใหม่ด้านล่าง"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveBlock(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveBlock(idx, "down")}
                          disabled={idx === dialogueBlocks.length - 1}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                          title="เลื่อนลง"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(idx)}
                          className="p-1 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300 transition-colors"
                          title="ลบประโยคนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dialogue Row Body: Avatar + Speech Textarea */}
                    <div
                      className={`flex items-start gap-3 ${
                        block.side === "right" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <AvatarIcon />

                      <div className={`flex-1 space-y-1 ${block.side === "right" ? "text-right" : "text-left"}`}>
                        {/* Editable Speech Text */}
                        <textarea
                          rows={2}
                          value={block.text}
                          onChange={(e) => handleUpdateBlockText(idx, e.target.value)}
                          className={`w-full bg-slate-950/40 p-2 rounded-xl font-thai text-sm leading-relaxed text-[#E2E8F0] border border-slate-800/80 focus:bg-slate-950 focus:border focus:border-amber-400/60 focus:outline-none resize-none transition-all shadow-inner ${
                            block.side === "right" ? "text-right" : "text-left"
                          }`}
                        />

                        {/* Assigned Miniature Preview Tags (Image/Video & Audio Mood) */}
                        {((assignedImage || assignedImageId) || assignedAudioValue) && (
                          <div
                            className={`flex items-center gap-2 pt-0.5 flex-wrap ${
                              block.side === "right" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {(assignedImage || assignedImageId) && (() => {
                              const mediaItem = assignedImage || {
                                filePath: (assignedImageId || "").replace(/^url:/, ""),
                                caption: isVideoMedia({ filePath: assignedImageId }) ? "วิดีโอจากลิงก์" : "ภาพจากลิงก์",
                              };
                              const isVid = isVideoMedia(mediaItem);
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-thai">
                                  {isVid ? (
                                    <Film className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                  ) : (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={mediaItem.filePath}
                                      alt=""
                                      className="w-4 h-4 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <span className="truncate max-w-[140px]">
                                    {mediaItem.caption || "ภาพประกอบบทนี้"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssignBlockImage(idx, "");
                                    }}
                                    className="p-0.5 hover:text-red-400 rounded hover:bg-amber-600/30"
                                    title="ยกเลิกภาพ/วิดีโอในบทนี้"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })()}

                            {assignedAudioValue && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/35 text-[10px] text-purple-300 font-thai">
                                <Music className="w-3 h-3 text-purple-400" />
                                <span className="truncate max-w-[180px]">
                                  {getAudioMoodLabel(assignedAudioValue)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviewAudioBinding(assignedAudioValue);
                                  }}
                                  className="p-0.5 hover:text-white rounded hover:bg-purple-600/30"
                                  title="ทดลองฟังเสียงนี้ทันที"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignBlockAudio(idx, "");
                                  }}
                                  className="p-0.5 hover:text-red-400 rounded hover:bg-purple-600/30"
                                  title="ยกเลิกเพลงในบทนี้"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-slate-500 font-thai space-y-3">
                <PenTool className="w-12 h-12 mx-auto text-amber-400/40" />
                <p className="text-sm font-bold text-slate-300">ฉากนี้ยังไม่มีบทสนทนา</p>
                <p className="text-xs text-slate-400">
                  คลิกปุ่มด้านล่างเพื่อเริ่มสร้างบทพูด หรือสั่งให้ AI เขียนฉากนี้ได้ทันที
                </p>
              </div>
            )}
          </div>

          {/* Bottom Quick-Add Toolbar & Save Footer */}
          <div className="flex-shrink-0 pt-2 border-t border-slate-700/50 space-y-2.5">
            {/* Quick Add Line Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleAddBlock("self")}
                className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-thai font-bold transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>+ บทพูดฉัน</span>
              </button>
              <button
                onClick={() => handleAddBlock("friend")}
                className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-thai font-bold transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>+ บทพูดเพื่อน</span>
              </button>
              <button
                onClick={() => handleAddBlock("narration")}
                className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-thai font-bold transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>+ คำบรรยาย</span>
              </button>
              <button
                onClick={() => handleAddBlock("sound")}
                className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-thai font-bold transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>+ เสียงประกอบ</span>
              </button>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={() => handleSaveAll(false)}
                disabled={isSavingScene}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all active:scale-95"
              >
                {isSavingScene ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>{isSavingScene ? "กำลังบันทึก..." : "บันทึกการแก้ไขทั้งหมด"}</span>
              </button>

              <Link
                href={`/projects/${projectId}/read${activeScene ? `?sceneId=${activeScene.id}` : ""}`}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-thai font-bold underline"
              >
                <span>เปิดอ่านใน Reader →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden HTML5 Audio Player for Direct Scene BGM */}
      <audio
        ref={studioAudioPlayerRef}
        loop
        crossOrigin="anonymous"
        className="hidden"
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
        onEnded={() => setIsAudioPlaying(false)}
        onError={(e) => {
          console.warn("Audio element error:", e);
          setIsAudioPlaying(false);
          const ytId = extractYouTubeVideoId(activeScene?.bgmUrl);
          if (!ytId && activeScene?.bgmUrl) {
            toast.error(
              "ไม่สามารถเล่นไฟล์เสียงจากลิงก์นี้ได้ ลิงก์อาจติด CORS หรือไม่ใช่ Direct Audio (.mp3, .wav) แนะนำให้ใช้คลิป YouTube หรืออัปโหลดไฟล์เพลงตรง",
              { duration: 7000 }
            );
          }
        }}
      />

      {/* YouTube Background & Picture-in-Picture Player */}
      {activeScene?.bgmUrl && extractYouTubeVideoId(activeScene.bgmUrl) && (
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
                <span className="truncate font-semibold">{activeScene?.bgmTitle || "YouTube BGM"}</span>
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
            src={`https://www.youtube-nocookie.com/embed/${extractYouTubeVideoId(activeScene.bgmUrl)}?enablejsapi=1&autoplay=${isAudioPlaying ? "1" : "0"}&origin=${typeof window !== "undefined" ? window.location.origin : ""}&loop=1&playlist=${extractYouTubeVideoId(activeScene.bgmUrl)}`}
            title="Scene YouTube Audio Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className={showMiniVideoPlayer ? "w-full aspect-video" : "w-[2px] h-[2px] pointer-events-none"}
            onLoad={() => {
              if (isAudioPlaying) {
                youtubeIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                  "*"
                );
                youtubeIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({
                    event: "command",
                    func: "setVolume",
                    args: [Math.round((isAudioMuted ? 0 : audioVolume) * 100)],
                  }),
                  "*"
                );
              }
            }}
          />
        </div>
      )}

      {/* Scene Audio URL & YouTube Modal */}
      <SceneAudioModal
        isOpen={showAudioModal}
        onClose={() => setShowAudioModal(false)}
        currentUrl={activeScene?.bgmUrl}
        currentTitle={activeScene?.bgmTitle}
        onSave={async (url, title) => {
          await handleSetAudioUrl(url, title);
        }}
        onDelete={activeScene?.bgmUrl ? handleDeleteAudio : undefined}
      />

      {/* Hidden File Inputs */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*,video/*,.gif,.mp4,.webm,.mov"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadSceneImage(file);
        }}
      />
      <input
        ref={blockImageUploadRef}
        type="file"
        accept="image/*,video/*,.gif,.mp4,.webm,.mov"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && targetUploadBlockIdxRef.current !== null) {
            handleUploadSceneImage(file, targetUploadBlockIdxRef.current);
          }
        }}
      />
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUploadAudioFile}
      />

      {/* ========================================================================= */}
      {/* MODAL 1: AI Image Generator Modal                                        */}
      {/* ========================================================================= */}
      {showAiImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="cinematic-card w-full max-w-lg rounded-2xl p-6 border-slate-700 space-y-4 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>สั่ง AI สร้างภาพประกอบประจำฉาก</span>
              </h3>
              <button
                onClick={() => setShowAiImageModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-thai">
              <label className="text-xs font-semibold text-slate-300">
                คำอธิบายภาพ (Prompt):
              </label>
              <textarea
                rows={4}
                value={aiImagePromptInput}
                onChange={(e) => setAiImagePromptInput(e.target.value)}
                placeholder="เช่น กองทัพบาราเธียนแตกพ่ายบนชายหาดแบล็กวอเตอร์ เปลวไฟสีเขียวสว่างวาบ..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAiImageModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-thai"
              >
                ยกเลิก
              </button>
              <button
                disabled={isGeneratingAiImage || !aiImagePromptInput.trim()}
                onClick={handleGenerateAiImage}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isGeneratingAiImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isGeneratingAiImage ? "กำลังวาดภาพ..." : "สร้างภาพทันที"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Create New Scene Modal                                          */}
      {/* ========================================================================= */}
      {showNewSceneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="cinematic-card w-full max-w-lg rounded-2xl p-6 border-slate-700 space-y-4 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white">เพิ่มฉากใหม่ในเรื่อง (New EP)</h3>
              <button
                onClick={() => setShowNewSceneModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-thai">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  ชื่อฉาก <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น เผชิญหน้าสภาเงา, เพลิงไหม้ที่ท่าเรือ"
                  value={newSceneTitle}
                  onChange={(e) => setNewSceneTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">สถานที่เกิดเหตุ</label>
                <input
                  type="text"
                  placeholder="เช่น Dragonstone Crypts, King's Landing"
                  value={newSceneLocation}
                  onChange={(e) => setNewSceneLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  เลือกตัวละครที่จะอยู่ในฉากนี้
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-900 rounded-lg border border-slate-800">
                  {characters.map((c) => {
                    const isChecked = newSceneSelectedChars.includes(c.name);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSceneSelectedChars((prev) => [...prev, c.name]);
                            } else {
                              setNewSceneSelectedChars((prev) =>
                                prev.filter((n) => n !== c.name)
                              );
                            }
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-amber-500"
                        />
                        <span className="truncate">
                          {c.characterType === "self" ? "👑 " : c.characterType === "friend" ? "🧑‍🤝‍🧑 " : ""}
                          {c.name} {c.realNickname ? `(${c.realNickname})` : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewSceneModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-thai"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateScene}
                className="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400 shadow"
              >
                สร้างฉากใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Continuity & Moments Analysis Modal                             */}
      {/* ========================================================================= */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="cinematic-card w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl p-6 border-slate-700 space-y-4 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>ผลวิเคราะห์ความต่อเนื่อง & จังหวะพัฒนาการ (Continuity Check)</span>
              </h3>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-thai text-xs">
              {/* Consistency Flag */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  analysisResult.continuity_check?.is_consistent
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : "bg-red-950/40 border-red-500/40 text-red-200"
                }`}
              >
                {analysisResult.continuity_check?.is_consistent ? (
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {analysisResult.continuity_check?.is_consistent
                      ? "ฉากนี้สอดคล้องกับ Canon และประวัติศาสตร์ที่ผ่านมา"
                      : "พบจุดที่ขัดแย้งกับประวัติศาสตร์เดิม (Canon Deviation)"}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {analysisResult.continuity_check?.explanation}
                  </p>
                </div>
              </div>

              {/* Character Shifts */}
              {analysisResult.character_shifts && analysisResult.character_shifts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-amber-300">การเปลี่ยนแปลงตัวละครในฉากนี้:</h4>
                  <div className="space-y-2">
                    {analysisResult.character_shifts.map((shift: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="font-bold text-white text-xs">{shift.character_name}</span>
                        <p className="text-slate-400 text-[11px] mt-1">{shift.shift_reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-thai"
              >
                ปิด
              </button>
              <button
                disabled={isApplyingLedger}
                onClick={handleConfirmLedgerUpdate}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai shadow"
              >
                {isApplyingLedger ? "กำลังบันทึก..." : "บันทึกอัปเดตสถานะลงสมุดทะเบียน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <div
            className="relative max-w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideoMedia({ filePath: lightboxImage }) ? (
              <video
                src={lightboxImage}
                controls
                autoPlay
                loop
                playsInline
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={lightboxImage}
                alt="Fullscreen Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              />
            )}

            {/* Lightbox Action Controls */}
            <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
              {isVideoMedia({ filePath: lightboxImage }) ? (
                <button
                  onClick={() => {
                    const targetImg = sceneImages.find((img) => img.filePath === lightboxImage);
                    const timing = getVideoTiming(targetImg);
                    setVideoTrimData({
                      isOpen: true,
                      videoSrc: lightboxImage,
                      videoId: targetImg?.id,
                      startTime: timing.startTime,
                      endTime: timing.endTime,
                      caption: targetImg?.caption || "",
                    });
                    setLightboxImage(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs font-thai flex items-center gap-2 shadow transition-all"
                >
                  <Scissors className="w-4 h-4 text-amber-400" />
                  <span>เลือกช่วงวิดีโอ (Trim)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const targetImg = sceneImages.find((img) => img.filePath === lightboxImage);
                    setCropModalData({
                      isOpen: true,
                      imageSrc: lightboxImage,
                      imageId: targetImg?.id,
                      defaultAspect: "16:9",
                    });
                    setLightboxImage(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs font-thai flex items-center gap-2 shadow transition-all"
                >
                  <Crop className="w-4 h-4 text-amber-400" />
                  <span>ครอปรูปภาพนี้</span>
                </button>
              )}

              <button
                onClick={() => {
                  handleSetAsCover(lightboxImage);
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs font-thai flex items-center gap-2 shadow transition-all ${
                  project?.coverImage === lightboxImage
                    ? "bg-amber-400 text-slate-950"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>{project?.coverImage === lightboxImage ? "✓ หน้าปกเรื่องแล้ว" : "ตั้งเป็นภาพหน้าปกนิยาย"}</span>
              </button>

              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-thai"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {cropModalData && (
        <ImageCropModal
          isOpen={cropModalData.isOpen}
          onClose={() => setCropModalData(null)}
          imageSrc={cropModalData.imageSrc}
          imageId={cropModalData.imageId}
          sceneId={activeSceneId}
          projectId={projectId}
          defaultAspect={cropModalData.defaultAspect || "16:9"}
          onCropSuccess={handleCropSuccess}
        />
      )}

      {/* Video Trim Modal */}
      {videoTrimData && (
        <VideoTrimModal
          isOpen={videoTrimData.isOpen}
          onClose={() => setVideoTrimData(null)}
          videoSrc={videoTrimData.videoSrc}
          videoId={videoTrimData.videoId}
          sceneId={activeSceneId}
          projectId={projectId}
          initialStartTime={videoTrimData.startTime || 0}
          initialEndTime={videoTrimData.endTime || null}
          initialCaption={videoTrimData.caption || ""}
          onTrimSuccess={handleTrimSuccess}
        />
      )}

      {/* Collaborator & Squad Co-Authors Modal */}
      <CollaboratorModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        projectId={projectId}
        projectTitle={project?.title || "Story Studio"}
        universe={project?.universe || ""}
        onCollaboratorChange={() => {
          fetch(`/api/projects/${projectId}/collaborators`)
            .then((res) => res.json())
            .then((data) => {
              if (data.collaborators) setCollaborators(data.collaborators);
            })
            .catch(() => {});
        }}
      />

      {/* Claude Script Import Modal */}
      <ClaudeScriptImportModal
        isOpen={showClaudeImportModal}
        onClose={() => setShowClaudeImportModal(false)}
        characters={characters}
        activePartTitle={currentPart?.title}
        currentSceneTitle={sceneTitleInput || activeScene?.title}
        onApplySingleScene={handleConvertAndApplyScript}
        onApplyMultiScenes={handleImportAllScenes}
      />
    </div>
  );
}
