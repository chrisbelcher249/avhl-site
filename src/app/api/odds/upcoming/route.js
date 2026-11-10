import { getSchedule } from "@/lib/schedule";
import { teams } from "../../../../../data/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function easternDate(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// Public read-only manifest. The scheduled batch job uses the SAME live
// schedule as the odds page, with no demo/bundled schedule fallbacks.
export async function GET() {
  try {
    const { schedule, source, error } = await getSchedule();
    if (source !== "live" || error) {
      return Response.json({ ok: false, error: "The official live schedule/results are unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const now = new Date();
    const today = easternDate(now);
    const end = easternDate(new Date(now.getTime() + 48 * 60 * 60 * 1000));
    const bySlug = Object.fromEntries(teams.map(team => [team.slug, team.abbreviation]));
    const upcoming = schedule
      .filter(game => game.awayScore == null && game.homeScore == null && game.date >= today && game.date <= end)
      .map(game => ({
        id: game.id, date: game.date,
        away: bySlug[game.away], home: bySlug[game.home],
      }));
    if (upcoming.some(game => !game.away || !game.home || game.away === game.home)) {
      throw new Error("Upcoming live schedule has an unknown team or invalid matchup.");
    }
    return Response.json({
      ok: true, source: "live", today, end,
      matchups: upcoming.slice(0, 32),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to prepare upcoming V7 odds precompute manifest", error);
    return Response.json({ ok: false, error: "Cannot verify the upcoming game list." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
