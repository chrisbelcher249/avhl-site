#!/usr/bin/env node
// Produce the next 16 live upcoming fixtures for the scheduled V7 odds refresh.
// This script selects fixtures only. It never generates scores.
import fs from "node:fs/promises";

export function selectUpcomingGames(manifest, limit = 16) {
  if (!manifest?.ok || manifest.source !== "live" || !Array.isArray(manifest.matchups)) {
    throw new Error("No verified live upcoming fixture manifest; refusing fallback.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 32) throw new Error("Invalid fixture limit.");
  const matches = [];
  const seen = new Set();
  for (const game of manifest.matchups) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(game?.date || "") ||
        !/^[A-Z0-9]{2,4}$/.test(game?.away || "") ||
        !/^[A-Z0-9]{2,4}$/.test(game?.home || "") ||
        game.away === game.home ||
        game.date < manifest.today || game.date > manifest.end) {
      throw new Error("Upcoming live fixture manifest includes an invalid matchup.");
    }
    const key = `${game.away}:${game.home}`;
    if (!seen.has(key)) {
      seen.add(key);
      matches.push({ away: game.away, home: game.home, date: game.date });
    }
  }
  // Day-of and next-day games are priced first. Keep at most 16 per refresh
  // to bound parallel compute and GitHub Actions spending.
  matches.sort((a,b)=>a.date.localeCompare(b.date) ||
    a.away.localeCompare(b.away) || a.home.localeCompare(b.home));
  return matches.slice(0,limit);
}

async function main() {
  const site = (process.env.AVHL_ODDS_SITE_URL || "https://avhl.org").replace(/\/+$/,"");
  const fixtureFile = process.env.AVHL_TEST_MANIFEST_FILE;
  let manifest;
  if (fixtureFile) {
    // Local tests only; the production workflow never supplies this variable.
    manifest = JSON.parse(await fs.readFile(fixtureFile,"utf8"));
  } else {
    const response = await fetch(`${site}/api/odds/upcoming`,{
      headers:{Accept:"application/json"},cache:"no-store",
      signal:AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Live upcoming odds API returned ${response.status}`);
    manifest=await response.json();
  }
  const selected=selectUpcomingGames(manifest,Math.min(32,Math.max(1,Number(process.env.AVHL_ODDS_MAX_MATCHUPS)||16)));
  const matrix={include:selected.map(({away,home})=>({away,home}))};
  const lines=[`count=${selected.length}`,`matrix=${JSON.stringify(matrix)}`];
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,lines.join("\n")+"\n");
  console.log(JSON.stringify({count:selected.length,dates:[...new Set(selected.map(x=>x.date))],matrix}));
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
