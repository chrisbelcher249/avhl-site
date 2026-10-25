import { normalizePlayerId } from "./seasonSheets.js";

// NHL goalie-of-record rule: each team credits the goalie in net at the
// game-winning goal (or, for a shootout, the goalie in net for the shootout).
// Do not conflate starters, relief appearances and goalie decisions.
// This operates on the VERIFIED, immutable replay snapshot used by official saves.
export function goalieDecisionsFromReplay(packet, snapshot) {
  const sides = [packet?.away, packet?.home];
  if (!snapshot || !Array.isArray(snapshot.events) || sides.some((side) => !side?.id)) {
    throw new Error("Complete verified replay events are required to credit goalie decisions.");
  }
  const away = packet.away, home = packet.home;
  const winner = Number(away.score) > Number(home.score) ? away : home;
  const loser = winner === away ? home : away;
  const finish = String(packet.finish || "REG").toUpperCase();
  const active = {};
  const idsBySimId = {};
  for (const team of sides) {
    const goalieRows = packet.summary?.goalieRows?.[team.id] || [];
    const starter = goalieRows.find((row) => row.starter);
    if (!starter || goalieRows.filter((row) => row.starter).length !== 1) {
      throw new Error(`Expected exactly one starting goalie for ${team.abbreviation}`);
    }
    active[team.id] = starter.id;
    idsBySimId[starter.id] = normalizePlayerId(starter.avhlId || starter.id);
    for (const goalie of goalieRows) idsBySimId[goalie.id] = normalizePlayerId(goalie.avhlId || goalie.id);
  }

  let decisionGoalIndex = -1;
  if (finish !== "SO") {
    // GWG is the winning team's (losing final score + 1)th goal.
    const winnerGoals = snapshot.events.filter((event) => event.type === "goal" && event.teamId === winner.id);
    const loserGoals = snapshot.events.filter((event) => event.type === "goal" && event.teamId === loser.id);
    const winnerScore = Number(winner.score), loserScore = Number(loser.score);
    if (winnerGoals.length !== winnerScore || loserGoals.length !== loserScore) {
      throw new Error("Replay goal events do not match the final official scores.");
    }
    const decidingGoal = winnerGoals[loserScore];
    decisionGoalIndex = snapshot.events.indexOf(decidingGoal);
    if (decisionGoalIndex < 0) throw new Error("Game-winning goal not found in official replay.");
  }

  let credited = null;
  for (let i = 0; i < snapshot.events.length; i++) {
    const event = snapshot.events[i];
    if (event.type === "goalie-change" && active[event.teamId]) {
      if (!idsBySimId[event.playerId]) throw new Error("Replay references unknown replacement goalie.");
      active[event.teamId] = event.playerId;
    }
    if (i === decisionGoalIndex) credited = { ...active };
  }
  if (finish === "SO") credited = { ...active };
  if (!credited || !credited[winner.id] || !credited[loser.id]) {
    throw new Error("Could not identify both goalies of record from replay.");
  }
  return {
    [winner.abbreviation]: { playerId: idsBySimId[credited[winner.id]], decision: "W" },
    [loser.abbreviation]: { playerId: idsBySimId[credited[loser.id]], decision: finish === "REG" ? "L" : "OTL" },
  };
}
