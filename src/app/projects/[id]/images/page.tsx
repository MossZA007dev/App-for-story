"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import {
  Image as ImageIcon,
  Sparkles,
  Film,
  Upload,
  Link as LinkIcon,
  Check,
  X,
  Trash2,
  RefreshCw,
  Maximize2,
  ChevronDown,
  Layers,
  BookOpen,
  Eye,
  Sliders,
  Camera,
  ArrowRight,
  Filter,
  Crop,
  Crown,
  Scissors,
  Video,
  Play,
  Volume2,
  VolumeX,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ImageCropModal, AspectRatioType } from "@/components/images/ImageCropModal";
import { VideoTrimModal } from "@/components/media/VideoTrimModal";

interface SceneOption {
  id: string;
  order: number;
  title: string;
  summary: string;
  contentMarkdown: string;
}

interface ImageItem {
  id: string;
  projectId: string;
  sceneId: string | null;
  characterId: string | null;
  prompt: string;
  negativePrompt?: string;
  provider: string;
  seed?: string;
  filePath: string;
  kind: "portrait" | "scene" | "cover" | "movie_still" | "reference";
  approved: number;
  caption?: string;
  createdAt: string;
  sceneTitle?: string;
  sceneOrder?: number;
  metadata?: string | null;
}

interface VisualMoment {
  momentTitle: string;
  description: string;
  suggestedPrompt: string;
  focalCharacters: string[];
}

export default function ImageStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [scenesList, setScenesList] = useState<SceneOption[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [imagesList, setImagesList] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterSceneOnly, setFilterSceneOnly] = useState(false);
  const [filterApprovedOnly, setFilterApprovedOnly] = useState(false);

  // Generation Form state
  const [promptInput, setPromptInput] = useState("");
  const [negativePromptInput, setNegativePromptInput] = useState("");
  const [kindInput, setKindInput] = useState<"scene" | "portrait" | "cover">("scene");
  const [isGenerating, setIsGenerating] = useState(false);

  // Visual Moments state
  const [isAnalyzingMoments, setIsAnalyzingMoments] = useState(false);
  const [extractedMoments, setExtractedMoments] = useState<VisualMoment[]>([]);

  // Movie Still upload modal
  const [showAddStillModal, setShowAddStillModal] = useState(false);
  const [stillUrlInput, setStillUrlInput] = useState("");
  const [stillCaptionInput, setStillCaptionInput] = useState("");
  const [isUploadingStill, setIsUploadingStill] = useState(false);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<ImageItem | null>(null);

  // Crop Modal state
  const [cropModalData, setCropModalData] = useState<{
    isOpen: boolean;
    imageSrc: string;
    imageId?: string;
    defaultAspect?: AspectRatioType;
  } | null>(null);

  // Video Trim Modal state
  const [videoTrimData, setVideoTrimData] = useState<{
    isOpen: boolean;
    videoSrc: string;
    videoId?: string;
    startTime?: number;
    endTime?: number | null;
    caption?: string;
  } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [projectId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [projRes, imgRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/images`),
      ]);

      if (projRes.ok) {
        const pData = await projRes.json();
        setProject(pData.project);

        // Collect all scenes from all parts
        const allScenes: SceneOption[] = [];
        (pData.project.parts || []).forEach((part: any) => {
          (part.scenes || []).forEach((sc: any) => {
            allScenes.push({
              id: sc.id,
              order: sc.order,
              title: sc.title,
              summary: sc.summary || "",
              contentMarkdown: sc.contentMarkdown || "",
            });
          });
        });

        setScenesList(allScenes);
        if (allScenes.length > 0) {
          setSelectedSceneId(allScenes[0].id);
          // Auto fill initial prompt based on scene
          setPromptInput(`Cinematic scene of ${allScenes[0].title}, ${pData.project.universe}`);
        }
      }

      if (imgRes.ok) {
        const iData = await imgRes.json();
        setImagesList(iData.images || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScene = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setExtractedMoments([]);
    const sc = scenesList.find((s) => s.id === sceneId);
    if (sc) {
      setPromptInput(
        `Cinematic dark illustration of ${sc.title}, setting in ${project?.universe || "dark fantasy"}`
      );
    }
  };

  // AI Extract 3 Visual Moments
  const handleExtractMoments = async () => {
    if (!selectedSceneId) {
      toast.error("กรุณาเลือกฉากก่อน");
      return;
    }

    try {
      setIsAnalyzingMoments(true);
      const res = await fetch(
        `/api/projects/${projectId}/scenes/${selectedSceneId}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applyDirectly: false }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "วิเคราะห์จังหวะภาพล้มเหลว");

      const moments = data.analysis?.suggestedVisualMoments || [];
      if (moments.length === 0) {
        toast.info("ไม่พบจังหวะภาพที่แนะนำจากฉากนี้");
      } else {
        setExtractedMoments(moments);
        toast.success(`AI สกัด 3 จังหวะน่าวาดเรียบร้อยแล้ว!`);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "วิเคราะห์จังหวะภาพล้มเหลว";
      toast.error(msg);
    } finally {
      setIsAnalyzingMoments(false);
    }
  };

  const handleUseMomentPrompt = (moment: VisualMoment) => {
    setPromptInput(moment.suggestedPrompt);
    toast.info(`นำจังหวะ "${moment.momentTitle}" มาใส่ในช่อง Prompt แล้ว`);
  };

  // Generate Image
  const handleGenerateImage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) {
      toast.error("กรุณากรอก Prompt ก่อนสร้างภาพ");
      return;
    }

    try {
      setIsGenerating(true);
      toast.loading("AI กำลังเรนเดอร์ภาพ...", { id: "img-gen" });

      const res = await fetch(`/api/projects/${projectId}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: selectedSceneId || undefined,
          prompt: promptInput,
          negativePrompt: negativePromptInput,
          kind: kindInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างภาพไม่สำเร็จ");

      toast.success("สร้างภาพประกอบสำเร็จ!", { id: "img-gen" });
      setImagesList((prev) => [data.image, ...prev]);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "สร้างภาพล้มเหลว";
      toast.error(msg, { id: "img-gen" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Approve
  const handleToggleApprove = async (image: ImageItem) => {
    const nextApproved = image.approved === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/projects/${projectId}/images/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: nextApproved }),
      });

      if (!res.ok) throw new Error("อัปเดตไม่สำเร็จ");

      setImagesList((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, approved: nextApproved } : img
        )
      );

      toast.success(
        nextApproved === 1
          ? "✓ อนุมัติภาพแล้ว (จะแสดงในโหมดอ่านนิยาย Reader)"
          : "ยกเลิกการอนุมัติภาพ"
      );
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการอนุมัติภาพ");
    }
  };

  // Delete Image
  const handleDeleteImage = async (image: ImageItem) => {
    if (!confirm("คุณแน่ใจว่าต้องการลบรูปภาพนี้?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/images/${image.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("ลบรูปภาพไม่สำเร็จ");

      setImagesList((prev) => prev.filter((img) => img.id !== image.id));
      if (lightboxImage?.id === image.id) setLightboxImage(null);
      toast.success("ลบรูปภาพเรียบร้อย");
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการลบรูปภาพ");
    }
  };

  // Set as Project Cover
  const handleSetAsCover = async (image: ImageItem | string) => {
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

  // Video trim success handler
  const handleTrimSuccess = (updatedMedia: any) => {
    setImagesList((prev) => {
      const idx = prev.findIndex((img) => img.id === updatedMedia.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedMedia };
        return next;
      }
      return [updatedMedia, ...prev];
    });
  };

  // Crop Success Handler
  const handleCropSuccess = (savedImage: any, isCover?: boolean) => {
    setImagesList((prev) => {
      const exists = prev.findIndex((img) => img.id === savedImage.id);
      if (exists !== -1) {
        const next = [...prev];
        next[exists] = savedImage;
        return next;
      }
      return [savedImage, ...prev];
    });
    if (isCover) {
      setProject((prev: any) => (prev ? { ...prev, coverImage: savedImage.filePath } : prev));
    }
  };

  // Add Movie Still Reference
  const handleAddStillFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stillUrlInput.trim()) {
      toast.error("กรุณาระบุ URL ของรูปภาพหรือวิดีโอ");
      return;
    }

    try {
      setIsUploadingStill(true);
      const res = await fetch(`/api/projects/${projectId}/images/reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: selectedSceneId || undefined,
          imageUrl: stillUrlInput.trim(),
          caption: stillCaptionInput.trim() || "ภาพ/วิดีโอนิ่งจากภาพยนตร์ต้นฉบับ",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เพิ่มรูปภาพหรือวิดีโอไม่สำเร็จ");

      toast.success("เพิ่มสื่อประกอบจริงเรียบร้อย!");
      setImagesList((prev) => [data.image, ...prev]);
      setShowAddStillModal(false);
      setStillUrlInput("");
      setStillCaptionInput("");

      if (isVideoMedia(data.image)) {
        toast.info("คุณสามารถเลือกช่วงเวลาของวิดีโอนี้ได้ทันที");
        setVideoTrimData({
          isOpen: true,
          videoSrc: data.image.filePath,
          videoId: data.image.id,
          startTime: 0,
          endTime: null,
          caption: data.image.caption || "",
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(msg);
    } finally {
      setIsUploadingStill(false);
    }
  };

  const handleFileUploadStill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingStill(true);
      const formData = new FormData();
      formData.append("file", file);
      if (selectedSceneId) formData.append("sceneId", selectedSceneId);
      formData.append("caption", stillCaptionInput.trim() || file.name);

      const res = await fetch(`/api/projects/${projectId}/images/reference`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");

      toast.success("อัปโหลดสำเร็จ!");
      setImagesList((prev) => [data.image, ...prev]);
      setShowAddStillModal(false);
      setStillCaptionInput("");

      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
      if (isVideo) {
        toast.info("คุณสามารถเลือกช่วงเวลาของวิดีโอนี้ได้ทันที");
        setVideoTrimData({
          isOpen: true,
          videoSrc: data.image.filePath,
          videoId: data.image.id,
          startTime: 0,
          endTime: null,
          caption: data.image.caption || file.name,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด";
      toast.error(msg);
    } finally {
      setIsUploadingStill(false);
    }
  };

  // Filter logic
  const filteredImages = imagesList.filter((img) => {
    if (filterSceneOnly && selectedSceneId && img.sceneId !== selectedSceneId) {
      return false;
    }
    if (filterApprovedOnly && img.approved !== 1) {
      return false;
    }
    if (filterKind === "ai_scenes" && img.kind !== "scene" && img.kind !== "cover") {
      return false;
    }
    if (filterKind === "movie_stills" && img.kind !== "movie_still" && img.kind !== "reference") {
      return false;
    }
    if (filterKind === "portraits" && img.kind !== "portrait") {
      return false;
    }
    return true;
  });

  const currentScene = scenesList.find((s) => s.id === selectedSceneId);

  return (
    <div className="max-w-[1720px] mx-auto w-full px-4 sm:px-8 py-6 space-y-6 pb-24">
      <ProjectHeader
        projectId={projectId}
        title={project?.title || "Image Studio"}
        universe={project?.universe || ""}
        timelineScope={project?.timelineScope}
      />

      {/* Top Banner: Concept Explanation */}
      <div className="cinematic-card rounded-xl p-5 border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-base font-bold text-white font-heading tracking-wide">
              IMAGE STUDIO & VISUAL PAIRING
            </h2>
          </div>
          <p className="text-xs text-slate-300 font-thai leading-relaxed">
            สร้างภาพประกอบฉากด้วย AI ให้สอดคล้องกับตัวละครแก๊งเพื่อน + จับคู่กับภาพจริงในภาพยนตร์/ซีรีส์{" "}
            <span className="text-amber-300 font-semibold font-mono">({project?.universe})</span>{" "}
            เพื่อแสดงแบบ Split-Screen ในโหมดอ่านนิยาย
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/projects/${projectId}/read`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold border border-amber-500/30 font-thai transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>ดูหน้าอ่านนิยาย (Reader View)</span>
          </Link>

          <button
            onClick={() => setShowAddStillModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-thai shadow-md transition-colors"
          >
            <Film className="w-4 h-4" />
            <span>+ นำเข้าภาพจริงในหนัง (Movie Still)</span>
          </button>
        </div>
      </div>

      {/* Main Studio 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Scene Selector, AI Moments & Prompt Generator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Scene Selector */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-3">
            <label className="text-xs font-bold text-amber-300 font-thai flex items-center justify-between">
              <span>เลือกฉากที่จะสร้างหรือจัดการภาพ (Active Scene)</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {scenesList.length} ฉากทั้งหมด
              </span>
            </label>

            <select
              value={selectedSceneId}
              onChange={(e) => handleSelectScene(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
            >
              {scenesList.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  ฉาก {sc.order}: {sc.title}
                </option>
              ))}
            </select>

            {currentScene?.summary && (
              <p className="text-xs text-slate-400 font-thai line-clamp-2 italic bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                {currentScene.summary}
              </p>
            )}

            {/* AI 3 Visual Moments Trigger */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isAnalyzingMoments || !selectedSceneId}
                onClick={handleExtractMoments}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-thai transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAnalyzingMoments
                    ? "AI กำลังเฟ้นหา 3 จังหวะน่าวาด..."
                    : "✨ ให้ AI เสนอ 3 จังหวะน่าวาด (3 Visual Moments)"}
                </span>
              </button>
            </div>

            {/* Display 3 Visual Moments */}
            {extractedMoments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-400 font-thai uppercase tracking-wider block">
                  3 จังหวะที่ AI แนะนำ (คลิกเพื่อใส่ Prompt):
                </span>
                <div className="space-y-2">
                  {extractedMoments.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleUseMomentPrompt(m)}
                      className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200 font-heading">
                          #{idx + 1} {m.momentTitle}
                        </span>
                        <span className="text-[10px] text-slate-500 font-thai">
                          คลิกเลือก &rarr;
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-thai line-clamp-2">
                        {m.description}
                      </p>
                      {m.focalCharacters && m.focalCharacters.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {m.focalCharacters.map((c, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Image Generation Form */}
          <div className="cinematic-card rounded-xl p-5 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white font-heading uppercase tracking-wider">
                  AI IMAGE GENERATOR
                </h3>
              </div>

              {/* Kind Selector */}
              <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setKindInput("scene")}
                  className={`px-2 py-0.5 rounded text-[11px] font-thai ${
                    kindInput === "scene"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ภาพฉาก
                </button>
                <button
                  type="button"
                  onClick={() => setKindInput("portrait")}
                  className={`px-2 py-0.5 rounded text-[11px] font-thai ${
                    kindInput === "portrait"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setKindInput("cover")}
                  className={`px-2 py-0.5 rounded text-[11px] font-thai ${
                    kindInput === "cover"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  หน้าปก
                </button>
              </div>
            </div>

            <form onSubmit={handleGenerateImage} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  Image Prompt (ภาษาอังกฤษหรือไทย)
                </label>
                <textarea
                  rows={4}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Cinematic scene description, lighting, mood, camera angle..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 font-thai">
                  Negative Prompt (สิ่งที่ไม่ต้องการให้มีในภาพ)
                </label>
                <input
                  type="text"
                  value={negativePromptInput}
                  onChange={(e) => setNegativePromptInput(e.target.value)}
                  placeholder="blurry, distorted, low quality, oversaturated..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {project?.styleGuide && (
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 font-mono">
                  <span className="text-amber-400 font-bold block mb-0.5 font-thai">
                    + ต่อท้ายด้วย Style Guide อัตโนมัติ:
                  </span>
                  {project.styleGuide}
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !promptInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400 transition-colors shadow-lg disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI กำลังสร้างภาพประกอบ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>สร้างภาพด้วย AI (Generate Image)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (7 cols): Gallery & Pairing Manager */}
        <div className="lg:col-span-7 space-y-4">
          {/* Gallery Filters Bar */}
          <div className="cinematic-card rounded-xl p-4 border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-thai mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>หมวดหมู่:</span>
              </span>

              {[
                { id: "all", label: "ทั้งหมด" },
                { id: "ai_scenes", label: "ภาพ AI" },
                { id: "movie_stills", label: "ภาพจริงในหนัง" },
                { id: "portraits", label: "Portrait" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterKind(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-thai font-semibold transition-all ${
                    filterKind === tab.id
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 font-thai cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterSceneOnly}
                  onChange={(e) => setFilterSceneOnly(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>เฉพาะฉากนี้</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-300 font-thai cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterApprovedOnly}
                  onChange={(e) => setFilterApprovedOnly(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span className="text-emerald-400">Approved เท่านั้น</span>
              </label>
            </div>
          </div>

          {/* Gallery Grid */}
          {filteredImages.length === 0 ? (
            <div className="cinematic-card rounded-xl p-12 text-center space-y-3">
              <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300 font-thai">
                ไม่พบรูปภาพตามเงื่อนไขที่เลือก
              </h3>
              <p className="text-xs text-slate-500 font-thai max-w-sm mx-auto">
                คุณสามารถกดสร้างภาพด้วย AI ทางคอลัมน์ซ้าย หรือกดปุ่ม &quot;+ นำเข้าภาพจริงในหนัง&quot;
                เพื่อเพิ่มภาพสำหรับฉากนี้
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  className="cinematic-card rounded-xl overflow-hidden border-slate-800 group relative flex flex-col justify-between"
                >
                  {/* Image/Video Aspect ratio box */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer">
                    {isVideoMedia(img) ? (
                      <video
                        src={img.filePath}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onLoadedMetadata={(e) => {
                          const timing = getVideoTiming(img);
                          if (timing.startTime > 0) e.currentTarget.currentTime = timing.startTime;
                        }}
                        onTimeUpdate={(e) => {
                          const timing = getVideoTiming(img);
                          if (timing.endTime && e.currentTarget.currentTime >= timing.endTime) {
                            e.currentTarget.currentTime = timing.startTime || 0;
                            e.currentTarget.play().catch(() => {});
                          }
                        }}
                        onClick={() => setLightboxImage(img)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <img
                        src={img.filePath}
                        alt={img.caption || img.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onClick={() => setLightboxImage(img)}
                      />
                    )}

                    {/* Kind & Status Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md ${
                          isVideoMedia(img)
                            ? "bg-purple-950/80 text-purple-300 border border-purple-500/40"
                            : img.kind === "movie_still" || img.kind === "reference"
                            ? "bg-sky-950/80 text-sky-300 border border-sky-500/40"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {isVideoMedia(img)
                          ? "🎬 วิดีโอคลิป"
                          : img.kind === "movie_still" || img.kind === "reference"
                          ? "🎬 ภาพจริงในหนัง"
                          : img.kind === "portrait"
                          ? "👤 Portrait"
                          : "🎨 AI Illustration"}
                      </span>

                      {project?.coverImage === img.filePath && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 border border-amber-300 backdrop-blur-md flex items-center gap-1 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                          <Crown className="w-3 h-3" />
                          <span>หน้าปกเรื่อง</span>
                        </span>
                      )}

                      {img.approved === 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                          ✓ Approved
                        </span>
                      )}
                    </div>

                    {/* Scene Order Badge */}
                    {img.sceneOrder && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 text-slate-300 backdrop-blur-md">
                          ฉาก {img.sceneOrder}
                        </span>
                      </div>
                    )}

                    {/* Video timing badge */}
                    {isVideoMedia(img) && (
                      <div className="absolute bottom-2 left-2 pointer-events-none">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {getVideoTiming(img).startTime.toFixed(1)}s
                            {getVideoTiming(img).endTime ? ` - ${getVideoTiming(img).endTime?.toFixed(1)}s` : " (เต็มคลิป)"}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay with Lightbox Trigger */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                      <span className="p-2 rounded-full bg-black/70 text-white backdrop-blur-md">
                        <Maximize2 className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Caption & Actions Card Footer */}
                  <div className="p-3.5 space-y-3 bg-slate-900/90 flex-1 flex flex-col justify-between">
                    <div>
                      {img.caption && (
                        <p className="text-xs font-bold text-white font-thai line-clamp-1">
                          {img.caption}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 font-mono line-clamp-2 mt-0.5">
                        {img.prompt}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleApprove(img)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold font-thai transition-colors ${
                            img.approved === 1
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                          title="ภาพที่ Approve จะถูกนำไปแสดงในหน้าอ่านนิยาย Reader"
                        >
                          {img.approved === 1 ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติแล้ว</span>
                            </>
                          ) : (
                            <>
                              <span>กด Approve</span>
                            </>
                          )}
                        </button>

                        {/* Crop or Video Trim button */}
                        {isVideoMedia(img) ? (
                          <button
                            onClick={() => {
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
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold font-thai bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700/60 transition-colors"
                            title="เลือกช่วงเวลาของวิดีโอนี้ (Trim Video)"
                          >
                            <Scissors className="w-3.5 h-3.5 text-amber-400" />
                            <span>ตัดช่วง</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setCropModalData({
                                isOpen: true,
                                imageSrc: img.filePath,
                                imageId: img.id,
                                defaultAspect: img.kind === "cover" ? "3:4" : "16:9",
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold font-thai bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700/60 transition-colors"
                            title="ครอบตัดรูปภาพนี้ (Crop)"
                          >
                            <Crop className="w-3.5 h-3.5 text-amber-400" />
                            <span>ครอป</span>
                          </button>
                        )}

                        {/* Set as Cover button */}
                        <button
                          onClick={() => handleSetAsCover(img)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold font-thai transition-colors ${
                            project?.coverImage === img.filePath
                              ? "bg-amber-400 text-slate-950 font-bold border border-amber-300"
                              : "bg-slate-800 text-amber-400 hover:bg-slate-700 border border-amber-500/30"
                          }`}
                          title="ตั้งภาพนี้เป็นภาพหน้าปกของนิยายเรื่องนี้"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>{project?.coverImage === img.filePath ? "หน้าปกแล้ว" : "ตั้งหน้าปก"}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setPromptInput(img.prompt);
                            toast.info("คัดลอก Prompt ลงในฟอร์มแล้ว");
                          }}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="นำ Prompt นี้ไปใช้ต่อ"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteImage(img)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                          title="ลบภาพนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD MOVIE REFERENCE STILL */}
      {showAddStillModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Film className="w-5 h-5 text-sky-400" />
                <span>นำเข้าภาพจริงหรือคลิปวิดีโอในภาพยนตร์/ซีรีส์ ({project?.universe})</span>
              </h3>
              <button
                onClick={() => setShowAddStillModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-thai leading-relaxed">
              ใส่ภาพนิ่งหรือคลิปวิดีโอจริงจากหนัง/ซีรีส์ (MP4, WEBM, MOV, GIF, JPG, PNG) เพื่อวางคู่กับภาพ AI ในหน้าอ่านนิยาย
              และสามารถเลือกตัดช่วงเวลา (Trim) วิดีโอเพื่อวนลูปประกอบฉากได้ทันที
            </p>

            {/* Option A: Upload File */}
            <div className="space-y-2 p-4 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-sky-300 font-thai block">
                วิธีที่ 1: อัปโหลดรูปภาพหรือวิดีโอจากเครื่องของคุณ (JPG/PNG/MP4/WEBM/MOV/GIF)
              </span>
              <input
                type="file"
                accept="image/*,video/*,.gif,.mp4,.webm,.mov"
                onChange={handleFileUploadStill}
                disabled={isUploadingStill}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500"
              />
            </div>

            {/* Option B: Image / Video URL */}
            <form onSubmit={handleAddStillFromUrl} className="space-y-3">
              <span className="text-xs font-bold text-sky-300 font-thai block">
                วิธีที่ 2: นำเข้าผ่าน URL ของรูปภาพหรือคลิปวิดีโอ
              </span>
              <input
                type="url"
                placeholder="https://example.com/movie-still.jpg หรือ video.mp4"
                value={stillUrlInput}
                onChange={(e) => setStillUrlInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-thai">คำอธิบายภาพ/วิดีโอ (Caption)</label>
                <input
                  type="text"
                  placeholder="เช่น Jon Snow และ Night's Watch ที่ Castle Black"
                  value={stillCaptionInput}
                  onChange={(e) => setStillCaptionInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-thai"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStillModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-thai hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUploadingStill || !stillUrlInput.trim()}
                  className="px-5 py-2 rounded-lg bg-sky-600 text-white font-bold text-xs font-thai hover:bg-sky-500 disabled:opacity-50"
                >
                  {isUploadingStill ? "กำลังนำเข้าสื่อ..." : "นำเข้าสื่อประกอบ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>

            {isVideoMedia(lightboxImage) ? (
              <video
                src={lightboxImage.filePath}
                controls
                autoPlay
                loop
                playsInline
                onLoadedMetadata={(e) => {
                  const timing = getVideoTiming(lightboxImage);
                  if (timing.startTime > 0) e.currentTarget.currentTime = timing.startTime;
                }}
                onTimeUpdate={(e) => {
                  const timing = getVideoTiming(lightboxImage);
                  if (timing.endTime && e.currentTarget.currentTime >= timing.endTime) {
                    e.currentTarget.currentTime = timing.startTime || 0;
                    e.currentTarget.play().catch(() => {});
                  }
                }}
                className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain border border-slate-800 shadow-2xl bg-black"
              />
            ) : (
              <img
                src={lightboxImage.filePath}
                alt={lightboxImage.caption || lightboxImage.prompt}
                className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain border border-slate-800 shadow-2xl"
              />
            )}

            <div className="mt-3 text-center space-y-1 max-w-2xl">
              {lightboxImage.caption && (
                <p className="text-sm font-bold text-white font-thai">
                  {lightboxImage.caption}
                </p>
              )}
              <p className="text-xs text-slate-400 font-mono">
                {lightboxImage.prompt}
              </p>
            </div>

            {/* Lightbox Actions */}
            <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
              {isVideoMedia(lightboxImage) ? (
                <button
                  onClick={() => {
                    const timing = getVideoTiming(lightboxImage);
                    setVideoTrimData({
                      isOpen: true,
                      videoSrc: lightboxImage.filePath,
                      videoId: lightboxImage.id,
                      startTime: timing.startTime,
                      endTime: timing.endTime,
                      caption: lightboxImage.caption || "",
                    });
                    setLightboxImage(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs font-thai flex items-center gap-2 shadow transition-all"
                >
                  <Scissors className="w-4 h-4 text-amber-400" />
                  <span>เลือกช่วงคลิปวิดีโอ (Trim)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCropModalData({
                      isOpen: true,
                      imageSrc: lightboxImage.filePath,
                      imageId: lightboxImage.id,
                      defaultAspect: lightboxImage.kind === "cover" ? "3:4" : "16:9",
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
                  project?.coverImage === lightboxImage.filePath
                    ? "bg-amber-400 text-slate-950 font-bold"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>{project?.coverImage === lightboxImage.filePath ? "✓ หน้าปกเรื่องแล้ว" : "ตั้งเป็นภาพหน้าปกนิยาย"}</span>
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
          sceneId={selectedSceneId || undefined}
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
          projectId={projectId}
          initialStartTime={videoTrimData.startTime || 0}
          initialEndTime={videoTrimData.endTime || null}
          initialCaption={videoTrimData.caption}
          onTrimSuccess={handleTrimSuccess}
        />
      )}
    </div>
  );
}
