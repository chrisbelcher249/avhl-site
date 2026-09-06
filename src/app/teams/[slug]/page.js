import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TeamMark from "@/components/TeamMark";
import RosterSection from "@/components/RosterSection";
import DraftPickSection from "@/components/DraftPickSection";
import SalaryCapSection from "@/components/SalaryCapSection";
import FranchiseHistorySection from "@/components/FranchiseHistorySection";
import { teamBySlug, teams } from "../../../../data/teams";
import { getDraftPicksForTeam } from "@/lib/draftPicks";
import { buildTeamRosterAndCap } from "../../../../data/salaryCap";
import { getPlayers } from "@/lib/players";
import { getFranchiseHistory, getFranchiseSummary } from "@/lib/history";
import { getRivalsForTeam, rivalryLevels } from "../../../../data/rivals";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return teams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const team = teamBySlug[slug];
  if (!team) return {};
  return {
    title: team.name,
    description: `${team.name} — ${team.division} Division club profile, current roster, salary-cap status, draft picks, uniforms, arena, and mascot for the 2026–27 AVHL season.`,
  };
}

function Fact({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#000B36]/10 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/40">{label}</p>
      <p className="mt-1.5 text-base font-black">{value || "—"}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
      {copy ? <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">{copy}</p> : null}
    </div>
  );
}

function OvrStat({ label, value, emphasized = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasized ? "border-[#000B36] bg-[#000B36] text-white" : "border-[#000B36]/10 bg-white"}`}>
      <p className={`whitespace-nowrap text-[9px] font-black uppercase tracking-[0.11em] sm:text-[10px] ${emphasized ? "text-white/65" : "text-[#000B36]/38"}`}>{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{Number.isFinite(value) ? value.toFixed(1) : "—"}</p>
    </div>
  );
}

export default async function TeamPage({ params }) {
  const { slug } = await params;
  const team = teamBySlug[slug];
  if (!team) notFound();

  const { players } = await getPlayers();
  const roster = buildTeamRosterAndCap(players, team.name);
  const { picks: draftPicks, error: draftPickError } = await getDraftPicksForTeam(team.abbreviation);
  const rivals = getRivalsForTeam(team.slug).map((rival, index) => ({ ...rival, index, team: teamBySlug[rival.slug] })).filter((rival) => rival.team);
  const franchiseHistory = getFranchiseHistory(team.abbreviation);
  const franchiseSummary = getFranchiseSummary(team.abbreviation);
  const uniforms = [
    ["Home", team.assets.home],
    ["Away", team.assets.away],
    ["Alternate", team.assets.alt],
  ];

  return (
    <main className="bg-[#F4F7FB] text-[#000B36]">
      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#000724] text-white md:min-h-[620px]">
        <Image src={team.assets.arena} alt={`${team.arena}, home arena of the ${team.name}`} fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#000724]/95 via-[#000724]/78 to-[#000724]/28" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000724] via-transparent to-[#000724]/20" />
        <div className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundColor: team.colors.primary }} />

        <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col px-6 py-10 md:min-h-[620px] md:px-8 md:py-14">
          <Link href="/teams" className="w-fit text-sm font-black text-white/60 transition hover:text-white">← All teams</Link>
          <div className="mt-auto grid items-end gap-8 pb-6 lg:grid-cols-[auto_1fr_auto]">
            <TeamMark team={team} size="xl" priority />
            <div className="pb-2">
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/80 backdrop-blur">{team.conference} Conference</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/80 backdrop-blur">{team.division} Division</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/80 backdrop-blur">{team.abbreviation}</span>
              </div>
              <p className="mt-5 text-sm font-black uppercase tracking-[0.26em] text-white">{team.city}</p>
              <h1 className="mt-1 text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">{team.nickname}</h1>
              <p className="mt-5 max-w-xl text-base font-bold text-white/66 md:text-lg">{team.arena}</p>
              <Link href={`/schedule/${team.slug}`} className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-[#000B36] transition hover:bg-cyan-100">
                View 2026–27 schedule
              </Link>
            </div>
            <div className="hidden min-w-48 rounded-3xl border border-white/15 bg-black/20 p-5 backdrop-blur lg:block">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Current roster</p>
              <p className="mt-2 text-4xl font-black">{roster.count}</p>
              <p className="mt-1 text-xs font-bold text-white/50">{roster.skaters.length} skaters · {roster.goalies.length} goalies</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
            <SectionHeading eyebrow="Club identity" title="2026–27 team profile" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Fact label="Arena" value={team.arena} />
              <Fact label="Mascot" value={team.mascot?.name} />
              <Fact label="Division" value={team.division} />
              <Fact label="Rostered players" value={String(roster.count)} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [team.colors.primaryName || "Primary", team.colors.primary],
                [team.colors.secondaryName || "Secondary", team.colors.secondary],
                [team.colors.tertiaryName || "Tertiary", team.colors.tertiary],
              ].map(([name, hex]) => (
                <div key={`${name}-${hex}`} className="flex items-center gap-3 rounded-2xl border border-[#000B36]/10 p-3">
                  <span className="h-11 w-11 shrink-0 rounded-xl border border-black/10" style={{ backgroundColor: hex }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{name}</p>
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#000B36]/38">{hex}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-[#F6F8FC] p-4 md:p-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">Roster ratings</p>
                  <h3 className="mt-1 text-xl font-black">Average OVR</h3>
                </div>
                <p className="text-[10px] font-bold text-[#000B36]/35">Live roster · one decimal</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <OvrStat label="Overall · Top 20" value={roster.averageOverall} emphasized />
                <OvrStat label="Forwards · Top 12" value={roster.forwardAverageOverall} />
                <OvrStat label="Defense · Top 6" value={roster.defenseAverageOverall} />
                <OvrStat label="Goalies · Top 2" value={roster.goalieAverageOverall} />
              </div>
            </div>
          </div>

          <div className="self-start rounded-3xl bg-[#000B36] p-5 text-white shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Official rivals</p>
                <h2 className="mt-1.5 text-2xl font-black">Rivals</h2>
                <p className="mt-1 text-xs font-bold text-white/42">Four designated opponents</p>
              </div>
              <Link href="/rivals" className="rounded-full border border-white/15 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 transition hover:bg-white hover:text-[#000B36]">
                All rivals
              </Link>
            </div>
            <div className="mt-4 grid gap-2">
              {rivals.map((rival) => {
                const level = rivalryLevels[rival.code];
                return (
                  <Link key={rival.slug} href={`/teams/${rival.slug}`} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[10px] font-black text-cyan-200">{rival.index + 1}</span>
                    <Image src={rival.team.assets.logo} alt="" width={40} height={40} className="h-8 w-8 object-contain" />
                    <span className="min-w-0 flex-1 truncate">{rival.team.name}</span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10"
                      style={{ backgroundColor: level?.color }}
                      title={`Level ${rival.code} — ${level?.name || "Rival"}`}
                      aria-label={`Level ${rival.code}: ${level?.name || "Rival"}`}
                    />
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/32">Rivalry levels</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {Object.entries(rivalryLevels).map(([number, level]) => (
                  <div key={number} className="flex items-center gap-2 text-[9px] font-bold text-white/48">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: level.color }} />
                    <span><span className="text-white/68">{number}</span> — {level.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SalaryCapSection roster={roster} primary={team.colors.primary} />

      <section className="mx-auto max-w-7xl px-6 pb-14 md:px-8 md:pb-20">
        <RosterSection roster={roster} primary={team.colors.primary} />
      </section>

      <DraftPickSection team={team} picks={draftPicks} error={draftPickError} />

      <FranchiseHistorySection team={team} history={franchiseHistory} summary={franchiseSummary} />

      <section className="mx-auto max-w-7xl px-6 pb-14 pt-14 md:px-8 md:pb-20 md:pt-20">
        <SectionHeading eyebrow="Home ice" title={team.arena} copy={`The 2026–27 home of the ${team.name}.`} />
        <div className="mt-6 overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-[#000B36] shadow-lg">
          <div className="relative aspect-[16/9] w-full">
            <Image src={team.assets.arena} alt={`${team.arena} arena view`} fill sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="border-y border-[#000B36]/8 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20">
          <SectionHeading eyebrow="Uniform set" title="Home, away & alternate" copy="All three official 2026–27 looks, presented from the finalized team artwork." />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {uniforms.map(([label, src]) => (
              <div key={label} className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-[#F6F8FC] shadow-sm">
                <div className="relative aspect-[812/1282] w-full overflow-hidden bg-[#EEF2F7]">
                  <Image src={src} alt={`${team.name} ${label.toLowerCase()} uniform`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">2026–27</p>
                    <h3 className="mt-1 text-xl font-black">{label}</h3>
                  </div>
                  <span className="h-8 w-8 rounded-full border-4 border-white shadow" style={{ backgroundColor: team.colors.primary }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-14 md:px-8 md:py-20 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
          <div className="relative aspect-[972/1472] bg-[#EDF2F8]">
            <Image src={team.assets.mascot} alt={`${team.mascot?.name || team.name} mascot`} fill sizes="(max-width: 1024px) 100vw, 38vw" className="object-cover" />
          </div>
          <div className="p-6 md:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Official mascot</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-black">{team.mascot?.name || "Mascot"}</h2>
              {team.mascot?.number ? <span className="rounded-full px-3 py-1.5 text-sm font-black text-white" style={{ backgroundColor: team.colors.primary }}>#{team.mascot.number}</span> : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#000B36] p-6 text-white shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Game night identity</p>
          <h2 className="mt-2 text-3xl font-black">Arena presentation</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/52">Team-specific presentation details from the official 2026–27 club specifications.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {[
              ["Goal horn", team.presentation?.goalHorn],
              ["Goal song", team.presentation?.goalSong],
              ["Win song", team.presentation?.winSong],
              ["Win presentation", team.presentation?.winPresentation],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
                <p className="mt-2 text-sm font-black leading-6 text-white/88">{value || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
