import Link from "next/link";
import { getPlayers } from "@/lib/players";
import { getSeasonStats, playerSeasonStat, secondsToTime, teamSeasonStat } from "@/lib/seasonStats";
import { teams } from "../../../data/teams";

export const metadata = {
  title: "Statistics",
  description: "Live 2026–27 AVHL skater, goalie, and team statistics plus the permanent historical archive.",
};

export const dynamic = "force-dynamic";

function pct1(value) { return `${((Number(value) || 0) * 100).toFixed(1)}%`; }
function svPct(value) { return (Number(value) || 0).toFixed(3); }
function decimal(value) { return (Number(value) || 0).toFixed(2); }

export default async function StatisticsPage() {
  const [{ players }, seasonStats] = await Promise.all([getPlayers(), getSeasonStats()]);
  const rostered = players.filter((player) => player.currentTeam !== "UFA" || seasonStats.skaters.has(player.id) || seasonStats.goalies.has(player.id));
  const skaters = rostered.filter((player) => player.role === "Skater")
    .map((player) => ({ player, stat: playerSeasonStat(seasonStats, player) }))
    .sort((a, b) => b.stat.pts - a.stat.pts || b.stat.g - a.stat.g || a.player.name.localeCompare(b.player.name));
  const goalies = rostered.filter((player) => player.role === "Goalie")
    .map((player) => ({ player, stat: playerSeasonStat(seasonStats, player) }))
    .sort((a, b) => b.stat.gp - a.stat.gp || b.stat.svPct - a.stat.svPct || a.player.name.localeCompare(b.player.name));
  const teamRows = teams.map((team) => ({ team, stat: teamSeasonStat(seasonStats, team.abbreviation) }))
    .sort((a, b) => b.stat.pts - a.stat.pts || b.stat.w - a.stat.w || a.team.name.localeCompare(b.team.name));

  const gamesPlayed = Math.floor([...seasonStats.teams.values()].reduce((sum, stat) => sum + stat.gp, 0) / 2);

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 live season</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Statistics</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            Every current-season line is compiled automatically from the official game-by-game Team Stats, Skater Stats, and Goalie Stats tabs.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black">{gamesPlayed} games recorded</span>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black">{seasonStats.source === "live" ? "Live workbook" : "Stats unavailable"}</span>
            <Link href="/statistics/career" className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#000B36] transition hover:bg-cyan-100">Career & historical stats →</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 md:px-8 md:py-14">
        {seasonStats.error ? <p className="mb-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{seasonStats.error}</p> : null}

        <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
          <div className="border-b border-[#000B36]/8 p-5 md:p-6"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">League table</p><h2 className="mt-1 text-2xl font-black">Team statistics</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="bg-[#F6F8FC] text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/42"><tr>{["Team","GP","W","L","OTL","PTS","GF","GA","GF/G","GA/G","S/G","HIT/G","PP%","Passing","PIM","Inj","MGL"].map((h) => <th key={h} className={`px-4 py-3 ${h === "Team" ? "text-left" : "text-center"}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#000B36]/8">
                {teamRows.map(({ team, stat }) => <tr key={team.slug}>
                  <td className="px-4 py-3"><Link href={`/teams/${team.slug}`} className="font-black hover:text-[#A90117] hover:underline">{team.name}</Link></td>
                  {[stat.gp, stat.w, stat.l, stat.otl, stat.pts, stat.gf, stat.ga, decimal(stat.gfPerGame), decimal(stat.gaPerGame), decimal(stat.shotsPerGame), decimal(stat.hitsPerGame), pct1(stat.ppPct), pct1(stat.passing), stat.pim, stat.injuries, stat.manGamesLost].map((value, i) => <td key={i} className="px-4 py-3 text-center font-bold tabular-nums">{value}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
          <div className="border-b border-[#000B36]/8 p-5 md:p-6"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">All rostered players</p><h2 className="mt-1 text-2xl font-black">Skater statistics</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] border-collapse text-sm">
              <thead className="bg-[#F6F8FC] text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/42"><tr>{["Player","Team","Pos","GP","MIN","G","A","PTS","+/-","S","S%","PPT","PIM","Hits","PPG","SHG","FOT","FOW","FO%"].map((h) => <th key={h} className={`px-4 py-3 ${h === "Player" ? "text-left" : "text-center"}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#000B36]/8">
                {skaters.map(({ player, stat }) => <tr key={player.id}>
                  <td className="px-4 py-3"><Link href={`/players/${player.id}`} className="font-black hover:text-[#A90117] hover:underline">{player.name}</Link></td>
                  <td className="px-4 py-3 text-center font-bold">{stat.team || teams.find((t) => t.name === player.currentTeam)?.abbreviation || "—"}</td>
                  <td className="px-4 py-3 text-center font-bold">{player.position}</td>
                  {[stat.gp, secondsToTime(stat.toiSeconds), stat.g, stat.a, stat.pts, stat.plusMinus, stat.s, pct1(stat.shootingPct), secondsToTime(stat.ppToiSeconds), stat.pim, stat.hits, stat.ppg, stat.shg, stat.fot, stat.fow, pct1(stat.foPct)].map((value, i) => <td key={i} className="px-4 py-3 text-center font-bold tabular-nums">{value}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
          <div className="border-b border-[#000B36]/8 p-5 md:p-6"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">All rostered goalies</p><h2 className="mt-1 text-2xl font-black">Goalie statistics</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-[#F6F8FC] text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/42"><tr>{["Goalie","Team","GP","MIN","SA","SV","SV%","GA","GAA","ENG","PIM","G","A","PTS"].map((h) => <th key={h} className={`px-4 py-3 ${h === "Goalie" ? "text-left" : "text-center"}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#000B36]/8">
                {goalies.map(({ player, stat }) => <tr key={player.id}>
                  <td className="px-4 py-3"><Link href={`/players/${player.id}`} className="font-black hover:text-[#A90117] hover:underline">{player.name}</Link></td>
                  <td className="px-4 py-3 text-center font-bold">{stat.team || teams.find((t) => t.name === player.currentTeam)?.abbreviation || "—"}</td>
                  {[stat.gp, secondsToTime(stat.toiSeconds), stat.sa, stat.sv, svPct(stat.svPct), stat.ga, decimal(stat.gaa), stat.eng, stat.pim, stat.g, stat.a, stat.pts].map((value, i) => <td key={i} className="px-4 py-3 text-center font-bold tabular-nums">{value}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
