"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, PenTool, Users, Settings, Plus } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const reading = pathname.endsWith("/read");
  const characterPage = pathname === "/characters" || pathname.endsWith("/characters");
  const links = [
    { href: "/sagas", label: "ชั้นหนังสือ", icon: BookOpen, active: pathname === "/sagas" || pathname === "/" || reading },
    { href: "/studio", label: "ห้องเขียน", icon: PenTool, active: pathname === "/studio" || (pathname.startsWith("/projects/") && !reading && !characterPage && pathname !== "/projects/new") },
    { href: "/characters", label: "ตัวละคร", icon: Users, active: characterPage },
    { href: "/settings", label: "ตั้งค่า", icon: Settings, active: pathname === "/settings" },
  ];
  return (
    <header className="app-header">
      <a className="skip-link" href="#main-content">ข้ามไปเนื้อหา</a>
      <div className="app-header-inner">
        <Link href="/sagas" className="brand-link" aria-label="Saga Forge ชั้นหนังสือ">
          <BookOpen size={24} className="text-amber-300" />
          <span className="font-heading text-lg tracking-wide">Saga Forge<span className="brand-dot">.</span></span>
        </Link>
        <nav aria-label="เมนูหลัก" className="app-nav">
          {links.map(({href, label, icon: Icon, active}) => (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`app-nav-link ${active ? "is-active" : ""}`}>
              <Icon size={17} aria-hidden="true" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link href="/projects/new" className="new-story-link"><Plus size={17} /><span>สร้างเรื่องใหม่</span></Link>
        <div className="sidebar-note"><span>พื้นที่ของเรื่องราว</span><p>อ่านให้เพลิน<br />เขียนในแบบของคุณ</p></div>
      </div>
    </header>
  );
}
