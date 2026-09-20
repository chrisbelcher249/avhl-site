import Link from "next/link";
import Image from "next/image";
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

function formatDate(value) {
  if (!value) return "After season";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export default async function InjuriesPage() {
  const { players, source: rosterSource } = await getPlayers();
  const state = await getCurrentInjuryState(players);
  const cannotPlay = Object.values(state.readiness || {}).filter((team) => !team.canPlay);

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

        <section className="overflow-hidden rounded-2xl border border-[#000B36]/10 bg-white shadow-sm">
          {state.active.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-[#000B36] text-white">
                  <tr className="text-[10px] font-black uppercase tracking-[0.13em]">
                    <th className="px-4 py-3.5">Team</th>
                    <th className="px-4 py-3.5">Player</th>
                    <th className="px-4 py-3.5">Injury</th>
                    <th className="px-4 py-3.5 text-center">Games Remaining</th>
                    <th className="px-4 py-3.5">Expected Return</th>
                  </tr>
                </thead>
                <tbody>
                  {state.active.map((injury) => {
                    const team = teamByAbbreviation[injury.teamAbbreviation];
                    return (
                      <tr key={injury.storageKey || `${injury.officialGameId}:${injury.playerId}`} className="border-b border-[#000B36]/7 last:border-b-0">
                        <td className="px-4 py-3.5">
                          <Link href={team ? `/teams/${team.slug}` : "/teams"} className="flex items-center gap-2.5 font-black hover:text-[#A90117]">
                            {team?.assets?.logo ? <Image src={team.assets.logo} alt="" width={30} height={30} className="h-7 w-7 object-contain" /> : null}
                            <span>{injury.teamAbbreviation}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link href={`/players/${injury.playerId}`} className="font-black hover:text-[#A90117]">{injury.playerName}</Link>
                          <span className="mt-0.5 block text-[10px] font-bold text-[#000B36]/40">{injury.position || "—"}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-bold">{injury.injuryType}</td>
                        <td className="px-4 py-3.5 text-center text-lg font-black tabular-nums">{injury.gamesRemaining}</td>
                        <td className="px-4 py-3.5 text-sm font-black">{formatDate(injury.expectedReturnDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="text-xl font-black">No active injuries.</p>
              <p className="mt-2 text-sm font-semibold text-[#000B36]/45">Official simulator injuries will appear here as soon as a game is saved.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
