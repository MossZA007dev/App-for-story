"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  PenTool,
  Users,
  Image as ImageIcon,
  GitBranch,
  Settings,
  ChevronLeft,
  Flame,
  BookOpen,
  Share2,
} from "lucide-react";
import { CollaboratorModal } from "@/components/collaboration/CollaboratorModal";

interface ProjectHeaderProps {
  projectId: string;
  title: string;
  universe: string;
  timelineScope?: string;
}

export function ProjectHeader({
  projectId,
  title,
  universe,
  timelineScope,
}: ProjectHeaderProps) {
  const pathname = usePathname();
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [collabCount, setCollabCount] = useState<number>(0);

  useEffect(() => {
    // Quick fetch collaborator count
    fetch(`/api/projects/${projectId}/collaborators`)
      .then((res) => res.json())
      .then((data) => {
        if (data.collaborators) setCollabCount(data.collaborators.length);
      })
      .catch(() => {});
  }, [projectId]);

  const tabs = [
    { href: `/projects/${projectId}/read`, label: "📖 โหมดอ่านนิยาย (Reader)", icon: BookOpen },
    { href: `/projects/${projectId}`, label: "Studio แก้ไข & สตรีมฉาก", icon: PenTool },
    { href: `/projects/${projectId}/characters`, label: "Character Bible", icon: Users },
    { href: `/projects/${projectId}/images`, label: "Image Studio", icon: ImageIcon },
    { href: `/projects/${projectId}/timeline`, label: "Timeline & Relations", icon: GitBranch },
  ];

  return (
    <div className="space-y-4 mb-6 border-b border-slate-800 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-xs font-thai transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>แดชบอร์ด</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {universe}
            </span>
            {timelineScope && (
              <span className="text-xs text-slate-400 font-thai">({timelineScope})</span>
            )}
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-wide">
            {title}
          </h1>
        </div>

        {/* Top Right: Invite Friends & Squad Collaboration Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setCollabModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-sky-500/15 hover:from-amber-500/25 hover:to-sky-500/25 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold font-thai shadow-sm transition-all group"
          >
            <Users className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>👥 เชิญเพื่อนร่วมแต่ง</span>
            {collabCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold font-mono">
                {collabCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all font-thai ${
                isActive
                  ? "bg-amber-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Collaborator & Squad Modal */}
      <CollaboratorModal
        isOpen={collabModalOpen}
        onClose={() => setCollabModalOpen(false)}
        projectId={projectId}
        projectTitle={title}
        universe={universe}
        onCollaboratorChange={() => {
          fetch(`/api/projects/${projectId}/collaborators`)
            .then((res) => res.json())
            .then((data) => {
              if (data.collaborators) setCollabCount(data.collaborators.length);
            })
            .catch(() => {});
        }}
      />
    </div>
  );
}
