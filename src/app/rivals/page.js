import Image from "next/image";
import Link from "next/link";
import { teams, teamBySlug } from "../../../data/teams";
import { namedRivalryGroups, rivalsByTeam, rivalryLevels, topRivalries } from "../../../data/rivals";

export const metadata = {
  title: "Rivals",
  description: "The official AVHL rivalry matrix, top 10 rivalries, and named multi-team rivalry groups for the 2026–27 season.",
};

function TeamLogo({ team, size = 44 }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm" style={{ width: size, height: size }}>
      <Image src={team.assets.logo} alt="" width={size} height={size} className="h-full w-full object-contain" />
    </span>
  );
}

function RivalryLevelDot({ value, className = "h-2.5 w-2.5" }) {
  const level = rivalryLevels[value];
  return (
    <span
      className={`${className} inline-block shrink-0 rounded-full ring-1 ring-[#000B36]/10`}
      style={{ backgroundColor: level?.color }}
      title={`Level ${value} — ${level?.name || "Rival"}`}
      aria-label={`Level ${value}: ${level?.name || "Rival"}`}
    />
  );
}

function RivalryLevelLegend({ dark = false }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {Object.entries(rivalryLevels).map(([number, level]) => (
        <div key={number} className={`flex items-center gap-2 text-[10px] font-black ${dark ? "text-white/58" : "text-[#000B36]/52"}`}>
          <RivalryLevelDot value={Number(number)} className="h-2 w-2" />
          <span>{number} — {level.name}</span>
        </div>
      ))}
    </div>
  );
}

function RivalCell({ rival }) {
  const team = teamBySlug[rival.slug];
  if (!team) return <span className="text-[#000B36]/35">—</span>;

  return (
    <Link href={`/teams/${team.slug}`} className="group flex min-w-[175px] items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[#F1F7FB]">
      <TeamLogo team={team} size={34} />
      <p className="min-w-0 flex-1 truncate text-xs font-black text-[#000B36] group-hover:text-[#A90117]">{team.name}</p>
      <RivalryLevelDot value={rival.code} />
    </Link>
  );
}

export default function RivalsPage() {
  const alphabeticalTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  const rivalrySlots = Object.values(rivalsByTeam).reduce((sum, rivals) => sum + rivals.length, 0);

  return (
    <main className="bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-24">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_84%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_12%_95%,rgba(169,1,23,0.36),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">2026–27 Major League</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">AVHL Rivals</h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-white/64">
            The league-wide rivalry map: every club&apos;s four designated rivals, the official top 10, and the named trio and quad rivalries that cut across the AVHL.
          </p>

          <div className="mt-9 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [teams.length, "Major clubs"],
              [rivalrySlots, "Rival slots"],
              [topRivalries.length, "Top rivalries"],
              [namedRivalryGroups.length, "Named groups"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-3xl font-black">{value}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">{label}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="overflow-hidden rounded-[2rem] bg-[#000B36] text-white shadow-sm">
            <div className="border-b border-white/10 px-6 py-6 md:px-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">League ranking</p>
              <h2 className="mt-2 text-3xl font-black">Top 10 rivalries</h2>
            </div>
            <div className="divide-y divide-white/[0.08] px-4 py-2 md:px-5">
              {topRivalries.map((rivalry) => {
                const left = teamBySlug[rivalry.teams[0]];
                const right = teamBySlug[rivalry.teams[1]];
                return (
                  <div key={rivalry.rank} className="grid grid-cols-[36px_1fr_auto_1fr] items-center gap-2 py-3.5 md:gap-3">
                    <span className="text-center text-lg font-black text-cyan-200">{rivalry.rank}</span>
                    <Link href={`/teams/${left.slug}`} className="flex min-w-0 items-center gap-2 rounded-xl p-1.5 transition hover:bg-white/[0.08]">
                      <TeamLogo team={left} size={38} />
                      <span className="min-w-0 truncate text-xs font-black md:text-sm">{left.name}</span>
                    </Link>
                    <span className="text-[10px] font-black uppercase tracking-wide text-white/30">vs</span>
                    <Link href={`/teams/${right.slug}`} className="flex min-w-0 items-center justify-end gap-2 rounded-xl p-1.5 text-right transition hover:bg-white/[0.08]">
                      <span className="min-w-0 truncate text-xs font-black md:text-sm">{right.name}</span>
                      <TeamLogo team={right} size={38} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Named rivalry series</p>
            <h2 className="mt-2 text-3xl font-black">Trios & quads</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#000B36]/50">
              {namedRivalryGroups.length} multi-team rivalry groups have their own league identity.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {namedRivalryGroups.map((group) => (
                <article key={group.name} className="rounded-2xl border border-[#000B36]/10 bg-[#F7F9FC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#A90117]">{group.type}</p>
                      <h3 className="mt-1 text-xl font-black leading-tight">{group.name}</h3>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-[#000B36] px-2.5 py-1 text-[9px] font-black text-white">{group.teams.length} teams</span>
                  </div>
                  <div className="mt-4 space-y-1">
                    {group.teams.map((slug) => {
                      const team = teamBySlug[slug];
                      return (
                        <Link key={slug} href={`/teams/${slug}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-black transition hover:bg-white hover:text-[#A90117]">
                          <TeamLogo team={team} size={30} />
                          <span className="flex-1">{team.name}</span>
                          <span className="text-[9px] text-[#000B36]/30">{team.abbreviation}</span>
                        </Link>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#000B36]/8 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Complete league matrix</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">Every team&apos;s four rivals</h2>
            </div>
            <div className="max-w-xl">
              <p className="text-xs font-bold leading-5 text-[#000B36]/42">
                Columns show the official Rival 1–4 order. The small colored dot shows the rivalry level.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-start md:justify-end">
            <div className="rounded-xl border border-[#000B36]/8 bg-[#F7F9FC] px-3 py-2.5">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#000B36]/36">Rivalry levels</p>
              <RivalryLevelLegend />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-3xl border border-[#000B36]/10 shadow-sm">
            <table className="w-full min-w-[980px] border-collapse bg-white text-left">
              <thead className="bg-[#000B36] text-white">
                <tr>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.16em]">Team</th>
                  {[1, 2, 3, 4].map((number) => (
                    <th key={number} className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.16em]">Rival {number}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000B36]/8">
                {alphabeticalTeams.map((team) => {
                  const rivals = rivalsByTeam[team.slug] || [];
                  return (
                    <tr key={team.slug} className="align-middle hover:bg-[#FAFBFD]">
                      <td className="px-4 py-2">
                        <Link href={`/teams/${team.slug}`} className="flex min-w-[210px] items-center gap-3 rounded-xl p-1.5 transition hover:bg-[#F1F7FB]">
                          <TeamLogo team={team} size={38} />
                          <div>
                            <p className="text-sm font-black">{team.name}</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/35">{team.abbreviation}</p>
                          </div>
                        </Link>
                      </td>
                      {[0, 1, 2, 3].map((index) => (
                        <td key={index} className="px-1.5 py-1">
                          {rivals[index] ? <RivalCell rival={rivals[index]} /> : <span className="px-3 text-[#000B36]/30">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
