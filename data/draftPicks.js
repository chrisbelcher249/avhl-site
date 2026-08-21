import { teamBySlug, teams } from "./teams";

export const draftPickYears = [2027, 2028];
export const draftPickRounds = [1, 2, 3];

// Add future trades here as "YEAR-ROUND-ORIGINAL_TEAM_SLUG": "NEW_OWNER_SLUG".
// Example: "2027-1-arizona-heat": "denver-mountain-lions"
export const draftPickOwnershipOverrides = {};

export const draftPicks = teams.flatMap((originalTeam) =>
  draftPickYears.flatMap((year) =>
    draftPickRounds.map((round) => {
      const id = `${year}-${round}-${originalTeam.slug}`;
      const ownerSlug = draftPickOwnershipOverrides[id] || originalTeam.slug;
      return {
        id,
        year,
        round,
        originalTeamSlug: originalTeam.slug,
        ownerSlug,
      };
    })
  )
);

export function getDraftPicksForTeam(teamSlug) {
  return draftPicks
    .filter((pick) => pick.ownerSlug === teamSlug)
    .map((pick) => ({
      ...pick,
      originalTeam: teamBySlug[pick.originalTeamSlug],
      ownerTeam: teamBySlug[pick.ownerSlug],
    }))
    .sort((a, b) => a.year - b.year || a.round - b.round || a.originalTeam.name.localeCompare(b.originalTeam.name));
}
