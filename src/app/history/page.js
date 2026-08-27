import Link from "next/link";
import HistoryExplorer from "@/components/HistoryExplorer";
import HistoryGamesExplorer from "@/components/HistoryGamesExplorer";
import { franchiseLineage, historySeasons, historySummary, regularSeasonHistory } from "../../../data/history";

export const metadata = {
  title: "History",
  description: "Explore AVHL regular-season history from 2022–23 through 2025–26, including historical standings and franchise lineage.",
};

function seasonLeader(season) {
  return [...regularSeasonHistory]
    .filter((row) => row.season === season)
    .sort((a, b) => b.pts - a.pts || b.rw - a.rw || b.gd - a.gd || b.gf - a.gf || b.w - a.w)[0];
}

export default function HistoryPage() {
  const leaders = historySeasons.map((season) => [season, seasonLeader(season)]);

  return (
    <main className="bg-[#F4F7FB] text-[#000B36]">
      <section className="bg-[#000724] text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">League archive</p>
              <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Regular-season history.</h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/58 md:text-lg">
                Four seasons of reconstructed AVHL team results, preserving the team names used at the time while following each franchise through a stable franchise code.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#historical-games" className="inline-flex w-fit rounded-full bg-[#18BDFC] px-6 py-3 text-sm font-black uppercase tracking-wide text-[#000B36] transition hover:bg-cyan-200">
                Browse games
              </a>
              <Link href="/champions" className="inline-flex w-fit rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-[#000B36] transition hover:bg-cyan-100">
                View champions
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ["Seasons", historySummary.seasons.toLocaleString()],
              ["Historical games", historySummary.games.toLocaleString()],
              ["Team-seasons", historySummary.teamSeasons.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">{label}</p>
                <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Season leaders</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Best regular-season records</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">The highest point total in each completed AVHL regular season.</p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {leaders.map(([season, leader]) => (
            <div key={season} className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">{season}</p>
              <h3 className="mt-2 text-xl font-black leading-tight">{leader.team}</h3>
              <p className="mt-4 text-4xl font-black tabular-nums">{leader.pts} <span className="text-sm text-[#000B36]/35">PTS</span></p>
              <p className="mt-1 text-xs font-bold text-[#000B36]/42">{leader.w}-{leader.l}-{leader.otl} · {leader.rw} RW · {leader.gd > 0 ? "+" : ""}{leader.gd} GD</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#000B36]/8 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Historical standings</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Every completed season</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">Select a season, search a club, or sort any statistic. Historical names remain attached to the season in which they were used.</p>
          </div>
          <div className="mt-7">
            <HistoryExplorer seasons={historySeasons} rows={regularSeasonHistory} />
          </div>
        </div>
      </section>

      <section id="historical-games" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-12 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Historical games</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Every regular-season result.</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">Browse all 6,608 completed regular-season games from 2022–23 through 2025–26. Filter by season, team, opponent, or the date recorded in the historical source.</p>
        </div>
        <div className="mt-7">
          <HistoryGamesExplorer seasons={historySeasons} expectedCount={historySummary.games} />
        </div>
      </section>

      <section className="border-t border-[#000B36]/8 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Franchise lineage</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Names change. Franchises continue.</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">Historical results stay with the same franchise when a club relocates or changes its identity.</p>
        </div>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {franchiseLineage.map((item) => (
            <div key={`${item.franchiseCode}-${item.historicalTeamName}`} className="rounded-3xl border border-[#000B36]/10 bg-[#F8FAFD] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">Franchise {item.franchiseCode}</p>
              <p className="mt-3 text-lg font-black">{item.historicalTeamName}</p>
              <p className="my-2 text-sm font-black text-[#18BDFC]">↓</p>
              <p className="text-lg font-black">{item.currentFranchiseName}</p>
              <p className="mt-3 text-xs font-semibold leading-5 text-[#000B36]/46">{item.notes}</p>
            </div>
          ))}
          </div>
        </div>
      </section>
    </main>
  );
}
