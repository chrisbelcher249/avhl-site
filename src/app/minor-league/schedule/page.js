import MinorLeagueNav from "@/components/MinorLeagueNav";
import MinorLeagueScheduleExplorer from "@/components/MinorLeagueScheduleExplorer";
import { getMinorLeagueSchedule } from "@/lib/minorLeague";

export const metadata = {
  title: "Minor League Schedule",
  description: "Complete live 2026–27 AVHL Minor League schedule and results.",
};

export const dynamic = "force-dynamic";

export default async function MinorLeagueSchedulePage() {
  const { schedule, error } = await getMinorLeagueSchedule();

  return (
    <main className="bg-[#F4F7FB] px-6 py-12 text-[#000B36] md:px-8 md:py-16">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">Minor League · 2026–27</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">1,640-game schedule.</h1>
          <p className="mt-5 text-lg leading-8 text-[#000B36]/60">
            The complete Minor League schedule and live results, kept entirely inside the Minor League section of the site.
          </p>
        </div>

        <div className="mt-8">
          <MinorLeagueNav active="schedule" />
        </div>

        {error ? <p className="mt-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}

        <div className="mt-8">
          <MinorLeagueScheduleExplorer schedule={schedule} />
        </div>
      </section>
    </main>
  );
}
