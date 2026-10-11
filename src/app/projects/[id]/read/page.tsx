"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
  Music,
  SlidersHorizontal,
  PenTool,
  User,
  Users,
  Compass,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { ambientSound } from "@/lib/audio/ambientSynth";

interface SceneImage {
  id: string;
  prompt: string;
  filePath: string;
  kind: "portrait" | "scene" | "cover" | "movie_still" | "reference";
  approved: number;
  caption?: string;
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
  charactersPresentParsed?: string[];
  images?: SceneImage[];
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
  characterType?: "self" | "friend" | "canon";
  realNickname?: string;
  avatarUrl?: string;
  currentMbti?: string;
  faction?: string;
  chosenRole?: string;
}

type AudioTrack = "wildfire" | "winter" | "war" | "shadows";

interface DialogueBlock {
  id: string;
  type: "dialogue" | "narration" | "sound";
  speaker?: CharacterItem | null;
  speakerName?: string;
  side: "left" | "right";
  text: string;
}

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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [readerViewMode, setReaderViewMode] = useState<"dialogue" | "prose">("dialogue");
  const [loading, setLoading] = useState(true);

  // Audio BGM State
  const [isPlayingBgm, setIsPlayingBgm] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>("wildfire");
  const [volume, setVolume] = useState(0.45);
  const [showAudioControls, setShowAudioControls] = useState(false);

  // Stop ambient sound when leaving page
  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  // Fetch project and scene data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const data = await res.json();

        setProject(data.project);
        setParts(data.parts || []);
        setCharacters(data.characters || []);

        // Flatten all scenes across all parts
        const flatList: { part: PartItem; scene: SceneItem }[] = [];
        (data.parts || []).forEach((p: PartItem) => {
          (p.scenes || []).forEach((s: SceneItem) => {
            flatList.push({ part: p, scene: s });
          });
        });
        setAllScenesList(flatList);

        if (flatList.length > 0) {
          if (initialSceneId) {
            const found = flatList.find((item) => item.scene.id === initialSceneId);
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
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, initialSceneId]);

  const loadSceneImages = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveSceneImages(data.images || []);
      setSelectedImageIndex(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSceneItem = (scene: SceneItem) => {
    setActiveScene(scene);
    loadSceneImages(scene.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Toggle BGM Playback
  const handleToggleBgm = (trackOverride?: AudioTrack) => {
    const targetTrack = trackOverride || currentTrack;
    if (isPlayingBgm && !trackOverride) {
      ambientSound.stop();
      setIsPlayingBgm(false);
      toast.info("ปิดเสียงเพลงบรรยากาศเรียบร้อย");
    } else {
      ambientSound.setVolume(volume);
      ambientSound.play(targetTrack);
      setIsPlayingBgm(true);
      setCurrentTrack(targetTrack);
      const trackLabels: Record<AudioTrack, string> = {
        wildfire: "เพลิงป่า (Wildfire Drone)",
        winter: "ลมเหมันต์ (Winter Winds)",
        war: "มหากาพย์ศึก (War Drums)",
        shadows: "เงาทมิฬ (Shadows Ethereal)",
      };
      toast.success(`กำลังเล่นเพลง: ${trackLabels[targetTrack]}`);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ambientSound.setVolume(newVol);
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

  const currentFeaturedImage =
    activeSceneImages.length > 0
      ? activeSceneImages[selectedImageIndex] || activeSceneImages[0]
      : null;

  // Font size classes for reading prose
  const fontClass =
    fontSize === "xlarge"
      ? "text-lg leading-loose"
      : fontSize === "large"
      ? "text-base leading-relaxed"
      : "text-sm leading-relaxed";

  // Parse markdown into Dialogue Blocks for Visual Novel Mode
  const parseSceneToDialogueBlocks = (contentMarkdown: string): DialogueBlock[] => {
    if (!contentMarkdown) return [];

    const lines = contentMarkdown
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const blocks: DialogueBlock[] = [];
    const selfChar = characters.find((c) => c.characterType === "self") || null;
    const friendChars = characters.filter((c) => c.characterType === "friend");

    let speechTurn = 0;

    lines.forEach((line, index) => {
      // 1. Check if line is Sound Effect / Atmospheric stage direction
      const isSound =
        line.startsWith("เสียง") ||
        line.includes("..........") ||
        line.includes(".....") ||
        (line.startsWith("*") && line.endsWith("*")) ||
        (line.startsWith("(") && line.endsWith(")"));

      if (isSound) {
        blocks.push({
          id: `sound-${index}`,
          type: "sound",
          side: "left",
          text: line.replace(/^\*+|\*+$/g, ""),
        });
        return;
      }

      // 2. Check if line is Dialogue (quoted with "..." or “...”)
      const quoteMatch = line.match(/^["“](.+?)["”](.*)$/);
      const speakerPrefixMatch = line.match(/^([^:：]+)[:：]\s*["“]?(.*?)["”]?$/);

      if (quoteMatch || speakerPrefixMatch) {
        speechTurn++;
        const isOdd = speechTurn % 2 !== 0;

        let speakerName = "";
        let speechText = line;
        let speakerObj: CharacterItem | null = null;

        if (speakerPrefixMatch) {
          speakerName = speakerPrefixMatch[1].trim();
          speechText = speakerPrefixMatch[2] || line;
          speakerObj =
            characters.find(
              (c) =>
                c.name.toLowerCase() === speakerName.toLowerCase() ||
                (c.realNickname && c.realNickname.toLowerCase() === speakerName.toLowerCase())
            ) || null;
        } else if (quoteMatch) {
          speechText = line;
          // Determine speaker: if odd, assign User Character (Self); if even, assign Friend or counterpart
          if (isOdd && selfChar) {
            speakerObj = selfChar;
            speakerName = selfChar.realNickname || selfChar.name;
          } else if (!isOdd && friendChars.length > 0) {
            speakerObj = friendChars[(Math.floor(speechTurn / 2) - 1) % friendChars.length];
            speakerName = speakerObj.realNickname || speakerObj.name;
          }
        }

        // Left side for Self/Protagonist, Right side for Friend/Reply (matching Figma screenshot)
        const isSelf = speakerObj?.characterType === "self" || (!speakerObj && isOdd);
        const side = isSelf ? "left" : "right";

        blocks.push({
          id: `dialogue-${index}`,
          type: "dialogue",
          speaker: speakerObj || (isSelf ? selfChar : friendChars[0] || null),
          speakerName: speakerName || (isSelf ? selfChar?.realNickname || "ฉัน" : "เพื่อน"),
          side,
          text: speechText,
        });
      } else {
        // 3. Descriptive scene narration
        // If in dialogue mode, we alternate narrative speech or format as atmospheric card
        speechTurn++;
        const isOdd = speechTurn % 2 !== 0;
        const assignedSpeaker = isOdd ? selfChar : friendChars[0] || null;

        blocks.push({
          id: `narr-${index}`,
          type: "narration",
          speaker: assignedSpeaker,
          side: isOdd ? "left" : "right",
          text: line,
        });
      }
    });

    return blocks;
  };

  const parsedBlocks = activeScene
    ? parseSceneToDialogueBlocks(activeScene.contentMarkdown)
    : [];

  // Bottom caption on the left card (first descriptive sentence or caption)
  const leftCardCaption =
    currentFeaturedImage?.caption ||
    (parsedBlocks.length > 0 ? parsedBlocks[0].text : "") ||
    "กลิ่นของไฟป่า (Wildfire) ยังคงติดแน่นอยู่ในชั้นบรรยากาศ มันไม่ได้มีกลิ่นเหมือนฟืนไหม้ทั่วไป แต่เป็นกลิ่นฉุนแสบจมูกของสารเคมีโบราณที่เผาผลาญทั้งไม้ เหล็ก และเนื้อมนุษย์จนกลายเป็นเถ้าสีมรกต";

  if (loading) {
    return (
      <div className="max-w-[1720px] mx-auto space-y-6 py-8 px-4">
        <div className="h-16 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 h-[720px] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          <div className="lg:col-span-6 h-[720px] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 pb-20 pt-2 px-3 sm:px-6 max-w-[1850px] mx-auto">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & BREADCRUMBS WITH MUSIC PLAYER (182x38px Figma Widget)     */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-800/80 pb-4 mb-6 pt-2 space-y-4">
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

          {/* Right: Ambient BGM Music Player Widget (Figma 182x38px placeholder) */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="relative">
              <div
                className={`w-[188px] h-[38px] rounded-xl px-2.5 flex items-center justify-between gap-2 border transition-all ${
                  isPlayingBgm
                    ? "bg-[#161a23] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40"
                    : "bg-[#111622] border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Play / Pause Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleBgm()}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isPlayingBgm
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  }`}
                  title={isPlayingBgm ? "หยุดเล่นเพลง" : "เปิดเพลงบรรยากาศ (BGM)"}
                >
                  {isPlayingBgm ? (
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
                    {isPlayingBgm ? (
                      <div className="flex items-end gap-[2px] h-3.5 w-3.5 flex-shrink-0">
                        <span className="w-[2px] bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                        <span className="w-[2px] bg-amber-400 rounded-full animate-bounce [animation-delay:-0.1s] h-4" />
                        <span className="w-[2px] bg-amber-400 rounded-full animate-bounce [animation-delay:-0.2s] h-2" />
                      </div>
                    ) : (
                      <Music className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-[11px] font-thai font-semibold text-slate-200 truncate">
                      {isPlayingBgm
                        ? currentTrack === "wildfire"
                          ? "🔥 เพลิงป่า"
                          : currentTrack === "winter"
                          ? "❄️ ลมเหมันต์"
                          : currentTrack === "war"
                          ? "⚔️ กลองศึก"
                          : "🌑 เงาทมิฬ"
                        : "เปิดเพลง BGM"}
                    </span>
                  </div>
                </div>

                {/* Track Selector / Volume settings button */}
                <button
                  type="button"
                  onClick={() => setShowAudioControls(!showAudioControls)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="ตัวเลือกเสียงบรรยากาศ"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* BGM Dropdown Settings Panel */}
              {showAudioControls && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0e131d] border border-slate-700 p-3 shadow-2xl z-50 animate-fadeIn space-y-3 font-thai">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      <span>เสียงดนตรีบรรยากาศ Dark AU</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Web Audio Synth</span>
                  </div>

                  {/* Track Selection Buttons */}
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-medium">เลือกบรรยากาศ:</p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        onClick={() => handleToggleBgm("wildfire")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          currentTrack === "wildfire" && isPlayingBgm
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        🔥 เพลิงป่า
                      </button>
                      <button
                        onClick={() => handleToggleBgm("winter")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          currentTrack === "winter" && isPlayingBgm
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/50"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        ❄️ ลมเหมันต์
                      </button>
                      <button
                        onClick={() => handleToggleBgm("war")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          currentTrack === "war" && isPlayingBgm
                            ? "bg-red-500/20 text-red-300 border-red-500/50"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        ⚔️ กลองศึก
                      </button>
                      <button
                        onClick={() => handleToggleBgm("shadows")}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                          currentTrack === "shadows" && isPlayingBgm
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        🌑 เงาทมิฬ
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>ระดับความดัง</span>
                      </span>
                      <span className="font-mono">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Reader / Studio / Bible / Images / Timeline) */}
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

          {/* Quick Scene Selector on Right */}
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
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SPLIT-SCREEN CONTAINER (Figma #313131 cards with #2D2D2D inset)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: Large Image Card (#313131, rounded-2xl, inner rounded 13px) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl p-5 bg-[#313131] border border-slate-700/60 shadow-2xl space-y-4">
            {/* Main Cinematic Image Display */}
            <div className="relative w-full aspect-[16/10] sm:h-[520px] rounded-[13px] overflow-hidden bg-[#1e232d] group border border-black/20">
              {currentFeaturedImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentFeaturedImage.filePath}
                    alt={currentFeaturedImage.caption || currentFeaturedImage.prompt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                  />

                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Image Type Tag Badge */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    {currentFeaturedImage.kind === "movie_still" || currentFeaturedImage.kind === "reference" ? (
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
                  <Film className="w-12 h-12 mb-3 text-slate-600" />
                  <p className="font-thai font-semibold text-slate-300">ยังไม่มีภาพประกอบสำหรับฉากนี้</p>
                  <p className="text-xs font-thai text-slate-500 mt-1 max-w-sm">
                    คุณสามารถสลับไปที่ Studio เพื่อสั่ง AI สร้างภาพประกอบ หรืออัปโหลดภาพจริงจากหนัง
                  </p>
                  <Link
                    href={`/projects/${projectId}`}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-thai font-bold hover:bg-amber-500/30 transition-colors"
                  >
                    ไปที่ Studio เพื่อใส่รูป
                  </Link>
                </div>
              )}
            </div>

            {/* Thumbnail Strip if multiple images exist */}
            {activeSceneImages.length > 1 && (
              <div className="space-y-1.5 pt-1">
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.filePath}
                          alt={img.caption || ""}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-bold bg-black/80 text-white font-mono">
                          {isMovie ? "MOVIE" : "AI"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Atmospheric sensory caption underneath the image (Matching Figma & Screenshot) */}
            <div className="p-2 pt-1 border-t border-slate-700/50">
              <p className="text-sm font-thai text-[#E2E8F0] leading-relaxed">
                {leftCardCaption}
              </p>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Dialogue & Scene Narrative Card (#313131 with #2D2D2D)     */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl p-6 bg-[#313131] border border-slate-700/60 shadow-2xl space-y-6">
            {/* Header: Part subtitle & Scene Title */}
            <div className="space-y-2 border-b border-slate-700/50 pb-4">
              {currentPart && (
                <div className="text-[11px] font-mono font-bold text-[#FBBF24] tracking-wider uppercase">
                  PART {currentPart.number}: {currentPart.title}
                </div>
              )}

              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                ฉากที่ {activeScene?.order || 1}: {activeScene?.title || "เถ้าถ่านสีมรกตเหนืออ่าวแบล็กวอเตอร์"}
              </h2>

              {/* Location & Reader Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-thai">
                <div className="flex items-center gap-2">
                  {activeScene?.location && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{activeScene.location}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>~{Math.max(1, Math.round((activeScene?.wordCount || 300) / 250))} นาที</span>
                  </span>
                </div>

                {/* View Mode Toggle: Visual Dialogue vs Prose */}
                <div className="flex items-center gap-1 bg-[#242424] p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setReaderViewMode("dialogue")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      readerViewMode === "dialogue"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="โหมดบทสนทนาและโปรไฟล์ตัวละคร"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>บทสนทนา</span>
                  </button>

                  <button
                    onClick={() => setReaderViewMode("prose")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      readerViewMode === "prose"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="โหมดอ่านวรรณกรรม / นิยายเต็ม"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>นิยายเต็ม</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Inner Dialogue Container (#2D2D2D, rounded-[18px]) */}
            <div className="rounded-[18px] bg-[#2D2D2D] p-5 border border-slate-700/40 min-h-[480px]">
              {readerViewMode === "dialogue" ? (
                /* ============================================================= */
                /* VISUAL DIALOGUE STREAM (Matching Figma & Screenshot)          */
                /* ============================================================= */
                <div className="space-y-4">
                  {parsedBlocks.length > 0 ? (
                    parsedBlocks.map((block) => {
                      // 1. SOUND EFFECT ROW (Centered atmospheric text)
                      if (block.type === "sound") {
                        return (
                          <div
                            key={block.id}
                            className="py-3 px-4 text-center text-slate-300 font-thai text-sm italic tracking-widest opacity-90 select-none animate-fadeIn"
                          >
                            {block.text}
                          </div>
                        );
                      }

                      // Determine Avatar Attributes
                      const isSelf = block.speaker?.characterType === "self";
                      const isFriend = block.speaker?.characterType === "friend";
                      const avatarUrl = block.speaker?.avatarUrl;
                      const displayName =
                        block.speaker?.realNickname || block.speaker?.name || block.speakerName || "ผู้พูด";
                      const mbti = block.speaker?.currentMbti;

                      // Avatar Component
                      const AvatarIcon = () => (
                        <div
                          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-md transition-transform hover:scale-110 ${
                            isSelf
                              ? "border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/60 text-amber-300"
                              : isFriend
                              ? "border-sky-400 ring-2 ring-sky-400/40 bg-sky-950/60 text-sky-300"
                              : "border-slate-500 bg-slate-800 text-slate-300"
                          }`}
                          title={`${displayName} (${isSelf ? "ตัวละครของฉัน" : isFriend ? "เพื่อน" : "ตัวละคร"})`}
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

                      // DIALOGUE / NARRATIVE ROWS
                      if (block.side === "left") {
                        // Speaker / User on LEFT, Text on RIGHT
                        return (
                          <div
                            key={block.id}
                            className="flex items-start gap-3.5 group p-2 rounded-xl hover:bg-black/10 transition-colors animate-fadeIn"
                          >
                            <AvatarIcon />

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-thai font-bold ${
                                    isSelf ? "text-amber-400" : isFriend ? "text-sky-400" : "text-slate-300"
                                  }`}
                                >
                                  {isSelf ? "👑 " : ""}{displayName}
                                </span>
                                {mbti && (
                                  <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                    [{mbti}]
                                  </span>
                                )}
                              </div>
                              <p className={`font-thai text-[#E2E8F0] ${fontClass} leading-relaxed`}>
                                {block.text}
                              </p>
                            </div>
                          </div>
                        );
                      } else {
                        // Text on LEFT, Speaker / Friend on RIGHT (Figma Alternating Style)
                        return (
                          <div
                            key={block.id}
                            className="flex items-start justify-end gap-3.5 group p-2 rounded-xl hover:bg-black/10 transition-colors animate-fadeIn"
                          >
                            <div className="flex-1 space-y-1 text-right">
                              <div className="flex items-center justify-end gap-2">
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
                              <p className={`font-thai text-[#E2E8F0] ${fontClass} leading-relaxed text-right`}>
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
                </div>
              ) : (
                /* ============================================================= */
                /* PROSE NOVEL READER MODE                                       */
                /* ============================================================= */
                <div className={`prose prose-invert prose-amber max-w-none font-thai text-slate-200 ${fontClass}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeScene?.contentMarkdown || "ยังไม่มีเนื้อหา"}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Bottom Chapter Switcher Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-700/50">
              {prevSceneItem ? (
                <button
                  onClick={() => handleSelectSceneItem(prevSceneItem.scene)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-thai font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500">ฉากก่อนหน้า</p>
                    <p className="truncate max-w-[160px]">{prevSceneItem.scene.title}</p>
                  </div>
                </button>
              ) : (
                <div />
              )}

              {nextSceneItem ? (
                <button
                  onClick={() => handleSelectSceneItem(nextSceneItem.scene)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-thai shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all"
                >
                  <div className="text-right">
                    <p className="text-[10px] text-slate-900/80">อ่านฉากถัดไป</p>
                    <p className="truncate max-w-[160px]">{nextSceneItem.scene.title}</p>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href={`/projects/${projectId}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-thai font-semibold hover:bg-amber-500/30 transition-colors"
                >
                  <PenTool className="w-4 h-4" />
                  <span>จบเนื้อเรื่องที่มีอยู่แล้ว • ไปเขียนต่อที่ Studio</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Fullscreen Preview"
            className="max-w-full max-h-[92vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
