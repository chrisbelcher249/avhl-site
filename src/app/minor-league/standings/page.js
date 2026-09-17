import MinorLeagueNav from "@/components/MinorLeagueNav";
import MinorLeagueStandingsTable from "@/components/MinorLeagueStandingsTable";
import { calculateMinorLeagueStandings, getMinorLeagueSchedule } from "@/lib/minorLeague";

export const metadata = {
  title: "Minor League Standings",
  description: "Live 2026–27 AVHL Minor League standings and promotion race.",
};

export const dynamic = "force-dynamic";

export default async function MinorLeagueStandingsPage() {
  const { schedule, error } = await getMinorLeagueSchedule();
  const { league, completedGames } = calculateMinorLeagueStandings(schedule);

  return (
    <main className="bg-[#F4F7FB] px-6 py-12 text-[#000B36] md:px-8 md:py-16">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">Minor League · Promotion Race</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">One league table.</h1>
          <p className="mt-5 text-lg leading-8 text-[#000B36]/60">
            All 40 clubs are ranked together using the same AVHL tiebreakers as the Major League. The top three at season&apos;s end are promoted.
          </p>
        </div>

        <div className="mt-8">
          <MinorLeagueNav active="standings" />
        </div>

        {error ? <p className="mt-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}

        <div className="mt-8">
          <MinorLeagueStandingsTable standings={league} completedGames={completedGames} />
        </div>

        <p className="mt-5 text-sm font-semibold leading-6 text-[#000B36]/48">
          Tiebreakers: PTS → PTS% → Regulation Wins → Wins → GF/Game → GA/Game → Goal Differential.
        </p>
      </section>
    </main>
  );
}
