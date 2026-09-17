import Link from "next/link";
import { playerSeasonStat, secondsToTime } from "@/lib/seasonStats";

function pct1(value) { return `${((Number(value) || 0) * 100).toFixed(1)}%`; }
function svPct(value) { return (Number(value) || 0).toFixed(3); }
function decimal(value) { return (Number(value) || 0).toFixed(2); }

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#000B36]/10 bg-white p-4">
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-[#000B36]/38">{label}</p>
    </div>
  );
}

export default function TeamSeasonStats({ roster, seasonStats, teamStats }) {
  const skaters = roster.skaters.map((player) => ({ player, stat: playerSeasonStat(seasonStats, player) }))
    .sort((a, b) => b.stat.pts - a.stat.pts || b.stat.g - a.stat.g || a.player.name.localeCompare(b.player.name));
  const goalies = roster.goalies.map((player) => ({ player, stat: playerSeasonStat(seasonStats, player) }))
    .sort((a, b) => b.stat.gp - a.stat.gp || b.stat.svPct - a.stat.svPct || a.player.name.localeCompare(b.player.name));

  return (
    <section className="mx-auto max-w-7xl px-6 pb-14 md:px-8 md:pb-20">
      <div className="rounded-[2rem] border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">2026–27 live statistics</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Season stats</h2>
            <p className="mt-2 text-sm font-semibold text-[#000B36]/48">Compiled automatically from game-by-game Team, Skater, and Goalie Stats rows.</p>
          </div>
          {seasonStats.error ? <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-800">Stats temporarily unavailable</span> : <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-[#000B36]">Live workbook</span>}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <StatCard label="GP" value={teamStats.gp} />
          <StatCard label="Record" value={`${teamStats.w}-${teamStats.l}-${teamStats.otl}`} />
          <StatCard label="GF" value={teamStats.gf} />
          <StatCard label="GA" value={teamStats.ga} />
          <StatCard label="Shots / G" value={decimal(teamStats.shotsPerGame)} />
          <StatCard label="Hits / G" value={decimal(teamStats.hitsPerGame)} />
          <StatCard label="PP%" value={pct1(teamStats.ppPct)} />
          <StatCard label="Passing" value={pct1(teamStats.passing)} />
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-[#000B36]/10">
          <div className="border-b border-[#000B36]/8 bg-[#F6F8FC] px-5 py-4"><h3 className="text-xl font-black">Skaters</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="bg-white text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/40">
                <tr>{["Player","GP","MIN","G","A","PTS","+/-","S","S%","PPT","PIM","HIT","PPG","SHG","FOT","FOW","FO%"].map((h) => <th key={h} className={`px-4 py-3 ${h === "Player" ? "" : "text-center"}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#000B36]/8">
                {skaters.map(({ player, stat }) => (
                  <tr key={player.id}>
                    <td className="px-4 py-3"><Link href={`/players/${player.id}`} className="font-black hover:text-[#A90117] hover:underline">{player.name}</Link><span className="ml-2 text-xs font-bold text-[#000B36]/35">{player.position}</span></td>
                    {[stat.gp, secondsToTime(stat.toiSeconds), stat.g, stat.a, stat.pts, stat.plusMinus, stat.s, pct1(stat.shootingPct), secondsToTime(stat.ppToiSeconds), stat.pim, stat.hits, stat.ppg, stat.shg, stat.fot, stat.fow, pct1(stat.foPct)].map((value, i) => <td key={i} className="px-4 py-3 text-center font-bold tabular-nums">{value}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#000B36]/10">
          <div className="border-b border-[#000B36]/8 bg-[#F6F8FC] px-5 py-4"><h3 className="text-xl font-black">Goalies</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-white text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/40">
                <tr>{["Goalie","GP","MIN","SA","SV","SV%","GA","GAA","ENG","PIM","G","A","PTS"].map((h) => <th key={h} className={`px-4 py-3 ${h === "Goalie" ? "" : "text-center"}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#000B36]/8">
                {goalies.map(({ player, stat }) => (
                  <tr key={player.id}>
                    <td className="px-4 py-3"><Link href={`/players/${player.id}`} className="font-black hover:text-[#A90117] hover:underline">{player.name}</Link></td>
                    {[stat.gp, secondsToTime(stat.toiSeconds), stat.sa, stat.sv, svPct(stat.svPct), stat.ga, decimal(stat.gaa), stat.eng, stat.pim, stat.g, stat.a, stat.pts].map((value, i) => <td key={i} className="px-4 py-3 text-center font-bold tabular-nums">{value}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
