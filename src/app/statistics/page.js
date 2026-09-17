import Link from "next/link";
import CurrentSeasonStatsExplorer from "@/components/CurrentSeasonStatsExplorer";
import { getSeasonStats } from "@/lib/seasonStats";
import { playerHistorySummary } from "@/lib/playerHistory";

export const metadata = { title: "Statistics", description: "Live 2026–27 AVHL skater, goalie, and team statistics plus the complete historical archive." };
export const dynamic = "force-dynamic";
const slim = (row) => { const { gameRows, teamInfo, ...rest } = row; return rest; };

export default async function StatisticsPage() {
  const stats = await getSeasonStats();
  const skaters = stats.skaters.map(slim), goalies = stats.goalies.map(slim), teamStats = stats.teams.map(slim);
  const gamesRecorded = Math.round(teamStats.reduce((sum, team) => sum + team.gp, 0) / 2);
  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 AVHL statistics</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Statistics</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">Live game-by-game data from the official season workbook, compiled automatically into skater, goalie, and team totals.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/statistics/career" className="rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#000B36] transition hover:bg-cyan-100">Career & historical stats →</Link><Link href="/players" className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white hover:text-[#000B36]">Player database</Link></div>
        </div>
      </section>
      <section className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 md:px-8 md:py-14">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[skaters.length.toLocaleString(),"Skaters with stats"],[goalies.filter((goalie)=>goalie.gp>0).length.toLocaleString(),"Goalies used"],[gamesRecorded,"Games recorded"],[stats.source === "live" ? "Live" : stats.source === "partial" ? "Partial" : "Unavailable","Stats source"]].map(([value,label])=><div key={label} className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm"><p className="text-3xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">{label}</p></div>)}</div>
        {stats.error ? <p className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{stats.error}</p> : null}
        <div className="mt-9"><CurrentSeasonStatsExplorer skaters={skaters} goalies={goalies} teamStats={teamStats} /></div>
        <div className="mt-10 rounded-[2rem] bg-[#000B36] p-7 text-white md:p-9"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Permanent archive</p><h2 className="mt-2 text-3xl font-black">2022–23 through 2025–26</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55 md:text-base">Search {playerHistorySummary.total.toLocaleString()} players with recorded AVHL statistics from the league&apos;s first four seasons.</p><Link href="/statistics/career" className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#000B36]">Browse career stats →</Link></div>
      </section>
    </main>
  );
}
