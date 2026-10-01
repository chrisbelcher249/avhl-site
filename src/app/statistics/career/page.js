import Link from "next/link";
import HistoricalPlayerStatsExplorer from "@/components/HistoricalPlayerStatsExplorer";
import { getHistoricalPlayers } from "@/lib/playerHistory";
import { getSeasonStats } from "@/lib/seasonStats";
import { getPlayers } from "@/lib/players";
import { mergeCareerStats } from "@/lib/careerStats";

export const metadata = {
  title: "Career Player Statistics",
  description: "Search AVHL skater and goalie statistics from 2022–23 through the live 2026–27 season, with permanent player profiles for every recorded player.",
};

export const dynamic = "force-dynamic";

function liveArchive(historicalPlayers, seasonStats, currentPlayers) {
  const archive = new Map(historicalPlayers.map((player) => [player.id, { ...player, seasons: [...player.seasons] }]));
  const currentById = new Map(currentPlayers.map((player) => [player.id, player]));

  for (const skater of seasonStats.skaters) {
    const existing = archive.get(skater.playerId) || {
      id: skater.playerId,
      name: skater.name,
      role: "Skater",
      seasons: [],
      career: currentById.get(skater.playerId)?.career || { g: 0, a: 0, pts: 0 },
    };
    archive.set(skater.playerId, {
      ...existing,
      name: existing.name || skater.name,
      role: "Skater",
      seasons: [...existing.seasons.filter((row) => row.season !== "2026-27"), {
        season: "2026-27",
        g: skater.goals,
        a: skater.assists,
        pts: skater.points,
      }],
      career: mergeCareerStats("Skater", existing.career, skater),
    });
  }

  for (const goalie of seasonStats.goalies) {
    const existing = archive.get(goalie.playerId) || {
      id: goalie.playerId,
      name: goalie.name,
      role: "Goalie",
      seasons: [],
      career: currentById.get(goalie.playerId)?.career || { sa: 0, sv: 0, svPct: 0 },
    };
    archive.set(goalie.playerId, {
      ...existing,
      name: existing.name || goalie.name,
      role: "Goalie",
      seasons: [...existing.seasons.filter((row) => row.season !== "2026-27"), {
        season: "2026-27",
        sa: goalie.shotsAgainst,
        sv: goalie.saves,
        svPct: goalie.savePct,
      }],
      career: mergeCareerStats("Goalie", existing.career, goalie),
    });
  }

  return [...archive.values()];
}

export default async function CareerStatisticsPage() {
  const [seasonStats, { players: currentPlayers }] = await Promise.all([getSeasonStats(), getPlayers()]);
  const players = liveArchive(getHistoricalPlayers(), seasonStats, currentPlayers);
  const skaters = players.filter((player) => player.role === "Skater").length;
  const goalies = players.filter((player) => player.role === "Goalie").length;

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-14 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <Link href="/statistics" className="text-sm font-black text-white/55 transition hover:text-white">← Statistics</Link>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-cyan-200">2022–23 through live 2026–27</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Career player statistics.</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/60 md:text-lg">
            Search every recorded AVHL skater and goaltender, view individual seasons or career totals, and open a permanent profile for any player in league history.
          </p>
          <div className="mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              [players.length.toLocaleString(), "Players with stats"],
              [skaters.toLocaleString(), "Skaters"],
              [goalies.toLocaleString(), "Goalies"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-2xl font-black tabular-nums">{value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <div className="mb-7 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Player archive</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Season and career totals</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">
            Career totals include live 2026–27 results. Historical stat lines remain independent of past team assignments, while current player information appears on each player profile.
          </p>
        </div>
        <HistoricalPlayerStatsExplorer players={players} />
      </section>
    </main>
  );
}
