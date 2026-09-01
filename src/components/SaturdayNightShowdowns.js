"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { teams } from "../../data/teams";

const INITIAL_GAME_COUNT = 6;

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export default function SaturdayNightShowdowns({ games }) {
  const [expanded, setExpanded] = useState(false);
  const teamBySlug = useMemo(() => Object.fromEntries(teams.map((team) => [team.slug, team])), []);
  const visibleGames = expanded ? games : games.slice(0, INITIAL_GAME_COUNT);
  const dateCount = new Set(games.map((game) => game.date)).size;

  return (
    <section className="mt-10 overflow-hidden rounded-[2rem] bg-[#000B36] text-white shadow-[0_18px_60px_rgba(0,11,54,0.16)]">
      <div className="relative overflow-hidden px-5 py-7 md:px-8 md:py-9">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_88%_12%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_8%_100%,rgba(169,1,23,0.34),transparent_35%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#A90117] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">Live games</span>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">2026–27 featured series</span>
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Saturday Night Showdowns</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/58 md:text-base">
              Featured Saturday matchups scheduled to be played live throughout the AVHL season, including two-game slates on April 3 and April 10.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
              <p className="text-2xl font-black">{games.length}</p>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Games</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
              <p className="text-2xl font-black">{dateCount}</p>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Saturdays</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/[0.035] p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleGames.map((game, index) => {
            const away = teamBySlug[game.away];
            const home = teamBySlug[game.home];
            return (
              <article key={`${game.date}-${game.away}-${game.home}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">{formatDate(game.date)}</p>
                  <span className="rounded-full border border-[#A90117]/80 bg-[#A90117]/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-100">Live</span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="min-w-0 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2">
                      <Image src={away.assets.logo} alt="" width={56} height={56} className="h-full w-full object-contain" />
                    </div>
                    <p className="mt-2 truncate text-xs font-black">{away.name}</p>
                  </div>
                  <span className="text-sm font-black text-white/35">@</span>
                  <div className="min-w-0 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2">
                      <Image src={home.assets.logo} alt="" width={56} height={56} className="h-full w-full object-contain" />
                    </div>
                    <p className="mt-2 truncate text-xs font-black">{home.name}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {games.length > INITIAL_GAME_COUNT ? (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="rounded-full border border-white/18 bg-white/[0.06] px-6 py-3 text-xs font-black uppercase tracking-wide transition hover:bg-white hover:text-[#000B36]"
            >
              {expanded ? "Show fewer" : `View all ${games.length} showdowns`}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
