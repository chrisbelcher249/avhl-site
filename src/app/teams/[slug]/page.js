import Link from "next/link";
import { notFound } from "next/navigation";
import TeamMark from "@/components/TeamMark";
import { teamBySlug, teams } from "../../../../data/teams";

export function generateStaticParams() {
  return teams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const team = teamBySlug[slug];
  if (!team) return {};
  return {
    title: team.name,
    description: `${team.name} — ${team.division} Division profile for the 2026–27 AVHL Major League season.`,
  };
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#000B36]/10 bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#000B36]/40">{label}</p>
      <p className="mt-2 text-xl font-black">{value ?? "—"}</p>
    </div>
  );
}

function RatingBar({ label, value }) {
  const score = Number(value) || 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-bold">
        <span>{label}</span>
        <span>{value ?? "—"}/10</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#000B36]/8">
        <div className="h-full rounded-full bg-[#18BDFC]" style={{ width: `${Math.max(0, Math.min(10, score)) * 10}%` }} />
      </div>
    </div>
  );
}

export default async function TeamPage({ params }) {
  const { slug } = await params;
  const team = teamBySlug[slug];
  if (!team) notFound();

  const divisionTeams = teams.filter((candidate) => candidate.division === team.division && candidate.slug !== team.slug);

  return (
    <main className="bg-[#F6F8FC] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] text-white">
        <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: team.colors.primary }} />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: team.colors.primary }} />
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
          <Link href="/teams" className="text-sm font-black text-white/55 transition hover:text-white">← All teams</Link>
          <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-center">
            <TeamMark team={team} size="lg" />
            <div>
              <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.14em]">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/75">{team.conference} Conference</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/75">{team.division} Division</span>
              </div>
              <p className="mt-5 text-sm font-black uppercase tracking-[0.25em] text-cyan-200">{team.city}</p>
              <h1 className="mt-1 text-5xl font-black uppercase tracking-tight sm:text-6xl md:text-7xl">{team.nickname}</h1>
              <p className="mt-4 text-lg font-bold text-white/60">{team.arena}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Club profile</p>
                  <h2 className="mt-2 text-3xl font-black">2026–27 identity</h2>
                </div>
                <p className="text-sm font-bold text-[#000B36]/45">Official team specification</p>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Abbreviation" value={team.abbreviation} />
                <Metric label="Prestige" value={team.prestige} />
                <Metric label="Market size" value={team.marketSize} />
                <Metric label="Arena" value={team.arena} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Brand</p>
                <h2 className="mt-2 text-2xl font-black">Team colors</h2>
                <div className="mt-6 space-y-3">
                  {[
                    [team.colors.primaryName || "Primary", team.colors.primary],
                    [team.colors.secondaryName || "Secondary", team.colors.secondary],
                    [team.colors.tertiaryName || "Tertiary", team.colors.tertiary],
                  ].map(([name, hex]) => (
                    <div key={`${name}-${hex}`} className="flex items-center justify-between gap-4 rounded-2xl border border-[#000B36]/8 p-3">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl border border-black/10" style={{ backgroundColor: hex }} />
                        <div>
                          <p className="font-black">{name}</p>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#000B36]/40">{hex}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Ownership</p>
                <h2 className="mt-2 text-2xl font-black">Owner profile</h2>
                <div className="mt-7 space-y-6">
                  <RatingBar label="Spending" value={team.owner.spending} />
                  <RatingBar label="Success" value={team.owner.success} />
                  <RatingBar label="Patience" value={team.owner.patience} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Fan & market profile</p>
              <h2 className="mt-2 text-2xl font-black">How the club is positioned</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Local fan base" value={team.localFanBase} />
                <Metric label="National fan base" value={team.nationalFanBase} />
                <Metric label="Local popularity" value={team.localPopularity} />
                <Metric label="National popularity" value={team.nationalPopularity} />
                <Metric label="State tax rate" value={team.tax.state} />
                <Metric label="Federal tax rate" value={team.tax.federal} />
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-[#000B36] p-6 text-white shadow-sm md:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Division rivals</p>
              <h2 className="mt-2 text-2xl font-black">{team.division}</h2>
              <div className="mt-5 space-y-2">
                {divisionTeams.map((rival) => (
                  <Link key={rival.slug} href={`/teams/${rival.slug}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white">
                    <span>{rival.name}</span>
                    <span className="text-xs text-white/35">{rival.abbreviation}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Arena experience</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Concessions" value={`Level ${team.facilities.concessions ?? "—"}`} />
                <Metric label="Club seating" value={`Level ${team.facilities.clubSeating ?? "—"}`} />
                <Metric label="Team store" value={`Level ${team.facilities.teamStore ?? "—"}`} />
                <Metric label="Parking" value={`Level ${team.facilities.parking ?? "—"}`} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
