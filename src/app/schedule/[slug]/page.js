import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TeamScheduleExplorer from "@/components/TeamScheduleExplorer";
import { scheduleByTeam } from "../../../../data/schedule";
import { teamBySlug, teams } from "../../../../data/teams";

export function generateStaticParams() {
  return teams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const team = teamBySlug[slug];
  if (!team) return {};
  return {
    title: `${team.name} Schedule`,
    description: `Complete 82-game 2026–27 AVHL schedule for the ${team.name}.`,
  };
}

export default async function TeamSchedulePage({ params }) {
  const { slug } = await params;
  const team = teamBySlug[slug];
  const games = scheduleByTeam[slug];
  if (!team || !games) notFound();

  const homeGames = games.filter((game) => game.home === slug).length;
  const awayGames = games.filter((game) => game.away === slug).length;

  return (
    <main className="bg-[#F4F7FB] text-[#000B36]">
      <section className="relative isolate overflow-hidden bg-[#000724] px-6 py-14 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_82%_20%,rgba(24,189,252,0.22),transparent_30%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundColor: team.colors.primary }} />
        <div className="relative mx-auto max-w-7xl">
          <Link href="/schedule" className="text-sm font-black text-white/55 transition hover:text-white">← Full league schedule</Link>
          <div className="mt-9 flex flex-col gap-7 md:flex-row md:items-center">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[2rem] border border-white/15 bg-white p-5 shadow-2xl md:h-40 md:w-40">
              <Image src={team.assets.logo} alt={`${team.name} logo`} width={700} height={700} className="h-full w-full object-contain" priority />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">{team.division} Division · {team.abbreviation}</p>
              <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl md:text-7xl">{team.name}</h1>
              <p className="mt-4 text-lg font-bold text-white/58">Official 2026–27 Major League schedule</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/teams/${team.slug}`} className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#000B36] transition hover:bg-cyan-100">Team profile</Link>
                <span className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-black text-white/76">{team.arena}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10 md:px-8 md:py-14">
        <div className="mb-10 grid grid-cols-3 gap-3">
          {[[games.length, "Total games"], [homeGames, "Home"], [awayGames, "Away"]].map(([value, label]) => (
            <div key={label} className="rounded-3xl border border-[#000B36]/10 bg-white p-5 text-center shadow-sm">
              <p className="text-3xl font-black md:text-4xl">{value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#000B36]/38">{label}</p>
            </div>
          ))}
        </div>
        <TeamScheduleExplorer teamSlug={team.slug} primary={team.colors.primary} games={games} />
      </section>
    </main>
  );
}
