"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon, Film, Upload, Link2, X, Check, ChevronDown, Layers } from "lucide-react";
import "./media-binding-dropdown.css";

export function isVideoMedia(
  img?: { filePath?: string; metadata?: string | null; provider?: string } | null
): boolean {
  if (!img || !img.filePath) return false;
  const fp = img.filePath.toLowerCase();
  if (
    fp.endsWith(".mp4") ||
    fp.endsWith(".webm") ||
    fp.endsWith(".mov") ||
    fp.endsWith(".mkv")
  )
    return true;
  if (img.provider === "video") return true;
  if (img.metadata) {
    try {
      const meta = JSON.parse(img.metadata);
      if (meta?.type === "video" || meta?.provider === "video") return true;
    } catch {}
  }
  return false;
}

export interface MediaImageItem {
  id: string;
  prompt?: string;
  filePath: string;
  kind?: string;
  caption?: string;
  metadata?: string | null;
  provider?: string;
}

interface MediaBindingDropdownProps {
  assignedImageId?: string;
  assignedImage?: MediaImageItem | null;
  sceneImages: MediaImageItem[];
  onSelectImage: (idOrUrl: string) => void;
  onUploadNew: () => void;
  onCustomUrl: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  compact?: boolean;
}

function readableLabel(value?: string) {
  const label = value?.trim() || "";
  return /^[a-f0-9]{8}-[a-f0-9-]{27,}(?:\.[a-z0-9]+)?$/i.test(label) ? "" : label;
}

export function MediaBindingDropdown({
  assignedImageId, assignedImage, sceneImages, onSelectImage, onUploadNew,
  onCustomUrl, isOpen, onToggle, onClose, compact = false,
}: MediaBindingDropdownProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [position, setPosition] = useState<{top:number;left:number;width:number;maxHeight:number} | null>(null);
  const isBound = Boolean(assignedImageId || assignedImage);
  const target = assignedImage || sceneImages.find(image => image.id === assignedImageId);
  const video = isVideoMedia(target || {filePath: assignedImageId?.replace(/^url:/, "")});
  const caption = readableLabel(target?.caption) || (assignedImageId?.startsWith("url:") ? "สื่อจากลิงก์" : video ? "วิดีโอในฉาก" : "ภาพในฉาก");

  useEffect(() => {
    if (!isOpen) { setPosition(null); return; }
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const width = viewport?.width || window.innerWidth;
      const height = viewport?.height || window.innerHeight;
      const offsetLeft = viewport?.offsetLeft || 0;
      const offsetTop = viewport?.offsetTop || 0;
      const panelWidth = Math.min(360, width - 24);
      const below = offsetTop + height - rect.bottom - 12;
      const above = rect.top - offsetTop - 12;
      const opensAbove = below < 300 && above > below;
      const available = Math.max(0, opensAbove ? above : below);
      const maxHeight = Math.min(480, available);
      const measuredHeight = Math.min(popup.current?.scrollHeight || 480, maxHeight);
      setPosition({
        left: Math.max(offsetLeft + 12, Math.min(rect.left, offsetLeft + width - panelWidth - 12)),
        top: opensAbove ? Math.max(offsetTop + 12, rect.top - measuredHeight - 8) : rect.bottom + 8,
        width: panelWidth, maxHeight,
      });
    };
    const outside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) onClose();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); trigger.current?.focus(); }
    };
    place();
    const frame = requestAnimationFrame(() => { place();  });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard, true);
    };
  }, [isOpen, onClose]);

  const positioned = Boolean(position);
  useEffect(() => {
    if (isOpen && positioned) {
      (popup.current?.querySelector<HTMLButtonElement>("button[data-selected=true]") || popup.current?.querySelector<HTMLButtonElement>("button"))?.focus({preventScroll:true});
    }
  }, [isOpen, positioned]);

  const select = (id: string) => { onSelectImage(id); onClose(); trigger.current?.focus(); };
  return <div ref={anchor} className={`mbd-anchor ${compact ? "mbd-compact" : ""}`}>
    <button ref={trigger} type="button" className={`mbd-trigger ${isBound ? "is-bound" : ""}`}
      aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} onClick={onToggle}
      title="เลือกภาพหรือวิดีโอสำหรับบทนี้">
      {video ? <Film size={14}/> : <ImageIcon size={14}/>}
      <span>{isBound ? caption : "เพิ่มภาพ / คลิป"}</span><ChevronDown size={12}/>
    </button>
    {isBound && <button type="button" className="mbd-unbind" aria-label="ยกเลิกการผูกภาพ คงภาพก่อนหน้า" onClick={() => select("")}><X size={13}/></button>}
    {isOpen && position && createPortal(<div ref={popup} id={panelId} role="region" aria-label="เลือกภาพหรือวิดีโอสำหรับบทนี้"
      className="mbd-panel" style={position} onClick={event => event.stopPropagation()}
      onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && !anchor.current?.contains(event.relatedTarget as Node)) onClose(); }}>
      <header className="mbd-header"><div><strong>ภาพประกอบบทนี้</strong><span>เลือกสื่อที่จะแสดงเมื่ออ่านถึงบทนี้</span></div>
        <button type="button" aria-label="ปิดเมนูเลือกภาพ" onClick={() => {onClose();trigger.current?.focus();}}><X size={18}/></button></header>
      <div className="mbd-body">
        <button type="button" className="mbd-option mbd-keep" data-selected={!isBound} aria-pressed={!isBound} onClick={() => select("")}>
          <span className="mbd-keep-icon"><Layers size={19}/></span>
          <span className="mbd-copy"><strong>ใช้ภาพก่อนหน้า</strong><small>แสดงภาพต่อเนื่อง โดยไม่ผูกภาพใหม่</small></span>
          {!isBound && <Check className="mbd-check" size={17}/>}
        </button>
        <p className="mbd-section-title">สื่อในฉาก <span>{sceneImages.length} รายการ</span></p>
        <div className="mbd-list">
          {sceneImages.length === 0 ? <div className="mbd-empty"><ImageIcon size={26}/><strong>ยังไม่มีภาพหรือคลิปในฉาก</strong><p>อัปโหลดสื่อ หรือเพิ่มจากลิงก์ด้านล่าง</p></div> : sceneImages.map((image, index) => {
            const selected = assignedImageId === image.id;
            const isVideo = isVideoMedia(image);
            const title = readableLabel(image.caption) || `${isVideo ? "วิดีโอ" : "ภาพ"}ที่ ${index + 1}`;
            const description = readableLabel(image.prompt);
            return <button key={image.id} type="button" className="mbd-option" data-selected={selected} aria-pressed={selected} aria-label={`${title}, ${isVideo ? "วิดีโอ" : "รูปภาพ"}`} onClick={() => select(image.id)} title={description ? `${title} — ${description}` : title}>
              <span className="mbd-thumbnail">{isVideo ? <Film size={23}/> : <img src={image.filePath} alt="" loading="lazy"/>}<span>{index + 1}</span></span>
              <span className="mbd-copy"><strong>{title}</strong><small>{isVideo ? "วิดีโอ" : "รูปภาพ"}{description && ` · ${description}`}</small></span>
              {selected && <Check className="mbd-check" size={17}/>}
            </button>;
          })}
        </div>
      </div>
      <footer className="mbd-actions">
        <button type="button" onClick={() => {onClose();onUploadNew();}}><Upload size={17}/><span>อัปโหลดภาพหรือคลิป</span></button>
        <button type="button" onClick={() => {onClose();onCustomUrl();}}><Link2 size={17}/><span>เพิ่มจากลิงก์ <small>URL / GIF / วิดีโอ</small></span></button>
      </footer>
    </div>, document.body)}
  </div>;
}
