"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Game Odds", "/odds"],
  ["Division Futures", "/odds/divisions"],
  ["Presidents' Trophy", "/odds/presidents-trophy"],
  ["Cup", "/odds/cup"],
];

export default function OddsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Odds pages" className="flex flex-wrap gap-2 rounded-2xl border border-[#000B36]/10 bg-white p-2 shadow-sm">
      {links.map(([label, href]) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] transition ${active ? "bg-[#000B36] text-white" : "text-[#000B36]/55 hover:bg-[#F1F5F9] hover:text-[#000B36]"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
