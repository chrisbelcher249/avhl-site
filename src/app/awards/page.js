import Image from "next/image";
import Link from "next/link";
import { awardCategories } from "../../../data/awards";
import { teams } from "../../../data/teams";
import { minorTeams } from "../../../data/minorTeams";
import { getKnownPlayerIdByName } from "@/lib/playerHistory";

export const metadata = {
  title: "Awards",
  description: "AVHL award winners and team honors from 2022–23 through 2025–26.",
};

const allTeams = [...teams, ...minorTeams];
const majorTeamSlugs = new Set(teams.map((team) => team.slug));

function findTeam(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return allTeams.find((team) =>
    [team.name, team.nickname, team.abbreviation].some(
      (field) => String(field || "").trim().toLowerCase() === normalized
    )
  );
}

function PlayerName({ entry }) {
  const id = getKnownPlayerIdByName(entry.winner);
  if (id) {
    return (
      <Link href={`/players/${id}`} className="transition hover:text-[#A90117] hover:underline">
        {entry.winner}
      </Link>
    );
  }
  return entry.winner;
}

function TeamIdentity({ name }) {
  if (!name) return null;
  const team = findTeam(name);
  const fullName = team?.name || name;

  const identity = (
    <>
      <span className="min-w-0 text-right text-xs font-black leading-tight text-[#000B36]/58 md:text-sm">
        {fullName}
      </span>
      {team?.assets?.logo ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#000B36]/8 bg-[#F6F8FC] p-1.5 md:h-11 md:w-11">
          <Image
            src={team.assets.logo}
            alt={`${fullName} logo`}
            width={44}
            height={44}
            className="h-full w-full object-contain"
          />
        </span>
      ) : (
        <span className="h-10 w-10 shrink-0 md:h-11 md:w-11" aria-hidden="true" />
      )}
    </>
  );

  if (team && majorTeamSlugs.has(team.slug)) {
    return (
      <Link
        href={`/teams/${team.slug}`}
        className="flex w-full items-center justify-end gap-2.5 transition hover:text-[#A90117] md:gap-3"
      >
        {identity}
      </Link>
    );
  }

  return <div className="flex w-full items-center justify-end gap-2.5 md:gap-3">{identity}</div>;
}

function WinnerDetail({ award, entry }) {
  if (award.kind === "team") {
    if (!entry.detail) return null;
    return (
      <span className="inline-flex rounded-full bg-[#000B36] px-3 py-1.5 text-xs font-black text-white">
        {entry.detail}
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <div className="truncate text-base font-black md:text-lg">
        <PlayerName entry={entry} />
      </div>
      {entry.stat ? (
        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#A90117] md:text-xs">
          {entry.stat}
        </p>
      ) : null}
    </div>
  );
}

export default function AwardsPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="bg-[#000724] text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">AVHL Awards</p>
          <h1 className="mt-3 max-w-5xl text-5xl font-black tracking-tight md:text-7xl">The league&apos;s honors.</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/58 md:text-lg">
            Champions, individual award winners, scoring leaders, and regular-season honors from every completed AVHL season.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-3xl font-black">10</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Awards tracked</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-3xl font-black">4</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Completed seasons</p>
            </div>
            <Link href="/info/champions" className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 transition hover:bg-white/[0.1] sm:col-span-2 lg:col-span-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Championship archive</p>
              <p className="mt-2 text-lg font-black">See Stanley Cup rosters →</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          {awardCategories.map((award) => (
            <article key={award.slug} id={award.slug} className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
              <div className="border-b border-[#000B36]/8 px-6 py-6 md:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">AVHL honor</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{award.name}</h2>
                    <p className="mt-2 text-sm font-semibold text-[#000B36]/45">{award.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#F2F5FA] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-[#000B36]/40">
                    4 seasons
                  </span>
                </div>
              </div>

              <div>
                {award.winners.map((entry, index) => {
                  const teamName = award.kind === "team" ? entry.winner : entry.team;
                  return (
                    <div
                      key={`${award.slug}-${entry.season}`}
                      className={`grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-6 py-4 md:grid-cols-[88px_minmax(0,1fr)_230px] md:gap-x-4 md:px-7 ${index < award.winners.length - 1 ? "border-b border-[#000B36]/7" : ""}`}
                    >
                      <p className="text-xs font-black tabular-nums text-[#000B36]/38">{entry.season}</p>
                      <WinnerDetail award={award} entry={entry} />
                      <div className="col-start-2 min-w-0 md:col-start-3 md:row-start-1">
                        <TeamIdentity name={teamName} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
