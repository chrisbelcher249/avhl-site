// Manual league-office overrides for games that were played outside the AVHL simulator.
// Keep these narrowly scoped so normal simulator/Redis data remains authoritative elsewhere.

export const manualInjuryRecords = [
  {
    schema: "avhl-injury-v1",
    officialGameId: 52,
    injuryDate: "2026-09-26",
    teamAbbreviation: "STL",
    teamName: "St. Louis Leopards",
    playerId: "0436",
    playerName: "Gabe Perreault",
    position: "RW",
    injuryType: "Upper Body",
    bodyArea: "Upper Body",
    severity: "",
    cause: "SNS manual entry",
    gamesMissed: 3,
    simInjuryId: null,
    period: null,
    clockText: null,
    createdAt: "2026-09-26T21:30:00-04:00",
    teamLocked: true,
  },
];
