import OddsBoard from "@/components/OddsBoard";
import { getSchedule } from "@/lib/schedule";
import { getTeams } from "@/lib/teams";

export const metadata = {
  title: "Odds",
  description: "AVHL model odds generated from current lineups, player ratings, and Monte Carlo score simulations.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function easternDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function OddsPage() {
  const [{ schedule, error: scheduleError }, { teams }] = await Promise.all([getSchedule(), getTeams()]);
  const today = easternDateKey();
  const futureUnplayed = schedule.filter((game) => game.awayScore == null && game.homeScore == null && game.date >= today);
  const fallbackUnplayed = schedule.filter((game) => game.awayScore == null && game.homeScore == null);
  const candidateGames = futureUnplayed.length ? futureUnplayed : fallbackUnplayed;
  const allDates = [...new Set(candidateGames.map((game) => game.date))].sort();
  const dates = allDates.slice(0, 21);
  const allowedDates = new Set(dates);
  const games = candidateGames
    .filter((game) => allowedDates.has(game.date))
    .map((game) => ({
      id: game.id,
      date: game.date,
      away: game.away,
      home: game.home,
    }));

  const teamDirectory = Object.fromEntries(
    teams.map((team) => [
      team.slug,
      {
        slug: team.slug,
        name: team.name,
        abbreviation: team.abbreviation,
        logo: team.assets?.logo || `/teams/${team.abbreviation}/logo.webp`,
      },
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50 text-[#000B36]">
      <section className="bg-[#000B36] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">AVHL Model · 2026–27</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Odds</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 md:text-lg">
            Matchup probabilities generated from the same live rosters and active lineups that feed the AVHL simulator, then converted into fair model lines.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        {scheduleError ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{scheduleError}</div>
        ) : null}
        {games.length ? (
          <OddsBoard games={games} dates={dates} teamDirectory={teamDirectory} initialDate={dates[0]} />
        ) : (
          <div className="rounded-3xl border border-[#000B36]/10 bg-white p-8 text-center shadow-sm">
            <p className="text-xl font-black">No upcoming games are available to price.</p>
          </div>
        )}
      </div>
    </main>
  );
}
