"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  Settings,
  Plus,
  Flame,
  Database,
  ChevronDown,
  PenTool,
  User,
  Users,
  Film,
} from "lucide-react";
import { CreateCharacterModal } from "@/components/characters/CreateCharacterModal";

export function Navbar() {
  const pathname = usePathname();

  // Extract project id from pathname if currently in a project
  const projectMatch = pathname.match(/\/projects\/([^\/]+)/);
  const currentProjectId =
    projectMatch && projectMatch[1] !== "new"
      ? projectMatch[1]
      : "678bba56-298f-4f65-9abc-8c6e9ef79156";

  // Studio dropdown state
  const [studioDropdownOpen, setStudioDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Character Modal state
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [charModalType, setCharModalType] = useState<"self" | "friend">("self");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setStudioDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDashboardActive = pathname === "/sagas" || pathname === "/";
  const isStudioActive =
    pathname === "/studio" ||
    pathname === "/characters" ||
    (pathname.startsWith("/projects/") && pathname !== "/projects/new");
  const isNewActive = pathname === "/projects/new";
  const isSettingsActive = pathname === "/settings";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070a11]/90 backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/sagas" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-red-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold tracking-wider text-slate-100 group-hover:text-amber-300 transition-colors">
                  SAGA FORGE
                </span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                  Dark AU
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-thai hidden sm:block">
                โปรแกรมแต่งนิยายหลายภาค & Continuity อัตโนมัติ
              </p>
            </div>
          </Link>

          {/* 4 Navigation Menus */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* MENU 1: แดชบอร์ดเนื้อเรื่อง (Dashboard - อ่านแบบ Final) */}
            <Link
              href="/sagas"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all font-thai ${
                isDashboardActive
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <BookOpen
                className={`w-4 h-4 ${
                  isDashboardActive ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span>แดชบอร์ดเนื้อเรื่อง (อ่านแบบ Final)</span>
            </Link>

            {/* MENU 2: Studio with Dropdown (Edit เนื้อหา & สร้างตัวละครของคุณ / กลุ่มเพื่อน) */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center">
                <Link
                  href="/studio"
                  className={`flex items-center gap-1.5 pl-3.5 pr-1.5 py-2 rounded-l-lg text-xs sm:text-sm font-medium transition-all font-thai ${
                    isStudioActive
                      ? "bg-amber-500/15 text-amber-300 border-y border-l border-amber-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <PenTool
                    className={`w-4 h-4 ${
                      isStudioActive ? "text-amber-400" : "text-slate-400"
                    }`}
                  />
                  <span>studio</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setStudioDropdownOpen(!studioDropdownOpen)}
                  className={`py-2 px-2 rounded-r-lg text-xs transition-all ${
                    isStudioActive
                      ? "bg-amber-500/15 text-amber-300 border-y border-r border-amber-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                  title="ตัวเลือก Studio & สร้างตัวละครของคุณ"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      studioDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Studio Dropdown Menu */}
              {studioDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl bg-[#0f1219] border border-slate-800 shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800/80 mb-1">
                    STUDIO & SQUAD CONTROLS
                  </div>

                  {/* 1. Go to Studio Dashboard */}
                  <Link
                    href="/studio"
                    onClick={() => setStudioDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors font-thai"
                  >
                    <PenTool className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">แดชบอร์ด Studio เนื้อเรื่อง</span>
                      <span className="text-[10px] text-slate-400 block">
                        Edit เนื้อหา, ใส่รูปภาพ, สตรีมมิ่งฉาก
                      </span>
                    </div>
                  </Link>

                  {/* 2. Consolidated Character Dashboard (Me Profile & Squad Friends) */}
                  <Link
                    href="/characters"
                    onClick={() => setStudioDropdownOpen(false)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors font-thai border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-sky-500/5"
                  >
                    <div className="flex -space-x-1 flex-shrink-0 text-base">
                      <span>👑</span>
                      <span>🧑‍🤝‍🧑</span>
                    </div>
                    <div>
                      <span className="font-bold block text-white">แดชบอร์ดตัวละคร (ตัวฉันเอง & เพื่อน)</span>
                      <span className="text-[10px] text-slate-400 block">
                        สร้าง/แก้ไขตัวละครของคุณ (Me) และกลุ่มเพื่อน (Squad)
                      </span>
                    </div>
                  </Link>

                  {/* 4. Active Story Workspace */}
                  <div className="pt-1 border-t border-slate-800/80 mt-1">
                    <Link
                      href={`/projects/${currentProjectId}`}
                      onClick={() => setStudioDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-slate-800/60 font-thai"
                    >
                      <span>✍️ เข้าห้องเขียนเรื่องล่าสุด &rarr;</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* MENU 3: สร้างเรื่องใหม่ */}
            <Link
              href="/projects/new"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all font-thai ${
                isNewActive
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Plus
                className={`w-4 h-4 ${
                  isNewActive ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span className="hidden sm:inline">สร้างเรื่องใหม่</span>
            </Link>

            {/* MENU 4: ตั้งค่าระบบ & API */}
            <Link
              href="/settings"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all font-thai ${
                isSettingsActive
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Settings
                className={`w-4 h-4 ${
                  isSettingsActive ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span className="hidden md:inline">ตั้งค่าระบบ & API</span>
            </Link>
          </nav>

          {/* Status Badges on the Right */}
          <div className="hidden xl:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>SQLite Local</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-950/40 border border-amber-800/40 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Claude 3.5 Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Universal Character Creator Modal */}
      <CreateCharacterModal
        isOpen={charModalOpen}
        onClose={() => setCharModalOpen(false)}
        initialType={charModalType}
      />
    </>
  );
}
