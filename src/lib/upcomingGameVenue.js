// Each matchup is played at its HOME club's arena, using the live
// Team Specifications rows already loaded for the team page.
export function upcomingGameVenue(game, liveTeamsBySlug) {
  return liveTeamsBySlug[game.home]?.arena || "Venue TBD";
}
