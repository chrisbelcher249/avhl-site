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
  V5.2 website integration layer.
  Team identity still comes from the bundled 40-team catalog, while player
  rosters are loaded from the same live AVHL player database used by the site.
  If that request fails, the original Arizona/Atlanta demo pools remain a safe
  fallback so the simulator can still run.
*/
(() => {
  const clone = (value) => {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const baseData = clone(window.AVHL_DATA);
  window.AVHL_BASE_DATA = baseData;

  let liveRosterByTeam = null;
  let liveRosterSource = "demo";

  function applyMetadata(team, meta, side) {
    const abbreviation = meta?.abbreviation ?? (side === "home" ? "ARI" : "ATL");
    team.id = `${side}-${abbreviation.toLowerCase()}`;
    team.name = meta?.name ?? team.name;
    team.city = meta?.city ?? team.city;
    team.fullName = meta?.fullName ?? `${team.city} ${team.name}`;
    team.abbreviation = abbreviation;
    team.arenaName = meta?.arenaName ?? "AVHL Arena";
    team.mascotName = meta?.mascotName ?? "";
    team.primaryColor = meta?.primaryColor ?? team.primaryColor;
    team.secondaryColor = meta?.secondaryColor ?? team.secondaryColor;
    team.tertiaryColor = meta?.tertiaryColor ?? team.tertiaryColor;
    team.numberColor = meta?.numberColor ?? team.secondaryColor;
    team.assets = meta?.assets ?? {};
    return team;
  }

  function overall(player) {
    return Number.isFinite(Number(player?.overall)) ? Number(player.overall) : 0;
  }

  function positionTokens(player) {
    return String(player?.position || "")
      .toUpperCase()
      .split(/[\\/,\s-]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function hasPosition(player, value) {
    return positionTokens(player).includes(value);
  }

  function isDefense(player) {
    const tokens = positionTokens(player);
    return tokens.some((value) => value === "D" || value === "LD" || value === "RD");
  }

  function simPlayer(player, abbreviation, extra = {}) {
    return {
      id: `${abbreviation.toLowerCase()}-${player.id}`,
      avhlId: player.id,
      name: player.name,
      number: Number.isFinite(Number(player.number)) ? Number(player.number) : null,
      listedPosition: player.position || "",
      overall: overall(player) || null,
      ratings: player.ratings || {},
      ...extra,
    };
  }

  function takeBest(pool, predicate = () => true) {
    const candidates = pool.filter(predicate).sort((a, b) => overall(b) - overall(a));
    const selected = candidates[0] || pool.slice().sort((a, b) => overall(b) - overall(a))[0];
    if (!selected) return null;
    const index = pool.indexOf(selected);
    if (index >= 0) pool.splice(index, 1);
    return selected;
  }

  function buildForwardLines(players, abbreviation) {
    const forwards = players.filter((player) => player.role === "Skater" && !isDefense(player));
    const remaining = forwards.slice();
    const centers = [];

    for (let line = 1; line <= 4; line += 1) {
      centers.push(takeBest(remaining, (player) => hasPosition(player, "C")));
    }

    const output = [];
    for (let line = 1; line <= 4; line += 1) {
      const center = centers[line - 1];
      const left = takeBest(remaining, (player) => hasPosition(player, "LW"));
      const right = takeBest(remaining, (player) => hasPosition(player, "RW"));
      if (left) output.push(simPlayer(left, abbreviation, { position: "LW", line }));
      if (center) output.push(simPlayer(center, abbreviation, { position: "C", line }));
      if (right) output.push(simPlayer(right, abbreviation, { position: "RW", line }));
    }

    // Current AVHL rosters are 12F/6D/2G. This keeps the simulator resilient if
    // a temporary live roster ever arrives with an unusual positional mix.
    while (remaining.length && output.length < 12) {
      const player = takeBest(remaining);
      const line = Math.floor(output.length / 3) + 1;
      const slot = output.length % 3;
      output.push(simPlayer(player, abbreviation, { position: ["LW", "C", "RW"][slot], line: Math.min(line, 4) }));
    }

    return output.slice(0, 12);
  }

  function buildDefensePairs(players, abbreviation) {
    const remaining = players
      .filter((player) => player.role === "Skater" && isDefense(player))
      .slice();
    const output = [];

    for (let pair = 1; pair <= 3; pair += 1) {
      const left = takeBest(remaining, (player) => hasPosition(player, "LD"));
      const right = takeBest(remaining, (player) => hasPosition(player, "RD"));
      if (left) output.push(simPlayer(left, abbreviation, { position: "LD", pair }));
      if (right) output.push(simPlayer(right, abbreviation, { position: "RD", pair }));
    }

    while (remaining.length && output.length < 6) {
      const player = takeBest(remaining);
      const pair = Math.floor(output.length / 2) + 1;
      const slot = output.length % 2;
      output.push(simPlayer(player, abbreviation, { position: slot === 0 ? "LD" : "RD", pair: Math.min(pair, 3) }));
    }

    return output.slice(0, 6);
  }

  function buildGoalies(players, abbreviation) {
    return players
      .filter((player) => player.role === "Goalie")
      .slice()
      .sort((a, b) => overall(b) - overall(a))
      .slice(0, 2)
      .map((player, index) => simPlayer(player, abbreviation, { position: "G", starter: index === 0 }));
  }

  function applyLiveRoster(team, meta) {
    const roster = liveRosterByTeam?.[meta?.fullName];
    if (!Array.isArray(roster) || roster.length < 18) return team;

    const forwards = buildForwardLines(roster, meta.abbreviation);
    const defense = buildDefensePairs(roster, meta.abbreviation);
    const goalies = buildGoalies(roster, meta.abbreviation);

    if (forwards.length < 12 || defense.length < 6 || goalies.length < 2) return team;

    team.forwards = forwards;
    team.defense = defense;
    team.goalies = goalies;
    team.shootoutOrder = forwards
      .slice()
      .sort((a, b) => (b.overall || 0) - (a.overall || 0))
      .slice(0, 5)
      .map((player) => player.id);
    team.rosterSource = liveRosterSource;
    return team;
  }

  window.AVHL_LOAD_LIVE_ROSTERS = async () => {
    const response = await fetch("/api/sim-rosters", { cache: "no-store" });
    if (!response.ok) throw new Error(`Live roster request returned ${response.status}`);
    const payload = await response.json();
    if (!payload?.ok || !Array.isArray(payload.players)) throw new Error("Live roster response was invalid");

    const grouped = {};
    for (const player of payload.players) {
      if (!player?.currentTeam) continue;
      (grouped[player.currentTeam] ||= []).push(player);
    }

    liveRosterByTeam = grouped;
    liveRosterSource = payload.source || "live";
    window.AVHL_LIVE_ROSTER_STATUS = {
      source: liveRosterSource,
      playerCount: payload.playerCount || payload.players.length,
      teamCount: Object.keys(grouped).length,
    };
    return window.AVHL_LIVE_ROSTER_STATUS;
  };

  window.AVHL_CREATE_MATCHUP_DATA = (homeAbbreviation = "ARI", awayAbbreviation = "ATL") => {
    const catalog = window.AVHL_TEAM_CATALOG ?? {};
    const data = clone(baseData);
    const homeMeta = catalog[homeAbbreviation] ?? catalog.ARI;
    const awayMeta = catalog[awayAbbreviation] ?? catalog.ATL;
    applyMetadata(data.home, homeMeta, "home");
    applyMetadata(data.away, awayMeta, "away");
    applyLiveRoster(data.home, homeMeta);
    applyLiveRoster(data.away, awayMeta);
    return data;
  };

  window.AVHL_DATA = window.AVHL_CREATE_MATCHUP_DATA("ARI", "ATL");
})();
