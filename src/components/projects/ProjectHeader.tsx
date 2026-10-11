"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenTool,
  Users,
  Image as ImageIcon,
  GitBranch,
  Settings,
  ChevronLeft,
  Flame,
  BookOpen,
} from "lucide-react";

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
    </div>
  );
}
