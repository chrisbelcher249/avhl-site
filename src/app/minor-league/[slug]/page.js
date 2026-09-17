import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import MinorLeagueGameCard from "@/components/MinorLeagueGameCard";
import MinorLeagueNav from "@/components/MinorLeagueNav";
import MinorLeagueTeamSchedule from "@/components/MinorLeagueTeamSchedule";
import { minorTeams } from "../../../../data/minorTeams";
import { calculateMinorLeagueStandings, gamesForMinorTeam, getMinorLeagueSchedule } from "@/lib/minorLeague";
import { formatShortScheduleDate } from "@/lib/scheduleFormat";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return minorTeams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const team = minorTeams.find((candidate) => candidate.slug === slug);
  if (!team) return {};
  return {
    title: `${team.name} · Minor League`,
    description: `2026–27 AVHL Minor League profile, record, affiliate, and schedule for the ${team.name}.`,
  };
}

function gameComplete(game) {
  return Number.isFinite(game.awayScore) && Number.isFinite(game.homeScore) && game.awayScore !== game.homeScore;
}

function ordinal(value) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export default async function MinorLeagueTeamPage({ params }) {
  const { slug } = await params;
  const team = minorTeams.find((candidate) => candidate.slug === slug);
  if (!team) notFound();

  const { schedule, error } = await getMinorLeagueSchedule();
  const teamGames = gamesForMinorTeam(schedule, slug);
  const standings = calculateMinorLeagueStandings(schedule);
  const record = standings.bySlug[slug];
  const completed = teamGames.filter(gameComplete);
  const upcoming = teamGames.filter((game) => !gameComplete(game));
  const recentGames = completed.slice(-3).reverse();
  const nextGames = upcoming.slice(0, 3);
  const homeGames = teamGames.filter((game) => game.home === slug).length;
  const awayGames = teamGames.filter((game) => game.away === slug).length;
  const inPromotionSpot = standings.completedGames > 0 && record?.rank <= 3;

  return (
    <main className="bg-[#F4F7FB] text-[#000B36]">
      <section className="relative isolate overflow-hidden bg-[#000724] px-6 py-14 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_82%_20%,rgba(24,189,252,0.22),transparent_30%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundColor: team.colors.primary }} />
        <div className="relative mx-auto max-w-7xl">
          <Link href="/minor-league" className="text-sm font-black text-white/55 transition hover:text-white">← Minor League</Link>
          <div className="mt-9 flex flex-col gap-7 md:flex-row md:items-center">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[2rem] border border-white/15 bg-white p-5 shadow-2xl md:h-40 md:w-40">
              <Image src={team.assets.logo} alt={`${team.name} logo`} width={700} height={700} className="h-full w-full object-contain" priority />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">AVHL Minor League · {team.abbreviation}</p>
              <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl md:text-7xl">{team.name}</h1>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-black">
                <span className="rounded-full border border-white/15 px-4 py-2 text-white/75">{team.arena}</span>
                <Link href={`/teams/${team.affiliate.slug}`} className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:bg-white hover:text-[#000B36]">Affiliate: {team.affiliate.name}</Link>
                {inPromotionSpot ? <span className="rounded-full bg-cyan-300 px-4 py-2 text-[#000724]">Promotion position</span> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <MinorLeagueNav active="teams" />

        {error ? <p className="mt-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [record ? `${record.wins}-${record.losses}-${record.otl}` : "0-0-0", "Record"],
            [record?.pts ?? 0, "Points"],
            [standings.completedGames && record ? `${ordinal(record.rank)} of 40` : "— of 40", "League position"],
            [homeGames, "Home games"],
            [awayGames, "Away games"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-3xl border border-[#000B36]/10 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black md:text-3xl">{value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#000B36]/38">{label}</p>
            </div>
          ))}
        </div>

        {(recentGames.length || nextGames.length) ? (
          <div className="mt-10 grid gap-8 xl:grid-cols-2">
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#A90117]">Latest</p>
                  <h2 className="mt-1 text-2xl font-black">Recent results</h2>
                </div>
                {recentGames[0] ? <span className="text-xs font-bold text-[#000B36]/35">{formatShortScheduleDate(recentGames[0].date)}</span> : null}
              </div>
              <div className="space-y-3">
                {recentGames.length ? recentGames.map((game) => <MinorLeagueGameCard key={game.id} game={game} focusTeamSlug={slug} />) : <p className="rounded-3xl border border-dashed border-[#000B36]/15 bg-white p-7 text-sm font-bold text-[#000B36]/45">No completed games yet.</p>}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#A90117]">Coming up</p>
                <h2 className="mt-1 text-2xl font-black">Next games</h2>
              </div>
              <div className="space-y-3">
                {nextGames.length ? nextGames.map((game) => <MinorLeagueGameCard key={game.id} game={game} focusTeamSlug={slug} />) : <p className="rounded-3xl border border-dashed border-[#000B36]/15 bg-white p-7 text-sm font-bold text-[#000B36]/45">Season schedule complete.</p>}
              </div>
            </section>
          </div>
        ) : null}

        <div className="mt-12 border-t border-[#000B36]/10 pt-10">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">2026–27</p>
            <h2 className="mt-1 text-3xl font-black">Full team schedule</h2>
          </div>
          {teamGames.length ? <MinorLeagueTeamSchedule teamSlug={slug} games={teamGames} primary={team.colors.primary} /> : <p className="rounded-3xl border border-dashed border-[#000B36]/20 bg-white p-10 text-center font-bold text-[#000B36]/50">Schedule unavailable.</p>}
        </div>
      </section>
    </main>
  );
}
