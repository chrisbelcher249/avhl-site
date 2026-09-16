import GoalHornsExplorer from "@/components/GoalHornsExplorer";
import { getTeams } from "@/lib/teams";

export const metadata = {
  title: "Goal Horns",
  description: "Listen to the official 2026–27 goal horns for all 40 AVHL Major League clubs.",
};

export const dynamic = "force-dynamic";

export default async function GoalHornsPage() {
  const { teams } = await getTeams();

  return (
    <main className="bg-white text-[#000B36]">
      <section className="bg-[#000724] text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">2026–27 AVHL Audio</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Goal Horns</h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-white/60">
            Listen to every Major League club&apos;s goal horn. Audio never starts automatically — choose a team and press play when you want to hear it.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.14em]">
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-white/65">40 Major League clubs</span>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-white/65">No autoplay</span>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-white/65">One horn at a time</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <GoalHornsExplorer teams={teams} />
      </section>
    </main>
  );
}
