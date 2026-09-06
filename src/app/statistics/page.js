import Link from "next/link";
import { getHistoricalPlayers, playerHistorySummary } from "@/lib/playerHistory";

export const metadata = {
  title: "Statistics",
  description: "AVHL player statistics, career records, and searchable historical player data.",
};

function pct(value) {
  return Number(value || 0).toFixed(3).replace(/^0/, "");
}

export default function StatisticsPage() {
  const history = getHistoricalPlayers();
  const topSkaters = history.filter((player) => player.role === "Skater").sort((a, b) => b.career.pts - a.career.pts || b.career.g - a.career.g).slice(0, 5);
  const topGoalies = history.filter((player) => player.role === "Goalie" && player.career.sa > 0).sort((a, b) => b.career.sv - a.career.sv || b.career.svPct - a.career.svPct).slice(0, 5);

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">AVHL statistics</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Statistics</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            The player-statistics home for the AVHL: current player information, permanent player profiles, and the complete statistical archive from the league’s first four seasons.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <div className="grid gap-5 lg:grid-cols-2">
          <Link href="/statistics/career" className="group rounded-[2rem] bg-[#000B36] p-7 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Historical archive</p>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">Career & historical statistics</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/55 md:text-base">
              Search {playerHistorySummary.total.toLocaleString()} players with recorded AVHL stats from 2022–23 through 2025–26. Filter by season, switch between skaters and goalies, and open any player profile.
            </p>
            <span className="mt-7 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#000B36] transition group-hover:bg-cyan-100">Browse career stats →</span>
          </Link>

          <Link href="/players" className="group rounded-[2rem] border border-[#000B36]/10 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-[#18BDFC] hover:shadow-lg md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">2026–27 database</p>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">Current players</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">
              Search the current AVHL player pool by team, position, rating, age, salary, or pro league. Every current player now has a permanent profile linked to the historical archive.
            </p>
            <span className="mt-7 inline-flex rounded-full bg-[#000B36] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition group-hover:bg-[#A90117]">Browse current players →</span>
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
            <div className="border-b border-[#000B36]/8 p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">Career leaders</p>
              <h3 className="mt-1 text-2xl font-black">Skater points</h3>
            </div>
            <ol className="divide-y divide-[#000B36]/8">
              {topSkaters.map((player, index) => (
                <li key={player.id} className="flex items-center gap-4 px-5 py-4 md:px-6">
                  <span className="w-6 text-center text-sm font-black text-[#000B36]/30">{index + 1}</span>
                  <Link href={`/players/${player.id}`} className="min-w-0 flex-1 truncate font-black hover:text-[#A90117] hover:underline">{player.name}</Link>
                  <span className="text-lg font-black tabular-nums">{player.career.pts}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
            <div className="border-b border-[#000B36]/8 p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">Career leaders</p>
              <h3 className="mt-1 text-2xl font-black">Goalie saves</h3>
            </div>
            <ol className="divide-y divide-[#000B36]/8">
              {topGoalies.map((player, index) => (
                <li key={player.id} className="flex items-center gap-4 px-5 py-4 md:px-6">
                  <span className="w-6 text-center text-sm font-black text-[#000B36]/30">{index + 1}</span>
                  <Link href={`/players/${player.id}`} className="min-w-0 flex-1 truncate font-black hover:text-[#A90117] hover:underline">{player.name}</Link>
                  <div className="text-right">
                    <p className="text-lg font-black tabular-nums">{player.career.sv.toLocaleString()}</p>
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#000B36]/35">{pct(player.career.svPct)} SV%</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              [playerHistorySummary.knownPlayers, "Permanent profiles"],
              [playerHistorySummary.total, "With historical stats"],
              [playerHistorySummary.historicalOnly, "Historical-only players"],
              [playerHistorySummary.currentWithoutHistory, "Current players awaiting first AVHL stats"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-3xl font-black tabular-nums">{value.toLocaleString()}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.13em] leading-4 text-[#000B36]/38">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
