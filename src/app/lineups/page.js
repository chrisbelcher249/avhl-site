import LineupDirectory from "@/components/LineupDirectory";
import { getTeams } from "@/lib/teams";

export const metadata = {
  title: "Team Lineups",
  description: "View 2026–27 AVHL forward lines, defense pairs, goalies, special teams, overtime units, and shootout orders.",
};

export const dynamic = "force-dynamic";

export default async function LineupsPage() {
  const { teams } = await getTeams();

  return (
    <main className="bg-white px-6 py-12 text-[#000B36] md:px-8 md:py-16">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">2026–27 Major League</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Team lineups.</h1>
          <p className="mt-5 text-lg leading-8 text-[#000B36]/60">
            View each club&apos;s forward lines, defense pairs, goalies, special teams, 3-on-3 units, and shootout order.
          </p>
          <div className="mt-6 inline-flex rounded-full border border-[#18BDFC]/25 bg-[#18BDFC]/10 px-4 py-2 text-xs font-black text-[#000B36]/65">
            Preview mode · lineups are generated from the current live roster until owner lineup saving is added.
          </div>
        </div>
        <div className="mt-10">
          <LineupDirectory teams={teams} />
        </div>
      </section>
    </main>
  );
}
