import { getSchedule } from "@/lib/schedule";
import { getTeams } from "@/lib/teams";

export async function getOddsFuturesData() {
  const [{ schedule, error: scheduleError }, { teams }] = await Promise.all([getSchedule(), getTeams()]);
  return {
    schedule,
    scheduleError,
    teams: teams.map((team) => ({
      slug: team.slug,
      name: team.name,
      abbreviation: team.abbreviation,
      conference: team.conference,
      division: team.division,
      logo: team.assets?.logo || `/teams/${team.abbreviation}/logo.webp`,
    })),
  };
}
