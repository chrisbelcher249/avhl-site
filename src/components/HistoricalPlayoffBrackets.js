"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { playoffBrackets } from "../../data/playoffBrackets";
import { regularSeasonHistory } from "../../data/history";
import { teams } from "../../data/teams";

const majorByCode = Object.fromEntries(teams.map((team) => [team.abbreviation, team]));
const CARD_WIDTH = 206;
const ROUND_STEP = 232;
const HEADER_HEIGHT = 58;
const PLOT_HEIGHT = 650;
const SIDE_HEIGHT = HEADER_HEIGHT + PLOT_HEIGHT;

function identityFor(season, historicalName) {
  const row = regularSeasonHistory.find((item) => item.season === season && item.team === historicalName);
  const code = row?.franchiseCode || null;
  const current = code ? majorByCode[code] : null;
  return {
    code,
    logo: code ? `/logos/26_${code}_Logo.png` : null,
    href: current ? `/teams/${current.slug}` : null,
    currentName: current?.name || row?.currentFranchiseName || historicalName,
  };
}

function positionPercent(round, index) {
  const count = round.games.length;
  if (round.name === "Qualifier" && count === 2) return [12.5, 62.5][index];
  if (count === 4) return [12.5, 37.5, 62.5, 87.5][index];
  if (count === 2) return [25, 75][index];
  return 50;
}

function centerY(round, index) {
  return HEADER_HEIGHT + (positionPercent(round, index) / 100) * PLOT_HEIGHT;
}

function roundX(index, roundCount, mirror) {
  const totalWidth = (roundCount - 1) * ROUND_STEP + CARD_WIDTH;
  return mirror ? totalWidth - CARD_WIDTH - index * ROUND_STEP : index * ROUND_STEP;
}

function seedText(seed) {
  if (seed === null || seed === undefined || seed === "") return "";
  return String(seed);
}

function TeamRow({ season, entry, winner }) {
  const meta = identityFor(season, entry.team);
  const won = entry.team === winner;
  const content = (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition ${won ? "bg-[#E9FAFF] text-[#000B36]" : "text-[#000B36]/56"}`}>
      <span className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg px-1 text-[9px] font-black ${won ? "bg-[#000B36] text-white" : "bg-[#EEF1F6] text-[#000B36]/45"}`}>
        {seedText(entry.seed)}
      </span>
      {meta.logo ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-[#000B36]/8">
          <Image src={meta.logo} alt="" width={28} height={28} className="h-full w-full object-contain" />
        </span>
      ) : null}
      <span className={`min-w-0 flex-1 truncate text-[10px] leading-tight ${won ? "font-black" : "font-bold"}`}>{entry.team}</span>
      {Number.isFinite(entry.score) ? (
        <span className={`shrink-0 text-sm font-black tabular-nums ${won ? "text-[#A90117]" : "text-[#000B36]/35"}`}>{entry.score}</span>
      ) : null}
    </div>
  );

  if (!meta.href) return content;
  return (
    <Link href={meta.href} title={meta.currentName !== entry.team ? `Current franchise: ${meta.currentName}` : entry.team} className="block">
      {content}
    </Link>
  );
}

function MatchCard({ season, game }) {
  return (
    <div className="rounded-2xl border border-[#000B36]/10 bg-white p-1.5 shadow-sm ring-1 ring-white">
      <TeamRow season={season} entry={game.a} winner={game.winner} />
      <div className="mx-2 border-t border-[#000B36]/7" />
      <TeamRow season={season} entry={game.b} winner={game.winner} />
    </div>
  );
}

function BracketConnectors({ rounds, mirror }) {
  const roundCount = rounds.length;
  const width = (roundCount - 1) * ROUND_STEP + CARD_WIDTH;
  const paths = [];

  rounds.slice(0, -1).forEach((round, roundIndex) => {
    const nextRound = rounds[roundIndex + 1];
    round.games.forEach((game, gameIndex) => {
      const targetIndex = nextRound.games.findIndex((nextGame) => [nextGame.a.team, nextGame.b.team].includes(game.winner));
      if (targetIndex < 0) return;

      const currentX = roundX(roundIndex, roundCount, mirror);
      const targetX = roundX(roundIndex + 1, roundCount, mirror);
      const y1 = centerY(round, gameIndex);
      const y2 = centerY(nextRound, targetIndex);
      const x1 = mirror ? currentX : currentX + CARD_WIDTH;
      const x2 = mirror ? targetX + CARD_WIDTH : targetX;
      const midX = (x1 + x2) / 2;
      paths.push(`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`);
    });
  });

  return (
    <svg className="pointer-events-none absolute inset-0 z-0" width={width} height={SIDE_HEIGHT} viewBox={`0 0 ${width} ${SIDE_HEIGHT}`} aria-hidden="true">
      {paths.map((d, index) => (
        <path key={`${d}-${index}`} d={d} fill="none" stroke="rgba(0,11,54,0.20)" strokeWidth="1.4" />
      ))}
    </svg>
  );
}

function ConferenceSide({ season, conference, mirror = false }) {
  const rounds = conference.rounds;
  const width = (rounds.length - 1) * ROUND_STEP + CARD_WIDTH;

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-3" style={{ width }}>
        <span className="h-px flex-1 bg-[#000B36]/10" />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#000B36]/42">{conference.name}</p>
        <span className="h-px flex-1 bg-[#000B36]/10" />
      </div>
      <div className="relative" style={{ width, height: SIDE_HEIGHT }}>
        <BracketConnectors rounds={rounds} mirror={mirror} />
        {rounds.map((round, roundIndex) => {
          const x = roundX(roundIndex, rounds.length, mirror);
          return (
            <div key={round.name} className="absolute top-0 z-10" style={{ left: x, width: CARD_WIDTH, height: SIDE_HEIGHT }}>
              <div className="h-[58px] text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#A90117]">{round.name}</p>
                <p className="mt-1 text-[9px] font-bold text-[#000B36]/30">{round.games.length} {round.games.length === 1 ? "series" : "series"}</p>
              </div>
              <div className="relative" style={{ height: PLOT_HEIGHT }}>
                {round.games.map((game, gameIndex) => (
                  <div
                    key={`${round.name}-${gameIndex}-${game.a.team}-${game.b.team}`}
                    className="absolute left-0 w-full -translate-y-1/2"
                    style={{ top: `${positionPercent(round, gameIndex)}%` }}
                  >
                    <MatchCard season={season} game={game} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinalColumn({ bracket }) {
  const championMeta = identityFor(bracket.season, bracket.champion);
  return (
    <div className="flex h-[750px] w-[244px] shrink-0 items-center justify-center px-3 pt-8">
      <div className="w-full rounded-[1.75rem] bg-[#000B36] p-4 text-white shadow-xl ring-4 ring-[#18BDFC]/15">
        <p className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200">League Final</p>
        <div className="mt-3 rounded-2xl bg-white p-1.5 text-[#000B36]">
          <TeamRow season={bracket.season} entry={bracket.final.a} winner={bracket.final.winner} />
          <div className="mx-2 border-t border-[#000B36]/7" />
          <TeamRow season={bracket.season} entry={bracket.final.b} winner={bracket.final.winner} />
        </div>
        <div className="mt-5 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/42">Champion</p>
          {championMeta.logo ? (
            <div className="mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-2 shadow-lg">
              <Image src={championMeta.logo} alt="" width={80} height={80} className="h-full w-full object-contain" />
            </div>
          ) : null}
          <p className="mt-3 text-xl font-black leading-tight">{bracket.champion}</p>
        </div>
      </div>
    </div>
  );
}

function BracketBoard({ bracket }) {
  const westWidth = (bracket.west.rounds.length - 1) * ROUND_STEP + CARD_WIDTH;
  const eastWidth = (bracket.east.rounds.length - 1) * ROUND_STEP + CARD_WIDTH;
  const minWidth = westWidth + eastWidth + 268;

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-[#000B36]/10 bg-[#F7F9FC] shadow-sm">
      <div className="p-5 md:p-7" style={{ minWidth }}>
        <div className="grid items-start gap-3" style={{ gridTemplateColumns: `${westWidth}px 244px ${eastWidth}px` }}>
          <ConferenceSide season={bracket.season} conference={bracket.west} />
          <FinalColumn bracket={bracket} />
          <ConferenceSide season={bracket.season} conference={bracket.east} mirror />
        </div>
      </div>
    </div>
  );
}

export default function HistoricalPlayoffBrackets() {
  const [season, setSeason] = useState(playoffBrackets.at(-1)?.season || "2025-26");
  const bracket = useMemo(() => playoffBrackets.find((item) => item.season === season) || playoffBrackets[0], [season]);
  const scored = Number.isFinite(bracket.final.a.score) || Number.isFinite(bracket.final.b.score);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {playoffBrackets.map((item) => (
          <button
            key={item.season}
            type="button"
            onClick={() => setSeason(item.season)}
            className={`rounded-full px-5 py-2.5 text-xs font-black transition ${item.season === bracket.season ? "bg-[#000B36] text-white shadow-sm" : "border border-[#000B36]/10 bg-white text-[#000B36]/52 hover:border-[#18BDFC] hover:text-[#000B36]"}`}
          >
            {item.season.replace("-", "–")}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A90117]">{bracket.season.replace("-", "–")} postseason</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{bracket.champion} finished the run.</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#000B36]/52">{bracket.notes}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <span className="rounded-full bg-[#E9FAFF] px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]">{bracket.format}</span>
          <span className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${scored ? "bg-[#E9F8EF] text-[#176B3A]" : "bg-[#FFF4E7] text-[#9A5000]"}`}>
            {scored ? "Series scores preserved" : "Advancement only"}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <BracketBoard bracket={bracket} />
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-[#000B36]/38">
        Historical names and seeds are shown as they appeared that season. Team marks use the franchise artwork available in the current AVHL archive. Current Major League franchises are clickable.
      </p>
    </div>
  );
}
