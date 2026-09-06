import Link from "next/link";

export const metadata = { title: "League Info" };

export default function InfoPage() {
  return (
    <main className="bg-white text-[#000B36]">
      <section className="bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">About the AVHL</p>
          <h1 className="mt-4 max-w-5xl text-5xl font-black tracking-tight md:text-7xl">A custom hockey universe built to keep evolving.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 md:text-xl">
            The American Virtual Hockey League combines simulation, franchise building, statistics, promotion and relegation, and long-term storytelling into one persistent hockey world.
          </p>
          <div className="mt-8">
            <Link href="/teams" className="inline-flex rounded-full bg-[#18BDFC] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#000B36] hover:bg-white">Meet the clubs</Link>
          </div>
        </div>
      </section>

      <section className="border-b border-[#000B36]/8 bg-[#F4F7FB] px-6 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">League archive</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">History lives here.</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">Regular-season records, past playoff brackets, and championship rosters are organized as parts of the league information archive.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <Link href="/info/history" className="group rounded-3xl bg-[#000B36] p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">History</p>
              <h3 className="mt-2 text-2xl font-black">League history</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/50">Historical standings, games, franchise lineage, and season records.</p>
              <p className="mt-5 text-sm font-black text-cyan-200">Explore history →</p>
            </Link>
            <Link href="/info/history/brackets" className="group rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#18BDFC] hover:shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">Playoffs</p>
              <h3 className="mt-2 text-2xl font-black">Playoff brackets</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/50">Every completed postseason rebuilt in one standardized bracket format.</p>
              <p className="mt-5 text-sm font-black text-[#A90117]">View brackets →</p>
            </Link>
            <Link href="/info/champions" className="group rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#18BDFC] hover:shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">Champions</p>
              <h3 className="mt-2 text-2xl font-black">Title history</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/50">Every champion and the roster that finished the championship run.</p>
              <p className="mt-5 text-sm font-black text-[#A90117]">View champions →</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["80", "Teams across the wider AVHL system", "Major and Minor League clubs create a larger ecosystem than a single static league."],
              ["40", "Major League clubs", "The 2026–27 Major League is split into four 10-team divisions across two conferences."],
              ["2022", "Established", "Each completed season adds another layer of results, rivalries, records, and franchise identity."],
            ].map(([value, heading, copy]) => (
              <div key={heading} className="rounded-3xl border border-[#000B36]/10 bg-[#F6F8FC] p-7">
                <p className="text-4xl font-black text-[#A90117]">{value}</p>
                <h2 className="mt-3 text-xl font-black">{heading}</h2>
                <p className="mt-3 text-sm leading-6 text-[#000B36]/58">{copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">What makes it different</p>
              <h2 className="mt-3 text-4xl font-black md:text-5xl">The league is designed to have consequences.</h2>
            </div>
            <div className="space-y-7 text-lg leading-8 text-[#000B36]/62">
              <p>Teams do not exist in isolation. Division races, promotion and relegation, ownership expectations, market identity, and season history all give each club a different context.</p>
              <p>The goal is not simply to simulate games. It is to make the universe feel persistent enough that results matter months and years later.</p>
              <p>The website is the public record for that universe: clubs, schedules, statistics, standings, and history in one place.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
