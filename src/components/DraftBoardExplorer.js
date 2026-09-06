"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { teams, teamByAbbreviation } from "../../data/teams";

const YEARS = [2027, 2028];
const ROUND_LABELS = { 1: "1st", 2: "2nd", 3: "3rd" };

function hexToRgb(hex) {
  const clean = String(hex || "#000B36").replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean.padEnd(6, "0");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) || 0,
    g: Number.parseInt(normalized.slice(2, 4), 16) || 0,
    b: Number.parseInt(normalized.slice(4, 6), 16) || 0,
  };
}

function teamTextColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165 ? "#000B36" : "#FFFFFF";
}

function DraftPickChip({ pick, owner }) {
  const original = teamByAbbreviation[pick.originalTeamAbbreviation] || pick.originalTeam;
  const ownPick = pick.originalTeamAbbreviation === owner.abbreviation;
  const roundLabel = ROUND_LABELS[pick.round] || `R${pick.round}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#000B36]/10 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: original?.colors?.primary || "#18BDFC" }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 pl-1">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F2F5FA] p-1.5">
          <Image
            src={original?.assets?.logo || "/avhl-logo.png"}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-black text-[#000B36]">
              {ownPick ? `Own ${roundLabel}` : `${original?.abbreviation || pick.originalTeamAbbreviation} ${roundLabel}`}
            </p>
            <span className="shrink-0 rounded-full bg-[#000B36] px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">
              R{pick.round}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] font-bold text-[#000B36]/45">
            {ownPick ? original?.name : `via ${original?.name}`}
          </p>
        </div>
      </div>
      {!ownPick ? (
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#000B36]/7 pt-2.5 pl-1">
          <span className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-[#A90117]">
            Traded {pick.timesTraded || 1}×
          </span>
          <span className="truncate text-[10px] font-bold text-[#000B36]/38" title={pick.ownershipHistory}>
            {pick.ownershipHistory}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function TeamDraftCard({ team, picks }) {
  const headerText = teamTextColor(team.colors.primary);
  const firsts = picks.filter((pick) => pick.round === 1).length;
  const acquired = picks.filter((pick) => pick.originalTeamAbbreviation !== team.abbreviation).length;

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-[#000B36]/10 bg-[#F7F9FC] shadow-sm">
      <div
        className="relative overflow-hidden px-5 py-4"
        style={{ color: headerText, backgroundColor: team.colors.primary }}
      >
        <div
          className="absolute -right-8 -top-12 h-32 w-32 rounded-full opacity-20"
          style={{ backgroundColor: team.colors.secondary || "#FFFFFF" }}
          aria-hidden="true"
        />
        <div className="absolute -bottom-14 right-20 h-28 w-28 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <Link href={`/teams/${team.slug}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-lg">
              <Image src={team.assets.logo} alt="" width={100} height={100} className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black leading-tight">{team.name}</span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.15em] opacity-70">
                {picks.length} picks · {firsts} first{firsts === 1 ? "" : "s"}
              </span>
            </span>
          </Link>
          <span className="rounded-full border border-current/25 bg-black/10 px-2.5 py-1 text-xs font-black">{team.abbreviation}</span>
        </div>
      </div>

      <div className="p-4">
        {picks.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {picks.map((pick) => <DraftPickChip key={pick.id} pick={pick} owner={team} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#000B36]/15 bg-white p-5 text-center text-xs font-black uppercase tracking-[0.1em] text-[#000B36]/35">
            No picks held
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-[#000B36]/8 pt-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/38">
          <span>{acquired} acquired</span>
          <span>{picks.length - acquired} original</span>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({ eyebrow, value, copy, accent = "#18BDFC" }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} aria-hidden="true" />
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">{eyebrow}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-[#000B36]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#000B36]/43">{copy}</p>
    </div>
  );
}

export default function DraftBoardExplorer({ picks }) {
  const [year, setYear] = useState(2027);
  const [round, setRound] = useState("all");
  const [query, setQuery] = useState("");
  const [ownership, setOwnership] = useState("all");

  const yearPicks = useMemo(() => picks.filter((pick) => pick.year === year), [picks, year]);

  const summary = useMemo(() => {
    const traded = yearPicks.filter((pick) => pick.originalTeamAbbreviation !== pick.ownerAbbreviation);
    const firstsMoved = traded.filter((pick) => pick.round === 1).length;
    const countByOwner = new Map();
    for (const pick of yearPicks) countByOwner.set(pick.ownerAbbreviation, (countByOwner.get(pick.ownerAbbreviation) || 0) + 1);
    const leader = [...countByOwner.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const leaderTeam = leader ? teamByAbbreviation[leader[0]] : null;
    return {
      total: yearPicks.length,
      traded: traded.length,
      firstsMoved,
      leader: leaderTeam ? `${leaderTeam.abbreviation} · ${leader[1]}` : "—",
      leaderName: leaderTeam?.name || "No data",
    };
  }, [yearPicks]);

  const cards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const visible = teams.map((team) => {
      let teamPicks = yearPicks.filter((pick) => pick.ownerAbbreviation === team.abbreviation);
      if (round !== "all") teamPicks = teamPicks.filter((pick) => pick.round === Number(round));
      if (ownership === "traded") teamPicks = teamPicks.filter((pick) => pick.originalTeamAbbreviation !== team.abbreviation);
      if (ownership === "original") teamPicks = teamPicks.filter((pick) => pick.originalTeamAbbreviation === team.abbreviation);

      return { team, picks: teamPicks };
    });

    return visible
      .filter(({ team, picks: teamPicks }) => {
        if (!normalized) return teamPicks.length > 0 || (round === "all" && ownership === "all");
        const ownerMatch = `${team.name} ${team.abbreviation}`.toLowerCase().includes(normalized);
        const pickMatch = teamPicks.some((pick) => {
          const original = teamByAbbreviation[pick.originalTeamAbbreviation] || pick.originalTeam;
          return `${original?.name || ""} ${pick.originalTeamAbbreviation} ${pick.ownershipHistory || ""}`.toLowerCase().includes(normalized);
        });
        return ownerMatch || pickMatch;
      })
      .sort((a, b) => b.picks.length - a.picks.length || a.team.name.localeCompare(b.team.name));
  }, [yearPicks, round, query, ownership]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard eyebrow={`${year} draft`} value={summary.total} copy="league picks tracked" />
        <SummaryCard eyebrow="Changed hands" value={summary.traded} copy="picks owned by another club" accent="#A90117" />
        <SummaryCard eyebrow="1st-round movement" value={summary.firstsMoved} copy="first-round picks traded" accent="#F59E0B" />
        <SummaryCard eyebrow="Largest portfolio" value={summary.leader} copy={summary.leaderName} accent="#000B36" />
      </div>

      <div className="mt-7 rounded-[1.75rem] border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full rounded-full bg-[#EEF2F7] p-1 xl:w-auto">
            {YEARS.map((value) => (
              <button
                key={value}
                onClick={() => setYear(value)}
                className={`flex-1 rounded-full px-6 py-2.5 text-sm font-black transition xl:flex-none ${year === value ? "bg-[#000B36] text-white shadow" : "text-[#000B36]/50 hover:text-[#000B36]"}`}
              >
                {value} Draft
              </button>
            ))}
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-3 xl:max-w-4xl">
            <label className="relative block sm:col-span-1">
              <span className="sr-only">Search draft capital</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team or pick…"
                className="h-11 w-full rounded-full border border-[#000B36]/10 bg-[#F7F9FC] px-4 text-sm font-bold outline-none transition placeholder:text-[#000B36]/28 focus:border-[#18BDFC] focus:bg-white"
              />
            </label>
            <select
              value={round}
              onChange={(event) => setRound(event.target.value)}
              className="h-11 rounded-full border border-[#000B36]/10 bg-[#F7F9FC] px-4 text-sm font-black text-[#000B36] outline-none focus:border-[#18BDFC]"
            >
              <option value="all">All rounds</option>
              <option value="1">1st round</option>
              <option value="2">2nd round</option>
              <option value="3">3rd round</option>
            </select>
            <select
              value={ownership}
              onChange={(event) => setOwnership(event.target.value)}
              className="h-11 rounded-full border border-[#000B36]/10 bg-[#F7F9FC] px-4 text-sm font-black text-[#000B36] outline-none focus:border-[#18BDFC]"
            >
              <option value="all">All ownership</option>
              <option value="traded">Acquired picks only</option>
              <option value="original">Original picks only</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#000B36]/8 pt-4">
          <p className="text-xs font-bold text-[#000B36]/40">
            Showing <span className="font-black text-[#000B36]">{cards.length}</span> team portfolios · live current ownership
          </p>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/38">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live pick tracker
          </div>
        </div>
      </div>

      {cards.length ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ team, picks: teamPicks }) => (
            <TeamDraftCard key={team.abbreviation} team={team} picks={teamPicks} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[2rem] border border-dashed border-[#000B36]/15 bg-white px-6 py-16 text-center">
          <p className="text-2xl font-black">No draft assets match those filters.</p>
          <p className="mt-2 text-sm font-semibold text-[#000B36]/45">Try another team, round, or ownership filter.</p>
        </div>
      )}
    </>
  );
}
