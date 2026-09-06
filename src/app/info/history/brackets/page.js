import Link from "next/link";
import HistoricalPlayoffBrackets from "@/components/HistoricalPlayoffBrackets";

export const metadata = {
  title: "Playoff Bracket History",
  description: "Explore every completed AVHL playoff bracket from 2022–23 through 2025–26, standardized with historical seeds, series results, and champions.",
};

export default function HistoricalBracketsPage() {
  return (
    <main className="bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000724] text-white">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#18BDFC]/10 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-[#A90117]/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20">
          <Link href="/info/history" className="text-sm font-black text-white/55 transition hover:text-white">← League history</Link>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-cyan-200">Postseason archive</p>
          <h1 className="mt-3 max-w-5xl text-5xl font-black tracking-tight md:text-7xl">Every road to the championship.</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/58 md:text-lg">
            Four playoff formats, rebuilt into one consistent AVHL bracket archive. Historical names, seeds, advancement, and every preserved series score remain attached to the season in which they happened.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["4", "Completed postseasons"],
              ["2022–23", "First playoff bracket"],
              ["24", "Largest playoff field"],
              ["20", "Current-format field"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-3xl font-black tabular-nums">{value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/38">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 md:px-8 md:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Season selector</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Historical playoff brackets</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">
            Choose a season to follow each series from the opening round to the league champion. The bracket structure changes with the rules that were actually used that year.
          </p>
        </div>
        <HistoricalPlayoffBrackets />
      </section>
    </main>
  );
}
