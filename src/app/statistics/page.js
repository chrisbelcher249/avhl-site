import Link from "next/link";
import TeamMark from "@/components/TeamMark";
import { getSeasonStats } from "@/lib/seasonStats";
import { playerHistorySummary } from "@/lib/playerHistory";

export const metadata = {
  title: "Statistics",
  description: "2026–27 AVHL league leaders, team standings leaders, and the complete historical statistics archive.",
};
export const dynamic = "force-dynamic";

const savePct = (value) => (Number(value) || 0).toFixed(3);
const gaa = (value) => (Number(value) || 0).toFixed(2);

function EmptyLeaders({ label = "No official stats yet." }) {
  return <p className="px-5 py-7 text-sm font-semibold text-[#000B36]/42">{label}</p>;
}

function SkaterLeaderCard({ title, eyebrow, rows, value }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
      <div className="border-b border-[#000B36]/8 bg-[#F7F9FC] px-5 py-4">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#A90117]">{eyebrow}</p>
        <h3 className="mt-1 text-xl font-black">{title}</h3>
      </div>
      {rows.length ? (
        <div className="divide-y divide-[#000B36]/8">
          {rows.map((row, index) => (
            <div key={row.playerId} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-5 py-3.5">
              <span className="text-xs font-black tabular-nums text-[#000B36]/30">{index + 1}</span>
              <div className="min-w-0">
                <Link href={`/players/${row.playerId}`} className="block truncate text-sm font-black hover:text-[#A90117]">{row.name}</Link>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/35">{row.team} · {row.position || "SK"}</p>
              </div>
              <span className="text-2xl font-black tabular-nums">{value(row)}</span>
            </div>
          ))}
        </div>
      ) : <EmptyLeaders />}
    </div>
  );
}

function GoalieLeaderCard({ title, rows, value }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
      <div className="border-b border-[#000B36]/8 bg-[#F7F9FC] px-5 py-4">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#A90117]">Goalie leaders</p>
        <h3 className="mt-1 text-xl font-black">{title}</h3>
      </div>
      {rows.length ? (
        <div className="divide-y divide-[#000B36]/8">
          {rows.map((row, index) => (
            <div key={row.playerId} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-5 py-3.5">
              <span className="text-xs font-black tabular-nums text-[#000B36]/30">{index + 1}</span>
              <div className="min-w-0">
                <Link href={`/players/${row.playerId}`} className="block truncate text-sm font-black hover:text-[#A90117]">{row.name}</Link>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/35">{row.team} · {row.gp} GP</p>
              </div>
              <span className="text-2xl font-black tabular-nums">{value(row)}</span>
            </div>
          ))}
        </div>
      ) : <EmptyLeaders />}
    </div>
  );
}

export default async function StatisticsPage() {
  const stats = await getSeasonStats();

  const teamLeaders = stats.teams
    .filter((team) => team.gp > 0)
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.goalDifferential - a.goalDifferential || a.abbreviation.localeCompare(b.abbreviation))
    .slice(0, 5);

  const pointLeaders = [...stats.skaters].sort((a, b) => b.points - a.points || b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name)).slice(0, 5);
  const goalLeaders = [...stats.skaters].sort((a, b) => b.goals - a.goals || b.points - a.points || b.shots - a.shots || a.name.localeCompare(b.name)).slice(0, 5);
  const assistLeaders = [...stats.skaters].sort((a, b) => b.assists - a.assists || b.points - a.points || b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, 5);
  const goaliesUsed = stats.goalies.filter((goalie) => goalie.gp > 0 && goalie.toi > 0);
  const savePctLeaders = [...goaliesUsed].sort((a, b) => b.savePct - a.savePct || b.saves - a.saves || b.gp - a.gp || a.name.localeCompare(b.name)).slice(0, 5);
  const gaaLeaders = [...goaliesUsed].sort((a, b) => a.gaa - b.gaa || b.gp - a.gp || b.saves - a.saves || a.name.localeCompare(b.name)).slice(0, 5);

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-14 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 AVHL</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">League leaders</h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/65 md:text-lg">A quick look at the top teams and individual leaders, with sortable league-wide skater and goalie tables one click away.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/standings" className="rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#000B36] transition hover:bg-cyan-100">Full standings →</Link>
            <Link href="/statistics/career" className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white hover:text-[#000B36]">Career & historical stats</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-8 md:py-14">
        {stats.error ? <p className="mb-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{stats.error}</p> : null}

        <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
            <div className="flex items-end justify-between gap-4 border-b border-[#000B36]/8 bg-[#000B36] px-6 py-5 text-white">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200">Standings leaders</p>
                <h2 className="mt-1 text-2xl font-black">Top 5 teams by PTS</h2>
              </div>
              <Link href="/standings" className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55 hover:text-white">All teams →</Link>
            </div>
            {teamLeaders.length ? (
              <div className="divide-y divide-[#000B36]/8">
                {teamLeaders.map((row, index) => {
                  const team = row.teamInfo;
                  return (
                    <div key={row.abbreviation} className="grid grid-cols-[28px_56px_1fr_auto] items-center gap-3 px-5 py-4">
                      <span className="text-sm font-black tabular-nums text-[#000B36]/28">{index + 1}</span>
                      {team ? <TeamMark team={team} size="sm" framed={false} /> : <div className="h-11 w-11" />}
                      <div className="min-w-0">
                        {team ? <Link href={`/teams/${team.slug}`} className="block truncate text-sm font-black hover:text-[#A90117]">{team.name}</Link> : <p className="font-black">{row.abbreviation}</p>}
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#000B36]/38">{row.gp} GP · {row.wins}-{row.losses}-{row.otl}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black tabular-nums">{row.points}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#000B36]/30">PTS</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyLeaders label="No official games have been recorded yet." />}
          </div>

          <div className="rounded-[2rem] border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A90117]">League-wide tables</p>
            <h2 className="mt-2 text-3xl font-black">Detailed player statistics.</h2>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[#000B36]/52">Open the full 2026–27 skater or goalie table and sort the league by any displayed variable, including GP, scoring, percentages, TOI, and more.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/statistics/skaters" className="rounded-full bg-[#000B36] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-[#101D4F]">Detailed skater stats →</Link>
              <Link href="/statistics/goalies" className="rounded-full border border-[#000B36]/12 px-5 py-2.5 text-xs font-black uppercase tracking-wide hover:border-[#18BDFC]">Detailed goalie stats →</Link>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Skater leaders</p>
            <h2 className="mt-1 text-3xl font-black">Top 5 by category</h2>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <SkaterLeaderCard title="Points" eyebrow="PTS" rows={pointLeaders} value={(row) => row.points} />
            <SkaterLeaderCard title="Goals" eyebrow="G" rows={goalLeaders} value={(row) => row.goals} />
            <SkaterLeaderCard title="Assists" eyebrow="A" rows={assistLeaders} value={(row) => row.assists} />
          </div>
        </div>

        <div className="mt-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Goalie leaders</p>
            <h2 className="mt-1 text-3xl font-black">Top 5 by category</h2>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <GoalieLeaderCard title="Save percentage" rows={savePctLeaders} value={(row) => savePct(row.savePct)} />
            <GoalieLeaderCard title="Goals-against average" rows={gaaLeaders} value={(row) => gaa(row.gaa)} />
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] bg-[#000B36] p-7 text-white md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Permanent archive</p>
          <h2 className="mt-2 text-3xl font-black">2022–23 through 2025–26</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55 md:text-base">Search {playerHistorySummary.total.toLocaleString()} players with recorded AVHL statistics from the league&apos;s first four seasons.</p>
          <Link href="/statistics/career" className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#000B36]">Browse career stats →</Link>
        </div>
      </section>
    </main>
  );
}
