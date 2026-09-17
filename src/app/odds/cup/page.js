import OddsNav from "@/components/OddsNav";
import OddsFuturesBoard from "@/components/OddsFuturesBoard";
import { getOddsFuturesData } from "@/lib/oddsFuturesData";

export const metadata = {
  title: "Cup Odds",
  description: "AVHL championship probabilities generated from full-season and playoff Monte Carlo simulations.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CupOddsPage() {
  const { schedule, scheduleError, teams } = await getOddsFuturesData();
  return (
    <main className="min-h-screen bg-slate-50 text-[#000B36]">
      <section className="bg-[#000B36] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">AVHL Futures · 2026–27</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Cup Odds</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 md:text-lg">Full-season championship probabilities, including the AVHL qualifier round, conference bracket, and League Final.</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-8 md:py-10">
        <OddsNav />
        {scheduleError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{scheduleError}</div> : null}
        <OddsFuturesBoard mode="cup" schedule={schedule} teams={teams} />
      </div>
    </main>
  );
}
