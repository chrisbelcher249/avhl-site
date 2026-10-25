import Link from "next/link";
import InjuriesTable from "@/components/InjuriesTable";
import { getPlayers } from "@/lib/players";
import { getCurrentInjuryState } from "@/lib/injuries";
import { teams } from "../../../data/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Injuries",
  description: "Current AVHL injuries, games remaining and expected return dates for the 2026–27 season.",
};

const teamByAbbreviation = Object.fromEntries(teams.map((team) => [team.abbreviation, team]));

export default async function InjuriesPage() {
  const { players, source: rosterSource } = await getPlayers();
  const state = await getCurrentInjuryState(players);
  const cannotPlay = Object.values(state.readiness || {}).filter((team) => !team.canPlay);
  const byPlayerId = new Map(players.map((player) => [String(player.id), player]));
  const injuries = state.active.map((injury) => {
    const rating = byPlayerId.get(String(injury.playerId))?.overall;
    return { ...injury, overall: rating == null || !Number.isFinite(Number(rating)) ? null : Number(rating) };
  });
  const filterTeams = teams.map((team) => ({ abbreviation: team.abbreviation, name: team.name, slug: team.slug, logo: team.assets?.logo || null }));

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="border-b border-[#000B36]/8 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#A90117]">2026–27 Season</p>
          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Injuries</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#000B36]/52">
                Active injuries automatically lock players out of owner lineups and the simulator. Games remaining count down from each team&apos;s official schedule.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-[#000B36]/10 bg-[#F4F7FB] px-4 py-2 text-xs font-black">
                Active Injuries <span className="ml-1.5 tabular-nums">{state.active.length}</span>
              </div>
              <div className={`rounded-full border px-4 py-2 text-xs font-black ${cannotPlay.length ? "border-[#A90117]/25 bg-[#A90117]/8 text-[#8A0012]" : "border-emerald-700/15 bg-emerald-600/8 text-emerald-800"}`}>
                Teams That Cannot Play <span className="ml-1.5 tabular-nums">{cannotPlay.length}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8 md:px-8 md:py-10">
        {!state.storage?.configured ? (
          <div className="mb-6 rounded-2xl border border-[#A90117]/25 bg-[#A90117]/8 px-4 py-3 text-sm font-bold text-[#7A0010]">
            Persistent injury storage is not configured, so official injuries cannot be tracked safely.
          </div>
        ) : null}
        {rosterSource !== "live" ? (
          <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm font-bold text-amber-950">
            The live roster feed is temporarily unavailable. Injury eligibility may be incomplete until it returns.
          </div>
        ) : null}
        {state.scheduleError ? (
          <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm font-bold text-amber-950">
            {state.scheduleError}
          </div>
        ) : null}

        {cannotPlay.length ? (
          <section className="mb-7 rounded-2xl border border-[#A90117]/20 bg-white p-4 shadow-sm md:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">Needs commissioner attention</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {cannotPlay.map((status) => {
                const team = teamByAbbreviation[status.abbreviation];
                return (
                  <Link key={status.abbreviation} href={team ? `/teams/${team.slug}/lineup` : "/lineup"} className="rounded-xl border border-[#A90117]/10 bg-[#A90117]/5 px-3.5 py-3 transition hover:border-[#A90117]/25">
                    <span className="text-sm font-black">{status.teamName}</span>
                    <span className="mt-1 block text-[11px] font-bold leading-4 text-[#7A0010]/75">{status.reasons.join("; ")}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <InjuriesTable injuries={injuries} teams={filterTeams} />
      </div>
    </main>
  );
}
