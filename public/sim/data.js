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
  V3.1 matchup branding layer.
  Until the full 40-team player database is connected, the two demo player
  pools remain the simulation rosters while any Major League team can supply
  the team identity, colors, arena, logo, and jerseys.
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

  window.AVHL_CREATE_MATCHUP_DATA = (homeAbbreviation = "ARI", awayAbbreviation = "ATL") => {
    const catalog = window.AVHL_TEAM_CATALOG ?? {};
    const data = clone(baseData);
    applyMetadata(data.home, catalog[homeAbbreviation] ?? catalog.ARI, "home");
    applyMetadata(data.away, catalog[awayAbbreviation] ?? catalog.ATL, "away");
    return data;
  };

  window.AVHL_DATA = window.AVHL_CREATE_MATCHUP_DATA("ARI", "ATL");
})();
