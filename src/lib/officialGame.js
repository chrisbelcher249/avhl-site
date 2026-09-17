import { normalizePlayerId } from "@/lib/seasonStats";

function mmss(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function pct(numerator, denominator) {
  const n = Number(numerator) || 0;
  const d = Number(denominator) || 0;
  return d ? n / d : 0;
}

export function gameFinish(packet) {
  const events = Array.isArray(packet?.events) ? packet.events : [];
  if (events.some((event) => String(event?.period).toUpperCase() === "SO" || String(event?.periodLabel).toUpperCase() === "SO")) return "SO";
  if (events.some((event) => Number(event?.period) === 4 || String(event?.periodLabel).toUpperCase() === "OT")) return "OT";
  return "REG";
}

function teamRow({ gameId, packet, teamSide, opponentSide, teamKey, finish }) {
  const side = packet[teamSide];
  const opponent = packet[opponentSide];
  const stats = packet.summary.teamStats[teamKey];
  const won = Number(side.score) > Number(opponent.score);
  return [
    gameId,
    "SIM",
    side.abbreviation,
    side.fullName,
    opponent.abbreviation,
    teamSide === "away" ? "A" : "H",
    Number(side.score) || 0,
    Number(opponent.score) || 0,
    won ? "W" : "L",
    finish,
    Number(stats.shots) || 0,
    Number(stats.hits) || 0,
    mmss(stats.timeOnAttack),
    pct(stats.passCompletions, stats.passAttempts),
    Number(stats.faceoffsWon) || 0,
    Number(stats.penaltyMinutes) || 0,
    `${Number(stats.powerPlayGoals) || 0}/${Number(stats.powerPlayOpportunities) || 0}`,
    mmss(stats.powerPlayTime),
    Number(stats.shorthandedGoals) || 0,
    Number(stats.injuries) || 0,
    Number(stats.manGamesLostProjected) || 0,
  ];
}

function skaterRowsFor({ gameId, packet, teamSide, opponentSide, teamKey }) {
  const side = packet[teamSide];
  const opponent = packet[opponentSide];
  const rows = packet.summary.skaters?.[teamKey] || [];
  return rows.map((player) => {
    const wins = Number(player.faceoffWins) || 0;
    const losses = Number(player.faceoffLosses) || 0;
    const attempts = wins + losses;
    return [
      gameId,
      "SIM",
      side.abbreviation,
      opponent.abbreviation,
      teamSide === "away" ? "A" : "H",
      normalizePlayerId(player.avhlId || player.id),
      player.name || "",
      player.position || "",
      mmss(player.toi),
      Number(player.goals) || 0,
      Number(player.assists) || 0,
      Number(player.points) || 0,
      Number(player.plusMinus) || 0,
      Number(player.shots) || 0,
      pct(player.goals, player.shots),
      mmss(player.ppToi),
      Number(player.penaltyMinutes) || 0,
      Number(player.hits) || 0,
      Number(player.powerPlayGoals) || 0,
      Number(player.shorthandedGoals) || 0,
      attempts,
      wins,
      pct(wins, attempts),
    ];
  });
}

function goalieRowsFor({ gameId, packet, teamSide, opponentSide, teamKey }) {
  const side = packet[teamSide];
  const opponent = packet[opponentSide];
  const rows = packet.summary.goalieRows?.[teamKey] || [];
  return rows.map((goalie) => {
    const toi = Number(goalie.toi) || 0;
    const ga = Number(goalie.goalsAgainst) || 0;
    return [
      gameId,
      "SIM",
      side.abbreviation,
      opponent.abbreviation,
      teamSide === "away" ? "A" : "H",
      normalizePlayerId(goalie.avhlId || goalie.id),
      goalie.name || "",
      mmss(toi),
      Number(goalie.shotsAgainst) || 0,
      Number(goalie.saves) || 0,
      pct(goalie.saves, goalie.shotsAgainst),
      ga,
      toi ? (ga * 3600) / toi : 0,
      Number(goalie.emptyNetGoals) || 0,
      Number(goalie.penaltyMinutes) || 0,
      Number(goalie.goals) || 0,
      Number(goalie.assists) || 0,
      Number(goalie.points) || 0,
    ];
  });
}

export function buildOfficialSheetRows(gameId, packet) {
  if (!packet?.summary?.teamStats || !packet?.summary?.skaters || !packet?.summary?.goalieRows) {
    throw new Error("The simulator did not provide a complete final box score.");
  }
  const awayKey = packet.away?.id;
  const homeKey = packet.home?.id;
  if (!awayKey || !homeKey || !packet.summary.teamStats[awayKey] || !packet.summary.teamStats[homeKey]) {
    throw new Error("The simulator team identifiers do not match the final summary.");
  }
  const finish = gameFinish(packet);
  return {
    finish,
    teamRows: [
      teamRow({ gameId, packet, teamSide: "away", opponentSide: "home", teamKey: awayKey, finish }),
      teamRow({ gameId, packet, teamSide: "home", opponentSide: "away", teamKey: homeKey, finish }),
    ],
    skaterRows: [
      ...skaterRowsFor({ gameId, packet, teamSide: "away", opponentSide: "home", teamKey: awayKey }),
      ...skaterRowsFor({ gameId, packet, teamSide: "home", opponentSide: "away", teamKey: homeKey }),
    ],
    goalieRows: [
      ...goalieRowsFor({ gameId, packet, teamSide: "away", opponentSide: "home", teamKey: awayKey }),
      ...goalieRowsFor({ gameId, packet, teamSide: "home", opponentSide: "away", teamKey: homeKey }),
    ],
  };
}
