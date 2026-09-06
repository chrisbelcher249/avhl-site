import Image from "next/image";
import Link from "next/link";
import { champions } from "../../../data/champions";
import { teams } from "../../../data/teams";
import { minorTeams } from "../../../data/minorTeams";
import { getKnownPlayerIdByName } from "@/lib/playerHistory";

export const metadata = {
  title: "Champions",
  description: "AVHL champions and championship rosters from 2022–23 through 2025–26.",
};


function PlayerLink({ name, className = "" }) {
  const id = getKnownPlayerIdByName(name);
  if (!id) return <span className={className}>{name}</span>;
  return <Link href={`/players/${id}`} className={`${className} transition hover:text-[#A90117] hover:underline`}>{name}</Link>;
}

function initials(teamName) {
  return teamName.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

export default function ChampionsPage() {
  return (
    <main className="bg-[#F4F7FB] text-[#000B36]">
      <section className="bg-[#000724] text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20">
          <Link href="/history" className="text-sm font-black text-white/55 transition hover:text-white">← League history</Link>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-cyan-200">AVHL champions</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">The title history.</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/58 md:text-lg">
            Every AVHL champion from the league’s first four seasons, together with the 20-player roster that finished the championship run.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {champions.map((champion) => (
              <div key={champion.season} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">{champion.season}</p>
                <p className="mt-2 text-xl font-black leading-tight">{champion.team}</p>
                <p className="mt-3 text-xs font-bold text-white/40">AVHL Champion</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="grid gap-8">
          {champions.map((champion) => {
            const majorTeam = teams.find((team) => team.name === champion.team);
            const currentTeam = majorTeam || minorTeams.find((team) => team.name === champion.team);
            const captain = champion.roster.find((player) => player.captain);
            return (
              <article key={champion.season} className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[0.35fr_0.65fr]">
                  <div className="bg-[#000B36] p-6 text-white md:p-8">
                    <div className="flex items-center gap-5">
                      {currentTeam ? (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white p-3">
                          <Image src={currentTeam.assets.logo} alt="" width={96} height={96} className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-2xl font-black tracking-tight">
                          {initials(champion.team)}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{champion.season} Champion</p>
                        <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">{champion.team}</h2>
                      </div>
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Captain</p>
                        <div className="mt-1 text-lg font-black">{captain ? <PlayerLink name={captain.name} className="text-white hover:!text-cyan-200" /> : "—"}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Roster</p>
                        <p className="mt-1 text-lg font-black">{champion.roster.length} players</p>
                      </div>
                    </div>
                    {majorTeam ? (
                      <Link href={`/teams/${majorTeam.slug}`} className="mt-7 inline-flex rounded-full border border-white/20 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white hover:text-[#000B36]">
                        Current team profile
                      </Link>
                    ) : null}
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">Championship roster</p>
                        <h3 className="mt-1 text-2xl font-black">The 20</h3>
                      </div>
                      <span className="rounded-full bg-[#F2F5FA] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-[#000B36]/45">C = Captain</span>
                    </div>
                    <ol className="mt-6 grid gap-x-7 gap-y-1 sm:grid-cols-2">
                      {champion.roster.map((player, index) => (
                        <li key={player.name} className="flex items-center gap-3 border-b border-[#000B36]/7 py-2.5">
                          <span className="w-6 shrink-0 text-right text-[10px] font-black tabular-nums text-[#000B36]/30">{index + 1}</span>
                          <PlayerLink name={player.name} className={`flex-1 text-sm ${player.captain ? "font-black" : "font-bold text-[#000B36]/72"}`} />
                          {player.captain ? <span className="rounded-full bg-[#A90117] px-2 py-1 text-[9px] font-black text-white">C</span> : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
