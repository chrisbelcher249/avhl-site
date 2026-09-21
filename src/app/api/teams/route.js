import { getTeams, TEAM_BRANDING_SHEET_ID } from "../../../lib/teams";
import { getSchedule } from "../../../lib/schedule";
import { calculateStandings } from "../../../lib/standings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [teamResult, scheduleResult] = await Promise.all([getTeams(), getSchedule()]);
  const standings = calculateStandings(scheduleResult.schedule);
  const teams = teamResult.teams.map((team) => {
    const record = standings.records[team.slug];
    return {
      ...team,
      record: record ? {
        gp: record.gp,
        wins: record.wins,
        losses: record.losses,
        otl: record.otl,
        pts: record.pts,
      } : { gp: 0, wins: 0, losses: 0, otl: 0, pts: 0 },
    };
  });

  return Response.json(
    {
      ok: teamResult.source === "live",
      source: teamResult.source,
      endpoint: teamResult.endpoint,
      sheetId: TEAM_BRANDING_SHEET_ID,
      teamCount: teams.length,
      liveTeamCount: teamResult.liveTeamCount,
      errors: teamResult.errors,
      standingsSource: scheduleResult.source,
      standingsError: scheduleResult.error,
      teams,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
