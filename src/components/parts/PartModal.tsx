"use client";

import { useState, useEffect } from "react";
import { Layers, Sparkles, X, Loader2, BookOpen, Clock, Tag } from "lucide-react";
import { toast } from "sonner";

export interface PartModalData {
  id?: string;
  number?: number;
  title?: string;
  scope?: string;
  theme?: string;
  peakSummary?: string;
  status?: "planned" | "drafting" | "done";
}

interface PartModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  mode: "create" | "edit";
  initialData?: PartModalData | null;
  nextPartNumber?: number;
  onSuccess: (part: any, scene?: any) => void;
}

export function PartModal({
  isOpen,
  onClose,
  projectId,
  mode,
  initialData,
  nextPartNumber = 2,
  onSuccess,
}: PartModalProps) {
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [theme, setTheme] = useState("");
  const [peakSummary, setPeakSummary] = useState("");
  const [initialSceneTitle, setInitialSceneTitle] = useState("");
  const [status, setStatus] = useState<"planned" | "drafting" | "done">("planned");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialData) {
      setTitle(initialData.title || "");
      setScope(initialData.scope || "");
      setTheme(initialData.theme || "");
      setPeakSummary(initialData.peakSummary || "");
      setStatus(initialData.status || "planned");
      setInitialSceneTitle("");
    } else {
      // Create mode
      setTitle(`ภาคที่ ${nextPartNumber}: `);
      setScope(`Season ${nextPartNumber}`);
      setTheme("");
      setPeakSummary("");
      setInitialSceneTitle(`ฉากที่ 1: การเปิดม่านของภาคที่ ${nextPartNumber}`);
      setStatus("planned");
    }
  }, [isOpen, mode, initialData, nextPartNumber]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("กรุณาระบุชื่อภาค / ซีซั่น");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "create") {
        const res = await fetch(`/api/projects/${projectId}/parts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            scope: scope.trim(),
            theme: theme.trim(),
            peakSummary: peakSummary.trim(),
            initialSceneTitle: initialSceneTitle.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "สร้างภาคใหม่ไม่สำเร็จ");

        toast.success(`🎉 สร้างภาคที่ ${data.part?.number || nextPartNumber} (SS${data.part?.number || nextPartNumber}) สำเร็จ!`);
        onSuccess(data.part, data.scene);
        onClose();
      } else {
        // Edit mode
        if (!initialData?.id) return;

        const res = await fetch(`/api/projects/${projectId}/parts/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            scope: scope.trim(),
            theme: theme.trim(),
            peakSummary: peakSummary.trim(),
            status,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "บันทึกข้อมูลภาคไม่สำเร็จ");

        toast.success("บันทึกข้อมูลภาคเรียบร้อยแล้ว");
        onSuccess(data.part);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="cinematic-card w-full max-w-lg rounded-2xl p-6 border-slate-700 bg-slate-950 space-y-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <span>{mode === "create" ? "เพิ่มภาคใหม่ (New Season / SS)" : `แก้ไขข้อมูลภาคที่ ${initialData?.number}`}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-thai">
                {mode === "create"
                  ? `ขยายเนื้อเรื่อง เพิ่มซีซั่นใหม่ (SS${nextPartNumber}) พร้อมสร้างฉากที่ 1 ให้อัตโนมัติ`
                  : "แก้ไขชื่อภาค ขอบเขตช่วงเวลา และธีมของซีซั่นนี้"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 font-thai text-xs">
          {/* Part Title */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 flex items-center justify-between">
              <span>ชื่อภาค / Season Title *</span>
              <span className="text-[10px] text-amber-400 font-mono">
                {mode === "create" ? `SS${nextPartNumber} / Part ${nextPartNumber}` : `SS${initialData?.number}`}
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`เช่น ภาคที่ ${nextPartNumber}: วายุเหมันต์แห่งทิศเหนือ`}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold transition-colors"
              required
            />
          </div>

          {/* Scope / Timeline */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>ขอบเขตเวลา / Timeline Scope (เช่น Season 2, องก์ที่ 2, 5 ปีหลังสงคราม)</span>
            </label>
            <input
              type="text"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="เช่น Season 2, ช่วงสงครามครั้งที่ 2, เหตุการณ์ 3 เดือนถัดมา"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Theme */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              <span>ธีมหลักของภาคนี้ (Theme)</span>
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="เช่น การแก้แค้น, การล่มสลายของความเชื่อมั่น, การก่อกบฏจากเงามืด"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Peak Summary / Climax */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>จุดไคลแม็กซ์ / จุดหักเหสำคัญประจำภาค (Peak Summary)</span>
            </label>
            <textarea
              value={peakSummary}
              onChange={(e) => setPeakSummary(e.target.value)}
              placeholder="เช่น การทรยศที่งานเลี้ยงฉลอง และการสูญเสียครั้งใหญ่ของตัวเอก..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
            />
          </div>

          {/* Create mode: Initial Scene 1 Title */}
          {mode === "create" && (
            <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <label className="font-semibold text-amber-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>ชื่อฉากที่ 1 ของภาคใหม่ (ระบบจะสร้างให้อัตโนมัติ)</span>
              </label>
              <input
                type="text"
                value={initialSceneTitle}
                onChange={(e) => setInitialSceneTitle(e.target.value)}
                placeholder={`ฉากที่ 1: การเปิดม่านของภาคที่ ${nextPartNumber}`}
                className="w-full bg-slate-950/80 border border-amber-500/40 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Edit mode: Status */}
          {mode === "edit" && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">สถานะของภาคนี้</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="planned">📝 วางแผนโครงเรื่อง (Planned)</option>
                <option value="drafting">✍️ กำลังแต่ง (Drafting)</option>
                <option value="done">✅ แต่งจบแล้ว (Done)</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>{mode === "create" ? `สร้างภาคใหม่ (SS${nextPartNumber})` : "บันทึกการแก้ไข"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
