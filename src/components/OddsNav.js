"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
const links=[
 ["Game & player odds","/odds"],
 ["Season futures","/odds/season"],
 ["Win totals","/odds/season?market=wins"],
 ["Playoffs","/odds/season?market=playoffs"],
 ["Divisions","/odds/season?market=division"],
 ["Cup","/odds/season?market=cup"],
 ["Relegation","/odds/season?market=relegation"],
 ["Live calculation status","/odds/status"]
];
export default function OddsNav(){
 const path=usePathname();
 return <nav aria-label="Odds pages" className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#000B36]/10 bg-white p-2 shadow-sm">
  {links.map(([label,href],i)=>{
   const active=(i===0&&path==="/odds")||(i===1&&path==="/odds/season")||(href==="/odds/status"&&path==="/odds/status");
   return <Link key={href} href={href} className={
    "rounded-xl px-3 py-2.5 text-xs font-black transition "+
    (active?"bg-[#000B36] text-white":"bg-[#F1F4F8] text-[#000B36] hover:bg-[#E5EBF4]")
   }>{label}</Link>;
  })}
 </nav>;
}
