import OddsNav from "@/components/OddsNav";
import OddsStatusDashboard from "@/components/OddsStatusDashboard";

export const metadata={
  title:"Odds Status · AVHL Sportsbook",
  description:"Track live AVHL V7 game-odds and 780-pair season-futures calculation progress."
};
export const dynamic="force-dynamic";
export default function OddsStatusPage(){
 return <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
  <section className="bg-[#000B36] px-5 py-12 text-white md:px-8 md:py-16">
   <div className="mx-auto max-w-7xl">
    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">AVHL Sportsbook · Live computation</p>
    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Model Status</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
     Track full V7 game simulations, cached season-futures pairings, and scheduled refresh jobs in one place.
    </p>
   </div>
  </section>
  <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-8">
    <OddsNav/>
    <OddsStatusDashboard/>
  </div>
 </main>;
}