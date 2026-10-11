"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, BookOpen, Settings, Plus, Flame, Database } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "แดชบอร์ดโปรเจกต์", icon: BookOpen },
    { href: "/projects/new", label: "สร้างเรื่องใหม่", icon: Plus },
    { href: "/settings", label: "ตั้งค่าระบบ & API", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070a11]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
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

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span className="hidden md:inline font-thai">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status badges */}
        <div className="hidden lg:flex items-center gap-3">
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
  );
}
