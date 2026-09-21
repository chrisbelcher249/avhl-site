import Link from "next/link";
import DetailedStatsTable from "@/components/DetailedStatsTable";
import { getSeasonStats } from "@/lib/seasonStats";

export const metadata = {
  title: "Detailed Skater Statistics",
  description: "Sortable 2026–27 AVHL skater statistics from official game submissions.",
};
export const dynamic = "force-dynamic";

export default async function DetailedSkaterStatsPage() {
  const stats = await getSeasonStats();
  const rows = stats.skaters.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    team: row.team,
    position: row.position || "—",
    gp: row.gp,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    plusMinus: row.plusMinus,
    shots: row.shots,
    shotPct: row.shotPct,
    penaltyMinutes: row.penaltyMinutes,
    hits: row.hits,
    powerPlayGoals: row.powerPlayGoals,
    shorthandedGoals: row.shorthandedGoals,
    faceoffsTaken: row.faceoffsTaken,
    faceoffsWon: row.faceoffsWon,
    faceoffPct: row.faceoffPct,
    toi: row.toi,
    toiPerGame: row.toiPerGame,
    ppToi: row.ppToi,
    ppToiPerGame: row.ppToiPerGame,
  }));

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="bg-[#000B36] px-6 py-12 text-white md:px-8 md:py-16">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">2026–27 AVHL</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight md:text-6xl">Detailed skater stats</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/60 md:text-base">Every official skater game row rolled into season totals. Click any column heading to sort the entire league by that variable.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/statistics" className="rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#000B36]">← Statistics home</Link>
            <Link href="/statistics/goalies" className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-white hover:text-[#000B36]">Detailed goalie stats</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 md:px-8 md:py-12">
        {stats.error ? <p className="mb-5 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{stats.error}</p> : null}
        <DetailedStatsTable type="skater" rows={rows} />
      </section>
    </main>
  );
}
