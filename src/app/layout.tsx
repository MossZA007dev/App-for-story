import type { Metadata } from "next";
import { Sarabun, Cinzel } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/common/Navbar";
import { Toaster } from "sonner";

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

const cinzel = Cinzel({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saga Forge | โปรแกรมเขียนนิยาย AU Dark Drama หลายภาค & ภาพประกอบ AI",
  description: "เว็บแอปสำหรับเขียนนิยาย AU/Fan Fiction แบบหลายภาค บันทึก Continuity แม่นยำ และสร้างภาพประกอบต่อฉาก",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`dark ${sarabun.variable} ${cinzel.variable}`}>
      <body className="bg-[#070a11] text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 w-full">
          {children}
        </main>
        <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
          <p>Saga Forge © 2026 • AI-Powered Multi-Part AU Fiction Engine & Visual Studio</p>
        </footer>
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
