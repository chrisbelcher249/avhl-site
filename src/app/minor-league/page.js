import MinorLeagueDirectory from "@/components/MinorLeagueDirectory";
import MinorLeagueNav from "@/components/MinorLeagueNav";
import { minorTeams } from "../../../data/minorTeams";
import { calculateMinorLeagueStandings, getMinorLeagueSchedule } from "@/lib/minorLeague";

export const metadata = {
  title: "Minor League",
  description: "Explore all 40 AVHL Minor League clubs for the 2026–27 season.",
};

export const dynamic = "force-dynamic";

export default async function MinorLeaguePage() {
  const { schedule, error } = await getMinorLeagueSchedule();
  const recordsBySlug = error && schedule.length === 0 ? {} : calculateMinorLeagueStandings(schedule).bySlug;
  return (
    <main className="bg-[#F4F7FB] px-6 py-12 text-[#000B36] md:px-8 md:py-16">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">2026–27 AVHL Minor League</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Forty clubs. One table.</h1>
          <p className="mt-5 text-lg leading-8 text-[#000B36]/60">
            Browse every Minor League club, follow the full 1,640-game schedule, and track the league-wide race for the three promotion places.
          </p>
        </div>

        <div className="mt-8">
          <MinorLeagueNav active="teams" />
        </div>

        {error ? <p className="mt-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}

        <div className="mt-10">
          <MinorLeagueDirectory teams={minorTeams} recordsBySlug={recordsBySlug} />
        </div>
      </section>
    </main>
  );
}
