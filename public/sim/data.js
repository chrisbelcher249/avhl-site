/*
  AVHL Game Simulator V6.7.1 roster/bootstrap data.

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
  V6 website integration layer.
  Team identity still comes from the bundled 40-team catalog, while player
  rosters are loaded from the same live AVHL player database used by the site.
  The bundled Arizona/Atlanta pools remain bootstrap data only. Official matchup
  creation fails closed unless both selected teams resolve to complete live rosters.
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
  let liveLineupByAbbreviation = {};
  let liveLineupSources = {};
  let liveTeamReadiness = {};

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
    team.record = meta?.record ?? team.record ?? { gp: 0, wins: 0, losses: 0, otl: 0, pts: 0 };
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
      age: Number.isFinite(Number(player.age)) ? Number(player.age) : null,
      height: player.height || "",
      heightIn: Number.isFinite(Number(player.heightIn)) ? Number(player.heightIn) : null,
      weight: Number.isFinite(Number(player.weight)) ? Number(player.weight) : null,
      handedness: player.handedness || "",
      playerType: player.playerType || "",
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

  function simId(abbreviation, avhlId) {
    return `${String(abbreviation || "").toLowerCase()}-${avhlId}`;
  }

  function applySavedLineup(team, meta, roster, lineup) {
    if (!lineup || !Array.isArray(lineup.forwards) || !Array.isArray(lineup.defense) || !Array.isArray(lineup.goalies)) return false;
    if (lineup.forwards.length !== 12 || lineup.defense.length !== 6 || lineup.goalies.length !== 2) return false;

    const byId = Object.fromEntries(roster.map((player) => [String(player.id), player]));
    const forwardSlots = new Set();
    const defenseSlots = new Set();
    const forwardAvhlIds = new Set();
    const defenseAvhlIds = new Set();
    const goalieAvhlIds = new Set();

    for (const entry of lineup.forwards) {
      const playerId = String(entry?.playerId || "");
      const position = String(entry?.position || "").toUpperCase();
      const line = Number(entry?.line);
      const player = byId[playerId];
      const slot = `${line}:${position}`;
      if (!player || player.role !== "Skater" || isDefense(player)) return false;
      if (!Number.isInteger(line) || line < 1 || line > 4 || !["LW", "C", "RW"].includes(position)) return false;
      if (forwardSlots.has(slot) || forwardAvhlIds.has(playerId)) return false;
      forwardSlots.add(slot);
      forwardAvhlIds.add(playerId);
    }
    if (forwardSlots.size !== 12 || forwardAvhlIds.size !== 12) return false;

    for (const entry of lineup.defense) {
      const playerId = String(entry?.playerId || "");
      const position = String(entry?.position || "").toUpperCase();
      const pair = Number(entry?.pair);
      const player = byId[playerId];
      const slot = `${pair}:${position}`;
      if (!player || player.role !== "Skater" || !isDefense(player)) return false;
      if (!Number.isInteger(pair) || pair < 1 || pair > 3 || !["LD", "RD"].includes(position)) return false;
      if (defenseSlots.has(slot) || defenseAvhlIds.has(playerId)) return false;
      defenseSlots.add(slot);
      defenseAvhlIds.add(playerId);
    }
    if (defenseSlots.size !== 6 || defenseAvhlIds.size !== 6) return false;

    let starterCount = 0;
    for (const entry of lineup.goalies) {
      const playerId = String(entry?.playerId || "");
      const player = byId[playerId];
      if (!player || player.role !== "Goalie" || goalieAvhlIds.has(playerId)) return false;
      goalieAvhlIds.add(playerId);
      if (Boolean(entry?.starter)) starterCount += 1;
    }
    if (goalieAvhlIds.size !== 2 || starterCount !== 1) return false;

    const allDressedIds = new Set([...forwardAvhlIds, ...defenseAvhlIds, ...goalieAvhlIds]);
    if (allDressedIds.size !== 20) return false;
    const dressedSkaterIds = new Set([...forwardAvhlIds, ...defenseAvhlIds]);

    const validUnit = (ids, length, compositions = null) => {
      if (!Array.isArray(ids) || ids.length !== length) return false;
      const normalized = ids.map((id) => String(id || ""));
      if (new Set(normalized).size !== length) return false;
      if (normalized.some((id) => !dressedSkaterIds.has(id))) return false;
      if (compositions) {
        const forwards = normalized.filter((id) => forwardAvhlIds.has(id)).length;
        const defense = normalized.filter((id) => defenseAvhlIds.has(id)).length;
        if (!compositions.some(([f, d]) => forwards === f && defense === d)) return false;
      }
      return true;
    };

    if (!validUnit(lineup.specialTeams?.pp1, 5, [[4, 1], [3, 2]])) return false;
    if (!validUnit(lineup.specialTeams?.pp2, 5, [[4, 1], [3, 2]])) return false;
    if (!validUnit(lineup.specialTeams?.pk1, 4, [[2, 2]])) return false;
    if (!validUnit(lineup.specialTeams?.pk2, 4, [[2, 2]])) return false;
    if (!Array.isArray(lineup.overtimeUnits) || lineup.overtimeUnits.length !== 2) return false;
    if (!lineup.overtimeUnits.every((unit) => validUnit(unit, 3, [[2, 1]]))) return false;
    if (!validUnit(lineup.shootoutOrder, 5)) return false;

    const forwards = lineup.forwards.map((entry) => {
      const player = byId[String(entry.playerId)];
      return simPlayer(player, meta.abbreviation, { position: entry.position, line: Number(entry.line) });
    });
    const defense = lineup.defense.map((entry) => {
      const player = byId[String(entry.playerId)];
      return simPlayer(player, meta.abbreviation, { position: entry.position, pair: Number(entry.pair) });
    });
    const goalies = lineup.goalies.map((entry) => {
      const player = byId[String(entry.playerId)];
      return simPlayer(player, meta.abbreviation, { position: "G", starter: Boolean(entry.starter) });
    });

    team.forwards = forwards;
    team.defense = defense;
    team.goalies = goalies;
    team.specialTeams = {
      pp1: lineup.specialTeams.pp1.map((id) => simId(meta.abbreviation, id)),
      pp2: lineup.specialTeams.pp2.map((id) => simId(meta.abbreviation, id)),
      pk1: lineup.specialTeams.pk1.map((id) => simId(meta.abbreviation, id)),
      pk2: lineup.specialTeams.pk2.map((id) => simId(meta.abbreviation, id)),
    };
    team.overtimeUnits = lineup.overtimeUnits.map((unit) => unit.map((id) => simId(meta.abbreviation, id)));
    team.shootoutOrder = lineup.shootoutOrder.map((id) => simId(meta.abbreviation, id));
    team.lineupRevision = Number(lineup.revision) || 0;
    team.lineupUpdatedAt = lineup.updatedAt || null;
    team.lineupSource = liveLineupSources[meta.abbreviation] || "projected";
    // Preserve the exact server-supplied AVHL lineup record that produced this
    // game. The official-save flow can then persist a temporary sim repair only
    // after the game is verified, rather than regenerating a potentially
    // different repair later.
    team.lineupRecord = clone(lineup);
    return true;
  }

  function applyLiveRoster(team, meta) {
    const readiness = liveTeamReadiness?.[meta?.abbreviation];
    if (readiness && readiness.canPlay === false) return false;
    const roster = liveRosterByTeam?.[meta?.rosterLookupName ?? meta?.fullName];
    if (!Array.isArray(roster) || roster.length < 20) return false;

    // /api/sim-rosters supplies one server-validated lineup record for every
    // team: owner-saved when valid, projected when no owner lineup exists, and
    // temporarily repaired for the sim when a trade/injury invalidates part of
    // an owner lineup. The browser never invents a second fallback; if the
    // server record itself cannot be applied, fail closed rather than silently
    // changing it.
    const lineup = liveLineupByAbbreviation?.[meta.abbreviation];
    if (!lineup || !applySavedLineup(team, meta, roster, lineup)) return false;

    team.rosterSource = liveRosterSource;
    return true;
  }

  window.AVHL_LOAD_LIVE_BRANDING = async () => {
    const response = await fetch("/api/teams", { cache: "no-store" });
    if (!response.ok) throw new Error(`Live branding request returned ${response.status}`);
    const payload = await response.json();
    if (!payload?.ok || !Array.isArray(payload.teams)) throw new Error("Live branding response was invalid");

    const catalog = window.AVHL_TEAM_CATALOG ?? {};
    for (const team of payload.teams) {
      const abbreviation = team?.abbreviation;
      if (!abbreviation) continue;
      const existing = catalog[abbreviation] ?? {};
      const numberColorWasSecondary = !existing.numberColor || existing.numberColor === existing.secondaryColor;
      catalog[abbreviation] = {
        ...existing,
        abbreviation,
        city: team.city ?? existing.city ?? "",
        name: team.nickname ?? existing.name ?? "",
        playByPlayName: team.playByPlayName ?? existing.playByPlayName ?? team.nickname ?? "",
        arenaName: team.arena ?? existing.arenaName ?? "AVHL Arena",
        primaryColor: team.colors?.primary ?? existing.primaryColor ?? "#888888",
        secondaryColor: team.colors?.secondary ?? existing.secondaryColor ?? "#ffffff",
        tertiaryColor: team.colors?.tertiary ?? existing.tertiaryColor ?? "#ffffff",
        mascotName: team.mascot?.name ?? existing.mascotName ?? "",
        record: team.record ?? existing.record ?? { gp: 0, wins: 0, losses: 0, otl: 0, pts: 0 },
        rosterLookupName: existing.rosterLookupName ?? existing.fullName ?? team.name ?? "",
        fullName: team.name ?? existing.fullName ?? `${team.city ?? ""} ${team.nickname ?? ""}`.trim(),
        assets: existing.assets ?? {
          logo: `/logos/26_${abbreviation}_Logo.png`,
          homeJersey: `/teams/${abbreviation}/home.webp`,
          awayJersey: `/teams/${abbreviation}/away.webp`,
          altJersey: `/teams/${abbreviation}/alt.webp`,
          arena: `/teams/${abbreviation}/arena.webp`,
          mascot: `/teams/${abbreviation}/mascot.webp`,
        },
      };
      catalog[abbreviation].numberColor = numberColorWasSecondary
        ? catalog[abbreviation].secondaryColor
        : existing.numberColor;
    }

    window.AVHL_TEAM_CATALOG = catalog;
    window.AVHL_LIVE_BRANDING_STATUS = {
      source: payload.source || "live",
      teamCount: payload.teamCount || payload.teams.length,
      liveTeamCount: payload.liveTeamCount ?? payload.teams.length,
    };
    return window.AVHL_LIVE_BRANDING_STATUS;
  };

  window.AVHL_LOAD_LIVE_ROSTERS = async () => {
    const response = await fetch(`/api/sim-rosters?t=${Date.now()}`, { cache: "no-store" });
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
    liveLineupByAbbreviation = payload.lineups || {};
    liveLineupSources = payload.lineupSources || {};
    liveTeamReadiness = payload.teamReadiness || {};
    window.AVHL_LIVE_ROSTER_STATUS = {
      source: liveRosterSource,
      playerCount: payload.playerCount || payload.players.length,
      teamCount: Object.keys(grouped).length,
      lineupSources: liveLineupSources,
      lineupStorage: payload.lineupStorage || null,
      activeInjuries: payload.activeInjuries || [],
      teamReadiness: liveTeamReadiness,
      cannotPlayTeams: payload.cannotPlayTeams || {},
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
    const homeReady = applyLiveRoster(data.home, homeMeta);
    const awayReady = applyLiveRoster(data.away, awayMeta);
    if (!homeReady || !awayReady) {
      const blocked = [
        !homeReady && liveTeamReadiness?.[homeAbbreviation]?.canPlay === false ? homeAbbreviation : null,
        !awayReady && liveTeamReadiness?.[awayAbbreviation]?.canPlay === false ? awayAbbreviation : null,
      ].filter(Boolean);
      if (blocked.length) {
        const details = blocked.map((abbreviation) => {
          const status = liveTeamReadiness?.[abbreviation];
          return `${abbreviation} (${(status?.reasons || ["cannot dress a legal healthy lineup"]).join("; ")})`;
        }).join(" and ");
        throw new Error(`Cannot start this game: ${details}. Resolve the roster shortage before simming.`);
      }
      const missing = [
        !homeReady ? homeMeta?.fullName || homeAbbreviation : null,
        !awayReady ? awayMeta?.fullName || awayAbbreviation : null,
      ].filter(Boolean).join(" and ");
      throw new Error(`Complete live roster/lineup data is unavailable for ${missing}.`);
    }
    return data;
  };

  // Keep the bootstrap demo object only as inert page-load data. The app does
  // not construct a playable matchup until AVHL_LOAD_LIVE_ROSTERS succeeds.
  window.AVHL_DATA = clone(baseData);
})();
