"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Share2,
  Copy,
  Check,
  X,
  Wifi,
  Globe,
  Crown,
  Shield,
  PenTool,
  Film,
  Sparkles,
  Trash2,
  ExternalLink,
  Info,
  QrCode,
  Laptop,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

interface Collaborator {
  id: string;
  projectId: string;
  name: string;
  nickname: string;
  avatarUrl: string;
  characterId: string | null;
  role: "owner" | "co_author" | "editor" | "viewer";
  canEditScenes: number;
  canUploadMedia: number;
  canGenerateAi: number;
  lastActiveAt: string | null;
  createdAt: string;
}

interface SquadCharacter {
  id: string;
  name: string;
  realNickname: string;
  avatarUrl: string;
  characterType: "self" | "friend" | "canon";
  chosenRole: string;
}

interface CollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  universe: string;
  onCollaboratorChange?: () => void;
}

export function CollaboratorModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  universe,
  onCollaboratorChange,
}: CollaboratorModalProps) {
  const [activeTab, setActiveTab] = useState<"invite" | "squad" | "online">("invite");
  const [collaboratorsList, setCollaboratorsList] = useState<Collaborator[]>([]);
  const [squadCharacters, setSquadCharacters] = useState<SquadCharacter[]>([]);
  const [networkIps, setNetworkIps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for new friend
  const [customName, setCustomName] = useState("");
  const [customNickname, setCustomNickname] = useState("");
  const [customRole, setCustomRole] = useState<"co_author" | "editor" | "viewer">("co_author");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Origin URL from window
  const [originUrl, setOriginUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, projectId]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/collaborators`);
      if (!res.ok) throw new Error("โหลดข้อมูลผู้ร่วมแต่งไม่สำเร็จ");
      const data = await res.json();
      setCollaboratorsList(data.collaborators || []);
      setSquadCharacters(data.squadCharacters || []);
      setNetworkIps(data.networkIps || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (urlToCopy: string, label: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(urlToCopy);
    toast.success(`📋 คัดลอก${label}แล้ว! ส่งให้เพื่อนใน LINE หรือ Discord ได้เลย`);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Add friend from Squad Hub
  const handleAddFromSquad = async (char: SquadCharacter) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: char.name,
          nickname: char.realNickname || char.name,
          avatarUrl: char.avatarUrl,
          characterId: char.id,
          role: "co_author",
          canEditScenes: 1,
          canUploadMedia: 1,
          canGenerateAi: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เพิ่มเพื่อนไม่สำเร็จ");

      toast.success(`🎉 เพิ่ม "${char.realNickname || char.name}" เป็นผู้ร่วมแต่งเรียบร้อยแล้ว!`);
      setCollaboratorsList((prev) => [...prev, data.collaborator]);
      if (onCollaboratorChange) onCollaboratorChange();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการเพิ่มเพื่อน");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add custom collaborator by name
  const handleAddCustomCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error("กรุณาระบุชื่อเพื่อนของคุณ");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName.trim(),
          nickname: (customNickname || customName).trim(),
          role: customRole,
          canEditScenes: 1,
          canUploadMedia: 1,
          canGenerateAi: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เพิ่มเพื่อนไม่สำเร็จ");

      toast.success(`🎉 เพิ่ม "${customName}" เป็นผู้ร่วมแต่งเรียบร้อย!`);
      setCollaboratorsList((prev) => [...prev, data.collaborator]);
      setCustomName("");
      setCustomNickname("");
      if (onCollaboratorChange) onCollaboratorChange();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการเพิ่มเพื่อน");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (collabId: string, name: string) => {
    if (!confirm(`คุณต้องการนำ "${name}" ออกจากการเป็นผู้ร่วมแต่งใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators/${collabId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("นำเพื่อนออกไม่สำเร็จ");

      setCollaboratorsList((prev) => prev.filter((c) => c.id !== collabId));
      toast.success(`นำ "${name}" ออกจากโปรเจกต์เรียบร้อย`);
      if (onCollaboratorChange) onCollaboratorChange();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  };

  if (!isOpen) return null;

  // Primary share links
  const defaultShareUrl = `${originUrl}/projects/${projectId}`;
  const wifiIp = networkIps.length > 0 ? networkIps[0] : "";
  const wifiShareUrl = wifiIp ? `http://${wifiIp}:3000/projects/${projectId}` : "";

  // Filter squad characters who are not yet added
  const existingCharIds = new Set(collaboratorsList.map((c) => c.characterId).filter(Boolean));
  const availableSquadFriends = squadCharacters.filter(
    (c) => !existingCharIds.has(c.id) && c.characterType !== "self"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#171b24] border border-slate-700 shadow-2xl p-5 sm:p-7 space-y-6 text-white font-thai my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg sm:text-xl font-bold text-white tracking-wide">
                  ระบบเชิญเพื่อนร่วมแต่งนิยาย (SQUAD COLLABORATION)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {universe}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ให้เพื่อนคลิกเข้ามาช่วยสร้างฉากใหม่, แก้ไขบทพูด, ใส่รูป/วิดีโอ และแต่งเนื้อเรื่องไปด้วยกันได้ทันที
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <button
            onClick={() => setActiveTab("invite")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "invite"
                ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>1. คัดลอกลิงก์ให้เพื่อน (Share Links)</span>
          </button>

          <button
            onClick={() => setActiveTab("squad")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "squad"
                ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>2. จัดการผู้ร่วมแต่ง & ดึงเพื่อนแก๊ง ({collaboratorsList.length} คน)</span>
          </button>

          <button
            onClick={() => setActiveTab("online")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "online"
                ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>3. แชร์ข้ามเน็ต (Online Sharing)</span>
          </button>
        </div>

        {/* TAB 1: INVITE & SHARE LINKS */}
        {activeTab === "invite" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Box A: Direct WiFi / LAN Link (Perfect for Friends in Same Room/WiFi/Hotspot) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-[#121620] border border-amber-500/30 space-y-3.5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Wifi className="w-4 h-4 animate-pulse" />
                  <span>ลิงก์สำหรับเพื่อนที่ต่อ WiFi / Hotspot เดียวกัน (เร็วสุด & ไม่ต้องต่อเน็ตนอก)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  ต่อ WiFi เข้าได้ทันที
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                เพื่อนของคุณที่เปิดจากมือถือ แท็บเล็ต หรือแล็ปท็อปที่ต่อ WiFi หรือเน็ต Hotspot เดียวกับเครื่องนี้
                สามารถเข้าลิงก์นี้เพื่อเข้ามาช่วยแต่งฉาก ใส่รูป/วิดีโอ ได้ทันทีแบบไม่ต้องสมัครสมาชิก:
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-xs font-mono text-amber-300 truncate select-all">
                  {wifiShareUrl || defaultShareUrl}
                </div>
                <button
                  onClick={() => handleCopyLink(wifiShareUrl || defaultShareUrl, "ลิงก์ WiFi สำหรับเพื่อน")}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow active:scale-95 flex-shrink-0"
                >
                  {copiedUrl === (wifiShareUrl || defaultShareUrl) ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>
              </div>

              {networkIps.length > 1 && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap pt-1">
                  <span>IP ทางเลือกอื่นในเครื่อง:</span>
                  {networkIps.slice(1).map((ip) => (
                    <button
                      key={ip}
                      onClick={() => handleCopyLink(`http://${ip}:3000/projects/${projectId}`, `IP ${ip}`)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px]"
                    >
                      {ip}:3000
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Box B: Localhost Direct Link (Same Machine) */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-sky-400" />
                  <span>ลิงก์เครื่องนี้ (Localhost Link):</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">เครื่องปัจจุบัน</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-slate-300 truncate">
                  {defaultShareUrl}
                </div>
                <button
                  onClick={() => handleCopyLink(defaultShareUrl, "ลิงก์ห้องแต่ง Studio")}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก</span>
                </button>
              </div>
            </div>

            {/* Permissions Summary Card */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>สิ่งที่เพื่อนของคุณทำได้เมื่อเปิดลิงก์เข้ามา:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-400">✓</span>
                  <span>สร้างฉากใหม่ & เขียนเนื้อเรื่อง</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-400">✓</span>
                  <span>อัปโหลดรูปภาพ & คลิปวิดีโอ</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-400">✓</span>
                  <span>ปรับบทพูด & ใส่เพลง BGM</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CO-AUTHORS LIST & SQUAD HUB INTEGRATION */}
        {activeTab === "squad" && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Existing Collaborators List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>รายชื่อเพื่อนที่ร่วมแต่งเรื่องนี้ ({collaboratorsList.length} คน)</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  ทุกคนในรายการนี้มีสิทธิ์แก้ไขและแต่งเรื่องเต็มรูปแบบ
                </span>
              </div>

              <div className="space-y-2">
                {/* Always show Owner first */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-amber-500/40 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-bold text-sm">
                      👑
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">คุณ (เจ้าของเรื่อง)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-slate-950 font-mono">
                          OWNER
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">ผู้สร้างโปรเจกต์ & หัวหน้าทีมแต่งนิยาย</p>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    สิทธิ์สูงสุด
                  </span>
                </div>

                {/* Additional Collaborators */}
                {collaboratorsList.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-950 border border-sky-500/50 flex items-center justify-center overflow-hidden flex-shrink-0 text-sky-300 font-bold text-xs">
                        {collab.avatarUrl ? (
                          <img src={collab.avatarUrl} alt={collab.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{collab.nickname?.slice(0, 2) || collab.name?.slice(0, 2)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{collab.name}</span>
                          {collab.nickname && collab.nickname !== collab.name && (
                            <span className="text-[11px] text-slate-400">({collab.nickname})</span>
                          )}
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {collab.role === "co_author" ? "ผู้แต่งร่วม (Co-Author)" : "ผู้ช่วยแก้ไข (Editor)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>✓ แก้ไขฉาก</span>
                          <span>•</span>
                          <span>✓ อัปโหลดสื่อ</span>
                          <span>•</span>
                          <span>✓ สั่ง AI</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveCollaborator(collab.id, collab.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="นำออกจากผู้ร่วมแต่ง"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Quick Add Friends from Me & Squad Hub */}
            {availableSquadFriends.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>เพื่อนในแก๊งจาก Me & Squad Hub ที่ยังไม่ได้เพิ่ม ({availableSquadFriends.length} คน):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">คลิกเพื่อเชิญเข้าโปรเจกต์ทันที</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSquadFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-[10px] text-slate-300">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            friend.name.slice(0, 2)
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{friend.realNickname || friend.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{friend.chosenRole || "เพื่อนในแก๊ง"}</p>
                        </div>
                      </div>

                      <button
                        disabled={isSubmitting}
                        onClick={() => handleAddFromSquad(friend)}
                        className="px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white text-xs font-semibold border border-sky-500/40 transition-colors flex-shrink-0"
                      >
                        + เชิญร่วมแต่ง
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Add Custom Friend Form */}
            <form onSubmit={handleAddCustomCollaborator} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">
                หรือ เพิ่มเพื่อนใหม่ด้วยชื่อเล่น (Custom Friend Invite):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="ชื่อเพื่อน (เช่น มอส, นัท, บาส)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />

                <input
                  type="text"
                  placeholder="นามแฝง/ชื่อเล่นในเรื่อง (ถ้ามี)"
                  value={customNickname}
                  onChange={(e) => setCustomNickname(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />

                <button
                  type="submit"
                  disabled={isSubmitting || !customName.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังเพิ่ม..." : "+ เพิ่มผู้ร่วมแต่ง"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: ONLINE / REMOTE SHARING GUIDE */}
        {activeTab === "online" && (
          <div className="space-y-4 animate-fadeIn text-xs text-slate-300 leading-relaxed">
            {/* Active Live Link Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>🌐 ลิงก์ออนไลน์แชร์ข้ามเน็ตที่เปิดใช้งานอยู่ตอนนี้:</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  ONLINE NOW
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-black/60 border border-slate-700 font-mono text-emerald-300 text-xs truncate select-all">
                  https://saga-forge-moss.loca.lt/projects/{projectId}
                </div>
                <button
                  onClick={() => handleCopyLink(`https://saga-forge-moss.loca.lt/projects/${projectId}`, "ลิงก์ออนไลน์ข้ามเน็ต")}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all shadow"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกลิงก์</span>
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                <p>
                  🔑 <strong>รหัสผ่านเข้าเว็บครั้งแรก (Password IP):</strong>{" "}
                  <code className="text-amber-300 bg-black/80 px-1.5 py-0.5 rounded border border-slate-700 font-bold">49.49.235.52</code>{" "}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("49.49.235.52");
                      toast.success("คัดลอกรหัสผ่าน 49.49.235.52 แล้ว!");
                    }}
                    className="text-amber-400 hover:underline text-[10px] ml-1"
                  >
                    (คลิกคัดลอก)
                  </button>
                </p>
                <p className="text-slate-400 text-[10px]">
                  *เมื่อเพื่อนเปิดลิงก์ครั้งแรก เว็บจะถามรหัสผ่าน ให้เพื่อนกรอกเลขนี้แล้วกด Click to Submit ก็จะเข้าห้องแต่งนิยายได้ทันที!
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Globe className="w-4 h-4" />
                <span>คำสั่งเปิดแชร์ข้ามเน็ตด้วยตนเองในครั้งถัดไป:</span>
              </div>

              {/* Option 1: npm run share */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">⚡ คำสั่งเปิดแชร์ด่วน 1 บรรทัด (npm run share)</span>
                  <span className="text-[10px] text-amber-400 font-mono">ง่ายที่สุด</span>
                </div>
                <div className="flex items-center justify-between bg-black p-2 rounded border border-slate-800 font-mono text-amber-300 text-xs">
                  <span>npm run share</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("npm run share");
                      toast.success("คัดลอกคำสั่ง npm run share แล้ว!");
                    }}
                    className="p-1 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Option 2: Cloudflare Tunnel */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">☁️ Cloudflare Tunnel (ไม่มีหน้าถามรหัสผ่าน)</span>
                <p className="text-[11px] text-slate-400">
                  พิมพ์คำสั่งใน Terminal: <code className="text-amber-300">winget install --id Cloudflare.cloudflared</code> จากนั้นรัน <code className="text-amber-300">cloudflared tunnel --url http://localhost:3000</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>เพื่อนทุกคนที่เข้าลิงก์สามารถเขียนและอัปโหลดสื่อได้พร้อมกัน</span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
