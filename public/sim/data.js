/*
  AVHL Game Simulator V3 demo data.

  The roster is intentionally kept in a separate file so it can later be
  replaced by exported AVHL player data, Firebase snapshots, CSV imports, or
  a Next.js API response without rewriting the simulation engine.
*/

const ARI_META = window.AVHL_TEAM_CATALOG?.ARI ?? {};
const ATL_META = window.AVHL_TEAM_CATALOG?.ATL ?? {};

window.AVHL_DATA = {
  home: {
    id: "heat",
    name: "Heat",
    city: ARI_META.city ?? "Arizona",
    fullName: ARI_META.fullName ?? "Arizona Heat",
    abbreviation: "ARI",
    arenaName: ARI_META.arenaName ?? "Domino's Center",
    mascotName: ARI_META.mascotName ?? "Heath",
    primaryColor: ARI_META.primaryColor ?? "#ED1C24",
    secondaryColor: ARI_META.secondaryColor ?? "#E67700",
    tertiaryColor: ARI_META.tertiaryColor ?? "#FFF200",
    numberColor: ARI_META.numberColor ?? ARI_META.secondaryColor ?? "#E67700",
    assets: ARI_META.assets ?? {},
    forwards: [
      { id: "hea-tkachuk", name: "Matthew Tkachuk", number: 19, position: "LW", line: 1 },
      { id: "hea-scheifele", name: "Mark Scheifele", number: 55, position: "C", line: 1 },
      { id: "hea-marchenko", name: "Kirill Marchenko", number: 86, position: "RW", line: 1 },
      { id: "hea-paul", name: "Nick Paul", number: 20, position: "LW", line: 2 },
      { id: "hea-schmaltz", name: "Nick Schmaltz", number: 8, position: "C", line: 2 },
      { id: "hea-arvidsson", name: "Viktor Arvidsson", number: 33, position: "RW", line: 2 },
      { id: "hea-foligno", name: "Marcus Foligno", number: 17, position: "LW", line: 3 },
      { id: "hea-jenner", name: "Boone Jenner", number: 38, position: "C", line: 3 },
      { id: "hea-raddysh", name: "Taylor Raddysh", number: 16, position: "RW", line: 3 },
      { id: "hea-boyd", name: "Travis Boyd", number: 72, position: "LW", line: 4 },
      { id: "hea-sturm", name: "Nico Sturm", number: 7, position: "C", line: 4 },
      { id: "hea-chaffee", name: "Mitchell Chaffee", number: 41, position: "RW", line: 4 }
    ],
    defense: [
      { id: "hea-ekholm", name: "Mattias Ekholm", number: 14, position: "LD", pair: 1 },
      { id: "hea-jones", name: "Seth Jones", number: 3, position: "RD", pair: 1 },
      { id: "hea-miromanov", name: "Daniil Miromanov", number: 62, position: "LD", pair: 2 },
      { id: "hea-petry", name: "Jeff Petry", number: 46, position: "RD", pair: 2 },
      { id: "hea-mahura", name: "Josh Mahura", number: 28, position: "LD", pair: 3 },
      { id: "hea-fleury", name: "Cale Fleury", number: 18, position: "RD", pair: 3 }
    ],
    goalies: [
      { id: "hea-saros", name: "Juuse Saros", number: 74, starter: true },
      { id: "hea-talbot", name: "Cam Talbot", number: 39, starter: false }
    ],
    shootoutOrder: ["hea-tkachuk", "hea-scheifele", "hea-marchenko", "hea-schmaltz", "hea-arvidsson"]
  },

  away: {
    id: "cobalt",
    name: "Cobalts",
    city: ATL_META.city ?? "Atlanta",
    fullName: ATL_META.fullName ?? "Atlanta Cobalts",
    abbreviation: "ATL",
    arenaName: ATL_META.arenaName ?? "Trident Stadium",
    mascotName: ATL_META.mascotName ?? "Coby",
    primaryColor: ATL_META.primaryColor ?? "#0D004C",
    secondaryColor: ATL_META.secondaryColor ?? "#E67700",
    tertiaryColor: ATL_META.tertiaryColor ?? "#E8E8E8",
    numberColor: ATL_META.numberColor ?? ATL_META.secondaryColor ?? "#E67700",
    assets: ATL_META.assets ?? {},
    forwards: [
      { id: "cob-barbashev", name: "Ivan Barbashev", number: 49, position: "LW", line: 1 },
      { id: "cob-hischier", name: "Nico Hischier", number: 13, position: "C", line: 1 },
      { id: "cob-zucker", name: "Jason Zucker", number: 17, position: "RW", line: 1 },
      { id: "cob-stephenson", name: "Chandler Stephenson", number: 9, position: "LW", line: 2 },
      { id: "cob-lundell", name: "Anton Lundell", number: 15, position: "C", line: 2 },
      { id: "cob-vatrano", name: "Frank Vatrano", number: 77, position: "RW", line: 2 },
      { id: "cob-nosek", name: "Tomas Nosek", number: 92, position: "LW", line: 3 },
      { id: "cob-dach", name: "Kirby Dach", number: 78, position: "C", line: 3 },
      { id: "cob-quinn", name: "Jack Quinn", number: 2, position: "RW", line: 3 },
      { id: "cob-trenin", name: "Yakov Trenin", number: 73, position: "LW", line: 4 },
      { id: "cob-ivan", name: "Ivan Ivan", number: 82, position: "C", line: 4 },
      { id: "cob-johansen", name: "Ryan Johansen", number: 12, position: "RW", line: 4 }
    ],
    defense: [
      { id: "cob-sergachev", name: "Mikhail Sergachev", number: 98, position: "LD", pair: 1 },
      { id: "cob-kesselring", name: "Michael Kesselring", number: 7, position: "RD", pair: 1 },
      { id: "cob-mccabe", name: "Jake McCabe", number: 22, position: "LD", pair: 2 },
      { id: "cob-fowler", name: "Cam Fowler", number: 4, position: "RD", pair: 2 },
      { id: "cob-perunovich", name: "Scott Perunovich", number: 26, position: "LD", pair: 3 },
      { id: "cob-ristolainen", name: "Rasmus Ristolainen", number: 55, position: "RD", pair: 3 }
    ],
    goalies: [
      { id: "cob-vasilevskiy", name: "Andrei Vasilevskiy", number: 88, starter: true },
      { id: "cob-lankinen", name: "Kevin Lankinen", number: 32, starter: false }
    ],
    shootoutOrder: ["cob-hischier", "cob-vatrano", "cob-barbashev", "cob-lundell", "cob-quinn"]
  }
};

/*
  Matchup branding + live-roster layer. The website supplies current AVHL
  rosters through /api/sim-rosters. Until owner-submitted lines are available,
  the simulator automatically selects 12 F, 6 D, and 2 G from each live roster.
  The original demo pools remain only as an emergency fallback.
*/
(() => {
  const clone = (value) => {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const baseData = clone(window.AVHL_DATA);
  window.AVHL_BASE_DATA = baseData;

  function applyMetadata(team, meta, side) {
    const abbreviation = meta?.abbreviation ?? (side === "home" ? "ARI" : "ATL");
    team.id = `${side}-${abbreviation.toLowerCase()}`;
    team.name = meta?.name ?? team.name;
    team.city = meta?.city ?? team.city;
    team.fullName = meta?.fullName ?? `${team.city} ${team.name}`;
    team.abbreviation = abbreviation;
    team.arenaName = meta?.arenaName ?? "AVHL Arena";
    team.primaryColor = meta?.primaryColor ?? team.primaryColor;
    team.secondaryColor = meta?.secondaryColor ?? team.secondaryColor;
    team.tertiaryColor = meta?.tertiaryColor ?? team.tertiaryColor;
    team.numberColor = meta?.numberColor ?? team.secondaryColor;
    team.assets = meta?.assets ?? {};
    return team;
  }

  const ratingValue = (player, key, fallback = 0) => {
    const value = Number(player?.[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const positionTokens = (player) => String(player?.listedPositions ?? "")
    .toUpperCase()
    .split(/[\s/,]+/)
    .filter(Boolean);

  const isDefenseman = (player) => {
    const positions = positionTokens(player);
    return positions.includes("LD") || positions.includes("RD") || positions.includes("D");
  };

  const hasPosition = (player, position) => positionTokens(player).includes(position);

  const byOverall = (a, b) => ratingValue(b, "overall") - ratingValue(a, "overall") || a.name.localeCompare(b.name);

  function assignWingSides(leftCandidate, rightCandidate) {
    if (hasPosition(leftCandidate, "LW") && hasPosition(rightCandidate, "RW")) return [[leftCandidate, "LW"], [rightCandidate, "RW"]];
    if (hasPosition(leftCandidate, "RW") && hasPosition(rightCandidate, "LW")) return [[rightCandidate, "LW"], [leftCandidate, "RW"]];
    if (hasPosition(leftCandidate, "LW") && !hasPosition(rightCandidate, "LW")) return [[leftCandidate, "LW"], [rightCandidate, "RW"]];
    if (hasPosition(rightCandidate, "LW") && !hasPosition(leftCandidate, "LW")) return [[rightCandidate, "LW"], [leftCandidate, "RW"]];
    return [[leftCandidate, "LW"], [rightCandidate, "RW"]];
  }

  function assignDefenseSides(leftCandidate, rightCandidate) {
    if (hasPosition(leftCandidate, "LD") && hasPosition(rightCandidate, "RD")) return [[leftCandidate, "LD"], [rightCandidate, "RD"]];
    if (hasPosition(leftCandidate, "RD") && hasPosition(rightCandidate, "LD")) return [[rightCandidate, "LD"], [leftCandidate, "RD"]];
    if (hasPosition(leftCandidate, "LD") && !hasPosition(rightCandidate, "LD")) return [[leftCandidate, "LD"], [rightCandidate, "RD"]];
    if (hasPosition(rightCandidate, "LD") && !hasPosition(leftCandidate, "LD")) return [[rightCandidate, "LD"], [leftCandidate, "RD"]];
    return [[leftCandidate, "LD"], [rightCandidate, "RD"]];
  }

  function buildAutomaticLiveLineup(roster) {
    const skaters = Array.isArray(roster?.skaters) ? roster.skaters.slice() : [];
    const goalies = Array.isArray(roster?.goalies) ? roster.goalies.slice().sort(byOverall) : [];
    const forwards = skaters.filter((player) => !isDefenseman(player));
    const defensemen = skaters.filter(isDefenseman).sort(byOverall);

    if (forwards.length < 12 || defensemen.length < 6 || goalies.length < 2) return null;

    const activeForwards = forwards.sort(byOverall).slice(0, 12);
    const lineupForwards = [];
    for (let line = 1; line <= 4; line += 1) {
      const linePlayers = activeForwards.slice((line - 1) * 3, line * 3);
      if (linePlayers.length < 3) return null;
      const naturalCenters = linePlayers
        .filter((player) => hasPosition(player, "C"))
        .sort((a, b) => ratingValue(b, "faceoffs") - ratingValue(a, "faceoffs") || byOverall(a, b));
      const center = naturalCenters[0] ?? linePlayers.slice().sort((a, b) => ratingValue(b, "faceoffs") - ratingValue(a, "faceoffs") || byOverall(a, b))[0];
      const wings = linePlayers.filter((player) => player.id !== center.id);
      const wingAssignments = assignWingSides(wings[0], wings[1]);
      lineupForwards.push(
        { ...wingAssignments[0][0], position: wingAssignments[0][1], line },
        { ...center, position: "C", line },
        { ...wingAssignments[1][0], position: wingAssignments[1][1], line },
      );
    }

    const lineupDefense = [];
    const activeDefense = defensemen.slice(0, 6);
    for (let pair = 1; pair <= 3; pair += 1) {
      const first = activeDefense[(pair - 1) * 2];
      const second = activeDefense[(pair - 1) * 2 + 1];
      const assignments = assignDefenseSides(first, second);
      lineupDefense.push(
        { ...assignments[0][0], position: assignments[0][1], pair },
        { ...assignments[1][0], position: assignments[1][1], pair },
      );
    }

    return {
      forwards: lineupForwards,
      defense: lineupDefense,
      goalies: goalies.slice(0, 2).map((goalie, index) => ({ ...goalie, starter: index === 0 })),
      shootoutOrder: [],
    };
  }

  function applyLiveRoster(team, roster) {
    const lineup = buildAutomaticLiveLineup(roster);
    if (!lineup) return false;
    team.forwards = lineup.forwards;
    team.defense = lineup.defense;
    team.goalies = lineup.goalies;
    team.shootoutOrder = lineup.shootoutOrder;
    team.rosterSource = "live";
    return true;
  }

  window.AVHL_LIVE_ROSTERS = window.AVHL_LIVE_ROSTERS ?? {};
  window.AVHL_SET_LIVE_ROSTERS = (rosters = {}) => {
    window.AVHL_LIVE_ROSTERS = rosters && typeof rosters === "object" ? rosters : {};
  };

  window.AVHL_CREATE_MATCHUP_DATA = (homeAbbreviation = "ARI", awayAbbreviation = "ATL") => {
    const catalog = window.AVHL_TEAM_CATALOG ?? {};
    const data = clone(baseData);
    applyMetadata(data.home, catalog[homeAbbreviation] ?? catalog.ARI, "home");
    applyMetadata(data.away, catalog[awayAbbreviation] ?? catalog.ATL, "away");
    applyLiveRoster(data.home, window.AVHL_LIVE_ROSTERS?.[homeAbbreviation]);
    applyLiveRoster(data.away, window.AVHL_LIVE_ROSTERS?.[awayAbbreviation]);
    return data;
  };

  window.AVHL_DATA = window.AVHL_CREATE_MATCHUP_DATA("ARI", "ATL");
})();
