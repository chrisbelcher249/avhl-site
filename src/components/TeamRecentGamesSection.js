import Link from "next/link";
import { replayPresentationForGame } from "@/lib/replayLinks";
import { gameHasResult } from "@/lib/scheduleFormat";
import { calculateStandings } from "@/lib/standings";
import { teamBySlug } from "../../data/teams";

function dateLabel(value) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";
}

export default function TeamRecentGamesSection({ team, teamStats, schedule = [], scheduleById = {}, replayMetadata = {} }) {
  const games = teamStats?.gameRows || [];
  const records = calculateStandings(schedule).records;
  const upcomingGames = schedule
    .filter((game) => (game.home === team.slug || game.away === team.slug) && !gameHasResult(game))
    .sort((a, b) => a.id - b.id)
    .slice(0, 3);

  return (
    <section aria-label="Upcoming and recent games" className="mx-auto max-w-7xl px-6 pb-12 md:px-8 md:pb-16">
        <div className="mt-8 rounded-3xl border border-[#000B36]/10 bg-[#F6F8FC] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">Coming up</p><h3 className="mt-1 text-xl font-black">Next 3 games</h3></div>
            <Link href={`/schedule/${team.slug}`} className="text-xs font-black text-[#000B36]/60 hover:text-[#A90117]">Full team schedule →</Link>
          </div>
          {upcomingGames.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {upcomingGames.map((game) => {
                const isHome = game.home === team.slug;
                const opponent = teamBySlug[isHome ? game.away : game.home];
                const venue = (isHome ? team.arena : opponent?.arena) || "Venue TBD";
                const opponentRecord = opponent ? records[opponent.slug] : null;
                const recordText = opponentRecord ? `${opponentRecord.wins}-${opponentRecord.losses}-${opponentRecord.otl}` : "0-0-0";
                return (
                  <div key={game.id} className="rounded-2xl border border-[#000B36]/10 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.11em] text-[#000B36]/45">Game {game.id} · {dateLabel(game.date)} · {venue}</p>
                    <p className="mt-2 text-lg font-black">{isHome ? "vs" : "@"}{" "}
                      {opponent ? <Link href={`/teams/${opponent.slug}`} className="hover:text-[#A90117]">{opponent.name} ({recordText})</Link> : "Opponent TBD"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-4 text-sm font-semibold text-[#000B36]/55">No games remaining on the schedule.</p>}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#000B36]/10"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#000B36]/8 bg-[#F6F8FC] px-5 py-4"><h3 className="text-xl font-black">Previous 3 games</h3><Link href={`/schedule/${team.slug}`} className="rounded-full bg-[#000B36] px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-[#A90117]">Full Game Log →</Link></div>{games.length?<div className="divide-y divide-[#000B36]/8">{games.slice(0, 3).map((row)=>{const fixture=scheduleById[row.gameId];const replay=replayPresentationForGame(fixture||{id:row.gameId},replayMetadata);const replayAvailable=replay.available;const replayUrl=replay.url;const replayExternal=replay.external;return <div key={row.gameId} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[90px_1fr_auto_auto] sm:items-center"><span className="text-xs font-black text-[#000B36]/45">{dateLabel(fixture?.date)}</span><span className="font-black">{row.homeAway==="H"?"vs":"@"} {row.opponent}</span><span className="font-black">{row.result} {row.score}–{row.oppScore}{row.finish!=="REG"?` ${row.finish}`:""}</span><span className="flex items-center justify-end gap-2 text-xs font-bold text-[#000B36]/45"><span>Game {row.gameId}</span>{replayAvailable?<Link href={replayUrl} target={replayExternal?"_blank":undefined} rel={replayExternal?"noreferrer":undefined} className="rounded-full bg-[#000B36] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#A90117] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18BDFC]">Replay</Link>:null}</span></div>;})}</div>:<p className="p-6 text-sm font-semibold text-[#000B36]/45">No games have been recorded yet.</p>}</div>
    </section>
  );
}
