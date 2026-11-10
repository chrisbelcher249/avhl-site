"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function OddsNav(){
  const path=usePathname();
  return <nav aria-label="Odds pages" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#000B36]/10 bg-white p-2 shadow-sm">
    <Link href="/odds"
      className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] ${path==="/odds"?"bg-[#000B36] text-white":"bg-[#F1F5F9] text-[#000B36] hover:bg-[#E5EEF7]"}`}>
      Game & player odds
    </Link>
    <span className="px-3 text-[11px] font-semibold text-[#000B36]/48">Season futures are under model validation</span>
  </nav>;
}
