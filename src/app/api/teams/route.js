import { getTeams, TEAM_BRANDING_SHEET_ID } from "../../../lib/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { teams, source, liveTeamCount } = await getTeams();
  return Response.json(
    {
      ok: true,
      source,
      sheetId: TEAM_BRANDING_SHEET_ID,
      teamCount: teams.length,
      liveTeamCount,
      teams,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
