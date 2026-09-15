import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import LineupTeamSwitcher from "@/components/LineupTeamSwitcher";
import { teams as fallbackTeams } from "../../../../data/teams";
import { getTeamBySlug } from "@/lib/teams";
import { getPlayers } from "@/lib/players";
import { buildProjectedLineup } from "@/lib/lineups";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return fallbackTeams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { team } = await getTeamBySlug(slug);
  if (!team) return {};
  return {
    title: `${team.name} Lineup`,
    description: `${team.name} forward lines, defense pairs, goalies, special teams, overtime units, and shootout order for the 2026–27 AVHL season.`,
  };
}

function numberText(player) {
  const value = Number(player?.number);
  return Number.isFinite(value) ? `#${value}` : "No. —";
}

function PlayerCard({ item, team, roleLabel = null, compact = false }) {
  if (!item?.player) {
    return (
      <div className={`rounded-2xl border border-dashed border-[#000B36]/15 bg-[#F7F9FC] ${compact ? "p-3" : "p-4"}`}>
        <p className="text-xs font-black uppercase tracking-wide text-[#000B36]/30">Open slot</p>
      </div>
    );
  }

  const { player, assignedPosition } = item;
  return (
    <Link
      href={`/players/${player.id}`}
      className={`group relative min-w-0 overflow-hidden rounded-2xl border border-[#000B36]/10 bg-white shadow-[0_5px_18px_rgba(0,11,54,0.04)] transition hover:-translate-y-0.5 hover:border-[#18BDFC]/70 hover:shadow-[0_10px_25px_rgba(0,11,54,0.09)] ${compact ? "p-3" : "p-4"}`}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: team.colors.primary }} />
      <div className="flex min-w-0 items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#000B36] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
              {roleLabel || assignedPosition || player.position || "—"}
            </span>
            {player.position && assignedPosition && !String(player.position).toUpperCase().split(/[\\/,\s-]+/).includes(assignedPosition) ? (
              <span className="rounded-full bg-[#A90117]/8 px-2 py-0.5 text-[9px] font-black text-[#A90117]">Listed {player.position}</span>
            ) : null}
          </div>
          <p className={`${compact ? "mt-2 text-sm" : "mt-2.5 text-base"} truncate font-black leading-tight text-[#000B36] group-hover:text-[#A90117]`}>
            {player.name}
          </p>
          <p className="mt-1 text-[10px] font-bold text-[#000B36]/40">{numberText(player)} · {player.position || player.role}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`${compact ? "text-lg" : "text-xl"} font-black tabular-nums text-[#000B36]`}>{Number.isFinite(Number(player.overall)) ? player.overall : "—"}</p>
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#000B36]/30">OVR</p>
        </div>
      </div>
    </Link>
  );
}

function SectionHeading({ eyebrow, title, copy }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A90117]">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-black tracking-tight md:text-3xl">{title}</h2>
      {copy ? <p className="mt-2 text-sm font-semibold leading-6 text-[#000B36]/48">{copy}</p> : null}
    </div>
  );
}

function Unit({ label, items, team, columns = 3, roleLabels = [] }) {
  const grid = columns === 5
    ? "sm:grid-cols-5"
    : columns === 4
      ? "sm:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <div className="rounded-3xl border border-[#000B36]/10 bg-[#F7F9FC] p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#000B36]/60">{label}</h3>
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/28">{items.filter(Boolean).length} players</span>
      </div>
      <div className={`grid grid-cols-1 gap-2.5 ${grid}`}>
        {items.map((item, index) => (
          <PlayerCard key={item?.player?.id || `${label}-${index}`} item={item} team={team} roleLabel={roleLabels[index] || null} compact />
        ))}
      </div>
    </div>
  );
}

export default async function LineupPage({ params }) {
  const { slug } = await params;
  const { team, teams } = await getTeamBySlug(slug);
  if (!team) notFound();

  const { players, source } = await getPlayers();
  const rosterLookupName = fallbackTeams.find((candidate) => candidate.abbreviation === team.abbreviation)?.name || team.name;
  const rosterPlayers = players.filter((player) => player.currentTeam === rosterLookupName);
  const lineup = buildProjectedLineup(rosterPlayers);

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative isolate overflow-hidden bg-[#000724] text-white">
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 18% 10%, ${team.colors.primary}, transparent 38%)` }} />
        <div className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundColor: team.colors.primary }} />
        <div className="relative mx-auto max-w-7xl px-6 py-9 md:px-8 md:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/lineups" className="text-sm font-black text-white/55 transition hover:text-white">← All lineups</Link>
            <div className="w-full sm:w-72">
              <LineupTeamSwitcher teams={teams} activeSlug={team.slug} />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[1.8rem] border border-white/15 bg-white p-3 shadow-2xl md:h-36 md:w-36">
              <Image src={team.assets.logo} alt={`${team.name} logo`} width={700} height={700} className="h-full w-full object-contain" priority />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/70">{team.abbreviation}</span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100">Preview lineup</span>
              </div>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/60">{team.city}</p>
              <h1 className="mt-1 text-4xl font-black uppercase tracking-tight sm:text-5xl md:text-6xl">{team.nickname}</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55">
                Current lineup visualization generated from the live roster. Owner-saved lines and lineup editing can replace this projection later without changing the page structure.
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 md:w-56">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Dressed</p>
                <p className="mt-1 text-2xl font-black">{lineup.dressedCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Roster</p>
                <p className="mt-1 text-2xl font-black">{lineup.rosterCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <div className="mb-8 rounded-2xl border border-[#18BDFC]/20 bg-[#18BDFC]/8 px-4 py-3 text-xs font-bold leading-5 text-[#000B36]/60">
          <span className="font-black text-[#000B36]">Visualization stage:</span> the players below are automatically arranged from the {source === "live" ? "live" : source} roster using position and ratings. These are not yet owner-submitted official lines.
        </div>

        <section>
          <SectionHeading eyebrow="Even strength" title="Forward lines" copy="Four forward units with LW, C, and RW assignments." />
          <div className="mt-5 space-y-3">
            {lineup.forwardLines.map((line, index) => (
              <div key={`forward-${index}`} className="rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em]">Line {index + 1}</h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/28">LW · C · RW</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {line.map((item, playerIndex) => (
                    <PlayerCard key={item?.player?.id || `f-${index}-${playerIndex}`} item={item} team={team} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading eyebrow="Even strength" title="Defense pairs" copy="Three defensive pairings with left- and right-defense assignments." />
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {lineup.defensePairs.map((pair, index) => (
              <div key={`pair-${index}`} className="rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em]">Pair {index + 1}</h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/28">LD · RD</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {pair.map((item, playerIndex) => (
                    <PlayerCard key={item?.player?.id || `d-${index}-${playerIndex}`} item={item} team={team} compact />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading eyebrow="Crease" title="Goalies" copy="Starter and backup for the dressed lineup." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[0, 1].map((index) => (
              <PlayerCard
                key={lineup.goalies[index]?.player?.id || `goalie-${index}`}
                item={lineup.goalies[index] || null}
                team={team}
                roleLabel={index === 0 ? "Starter" : "Backup"}
              />
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-[#000B36]/10 pt-12">
          <SectionHeading eyebrow="Special teams" title="Power play & penalty kill" copy="Two units for each situation, using the same roster that feeds the simulator." />
          <div className="mt-5 grid gap-4">
            <Unit label="Power Play 1" items={lineup.specialTeams.pp1} team={team} columns={5} />
            <Unit label="Power Play 2" items={lineup.specialTeams.pp2} team={team} columns={5} />
            <Unit label="Penalty Kill 1" items={lineup.specialTeams.pk1} team={team} columns={4} />
            <Unit label="Penalty Kill 2" items={lineup.specialTeams.pk2} team={team} columns={4} />
          </div>
        </section>

        <section className="mt-14 border-t border-[#000B36]/10 pt-12">
          <SectionHeading eyebrow="Extra time" title="3-on-3 overtime" copy="Three rotating overtime groups: two forwards and one defenseman per unit." />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {lineup.overtimeUnits.map((unit, index) => (
              <Unit key={`ot-${index}`} label={`OT Unit ${index + 1}`} items={unit} team={team} columns={3} roleLabels={["F", "F", "D"]} />
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-[#000B36]/10 pt-12">
          <SectionHeading eyebrow="Shootout" title="First five shooters" copy="Displayed in shooting order." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {lineup.shootoutOrder.map((item, index) => (
              <div key={item.player.id} className="relative">
                <span className="absolute -left-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#A90117] text-xs font-black text-white shadow">{index + 1}</span>
                <PlayerCard item={item} team={team} roleLabel={`SO ${index + 1}`} compact />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-[#000B36]/10 pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Roster depth" title="Scratches" copy="Rostered players not included in the current 20-player dressed projection." />
            <Link href={`/teams/${team.slug}`} className="rounded-full bg-[#000B36] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#A90117]">
              Full team page →
            </Link>
          </div>
          {lineup.scratches.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lineup.scratches.map((player) => (
                <PlayerCard key={player.id} item={{ player, assignedPosition: player.position }} team={team} roleLabel="Scratch" compact />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-[#000B36]/15 bg-white p-6 text-sm font-bold text-[#000B36]/40">No additional rostered players.</div>
          )}
        </section>
      </div>
    </main>
  );
}
