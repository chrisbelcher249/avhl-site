"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

const links=[
 ["Game & Player Odds","/odds"],
 ["Season Futures","/odds/season"]
];

export default function OddsNav(){
 const path=usePathname();
 return <nav aria-label="Odds pages" className="grid grid-cols-2 gap-2 rounded-2xl border border-[#000B36]/10 bg-white p-2 shadow-sm">
  {links.map(([label,href])=>{
   const active=href==="/odds"?path==="/odds":path.startsWith("/odds/season");
   return <Link key={href} href={href} aria-current={active?"page":undefined}
     className={"rounded-xl px-3 py-3 text-center text-sm font-black transition "+
       (active?"bg-[#000B36] text-white":"bg-[#F1F4F8] text-[#000B36] hover:bg-[#E5EBF4]")}>
     {label}
   </Link>;
  })}
 </nav>;
}