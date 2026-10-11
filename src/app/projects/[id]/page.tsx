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
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Film,
  Plus,
  Trash2,
  Eye,
  Check,
  X,
  History,
  Shield,
  Upload,
  Link as LinkIcon,
  ChevronDown,
  Layers,
  MapPin,
  Users,
  Compass,
  FileText,
  Clock,
  ArrowRight,
  Maximize2,
  Music,
  Volume2,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseSceneToDialogueBlocks,
  autoDistributeDialogueImages,
  DialogueBlock,
} from "@/lib/story/dialogueParser";

interface CharacterSummary {
  id: string;
  name: string;
  characterType?: "self" | "friend" | "canon";
  realNickname?: string;
  chosenRole?: string;
  currentMbti?: string;
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

  // Left Panel: Visual Stage & Audio State
  const [visualTab, setVisualTab] = useState<"ai_scenes" | "movie_stills" | "bgm_audio">("ai_scenes");
  const [sceneImages, setSceneImages] = useState<SceneImage[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [showAddStillModal, setShowAddStillModal] = useState(false);
  const [stillUrlInput, setStillUrlInput] = useState("");
  const [stillCaptionInput, setStillCaptionInput] = useState("");
  const [isUploadingStill, setIsUploadingStill] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Scene BGM Audio State in Studio
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);
  const studioAudioInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingStudioBgm, setIsUploadingStudioBgm] = useState(false);
  const [isStudioAudioPlaying, setIsStudioAudioPlaying] = useState(false);
  const [studioAudioVolume, setStudioAudioVolume] = useState(0.7);
  const [customAudioUrlInput, setCustomAudioUrlInput] = useState("");
  const [customAudioTitleInput, setCustomAudioTitleInput] = useState("");

  // Right Panel: Story Writing & Streaming State
  const [directorsNote, setDirectorsNote] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [studioViewMode, setStudioViewMode] = useState<"preview" | "edit" | "dialogue_bindings">("preview");
  const [localDialogueBindings, setLocalDialogueBindings] = useState<Record<string, string>>({});
  const [isSavingBindings, setIsSavingBindings] = useState(false);
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [isSavingScene, setIsSavingScene] = useState(false);

  // New Scene Modal
  const [showNewSceneModal, setShowNewSceneModal] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [newSceneLocation, setNewSceneLocation] = useState("");
  const [newSceneSelectedChars, setNewSceneSelectedChars] = useState<string[]>([]);

  // Version History Modal
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [sceneVersions, setSceneVersions] = useState<any[]>([]);

  // Continuity Analysis & Moments Modal
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isApplyingLedger, setIsApplyingLedger] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Load Project Data
  const loadProjectData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();

      setProject(data.project);
      setParts(data.parts || []);
      setCharacters(data.characters || []);

      if (data.parts && data.parts.length > 0) {
        const firstPart = data.parts[0];
        setActivePartId(firstPart.id);

        if (firstPart.scenes && firstPart.scenes.length > 0) {
          const firstScene = firstPart.scenes[0];
          setActiveSceneId(firstScene.id);
          setActiveScene(firstScene);
          setDirectorsNote(firstScene.directorNote || "");
          setEditableMarkdown(firstScene.contentMarkdown || "");
        } else {
          setActiveSceneId("");
          setActiveScene(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดโปรเจกต์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // 2. Load Active Scene Details & Images
  const loadSceneDetails = async (sceneId: string) => {
    if (!sceneId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`);
      if (!res.ok) throw new Error("โหลดรายละเอียดฉากไม่สำเร็จ");
      const data = await res.json();
      setActiveScene(data.scene);
      setSceneImages(data.images || []);
      setDirectorsNote(data.scene.directorNote || "");
      setEditableMarkdown(data.scene.contentMarkdown || "");
      setSceneVersions(data.versions || []);
      if (data.scene.dialogueBindings) {
        try {
          const parsed =
            typeof data.scene.dialogueBindings === "string"
              ? JSON.parse(data.scene.dialogueBindings)
              : data.scene.dialogueBindings;
          setLocalDialogueBindings(parsed || {});
        } catch {
          setLocalDialogueBindings({});
        }
      } else {
        setLocalDialogueBindings({});
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

  // Switch Active Part
  const handleSelectPart = (partId: string) => {
    setActivePartId(partId);
    const p = parts.find((item) => item.id === partId);
    if (p && p.scenes && p.scenes.length > 0) {
      setActiveSceneId(p.scenes[0].id);
    } else {
      setActiveSceneId("");
      setActiveScene(null);
      setSceneImages([]);
    }
  };

  // Switch Active Scene
  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setStudioViewMode("preview");
    setStreamingText("");
  };

  // Dialogue-to-Image Binding Handlers
  const handleAssignImageToBlock = async (blockIndex: number, imageId: string) => {
    const updated = { ...localDialogueBindings };
    if (!imageId) {
      delete updated[String(blockIndex)];
    } else {
      updated[String(blockIndex)] = imageId;
    }
    setLocalDialogueBindings(updated);

    // Auto-save the binding to server
    try {
      await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogueBindings: JSON.stringify(updated),
        }),
      });
      if (activeScene) {
        setActiveScene({ ...activeScene, dialogueBindings: JSON.stringify(updated) });
      }
      toast.success(
        imageId
          ? `ผูกภาพกับประโยค #${blockIndex + 1} สำเร็จ`
          : `ยกเลิกการผูกภาพประโยค #${blockIndex + 1}`
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDialogueBindings = async (bindingsToSave?: Record<string, string>) => {
    if (!activeSceneId) return;
    try {
      setIsSavingBindings(true);
      const dataToSend = bindingsToSave ?? localDialogueBindings;
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogueBindings: JSON.stringify(dataToSend),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setActiveScene(data.scene);
      toast.success("บันทึกการตั้งค่าภาพตามบทพูดเรียบร้อยแล้ว!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "บันทึกการผูกภาพไม่สำเร็จ");
    } finally {
      setIsSavingBindings(false);
    }
  };

  const handleAutoDistributeImages = () => {
    if (!activeScene || sceneImages.length === 0) {
      toast.error("ไม่มีภาพประกอบในฉากนี้สำหรับจับคู่อัตโนมัติ");
      return;
    }
    const blocks = parseSceneToDialogueBlocks(activeScene.contentMarkdown || "", characters);
    if (blocks.length === 0) {
      toast.error("ไม่มีบทพูดหรือเนื้อเรื่องในฉากนี้");
      return;
    }
    const distributed = autoDistributeDialogueImages(blocks.length, sceneImages);
    setLocalDialogueBindings(distributed);
    handleSaveDialogueBindings(distributed);
    toast.success(`จับคู่อัตโนมัติ ${Object.keys(distributed).length} ภาพ กระจายตามบทพูดเรียบร้อย!`);
  };

  const handleClearAllBindings = () => {
    setLocalDialogueBindings({});
    handleSaveDialogueBindings({});
    toast.info("ล้างการผูกภาพทั้งหมดเรียบร้อย");
  };

  // 3. Create New Scene
  const handleCreateScene = async () => {
    if (!newSceneTitle.trim()) {
      toast.error("กรุณาระบุชื่อฉาก");
      return;
    }
    if (!activePartId) {
      toast.error("กรุณาเลือกภาคก่อน");
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
          contentMarkdown: "",
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

      // Reload project and set new scene as active
      await loadProjectData();
      setActiveSceneId(data.scene.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการสร้างฉาก");
    }
  };

  // 4. Save Edited Scene Markdown
  const handleSaveContent = async () => {
    if (!activeSceneId) return;
    try {
      setIsSavingScene(true);
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeSceneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentMarkdown: editableMarkdown,
          directorNote: directorsNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      setActiveScene(data.scene);
      setStudioViewMode("preview");
      toast.success("บันทึกเนื้อหาฉากเรียบร้อยแล้ว");
      loadSceneDetails(activeSceneId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSavingScene(false);
    }
  };

  // 5. Stream Story Generation (Anthropic Claude)
  const handleStartStream = async (actionType: "write_next" | "regenerate" | "expand" = "write_next") => {
    if (!activeScene) {
      toast.error("กรุณาสร้างหรือเลือกฉากก่อนเริ่มเขียน");
      return;
    }

    try {
      setIsStreaming(true);
      setStudioViewMode("preview");
      setStreamingText("");

      const charsPresent = activeScene.charactersPresentParsed || [];

      const res = await fetch(`/api/projects/${projectId}/scenes/generate-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: activePartId,
          sceneId: activeScene.id,
          sceneTitle: activeScene.title,
          location: activeScene.location,
          charactersPresent: charsPresent,
          directorsNote,
          targetWords: project?.targetSceneWords || 1200,
          actionType,
          existingContent: activeScene.contentMarkdown || "",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "ไม่สามารถเริ่มการสตรีมเนื้อเรื่องได้");
      }

      if (!res.body) throw new Error("ไม่สามารถอ่านสตรีมได้");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                toast.error(parsed.error);
                break;
              }
              if (parsed.text) {
                fullContent += parsed.text;
                setStreamingText(fullContent);
              }
            } catch (jsonErr) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }

      // Auto save after stream completion
      if (fullContent.trim()) {
        const saveRes = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentMarkdown: fullContent,
            directorNote: directorsNote,
          }),
        });

        const savedData = await saveRes.json();
        setActiveScene(savedData.scene);
        setEditableMarkdown(fullContent);
        setStreamingText("");
        toast.success("AI เขียนฉากเสร็จสมบูรณ์และบันทึกประวัติเวอร์ชันแล้ว!");

        // Automatically prompt to run continuity check
        setTimeout(() => {
          handleRunAnalysis();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการเขียนเนื้อเรื่อง");
    } finally {
      setIsStreaming(false);
    }
  };

  // 6. Analyze Scene & Continuity Check
  const handleRunAnalysis = async () => {
    if (!activeSceneId || !activeScene?.contentMarkdown) {
      toast.error("ยังไม่มีเนื้อหาในฉากนี้สำหรับวิเคราะห์");
      return;
    }

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

  // Apply Analysis & Update Ledger
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

      toast.success("อัปเดตสถานะลง Continuity Ledger และประวัติพัฒนาการตัวละครเรียบร้อยแล้ว!");
      setShowAnalysisModal(false);
      loadSceneDetails(activeSceneId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "บันทึก Ledger ล้มเหลว");
    } finally {
      setIsApplyingLedger(false);
    }
  };

  // 7. Generate AI Image for Moment or Custom Prompt
  const handleGenerateImage = async (promptOverride?: string) => {
    const promptToUse = promptOverride || customImagePrompt;
    if (!promptToUse.trim()) {
      toast.error("กรุณาระบุ Prompt สำหรับสร้างภาพ");
      return;
    }

    try {
      setIsGeneratingImage(true);
      const res = await fetch(`/api/projects/${projectId}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: activeSceneId,
          prompt: promptToUse,
          kind: "scene",
          size: "1024x1024",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างภาพไม่สำเร็จ");

      toast.success("สร้างภาพ AI ประจำฉากสำเร็จ!");
      setCustomImagePrompt("");
      if (activeSceneId) loadSceneDetails(activeSceneId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการสร้างภาพ");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 8. Add Movie Still (Upload or URL)
  const handleAddMovieStill = async () => {
    if (!stillUrlInput.trim()) {
      toast.error("กรุณาใส่ Image URL หรืออัปโหลดไฟล์ภาพ");
      return;
    }

    try {
      setIsUploadingStill(true);
      const res = await fetch(`/api/projects/${projectId}/images/reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: activeSceneId,
          imageUrl: stillUrlInput,
          caption: stillCaptionInput || "ภาพประกอบจริงจากหนัง/ซีรีส์",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เพิ่มภาพไม่สำเร็จ");

      toast.success("เพิ่มภาพจริงจากหนังเข้าสู่ฉากเรียบร้อยแล้ว!");
      setShowAddStillModal(false);
      setStillUrlInput("");
      setStillCaptionInput("");
      if (activeSceneId) loadSceneDetails(activeSceneId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกภาพ");
    } finally {
      setIsUploadingStill(false);
    }
  };

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingStill(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sceneId", activeSceneId);
      formData.append("caption", stillCaptionInput || file.name);

      const res = await fetch(`/api/projects/${projectId}/images/reference`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");

      toast.success("อัปโหลดภาพจริงจากหนังเรียบร้อยแล้ว!");
      setShowAddStillModal(false);
      setStillCaptionInput("");
      if (activeSceneId) loadSceneDetails(activeSceneId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
      setIsUploadingStill(false);
    }
  };

  // Toggle Image Approval
  const handleToggleApproveImage = async (imageId: string, currentApproved: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/images/${imageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: currentApproved === 1 ? 0 : 1 }),
      });
      if (!res.ok) throw new Error("อัปเดตไม่สำเร็จ");
      toast.success(currentApproved === 1 ? "ยกเลิกการ Approve ภาพ" : "Approve ภาพเป็นภาพทางการแล้ว!");
      if (activeSceneId) loadSceneDetails(activeSceneId);
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // Delete Image
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("คุณแน่ใจว่าต้องการลบภาพนี้?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      toast.success("ลบรูปภาพเรียบร้อย");
      if (activeSceneId) loadSceneDetails(activeSceneId);
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการลบ");
    }
  };

  // Studio BGM Handlers
  const handleUploadStudioBgm = async (file: File) => {
    if (!activeScene) {
      toast.error("กรุณาเลือกฉากก่อนอัปโหลดเพลง");
      return;
    }
    try {
      setIsUploadingStudioBgm(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}/audio`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");

      // Update activeScene
      const updatedScene = { ...activeScene, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle };
      setActiveScene(updatedScene);
      setParts((prevParts) =>
        prevParts.map((part) => ({
          ...part,
          scenes: part.scenes.map((s) =>
            s.id === activeScene.id ? { ...s, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle } : s
          ),
        }))
      );

      // Play uploaded music in studio preview
      if (studioAudioRef.current) {
        studioAudioRef.current.src = data.bgmUrl;
        studioAudioRef.current.volume = studioAudioVolume;
        studioAudioRef.current.play().catch((e) => console.warn(e));
        setIsStudioAudioPlaying(true);
      }

      toast.success(`อัปโหลดเพลง "${data.bgmTitle}" สำหรับฉากนี้สำเร็จ!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "อัปโหลดเพลงไม่สำเร็จ");
    } finally {
      setIsUploadingStudioBgm(false);
    }
  };

  const handleSaveCustomAudioUrl = async () => {
    if (!activeScene) return;
    if (!customAudioUrlInput.trim()) {
      toast.error("กรุณาระบุ URL ของเพลง");
      return;
    }

    try {
      setIsUploadingStudioBgm(true);
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bgmUrl: customAudioUrlInput.trim(),
          bgmTitle: customAudioTitleInput.trim() || "เพลงประกอบประจำฉาก (Custom URL)",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกเพลงไม่สำเร็จ");

      const updatedScene = { ...activeScene, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle };
      setActiveScene(updatedScene);
      setParts((prevParts) =>
        prevParts.map((part) => ({
          ...part,
          scenes: part.scenes.map((s) =>
            s.id === activeScene.id ? { ...s, bgmUrl: data.bgmUrl, bgmTitle: data.bgmTitle } : s
          ),
        }))
      );

      setCustomAudioUrlInput("");
      setCustomAudioTitleInput("");
      toast.success("บันทึกเพลงประกอบประจำฉากเรียบร้อยแล้ว!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "บันทึกเพลงไม่สำเร็จ");
    } finally {
      setIsUploadingStudioBgm(false);
    }
  };

  const handleDeleteStudioBgm = async () => {
    if (!activeScene) return;
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเพลงประกอบของฉากนี้?")) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${activeScene.id}/audio`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลบเพลงไม่สำเร็จ");

      if (studioAudioRef.current) {
        studioAudioRef.current.pause();
      }
      setIsStudioAudioPlaying(false);

      const updatedScene = { ...activeScene, bgmUrl: null, bgmTitle: null };
      setActiveScene(updatedScene);
      setParts((prevParts) =>
        prevParts.map((part) => ({
          ...part,
          scenes: part.scenes.map((s) =>
            s.id === activeScene.id ? { ...s, bgmUrl: null, bgmTitle: null } : s
          ),
        }))
      );

      toast.success("ลบเพลงประกอบประจำฉากเรียบร้อย");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ลบเพลงไม่สำเร็จ");
    }
  };

  const handleToggleStudioAudio = () => {
    if (!studioAudioRef.current) return;
    if (isStudioAudioPlaying) {
      studioAudioRef.current.pause();
      setIsStudioAudioPlaying(false);
    } else {
      studioAudioRef.current.volume = studioAudioVolume;
      studioAudioRef.current.play().catch((e) => console.warn(e));
      setIsStudioAudioPlaying(true);
    }
  };

  // Filter images for Left Panel
  const aiImages = sceneImages.filter((img) => img.kind !== "movie_still" && img.kind !== "reference");
  const movieStills = sceneImages.filter((img) => img.kind === "movie_still" || img.kind === "reference");

  const currentPart = parts.find((p) => p.id === activePartId);

  const studioDialogueBlocks = activeScene
    ? parseSceneToDialogueBlocks(activeScene.contentMarkdown || "", characters)
    : [];
  const boundDialogueCount = Object.keys(localDialogueBindings).length;

  return (
    <div className="space-y-4">
      {project && (
        <ProjectHeader
          projectId={project.id}
          title={project.title}
          universe={project.universe}
          timelineScope={project.timelineScope}
        />
      )}

      {/* Top Part & Scene Navigation Ribbon */}
      <div className="cinematic-card rounded-xl p-3 border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Part Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={activePartId}
              onChange={(e) => handleSelectPart(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none font-thai"
            >
              {parts.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  ภาค {p.number}: {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Scene Selector */}
          {currentPart && currentPart.scenes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={activeSceneId}
                onChange={(e) => handleSelectScene(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none font-thai max-w-[200px] truncate"
              >
                {currentPart.scenes.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    ฉาก {s.order}: {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowNewSceneModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-thai font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มฉากใหม่</span>
          </button>
        </div>

        {/* Scene Meta Badges */}
        {activeScene && (
          <div className="flex items-center gap-3 text-xs text-slate-400 font-thai">
            {activeScene.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeScene.location}</span>
              </span>
            )}
            <span className="flex items-center gap-1 font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>v{activeScene.version}</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[11px] font-semibold">
              {(activeScene.wordCount || 0).toLocaleString()} คำ
            </span>
            <Link
              href={`/projects/${projectId}/read${activeScene ? `?sceneId=${activeScene.id}` : ""}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 font-thai text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>เปิดโหมดอ่านนิยาย (Reader View) →</span>
            </Link>
          </div>
        )}
      </div>

      {/* Main Split Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Visual Stage & Movie Stills (ตามที่ผู้ใช้สั่ง) */}
        {/* ========================================================= */}
        <div className="cinematic-card rounded-2xl p-5 border-slate-800 space-y-4 bg-slate-950/70">
          {/* Visual Panel Header & Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setVisualTab("ai_scenes")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-thai transition-all ${
                  visualTab === "ai_scenes"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ภาพ AI ({aiImages.length})</span>
              </button>

              <button
                onClick={() => setVisualTab("movie_stills")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-thai transition-all ${
                  visualTab === "movie_stills"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>ภาพหนัง ({movieStills.length})</span>
              </button>

              <button
                onClick={() => setVisualTab("bgm_audio")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-thai transition-all ${
                  visualTab === "bgm_audio"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>🎵 เพลงประกอบฉาก ({activeScene?.bgmUrl ? 1 : 0})</span>
              </button>
            </div>

            {visualTab === "movie_stills" && (
              <button
                onClick={() => setShowAddStillModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-thai border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มภาพหนัง</span>
              </button>
            )}
          </div>

          {/* TAB 1: AI Generated Images */}
          {visualTab === "ai_scenes" && (
            <div className="space-y-4">
              {/* Quick AI Trigger Buttons */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300 font-thai flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Visual Moment Generator</span>
                  </span>

                  <button
                    disabled={isAnalyzing || !activeScene?.contentMarkdown}
                    onClick={handleRunAnalysis}
                    className="text-[11px] text-amber-400 hover:underline font-thai disabled:opacity-50"
                  >
                    ✨ ให้ AI เสนอ 3 จังหวะน่าวาดจากฉากนี้
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ใส่คำอธิบายภาพ หรือกดให้ AI สกัดจังหวะน่าวาดอัตโนมัติ..."
                    value={customImagePrompt}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    disabled={isGeneratingImage || !customImagePrompt.trim()}
                    onClick={() => handleGenerateImage()}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {isGeneratingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isGeneratingImage ? "กำลังสร้าง..." : "สร้างภาพ AI"}</span>
                  </button>
                </div>
              </div>

              {/* AI Image Gallery */}
              {aiImages.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-thai">
                    ยังไม่มีภาพ AI สำหรับฉากนี้
                  </p>
                  <p className="text-[11px] text-slate-500 font-thai mt-1">
                    เขียนฉากเสร็จแล้วกด &quot;✨ ให้ AI เสนอ 3 จังหวะน่าวาด&quot; เพื่อสร้างภาพประกอบอัตโนมัติ
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex flex-col justify-between"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.filePath}
                          alt={img.prompt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Lightbox Trigger */}
                        <button
                          onClick={() => setLightboxImage(img.filePath)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="ดูภาพขยาย"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Approved Badge */}
                        {img.approved === 1 && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 font-thai flex items-center gap-1 shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>APPROVED</span>
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 space-y-2">
                        <p className="text-[11px] text-slate-300 line-clamp-2 font-thai">
                          {img.prompt}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                          <button
                            onClick={() => handleToggleApproveImage(img.id, img.approved)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded font-thai font-semibold transition-colors ${
                              img.approved === 1
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{img.approved === 1 ? "อนุมัติแล้ว" : "กด Approve"}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                            title="ลบภาพนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Movie Reference Stills (ภาพจริงจากหนัง/ซีรีส์) */}
          {visualTab === "movie_stills" && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white font-heading">
                    CANON MOVIE STILLS & REFERENCE
                  </h4>
                  <p className="text-[11px] text-slate-400 font-thai">
                    คลังภาพสถานที่และฉากจริงจากหนัง เพื่อใช้สร้างอารมณ์ร่วมและให้ AI ใช้อ้างอิง
                  </p>
                </div>
                <button
                  onClick={() => setShowAddStillModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400 transition-colors"
                >
                  + ใส่รูปภาพจริง
                </button>
              </div>

              {movieStills.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
                  <Film className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-thai">
                    ยังไม่มีภาพจริงจากหนังสำหรับฉากนี้
                  </p>
                  <p className="text-[11px] text-slate-500 font-thai mt-1">
                    คุณสามารถแคปภาพจาก Game of Thrones หรือแปะ URL ภาพฉาก เช่น King&apos;s Landing หรือ The Wall
                  </p>
                  <button
                    onClick={() => setShowAddStillModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 text-amber-300 text-xs font-thai border border-slate-700"
                  >
                    + เพิ่มภาพแรก
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {movieStills.map((still) => (
                    <div
                      key={still.id}
                      className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex flex-col justify-between"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={still.filePath}
                          alt={still.caption || "Movie Still"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={() => setLightboxImage(still.filePath)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-black/80 text-amber-300 font-thai border border-amber-500/30">
                          🎬 MOVIE STILL
                        </span>
                      </div>

                      <div className="p-2.5 flex items-center justify-between">
                        <p className="text-xs text-white font-thai font-medium truncate">
                          {still.caption || "ภาพจริงในหนัง"}
                        </p>
                        <button
                          onClick={() => handleDeleteImage(still.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="ลบภาพ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Scene Background Music (เพลงประกอบฉาก) */}
          {visualTab === "bgm_audio" && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <span>SCENE BACKGROUND MUSIC (เพลงประจำฉาก)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-thai">
                    อัปโหลดเพลงเฉพาะสำหรับฉากนี้ เพื่อให้เล่นเป็นเพลงพื้นหลังเวลาเปิดอ่านในโหมด Reader
                  </p>
                </div>
              </div>

              {/* If active scene has BGM */}
              {activeScene?.bgmUrl ? (
                <div className="rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 p-4 space-y-4 shadow-xl">
                  {/* Track Info Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                        <Music className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                            CURRENT BGM TRACK
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white font-thai mt-1">
                          {activeScene.bgmTitle || "เพลงประกอบประจำฉาก"}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs mt-0.5">
                          {activeScene.bgmUrl}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleDeleteStudioBgm}
                      className="p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/50 hover:text-white transition-colors"
                      title="ลบเพลงประกอบประจำฉากนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playback Controls & Progress */}
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={handleToggleStudioAudio}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-all shadow ${
                          isStudioAudioPlaying
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-white hover:bg-amber-500 hover:text-slate-950"
                        }`}
                      >
                        {isStudioAudioPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 flex items-center gap-2">
                        {isStudioAudioPlaying && (
                          <div className="flex items-end gap-1 h-4">
                            <span className="w-1 bg-amber-400 rounded-full animate-bounce h-3" />
                            <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.1s] h-4" />
                            <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.2s] h-2" />
                            <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3.5" />
                          </div>
                        )}
                        <span className="text-xs font-thai text-slate-300">
                          {isStudioAudioPlaying ? "กำลังเล่นตัวอย่างเสียง..." : "กดเพื่อทดลองฟังเพลง"}
                        </span>
                      </div>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-amber-400" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={studioAudioVolume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setStudioAudioVolume(val);
                            if (studioAudioRef.current) {
                              studioAudioRef.current.volume = val;
                            }
                          }}
                          className="w-20 accent-amber-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <audio
                      ref={studioAudioRef}
                      src={activeScene.bgmUrl}
                      loop
                      onEnded={() => setIsStudioAudioPlaying(false)}
                    />
                  </div>

                  {/* Replace track button */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs font-thai">
                    <span className="text-slate-400">ต้องการเปลี่ยนเพลงใหม่?</span>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-slate-700 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingStudioBgm ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์เพลงใหม่ (MP3/WAV)"}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadStudioBgm(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* No BGM: Upload Section */
                <div className="space-y-4">
                  <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto">
                      <Music className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-thai">
                        ยังไม่มีเพลงประกอบสำหรับฉากนี้
                      </h4>
                      <p className="text-[11px] text-slate-400 font-thai mt-0.5">
                        รองรับไฟล์เสียง MP3, WAV, M4A, OGG, AAC เพื่อเล่นเป็นเพลงประจำฉากในโหมด Reader
                      </p>
                    </div>

                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all">
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingStudioBgm ? "กำลังอัปโหลด..." : "เลือกไฟล์เพลงจากเครื่อง (MP3/WAV)"}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadStudioBgm(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* Or Enter Direct Audio URL */}
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 font-thai">
                      หรือระบุ URL เพลงโดยตรง (Audio Stream URL):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="ชื่อเพลง (เช่น ธีมสงครามอ่าวแบล็กวอเตอร์)"
                        value={customAudioTitleInput}
                        onChange={(e) => setCustomAudioTitleInput(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-thai"
                      />
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://example.com/soundtrack.mp3"
                          value={customAudioUrlInput}
                          onChange={(e) => setCustomAudioUrlInput(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                        <button
                          onClick={handleSaveCustomAudioUrl}
                          disabled={isUploadingStudioBgm || !customAudioUrlInput.trim()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-thai font-semibold border border-slate-700 transition-colors disabled:opacity-50"
                        >
                          บันทึก
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Story Narrative & AI Engine (เนื้อเรื่องนิยาย) */}
        {/* ========================================================= */}
        <div className="cinematic-card rounded-2xl p-6 border-slate-800 space-y-5 bg-slate-950/70">
          {/* Narrative Header & Action Controls */}
          <div className="space-y-3 border-b border-slate-800 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
                  {currentPart ? `PART ${currentPart.number}: ${currentPart.title}` : "NO PART"}
                </span>
                <h2 className="font-heading text-2xl font-bold text-white mt-0.5">
                  {activeScene ? activeScene.title : "ยังไม่ได้เลือกฉาก"}
                </h2>
              </div>

              {/* Version History Button */}
              {activeScene && (
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-thai transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>ประวัติ v{activeScene.version}</span>
                </button>
              )}
            </div>

            {/* Characters Present in this scene */}
            {activeScene && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-400 font-thai flex items-center gap-1 mr-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>ตัวละครในฉากนี้:</span>
                </span>
                {activeScene.charactersPresentParsed && activeScene.charactersPresentParsed.length > 0 ? (
                  activeScene.charactersPresentParsed.map((name) => {
                    const charObj = characters.find(
                      (c) => c.name === name || c.realNickname === name
                    );
                    const isFriend = charObj?.characterType === "friend";
                    const isSelf = charObj?.characterType === "self";

                    return (
                      <span
                        key={name}
                        className={`px-2 py-0.5 rounded text-[11px] font-thai ${
                          isSelf
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                            : isFriend
                            ? "bg-sky-950/80 text-sky-300 border border-sky-800/60 font-semibold"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {isSelf ? "👑 " : isFriend ? "🧑‍🤝‍🧑 " : ""}
                        {name}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 font-thai">ไม่ได้ระบุเฉพาะเจาะจง</span>
                )}
              </div>
            )}

            {/* Director's Note Box */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-amber-300 font-thai mb-1 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" />
                <span>Director&apos;s Note (คำสั่งกำกับทิศทางฉากนี้ให้ AI):</span>
              </label>
              <textarea
                rows={2}
                placeholder="เช่น พาฉันกับเพื่อนคนนี้ไปเจอกับ Jaime Lannister ในคุกใต้ดิน แล้วให้การตัดสินใจในฉากนี้เป็นจุดเปลี่ยน..."
                value={directorsNote}
                onChange={(e) => setDirectorsNote(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-thai"
              />
            </div>

            {/* Interactive Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                disabled={isStreaming || !activeScene}
                onClick={() => handleStartStream("write_next")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-thai transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] disabled:opacity-50"
              >
                {isStreaming ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isStreaming ? "AI กำลังเล่าเรื่อง..." : "🖋️ ให้ AI เขียนฉากนี้ (Stream)"}</span>
              </button>

              <button
                disabled={isStreaming || !activeScene?.contentMarkdown}
                onClick={() => handleStartStream("regenerate")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-thai border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>เขียนใหม่</span>
              </button>

              <button
                disabled={isStreaming || !activeScene?.contentMarkdown}
                onClick={() => handleStartStream("expand")}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-thai border border-slate-700 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>ขยายฉาก</span>
              </button>

              {/* Studio View Mode Switcher (Read / Markdown Edit / Dialogue-Image Pairing) */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
                <button
                  onClick={() => setStudioViewMode("preview")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-thai transition-colors ${
                    studioViewMode === "preview"
                      ? "bg-amber-500 text-slate-950 font-bold shadow"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>โหมดอ่าน</span>
                </button>

                <button
                  onClick={() => setStudioViewMode("edit")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-thai transition-colors ${
                    studioViewMode === "edit"
                      ? "bg-amber-500 text-slate-950 font-bold shadow"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขเอง (Markdown)</span>
                </button>

                <button
                  onClick={() => setStudioViewMode("dialogue_bindings")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-thai transition-colors ${
                    studioViewMode === "dialogue_bindings"
                      ? "bg-amber-500 text-slate-950 font-bold shadow"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>🎬 กำกับภาพตามบทพูด</span>
                  {boundDialogueCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        studioViewMode === "dialogue_bindings"
                          ? "bg-slate-950 text-amber-400"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {boundDialogueCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                disabled={isAnalyzing || !activeScene?.contentMarkdown}
                onClick={handleRunAnalysis}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-thai border border-slate-700 transition-colors disabled:opacity-50"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAnalyzing ? "กำลังตรวจ..." : "ตรวจ Continuity & Moments"}</span>
              </button>
            </div>
          </div>

          {/* Reading & Narrative Content Area */}
          <div className="min-h-[420px] rounded-xl bg-slate-900/40 p-5 border border-slate-800/80">
            {isStreaming ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 font-thai animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>AI กำลังประพันธ์เนื้อเรื่องแบบ Real-Time...</span>
                </div>
                <div className="prose prose-invert prose-amber max-w-none font-thai text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-2 h-4 bg-amber-400 ml-1 animate-pulse" />
                </div>
              </div>
            ) : studioViewMode === "edit" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-thai">
                    โหมดแก้ไขเนื้อเรื่องโดยตรง (Markdown)
                  </span>
                  <button
                    disabled={isSavingScene}
                    onClick={handleSaveContent}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {isSavingScene ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                  </button>
                </div>
                <textarea
                  rows={16}
                  value={editableMarkdown}
                  onChange={(e) => setEditableMarkdown(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 font-thai leading-relaxed focus:outline-none focus:border-amber-400"
                />
              </div>
            ) : studioViewMode === "dialogue_bindings" ? (
              <div className="space-y-4">
                {/* Director Header Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <Film className="w-4 h-4 text-amber-400" />
                        <span>🎬 สตูดิโอกำกับภาพตามบทสนทนา (Dialogue-Image Sync)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-thai font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        จับคู่แล้ว {boundDialogueCount} / {studioDialogueBlocks.length} ประโยค
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-thai">
                      เลือกภาพประกอบที่จะให้ปรากฏบนการ์ดภาพฝั่งซ้ายเมื่อผู้อ่านเลื่อนอ่านถึงประโยคนี้
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleAutoDistributeImages}
                      disabled={sceneImages.length === 0 || studioDialogueBlocks.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-thai font-semibold transition-colors"
                      title="กระจายภาพทั้งหมดในฉากนี้อย่างสม่ำเสมอตามบทพูด"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>✨ จับคู่อัตโนมัติ</span>
                    </button>

                    {boundDialogueCount > 0 && (
                      <button
                        onClick={handleClearAllBindings}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 hover:text-red-300 text-slate-400 border border-slate-700 text-xs font-thai transition-colors"
                        title="ล้างการจับคู่ภาพทั้งหมด"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>ล้างทั้งหมด</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSaveDialogueBindings()}
                      disabled={isSavingBindings}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-thai transition-colors shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                    >
                      {isSavingBindings ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>{isSavingBindings ? "กำลังบันทึก..." : "บันทึกการผูกภาพ"}</span>
                    </button>

                    <Link
                      href={`/projects/${projectId}/read?sceneId=${activeSceneId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-thai font-semibold transition-colors"
                      target="_blank"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>เปิดอ่านใน Reader ↗</span>
                    </Link>
                  </div>
                </div>

                {/* Scene Images Summary Banner */}
                {sceneImages.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs font-thai flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>ฉากนี้ยังไม่มีภาพประกอบ กรุณาสร้างภาพ AI หรืออัปโหลด Movie Still จากฝั่งซ้าย (Visual Stage) ก่อน</span>
                    </div>
                    <button
                      onClick={() => setVisualTab("ai_scenes")}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400"
                    >
                      ไปที่ Visual Stage
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-thai text-slate-400">
                    <span>คลังภาพในฉากนี้: {sceneImages.length} ภาพ (AI: {aiImages.length}, หนังจริง: {movieStills.length})</span>
                    <span className="text-[11px] text-slate-500">เลือกภาพในแต่ละประโยคด้านล่างได้เลย ระบบบันทึกให้อัตโนมัติ</span>
                  </div>
                )}

                {/* Dialogue Sentences List */}
                {studioDialogueBlocks.length > 0 ? (
                  <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                    {studioDialogueBlocks.map((block, idx) => {
                      const assignedImageId = localDialogueBindings[String(idx)];
                      const assignedImage = sceneImages.find((img) => img.id === assignedImageId);
                      const isSelf = block.speaker?.characterType === "self";
                      const isFriend = block.speaker?.characterType === "friend";
                      const displayName =
                        block.speaker?.realNickname || block.speaker?.name || block.speakerName || "ผู้พูด";

                      return (
                        <div
                          key={block.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            assignedImage
                              ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            {/* Left: Speaker & Dialogue Text */}
                            <div className="flex items-start gap-3 flex-1">
                              {/* Line Index Badge */}
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex-shrink-0">
                                #{idx + 1}
                              </span>

                              {/* Speaker Avatar & Name */}
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-thai font-bold ${
                                      isSelf ? "text-amber-400" : isFriend ? "text-sky-400" : "text-slate-300"
                                    }`}
                                  >
                                    {isSelf ? "👑 " : isFriend ? "🧑‍🤝‍🧑 " : ""}{displayName}
                                  </span>
                                  {block.isNarrator && (
                                    <span className="text-[9px] font-thai text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
                                      ผู้บรรยาย
                                    </span>
                                  )}
                                  {block.type === "sound" && (
                                    <span className="text-[9px] font-thai text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                                      เสียงประกอบ
                                    </span>
                                  )}
                                </div>
                                <p className="font-thai text-slate-200 text-sm leading-relaxed">
                                  {block.text}
                                </p>
                              </div>
                            </div>

                            {/* Right: Image Selector Dropdown & Assigned Thumbnail */}
                            <div className="flex-shrink-0 w-full sm:w-72 space-y-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={assignedImageId || ""}
                                  onChange={(e) => handleAssignImageToBlock(idx, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-thai focus:outline-none focus:border-amber-400"
                                >
                                  <option value="">⚪ คงภาพเดิม (ไม่เปลี่ยนภาพ)</option>
                                  {sceneImages.map((img, imgIdx) => {
                                    const isMovie = img.kind === "movie_still" || img.kind === "reference";
                                    const label = img.caption || img.prompt.slice(0, 35);
                                    return (
                                      <option key={img.id} value={img.id}>
                                        🖼️ ภาพ #{imgIdx + 1} [{isMovie ? "MOVIE" : "AI"}]: {label}
                                      </option>
                                    );
                                  })}
                                </select>

                                {assignedImageId && (
                                  <button
                                    onClick={() => handleAssignImageToBlock(idx, "")}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 transition-colors"
                                    title="ยกเลิกการผูกภาพ"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Assigned Image Thumbnail Card */}
                              {assignedImage && (
                                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/90 border border-amber-500/40">
                                  <div className="relative aspect-video w-16 h-10 rounded overflow-hidden flex-shrink-0 border border-black/40">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={assignedImage.filePath}
                                      alt={assignedImage.caption || ""}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold text-amber-400 block truncate font-thai">
                                      {assignedImage.caption || "ภาพประจำประโยคนี้"}
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400 block truncate">
                                      {assignedImage.kind === "movie_still" ? "CANON MOVIE STILL" : "AI SCENE"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">
                    <PenTool className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-400" />
                    <p className="text-sm font-thai">ยังไม่มีบทพูดหรือเนื้อเรื่องในฉากนี้</p>
                    <p className="text-xs font-thai mt-1 text-slate-400">
                      กรอก Director&apos;s Note ด้านบน แล้วกดปุ่ม &quot;🖋️ ให้ AI เขียนฉากนี้&quot; ก่อน
                    </p>
                  </div>
                )}
              </div>
            ) : activeScene?.contentMarkdown ? (
              <div className="prose prose-invert prose-amber max-w-none font-thai text-slate-200 text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeScene.contentMarkdown}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                <PenTool className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-400" />
                <p className="text-sm font-thai">ฉากนี้ยังไม่มีเนื้อเรื่อง</p>
                <p className="text-xs font-thai mt-1 text-slate-400">
                  กรอก Director&apos;s Note ด้านบน แล้วกดปุ่ม &quot;🖋️ ให้ AI เขียนฉากนี้ (Stream)&quot; ได้ทันที
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Create New Scene Modal */}
      {/* ========================================================= */}
      {showNewSceneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="cinematic-card w-full max-w-lg rounded-2xl p-6 border-slate-700 space-y-4 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white">เพิ่มฉากใหม่ในเรื่อง</h3>
              <button
                onClick={() => setShowNewSceneModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  ชื่อฉาก <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น เผชิญหน้าสภาเงา, เพลิงไหม้ที่ท่าเรือ"
                  value={newSceneTitle}
                  onChange={(e) => setNewSceneTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">สถานที่เกิดเหตุ</label>
                <input
                  type="text"
                  placeholder="เช่น Dragonstone Crypts, King's Landing, Castle Black"
                  value={newSceneLocation}
                  onChange={(e) => setNewSceneLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  เลือกตัวละครที่จะอยู่ในฉากนี้
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-900 rounded-lg border border-slate-800">
                  {characters.map((c) => {
                    const isChecked = newSceneSelectedChars.includes(c.name);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-thai"
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

      {/* ========================================================= */}
      {/* MODAL 2: Add Movie Still Modal */}
      {/* ========================================================= */}
      {showAddStillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="cinematic-card w-full max-w-md rounded-2xl p-6 border-slate-700 space-y-4 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span>เพิ่มภาพจริงจากหนัง/ซีรีส์</span>
              </h3>
              <button
                onClick={() => setShowAddStillModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  คำอธิบายภาพ / สถานที่จริง
                </label>
                <input
                  type="text"
                  placeholder="เช่น ปราสาท Red Keep, ผากำแพง The Wall"
                  value={stillCaptionInput}
                  onChange={(e) => setStillCaptionInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  ใส่ URL ของภาพจากอินเทอร์เน็ต
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/movie-still.jpg"
                  value={stillUrlInput}
                  onChange={(e) => setStillUrlInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
                />
              </div>

              <div className="relative py-2 text-center text-xs text-slate-500 font-thai">
                <span>— หรืออัปโหลดไฟล์จากเครื่อง —</span>
              </div>

              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-lg border border-dashed border-slate-700 hover:border-amber-400 bg-slate-900 text-slate-300 hover:text-white text-xs font-thai flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>เลือกไฟล์รูปภาพจากคอมพิวเตอร์ของคุณ</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddStillModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-thai"
              >
                ยกเลิก
              </button>
              <button
                disabled={isUploadingStill || !stillUrlInput.trim()}
                onClick={handleAddMovieStill}
                className="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400 disabled:opacity-50"
              >
                {isUploadingStill ? "กำลังบันทึก..." : "บันทึกรูปภาพ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Continuity Check & Visual Moments Review */}
      {/* ========================================================= */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="cinematic-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 border-slate-700 space-y-5 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-heading text-lg font-bold text-white">
                  CONTINUITY CHECK & VISUAL MOMENTS
                </h3>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Contradiction Warning */}
            {analysisResult.continuityCheck.hasContradiction && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-thai space-y-1">
                <div className="flex items-center gap-2 font-bold text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>คำเตือน: พบข้อขัดแย้งกับ Continuity Ledger!</span>
                </div>
                <p>{analysisResult.continuityCheck.warningDetails}</p>
                <p className="text-amber-300">
                  คำแนะนำในการแก้ไข: {analysisResult.continuityCheck.aiFixSuggestion}
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-amber-300 font-thai">สรุปฉาก (3-5 บรรทัด):</h4>
              <p className="text-xs text-slate-200 font-thai leading-relaxed">
                {analysisResult.summary}
              </p>
            </div>

            {/* Visual Moments (AI Suggestions) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-300 font-thai flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>3 จังหวะน่าวาดประจำฉาก (Visual Moments) - กดสร้างภาพได้ทันที:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {analysisResult.suggestedVisualMoments.map((moment: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-white font-thai">{moment.momentTitle}</h5>
                      <p className="text-[11px] text-slate-400 font-thai line-clamp-2 mt-1">
                        {moment.compositionDescription}
                      </p>
                    </div>
                    <button
                      disabled={isGeneratingImage}
                      onClick={() => {
                        handleGenerateImage(moment.englishPrompt);
                        setShowAnalysisModal(false);
                      }}
                      className="w-full py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-thai font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>สร้างภาพจังหวะนี้</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Proposed Ledger Updates */}
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-xs font-thai">
              <h4 className="font-bold text-slate-200">
                ข้อมูลที่จะอัปเดตลง Continuity Ledger:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>
                  <span className="text-amber-400 font-semibold">ผู้บาดเจ็บ/แผลใหม่:</span>{" "}
                  {analysisResult.ledgerUpdates.newInjuries.join(", ") || "ไม่มี"}
                </div>
                <div>
                  <span className="text-red-400 font-semibold">ผู้เสียชีวิตใหม่:</span>{" "}
                  {analysisResult.ledgerUpdates.newDeaths.map((d: any) => `${d.name} (${d.cause})`).join(", ") || "ไม่มี"}
                </div>
                <div className="col-span-2">
                  <span className="text-emerald-400 font-semibold">ปมใหม่ที่เปิด (Open Threads):</span>{" "}
                  {analysisResult.ledgerUpdates.newOpenThreads.join(", ") || "ไม่มี"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-thai"
              >
                ปิดหน้าต่าง
              </button>

              <button
                disabled={isApplyingLedger}
                onClick={handleConfirmLedgerUpdate}
                className="px-6 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs font-thai hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isApplyingLedger ? "กำลังบันทึก..." : "ยืนยันการอัปเดตลง Continuity Ledger"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: Version History Modal */}
      {/* ========================================================= */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="cinematic-card w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 border-slate-700 space-y-4 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>ประวัติเวอร์ชันของฉาก (Version History)</span>
              </h3>
              <button
                onClick={() => setShowVersionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {sceneVersions.length === 0 ? (
                <p className="text-xs text-slate-400 font-thai text-center py-6">
                  ยังไม่มีประวัติเวอร์ชันอื่น
                </p>
              ) : (
                sceneVersions.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold font-mono text-amber-400">
                        Version {v.versionNumber}
                      </span>
                      <p className="text-slate-400 font-thai text-[11px] mt-0.5 line-clamp-1">
                        {v.contentMarkdown?.slice(0, 100) || "(ไม่มีเนื้อหา)"}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditableMarkdown(v.contentMarkdown);
                        setStudioViewMode("edit");
                        setShowVersionModal(false);
                        toast.info(`โหลดเนื้อหา Version ${v.versionNumber} เข้าสู่ตัวแก้ไขแล้ว`);
                      }}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-thai whitespace-nowrap"
                    >
                      กู้คืนเวอร์ชันนี้
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Lightbox Modal */}
      {/* ========================================================= */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Fullscreen Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
