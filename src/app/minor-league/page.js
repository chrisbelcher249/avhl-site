import MinorLeagueDirectory from "@/components/MinorLeagueDirectory";
import { minorTeams } from "../../../data/minorTeams";

export const metadata = {
  title: "Minor League Teams",
  description: "Explore all 40 AVHL Minor League affiliates for the 2026–27 season.",
};

export default function MinorLeaguePage() {
  return (
    <main className="bg-white px-6 py-12 text-[#000B36] md:px-8 md:py-16">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">2026–27 Minor League</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">All 40 affiliates.</h1>
          <p className="mt-5 text-lg leading-8 text-[#000B36]/60">
            Browse every AVHL Minor League club by its Major League affiliate division, or search by team, city, abbreviation, arena, or affiliate.
          </p>
        </div>
        <div className="mt-10">
          <MinorLeagueDirectory teams={minorTeams} />
        </div>
      </section>
    </main>
  );
}
