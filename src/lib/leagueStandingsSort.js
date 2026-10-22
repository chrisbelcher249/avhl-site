// Column definitions for the 40-team league view. All underlying standings
// and postseason seeding retain their official tiebreaker order.
export const LEAGUE_STANDINGS_COLUMNS = Object.freeze([
  { key: "rank", label: "#", type: "number" },
  { key: "team", label: "Team", type: "text" },
  { key: "gp", label: "GP", type: "number" },
  { key: "wins", label: "W", type: "number" },
  { key: "losses", label: "L", type: "number" },
  { key: "otl", label: "OTL", type: "number" },
  { key: "pts", label: "PTS", type: "number" },
  { key: "ptsPct", label: "PTS%", type: "number" },
  { key: "rw", label: "RW", type: "number" },
  { key: "gfPerGame", label: "GF/G", type: "number" },
  { key: "gaPerGame", label: "GA/G", type: "number" },
  { key: "gf", label: "GF", type: "number" },
  { key: "ga", label: "GA", type: "number" },
  { key: "gd", label: "GD", type: "number" }
]);

export function sortLeagueStandings(records, sort = { key: "rank", direction: "asc" }) {
  // Rank is based on the incoming official league standings; sorting must
  // not change how the site calculates playoff seeds or relegation places.
  const ranked = records.map((record, index) => ({ record, officialRank: index + 1 }));
  const column = LEAGUE_STANDINGS_COLUMNS.find((item) => item.key === sort.key) || LEAGUE_STANDINGS_COLUMNS[0];
  const sign = sort.direction === "desc" ? -1 : 1;
  return ranked.sort((a, b) => {
    if (column.key === "rank") return sign * (a.officialRank - b.officialRank);
    if (column.key === "team") {
      return sign * a.record.team.name.localeCompare(b.record.team.name, undefined, { sensitivity: "base" })
        || a.officialRank - b.officialRank;
    }
    const av = Number(a.record[column.key]) || 0;
    const bv = Number(b.record[column.key]) || 0;
    return sign * (av - bv) || a.officialRank - b.officialRank;
  });
}
