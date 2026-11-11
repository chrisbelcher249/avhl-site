import OddsNav from "@/components/OddsNav";
import SeasonFuturesDashboard from "@/components/SeasonFuturesDashboard";

export const metadata={
  title:"Season Futures & Relegation Odds",
  description:"AVHL 2026–27 projected win totals, division titles, playoffs, Presidents' Trophy, Cup odds and bottom-three relegation risk."
};
export const dynamic="force-dynamic";
export default async function SeasonFuturesPage({searchParams}){
  const params=await searchParams;
  const market=typeof params?.market==="string"?params.market:"wins";
  return <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
    <section className="bg-[#000B36] px-5 py-12 text-white md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">AVHL odds · Season futures</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">2026–27 Season Outlook</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65 md:text-base">
          Forty teams. Twenty playoff berths. Four division titles. One Cup.
          And three teams facing relegation. Explore the probability of every outcome.
        </p>
      </div>
    </section>
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-8 md:py-10">
      <OddsNav />
      <div className="flex justify-end">
        <a href="/odds/status" className="text-xs font-bold text-[#52647B] underline underline-offset-4 hover:text-[#000B36]">Track live odds calculations</a>
      </div>
      <SeasonFuturesDashboard initialMarket={market}/>
    </div>
  </main>;
}
