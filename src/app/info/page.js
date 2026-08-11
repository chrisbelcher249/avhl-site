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
