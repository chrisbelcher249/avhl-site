import { getSchedule } from "@/lib/schedule";
import { calculateStandings } from "@/lib/standings";
import StandingsViews from "@/components/StandingsViews";

export const metadata = {
  title: "Standings",
  description: "Live 2026–27 AVHL league, conference, division, wild-card, and playoff-bracket standings calculated from official schedule results.",
};

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const { schedule, source, error } = await getSchedule();
  const { league, conferences, completedGames } = calculateStandings(schedule);

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.30),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 Major League</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Standings</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            One live table, five ways to view the race. Every ranking and projected playoff seed updates from the official schedule using the AVHL&apos;s full tiebreaker order.
          </p>
          <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
            {[[completedGames, "Games completed"], [schedule.length - completedGames, "Games remaining"], [source === "live" ? "Live" : "Fallback", "Schedule source"]].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 backdrop-blur">
                <p className="text-3xl font-black">{value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 md:px-8 md:py-14">
        {error ? <p className="mb-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}
        <StandingsViews league={league} conferences={conferences} completedGames={completedGames} />
      </section>
    </main>
  );
}
