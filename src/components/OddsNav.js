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
 return <nav aria-label="Odds pages" className="grid grid-cols-1 gap-2 rounded-2xl sm:grid-cols-3 border border-[#000B36]/10 bg-white p-2 shadow-sm">
  {links.map(([label,href])=>{
   const active=href==="/odds"?path==="/odds":path===href||path.startsWith(href+"/");
   return <Link key={href} href={href} aria-current={active?"page":undefined}
     className={"rounded-xl px-3 py-3 text-center text-sm font-black transition "+
       (active?"bg-[#000B36] text-white":"bg-[#F1F4F8] text-[#000B36] hover:bg-[#E5EBF4]")}>
     {label}
   </Link>;
  })}
 </nav>;
}