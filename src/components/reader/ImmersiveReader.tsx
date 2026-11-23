"use client";
import {VolumeControl} from "@/components/audio/VolumeControl";
import {useSfxPlaybackController,SfxPlaybackPanel} from "@/components/sfx/SfxPlaybackControls";
import type {SfxTrack} from "@/lib/audio/sfxCues";
import {YouTubeBgmPlayer} from "./YouTubeBgmPlayer";
import {musicPlaybackLevel,isReaderVideo,readerVideoRange} from "@/lib/audio/readerPlayback";
import {BookmarkButton} from "@/components/account/BookmarkButton";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  List,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Settings2,
  Volume2,
  VolumeX,
  X,
  MapPin,
  Sparkles,
  Activity,
  Eye,
  EyeOff,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {readerMotionPreference,readerMotionEnabled,type ReaderMotionPreference} from "@/lib/story/readerMotion";
import { musicSourceLabel } from "@/lib/audio/sceneMusic";
import { adjacentEpisode } from "@/lib/story/readerNavigation";
import type { DialogueBlock } from "@/lib/story/dialogueParser";
import { readingEmphasis, readingDelivery } from "@/lib/story/readingEmphasis";
import { extractYouTubeVideoId } from "@/lib/audio/audioHelpers";
import { useReaderAtmosphere } from "./useReaderAtmosphere";
import { ATMOSPHERES } from "@/lib/story/readerAtmosphere";
import { ReaderCharacterStatus } from "./ReaderCharacterStatus";
import { NarrationPlayer } from "@/components/audio/NarrationPlayer";
import "./immersive-reader.css";
type Media = {
  id: string;
  filePath: string;
  caption?: string;
  metadata?: string | null;
  provider?: string;
};
type Entry = {
  part: { number: number; title: string };
  episode?: { number: number; title: string };
  scene: { id: string; title: string; location: string };
};
type Props = {
  projectId: string;
  title: string;
  universe: string;
  scene: {
    id: string;
    title: string;
    location: string;
    bgmUrl?: string | null;
    bgmTitle?: string | null;
    bgmSource?: string;
    dialogueBindings?: string | null;
  } | null;
  tracks?: SfxTrack[];
  entries: Entry[];
  blocks: DialogueBlock[];
  index: number;
  onIndex: (i: number) => void;
  onScene: (id: string) => void;
  media: Media | null;
  onDucking: (v: boolean) => void;
};
const isVideo = isReaderVideo;
export function ImmersiveReader(p: Props) {
  const [mode, setMode] = useState<"cinema" | "scroll">("cinema"),
    [panel, setPanel] = useState<
      "contents" | "settings" | "audio" | "status" | null
    >(null),
    [uiHidden, setUiHidden] = useState(false),
    [auto, setAuto] = useState(false),
    [motionMode, setMotionMode] = useState<ReaderMotionPreference>("system"),
    [systemReducedMotion, setSystemReducedMotion] = useState(false),
    [motionTest, setMotionTest] = useState(0),
    [textEffects, setTextEffects] = useState(true),
    [camera, setCamera] = useState(true),
    [narrating, setNarrating] = useState(false),
    [size, setSize] = useState(22),
    [idle, setIdle] = useState(false),
    [muted, setMuted] = useState(true),
    [musicVolume,setMusicVolume]=useState(.25),
    [musicError,setMusicError]=useState(""),
    [videoManual,setVideoManual]=useState<boolean|null>(null),
    [videoPlaying,setVideoPlaying]=useState(false),
    [videoError,setVideoError]=useState(""),
    [full, setFull] = useState(false),
    [previous, setPrevious] = useState<Media | null>(null),
    [ready, setReady] = useState(false);
  const restoreButton = useRef<HTMLButtonElement>(null);
  const hideButton = useRef<HTMLButtonElement>(null);
  const motion=ready && readerMotionEnabled(motionMode,systemReducedMotion);
  const videoWanted=ready&&(videoManual??!systemReducedMotion);
  const musicLevel=musicPlaybackLevel(musicVolume,muted,narrating);
  const videoRef=useRef<HTMLVideoElement>(null);
  const videoIntent=useRef(videoWanted);videoIntent.current=videoWanted;
  const panelDialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null),
    bgm = useRef<HTMLAudioElement>(null),
    lastMedia = useRef<Media | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    rows = useRef<(HTMLElement | null)[]>([]),
    progressScene = useRef(""),
    current = useRef(p);
  current.current = p;
  const active = p.blocks[p.index],
    sceneIndex = p.entries.findIndex((e) => e.scene.id === p.scene?.id),
    entry = p.entries[sceneIndex],
    atEnd = p.index >= p.blocks.length - 1;
  let sfxBindings:Record<string,string>={};
  try{const parsed=JSON.parse(p.scene?.dialogueBindings||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))sfxBindings=parsed;}catch{}
  const sfxPlayback=useSfxPlaybackController({sceneId:p.scene?.id||"",index:p.index,bindings:sfxBindings,tracks:p.tracks||[]});
  const episodes = adjacentEpisode(p.entries, p.scene?.id);
  const title = p.scene?.title || "ยังไม่มีฉาก";
  const atmosphere = useReaderAtmosphere(p.scene?.location || "", title, narrating);
  const ambientName = ATMOSPHERES.find(a => a.value === atmosphere.kind)?.label || "";
  const youtubeId = extractYouTubeVideoId(p.scene?.bgmUrl || "");
  const directBgm =
    p.scene?.bgmUrl && !/youtu(?:\.be|be\.com)/i.test(p.scene.bgmUrl)
      ? p.scene.bgmUrl
      : null;
  useEffect(() => {
    document.body.classList.add("immersive-reading");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const updateReduced=()=>setSystemReducedMotion(reduced.matches);
    updateReduced();
    reduced.addEventListener("change",updateReduced);
    try {
      const saved = JSON.parse(
        localStorage.getItem("saga-reader-preferences") || "{}",
      );
      setMode(saved.mode === "scroll" ? "scroll" : "cinema");
      setSize(Math.min(30, Math.max(18, Number(saved.size) || 22)));
      setMotionMode(readerMotionPreference(saved));
      setTextEffects(saved.textEffects !== false);
      setCamera(saved.camera !== false);
      if(typeof saved.musicVolume==="number"&&Number.isFinite(saved.musicVolume))setMusicVolume(Math.max(0,Math.min(1,saved.musicVolume)));
      if(typeof saved.videoManual==="boolean")setVideoManual(saved.videoManual);
    } catch {
      setMotionMode("system");
    }
    setReady(true);
    return () => {
      reduced.removeEventListener("change",updateReduced);
      document.body.classList.remove("immersive-reading");
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        "saga-reader-preferences",
        JSON.stringify({ mode, size, motion:motionMode!=="off", motionMode, textEffects, camera, musicVolume, videoManual }),
      );
    } catch {}
  }, [mode, size, motionMode, textEffects, camera, musicVolume, videoManual, ready]);
  useEffect(() => {
    if (!p.scene?.id || !p.blocks.length) return;
    setAuto(false);
    setIdle(false);
    progressScene.current = p.scene.id;
    setNarrating(false);
  }, [p.scene?.id, p.blocks.length]);
  useEffect(() => {
    if (lastMedia.current?.filePath !== p.media?.filePath) {
      setPrevious(lastMedia.current);
      lastMedia.current = p.media;
      const t = setTimeout(() => setPrevious(null), 1000);
      return () => clearTimeout(t);
    }
  }, [p.media?.filePath]);
  useEffect(() => {
    if (!auto || mode !== "cinema" || panel || !active) return;
    if (atEnd) {
      setAuto(false);
      return;
    }
    const delay = Math.min(
      18000,
      Math.max(3500, Array.from(active.text).length * 85 + 1200 + (textEffects && readingDelivery(active) !== "plain" ? 700 : 0)),
    );
    const t = setTimeout(() => p.onIndex(p.index + 1), delay);
    return () => clearTimeout(t);
  }, [auto, mode, panel, p.index, active?.text, atEnd, textEffects]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setAuto(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest("input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox],[role=slider]") || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (e.key === "Escape") {
        if (uiHidden) {
          e.preventDefault();
          setUiHidden(false);
        }
        setPanel(null);
        setAuto(false);
        return;
      }
      if (panel) return;
      if (e.key.toLowerCase() === "h" && !e.repeat) {
        e.preventDefault();
        setUiHidden(value => !value);
        setAuto(false);
        return;
      }
      // Arrows work after clicking controls too; Space/Enter retain native button behavior.
      if (e.key === " " && target?.closest("button,a,summary,[role=button]")) return;
      const props = current.current;
      const direction = ["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key) ? 1
        : ["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key) ? -1 : 0;
      if (!direction) return;
      e.preventDefault();
      setAuto(false);
      if (e.shiftKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
        const adjacent = adjacentEpisode(props.entries, props.scene?.id);
        const destination = direction > 0 ? adjacent.next : adjacent.previous;
        if (destination) {
          props.onScene(destination.scene.id);
        }
        return;
      }
      if (!props.blocks.length) return;
      props.onIndex(Math.max(0, Math.min(props.index + direction, props.blocks.length - 1)));
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [panel, uiHidden]);
  useEffect(() => {
    if (uiHidden) restoreButton.current?.focus({ preventScroll: true });
    else if (document.activeElement === restoreButton.current) hideButton.current?.focus({ preventScroll: true });
  }, [uiHidden]);
  useEffect(() => {
    if (mode === "scroll")
      rows.current[p.index]?.scrollIntoView({
        behavior: motion ? "smooth" : "auto",
        block: "nearest",
      });
  }, [mode, p.index]);
  useEffect(() => {
    const changed = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(()=>{setMusicError('');},[directBgm,youtubeId]);
  useEffect(()=>{if(bgm.current)bgm.current.volume=musicLevel;},[musicLevel,directBgm]);
  useEffect(()=>{
    const audio=bgm.current;if(!audio)return;
    if(muted)audio.pause();else audio.play().catch(()=>{setMuted(true);setMusicError('เบราว์เซอร์รอให้เปิดเสียง กดเปิดเพลงอีกครั้งครับ');});
  },[muted,directBgm]);
  useEffect(() => {
    if (panel) panelDialog.current?.showModal();
    if (panel !== "audio") setNarrating(false);
  }, [panel]);
  const playVideo=()=>{
    const video=videoRef.current;if(!video)return;
    video.muted=true;
    if(videoIntent.current)video.play().catch(()=>{if(videoRef.current===video&&videoIntent.current){setVideoPlaying(false);setVideoError('วิดีโอยังไม่เริ่มเล่น กดเล่นวิดีโออีกครั้ง');}});
    else video.pause();
  };
  useEffect(()=>{setVideoError('');setVideoPlaying(false);playVideo();},[videoWanted,p.media?.filePath]);
  useEffect(()=>{const video=videoRef.current;if(!video||video.readyState<1)return;const range=readerVideoRange(p.media?.metadata,video.duration);if(video.currentTime<range.start||(range.end!==null&&video.currentTime>range.end))video.currentTime=range.start;},[p.media?.metadata]);
  const wake = () => {
    setIdle(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!panel) setIdle(true);
    }, 5000);
  };
  const step = (direction: number) => {
    setAuto(false);
    wake();
    p.onIndex(Math.min(Math.max(0, p.index + direction), p.blocks.length - 1));
  };
  const changeScene = (id: string) => {
    setAuto(false);
    setPanel(null);
    p.onScene(id);
  };
  const hideInterface = () => {
    setAuto(false);
    setPanel(null);
    setUiHidden(true);
  };
  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      setFull(false);
    }
  };
  const renderMedia = (m: Media, old = false) =>
    isVideo(m) ? (
      <video
        key={m.filePath}
        ref={old?undefined:videoRef}
        className={`ir-backdrop ${old ? "ir-old" : ""}`}
        src={m.filePath}
        autoPlay={!old&&videoWanted}
        muted
        playsInline
        preload="metadata"
        onPlay={()=>{if(!old){setVideoPlaying(true);setVideoError('');}}}
        onPause={()=>{if(!old)setVideoPlaying(false);}}
        onError={()=>{if(!old){setVideoPlaying(false);setVideoError('โหลดวิดีโอไม่ได้ หรือเบราว์เซอร์ไม่รองรับรูปแบบไฟล์นี้');}}}
        onLoadedMetadata={event=>{
          const range=readerVideoRange(m.metadata,event.currentTarget.duration);
          if(range.start>0)event.currentTarget.currentTime=range.start;
          if(!old)playVideo();
        }}
        onTimeUpdate={event=>{
          const video=event.currentTarget,range=readerVideoRange(m.metadata,video.duration);
          if(!old&&range.end!==null&&video.currentTime>=range.end){video.currentTime=range.start;if(videoIntent.current)playVideo();}
        }}
        onEnded={event=>{if(!old&&videoIntent.current){event.currentTarget.currentTime=readerVideoRange(m.metadata,event.currentTarget.duration).start;playVideo();}}}
      />
    ) : (
      <img
        key={m.filePath}
        className={`ir-backdrop ${old ? "ir-old" : ""}`}
        src={m.filePath}
        alt={old ? "" : m.caption || `ภาพประกอบ ${title}`}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/images/story-placeholder.svg";
        }}
      />
    );
  const speakerSide = (b: DialogueBlock) => {
    const ids = Array.from(
      new Set(
        p.blocks
          .filter((x) => x.type === "dialogue" && !x.isNarrator)
          .map((x) => x.speaker?.id || x.speakerName || "ตัวละคร"),
      ),
    );
    return ids.indexOf(b.speaker?.id || b.speakerName || "ตัวละคร") % 2 === 0
      ? "left"
      : "right";
  };
  const blockView = (b: DialogueBlock, i: number, continuous = false) => {
    const narrator = b.type === "narration" || b.isNarrator,
      sound = b.type === "sound";
    const emphasis = ready && motion && textEffects && i === p.index ? readingEmphasis(b) : "none";
    const delivery = ready && motion && textEffects && i === p.index ? readingDelivery(b) : "plain";
    const textClass = emphasis !== "none" ? `ir-text-emphasis ir-text-${emphasis}` : delivery !== "plain" ? `ir-text-emphasis ir-text-${delivery}` : undefined;
    return (
      <article
        key={`${p.scene?.id}-${i}`}
        ref={(el) => {
          if (continuous) rows.current[i] = el;
        }}
        className={`ir-beat ${narrator ? "ir-narration" : sound ? "ir-sound" : `ir-dialogue ir-${speakerSide(b)}`} ${i === p.index ? "is-current" : "is-history"} ${continuous ? "ir-continuous" : ""}`}
      >
        {sound ? (
          <>
            <span className="ir-speaker">
              <Sparkles size={14} />
              บรรยากาศ
            </span>
            <p className={textClass} data-emphasis={emphasis}>{b.text}</p>
          </>
        ) : narrator ? (
          <>
            <span className="ir-speaker">บทบรรยาย</span>
            <p className={textClass} data-emphasis={emphasis}>{b.text}</p>
          </>
        ) : (
          <>
            <div className="ir-speaker">
              {b.speaker?.avatarUrl ? (
                <img src={b.speaker.avatarUrl} alt="" />
              ) : (
                <span className="ir-initial">
                  {(b.speakerName || b.speaker?.name || "?").slice(0, 1)}
                </span>
              )}
              <span>{b.speakerName || b.speaker?.name || "ตัวละคร"}</span>
            </div>
            <p className={textClass} data-emphasis={emphasis}>{b.text}</p>
          </>
        )}
        {continuous && (
          <button
            type="button"
            className="ir-select-beat"
            aria-label={`อ่านจากบทที่ ${i + 1}`}
            onClick={() => {
              p.onIndex(i);
              setAuto(false);
            }}
          >
            อ่านจากตรงนี้
          </button>
        )}
      </article>
    );
  };
  return (
    <div
      ref={root}
      className={`immersive-reader ir-${mode} ${motion ? "has-motion" : "no-motion"} ${motionMode==="on"?"motion-override-on":""} ${camera ? "has-camera" : "no-camera"} ${idle && !panel ? "is-idle" : ""} ${uiHidden ? "is-focus-reading" : ""}`}
      style={{ "--ir-font-size": `${size}px`, "--ir-shot-scale": active?.type === "dialogue" ? "1.02" : "1" } as React.CSSProperties}
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={wake}
    >
      <div className="ir-stage" aria-hidden={mode === "scroll" && !uiHidden}>
        {previous && renderMedia(previous, true)}
        {p.media ? (
          <div className="ir-camera-frame">{renderMedia(p.media)}</div>
        ) : (
          <div className="ir-no-art">
            <BookOpen size={60} />
            <span>{p.universe}</span>
          </div>
        )}
        <div className="ir-vignette" />
        <div className="ir-grain" />
      </div>
      {p.media&&isVideo(p.media)&&<div className="ir-video-controls" hidden={uiHidden&&videoPlaying}>
        <button type="button" aria-label={videoPlaying?'หยุดวิดีโอประกอบ':'เล่นวิดีโอประกอบ'} onClick={()=>{const next=!videoPlaying;setVideoManual(next);videoIntent.current=next;setVideoError('');if(next){if(videoRef.current?.error)videoRef.current.load();playVideo();}else videoRef.current?.pause();}}>{videoPlaying?<Pause size={16}/>:<Play size={16}/>}<span>{videoPlaying?'หยุดวิดีโอ':'เล่นวิดีโอ'}</span></button>
        {videoError&&<p role="status">{videoError}</p>}
      </div>}
      <header className="ir-header" hidden={uiHidden}>
        <Link href="/sagas" className="ir-back" aria-label="กลับชั้นหนังสือ">
          <ArrowLeft size={19} />
          <span>ชั้นหนังสือ</span>
        </Link>
        <div className="ir-book-title">
          <span>{p.universe}</span>
          <strong>{p.title}</strong>
        </div>
        <BookmarkButton projectId={p.projectId} sceneId={p.scene?.id} index={p.index}/><div className="ir-mode-switch" role="group" aria-label="รูปแบบการอ่าน">
          <button
            aria-pressed={mode === "cinema"}
            onClick={() => {
              setMode("cinema");
              setAuto(false);
            }}
          >
            ดื่มด่ำ
          </button>
          <button
            aria-pressed={mode === "scroll"}
            onClick={() => {
              setMode("scroll");
              setAuto(false);
            }}
          >
            อ่านต่อเนื่อง
          </button>
        </div>
      </header>
      <section hidden={uiHidden} className="ir-scene-heading" key={p.scene?.id}>
        <p>
          {entry
            ? `ภาค ${entry.part.number} · ${entry.episode ? `EP ${entry.episode.number}` : entry.part.title}`
            : "เรื่องราวของคุณ"}
        </p>
        <h1>{title}</h1>
        {p.scene?.location && (
          <span>
            <MapPin size={13} />
            {p.scene.location}
          </span>
        )}
      </section>
      {mode === "cinema" ? (
        <main className="ir-story-stage" aria-label="บทที่กำลังอ่าน">
          <div className="ir-scene-progress">
            <span>{String(p.index + 1).padStart(2, "0")}</span>
            <span>/ {p.blocks.length}</span>
          </div>
          <div className="ir-beats" aria-live="polite" aria-atomic="true">
            {p.blocks.length ? (
              <>
                {p.index > 0 &&
                  active?.type === "dialogue" &&
                  p.blocks[p.index - 1]?.type === "dialogue" &&
                  blockView(p.blocks[p.index - 1], p.index - 1)}
                {active && blockView(active, p.index)}
              </>
            ) : (
              <div className="ir-empty">
                <BookOpen />
                <h2>ฉากนี้ยังไม่มีเนื้อหา</h2>
                <Link href={`/projects/${p.projectId}`}>ไปห้องเขียน</Link>
              </div>
            )}
          </div>
          {atEnd && p.blocks.length > 0 && (
            <div className="ir-scene-end">
              จบฉาก
              {p.entries[sceneIndex + 1] ? (
                <button
                  onClick={() =>
                    changeScene(p.entries[sceneIndex + 1].scene.id)
                  }
                >
                  ฉากถัดไป · {p.entries[sceneIndex + 1].scene.title}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <span>คุณอ่านถึงฉากสุดท้ายแล้ว</span>
              )}
            </div>
          )}
        </main>
      ) : (
        <main className="ir-scroll-story" aria-label="เนื้อหาทั้งฉาก">
          {p.blocks.map((b, i) => blockView(b, i, true))}
          <div className="ir-scene-end">
            {p.entries[sceneIndex + 1] ? (
              <button
                onClick={() => changeScene(p.entries[sceneIndex + 1].scene.id)}
              >
                อ่านฉากถัดไป
                <ArrowRight size={15} />
              </button>
            ) : (
              <span>จบเรื่องที่มีอยู่ในขณะนี้</span>
            )}
          </div>
        </main>
      )}
      <footer hidden={uiHidden} className="ir-dock">
        <div className="ir-transport">
          <button
            aria-label="บทก่อนหน้า"
            disabled={p.index <= 0 || !p.blocks.length}
            onClick={() => step(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="ir-auto"
            aria-label={auto ? "หยุดเลื่อนบทอัตโนมัติ" : "เลื่อนบทอัตโนมัติ"}
            aria-pressed={auto}
            disabled={!p.blocks.length || mode !== "cinema" || atEnd}
            onClick={() => setAuto(!auto)}
          >
            {auto ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            aria-label="บทถัดไป"
            disabled={atEnd || !p.blocks.length}
            onClick={() => step(1)}
          >
            <ChevronRight size={20} />
          </button>
          <span className="ir-dock-count">
            {p.blocks.length ? p.index + 1 : 0} / {p.blocks.length}
          </span>
        </div>
        <div
          className="ir-reading-progress"
          role="progressbar"
          aria-label="ความคืบหน้าฉาก"
          aria-valuemin={0}
          aria-valuemax={p.blocks.length}
          aria-valuenow={p.blocks.length ? p.index + 1 : 0}
        >
          <i
            style={{
              width: `${p.blocks.length ? ((p.index + 1) / p.blocks.length) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="ir-episode-navigation" role="group" aria-label="ข้ามตอน">
          <button aria-label="EP ก่อนหน้า" title="EP ก่อนหน้า (Shift + ←)" disabled={!episodes.previous}
            onClick={() => episodes.previous && changeScene(episodes.previous.scene.id)}><SkipBack size={18}/></button>
          <button aria-label="ข้ามไป EP ถัดไป" title="ข้ามไป EP ถัดไป (Shift + →)" disabled={!episodes.next}
            onClick={() => episodes.next && changeScene(episodes.next.scene.id)}><SkipForward size={18}/><span>ข้าม EP</span></button>
        </div>
        <div className="ir-tools">
          <button ref={hideButton} aria-label="อ่านบนภาพเต็ม ซ่อนแถบควบคุม" title="อ่านบนภาพเต็ม ซ่อนแถบควบคุม (H)" onClick={hideInterface}>
            <EyeOff size={18}/>
          </button>
          <button
            aria-label="สถานะตัวละคร"
            title="สรุปพลัง ทักษะ และความสัมพันธ์ถึงบทที่อ่าน"
            aria-expanded={panel === "status"}
            onClick={() => {
              setPanel(panel === "status" ? null : "status");
              setAuto(false);
            }}
          >
            <Activity size={18} />
          </button>
          <button
            aria-label="สารบัญ"
            aria-expanded={panel === "contents"}
            onClick={() => setPanel(panel === "contents" ? null : "contents")}
          >
            <List size={19} />
            <span>สารบัญ</span>
          </button>
          <button
            aria-label="เสียงอ่านและเพลง"
            aria-expanded={panel === "audio"}
            onClick={() => {
              setPanel(panel === "audio" ? null : "audio");
              setAuto(false);
            }}
          >
            <Headphones size={18} />
            <span>เสียง</span>
          </button>
          <button
            aria-label="ตั้งค่าการอ่าน"
            aria-expanded={panel === "settings"}
            onClick={() => setPanel(panel === "settings" ? null : "settings")}
          >
            <Settings2 size={18} />
          </button>
          <button
            aria-label={full ? "ออกจากเต็มจอ" : "อ่านเต็มจอ"}
            onClick={toggleFull}
          >
            {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </footer>
      <p hidden={uiHidden} className="ir-keyboard-hint">
        ← → เปลี่ยนบท <span>·</span> Space อ่านต่อ <span>·</span>{" "}
        Shift + ← → ข้าม EP <span>·</span> H ซ่อน UI
      </p>
      <div hidden={!uiHidden} className="ir-focus-controls" role="group" aria-label="อ่านบนภาพเต็ม">
        <button aria-label="บทก่อนหน้า" disabled={p.index <= 0 || !p.blocks.length} onClick={() => step(-1)}><ChevronLeft size={18}/></button>
        <button ref={restoreButton} className="ir-restore-ui"
          aria-label="แสดงแถบควบคุม" title="แสดงแถบควบคุม (H หรือ Esc)" onClick={() => setUiHidden(false)}>
          <Eye size={18}/><span>แสดง UI</span>
        </button>
        <button aria-label="บทถัดไป" disabled={atEnd || !p.blocks.length} onClick={() => step(1)}><ChevronRight size={18}/></button>
      </div>
      {panel && (
        <dialog
          ref={panelDialog}
          className="ir-panel-scrim"
          onCancel={() => setPanel(null)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPanel(null);
          }}
        >
          <aside
            className="ir-panel"
            aria-label={
              panel === "status"
                ? "สถานะตัวละคร"
                : panel === "contents"
                  ? "สารบัญ"
                  : panel === "settings"
                    ? "ตั้งค่าการอ่าน"
                    : "เสียงอ่านและเพลง"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>
                {panel === "status"
                  ? "ตัวละคร ณ ตอนนี้"
                  : panel === "contents"
                    ? "เรื่องราวทุกฉาก"
                    : panel === "settings"
                      ? "อ่านในแบบของคุณ"
                      : "เสียงและบรรยากาศ"}
              </h2>
              <button
                autoFocus
                aria-label="ปิดแผงอ่าน"
                onClick={() => setPanel(null)}
              >
                <X size={20} />
              </button>
            </header>
            {panel === "status" ? (
              <ReaderCharacterStatus
                key={`${p.scene?.id}-${p.index}`}
                projectId={p.projectId}
                sceneId={p.scene?.id || ""}
                index={p.index}
                sceneTitles={Object.fromEntries(
                  p.entries.map((e) => [e.scene.id, e.scene.title]),
                )}
              />
            ) : panel === "contents" ? (
              <nav>
                {p.entries.map((e, i) => (
                  <button
                    key={e.scene.id}
                    aria-current={
                      e.scene.id === p.scene?.id ? "page" : undefined
                    }
                    onClick={() => changeScene(e.scene.id)}
                  >
                    <small>
                      ภาค {e.part.number}
                      {e.episode ? ` · EP ${e.episode.number}` : ""}
                    </small>
                    <span>
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      {e.scene.title}
                    </span>
                  </button>
                ))}
              </nav>
            ) : panel === "settings" ? (
              <div className="ir-settings">
                <label>
                  ขนาดตัวอักษร <output>{size}</output>
                  <input
                    aria-label="ขนาดตัวอักษรอ่านนิยาย"
                    type="range"
                    min={18}
                    max={30}
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                  />
                </label>
                <label className="ir-motion-setting">
                  <span>การเคลื่อนไหวภาพและข้อความ</span>
                  <select aria-label="โหมด motion" value={motionMode} onChange={event=>setMotionMode(event.target.value as ReaderMotionPreference)}>
                    <option value="system">อัตโนมัติ · ตามการตั้งค่าเครื่อง</option>
                    <option value="on">เปิด motion ในเว็บนี้</option>
                    <option value="off">ปิด motion · อ่านแบบนิ่ง</option>
                  </select>
                  <small role="status">{motionMode==='on'?'เปิด motion ตามที่คุณเลือก แม้เครื่องจะตั้งให้ลดการเคลื่อนไหว':motionMode==='off'?'คุณปิด motion ไว้บนอุปกรณ์นี้':systemReducedMotion?'เครื่องนี้เปิดการลดการเคลื่อนไหวอยู่ เว็บจึงใช้ภาพและข้อความนิ่ง':'เครื่องนี้อนุญาตการเคลื่อนไหว เว็บเปิด motion ให้อัตโนมัติ'}</small>
                </label>
                <div className="ir-motion-preview">
                  <button type="button" disabled={!motion} onClick={()=>setMotionTest(value=>value+1)}>ทดสอบ motion</button>
                  {motionTest>0&&<div key={motionTest} className="ir-motion-demo"><p>หยุดเดี๋ยวนี้!!</p><small>{motion?'ตัวอย่างข้อความสั่นสั้น ๆ':'motion ปิดอยู่'}</small></div>}
                </div>
                <label className="ir-switch">
                  <span>
                    เอฟเฟกต์ข้อความตามอารมณ์
                    <small>ตะโกนสั่นสั้น ๆ · กระซิบค่อย ๆ เฟด · บทลังเลเว้นจังหวะในโหมดอัตโนมัติ</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={textEffects}
                    disabled={!motion}
                    onChange={(e) => setTextEffects(e.target.checked)}
                  />
                </label>
                <label className="ir-switch">
                  <span>การเคลื่อนกล้องช้า ๆ<small>ภาพค่อย ๆ ซูมและเปลี่ยนระยะเบา ๆ ตามจังหวะบท</small></span>
                  <input type="checkbox" checked={camera} disabled={!motion} onChange={e => setCamera(e.target.checked)} />
                </label>
                <p>บันทึกรูปแบบและตำแหน่งอ่านไว้บนอุปกรณ์นี้อัตโนมัติ</p>
              </div>
            ) : (
              <div className="ir-audio">


                <section className="ir-music-card" aria-label="เพลงประกอบ">
                <label className="ir-switch">
                  <span>
                    เพลงประกอบ · {musicSourceLabel(p.scene?.bgmSource)}
                    <small>
                      {directBgm || youtubeId
                        ? p.scene?.bgmTitle || "เพลงประกอบที่ผู้เขียนเลือก"
                        : "ฉากนี้ยังไม่มีเพลงประกอบ"}
                    </small>
                  </span>
                  <button
                    disabled={!directBgm && !youtubeId}
                    aria-label={muted ? "เปิดเพลงฉาก" : "ปิดเพลงฉาก"}
                    onClick={() => {setMusicError('');setMuted(!muted);}}
                  >
                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </label>
                <VolumeControl label="ความดังเพลงประกอบ" value={musicVolume*100} disabled={!directBgm&&!youtubeId} status={muted?'ปิดเสียง':'เปิดอยู่'} onChange={value=>{setMusicError('');setMusicVolume(value/100);setMuted(value===0);}}/>
                <p className="ir-mixer-note">ลดเพลงให้อัตโนมัติระหว่างพากย์ โดยคงระดับที่คุณเลือกไว้</p>
                {musicError&&<p className="ir-music-error" role="alert">{musicError}</p>}
                </section>
                <SfxPlaybackPanel controller={sfxPlayback}/>
                <section className="ir-atmosphere" aria-label="เสียงบรรยากาศ">
                  <div className="ir-atmosphere-heading"><span><strong>บรรยากาศรอบตัวคุณ</strong><small>เสียงสังเคราะห์ในเครื่อง · ไม่ใช้เครดิต</small></span><button type="button" aria-label={atmosphere.enabled ? "ปิดเสียงบรรยากาศ" : "เปิดเสียงบรรยากาศ"} aria-pressed={atmosphere.enabled} disabled={atmosphere.busy || (!atmosphere.enabled && atmosphere.kind === "none")} onClick={atmosphere.toggle}>{atmosphere.enabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button></div>
                  <label>เลือกบรรยากาศ<select aria-label="เลือกเสียงบรรยากาศ" value={atmosphere.choice} onChange={e => atmosphere.setChoice(e.target.value as typeof atmosphere.choice)}><option value="auto">อัตโนมัติจากสถานที่ · {ambientName}</option>{ATMOSPHERES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
                  <VolumeControl label="ระดับเสียงบรรยากาศ" value={atmosphere.volume} onChange={atmosphere.setVolume} status={atmosphere.enabled?'เปิดอยู่':'ปิดเสียง'}/>
                  <p role="status">{atmosphere.enabled && atmosphere.kind !== "none" ? `กำลังเล่น · ${ambientName}${narrating ? " · ลดเสียงระหว่างพากย์" : ""}` : atmosphere.kind === "none" ? "ยังไม่มีเสียงที่ตรงกับสถานที่ เลือกบรรยากาศเองด้านบนได้" : "กดไอคอนลำโพงเพื่อเปิดเสียง ไม่มีการเปิดเสียงอัตโนมัติ"}</p>
                  {atmosphere.error && <p role="alert">{atmosphere.error}</p>}
                </section>
                <NarrationPlayer
                  key={p.scene?.id}
                  projectId={p.projectId}
                  sceneId={p.scene?.id || ""}
                  blocks={p.blocks}
                  activeIndex={p.index}
                  onIndex={p.onIndex}
                  onDucking={(v) => {
                    p.onDucking(v);
                    setNarrating(v);
                    if (v) setAuto(false);
                  }}
                />
              </div>
            )}
          </aside>
        </dialog>
      )}
      {youtubeId&&<YouTubeBgmPlayer videoId={youtubeId} level={musicLevel} enabled={!muted} onError={setMusicError} onClose={()=>setMuted(true)}/>}
      {directBgm && <audio ref={bgm} src={directBgm} loop preload="none" onError={()=>{setMuted(true);setMusicError('โหลดไฟล์เพลงไม่ได้ กรุณาตรวจไฟล์หรือลิงก์เพลง');}}/>}
    </div>
  );
}
