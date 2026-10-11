"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  X,
  FileText,
  User,
  MapPin,
  Volume2,
  Layers,
  ArrowRight,
  CheckCircle,
  Copy,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { parseClaudeScript, splitMultiSceneScript, CharacterMeta } from "@/lib/story/dialogueParser";

interface ClaudeScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: any[];
  activePartTitle?: string;
  currentSceneTitle?: string;
  onApplySingleScene: (scriptText: string) => Promise<void>;
  onApplyMultiScenes?: (scriptText: string) => Promise<void>;
}

export const ClaudeScriptImportModal: React.FC<ClaudeScriptImportModalProps> = ({
  isOpen,
  onClose,
  characters,
  activePartTitle,
  currentSceneTitle,
  onApplySingleScene,
  onApplyMultiScenes,
}) => {
  const [scriptInput, setScriptInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Live Analysis of Pasted Script
  const analysis = useMemo(() => {
    if (!scriptInput.trim()) {
      return null;
    }

    const multiScenes = splitMultiSceneScript(scriptInput);
    const parsed = parseClaudeScript(scriptInput, characters);

    const knownCharNames = new Set(
      characters.map((c) => (c.realNickname || c.name).toLowerCase())
    );

    const existingInProject = parsed.detectedCharacters.filter((name) =>
      knownCharNames.has(name.toLowerCase())
    );
    const newToCreate = parsed.detectedCharacters.filter(
      (name) => !knownCharNames.has(name.toLowerCase())
    );

    return {
      parsed,
      multiScenes,
      isMultiScene: multiScenes.length > 1,
      existingInProject,
      newToCreate,
      soundCount: parsed.blocks.filter((b) => b.type === "sound").length,
      dialogueCount: parsed.blocks.filter((b) => b.type === "dialogue").length,
      narrationCount: parsed.blocks.filter((b) => b.type === "narration").length,
    };
  }, [scriptInput, characters]);

  if (!isOpen) return null;

  const handleApplySingle = async () => {
    if (!scriptInput.trim()) return;
    try {
      setIsProcessing(true);
      await onApplySingleScene(scriptInput);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyMulti = async () => {
    if (!scriptInput.trim() || !onApplyMultiScenes) return;
    try {
      setIsProcessing(true);
      await onApplyMultiScenes(scriptInput);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInsertTemplate = () => {
    const template = `ภาค 1: จุดเริ่มต้นแห่งเงามืด
ฉากที่ 1: คนทรยศแห่งกำแพง
สถานที่: ลานประหาร วินเทอร์เฟลล์

หิมะบางตกลงบนบ่าของคนทั้งลานประหาร ลมหนาวพัดเอาเศษฟางปลิวว่อน
เสียง: ลมเหนือหวีดผ่านช่องกำแพง ธงหมาป่าสะบัดเสียงแหบแห้ง

เน็ด: ท่านรู้โทษของผู้ละทิ้งกำแพง
ทหารดำ: ข้าเห็นพวกมัน... พวกมันไม่ใช่คน ท่านลอร์ด ข้าเห็นกับตา
ทาม: ข้า... ข้าเข้าใจขอรับ ท่านลุง
มอส: (พึมพำ) ไม่มีใครวิ่งหนีจากกำแพงด้วยเรื่องโกหกหรอก
อีฟ: ไม่ใช่กวางที่ฆ่าหมาป่า เขากวางไม่ได้ทิ้งแผลแบบนี้`;
    setScriptInput(template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1f242e] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#161a22]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <span>วางบทสคริปต์จาก Claude / AI</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Auto-Parser
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-thai">
                วางเนื้อเรื่องที่ Claude แต่งให้ทั้งหมด ระบบจะแยกตัวละคร บทพูด เสียงประกอบ และคำบรรยายให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 font-thai">
          {/* Quick instructions and template button */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              💡 รองรับทั้งรูปแบบ <code className="text-amber-300">ชื่อตัวละคร: ข้อความ</code>,{" "}
              <code className="text-amber-300">เสียง: ...</code>, และคำบรรยายฉาก
            </span>
            <button
              onClick={handleInsertTemplate}
              className="text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>ใส่ตัวอย่างบท</span>
            </button>
          </div>

          {/* Big Textarea */}
          <div className="relative">
            <textarea
              rows={12}
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              placeholder={`วางบทสคริปต์ที่คัดลอกจาก Claude ที่นี่ได้เลย เช่น:

ภาค 1: จุดเริ่มต้น
ฉากที่ 1: กำแพงน้ำแข็ง
สถานที่: ประตูดำ วินเทอร์เฟลล์

หิมะตกลงมาอย่างเงียบสงัด...
เสียง: ลมพัดหวีดหวิว

เน็ด: ท่านรู้โทษของผู้ละทิ้งกำแพง
มอส: (พึมพำ) ข้าว่ามีบางอย่างผิดปกติ`}
              className="w-full bg-[#12151c] border border-slate-700 focus:border-amber-400 rounded-xl p-4 text-sm text-slate-100 font-thai leading-relaxed focus:outline-none resize-none shadow-inner"
            />

            {scriptInput && (
              <button
                onClick={() => setScriptInput("")}
                className="absolute top-3 right-3 text-xs text-slate-500 hover:text-red-400 p-1 rounded bg-black/40"
              >
                ล้างข้อความ
              </button>
            )}
          </div>

          {/* Real-time Analysis Card */}
          {analysis && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  <span>ผลการตรวจจับโครงสร้างสคริปต์:</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  รวม {analysis.parsed.blocks.length} beats
                </span>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>ชื่อฉาก</span>
                  </span>
                  <span className="font-bold text-slate-200 truncate mt-0.5">
                    {analysis.parsed.sceneTitle || currentSceneTitle || "คงชื่อเดิม"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-black/40 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-400" />
                    <span>สถานที่</span>
                  </span>
                  <span className="font-bold text-slate-200 truncate mt-0.5">
                    {analysis.parsed.location || "คงสถานที่เดิม"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-black/40 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-400" />
                    <span>บทสนทนา</span>
                  </span>
                  <span className="font-bold text-slate-200 mt-0.5">
                    {analysis.dialogueCount} ประโยค
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-black/40 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-purple-400" />
                    <span>เสียง / บรรยาย</span>
                  </span>
                  <span className="font-bold text-slate-200 mt-0.5">
                    {analysis.soundCount} เสียง / {analysis.narrationCount} บรรยาย
                  </span>
                </div>
              </div>

              {/* Characters Preview */}
              <div className="text-xs space-y-1.5 pt-1">
                <div className="text-slate-400 font-semibold">🎭 ตัวละครที่ตรวจพบในบทนี้:</div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.parsed.detectedCharacters.length === 0 ? (
                    <span className="text-slate-500 italic">ไม่พบชื่อตัวละคร (จะเป็นเสียงบรรยายทั้งหมด)</span>
                  ) : (
                    analysis.parsed.detectedCharacters.map((name) => {
                      const isExisting = analysis.existingInProject.includes(name);
                      return (
                        <span
                          key={name}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isExisting
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          <span>{name}</span>
                          <span className="text-[10px] font-normal opacity-75">
                            {isExisting ? "(มีในโปรเจกต์แล้ว)" : "(จะเพิ่มให้อัตโนมัติ)"}
                          </span>
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Multi-scene notice if detected */}
              {analysis.isMultiScene && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="font-bold">
                      ตรวจพบเนื้อเรื่องจำนวน {analysis.multiScenes.length} ฉากในสคริปต์นี้:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      {analysis.multiScenes.map((sc) => (
                        <li key={sc.sceneNumber}>
                          {sc.title} {sc.location ? `(${sc.location})` : ""}
                        </li>
                      ))}
                    </ul>
                    <div className="text-[11px] text-amber-300 pt-1">
                      คุณสามารถเลือกนำเข้าเฉพาะฉากแรก หรือสร้างฉากทั้งหมด {analysis.multiScenes.length} ฉากลงในภาคนี้ได้
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#161a22] flex flex-wrap items-center justify-between gap-3 font-thai">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2">
            {analysis?.isMultiScene && onApplyMultiScenes && (
              <button
                onClick={handleApplyMulti}
                disabled={isProcessing || !scriptInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                <span>สร้างทั้งหมด {analysis.multiScenes.length} ฉากอัตโนมัติ</span>
              </button>
            )}

            <button
              onClick={handleApplySingle}
              disabled={isProcessing || !scriptInput.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>{analysis?.isMultiScene ? "นำเข้าเฉพาะฉากแรกนี้" : "🚀 แปลงและใส่ลงในฉากทันที"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
