import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center text-white font-thai">
      <h2 className="text-4xl font-bold font-heading text-amber-400 mb-2">404</h2>
      <p className="text-slate-300 text-sm mb-6">ไม่พบหน้าที่คุณกำลังค้นหา</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow"
      >
        กลับสู่หน้าหลัก
      </Link>
    </div>
  );
}
