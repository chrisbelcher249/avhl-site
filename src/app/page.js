import Image from "next/image";
import Link from "next/link";
import { teams } from "../../data/teams";
import { playerCounts } from "../../data/players";

const divisions = [
  { name: "Pacific", conference: "Western" },
  { name: "Central", conference: "Western" },
  { name: "Atlantic", conference: "Eastern" },
  { name: "Metropolitan", conference: "Eastern" },
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden bg-[#000B36] text-white">
        <div className="absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_78%_18%,rgba(24,189,252,0.22),transparent_28%),radial-gradient(circle_at_15%_90%,rgba(169,1,23,0.28),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:px-8 md:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:py-32">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">2026–27 Season</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              A hockey universe with history.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70 md:text-xl">
              Forty Major League clubs. Four divisions. One long season of rivalries, movement, and championship pressure inside the American Virtual Hockey League.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/teams" className="rounded-full bg-[#18BDFC] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#000B36] transition hover:bg-white">
                Explore all 40 teams
              </Link>
              <Link href="/info" className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:border-white/50 hover:bg-white/5">
                How the AVHL works
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-md items-center justify-center lg:justify-end">
            <div className="absolute h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="relative flex aspect-square w-72 items-center justify-center rounded-[3rem] border border-white/10 bg-white/[0.06] p-10 shadow-2xl backdrop-blur md:w-80">
              <Image src="/avhl-logo.png" alt="AVHL logo" width={300} height={300} className="h-auto w-full object-contain" priority />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#000B36]/10 bg-white px-6 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl bg-[#F6F8FC] p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">League community</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Follow the 2026–27 AVHL season.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="https://discord.com/invite/ZTqfdqwraz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-full bg-[#000B36] px-6 py-3 text-center text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#00145C]"
            >
              Join the AVHL Discord
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-[#000B36]/10 bg-[#F6F8FC]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-[#000B36]/10 px-6 md:grid-cols-5 md:divide-y-0 md:px-8">
          {[
            [teams.length, "Major League clubs"],
            [4, "Divisions"],
            [2, "Conferences"],
            [playerCounts.total.toLocaleString(), "Players in database"],
            ["2022", "League established"],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-8 text-center md:py-10">
              <p className="text-4xl font-black text-[#000B36]">{value}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#000B36]/45">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">Major League map</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Four divisions. Forty identities.</h2>
            <p className="mt-5 text-lg leading-8 text-[#000B36]/60">
              The 2026–27 Major League is organized into two conferences, each containing two 10-team divisions.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {divisions.map((division) => {
              const divisionTeams = teams.filter((team) => team.division === division.name);
              return (
                <Link key={division.name} href={`/teams#${division.name.toLowerCase()}`} className="group rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-[0_8px_30px_rgba(0,11,54,0.05)] transition hover:-translate-y-1 hover:border-[#18BDFC]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#000B36]/40">{division.conference} Conference</p>
                  <h3 className="mt-2 text-2xl font-black">{division.name}</h3>
                  <p className="mt-2 text-sm font-bold text-[#000B36]/50">10 clubs</p>
                  <div className="mt-5 flex -space-x-2">
                    {divisionTeams.slice(0, 6).map((team) => (
                      <span key={team.slug} title={team.name} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white p-1 shadow-sm">
                        <Image src={team.assets.logo} alt="" width={700} height={700} className="h-full w-full object-contain" />
                      </span>
                    ))}
                  </div>
                  <p className="mt-6 text-sm font-black text-[#A90117] group-hover:text-[#000B36]">View division →</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">The league system</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Every season changes the story.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Rivalries", "Division-heavy schedules turn familiar opponents into long-term grudges."],
              ["Movement", "Promotion and relegation give the broader AVHL universe real consequences."],
              ["History", "Each season adds another layer of records, playoff runs, and franchise identity."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
