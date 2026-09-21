import Link from "next/link";
import DetailedStatsTable from "@/components/DetailedStatsTable";
import { getSeasonStats } from "@/lib/seasonStats";

export const metadata = {
  title: "Detailed Goalie Statistics",
  description: "Sortable 2026–27 AVHL goalie statistics from official game submissions.",
};
export const dynamic = "force-dynamic";

export default async function DetailedGoalieStatsPage() {
  const stats = await getSeasonStats();
  const rows = stats.goalies.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    team: row.team,
    gp: row.gp,
    dressed: row.dressed,
    toi: row.toi,
    shotsAgainst: row.shotsAgainst,
    saves: row.saves,
    savePct: row.savePct,
    goalsAgainst: row.goalsAgainst,
    gaa: row.gaa,
    emptyNetGoals: row.emptyNetGoals,
    penaltyMinutes: row.penaltyMinutes,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
  }));

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="bg-[#000B36] px-6 py-12 text-white md:px-8 md:py-16">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">2026–27 AVHL</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight md:text-6xl">Detailed goalie stats</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/60 md:text-base">Every official goalie game row rolled into season totals. Click any column heading to sort the entire league by that variable.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/statistics" className="rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#000B36]">← Statistics home</Link>
            <Link href="/statistics/skaters" className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-white hover:text-[#000B36]">Detailed skater stats</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 md:px-8 md:py-12">
        {stats.error ? <p className="mb-5 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{stats.error}</p> : null}
        <DetailedStatsTable type="goalie" rows={rows} />
      </section>
    </main>
  );
}
