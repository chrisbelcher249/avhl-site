"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

const links=[
 ["Game & Player Odds","/odds"],
 ["Season Futures","/odds/season"],
 ["Parlay Builder","/odds/parlay"]
];

export default function OddsNav(){
 const path=usePathname();
 return <nav aria-label="AVHL Sportsbook sections" className="grid grid-cols-1 gap-1.5 rounded-2xl border border-[#000B36]/10 bg-white p-1.5 shadow-sm sm:grid-cols-3">
  {links.map(([label,href])=>{
   const active=href==="/odds"?path==="/odds":path===href||path.startsWith(href+"/");
   return <Link key={href} href={href} aria-current={active?"page":undefined}
     className={"rounded-xl px-3 py-3 text-center text-sm font-bold transition "+
       (active?"bg-[#000B36] text-white shadow-sm":"bg-transparent text-[#43536C] hover:bg-[#F1F4F8] hover:text-[#000B36]")}>
     {label}
   </Link>;
  })}
 </nav>;
}