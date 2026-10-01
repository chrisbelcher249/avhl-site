function statNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function mergeCareerStats(role, historicalCareer = {}, liveSeason = null) {
  if (role === "Goalie") {
    const shotsAgainst = statNumber(historicalCareer.sa) + statNumber(liveSeason?.shotsAgainst);
    const saves = statNumber(historicalCareer.sv) + statNumber(liveSeason?.saves);
    return {
      sa: shotsAgainst,
      sv: saves,
      svPct: shotsAgainst ? saves / shotsAgainst : 0,
    };
  }

  const goals = statNumber(historicalCareer.g) + statNumber(liveSeason?.goals);
  const assists = statNumber(historicalCareer.a) + statNumber(liveSeason?.assists);
  return {
    g: goals,
    a: assists,
    pts: goals + assists,
  };
}

export function mergePlayerCareer(player, seasonStats) {
  if (!player) return player;
  const liveSeason = player.role === "Goalie"
    ? seasonStats?.goalieById?.[player.id] || null
    : seasonStats?.skaterById?.[player.id] || null;
  return {
    ...player,
    career: mergeCareerStats(player.role, player.career, liveSeason),
  };
}
