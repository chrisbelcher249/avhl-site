// Team pages use the same numeric sort values shown in their skater/goalie
// season-stat tables. Keep the original default sort when first opened.
export const TEAM_SKATER_COLUMNS = [
  { key: "name", label: "Player" },
  { key: "gp", label: "GP", number: true },
  { key: "goals", label: "G", number: true },
  { key: "assists", label: "A", number: true },
  { key: "points", label: "PTS", number: true },
  { key: "plusMinus", label: "+/-", number: true },
  { key: "shots", label: "S", number: true },
  { key: "shotPct", label: "S%", number: true },
  { key: "penaltyMinutes", label: "PIM", number: true },
  { key: "hits", label: "Hits", number: true },
  { key: "powerPlayGoals", label: "PPG", number: true },
  { key: "shorthandedGoals", label: "SHG", number: true },
  { key: "faceoffsWon", label: "FOW", number: true },
  { key: "faceoffPct", label: "FO%", number: true },
  { key: "toi", label: "TOI", number: true },
];

export const TEAM_GOALIE_COLUMNS = [
  { key: "name", label: "Goalie" },
  { key: "gp", label: "GP", number: true },
  { key: "gs", label: "GS", number: true },
  { key: "wins", label: "W", number: true },
  { key: "losses", label: "L", number: true },
  { key: "otl", label: "OTL", number: true },
  { key: "startsRemaining", label: "GS Left", number: true },
  { key: "dressed", label: "Dressed", number: true },
  { key: "toi", label: "MIN", number: true },
  { key: "shotsAgainst", label: "SA", number: true },
  { key: "saves", label: "SV", number: true },
  { key: "savePct", label: "SV%", number: true },
  { key: "goalsAgainst", label: "GA", number: true },
  { key: "gaa", label: "GAA", number: true },
  { key: "emptyNetGoals", label: "ENG", number: true },
  { key: "points", label: "PTS", number: true },
];

export function nextTeamStatSort(previous, key, columns) {
  return {
    key,
    direction: previous.key === key
      ? previous.direction === "asc" ? "desc" : "asc"
      : columns.find((column) => column.key === key)?.number ? "desc" : "asc",
  };
}

export function sortTeamStatRows(rows, sort, columns) {
  const numeric = Boolean(columns.find((column) => column.key === sort.key)?.number);
  return [...rows].sort((a, b) => {
    const left = a[sort.key], right = b[sort.key];
    // Unknown numeric statistics should not be indistinguishable from true 0.
    const leftMissing = left === null || left === undefined || left === "";
    const rightMissing = right === null || right === undefined || right === "";
    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    const difference = leftMissing ? 0 : numeric
      ? Number(left) - Number(right)
      : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
    if (difference) return sort.direction === "asc" ? difference : -difference;

    // Preserve the existing season-table ordering on first load and for ties.
    if (sort.key === "points" && columns === TEAM_SKATER_COLUMNS && b.goals !== a.goals) {
      return b.goals - a.goals;
    }
    if (sort.key === "gp" && columns === TEAM_GOALIE_COLUMNS && b.toi !== a.toi) {
      return b.toi - a.toi;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  });
}
