// Derive goalie shutouts from the existing Team Stats and Goalie Stats sheets.
// No simulator box-score fields or new spreadsheet columns are required.
//
// A club can earn a combined shutout, but individual goalie SO credit requires
// exactly one goalie to have played in that game. Shootout deciding goals are
// included in team final scores, not in goalie GA, so remove the shootout
// decision goal when determining whether the team allowed any actual goals.
export function calculateGoalieShutouts(teamGameRows, goalieGameRows) {
  const teamGames = new Map();
  for (const row of teamGameRows) {
    if (!Number.isInteger(row.gameId) || row.gameId <= 0 || !row.team) continue;
    // Same convention as season stat aggregation: last duplicate row wins.
    teamGames.set(`${row.gameId}:${row.team}`, row);
  }

  const goaliesByGame = new Map();
  for (const row of goalieGameRows) {
    if (!Number.isInteger(row.gameId) || row.gameId <= 0 || !row.team || !row.playerId) continue;
    const key = `${row.gameId}:${row.team}`;
    if (!goaliesByGame.has(key)) goaliesByGame.set(key, new Map());
    goaliesByGame.get(key).set(row.playerId, row);
  }

  const shutouts = new Map();
  for (const [key, teamRow] of teamGames) {
    if (!["W", "L"].includes(teamRow.result)) continue; // No unfinished games.
    const { score, oppScore, finish } = teamRow;
    if (!Number.isFinite(score) || !Number.isFinite(oppScore)) continue;
    if (finish === "SO" && Math.abs(score - oppScore) !== 1) continue;

    // A shootout loser has one artificial GA in the team final score.
    // A shootout winner has none; the artificial goal is in their GF.
    const playedGoalsAgainst = oppScore - (finish === "SO" && teamRow.result === "L" ? 1 : 0);
    if (playedGoalsAgainst !== 0) continue;

    const participants = [...(goaliesByGame.get(key)?.values() || [])]
      .filter((row) => Number(row.toi) > 0);
    if (participants.length !== 1) continue; // No individual combined SO credit.

    const goalie = participants[0];
    if (Number(goalie.goalsAgainst) !== 0) continue;
    shutouts.set(goalie.playerId, (shutouts.get(goalie.playerId) || 0) + 1);
  }
  return shutouts;
}
