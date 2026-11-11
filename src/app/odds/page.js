import Link from "next/link";
import OddsBoard from "@/components/OddsBoard";
import OddsNav from "@/components/OddsNav";
import { getSchedule } from "@/lib/schedule";
import { getTeams } from "@/lib/teams";
import { GET as getCurrentVerifiedV7Odds } from "@/app/api/odds/v7-current/route";

export const metadata = {
  title: "Odds",
  description: "AVHL model odds generated from current lineups, player ratings, and Monte Carlo score simulations.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

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

export default async function OddsPage({searchParams}) {
  const query=await searchParams;
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

  // Server-side verification: the initially selected matchup must arrive in
  // rendered HTML with REAL prices when its 1,000-game cache already exists.
  // Browser hydration, workers, IndexedDB and client network failures must
  // never be necessary to display previously completed V7 results.
  const requestedGame=games.find(game=>String(game.id)===String(query?.game??""));
  const initialDate=requestedGame?.date||dates[0]||"";
  const initialSlate=games.filter(game=>game.date===initialDate);
  const fetchedOdds=await Promise.all(initialSlate.map(async game=>{
    const away=teamDirectory[game.away]?.abbreviation;
    const home=teamDirectory[game.home]?.abbreviation;
    if(!away||!home)return [String(game.id),null];
    try{
      const request=new Request("https://avhl.org/api/odds/v7-current?away="+
        encodeURIComponent(away)+"&home="+encodeURIComponent(home));
      const response=await getCurrentVerifiedV7Odds(request);
      if(!response.ok)return [String(game.id),null];
      const value=await response.json();
      if(value.ok===true&&value.ready===true&&
        Number.isInteger(value.count)&&value.count>=1000&&
        value.summary?.source==="v7-complete-games"&&
        value.summary?.count===value.count&&
        value.summary.away===away&&value.summary.home===home){
        return [String(game.id),value];
      }
    }catch(error){
      console.error("Could not prefetch verified AVHL game odds",{
        gameId:game.id,reason:error instanceof Error?error.message:String(error)
      });
    }
    return [String(game.id),null];
  }));
  const verifiedGameOdds=Object.fromEntries(fetchedOdds.filter(([,value])=>value));
  // Lead with a valid V7-priced game when possible instead of a pending one.
  const initialSelectedGameId=requestedGame?.id||
    initialSlate.find(game=>verifiedGameOdds[String(game.id)])?.id||
    initialSlate[0]?.id||null;

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

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-8 md:py-10">
        <OddsNav />
        <div className="flex justify-end">
          <Link href="/odds/status" className="text-xs font-bold text-[#52647B] underline underline-offset-4 hover:text-[#000B36]">
            Track live odds calculations
          </Link>
        </div>
        <Link href="/odds/season" className="group block rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm transition hover:border-[#18BDFC] hover:shadow-md md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#A90117]">Full-season futures</p>
              <h2 className="mt-1 text-xl font-black text-[#000B36]">Win totals, playoffs, divisions, Cup and relegation</h2>
              <p className="mt-2 text-sm text-[#65748B]">All 40 teams, 10,000 season scenarios, 20 playoff spots and three relegation places.</p>
            </div>
            <span className="rounded-xl bg-[#000B36] px-4 py-3 text-xs font-black text-white transition group-hover:bg-[#A90117]">Explore season markets →</span>
          </div>
        </Link>
        {scheduleError ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{scheduleError}</div>
        ) : null}
        {games.length ? (
          <OddsBoard games={games} dates={dates} teamDirectory={teamDirectory} initialDate={initialDate}
            initialSelectedGameId={initialSelectedGameId} verifiedGameOdds={verifiedGameOdds}
            previewOnly={process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production"} />
        ) : (
          <div className="rounded-3xl border border-[#000B36]/10 bg-white p-8 text-center shadow-sm">
            <p className="text-xl font-black">No upcoming games are available to price.</p>
          </div>
        )}
      </div>
    </main>
  );
}
