"use client";
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
} from "lucide-react";
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
  } | null;
  entries: Entry[];
  blocks: DialogueBlock[];
  index: number;
  onIndex: (i: number) => void;
  onScene: (id: string) => void;
  media: Media | null;
  onDucking: (v: boolean) => void;
};
const isVideo = (m: Media) =>
  m.provider === "video" || /\.(mp4|webm|mov)(?:\?|$)/i.test(m.filePath);
export function ImmersiveReader(p: Props) {
  const [mode, setMode] = useState<"cinema" | "scroll">("cinema"),
    [panel, setPanel] = useState<
      "contents" | "settings" | "audio" | "status" | null
    >(null),
    [auto, setAuto] = useState(false),
    [motion, setMotion] = useState(true),
    [textEffects, setTextEffects] = useState(true),
    [camera, setCamera] = useState(true),
    [narrating, setNarrating] = useState(false),
    [size, setSize] = useState(22),
    [idle, setIdle] = useState(false),
    [muted, setMuted] = useState(true),
    [full, setFull] = useState(false),
    [previous, setPrevious] = useState<Media | null>(null),
    [ready, setReady] = useState(false);
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
    try {
      const saved = JSON.parse(
        localStorage.getItem("saga-reader-preferences") || "{}",
      );
      setMode(saved.mode === "scroll" ? "scroll" : "cinema");
      setSize(Math.min(30, Math.max(18, Number(saved.size) || 22)));
      setMotion(!reduced.matches && saved.motion !== false);
      setTextEffects(saved.textEffects !== false);
      setCamera(saved.camera !== false);
    } catch {
      setMotion(!reduced.matches);
    }
    setReady(true);
    return () => {
      document.body.classList.remove("immersive-reading");
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        "saga-reader-preferences",
        JSON.stringify({ mode, size, motion, textEffects, camera }),
      );
    } catch {}
  }, [mode, size, motion, textEffects, camera, ready]);
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
      const target = e.target as HTMLElement;
      if (
        target.closest(
          "button,a,input,textarea,select,summary,[contenteditable=true]",
        ) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (e.key === "Escape") {
        setPanel(null);
        setAuto(false);
        return;
      }
      if (panel) return;
      if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key)) {
        e.preventDefault();
        setAuto(false);
        current.current.onIndex(
          Math.min(
            current.current.index + 1,
            current.current.blocks.length - 1,
          ),
        );
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setAuto(false);
        current.current.onIndex(Math.max(0, current.current.index - 1));
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [panel]);
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
  useEffect(() => {
    if (bgm.current) {
      bgm.current.volume = 0.25;
      if (muted) bgm.current.pause();
      else bgm.current.play().catch(() => setMuted(true));
    }
  }, [muted, directBgm]);
  useEffect(() => {
    if (panel) panelDialog.current?.showModal();
    if (panel !== "audio") setNarrating(false);
  }, [panel]);
  useEffect(() => {
    root.current?.querySelectorAll("video").forEach((video) => {
      if (!motion) video.pause();
      else video.play().catch(() => {});
    });
  }, [motion, p.media?.filePath]);
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
    setMuted(true);
    p.onScene(id);
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
        className={`ir-backdrop ${old ? "ir-old" : ""}`}
        src={m.filePath}
        autoPlay={motion}
        loop
        muted
        playsInline
        onLoadedMetadata={(e) => {
          try {
            const meta = JSON.parse(m.metadata || "{}");
            if (meta.startTime) e.currentTarget.currentTime = meta.startTime;
          } catch {}
        }}
        onTimeUpdate={(e) => {
          try {
            const meta = JSON.parse(m.metadata || "{}");
            if (meta.endTime && e.currentTarget.currentTime >= meta.endTime)
              e.currentTarget.currentTime = meta.startTime || 0;
          } catch {}
        }}
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
      className={`immersive-reader ir-${mode} ${motion ? "has-motion" : "no-motion"} ${camera ? "has-camera" : "no-camera"} ${idle && !panel ? "is-idle" : ""}`}
      style={{ "--ir-font-size": `${size}px`, "--ir-shot-scale": active?.type === "dialogue" ? "1.02" : "1" } as React.CSSProperties}
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={wake}
    >
      <div className="ir-stage" aria-hidden={mode === "scroll"}>
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
      <header className="ir-header">
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
      <section className="ir-scene-heading" key={p.scene?.id}>
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
      <footer className="ir-dock">
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
        <div className="ir-tools">
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
      <p className="ir-keyboard-hint">
        ← → เปลี่ยนบท <span>·</span> Space อ่านต่อ <span>·</span>{" "}
        เล่นอัตโนมัติไม่รวมเสียงพากย์
      </p>
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
                <label className="ir-switch">
                  <span>
                    การเคลื่อนไหวภาพและข้อความ
                    <small>ปิดเพื่ออ่านแบบนิ่งและลดการเคลื่อนไหว</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={motion}
                    onChange={(e) => setMotion(e.target.checked)}
                  />
                </label>
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
                <section className="ir-atmosphere" aria-label="เสียงบรรยากาศ">
                  <div className="ir-atmosphere-heading"><span><strong>บรรยากาศรอบตัวคุณ</strong><small>เสียงสังเคราะห์ในเครื่อง · ไม่ใช้เครดิต</small></span><button type="button" aria-label={atmosphere.enabled ? "ปิดเสียงบรรยากาศ" : "เปิดเสียงบรรยากาศ"} aria-pressed={atmosphere.enabled} disabled={atmosphere.busy || (!atmosphere.enabled && atmosphere.kind === "none")} onClick={atmosphere.toggle}>{atmosphere.enabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button></div>
                  <label>เลือกบรรยากาศ<select aria-label="เลือกเสียงบรรยากาศ" value={atmosphere.choice} onChange={e => atmosphere.setChoice(e.target.value as typeof atmosphere.choice)}><option value="auto">อัตโนมัติจากสถานที่ · {ambientName}</option>{ATMOSPHERES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
                  <label>ระดับเสียง <output>{atmosphere.volume}%</output><input aria-label="ระดับเสียงบรรยากาศ" type="range" min={0} max={100} value={atmosphere.volume} onChange={e => atmosphere.setVolume(Number(e.target.value))}/></label>
                  <p role="status">{atmosphere.enabled && atmosphere.kind !== "none" ? `กำลังเล่น · ${ambientName}${narrating ? " · ลดเสียงระหว่างพากย์" : ""}` : atmosphere.kind === "none" ? "ยังไม่มีเสียงที่ตรงกับสถานที่ เลือกบรรยากาศเองด้านบนได้" : "กดไอคอนลำโพงเพื่อเปิดเสียง ไม่มีการเปิดเสียงอัตโนมัติ"}</p>
                  {atmosphere.error && <p role="alert">{atmosphere.error}</p>}
                </section>

                <label className="ir-switch">
                  <span>
                    เพลงประจำฉาก
                    <small>
                      {directBgm || youtubeId
                        ? p.scene?.bgmTitle || "เพลงประกอบที่ผู้เขียนเลือก"
                        : "ฉากนี้ยังไม่มีเพลงประกอบ"}
                    </small>
                  </span>
                  <button
                    disabled={!directBgm && !youtubeId}
                    aria-label={muted ? "เปิดเพลงฉาก" : "ปิดเพลงฉาก"}
                    onClick={() => setMuted(!muted)}
                  >
                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </label>
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
                    if (bgm.current) bgm.current.volume = v ? 0.06 : 0.25;
                  }}
                />
              </div>
            )}
          </aside>
        </dialog>
      )}
      {youtubeId && !muted && (
        <iframe
          className="ir-youtube-player"
          title="เพลงประกอบฉากจาก YouTube"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&controls=0&playsinline=1`}
          allow="autoplay"
        />
      )}
      {directBgm && <audio ref={bgm} src={directBgm} loop preload="none" />}
    </div>
  );
}
