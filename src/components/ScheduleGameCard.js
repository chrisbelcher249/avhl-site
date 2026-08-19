import Image from "next/image";
import Link from "next/link";
import { teamBySlug } from "../../data/teams";
import { gameHasResult } from "@/lib/scheduleFormat";

function TeamRow({ slug, venue, score, winner, focusTeamSlug }) {
  const team = teamBySlug[slug];
  const focused = focusTeamSlug === slug;

  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${focused ? "bg-[#000B36]/[0.055]" : ""}`}>
      <span className="w-10 shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#000B36]/35">{venue}</span>
      <Link href={`/teams/${team.slug}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none transition hover:text-[#A90117] focus-visible:ring-2 focus-visible:ring-[#18BDFC]">
        <Image src={team.assets.logo} alt="" width={48} height={48} className="h-9 w-9 shrink-0 object-contain" />
        <span className={`min-w-0 truncate text-sm ${focused || winner ? "font-black" : "font-bold"}`}>{team.name}</span>
      </Link>
      {Number.isFinite(score) ? <span className={`min-w-7 text-right text-xl ${winner ? "font-black" : "font-bold text-[#000B36]/52"}`}>{score}</span> : null}
    </div>
  );
}

export default function ScheduleGameCard({ game, focusTeamSlug = null }) {
  const complete = gameHasResult(game);
  const awayWinner = complete && game.awayScore > game.homeScore;
  const homeWinner = complete && game.homeScore > game.awayScore;

  return (
    <article className="rounded-3xl border border-[#000B36]/10 bg-white p-3 shadow-[0_8px_28px_rgba(0,11,54,0.045)] transition hover:border-[#18BDFC]/60 hover:shadow-[0_12px_34px_rgba(0,11,54,0.08)]">
      <div className="flex items-center justify-between gap-4 px-3 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.15em] text-[#000B36]/35">
        <span>Game {game.id}</span>
        <span>{complete ? `${game.overtime ? "Final · OT" : "Final"}` : "Scheduled"}</span>
      </div>
      <TeamRow slug={game.away} venue="Away" score={game.awayScore} winner={awayWinner} focusTeamSlug={focusTeamSlug} />
      <div className="mx-3 border-t border-[#000B36]/8" />
      <TeamRow slug={game.home} venue="Home" score={game.homeScore} winner={homeWinner} focusTeamSlug={focusTeamSlug} />
    </article>
  );
}
