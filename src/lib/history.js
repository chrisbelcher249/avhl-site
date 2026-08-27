import { regularSeasonHistory } from "../../data/history";

export function getFranchiseHistory(franchiseCode) {
  return regularSeasonHistory
    .filter((row) => row.franchiseCode === franchiseCode)
    .sort((a, b) => a.season.localeCompare(b.season));
}

export function getFranchiseSummary(franchiseCode) {
  const history = getFranchiseHistory(franchiseCode);
  if (!history.length) {
    return {
      seasons: 0,
      gp: 0,
      w: 0,
      l: 0,
      otl: 0,
      pts: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      bestSeason: null,
    };
  }

  const totals = history.reduce(
    (acc, row) => ({
      seasons: acc.seasons + 1,
      gp: acc.gp + row.gp,
      w: acc.w + row.w,
      l: acc.l + row.l,
      otl: acc.otl + row.otl,
      pts: acc.pts + row.pts,
      gf: acc.gf + row.gf,
      ga: acc.ga + row.ga,
      gd: acc.gd + row.gd,
    }),
    { seasons: 0, gp: 0, w: 0, l: 0, otl: 0, pts: 0, gf: 0, ga: 0, gd: 0 }
  );

  const bestSeason = [...history].sort(
    (a, b) => b.pts - a.pts || b.rw - a.rw || b.gd - a.gd || b.gf - a.gf
  )[0];

  return { ...totals, bestSeason };
}
