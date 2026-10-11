"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Film,
  Sparkles,
  MapPin,
  Users,
  PenTool,
  Clock,
  Layers,
  ArrowLeft,
  ArrowRight,
  Check,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

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
  const [characters, setCharacters] = useState<any[]>([]);
  const [activeScene, setActiveScene] = useState<SceneItem | null>(null);
  const [allScenesList, setAllScenesList] = useState<{ part: PartItem; scene: SceneItem }[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [loading, setLoading] = useState(true);

  // Load project & all parts/scenes
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

        // Flatten all scenes across all parts for seamless next/prev navigation
        const flatList: { part: PartItem; scene: SceneItem }[] = [];
        (data.parts || []).forEach((p: PartItem) => {
          (p.scenes || []).forEach((s: SceneItem) => {
            flatList.push({ part: p, scene: s });
          });
        });
        setAllScenesList(flatList);

        // Determine which scene to show
        if (flatList.length > 0) {
          if (initialSceneId) {
            const found = flatList.find((item) => item.scene.id === initialSceneId);
            if (found) {
              setActiveScene(found.scene);
              loadSceneImages(found.scene.id);
              return;
            }
          }
          // Default to first scene
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

  // Load images specifically for the active scene
  const [activeSceneImages, setActiveSceneImages] = useState<SceneImage[]>([]);

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

  // Font size classes
  const fontClass =
    fontSize === "xlarge"
      ? "text-xl leading-loose"
      : fontSize === "large"
      ? "text-lg leading-relaxed"
      : "text-base leading-relaxed";

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-12">
        <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[500px] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          <div className="h-[500px] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Floating Navigation Bar */}
      <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#090d16]/95 border border-slate-800/80 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-thai font-semibold transition-colors"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <span>กลับไป Studio แก้ไข</span>
          </Link>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Quick Scene Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={activeScene?.id || ""}
              onChange={(e) => {
                const found = allScenesList.find((item) => item.scene.id === e.target.value);
                if (found) handleSelectSceneItem(found.scene);
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none font-thai max-w-[220px] truncate"
            >
              {allScenesList.map(({ part, scene }) => (
                <option key={scene.id} value={scene.id} className="bg-slate-900">
                  ภาค {part.number} • ฉาก {scene.order}: {scene.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reader Tools (Font Size & Navigation) */}
        <div className="flex items-center gap-2">
          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold font-mono">
            <button
              onClick={() => setFontSize("normal")}
              className={`px-2 py-0.5 rounded ${
                fontSize === "normal"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
              title="ขนาดปกติ"
            >
              A
            </button>
            <button
              onClick={() => setFontSize("large")}
              className={`px-2 py-0.5 rounded ${
                fontSize === "large"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
              title="ขนาดใหญ่"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize("xlarge")}
              className={`px-2 py-0.5 rounded ${
                fontSize === "xlarge"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
              title="ขนาดใหญ่พิเศษ"
            >
              A++
            </button>
          </div>

          {/* Prev / Next Scene Buttons */}
          <div className="flex items-center gap-1">
            <button
              disabled={!prevSceneItem}
              onClick={() => prevSceneItem && handleSelectSceneItem(prevSceneItem.scene)}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="ฉากก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={!nextSceneItem}
              onClick={() => nextSceneItem && handleSelectSceneItem(nextSceneItem.scene)}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="ฉากถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Reader View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: Visual Showcase (AI Concept Art & Movie Stills)     */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 lg:sticky lg:top-32 space-y-4">
          <div className="cinematic-card rounded-2xl overflow-hidden border-slate-800 bg-[#090d16] shadow-2xl">
            {/* Hero Image Showcase */}
            {currentFeaturedImage ? (
              <div className="space-y-3">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentFeaturedImage.filePath}
                    alt={currentFeaturedImage.caption || currentFeaturedImage.prompt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />

                  {/* Gradient shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Badges on Top */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    {currentFeaturedImage.kind === "movie_still" || currentFeaturedImage.kind === "reference" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/90 text-red-300 border border-red-800/80 font-thai flex items-center gap-1.5 backdrop-blur-md shadow">
                        <Film className="w-3.5 h-3.5 text-red-400" />
                        <span>ภาพจริงจากหนัง / CANON STILL</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/90 text-slate-950 font-thai flex items-center gap-1.5 backdrop-blur-md shadow font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ภาพประกอบ AI (CINEMATIC SCENE)</span>
                      </span>
                    )}
                  </div>

                  {/* Lightbox Trigger */}
                  <button
                    onClick={() => setLightboxImage(currentFeaturedImage.filePath)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all shadow"
                    title="ดูภาพขยายเต็มจอ"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  {/* Caption & Location overlaid at bottom of image */}
                  <div className="absolute bottom-3 inset-x-3 text-slate-100 font-thai">
                    <p className="text-sm font-semibold drop-shadow-md line-clamp-2">
                      {currentFeaturedImage.caption || currentFeaturedImage.prompt}
                    </p>
                  </div>
                </div>

                {/* Thumbnails Strip if multiple images exist */}
                {activeSceneImages.length > 1 && (
                  <div className="p-3 pt-0 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 font-thai">
                      ภาพประกอบทั้งหมดของฉากนี้ ({activeSceneImages.length} ภาพ):
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
                                ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400 scale-105"
                                : "border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700"
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
              </div>
            ) : (
              <div className="aspect-[16/10] w-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Film className="w-12 h-12 mb-3 text-slate-700" />
                <p className="text-sm font-thai text-slate-400 font-medium">ยังไม่มีภาพประกอบสำหรับฉากนี้</p>
                <p className="text-xs font-thai text-slate-500 mt-1">
                  สามารถสลับไปที่ Studio เพื่อสั่ง AI วาดภาพ หรืออัปโหลดภาพจริงจากหนังได้
                </p>
                <Link
                  href={`/projects/${projectId}`}
                  className="mt-4 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-thai border border-slate-700 transition-colors"
                >
                  ไปที่ Studio เพื่อใส่รูปภาพ
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: Pure Novel Reader (เนื้อเรื่องนิยายสไตล์หนังสือ)   */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          <div className="cinematic-card rounded-2xl p-6 sm:p-10 border-slate-800/80 bg-[#090d16]/90 shadow-2xl space-y-8">
            {/* Novel Header Info */}
            <div className="space-y-4 border-b border-slate-800/80 pb-6 text-center sm:text-left">
              {/* Part & Arc Subtitle */}
              {currentPart && (
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    PART {currentPart.number}
                  </span>
                  <span className="text-xs text-slate-400 font-thai">
                    {currentPart.title}
                  </span>
                </div>
              )}

              {/* Scene Main Title */}
              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                {activeScene ? activeScene.title : "ยังไม่ได้เลือกฉาก"}
              </h1>

              {/* Location & Cast Meta */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-thai pt-1 justify-center sm:justify-start">
                {activeScene?.location && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeScene.location}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>~{Math.max(1, Math.round((activeScene?.wordCount || 300) / 250))} นาทีการอ่าน</span>
                </span>
              </div>

              {/* Characters In Scene Pills */}
              {activeScene?.charactersPresentParsed && activeScene.charactersPresentParsed.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 justify-center sm:justify-start">
                  <span className="text-xs text-slate-500 font-thai mr-1">ตัวละครที่ปรากฏตัว:</span>
                  {activeScene.charactersPresentParsed.map((name) => {
                    const charObj = characters.find(
                      (c) => c.name === name || c.realNickname === name
                    );
                    const isFriend = charObj?.characterType === "friend";
                    const isSelf = charObj?.characterType === "self";

                    return (
                      <span
                        key={name}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-thai ${
                          isSelf
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-semibold"
                            : isFriend
                            ? "bg-sky-950/80 text-sky-300 border border-sky-800/60 font-semibold"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {isSelf ? "👑 " : isFriend ? "🧑‍🤝‍🧑 " : ""}
                        {name} {charObj?.realNickname ? `(${charObj.realNickname})` : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Novel Prose Reading Area */}
            <div className="space-y-6">
              {activeScene?.contentMarkdown ? (
                <div className={`prose prose-invert prose-amber max-w-none font-thai text-slate-200 ${fontClass} tracking-normal`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeScene.contentMarkdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 font-thai">
                  <p>ยังไม่มีเนื้อเรื่องในฉากนี้</p>
                  <Link
                    href={`/projects/${projectId}`}
                    className="mt-3 inline-block text-amber-400 underline text-xs"
                  >
                    ไปที่ Studio เพื่อสั่ง AI เขียนฉากนี้
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom Chapter Navigation Footer */}
            <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              {prevSceneItem ? (
                <button
                  onClick={() => handleSelectSceneItem(prevSceneItem.scene)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-thai font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500">ฉากก่อนหน้า</p>
                    <p className="truncate max-w-[180px]">{prevSceneItem.scene.title}</p>
                  </div>
                </button>
              ) : (
                <div />
              )}

              {nextSceneItem ? (
                <button
                  onClick={() => handleSelectSceneItem(nextSceneItem.scene)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-thai shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all"
                >
                  <div className="text-right">
                    <p className="text-[10px] text-slate-900/80">อ่านฉากถัดไป</p>
                    <p className="truncate max-w-[180px]">{nextSceneItem.scene.title}</p>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href={`/projects/${projectId}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-thai font-semibold hover:bg-amber-500/30 transition-colors"
                >
                  <PenTool className="w-4 h-4" />
                  <span>จบฉากทั้งหมดแล้ว • ไปที่ Studio เพื่อเขียนเพิ่ม</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Fullscreen Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer"
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
