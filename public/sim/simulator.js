/*
  AVHL Game Simulator V6.0
  ----------------------
  Plain JavaScript, no packages, and intentionally separated from the UI.

  Core design:
  - The score is never chosen first.
  - The game advances chronologically through connected hockey events.
  - Every on-ice player has an approximate x/y position and movement state.
  - Shots, attempts, hits, penalties, and faceoffs receive exact rink coordinates.
  - Goal replays preserve all players actually on the ice, including both goalies.
  - Randomness is constrained by physically and tactically plausible ranges.
  - V6 consumes the live AVHL CSV ratings directly and models seeded injuries.
*/

const AVHL_RINK = (typeof window !== "undefined" && window.AVHL_RINK_GEOMETRY) || {
  width: 200,
  height: 85,
  goalLines: { low: 11, high: 189 },
  blueLines: { low: 75, high: 125 },
  faceoffSpots: {
    center: { x: 100, y: 42.5 },
    lowLeft: { x: 31, y: 22 },
    lowRight: { x: 31, y: 63 },
    highLeft: { x: 169, y: 22 },
    highRight: { x: 169, y: 63 }
  }
};

class SeededRandom {
  constructor(seed = Date.now()) {
    const numericSeed = Number(seed);
    this.seed = Number.isFinite(numericSeed) ? numericSeed >>> 0 : Date.now() >>> 0;
  }

  next() {
    let x = (this.seed += 0x6D2B79F5);
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }

  chance(probability) {
    return this.next() < Math.max(0, Math.min(1, probability));
  }

  integer(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  choice(items) {
    return items[Math.floor(this.next() * items.length)];
  }

  weightedChoice(items, weightFunction) {
    if (!items.length) return null;
    const weights = items.map((item) => Math.max(0.0001, Number(weightFunction(item)) || 0.0001));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = this.next() * total;

    for (let index = 0; index < items.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return items[index];
    }

    return items.at(-1);
  }

  normal(mean = 0, standardDeviation = 1) {
    const u1 = Math.max(this.next(), 1e-9);
    const u2 = Math.max(this.next(), 1e-9);
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * standardDeviation;
  }
}

class AVHLGameSimulator {
  constructor(data, seed = Date.now()) {
    if (!data?.home || !data?.away) {
      throw new Error("AVHLGameSimulator requires home and away team data.");
    }

    this.random = new SeededRandom(seed);
    this.seed = this.random.seed;
    // Injury rolls use a separate deterministic stream so adding medical logic
    // does not perturb ordinary hockey RNG until an injury actually changes personnel.
    this.injuryRandom = new SeededRandom(AVHLGameSimulator.hashString(`${this.seed}:injuries:v6`));
    this.rawData = this.clone(data);
    this.homeId = data.home.id;
    this.awayId = data.away.id;
    this.teams = {
      [this.homeId]: this.buildTeam(data.home, true),
      [this.awayId]: this.buildTeam(data.away, false)
    };
    this.events = [];
    this.eventId = 0;
  }

  clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  static hashString(value) {
    let hash = 2166136261;
    for (const character of value) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  opponent(teamId) {
    return teamId === this.homeId ? this.awayId : this.homeId;
  }

  periodLabel(period) {
    if (period === 1) return "1st";
    if (period === 2) return "2nd";
    if (period === 3) return "3rd";
    if (period === 4) return "OT";
    return "SO";
  }

  formatClock(seconds) {
    const rounded = Math.max(0, Math.floor(seconds + 0.0001));
    const minutes = Math.floor(rounded / 60);
    return `${minutes}:${String(rounded % 60).padStart(2, "0")}`;
  }

  ratingFrom(player, labels, fallback = null) {
    const ratings = player?.ratings ?? {};
    for (const label of labels) {
      const value = Number(ratings[label]);
      if (Number.isFinite(value)) return this.clamp(value, 40, 99);
    }
    const overall = Number(player?.overall);
    const resolved = Number.isFinite(fallback) ? fallback : Number.isFinite(overall) ? overall : 80;
    return this.clamp(resolved, 40, 99);
  }

  positionFamiliarity(player) {
    const listed = String(player?.listedPosition || player?.position || "")
      .toUpperCase()
      .split(/[\/,\s-]+/)
      .filter(Boolean);
    const assigned = String(player?.position || "").toUpperCase();
    if (!assigned || !listed.length || listed.includes(assigned)) return 1;
    if (["LD", "RD"].includes(assigned) && listed.includes("D")) return 1;
    // AVHL 2026-27 rule: a skater may play anywhere in their broad position
    // group, but unfamiliar F slots / defense sides receive a 3% familiarity hit
    // to awareness, passing and puck-control ratings.
    return 0.97;
  }

  applyFamiliarity(value, player) {
    return Math.round(value * this.positionFamiliarity(player) * 10) / 10;
  }

  buildTeam(rawTeam, isHome) {
    const forwards = rawTeam.forwards.map((player) => this.buildSkater(player, rawTeam.id));
    const defense = rawTeam.defense.map((player) => this.buildSkater(player, rawTeam.id));
    const starterRaw = rawTeam.goalies.find((goalie) => goalie.starter) ?? rawTeam.goalies[0];
    const backupRaw = rawTeam.goalies.find((goalie) => goalie.id !== starterRaw.id) ?? rawTeam.goalies[1];
    const goalie = this.buildGoalie(starterRaw, rawTeam.id);
    const backup = backupRaw ? this.buildGoalie(backupRaw, rawTeam.id) : null;
    const players = [...forwards, ...defense];
    const playerById = Object.fromEntries(players.map((player) => [player.id, player]));

    const forwardLines = [1, 2, 3, 4].map((line) =>
      forwards.filter((player) => player.line === line).map((player) => player.id)
    );
    const defensePairs = [1, 2, 3].map((pair) =>
      defense.filter((player) => player.pair === pair).map((player) => player.id)
    );

    const powerPlayPool = [...players].sort((a, b) => this.powerPlayScore(b) - this.powerPlayScore(a));
    const penaltyKillForwards = forwards
      .slice()
      .sort((a, b) => this.penaltyKillScore(b) - this.penaltyKillScore(a));
    const penaltyKillDefense = defense
      .slice()
      .sort((a, b) => this.penaltyKillScore(b) - this.penaltyKillScore(a));
    const overtimeForwards = forwards
      .slice()
      .sort((a, b) => this.overtimeScore(b) - this.overtimeScore(a));
    const overtimeDefense = defense
      .slice()
      .sort((a, b) => this.overtimeScore(b) - this.overtimeScore(a));

    const pp1 = this.makePowerPlayUnit(powerPlayPool.slice(0, 8));
    const pp2 = this.makePowerPlayUnit(powerPlayPool.filter((player) => !pp1.includes(player.id)));
    const pk1 = [
      ...penaltyKillForwards.slice(0, 2).map((player) => player.id),
      ...penaltyKillDefense.slice(0, 2).map((player) => player.id)
    ];
    const pk2 = [
      ...penaltyKillForwards.slice(2, 4).map((player) => player.id),
      ...penaltyKillDefense.slice(2, 4).map((player) => player.id)
    ];

    const requestedShootout = (rawTeam.shootoutOrder ?? []).filter((id) => playerById[id]);
    const automaticShootout = forwards
      .slice()
      .sort((a, b) => this.shootoutScore(b) - this.shootoutScore(a))
      .map((player) => player.id);
    const shootoutOrder = [...new Set([...requestedShootout, ...automaticShootout])].slice(0, 5);

    return {
      id: rawTeam.id,
      name: rawTeam.name,
      city: rawTeam.city ?? "",
      fullName: rawTeam.fullName ?? `${rawTeam.city ? `${rawTeam.city} ` : ""}${rawTeam.name}`,
      abbreviation: rawTeam.abbreviation ?? rawTeam.name.slice(0, 3).toUpperCase(),
      arenaName: rawTeam.arenaName ?? "AVHL Arena",
      mascotName: rawTeam.mascotName ?? "",
      primaryColor: rawTeam.primaryColor ?? "#888888",
      secondaryColor: rawTeam.secondaryColor ?? "#ffffff",
      tertiaryColor: rawTeam.tertiaryColor ?? "#ffffff",
      numberColor: rawTeam.numberColor ?? rawTeam.secondaryColor ?? "#ffffff",
      assets: rawTeam.assets ?? {},
      isHome,
      forwards,
      defense,
      players,
      playerById,
      goalies: [goalie, backup].filter(Boolean),
      starterId: goalie.id,
      goalie,
      backup,
      forwardLines,
      defensePairs,
      specialTeams: { pp1, pp2, pk1, pk2 },
      overtimeUnits: [
        [overtimeForwards[0]?.id, overtimeForwards[1]?.id, overtimeDefense[0]?.id].filter(Boolean),
        [overtimeForwards[2]?.id, overtimeForwards[3]?.id, overtimeDefense[1]?.id].filter(Boolean),
        [overtimeForwards[4]?.id, overtimeForwards[5]?.id, overtimeDefense[2]?.id].filter(Boolean)
      ],
      shootoutOrder
    };
  }

  buildSkater(player, teamId) {
    const tier = player.position.includes("D") ? player.pair : player.line;
    const r = (...labels) => this.ratingFrom(player, labels);
    const familiarity = this.positionFamiliarity(player);
    const awareness = (value) => Math.round(value * familiarity * 10) / 10;

    return {
      ...player,
      teamId,
      usageTier: tier,
      overall: Number.isFinite(Number(player.overall)) ? Number(player.overall) : r("Overall"),
      deking: r("Deking"),
      handEye: r("Hand Eye", "Hand-Eye"),
      passing: awareness(r("Passing")),
      puckControl: awareness(r("Puck Control")),
      discipline: r("Discipline"),
      offensiveAwareness: awareness(r("Off. Awareness", "Offensive Awareness")),
      poise: r("Poise"),
      slapShotAccuracy: r("Slap Shot Accuracy", "Slap Shot Acc."),
      slapShotPower: r("Slap Shot Power"),
      wristShotAccuracy: r("Wrist Shot Accuracy", "Wrist Shot Acc."),
      wristShotPower: r("Wrist Shot Power"),
      defensiveAwareness: awareness(r("Def. Awareness", "Defensive Awareness")),
      faceoffs: r("Faceoffs"),
      shotBlocking: r("Shot Blocking"),
      stickChecking: r("Stick Checking"),
      acceleration: r("Acceleration"),
      agility: r("Agility"),
      balance: r("Balance"),
      endurance: r("Endurance"),
      speed: r("Speed"),
      aggressiveness: r("Aggressiveness"),
      bodyChecking: r("Body Checking"),
      durability: r("Durability"),
      fightingSkill: r("Fighting Skill"),
      strength: r("Strength"),
      age: Number.isFinite(Number(player.age)) ? Number(player.age) : null,
      heightIn: Number.isFinite(Number(player.heightIn)) ? Number(player.heightIn) : null,
      weight: Number.isFinite(Number(player.weight)) ? Number(player.weight) : null,
      positionFamiliarity: familiarity,
      ratingSource: Object.keys(player.ratings || {}).length ? "avhl-csv" : "overall-fallback",
      fatigue: 0,
      stats: this.blankSkaterStats()
    };
  }

  buildGoalie(goalie, teamId) {
    const r = (...labels) => this.ratingFrom(goalie, labels);
    return {
      ...goalie,
      teamId,
      position: "G",
      overall: Number.isFinite(Number(goalie.overall)) ? Number(goalie.overall) : r("Overall"),
      angles: r("Angles"),
      breakaway: r("Breakaway"),
      fiveHole: r("Five Hole"),
      gloveHigh: r("Glove High"),
      gloveLow: r("Glove Low"),
      stickHigh: r("Stick High"),
      stickLow: r("Stick Low"),
      passing: r("Passing"),
      poise: r("Poise"),
      pokeCheck: r("Poke Check"),
      puckPlayingFrequency: r("Puck Playing Freq.", "Puck Playing Frequency"),
      reboundControl: r("Rebound Control"),
      recover: r("Recover"),
      aggressiveness: r("Aggressiveness"),
      agility: r("Agility"),
      durability: r("Durability"),
      endurance: r("Endurance"),
      speed: r("Speed"),
      vision: r("Vision"),
      age: Number.isFinite(Number(goalie.age)) ? Number(goalie.age) : null,
      heightIn: Number.isFinite(Number(goalie.heightIn)) ? Number(goalie.heightIn) : null,
      weight: Number.isFinite(Number(goalie.weight)) ? Number(goalie.weight) : null,
      ratingSource: Object.keys(goalie.ratings || {}).length ? "avhl-csv" : "overall-fallback",
      fatigue: 0,
      stats: this.blankGoalieStats()
    };
  }

  blankSkaterStats() {
    return {
      goals: 0,
      assists: 0,
      points: 0,
      shots: 0,
      attempts: 0,
      misses: 0,
      blocksAgainst: 0,
      hits: 0,
      giveaways: 0,
      takeaways: 0,
      faceoffWins: 0,
      faceoffLosses: 0,
      penaltyMinutes: 0,
      plusMinus: 0,
      powerPlayGoals: 0,
      shorthandedGoals: 0,
      toi: 0,
      evToi: 0,
      ppToi: 0,
      shToi: 0,
      otToi: 0,
      shifts: 0,
      longestShift: 0,
      currentShift: 0
    };
  }

  blankGoalieStats() {
    return {
      shotsAgainst: 0,
      saves: 0,
      goalsAgainst: 0,
      toi: 0,
      shootoutShotsAgainst: 0,
      shootoutSaves: 0,
      shootoutGoalsAgainst: 0,
      emptyNetGoals: 0,
      penaltyMinutes: 0,
      goals: 0,
      assists: 0,
      points: 0
    };
  }

  powerPlayScore(player) {
    return (
      player.offensiveAwareness * 1.25 +
      player.passing * 1.1 +
      player.puckControl +
      player.wristShotAccuracy +
      player.slapShotAccuracy * 0.8 +
      player.handEye * 0.75 +
      player.poise * 0.65 +
      player.speed * 0.35
    );
  }

  penaltyKillScore(player) {
    return (
      player.defensiveAwareness * 1.25 +
      player.stickChecking * 1.1 +
      player.shotBlocking +
      player.endurance * 0.7 +
      player.speed * 0.55 +
      player.discipline * 0.55 +
      player.faceoffs * 0.45
    );
  }

  overtimeScore(player) {
    return (
      player.speed +
      player.acceleration +
      player.puckControl +
      player.passing * 0.75 +
      player.offensiveAwareness +
      player.defensiveAwareness * 0.55 +
      player.poise * 0.6
    );
  }

  shootoutScore(player) {
    return (
      player.deking * 1.2 +
      player.puckControl +
      player.poise +
      player.wristShotAccuracy +
      player.handEye * 0.5
    );
  }

  makePowerPlayUnit(pool) {
    const forwards = pool.filter((player) => !player.position.includes("D"));
    const defense = pool.filter((player) => player.position.includes("D"));
    const unit = [...forwards.slice(0, 4), ...defense.slice(0, 1)];

    if (unit.length < 5) {
      const remaining = pool.filter((player) => !unit.includes(player));
      unit.push(...remaining.slice(0, 5 - unit.length));
    }

    return unit.map((player) => player.id);
  }

  resetStats() {
    Object.values(this.teams).forEach((team) => {
      team.players.forEach((player) => {
        player.stats = this.blankSkaterStats();
        player.fatigue = 0;
      });
      for (const goalie of team.goalies) {
        goalie.stats = this.blankGoalieStats();
        goalie.fatigue = 0;
      }
      team.goalie = team.goalies.find((goalie) => goalie.id === team.starterId) ?? team.goalies[0];
      team.backup = team.goalies.find((goalie) => goalie.id !== team.goalie?.id) ?? null;
    });
  }

  createInitialState() {
    return {
      period: 1,
      periodLength: 1200,
      clock: 1200,
      absoluteTime: 0,
      score: { [this.homeId]: 0, [this.awayId]: 0 },
      shots: { [this.homeId]: 0, [this.awayId]: 0 },
      attempts: { [this.homeId]: 0, [this.awayId]: 0 },
      hits: { [this.homeId]: 0, [this.awayId]: 0 },
      faceoffs: { [this.homeId]: 0, [this.awayId]: 0 },
      pim: { [this.homeId]: 0, [this.awayId]: 0 },
      passAttempts: { [this.homeId]: 0, [this.awayId]: 0 },
      passCompletions: { [this.homeId]: 0, [this.awayId]: 0 },
      timeOnAttack: { [this.homeId]: 0, [this.awayId]: 0 },
      powerPlayOpportunities: { [this.homeId]: 0, [this.awayId]: 0 },
      powerPlayGoals: { [this.homeId]: 0, [this.awayId]: 0 },
      powerPlayTime: { [this.homeId]: 0, [this.awayId]: 0 },
      shorthandedGoals: { [this.homeId]: 0, [this.awayId]: 0 },
      activePenalties: [],
      injuries: [],
      possessionTeam: null,
      puckCarrierId: null,
      puck: { x: 100, y: 42.5 },
      zone: "NZ",
      lastContext: "faceoff",
      assistQueue: [],
      onIce: { [this.homeId]: [], [this.awayId]: [] },
      currentForwardLine: { [this.homeId]: 0, [this.awayId]: 0 },
      currentDefensePair: { [this.homeId]: 0, [this.awayId]: 0 },
      forwardRotationIndex: { [this.homeId]: 0, [this.awayId]: 0 },
      defenseRotationIndex: { [this.homeId]: 0, [this.awayId]: 0 },
      specialRotationIndex: { [this.homeId]: 0, [this.awayId]: 0 },
      otRotationIndex: { [this.homeId]: 0, [this.awayId]: 0 },
      shiftAge: { [this.homeId]: 0, [this.awayId]: 0 },
      shiftTarget: {
        [this.homeId]: this.random.range(38, 53),
        [this.awayId]: this.random.range(38, 53)
      },
      positions: {},
      movementOverrides: {},
      replayBuffer: [],
      nextFaceoff: null,
      reboundDepth: 0,
      gameOver: false,
      shootout: null
    };
  }

  snapshotTotals(state) {
    return {
      period: state.period,
      clock: state.clock,
      score: { ...state.score },
      shots: { ...state.shots },
      attempts: { ...state.attempts },
      hits: { ...state.hits },
      faceoffs: { ...state.faceoffs },
      pim: { ...state.pim },
      passAttempts: { ...state.passAttempts },
      passCompletions: { ...state.passCompletions },
      timeOnAttack: { ...state.timeOnAttack },
      powerPlayOpportunities: { ...state.powerPlayOpportunities },
      powerPlayGoals: { ...state.powerPlayGoals },
      powerPlayTime: { ...state.powerPlayTime },
      shorthandedGoals: { ...state.shorthandedGoals },
      strength: this.strengthLabel(state)
    };
  }

  addEvent(state, type, text, options = {}) {
    const event = {
      id: ++this.eventId,
      type,
      text,
      teamId: options.teamId ?? null,
      playerId: options.playerId ?? null,
      secondaryPlayerId: options.secondaryPlayerId ?? null,
      location: options.location ? { ...options.location } : null,
      mapType: options.mapType ?? null,
      outcome: options.outcome ?? null,
      details: options.details ? this.clone(options.details) : null,
      replay: options.replay ?? null,
      spatial: options.spatial ?? this.captureSpatialState(state),
      periodLabel: this.periodLabel(state.period),
      clockText: this.formatClock(state.clock),
      absoluteTime: state.absoluteTime,
      ...this.snapshotTotals(state)
    };
    this.events.push(event);
    return event;
  }

  attackDirection(teamId, period) {
    const homeAttacksPositive = period === 1 || period === 3;
    if (teamId === this.homeId) return homeAttacksPositive ? 1 : -1;
    return homeAttacksPositive ? -1 : 1;
  }

  ownGoalX(teamId, period) {
    return this.attackDirection(teamId, period) === 1 ? 8 : 192;
  }

  attackingGoalX(teamId, period) {
    return this.attackDirection(teamId, period) === 1 ? 192 : 8;
  }

  zoneForTeam(x, teamId, period) {
    const direction = this.attackDirection(teamId, period);
    if (direction === 1) {
      if (x < 75) return "DZ";
      if (x > 125) return "OZ";
      return "NZ";
    }
    if (x > 125) return "DZ";
    if (x < 75) return "OZ";
    return "NZ";
  }

  captureSpatialState(state) {
    const positions = {};
    for (const [id, pos] of Object.entries(state.positions ?? {})) {
      positions[id] = { x: pos.x, y: pos.y, vx: pos.vx ?? 0, vy: pos.vy ?? 0 };
    }
    return {
      puck: { ...(state.puck ?? { x: 100, y: 42.5 }) },
      puckCarrierId: state.puckCarrierId ?? null,
      possessionTeam: state.possessionTeam ?? null,
      onIce: {
        [this.homeId]: [...(state.onIce?.[this.homeId] ?? [])],
        [this.awayId]: [...(state.onIce?.[this.awayId] ?? [])]
      },
      positions
    };
  }

  attackingBlueLine(teamId, period) {
    return this.attackDirection(teamId, period) === 1 ? AVHL_RINK.blueLines.high : AVHL_RINK.blueLines.low;
  }

  isBeyondLine(x, lineX, direction, margin = 0) {
    return direction === 1 ? x > lineX + margin : x < lineX - margin;
  }

  isBeforeLine(x, lineX, direction, margin = 0) {
    return direction === 1 ? x < lineX - margin : x > lineX + margin;
  }

  spatialOffsideOffenders(state, teamId) {
    const direction = this.attackDirection(teamId, state.period);
    const blueLine = this.attackingBlueLine(teamId, state.period);
    if (!this.isBeforeLine(state.puck.x, blueLine, direction, -0.05)) return [];
    return state.onIce[teamId].filter((id) => {
      if (id === state.puckCarrierId) return false;
      const pos = state.positions[id];
      return pos && this.isBeyondLine(pos.x, blueLine, direction, 0.35);
    });
  }

  whistleForOffside(state, teamId, offenderIds = []) {
    const direction = this.attackDirection(teamId, state.period);
    const line = this.attackingBlueLine(teamId, state.period);
    const neutralSpotX = direction === 1 ? 120 : 80;
    const y = state.puck.y < 42.5 ? 22 : 63;
    const offender = offenderIds.length ? this.getPlayerById(offenderIds[0]) : null;
    this.addEvent(
      state,
      "offside",
      offender
        ? `${offender.name} enters the zone ahead of the puck. Offside.`
        : `${this.teams[teamId].name} are offside at the blue line.`,
      {
        teamId,
        playerId: offender?.id ?? null,
        location: { x: line, y },
        details: { offenderIds: [...offenderIds], blueLineX: line, spatialRule: true }
      }
    );
    state.possessionTeam = null;
    state.puckCarrierId = null;
    state.assistQueue = [];
    state.puck = { x: line, y };
    state.nextFaceoff = { x: neutralSpotX, y, reason: "offside" };
    state.lastContext = "offside";
    return true;
  }

  recentEvent(predicate, maxAgeSeconds = 2.25, state = null) {
    const now = state?.absoluteTime ?? this.events.at(-1)?.absoluteTime ?? 0;
    for (let i = this.events.length - 1; i >= 0; i -= 1) {
      const event = this.events[i];
      if (now - event.absoluteTime > maxAgeSeconds) break;
      if (predicate(event)) return event;
    }
    return null;
  }

  isBreakawayState(state, teamId, carrierId = state.puckCarrierId) {
    const carrier = this.getPlayerById(carrierId);
    const carrierPos = state.positions[carrierId] ?? state.puck;
    if (!carrier || !carrierPos) return false;
    const direction = this.attackDirection(teamId, state.period);
    const defendingTeamId = this.opponent(teamId);
    const goalX = this.attackingGoalX(teamId, state.period);
    const defenders = state.onIce[defendingTeamId]
      .map((id) => ({ id, player: this.teams[defendingTeamId].playerById[id], pos: state.positions[id] }))
      .filter((entry) => entry.player && entry.pos);
    const defendersBetween = defenders.filter((entry) => {
      const ahead = direction === 1 ? entry.pos.x > carrierPos.x : entry.pos.x < carrierPos.x;
      const lateralGap = Math.abs(entry.pos.y - carrierPos.y);
      return ahead && lateralGap < 18;
    });
    const frontDepth = (goalX - carrierPos.x) * direction;
    return frontDepth > 4 && frontDepth < 72 && defendersBetween.length === 0;
  }

  validateShotContext(state, teamId, shooter, requestedContext) {
    let context = requestedContext ?? state.lastContext ?? "cycle";
    const now = state.absoluteTime;
    if (context === "one-timer") {
      const setup = this.recentEvent(
        (event) => event.type === "pass" && event.teamId === teamId && event.secondaryPlayerId === shooter.id,
        1.65,
        state
      );
      if (!setup) context = "cycle";
    }
    if (context === "rebound") {
      const save = this.recentEvent(
        (event) => event.type === "shot" && event.outcome === "save" && event.teamId === teamId && event.details?.reboundLocation,
        2.2,
        state
      );
      if (!save) context = "cycle";
    }
    if (context === "breakaway" && !this.isBreakawayState(state, teamId, shooter.id)) {
      context = "rush";
    }
    if (context === "rush" && this.isBreakawayState(state, teamId, shooter.id)) {
      context = "breakaway";
    }
    return context;
  }

  strengthCounts(state) {
    const base = state.period === 4 ? 3 : 5;
    const counts = { [this.homeId]: base, [this.awayId]: base };

    for (const teamId of [this.homeId, this.awayId]) {
      const active = state.activePenalties.filter(
        (penalty) => penalty.teamId === teamId && penalty.affectsStrength && penalty.remaining > 0
      ).length;
      counts[teamId] = Math.max(state.period === 4 ? 2 : 3, base - active);
    }

    return counts;
  }

  strengthLabel(state) {
    if (state.period === "SO") return "Shootout";
    const counts = this.strengthCounts(state);
    return `${counts[this.homeId]}-on-${counts[this.awayId]}`;
  }

  teamSituation(state, teamId) {
    const counts = this.strengthCounts(state);
    const opponentId = this.opponent(teamId);
    if (counts[teamId] > counts[opponentId]) return "PP";
    if (counts[teamId] < counts[opponentId]) return "PK";
    return state.period === 4 ? "OT" : "EV";
  }

  unavailablePlayerIds(state, teamId) {
    const ids = new Set(
      state.activePenalties
        .filter((penalty) => penalty.teamId === teamId && penalty.playerId && penalty.remaining > 0)
        .map((penalty) => penalty.playerId)
    );
    for (const injury of state.injuries ?? []) {
      if (injury.teamId === teamId && injury.playerId) ids.add(injury.playerId);
    }
    return ids;
  }

  injuryRiskMultiplier(player) {
    const durability = Number(player?.durability) || 80;
    const fatigue = this.clamp(Number(player?.fatigue) || 0, 0, 1);
    const age = Number(player?.age);
    const durabilityFactor = 1 + (82 - durability) * 0.035;
    const fatigueFactor = 1 + fatigue * 0.55;
    const ageFactor = Number.isFinite(age) ? 1 + Math.max(0, age - 30) * 0.008 : 1;
    return this.clamp(durabilityFactor * fatigueFactor * ageFactor, 0.48, 2.15);
  }

  injuryBodyArea(cause, player) {
    const pools = {
      hit: [["Upper body", 30], ["Lower body", 30], ["Shoulder", 14], ["Head", 10], ["Back", 8], ["Hand/Wrist", 8]],
      block: [["Hand/Wrist", 31], ["Foot/Ankle", 29], ["Lower body", 20], ["Upper body", 12], ["Knee", 8]],
      fight: [["Hand/Wrist", 31], ["Upper body", 28], ["Head", 20], ["Shoulder", 12], ["Lower body", 9]],
      fatigue: [["Lower body", 45], ["Groin/Hip", 24], ["Back", 17], ["Upper body", 8], ["Knee", 6]],
      goalie: [["Lower body", 34], ["Groin/Hip", 27], ["Knee", 13], ["Upper body", 13], ["Head", 7], ["Hand/Wrist", 6]]
    };
    const pool = pools[cause] ?? pools.hit;
    return this.injuryRandom.weightedChoice(pool, ([, weight]) => weight)[0];
  }

  injuryDuration(player, impact = 1) {
    const durability = Number(player?.durability) || 80;
    const age = Number(player?.age);
    const durabilityShift = this.clamp((82 - durability) * 0.006, -0.08, 0.16);
    const impactShift = this.clamp((impact - 1) * 0.07, -0.05, 0.13);
    const ageShift = Number.isFinite(age) ? this.clamp(Math.max(0, age - 31) * 0.0025, 0, 0.035) : 0;
    const roll = this.injuryRandom.next() + durabilityShift + impactShift + ageShift;

    if (roll < 0.46) return { severity: "day-to-day", gamesMissed: this.injuryRandom.integer(1, 2) };
    if (roll < 0.78) return { severity: "minor", gamesMissed: this.injuryRandom.integer(3, 5) };
    if (roll < 0.94) return { severity: "moderate", gamesMissed: this.injuryRandom.integer(6, 12) };
    if (roll < 0.99) return { severity: "major", gamesMissed: this.injuryRandom.integer(13, 24) };
    return { severity: "severe", gamesMissed: this.injuryRandom.integer(25, 45) };
  }

  substituteInjuredGoalie(state, teamId, injuredGoalie) {
    const team = this.teams[teamId];
    const replacement = team.goalies.find(
      (goalie) => goalie.id !== injuredGoalie.id && !(state.injuries ?? []).some((injury) => injury.playerId === goalie.id)
    );
    if (!replacement) return false;

    const oldPosition = state.positions[injuredGoalie.id] ?? this.defaultPositionForPlayer(state, teamId, injuredGoalie.id, 0);
    team.goalie = replacement;
    team.backup = injuredGoalie;
    state.positions[replacement.id] = { ...oldPosition, vx: 0, vy: 0 };
    delete state.positions[injuredGoalie.id];
    this.addEvent(
      state,
      "goalie-change",
      `${replacement.name} replaces ${injuredGoalie.name} in goal after the injury.`,
      { teamId, playerId: replacement.id, secondaryPlayerId: injuredGoalie.id, location: { x: oldPosition.x, y: oldPosition.y } }
    );
    return true;
  }

  registerInjury(state, player, cause, impact = 1, location = state.puck, extra = {}) {
    if (!player || (state.injuries ?? []).some((injury) => injury.playerId === player.id)) return null;
    if (player.position === "G") {
      const team = this.teams[player.teamId];
      const healthyBackup = team.goalies.some(
        (goalie) => goalie.id !== player.id && !(state.injuries ?? []).some((injury) => injury.playerId === goalie.id)
      );
      if (!healthyBackup) return null;
    }

    const duration = this.injuryDuration(player, impact);
    const bodyArea = this.injuryBodyArea(cause, player);
    const injury = {
      id: `injury-${this.eventId + 1}-${player.id}`,
      teamId: player.teamId,
      playerId: player.id,
      avhlId: player.avhlId ?? null,
      playerName: player.name,
      position: player.position,
      cause,
      bodyArea,
      severity: duration.severity,
      gamesMissed: duration.gamesMissed,
      durability: player.durability,
      fatigue: Math.round((player.fatigue || 0) * 1000) / 1000,
      period: state.period,
      clock: state.clock,
      clockText: this.formatClock(state.clock),
      absoluteTime: state.absoluteTime,
      impact: Math.round(impact * 1000) / 1000,
      ...extra
    };
    state.injuries.push(injury);

    this.addEvent(
      state,
      "injury",
      `INJURY — ${player.name}: ${bodyArea}, expected to miss ${duration.gamesMissed} game${duration.gamesMissed === 1 ? "" : "s"}.`,
      {
        teamId: player.teamId,
        playerId: player.id,
        location: location ? { ...location } : null,
        outcome: duration.severity,
        details: this.clone(injury)
      }
    );

    if (player.position === "G") {
      this.substituteInjuredGoalie(state, player.teamId, player);
    } else {
      const wasCarrier = state.puckCarrierId === player.id;
      this.refreshUnits(state, false);
      delete state.positions[player.id];
      if (wasCarrier) {
        state.possessionTeam = null;
        state.puckCarrierId = null;
        state.assistQueue = [];
      }
    }
    return injury;
  }

  maybeCauseInjury(state, player, { cause = "hit", baseProbability = 0, impact = 1, location = state.puck, extra = {} } = {}) {
    if (!player || baseProbability <= 0) return null;
    if ((state.injuries ?? []).some((injury) => injury.playerId === player.id)) return null;
    const probability = this.clamp(baseProbability * this.injuryRiskMultiplier(player) * this.clamp(impact, 0.35, 2.8), 0, 0.12);
    if (!this.injuryRandom.chance(probability)) return null;
    return this.registerInjury(state, player, cause, impact, location, { probability: Math.round(probability * 1000000) / 1000000, ...extra });
  }

  maybeShiftInjuries(state, teamId, outgoingIds) {
    const team = this.teams[teamId];
    for (const id of outgoingIds) {
      const player = team.playerById[id];
      if (!player || id === state.puckCarrierId || player.stats.currentShift < 50 || player.fatigue < 0.075) continue;
      const workload = this.clamp(Math.pow(player.stats.currentShift / 55, 1.35) * (0.45 + player.fatigue * 1.3), 0.45, 3.2);
      this.maybeCauseInjury(state, player, {
        cause: "fatigue",
        baseProbability: 0.000075,
        impact: workload,
        location: state.positions[player.id] ?? state.puck,
        extra: { shiftSeconds: Math.round(player.stats.currentShift * 10) / 10 }
      });
    }
  }

  maybeGoalieCollisionInjury(state, goalie, shot) {
    const close = ["crease", "low slot", "goal line", "behind net"].includes(shot.region);
    if (!close && shot.context !== "breakaway") return null;
    let baseProbability = 0.00035;
    if (shot.technique.includes("jam") || shot.technique.includes("wraparound")) baseProbability = 0.0018;
    else if (shot.region === "crease") baseProbability = 0.00115;
    else if (shot.context === "breakaway") baseProbability = 0.00075;
    const impact = this.clamp(0.75 + shot.pressure * 0.35 + (shot.technique.includes("jam") ? 0.5 : 0), 0.6, 1.8);
    return this.maybeCauseInjury(state, goalie, {
      cause: "goalie",
      baseProbability,
      impact,
      location: { x: this.ownGoalX(goalie.teamId, state.period), y: 42.5 },
      extra: { shotRegion: shot.region, shotTechnique: shot.technique }
    });
  }

  tryGoaliePuckPlay(state, goalie, reboundLocation, attackingTeamId) {
    if (!goalie || !reboundLocation || state.nextFaceoff) return false;
    const defendingTeamId = goalie.teamId;
    const pressure = this.localPressure(state, goalie, attackingTeamId);
    const willingness = this.clamp(
      0.12 + (goalie.puckPlayingFrequency - 75) * 0.012 + (goalie.poise - 80) * 0.003 - pressure * 0.22,
      0.04,
      0.56
    );
    if (!this.random.chance(willingness)) return false;

    const recipient = this.chooseOnIcePlayer(
      state,
      defendingTeamId,
      (player) => player.defensiveAwareness * 0.4 + player.passing * 0.28 + player.puckControl * 0.2 + player.speed * 0.12
    );
    if (!recipient) return false;
    const success = this.clamp(
      0.72 + (goalie.passing - 80) * 0.009 + (goalie.poise - 80) * 0.004 - pressure * 0.18,
      0.48,
      0.93
    );
    if (!this.random.chance(success)) return false;

    const pickup = state.positions[recipient.id] ?? reboundLocation;
    state.puck = { x: pickup.x, y: pickup.y };
    this.setPossession(state, defendingTeamId, recipient.id, true);
    state.lastContext = "goalie-play";
    this.addEvent(
      state,
      "goalie-play",
      `${goalie.name} settles the puck and moves it to ${recipient.name}.`,
      {
        teamId: defendingTeamId,
        playerId: goalie.id,
        secondaryPlayerId: recipient.id,
        location: { ...state.puck },
        details: { willingness, successProbability: success, pressure }
      }
    );
    return true;
  }

  chooseUnit(state, teamId, forceRotate = false) {
    const team = this.teams[teamId];
    const situation = this.teamSituation(state, teamId);
    const unavailable = this.unavailablePlayerIds(state, teamId);
    let desired = [];

    if (situation === "OT") {
      if (forceRotate) state.otRotationIndex[teamId] += 1;
      desired = team.overtimeUnits[state.otRotationIndex[teamId] % team.overtimeUnits.length] ?? [];
    } else if (situation === "PP") {
      if (forceRotate) state.specialRotationIndex[teamId] += 1;
      desired = state.specialRotationIndex[teamId] % 2 === 0
        ? team.specialTeams.pp1
        : team.specialTeams.pp2;
    } else if (situation === "PK") {
      if (forceRotate) state.specialRotationIndex[teamId] += 1;
      desired = state.specialRotationIndex[teamId] % 2 === 0
        ? team.specialTeams.pk1
        : team.specialTeams.pk2;
    } else {
      const forwardPattern = [0, 1, 0, 2, 1, 0, 3, 1, 2];
      const defensePattern = [0, 1, 0, 2, 1];
      if (forceRotate) {
        state.forwardRotationIndex[teamId] += 1;
        state.defenseRotationIndex[teamId] += 1;
      }
      const lineIndex = forwardPattern[state.forwardRotationIndex[teamId] % forwardPattern.length];
      const pairIndex = defensePattern[state.defenseRotationIndex[teamId] % defensePattern.length];
      state.currentForwardLine[teamId] = lineIndex;
      state.currentDefensePair[teamId] = pairIndex;
      desired = [...team.forwardLines[lineIndex], ...team.defensePairs[pairIndex]];
    }

    const needed = this.strengthCounts(state)[teamId];
    const eligible = desired.filter((id) => !unavailable.has(id));
    const remaining = team.players
      .filter((player) => !unavailable.has(player.id) && !eligible.includes(player.id))
      .sort((a, b) => {
        const scoreA = situation === "PK" ? this.penaltyKillScore(a) : this.powerPlayScore(a);
        const scoreB = situation === "PK" ? this.penaltyKillScore(b) : this.powerPlayScore(b);
        return scoreB - scoreA;
      })
      .map((player) => player.id);

    return [...eligible, ...remaining].slice(0, needed);
  }

  setOnIce(state, teamId, playerIds, countShift = true) {
    const team = this.teams[teamId];
    const previous = new Set(state.onIce[teamId]);
    const resolvedIds = [...playerIds];

    // A puck carrier cannot disappear during a line change. If a safe-change
    // decision selects a unit without the active carrier, keep that player on
    // and replace the final skater in the proposed unit for this shift only.
    if (
      state.possessionTeam === teamId &&
      state.puckCarrierId &&
      team.playerById[state.puckCarrierId] &&
      !resolvedIds.includes(state.puckCarrierId)
    ) {
      resolvedIds[Math.max(0, resolvedIds.length - 1)] = state.puckCarrierId;
    }

    state.onIce[teamId] = [...new Set(resolvedIds)];

    if (countShift) {
      for (const id of state.onIce[teamId]) {
        const player = team.playerById[id];
        if (!previous.has(id) && player) {
          player.stats.shifts += 1;
          player.stats.currentShift = 0;
        }
      }
    }

    state.shiftAge[teamId] = 0;
    state.shiftTarget[teamId] = this.random.range(38, 55);
    this.ensureCurrentPositions(state, teamId);
  }

  refreshUnits(state, forceRotate = false) {
    for (const teamId of [this.homeId, this.awayId]) {
      const desired = this.chooseUnit(state, teamId, forceRotate);
      const changed = desired.join("|") !== state.onIce[teamId].join("|");
      if (changed) this.setOnIce(state, teamId, desired, true);
    }
  }

  relativeDepthFromOwnGoal(state, teamId, point = state.puck) {
    const direction = this.attackDirection(teamId, state.period);
    return (point.x - this.ownGoalX(teamId, state.period)) * direction;
  }

  deepZonePlayActive(state) {
    if (state.nextFaceoff) return false;
    // Treat any live puck below the dots as unsafe for a five-man line swap,
    // including rebound scrambles where possession is temporarily null.
    const lowDepth = Math.abs(state.puck.x - AVHL_RINK.goalLines.low);
    const highDepth = Math.abs(state.puck.x - AVHL_RINK.goalLines.high);
    return Math.min(lowDepth, highDepth) <= 34;
  }

  goalCageRects(padding = 0) {
    const halfWidth = 4.2 + padding;
    const depth = 4.4 + padding;
    const centerY = AVHL_RINK.height / 2;
    return [
      {
        end: "low",
        minX: AVHL_RINK.goalLines.low - depth,
        maxX: AVHL_RINK.goalLines.low + padding,
        minY: centerY - halfWidth,
        maxY: centerY + halfWidth,
        frontX: AVHL_RINK.goalLines.low + padding
      },
      {
        end: "high",
        minX: AVHL_RINK.goalLines.high - padding,
        maxX: AVHL_RINK.goalLines.high + depth,
        minY: centerY - halfWidth,
        maxY: centerY + halfWidth,
        frontX: AVHL_RINK.goalLines.high - padding
      }
    ];
  }

  pointInsideRect(point, rect) {
    return point.x > rect.minX && point.x < rect.maxX && point.y > rect.minY && point.y < rect.maxY;
  }

  constrainPlayerPoint(previous, proposed, player = null) {
    const goalie = player?.position === "G";
    const minX = goalie ? 4 : 2.5;
    const maxX = goalie ? 196 : 197.5;
    const minY = goalie ? 2.5 : 2.5;
    const maxY = goalie ? 82.5 : 82.5;
    const padding = goalie ? 0.35 : 0.8;
    const epsilon = 0.03;
    const point = {
      x: this.clamp(proposed.x, minX, maxX),
      y: this.clamp(proposed.y, minY, maxY)
    };

    for (const rect of this.goalCageRects(padding)) {
      if (!this.pointInsideRect(point, rect)) continue;

      // Preserve the side from which the player approached the cage. This
      // makes the goal frame a real obstruction while still allowing skating
      // behind the net by going around either post.
      if (previous && previous.x <= rect.minX) point.x = rect.minX - epsilon;
      else if (previous && previous.x >= rect.maxX) point.x = rect.maxX + epsilon;
      else if (previous && previous.y <= rect.minY) point.y = rect.minY - epsilon;
      else if (previous && previous.y >= rect.maxY) point.y = rect.maxY + epsilon;
      else if (goalie) point.x = rect.end === "low" ? rect.maxX + epsilon : rect.minX - epsilon;
      else {
        const exits = [
          { axis: "x", value: rect.minX - epsilon, distance: Math.abs(point.x - rect.minX) },
          { axis: "x", value: rect.maxX + epsilon, distance: Math.abs(rect.maxX - point.x) },
          { axis: "y", value: rect.minY - epsilon, distance: Math.abs(point.y - rect.minY) },
          { axis: "y", value: rect.maxY + epsilon, distance: Math.abs(rect.maxY - point.y) }
        ].sort((a, b) => a.distance - b.distance);
        point[exits[0].axis] = exits[0].value;
      }
    }
    return point;
  }

  constrainLivePuckPoint(previous, proposed) {
    const point = {
      x: this.clamp(proposed.x, 1, 199),
      y: this.clamp(proposed.y, 1, 84)
    };
    const epsilon = 0.03;
    for (const rect of this.goalCageRects(0.05)) {
      if (!this.pointInsideRect(point, rect)) continue;
      if (previous && previous.x <= rect.minX) point.x = rect.minX - epsilon;
      else if (previous && previous.x >= rect.maxX) point.x = rect.maxX + epsilon;
      else if (previous && previous.y <= rect.minY) point.y = rect.minY - epsilon;
      else if (previous && previous.y >= rect.maxY) point.y = rect.maxY + epsilon;
      else {
        const exits = [
          { axis: "x", value: rect.minX - epsilon, distance: Math.abs(point.x - rect.minX) },
          { axis: "x", value: rect.maxX + epsilon, distance: Math.abs(rect.maxX - point.x) },
          { axis: "y", value: rect.minY - epsilon, distance: Math.abs(point.y - rect.minY) },
          { axis: "y", value: rect.maxY + epsilon, distance: Math.abs(rect.maxY - point.y) }
        ].sort((a, b) => a.distance - b.distance);
        point[exits[0].axis] = exits[0].value;
      }
    }
    return point;
  }

  routeAnchorAroundNet(current, target, player = null) {
    const padding = player?.position === "G" ? 0.35 : 0.8;
    const constrainedTarget = this.constrainPlayerPoint(current, target, player);
    for (const rect of this.goalCageRects(padding)) {
      if (!this.segmentIntersectsRect(current, constrainedTarget, rect)) continue;

      const currentInFront = rect.end === "low" ? current.x >= rect.maxX : current.x <= rect.minX;
      const targetBehind = rect.end === "low" ? constrainedTarget.x < rect.minX : constrainedTarget.x > rect.maxX;
      const currentBehind = rect.end === "low" ? current.x <= rect.minX : current.x >= rect.maxX;
      const targetInFront = rect.end === "low" ? constrainedTarget.x > rect.maxX : constrainedTarget.x < rect.minX;
      if (!(currentInFront && targetBehind) && !(currentBehind && targetInFront)) continue;

      const lowerRoute = Math.abs(current.y - rect.minY) <= Math.abs(current.y - rect.maxY);
      return {
        x: currentInFront
          ? (rect.end === "low" ? rect.maxX + 0.45 : rect.minX - 0.45)
          : (rect.end === "low" ? rect.minX - 0.45 : rect.maxX + 0.45),
        y: lowerRoute ? rect.minY - 1.25 : rect.maxY + 1.25
      };
    }
    return constrainedTarget;
  }

  separatePlayerProposals(state, proposals, active, dt) {
    const entries = active.map((entry) => ({ ...entry, point: proposals.get(entry.id) })).filter((entry) => entry.point);
    const priority = (entry) => entry.player.position === "G" ? 5 : entry.id === state.puckCarrierId ? 3 : 1;

    // Three light relaxation passes remove impossible same-coordinate piles
    // without turning ordinary board battles and net-front contact into a
    // collection of evenly spaced dots.
    for (let iteration = 0; iteration < 3; iteration += 1) {
      for (let aIndex = 0; aIndex < entries.length; aIndex += 1) {
        for (let bIndex = aIndex + 1; bIndex < entries.length; bIndex += 1) {
          const a = entries[aIndex];
          const b = entries[bIndex];
          const sameTeam = a.teamId === b.teamId;
          const goalieContact = a.player.position === "G" || b.player.position === "G";
          const minimum = sameTeam ? (goalieContact ? 4.8 : 4.4) : (goalieContact ? 3.8 : 3.25);
          let dx = b.point.x - a.point.x;
          let dy = b.point.y - a.point.y;
          let distance = Math.hypot(dx, dy);
          if (distance >= minimum) continue;
          if (distance < 0.001) {
            const angle = (AVHLGameSimulator.hashString(`${a.id}:${b.id}`) % 6283) / 1000;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            distance = 1;
          }
          const ux = dx / distance;
          const uy = dy / distance;
          const overlap = minimum - distance;
          const aPriority = priority(a);
          const bPriority = priority(b);
          const totalPriority = aPriority + bPriority;
          const moveA = overlap * (bPriority / totalPriority);
          const moveB = overlap * (aPriority / totalPriority);
          const aPrevious = state.positions[a.id] ?? a.point;
          const bPrevious = state.positions[b.id] ?? b.point;
          const nextA = this.constrainPlayerPoint(aPrevious, {
            x: a.point.x - ux * moveA,
            y: a.point.y - uy * moveA
          }, a.player);
          const nextB = this.constrainPlayerPoint(bPrevious, {
            x: b.point.x + ux * moveB,
            y: b.point.y + uy * moveB
          }, b.player);
          Object.assign(a.point, nextA);
          Object.assign(b.point, nextB);
        }
      }
    }

    for (const entry of entries) {
      const previous = state.positions[entry.id] ?? entry.point;
      entry.point.vx = (entry.point.x - previous.x) / Math.max(0.001, dt);
      entry.point.vy = (entry.point.y - previous.y) / Math.max(0.001, dt);
    }
  }

  maybeChangeLines(state, safeOpportunity = false) {
    let changed = false;
    const deepLivePlay = this.deepZonePlayActive(state);
    for (const teamId of [this.homeId, this.awayId]) {
      const overdue = state.shiftAge[teamId] >= state.shiftTarget[teamId];
      const veryOverdue = state.shiftAge[teamId] >= state.shiftTarget[teamId] + 14;

      // V5.1 changes whole units at once, so never wholesale-swap a unit while
      // the puck is established below the dots. Tired defenders stay engaged
      // until the puck reaches a genuinely safe area or a whistle occurs.
      if (deepLivePlay && !state.nextFaceoff) continue;

      if ((safeOpportunity && overdue) || veryOverdue) {
        const outgoing = [...state.onIce[teamId]];
        this.maybeShiftInjuries(state, teamId, outgoing);
        this.setOnIce(state, teamId, this.chooseUnit(state, teamId, true), true);
        changed = true;
      }
    }
    return changed;
  }

  ensureCurrentPositions(state, teamId) {
    const activeIds = [...state.onIce[teamId], this.teams[teamId].goalie.id];
    for (const [index, id] of activeIds.entries()) {
      if (!state.positions[id]) {
        state.positions[id] = this.defaultPositionForPlayer(state, teamId, id, index);
      }
    }
  }

  defaultPositionForPlayer(state, teamId, playerId, index = 0) {
    const team = this.teams[teamId];
    const player = playerId === team.goalie.id ? team.goalie : team.playerById[playerId];
    const direction = this.attackDirection(teamId, state.period);
    const ownGoal = this.ownGoalX(teamId, state.period);

    if (player?.position === "G") {
      return { x: ownGoal + direction * 3, y: 42.5, vx: 0, vy: 0 };
    }

    const faceoffX = state.puck.x;
    const forward = player && !player.position.includes("D");
    const xOffset = forward ? 8 + (index % 3) * 3 : -10 - (index % 2) * 4;
    const ySlots = [24, 42.5, 61, 31, 54];
    let x = this.clamp(faceoffX + direction * xOffset, 5, 195);
    if (
      state.possessionTeam === teamId &&
      this.zoneForTeam(state.puck.x, teamId, state.period) === "NZ"
    ) {
      const blueLine = this.attackingBlueLine(teamId, state.period);
      const cap = blueLine - direction * 1.4;
      x = direction === 1 ? Math.min(x, cap) : Math.max(x, cap);
    }
    return {
      x,
      y: ySlots[index % ySlots.length],
      vx: 0,
      vy: 0
    };
  }

  initializePeriodPositions(state) {
    state.positions = {};
    for (const teamId of [this.homeId, this.awayId]) {
      this.ensureCurrentPositions(state, teamId);
    }
    state.puck = { x: 100, y: 42.5 };
    this.recordSpatialSnapshot(state);
  }

  offensiveZoneForwardAnchor(state, teamId, player) {
    const direction = this.attackDirection(teamId, state.period);
    const goalLineX = direction === 1 ? AVHL_RINK.goalLines.high : AVHL_RINK.goalLines.low;
    const puck = state.puck;
    const team = this.teams[teamId];
    const forwards = state.onIce[teamId]
      .map((id) => team.playerById[id])
      .filter((candidate) => candidate && !candidate.position.includes("D"));
    const nonCarrier = forwards.filter((candidate) => candidate.id !== state.puckCarrierId);
    const roleIndex = Math.max(0, nonCarrier.findIndex((candidate) => candidate.id === player.id));
    const puckSide = puck.y < 42.5 ? -1 : 1;

    // Settled offense keeps clear levels. The puck carrier may work below the
    // goal line, but teammates recover to net-front, slot, and high support
    // instead of all drifting behind the cage. Actual broken plays can still
    // temporarily violate these anchors because movement remains continuous.
    if (roleIndex === 0) {
      return {
        x: this.clamp(goalLineX - direction * 7.5, 8, 192),
        y: this.clamp(42.5 - puckSide * 6.5, 31, 54)
      };
    }
    if (roleIndex === 1) {
      return {
        x: this.clamp(goalLineX - direction * 23, 8, 192),
        y: this.clamp(42.5 + puckSide * 2.5, 30, 55)
      };
    }
    return {
      x: this.clamp(goalLineX - direction * 31, 8, 192),
      y: this.clamp(42.5 + puckSide * 14, 18, 67)
    };
  }

  defensiveZoneStructureAnchor(state, teamId, player) {
    const direction = this.attackDirection(teamId, state.period);
    const ownGoal = this.ownGoalX(teamId, state.period);
    const team = this.teams[teamId];
    const opponentId = this.opponent(teamId);
    const opponent = this.teams[opponentId];
    const ownSkaters = state.onIce[teamId]
      .map((id) => team.playerById[id])
      .filter(Boolean);
    const defenders = ownSkaters
      .filter((candidate) => candidate.position.includes("D"))
      .sort((a, b) => {
        const sideDifference = (state.positions[a.id]?.y ?? 42.5) - (state.positions[b.id]?.y ?? 42.5);
        return Math.abs(sideDifference) > 0.1 ? sideDifference : a.id.localeCompare(b.id);
      });
    const forwards = ownSkaters.filter((candidate) => !candidate.position.includes("D"));
    const attackers = state.onIce[opponentId]
      .map((id) => ({ player: opponent.playerById[id], pos: state.positions[id] }))
      .filter((entry) => entry.player && entry.pos)
      .map((entry) => {
        const depth = this.relativeDepthFromOwnGoal(state, teamId, entry.pos);
        const centrality = Math.abs(entry.pos.y - 42.5);
        const carrierBonus = entry.player.id === state.puckCarrierId ? 24 : 0;
        const behindBonus = depth < 3 ? 10 : 0;
        const score = 120 - Math.max(-8, depth) * 1.55 - centrality * 0.72 + carrierBonus + behindBonus;
        return { ...entry, depth, score };
      })
      .filter((entry) => entry.depth <= 45)
      .sort((a, b) => b.score - a.score);

    const markPoint = (threat, separation = 3.2, laneOffset = 0) => {
      if (!threat) return null;
      if (threat.depth < 3.5) {
        const fallbackSign = laneOffset < 0 ? -1 : 1;
        const side = Math.abs(threat.pos.y - 42.5) > 1.2
          ? (threat.pos.y < 42.5 ? -1 : 1)
          : fallbackSign;
        return {
          x: this.clamp(ownGoal + direction * 3.2, 5, 195),
          y: this.clamp(42.5 + side * 6.4 + laneOffset * 0.35, 8, 77)
        };
      }
      let x = threat.pos.x - direction * separation;
      if ((x - ownGoal) * direction < 2.8) x = ownGoal + direction * 2.8;
      return {
        x: this.clamp(x, 5, 195),
        y: this.clamp(threat.pos.y + (42.5 - threat.pos.y) * 0.12 + laneOffset, 8, 77)
      };
    };

    // The center / best defensive forward becomes the low forward. This creates
    // the third low layer that was missing from V5.1's flat three-forward line.
    const lowForward = [...forwards].sort((a, b) => {
      const scoreA = a.defensiveAwareness + (a.position === "C" ? 20 : 0);
      const scoreB = b.defensiveAwareness + (b.position === "C" ? 20 : 0);
      return scoreB - scoreA;
    })[0];
    const otherForwards = forwards.filter((candidate) => candidate.id !== lowForward?.id);

    // Assign one pressure player and give every other low defender a distinct
    // responsibility. V5.1 selected each destination independently; when the
    // threats were close together, the whole unit could chase the same dot.
    const carrierThreat = attackers.find((threat) => threat.player.id === state.puckCarrierId) ?? null;
    const lowGroup = [...defenders, ...(lowForward ? [lowForward] : [])];
    const pressurePlayer = carrierThreat
      ? [...lowGroup].sort((a, b) => {
          const scoreFor = (candidate) => {
            const pos = state.positions[candidate.id] ?? { x: ownGoal + direction * 15, y: 42.5 };
            const distance = Math.hypot(pos.x - carrierThreat.pos.x, pos.y - carrierThreat.pos.y);
            return distance - candidate.defensiveAwareness * 0.035 - (candidate.position.includes("D") ? 0.35 : 0);
          };
          return scoreFor(a) - scoreFor(b) || a.id.localeCompare(b.id);
        })[0]
      : null;
    const assignments = new Map();
    const claimedThreats = new Set();

    if (pressurePlayer && carrierThreat) {
      const pressureLane = carrierThreat.pos.y < 42.5 ? 1.25 : -1.25;
      assignments.set(pressurePlayer.id, markPoint(carrierThreat, 4.4, pressureLane));
      claimedThreats.add(carrierThreat.player.id);
    }

    defenders.forEach((defender, rank) => {
      if (assignments.has(defender.id)) return;
      const defenderY = state.positions[defender.id]?.y ?? (rank === 0 ? 34 : 51);
      const threat = attackers
        .filter((candidate) => !claimedThreats.has(candidate.player.id))
        .map((candidate) => ({
          candidate,
          value: candidate.score - Math.abs(candidate.pos.y - defenderY) * 0.6
        }))
        .sort((a, b) => b.value - a.value)[0]?.candidate ?? null;
      if (threat) {
        claimedThreats.add(threat.player.id);
        assignments.set(defender.id, markPoint(threat, 6.1, rank === 0 ? -1.6 : 1.6));
      } else {
        assignments.set(defender.id, {
          x: this.clamp(ownGoal + direction * 11.5, 8, 192),
          y: rank === 0 ? 34 : 51
        });
      }
    });

    if (lowForward && !assignments.has(lowForward.id)) {
      const threat = attackers
        .filter((candidate) => !claimedThreats.has(candidate.player.id))
        .map((candidate) => ({
          candidate,
          value: candidate.score + Math.max(0, 16 - Math.abs(candidate.pos.y - 42.5) * 0.9)
        }))
        .sort((a, b) => b.value - a.value)[0]?.candidate ?? null;
      if (threat) {
        claimedThreats.add(threat.player.id);
        assignments.set(lowForward.id, markPoint(threat, 7.4, 0));
      } else {
        assignments.set(lowForward.id, {
          x: this.clamp(ownGoal + direction * 20, 8, 192),
          y: this.clamp(42.5 + (state.puck.y - 42.5) * 0.18, 31, 54)
        });
      }
    }

    if (assignments.has(player.id)) return assignments.get(player.id);

    const supportRank = Math.max(0, otherForwards.findIndex((candidate) => candidate.id === player.id));
    if (supportRank === 0) {
      return {
        x: this.clamp(ownGoal + direction * 31, 8, 192),
        y: this.clamp(42.5 + (state.puck.y - 42.5) * 0.34, 22, 63)
      };
    }
    return {
      x: this.clamp(ownGoal + direction * 45, 8, 192),
      y: this.clamp(42.5 + (state.puck.y - 42.5) * 0.16, 20, 65)
    };
  }

  playerRoleAnchor(state, teamId, player, index) {
    const override = state.movementOverrides?.[player.id];
    if (override && (!Number.isFinite(override.expiresAt) || state.absoluteTime <= override.expiresAt + 1e-6)) {
      let allowOverride = true;
      if (state.possessionTeam === teamId && this.zoneForTeam(state.puck.x, teamId, state.period) === "OZ") {
        const direction = this.attackDirection(teamId, state.period);
        const goalLineX = direction === 1 ? AVHL_RINK.goalLines.high : AVHL_RINK.goalLines.low;
        const beyondGoalLine = (point) => direction === 1 ? point.x > goalLineX : point.x < goalLineX;
        const currentLowCount = state.onIce[teamId].filter((id) => {
          const pos = state.positions[id];
          return pos && beyondGoalLine(pos);
        }).length;

        // Overrides represent a specific chase/carry action, but they should not
        // perpetuate a broken formation indefinitely. Once multiple attackers
        // are already below the line, non-carriers recover to their structure.
        if (beyondGoalLine(override) && player.id !== state.puckCarrierId && currentLowCount >= 2) {
          allowOverride = false;
        }
        // Defensemen may pinch, but they do not continue a scripted carry behind
        // the cage during settled possession. If one gets trapped low, his role
        // anchor now brings him back above the goal line naturally.
        if (beyondGoalLine(override) && player.position.includes("D")) {
          allowOverride = false;
        }
      }
      if (allowOverride) return { x: override.x, y: override.y };
    }
    const direction = this.attackDirection(teamId, state.period);
    const possessing = state.possessionTeam === teamId;
    const puck = state.puck;
    const zone = this.zoneForTeam(puck.x, teamId, state.period);
    const isDefense = player.position.includes("D");
    const isGoalie = player.position === "G";
    const isCarrier = state.puckCarrierId === player.id;

    if (isGoalie) {
      const ownGoal = this.ownGoalX(teamId, state.period);
      const puckDistance = Math.abs(puck.x - ownGoal);
      const aggressionDepth = (player.aggressiveness - 80) * 0.025;
      const angleDiscipline = (player.angles - 80) * 0.012;
      const depth = possessing
        ? 2.25
        : this.clamp(2.55 + (70 - Math.min(70, puckDistance)) * 0.018 + aggressionDepth - angleDiscipline * 0.35, 2.35, 4.75);
      return {
        x: ownGoal + direction * depth,
        y: this.clamp(42.5 + (puck.y - 42.5) * (0.15 + (player.angles - 80) * 0.0012), 35, 50)
      };
    }

    if (possessing) {
      if (isCarrier) {
        if (zone === "NZ") {
          const blueLine = this.attackingBlueLine(teamId, state.period);
          return {
            x: this.clamp(blueLine - direction * 2.2, 8, 192),
            y: this.clamp(puck.y + (42.5 - puck.y) * 0.08, 8, 77)
          };
        }
        if (zone === "DZ") {
          return {
            x: this.clamp(puck.x + direction * 10, 8, 192),
            y: this.clamp(puck.y + (42.5 - puck.y) * 0.06, 8, 77)
          };
        }
        const attackingGoal = this.attackingGoalX(teamId, state.period);
        const frontDepth = (attackingGoal - puck.x) * direction;
        const centerOffset = puck.y - 42.5;
        const routeSign = Math.abs(centerOffset) > 1.4
          ? (centerOffset < 0 ? -1 : 1)
          : (AVHLGameSimulator.hashString(player.id) % 2 === 0 ? -1 : 1);

        // A carrier reaching the middle of the cage may not continue skating
        // straight through the net or park indefinitely while every defender
        // converges. Work laterally toward a post; from behind the goal, stay
        // behind it until a route around the side is available.
        if (!isDefense && frontDepth < -0.2) {
          return {
            x: this.clamp(attackingGoal + direction * 3.5, 2.5, 197.5),
            y: this.clamp(42.5 + routeSign * 10.2, 7, 78)
          };
        }
        if (!isDefense && frontDepth < 14 && Math.abs(centerOffset) < 9.5) {
          return {
            x: this.clamp(attackingGoal - direction * 3.8, 2.5, 197.5),
            y: this.clamp(42.5 + routeSign * 9.2, 7, 78)
          };
        }
        if (isDefense) {
          const deepestDefenseX = attackingGoal - direction * 18;
          const desiredX = puck.x + direction * 2.5;
          return {
            x: this.clamp(direction === 1 ? Math.min(desiredX, deepestDefenseX) : Math.max(desiredX, deepestDefenseX), 8, 192),
            y: this.clamp(puck.y + (42.5 - puck.y) * 0.18, 12, 73)
          };
        }
        const cyclePhase = (state.absoluteTime + (AVHLGameSimulator.hashString(player.id) % 19)) * 0.42;
        return {
          x: this.clamp(puck.x + direction * 5.5, 8, 192),
          y: this.clamp(puck.y + (42.5 - puck.y) * 0.04 + Math.sin(cyclePhase) * 1.6, 7, 78)
        };
      }

      if (isDefense) {
        const pairIndex = index % 2;
        const supportDepth = zone === "OZ" ? 20 : zone === "NZ" ? 18 : 14;
        let supportX = puck.x - direction * supportDepth;
        if (zone === "OZ") {
          const blueLine = this.attackingBlueLine(teamId, state.period);
          // Offensive defensemen hold the point INSIDE the blue line. They do
          // not drift into the neutral zone and then magically shoot from there.
          const insidePoint = blueLine + direction * 4.2;
          supportX = direction === 1 ? Math.max(supportX, insidePoint) : Math.min(supportX, insidePoint);
        }
        return {
          x: this.clamp(supportX, 10, 190),
          y: pairIndex === 0 ? 24 : 61
        };
      }

      if (zone === "OZ") {
        return this.offensiveZoneForwardAnchor(state, teamId, player);
      }

      const forwardIndex = index % 3;
      const laneY = [21, 42.5, 64][forwardIndex];
      let targetX = puck.x + direction * [6, 10, 3][forwardIndex];
      if (zone === "NZ") {
        const blueLine = this.attackingBlueLine(teamId, state.period);
        const awarenessBuffer = 1.2 + this.clamp((player.offensiveAwareness - 75) * 0.04, 0, 1.4);
        const cap = blueLine - direction * awarenessBuffer;
        targetX = direction === 1 ? Math.min(targetX, cap) : Math.max(targetX, cap);
      }
      return {
        x: this.clamp(targetX, 8, 192),
        y: this.clamp(laneY + (puck.y - 42.5) * 0.12, 8, 77)
      };
    }

    const ownGoal = this.ownGoalX(teamId, state.period);
    if (zone === "DZ" && state.possessionTeam === this.opponent(teamId)) {
      return this.defensiveZoneStructureAnchor(state, teamId, player);
    }

    if (isDefense) {
      const slotY = index % 2 === 0 ? 34 : 51;
      const puckBias = this.clamp((puck.x - ownGoal) * direction, 0, 55);
      return {
        x: this.clamp(ownGoal + direction * (15 + puckBias * 0.2), 8, 192),
        y: this.clamp(slotY + (puck.y - slotY) * 0.18, 18, 67)
      };
    }

    const defensiveY = [24, 42.5, 61][index % 3];
    const supportX = ownGoal + direction * 45;
    return {
      x: this.clamp(supportX, 8, 192),
      y: this.clamp(defensiveY + (puck.y - defensiveY) * 0.12, 12, 73)
    };
  }

  updatePositions(state, seconds, context = "play") {
    const dt = Math.max(0, seconds);
    if (dt <= 0) return;
    if (state.movementOverrides) {
      for (const [id, override] of Object.entries(state.movementOverrides)) {
        if (Number.isFinite(override.expiresAt) && state.absoluteTime > override.expiresAt + 1e-6) delete state.movementOverrides[id];
      }
    }
    const active = [];
    const proposals = new Map();

    const steerVelocity = (current, anchor, player) => {
      const goalie = player.position === "G";
      const speedRating = player.speed;
      const accelRating = goalie ? player.agility : player.acceleration;
      const fatigue = this.clamp(player.fatigue || 0, 0, 1);
      const maxSpeed = (goalie
        ? 11.7 + (speedRating - 70) * 0.09
        : 21.5 + (speedRating - 70) * 0.16) * (1 - fatigue * (goalie ? 0.08 : 0.12));
      const maxAccel = (goalie
        ? 9.7 + (accelRating - 70) * 0.085
        : 11.5 + (accelRating - 70) * 0.11) * (1 - fatigue * (goalie ? 0.1 : 0.16));
      const dx = anchor.x - current.x;
      const dy = anchor.y - current.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.08) return { vx: current.vx * 0.78, vy: current.vy * 0.78 };

      const desiredSpeed = Math.min(maxSpeed, Math.max(2.2, distance * 1.4));
      const desiredAngle = Math.atan2(dy, dx);
      const currentSpeed = Math.hypot(current.vx ?? 0, current.vy ?? 0);
      let currentAngle = currentSpeed > 0.25 ? Math.atan2(current.vy, current.vx) : desiredAngle;
      let diff = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
      const agility = player.agility ?? 80;
      const turnRate = goalie
        ? this.clamp(2.65 + (agility - 75) * 0.028 - currentSpeed * 0.018, 2.2, 3.75)
        : this.clamp(2.75 + (agility - 75) * 0.032 - currentSpeed * 0.047, 1.15, 3.65);
      diff = this.clamp(diff, -turnRate * dt, turnRate * dt);
      const steeredAngle = currentAngle + diff;
      const targetVx = Math.cos(steeredAngle) * desiredSpeed;
      const targetVy = Math.sin(steeredAngle) * desiredSpeed;
      let dvx = targetVx - (current.vx ?? 0);
      let dvy = targetVy - (current.vy ?? 0);
      const deltaV = Math.hypot(dvx, dvy);
      const maxDeltaV = maxAccel * dt;
      if (deltaV > maxDeltaV && deltaV > 0) {
        dvx *= maxDeltaV / deltaV;
        dvy *= maxDeltaV / deltaV;
      }
      let vx = (current.vx ?? 0) + dvx;
      let vy = (current.vy ?? 0) + dvy;
      const speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        vx *= maxSpeed / speed;
        vy *= maxSpeed / speed;
      }
      if (context === "stoppage") {
        vx *= 0.72;
        vy *= 0.72;
      }
      return { vx, vy };
    };

    for (const teamId of [this.homeId, this.awayId]) {
      const team = this.teams[teamId];
      const ids = [...state.onIce[teamId], team.goalie.id];
      ids.forEach((id, index) => {
        const player = id === team.goalie.id ? team.goalie : team.playerById[id];
        const current = state.positions[id] ?? this.defaultPositionForPlayer(state, teamId, id, index);
        const rawAnchor = this.playerRoleAnchor(state, teamId, player, index);
        const anchor = this.routeAnchorAroundNet(current, rawAnchor, player);
        const velocity = steerVelocity(current, anchor, player);
        let newX = current.x + velocity.vx * dt;
        let newY = current.y + velocity.vy * dt;

        const toAnchorX = anchor.x - current.x;
        const toAnchorY = anchor.y - current.y;
        const movedX = newX - current.x;
        const movedY = newY - current.y;
        if (movedX * toAnchorX + movedY * toAnchorY > toAnchorX * toAnchorX + toAnchorY * toAnchorY) {
          newX = anchor.x;
          newY = anchor.y;
        }

        const constrained = this.constrainPlayerPoint(current, { x: newX, y: newY }, player);
        proposals.set(id, {
          x: constrained.x,
          y: constrained.y,
          vx: velocity.vx,
          vy: velocity.vy
        });
        active.push({ id, teamId, player });
      });
    }

    this.separatePlayerProposals(state, proposals, active, dt);
    for (const { id } of active) state.positions[id] = proposals.get(id);

    const puckCarrier = this.getPlayerById(state.puckCarrierId);
    if (puckCarrier && state.positions[puckCarrier.id]) {
      const carrierPosition = state.positions[puckCarrier.id];
      const velocity = { vx: carrierPosition.vx ?? 0, vy: carrierPosition.vy ?? 0 };
      const speed = Math.hypot(velocity.vx, velocity.vy);
      const ux = speed > 0.3 ? velocity.vx / speed : this.attackDirection(puckCarrier.teamId, state.period);
      const uy = speed > 0.3 ? velocity.vy / speed : 0;
      const attachedPuck = {
        x: this.clamp(carrierPosition.x + ux * 1.25, 1, 199),
        y: this.clamp(carrierPosition.y + uy * 1.25, 1, 84)
      };
      // While the puck is attached to a carrier it cannot appear inside the
      // physical goal cage. Goals enter the net only during a shot flight.
      state.puck = this.constrainLivePuckPoint(state.puck, attachedPuck);
    }

    for (const id of Object.keys(state.positions)) {
      if (!proposals.has(id)) delete state.positions[id];
    }
  }

  recordSpatialSnapshot(state) {
    const positions = {};
    for (const [id, position] of Object.entries(state.positions)) {
      positions[id] = { ...position };
    }
    state.replayBuffer.push({
      time: state.absoluteTime,
      period: state.period,
      clock: state.clock,
      positions,
      puck: { ...state.puck },
      puckCarrierId: state.puckCarrierId,
      possessionTeam: state.possessionTeam,
      onIce: {
        [this.homeId]: [...state.onIce[this.homeId]],
        [this.awayId]: [...state.onIce[this.awayId]]
      }
    });
    const cutoff = state.absoluteTime - 8.5;
    state.replayBuffer = state.replayBuffer.filter((snapshot) => snapshot.time >= cutoff);
  }

  incrementToi(state, seconds) {
    const counts = this.strengthCounts(state);
    for (const teamId of [this.homeId, this.awayId]) {
      const team = this.teams[teamId];
      const opponentId = this.opponent(teamId);
      const situation = counts[teamId] > counts[opponentId]
        ? "PP"
        : counts[teamId] < counts[opponentId]
          ? "SH"
          : state.period === 4
            ? "OT"
            : "EV";

      if (situation === "PP") state.powerPlayTime[teamId] += seconds;

      for (const id of state.onIce[teamId]) {
        const player = team.playerById[id];
        if (!player) continue;
        player.stats.toi += seconds;
        player.stats.currentShift += seconds;
        player.stats.longestShift = Math.max(player.stats.longestShift, player.stats.currentShift);
        if (situation === "PP") player.stats.ppToi += seconds;
        else if (situation === "SH") player.stats.shToi += seconds;
        else if (situation === "OT") player.stats.otToi += seconds;
        else player.stats.evToi += seconds;
        player.fatigue = this.clamp(
          player.fatigue + seconds * (0.00192 - (player.endurance - 70) * 0.000011),
          0,
          1
        );
      }

      for (const player of team.players) {
        if (!state.onIce[teamId].includes(player.id)) {
          player.fatigue = this.clamp(player.fatigue - seconds * 0.0028, 0, 1);
          player.stats.currentShift = 0;
        }
      }

      team.goalie.stats.toi += seconds;
      team.goalie.fatigue = this.clamp(
        team.goalie.fatigue + seconds * (0.00009 - (team.goalie.endurance - 70) * 0.00000055),
        0,
        1
      );
      state.shiftAge[teamId] += seconds;
    }

    // NHL-style time on attack: active possession while the puck is in the
    // possessing team's offensive zone. Clock is already known to be running.
    const possessionTeam = state.possessionTeam;
    if (possessionTeam && this.zoneForTeam(state.puck.x, possessionTeam, state.period) === "OZ") {
      state.timeOnAttack[possessionTeam] += seconds;
    }
  }

  decrementPenalties(state, seconds) {
    const expired = [];
    for (const penalty of state.activePenalties) {
      if (penalty.remaining <= 0) continue;
      penalty.remaining -= seconds;
      if (penalty.remaining <= 0) {
        penalty.remaining = 0;
        expired.push(penalty);
      }
    }
    if (expired.length) {
      state.activePenalties = state.activePenalties.filter((penalty) => penalty.remaining > 0);
      this.refreshUnits(state, false);
    }
    return expired;
  }

  advanceClock(state, requestedSeconds, context = "play") {
    if (state.period === "SO") return [];
    const totalSeconds = Math.min(Math.max(0, requestedSeconds), state.clock);
    if (totalSeconds <= 0) return [];

    const expired = [];
    let remaining = totalSeconds;
    while (remaining > 0.0001 && state.clock > 0) {
      const step = Math.min(0.1, remaining, state.clock);
      const enforceLiveEntry = context === "play" || context === "entry";
      const entryTeam = enforceLiveEntry ? state.possessionTeam : null;
      const entryDirection = entryTeam ? this.attackDirection(entryTeam, state.period) : 0;
      const entryLine = entryTeam ? this.attackingBlueLine(entryTeam, state.period) : 0;
      const puckWasBeforeEntryLine = entryTeam
        ? this.isBeforeLine(state.puck.x, entryLine, entryDirection, -0.05)
        : false;
      const entryOffenders = puckWasBeforeEntryLine
        ? state.onIce[entryTeam].filter((id) => {
            if (id === state.puckCarrierId) return false;
            const pos = state.positions[id];
            return pos && this.isBeyondLine(pos.x, entryLine, entryDirection, 0.35);
          })
        : [];
      this.incrementToi(state, step);
      const stepExpired = this.decrementPenalties(state, step);
      for (const penalty of stepExpired) {
        if (!expired.some((entry) => entry.id === penalty.id)) expired.push(penalty);
      }
      state.clock -= step;
      state.absoluteTime += step;
      this.updatePositions(state, step, context);

      // Controlled carries can cross the blue line during a multi-second
      // possession interval, before the next high-level event is selected.
      // Enforce offside at that actual sub-step instead of waiting for a later
      // pass/shot decision to notice the stale zone.
      const crossedEntryLine = entryTeam &&
        puckWasBeforeEntryLine &&
        this.isBeyondLine(state.puck.x, entryLine, entryDirection, -0.05);
      if (crossedEntryLine && entryOffenders.length) {
        this.whistleForOffside(state, entryTeam, entryOffenders);
        this.recordSpatialSnapshot(state);
        remaining = 0;
        break;
      }
      this.recordSpatialSnapshot(state);

      remaining -= step;
    }

    for (const penalty of expired) {
      this.addEvent(
        state,
        "penalty-end",
        `${this.teams[penalty.teamId].name} return to full strength as the ${penalty.type.toLowerCase()} penalty expires.`,
        { teamId: penalty.teamId }
      );
    }

    return expired;
  }

  setMovementOverride(state, playerId, location, duration = 1) {
    if (!playerId || !location) return;
    state.movementOverrides ??= {};
    state.movementOverrides[playerId] = {
      x: this.clamp(location.x, 2.5, 197.5),
      y: this.clamp(location.y, 2.5, 82.5),
      expiresAt: state.absoluteTime + Math.max(0.05, duration)
    };
  }

  advancePuckFlight(state, from, to, requestedSeconds, context = "puck-flight") {
    if (state.period === "SO") {
      state.puck = { ...to };
      return [];
    }
    const totalSeconds = Math.min(Math.max(0, requestedSeconds), state.clock);
    if (totalSeconds <= 0) {
      state.puck = { ...to };
      return [];
    }

    state.possessionTeam = null;
    state.puckCarrierId = null;
    state.puck = { ...from };
    const expired = [];
    let elapsed = 0;
    let remaining = totalSeconds;
    while (remaining > 0.0001 && state.clock > 0) {
      const step = Math.min(0.1, remaining, state.clock);
      this.incrementToi(state, step);
      const stepExpired = this.decrementPenalties(state, step);
      for (const penalty of stepExpired) {
        if (!expired.some((entry) => entry.id === penalty.id)) expired.push(penalty);
      }
      state.clock -= step;
      state.absoluteTime += step;
      elapsed += step;
      this.updatePositions(state, step, context);
      const u = this.clamp(elapsed / totalSeconds, 0, 1);
      // Pucks do not ease in/out while passing; keep a nearly constant travel speed.
      state.puck = {
        x: from.x + (to.x - from.x) * u,
        y: from.y + (to.y - from.y) * u
      };
      this.recordSpatialSnapshot(state);
      remaining -= step;
    }
    state.puck = { ...to };

    for (const penalty of expired) {
      this.addEvent(
        state,
        "penalty-end",
        `${this.teams[penalty.teamId].name} return to full strength as the ${penalty.type.toLowerCase()} penalty expires.`,
        { teamId: penalty.teamId }
      );
    }
    return expired;
  }

  closestPointOnSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq <= 1e-6) return { x: start.x, y: start.y, u: 0, distance: Math.hypot(point.x - start.x, point.y - start.y) };
    const u = this.clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
    const x = start.x + dx * u;
    const y = start.y + dy * u;
    return { x, y, u, distance: Math.hypot(point.x - x, point.y - y) };
  }

  segmentIntersectsRect(from, to, rect) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    let t0 = 0;
    let t1 = 1;
    const checks = [
      [-dx, from.x - rect.minX],
      [dx, rect.maxX - from.x],
      [-dy, from.y - rect.minY],
      [dy, rect.maxY - from.y]
    ];
    for (const [p, q] of checks) {
      if (Math.abs(p) < 1e-9) {
        if (q < 0) return false;
        continue;
      }
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
    return t0 <= t1 && t1 >= 0 && t0 <= 1;
  }

  passIntersectsNet(from, to) {
    const halfWidth = 4.2;
    const depth = 4.4;
    const centerY = 42.5;
    const lowRect = {
      minX: AVHL_RINK.goalLines.low - depth,
      maxX: AVHL_RINK.goalLines.low + 0.7,
      minY: centerY - halfWidth,
      maxY: centerY + halfWidth
    };
    const highRect = {
      minX: AVHL_RINK.goalLines.high - 0.7,
      maxX: AVHL_RINK.goalLines.high + depth,
      minY: centerY - halfWidth,
      maxY: centerY + halfWidth
    };
    return this.segmentIntersectsRect(from, to, lowRect) || this.segmentIntersectsRect(from, to, highRect);
  }

  choosePassInterceptor(state, defendingTeamId, from, to) {
    const team = this.teams[defendingTeamId];
    const candidates = state.onIce[defendingTeamId]
      .map((id) => {
        const player = team.playerById[id];
        const position = state.positions[id];
        if (!player || !position) return null;
        const lane = this.closestPointOnSegment(position, from, to);
        const score = lane.distance - (player.defensiveAwareness - 80) * 0.045 - (player.stickChecking - 80) * 0.025;
        return { player, position, lane, score };
      })
      .filter(Boolean)
      .filter((entry) => entry.lane.u > 0.08 && entry.lane.u < 0.94 && entry.lane.distance <= 9.5)
      .sort((a, b) => a.score - b.score);
    return candidates[0] ?? null;
  }

  estimatePuckRecoveryTime(state, player, location) {
    const position = state.positions[player.id];
    if (!position) return 9;
    const dx = location.x - position.x;
    const dy = location.y - position.y;
    const distance = Math.max(0.2, Math.hypot(dx, dy));
    const ux = dx / distance;
    const uy = dy / distance;
    const toward = Math.max(0, (position.vx ?? 0) * ux + (position.vy ?? 0) * uy);
    const maxSpeed = (21.5 + (player.speed - 70) * 0.16) * (1 - player.fatigue * 0.1);
    const accel = (11.5 + (player.acceleration - 70) * 0.11) * (1 - player.fatigue * 0.14);
    const effectiveV = Math.min(maxSpeed, toward);
    const time = accel > 0.01
      ? (-effectiveV + Math.sqrt(Math.max(0, effectiveV * effectiveV + 2 * accel * distance))) / accel
      : distance / Math.max(1, maxSpeed);
    const awareness = player.position.includes("D") ? player.defensiveAwareness : player.offensiveAwareness;
    const handlingAdjustment = (84 - player.agility) * 0.0025 + (84 - player.balance) * 0.0018;
    return Math.max(0.12, time + this.clamp((84 - awareness) * 0.004 + handlingAdjustment, -0.06, 0.16));
  }

  resolveLoosePuck(state, location, attackingTeamId, reason = "loose puck") {
    location = this.constrainLivePuckPoint(state.puck, location);
    state.puck = { ...location };
    state.possessionTeam = null;
    state.puckCarrierId = null;

    const candidates = [];
    for (const teamId of [this.homeId, this.awayId]) {
      const team = this.teams[teamId];
      for (const id of state.onIce[teamId]) {
        const player = team.playerById[id];
        if (!player || !state.positions[id]) continue;
        const time = this.estimatePuckRecoveryTime(state, player, location) + this.random.range(0, 0.11);
        candidates.push({ teamId, player, time });
      }
    }
    candidates.sort((a, b) => a.time - b.time);
    const winner = candidates[0];
    if (!winner) return null;

    let chaseTime = this.clamp(winner.time * 1.12, 0.18, 2.65);
    this.setMovementOverride(state, winner.player.id, location, chaseTime + 0.18);
    this.advanceClock(state, chaseTime, "loose-puck");

    // Do not award a loose puck simply because an ETA timer expired. If the
    // player still has meaningful distance to cover, let the chase continue
    // for a short physical correction instead of teleporting ownership.
    let pickup = state.positions[winner.player.id] ?? location;
    let remaining = Math.hypot(pickup.x - location.x, pickup.y - location.y);
    if (remaining > 3.25 && state.clock > 0.2) {
      const extra = this.clamp(remaining / 17.5, 0.12, 1.15);
      this.setMovementOverride(state, winner.player.id, location, extra + 0.16);
      this.advanceClock(state, extra, "loose-puck");
      chaseTime += extra;
      pickup = state.positions[winner.player.id] ?? location;
      remaining = Math.hypot(pickup.x - location.x, pickup.y - location.y);
    }
    // Possession is established where the player actually reaches the puck.
    // A small stick-reach tolerance is fine; long-distance pickups are not.
    if (remaining > 5.25) {
      state.puck = { ...location };
      return null;
    }
    state.puck = { x: pickup.x, y: pickup.y };
    this.setPossession(state, winner.teamId, winner.player.id, winner.teamId !== attackingTeamId);
    state.lastContext = winner.teamId === attackingTeamId ? "recovery" : "turnover";
    this.addEvent(
      state,
      "recovery",
      `${winner.player.name} reaches the ${reason} and takes possession.`,
      {
        teamId: winner.teamId,
        playerId: winner.player.id,
        location: { ...state.puck },
        details: { reason, looseLocation: { ...location }, recoveryTime: chaseTime }
      }
    );
    return winner;
  }

  chooseTakeawayPlayer(state, defendingTeamId, carrierId, maxDistance = 10.5) {
    const carrierPos = state.positions[carrierId] ?? state.puck;
    const team = this.teams[defendingTeamId];
    const candidates = state.onIce[defendingTeamId]
      .map((id) => {
        const player = team.playerById[id];
        const pos = state.positions[id];
        if (!player || !pos) return null;
        const distance = Math.hypot(pos.x - carrierPos.x, pos.y - carrierPos.y);
        if (distance > maxDistance) return null;
        const score = player.stickChecking * 0.45 + player.defensiveAwareness * 0.35 + player.speed * 0.2 - distance * 2.2;
        return { player, distance, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return candidates[0] ?? null;
  }

  getPlayerById(playerId) {
    if (!playerId) return null;
    for (const team of Object.values(this.teams)) {
      if (team.playerById[playerId]) return team.playerById[playerId];
      const goalie = team.goalies.find((candidate) => candidate.id === playerId);
      if (goalie) return goalie;
    }
    return null;
  }

  shortName(player) {
    if (!player?.name) return "Unknown";
    const parts = player.name.trim().split(/\s+/);
    return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
  }

  setPossession(state, teamId, playerId, resetAssists = false) {
    if (state.possessionTeam && state.possessionTeam !== teamId) {
      state.assistQueue = [];
    }
    if (resetAssists) state.assistQueue = [];
    state.possessionTeam = teamId;
    state.puckCarrierId = playerId;
    state.zone = this.zoneForTeam(state.puck.x, teamId, state.period);
  }

  addAssistCandidate(state, playerId) {
    if (!playerId) return;
    const player = this.getPlayerById(playerId);
    if (!player || player.teamId !== state.possessionTeam) return;
    state.assistQueue = state.assistQueue.filter((id) => id !== playerId);
    state.assistQueue.push(playerId);
    state.assistQueue = state.assistQueue.slice(-2);
  }

  chooseOnIcePlayer(state, teamId, weightFunction, filters = () => true) {
    const team = this.teams[teamId];
    const pool = state.onIce[teamId]
      .map((id) => team.playerById[id])
      .filter(Boolean)
      .filter(filters);
    return this.random.weightedChoice(pool, weightFunction);
  }

  chooseCenter(state, teamId) {
    const team = this.teams[teamId];
    const onIce = state.onIce[teamId].map((id) => team.playerById[id]).filter(Boolean);
    const centers = onIce.filter((player) => player.position === "C");
    const pool = centers.length ? centers : onIce;
    return this.random.weightedChoice(pool, (player) => player.faceoffs + player.poise * 0.25);
  }

  positionPlayersForFaceoff(state, location, centers = {}) {
    const clampPoint = (point, goalie = false) => ({
      x: this.clamp(point.x, goalie ? 4 : 3, goalie ? 196 : 197),
      y: this.clamp(point.y, goalie ? 33 : 3, goalie ? 52 : 82),
      vx: 0,
      vy: 0
    });

    for (const teamId of [this.homeId, this.awayId]) {
      const team = this.teams[teamId];
      const direction = this.attackDirection(teamId, state.period);
      const center = centers[teamId];
      const skaters = state.onIce[teamId]
        .map((id) => team.playerById[id])
        .filter(Boolean);
      const forwards = skaters.filter((player) => !player.position.includes("D") && player.id !== center?.id);
      const defense = skaters.filter((player) => player.position.includes("D") && player.id !== center?.id);
      const behind = -direction;

      if (center) {
        state.positions[center.id] = clampPoint({ x: location.x + behind * 1.55, y: location.y });
      }

      const wingOffsets = [
        { x: behind * 3.2, y: -7.2 },
        { x: behind * 3.2, y: 7.2 },
        { x: behind * 7.2, y: 0 }
      ];
      forwards.forEach((player, index) => {
        const offset = wingOffsets[index] ?? { x: behind * (5 + index * 1.8), y: (index % 2 ? 1 : -1) * 9 };
        state.positions[player.id] = clampPoint({ x: location.x + offset.x, y: location.y + offset.y });
      });

      const defenseOffsets = [
        { x: behind * 13.5, y: -10.5 },
        { x: behind * 13.5, y: 10.5 },
        { x: behind * 17, y: 0 }
      ];
      defense.forEach((player, index) => {
        const offset = defenseOffsets[index] ?? { x: behind * (14 + index * 2), y: (index % 2 ? 1 : -1) * 12 };
        state.positions[player.id] = clampPoint({ x: location.x + offset.x, y: location.y + offset.y });
      });

      const goalieX = this.ownGoalX(teamId, state.period) + direction * 3;
      state.positions[team.goalie.id] = clampPoint({ x: goalieX, y: 42.5 }, true);
    }
    state.puck = { ...location };
  }

  simulateFaceoff(state, location, reason = "stoppage") {
    this.maybeChangeLines(state, true);
    this.refreshUnits(state, false);
    state.puck = { ...location };

    const homeCenter = this.chooseCenter(state, this.homeId);
    const awayCenter = this.chooseCenter(state, this.awayId);
    this.positionPlayersForFaceoff(state, location, { [this.homeId]: homeCenter, [this.awayId]: awayCenter });
    const homeScore =
      homeCenter.faceoffs * 0.68 +
      homeCenter.strength * 0.12 +
      homeCenter.balance * 0.1 +
      homeCenter.poise * 0.1 +
      this.random.normal(0, 8);
    const awayScore =
      awayCenter.faceoffs * 0.68 +
      awayCenter.strength * 0.12 +
      awayCenter.balance * 0.1 +
      awayCenter.poise * 0.1 +
      this.random.normal(0, 8);
    const winnerTeamId = homeScore >= awayScore ? this.homeId : this.awayId;
    const loserTeamId = this.opponent(winnerTeamId);
    const winner = winnerTeamId === this.homeId ? homeCenter : awayCenter;
    const loser = loserTeamId === this.homeId ? homeCenter : awayCenter;
    const margin = Math.abs(homeScore - awayScore);
    const outcome = margin > 10 ? "clean" : margin > 3 ? "tied-up" : "scramble";

    winner.stats.faceoffWins += 1;
    loser.stats.faceoffLosses += 1;
    state.faceoffs[winnerTeamId] += 1;

    let collector = winner;
    if (outcome !== "clean") {
      collector = this.chooseOnIcePlayer(
        state,
        winnerTeamId,
        (player) => player.offensiveAwareness + player.acceleration + player.balance,
        (player) => player.id !== winner.id
      ) ?? winner;
    }

    state.assistQueue = [];
    this.setPossession(state, winnerTeamId, collector.id, true);
    state.puck = { ...location };
    state.lastContext = "faceoff";
    this.addEvent(
      state,
      "faceoff",
      outcome === "clean"
        ? `${winner.name} wins the draw cleanly.`
        : outcome === "tied-up"
          ? `${winner.name} ties up ${loser.name}; ${collector.name} collects the puck.`
          : `${winner.name} comes out of a faceoff scramble with possession.`,
      {
        teamId: winnerTeamId,
        playerId: winner.id,
        secondaryPlayerId: collector.id,
        location,
        mapType: "faceoff",
        outcome,
        details: { reason }
      }
    );
    state.nextFaceoff = null;
    this.recordSpatialSnapshot(state);
  }

  faceoffLocationForStoppage(state, defendingTeamId, sideY = state.puck.y) {
    const attackDirection = this.attackDirection(this.opponent(defendingTeamId), state.period);
    const highEnd = attackDirection === 1;
    const leftSide = sideY < AVHL_RINK.height / 2;
    const spot = highEnd
      ? (leftSide ? AVHL_RINK.faceoffSpots.highLeft : AVHL_RINK.faceoffSpots.highRight)
      : (leftSide ? AVHL_RINK.faceoffSpots.lowLeft : AVHL_RINK.faceoffSpots.lowRight);
    return { ...spot };
  }

  choosePassRecipient(state, teamId, passer, purpose = "cycle") {
    return this.chooseOnIcePlayer(
      state,
      teamId,
      (player) => {
        const position = state.positions[player.id];
        const passerPosition = state.positions[passer.id];
        const separation = position && passerPosition
          ? this.clamp(Math.hypot(position.x - passerPosition.x, position.y - passerPosition.y), 4, 45)
          : 18;
        return (
          player.offensiveAwareness * 0.42 +
          player.puckControl * 0.25 +
          player.speed * 0.14 +
          player.handEye * (purpose === "one-timer" ? 0.18 : 0.06) +
          player.poise * 0.07 +
          separation * 0.8
        );
      },
      (player) => {
        if (player.id === passer.id) return false;
        const position = state.positions[player.id];
        if (!position) return false;
        const puckZone = this.zoneForTeam(state.puck.x, teamId, state.period);
        if (["cycle", "one-timer"].includes(purpose) && puckZone === "OZ") {
          if (this.zoneForTeam(position.x, teamId, state.period) !== "OZ") return false;
          const passerPosition = state.positions[passer.id] ?? state.puck;
          if (this.passIntersectsNet(passerPosition, position)) return false;
        }
        return true;
      }
    );
  }

  simulatePass(state, teamId, purpose = "cycle") {
    const team = this.teams[teamId];
    const passer = team.playerById[state.puckCarrierId] ?? this.chooseOnIcePlayer(
      state,
      teamId,
      (player) => player.puckControl + player.passing
    );
    const recipient = this.choosePassRecipient(state, teamId, passer, purpose);
    if (!passer || !recipient) return false;

    // On an entry pass, an attacker who is already across while the puck is
    // still in the neutral zone creates a real offside rather than a replay fix.
    if (purpose === "entry") {
      const offenders = this.spatialOffsideOffenders(state, teamId);
      if (offenders.length) {
        this.whistleForOffside(state, teamId, offenders);
        return false;
      }
    }

    const from = { ...(state.positions[passer.id] ?? state.puck) };
    const recipientPosition = state.positions[recipient.id];
    if (!recipientPosition) return false;
    const to = { x: recipientPosition.x, y: recipientPosition.y };

    // A pass cannot phase through the back or side of either cage. If the
    // straight lane intersects the net body, the carrier keeps possession and
    // the offense has to work around it on a later action.
    if (this.passIntersectsNet(from, to)) {
      state.lastContext = "cycle";
      this.addEvent(
        state,
        "possession",
        `${passer.name} has no clean lane through the cage and keeps possession below the goal line.`,
        {
          teamId,
          playerId: passer.id,
          location: { ...from },
          details: { purpose, rejectedPassLane: true, passFrom: from, passTo: to, netCollision: true }
        }
      );
      return false;
    }

    // Do not let a pass called "cycle" or "one-timer" quietly become an
    // unpoliced zone entry because the puck moved during the preceding clock
    // interval. Any pass that carries the puck from outside the offensive zone
    // to a receiver inside it is an entry for offside purposes, regardless of
    // the semantic label chosen by the possession decision tree.
    const fromZone = this.zoneForTeam(from.x, teamId, state.period);
    const toZone = this.zoneForTeam(to.x, teamId, state.period);
    const crossesAttackingBlueLine = fromZone !== "OZ" && toZone === "OZ";
    if (crossesAttackingBlueLine) {
      const offenders = this.spatialOffsideOffenders(state, teamId);
      if (offenders.length) {
        this.whistleForOffside(state, teamId, offenders);
        return false;
      }
      purpose = "entry";
    }

    const defendingTeamId = this.opponent(teamId);
    const laneDefender = this.choosePassInterceptor(state, defendingTeamId, from, to);
    const pressure = this.localPressure(state, passer, defendingTeamId);
    state.passAttempts[teamId] += 1;

    const defenderSkill = laneDefender
      ? laneDefender.player.defensiveAwareness * 0.62 + laneDefender.player.stickChecking * 0.38
      : 80;
    const passerSkill =
      passer.passing * 0.54 +
      passer.puckControl * 0.20 +
      passer.poise * 0.15 +
      passer.offensiveAwareness * 0.11;
    const lanePenalty = laneDefender ? this.clamp((7 - laneDefender.lane.distance) * 0.018, 0, 0.10) : 0;
    const successProbability = this.clamp(
      0.75 +
      (["cycle", "one-timer"].includes(purpose) ? 0.075 : 0) +
      (passerSkill - 82) * 0.009 -
      pressure * 0.17 -
      (defenderSkill - 82) * 0.0032 -
      passer.fatigue * 0.045 -
      lanePenalty,
      0.46,
      0.95
    );

    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const passSpeed = this.clamp(52 + (passer.passing - 75) * 0.75 + (purpose === "one-timer" ? 9 : 0), 46, 78);
    const fullFlight = this.clamp(distance / passSpeed, 0.12, 0.62);

    if (!this.random.chance(successProbability)) {
      passer.stats.giveaways += 1;
      const canIntercept = laneDefender && laneDefender.lane.distance <= 6.5;
      const interception = canIntercept && this.random.chance(
        this.clamp(
          0.52 +
          (laneDefender.player.defensiveAwareness - 80) * 0.008 +
          (laneDefender.player.stickChecking - 80) * 0.007 +
          (laneDefender.player.handEye - 80) * 0.003 +
          (6.5 - laneDefender.lane.distance) * 0.05,
          0.36,
          0.91
        )
      );

      if (interception) {
        const point = { x: laneDefender.lane.x, y: laneDefender.lane.y };
        const flightSeconds = Math.max(0.1, fullFlight * laneDefender.lane.u);
        this.setMovementOverride(state, laneDefender.player.id, point, flightSeconds + 0.22);
        this.advancePuckFlight(state, from, point, flightSeconds, "pass");
        laneDefender.player.stats.takeaways += 1;
        const defenderPos = state.positions[laneDefender.player.id] ?? point;
        state.puck = { x: defenderPos.x, y: defenderPos.y };
        this.setPossession(state, defendingTeamId, laneDefender.player.id, true);
        state.lastContext = "turnover";
        this.addEvent(
          state,
          "turnover",
          `${laneDefender.player.name} steps into ${passer.name}'s passing lane and intercepts the puck.`,
          {
            teamId: defendingTeamId,
            playerId: laneDefender.player.id,
            secondaryPlayerId: passer.id,
            location: { ...state.puck },
            details: { passFrom: from, passTo: to, interceptionPoint: point, purpose }
          }
        );
        return false;
      }

      const missAngle = this.random.range(0, Math.PI * 2);
      const missDistance = this.random.range(4, 10);
      let loose = {
        x: this.clamp(to.x + Math.cos(missAngle) * missDistance, 2.5, 197.5),
        y: this.clamp(to.y + Math.sin(missAngle) * missDistance, 2.5, 82.5)
      };
      if (this.passIntersectsNet(from, loose)) {
        // A missed feed near the cage goes wide of the netting rather than
        // travelling through it. Preserve the end of the rink but push the
        // loose puck outside the cage's lateral footprint.
        const side = loose.y < 42.5 ? -1 : 1;
        loose = { x: loose.x, y: this.clamp(42.5 + side * 8.5, 2.5, 82.5) };
      }
      this.advancePuckFlight(state, from, loose, fullFlight, "pass");
      this.addEvent(
        state,
        "pass-miss",
        `${passer.name}'s pass misses ${recipient.name} and stays loose.`,
        {
          teamId,
          playerId: passer.id,
          secondaryPlayerId: recipient.id,
          location: { ...loose },
          details: { purpose, passFrom: from, passTo: to, looseLocation: loose }
        }
      );
      this.resolveLoosePuck(state, loose, teamId, "missed pass");
      return false;
    }

    this.advancePuckFlight(state, from, to, fullFlight, "pass");
    state.passCompletions[teamId] += 1;
    this.addAssistCandidate(state, passer.id);
    this.setPossession(state, teamId, recipient.id, false);
    const pickup = state.positions[recipient.id] ?? to;
    state.puck = { x: pickup.x, y: pickup.y };
    state.lastContext = purpose;
    this.addEvent(
      state,
      "pass",
      purpose === "entry"
        ? `${passer.name} connects with ${recipient.name} across the blue line.`
        : purpose === "one-timer"
          ? `${passer.name} slides the puck into ${recipient.name}'s shooting lane.`
          : `${passer.name} moves the puck to ${recipient.name}.`,
      {
        teamId,
        playerId: passer.id,
        secondaryPlayerId: recipient.id,
        location: { ...state.puck },
        details: { purpose, passFrom: from, passTo: to, flightSeconds: fullFlight }
      }
    );
    return true;
  }

  localPressure(state, player, defendingTeamId) {
    const playerPosition = state.positions[player.id] ?? state.puck;
    const defenders = state.onIce[defendingTeamId]
      .map((id) => this.teams[defendingTeamId].playerById[id])
      .filter(Boolean);
    let pressure = 0;
    for (const defender of defenders) {
      const defenderPosition = state.positions[defender.id];
      if (!defenderPosition) continue;
      const distance = Math.hypot(
        defenderPosition.x - playerPosition.x,
        defenderPosition.y - playerPosition.y
      );
      if (distance < 6) pressure += 0.48;
      else if (distance < 11) pressure += 0.26;
      else if (distance < 17) pressure += 0.1;
    }
    return this.clamp(pressure, 0, 1);
  }

  movePuckTowardZone(state, teamId, targetZone, carrier) {
    const direction = this.attackDirection(teamId, state.period);
    const current = state.positions[carrier.id] ?? state.puck;
    let targetX = current.x;
    if (targetZone === "OZ") targetX = direction === 1 ? this.random.range(132, 154) : this.random.range(46, 68);
    if (targetZone === "NZ") targetX = this.random.range(82, 118);
    if (targetZone === "DZ") targetX = direction === 1 ? this.random.range(35, 68) : this.random.range(132, 165);
    const targetY = this.clamp(current.y + this.random.normal(0, 7), 7, 78);
    const target = { x: targetX, y: targetY };
    const distance = Math.hypot(target.x - current.x, target.y - current.y);
    const carrySpeed = this.clamp(17 + (carrier.speed - 78) * 0.12, 14, 22.5);
    const travelTime = this.clamp(distance / carrySpeed, 0.28, 1.65);
    this.setMovementOverride(state, carrier.id, target, travelTime + 0.15);
    this.advanceClock(state, travelTime, targetZone === "OZ" ? "entry" : "carry");
    if (state.nextFaceoff) return { target, travelTime, stopped: true };
    const arrived = state.positions[carrier.id] ?? target;
    state.puck = { x: arrived.x, y: arrived.y };
    state.zone = this.zoneForTeam(state.puck.x, teamId, state.period);
    return { target, travelTime };
  }

  simulateZoneEntry(state, teamId, dumpIn = false) {
    const team = this.teams[teamId];
    const carrier = team.playerById[state.puckCarrierId] ?? this.chooseOnIcePlayer(
      state,
      teamId,
      (player) => player.speed + player.puckControl + player.offensiveAwareness
    );
    const defendingTeamId = this.opponent(teamId);
    const defender = this.chooseOnIcePlayer(
      state,
      defendingTeamId,
      (player) => player.defensiveAwareness + player.stickChecking + player.speed
    );

    if (dumpIn) {
      const direction = this.attackDirection(teamId, state.period);
      const blueLine = this.attackingBlueLine(teamId, state.period);
      // Dump-ins still require the puck to enter before attacking skaters who are already across.
      const offenders = this.spatialOffsideOffenders(state, teamId);
      if (offenders.length) return this.whistleForOffside(state, teamId, offenders);

      const from = { ...(state.positions[carrier.id] ?? state.puck) };
      const destination = {
        x: direction === 1 ? this.random.range(176, 194) : this.random.range(6, 24),
        y: this.random.chance(0.5) ? this.random.range(5, 19) : this.random.range(66, 80)
      };
      const dumpDistance = Math.hypot(destination.x - from.x, destination.y - from.y);
      const flightSeconds = this.clamp(dumpDistance / 72, 0.28, 1.05);
      this.advancePuckFlight(state, from, destination, flightSeconds, "dump-in");
      this.addEvent(
        state,
        "dump-in",
        `${carrier.name} sends the puck deep and both teams race to retrieve it.`,
        {
          teamId,
          playerId: carrier.id,
          location: { ...destination },
          details: { blueLineX: blueLine, spatialEntry: true, from, destination, flightSeconds }
        }
      );
      const winner = this.resolveLoosePuck(state, destination, teamId, "dump-in");
      state.lastContext = winner?.teamId === teamId ? "forecheck" : "retrieval";
      return;
    }

    // True spatial offside check: the puck must be first across the attacking blue line.
    const offenders = this.spatialOffsideOffenders(state, teamId);
    if (offenders.length) return this.whistleForOffside(state, teamId, offenders);

    const carrierEntrySkill =
      carrier.speed * 0.22 + carrier.acceleration * 0.14 + carrier.agility * 0.12 +
      carrier.puckControl * 0.22 + carrier.deking * 0.19 + carrier.offensiveAwareness * 0.11;
    const defenderEntrySkill =
      defender.speed * 0.14 + defender.acceleration * 0.10 + defender.agility * 0.10 +
      defender.stickChecking * 0.24 + defender.defensiveAwareness * 0.25 +
      defender.bodyChecking * 0.11 + defender.balance * 0.06;
    const entryProbability = this.clamp(
      0.58 + (carrierEntrySkill - defenderEntrySkill) * 0.012 - carrier.fatigue * 0.055 + defender.fatigue * 0.035,
      0.32,
      0.84
    );

    if (this.random.chance(entryProbability)) {
      const movement = this.movePuckTowardZone(state, teamId, "OZ", carrier);
      if (movement.stopped || state.nextFaceoff) return true;
      const breakaway = this.isBreakawayState(state, teamId, carrier.id);
      state.lastContext = breakaway ? "breakaway" : this.random.chance(0.3) ? "rush" : "entry";
      this.addEvent(
        state,
        "entry",
        breakaway
          ? `${carrier.name} gets in behind the defense with control.`
          : `${carrier.name} gains the offensive zone with control.`,
        {
          teamId,
          playerId: carrier.id,
          location: { ...state.puck },
          details: { spatialEntry: true, breakaway, blueLineX: this.attackingBlueLine(teamId, state.period) }
        }
      );
      if (state.clock > 2 && this.random.chance(breakaway ? 0.72 : state.lastContext === "rush" ? 0.42 : 0.24)) {
        this.advanceClock(state, this.random.range(breakaway ? 0.75 : 1.2, breakaway ? 1.6 : 2.8), "shot");
        this.simulateShot(state, teamId, { context: state.lastContext });
      }
      return;
    }

    defender.stats.takeaways += 1;
    carrier.stats.giveaways += 1;
    this.setPossession(state, defendingTeamId, defender.id, true);
    const position = state.positions[defender.id];
    if (position) state.puck = { x: position.x, y: position.y };
    state.lastContext = "turnover";
    this.addEvent(
      state,
      "turnover",
      `${defender.name} stands up ${carrier.name} at the blue line and takes the puck away.`,
      {
        teamId: defendingTeamId,
        playerId: defender.id,
        secondaryPlayerId: carrier.id,
        location: { ...state.puck }
      }
    );
  }

  simulateBreakout(state, teamId) {
    const team = this.teams[teamId];
    const carrier = team.playerById[state.puckCarrierId] ?? this.chooseOnIcePlayer(
      state,
      teamId,
      (player) => player.passing + player.puckControl + player.defensiveAwareness
    );
    const pressure = this.localPressure(state, carrier, this.opponent(teamId));
    const breakoutSkill =
      carrier.passing * 0.32 + carrier.puckControl * 0.24 + carrier.poise * 0.16 +
      carrier.defensiveAwareness * 0.12 + carrier.agility * 0.08 + carrier.acceleration * 0.08;
    const success = this.random.chance(
      this.clamp(0.71 + (breakoutSkill - 82) * 0.011 - pressure * 0.21 - carrier.fatigue * 0.05, 0.4, 0.92)
    );

    if (success) {
      this.movePuckTowardZone(state, teamId, "NZ", carrier);
      state.lastContext = "breakout";
      this.addEvent(
        state,
        "breakout",
        `${carrier.name} carries the puck out through the neutral zone.`,
        { teamId, playerId: carrier.id, location: { ...state.puck } }
      );
    } else {
      const opponentId = this.opponent(teamId);
      const forechecker = this.chooseOnIcePlayer(
        state,
        opponentId,
        (player) => player.aggressiveness + player.speed + player.stickChecking
      );
      carrier.stats.giveaways += 1;
      forechecker.stats.takeaways += 1;
      this.setPossession(state, opponentId, forechecker.id, true);
      const position = state.positions[forechecker.id];
      if (position) state.puck = { x: position.x, y: position.y };
      state.lastContext = "forecheck-turnover";
      this.addEvent(
        state,
        "turnover",
        `${forechecker.name} forces a turnover on the forecheck.`,
        {
          teamId: opponentId,
          playerId: forechecker.id,
          secondaryPlayerId: carrier.id,
          location: { ...state.puck }
        }
      );
    }
  }

  chooseShotRegion(state, shooter, context) {
    const weights = {
      crease: 0.06,
      "low slot": 0.18,
      "high slot": 0.21,
      "left circle": 0.17,
      "right circle": 0.17,
      point: 0.17,
      "goal line": 0.03,
      "behind net": 0.01
    };

    if (shooter.position.includes("D")) {
      weights.point += 0.42;
      weights["high slot"] -= 0.08;
      weights["low slot"] -= 0.08;
      weights.crease = 0.01;
    }
    if (context === "rebound") {
      weights.crease += 0.35;
      weights["low slot"] += 0.25;
      weights.point = 0.01;
    }
    if (context === "rush" || context === "breakaway") {
      weights["low slot"] += 0.24;
      weights["high slot"] += 0.12;
      weights.point = 0.03;
    }
    if (context === "cycle") {
      weights["left circle"] += 0.08;
      weights["right circle"] += 0.08;
      weights["goal line"] += 0.04;
    }

    const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
    return this.random.weightedChoice(entries, ([, weight]) => weight)[0];
  }

  coordinateForRegion(teamId, period, region) {
    const positive = this.attackDirection(teamId, period) === 1;
    const samplePositive = () => {
      switch (region) {
        case "crease":
          return { x: this.random.range(184, 190), y: this.random.range(34, 51) };
        case "low slot":
          return { x: this.random.range(168, 184), y: this.random.range(25, 60) };
        case "high slot":
          return { x: this.random.range(149, 168), y: this.random.range(27, 58) };
        case "left circle":
          return { x: this.random.range(151, 174), y: this.random.range(9, 29) };
        case "right circle":
          return { x: this.random.range(151, 174), y: this.random.range(56, 76) };
        case "point":
          return { x: this.random.range(128, 150), y: this.random.range(12, 73) };
        case "goal line":
          return {
            x: this.random.range(180, 191),
            y: this.random.chance(0.5) ? this.random.range(6, 23) : this.random.range(62, 79)
          };
        case "behind net":
          return { x: this.random.range(192, 198), y: this.random.range(19, 66) };
        default:
          return { x: this.random.range(150, 180), y: this.random.range(15, 70) };
      }
    };
    const point = samplePositive();
    return positive ? point : { x: 200 - point.x, y: 85 - point.y };
  }

  regionFromCoordinate(teamId, period, location) {
    const positive = this.attackDirection(teamId, period) === 1;
    const x = positive ? location.x : 200 - location.x;
    const y = positive ? location.y : 85 - location.y;
    if (x > 189) return "behind net";
    if (x >= 184 && x <= 189 && y >= 33 && y <= 52) return "crease";
    if (x >= 168 && x < 184 && y >= 24 && y <= 61) return "low slot";
    if (x >= 149 && x < 168 && y >= 26 && y <= 59) return "high slot";
    if (x >= 150 && x < 178 && y < 32) return "left circle";
    if (x >= 150 && x < 178 && y > 53) return "right circle";
    if (x >= 127 && x < 151) return "point";
    if (x >= 180 && (y < 33 || y > 52)) return "goal line";
    return "outside";
  }

  chooseShotTechnique(shooter, region, context, state = null) {
    const choices = [];
    const add = (name, weight) => choices.push({ name, weight });
    const validContext = state ? this.validateShotContext(state, shooter.teamId, shooter, context) : context;
    const recentSetupPass = state
      ? this.recentEvent((event) => event.type === "pass" && event.teamId === shooter.teamId && event.secondaryPlayerId === shooter.id, 1.65, state)
      : null;
    const recentSave = state
      ? this.recentEvent((event) => event.type === "shot" && event.outcome === "save" && event.teamId === shooter.teamId && event.details?.reboundLocation, 2.2, state)
      : null;

    if (region === "behind net") {
      // Context labels never override physical shot geometry. Even a rush that
      // carries beyond the goal line must come around a post.
      add("wraparound", 6.0);
    } else if (validContext === "rebound" && recentSave) {
      add("rebound wrist shot", 3.5);
      add("jam attempt", region === "crease" ? 2.4 : 1.1);
      add("backhand", 1.6);
      add("snap shot", 1.1);
    } else if (validContext === "breakaway") {
      add("wrist shot", 2.2);
      add("backhand", 1.5);
      add("deke", 2.3 + (shooter.deking - 80) * 0.05);
    } else if (region === "point") {
      add("slap shot", 3.5 + (shooter.slapShotPower - 80) * 0.04);
      add("wrist shot", 1.5);
      if (validContext === "one-timer" && recentSetupPass) add("one-timer", 4.2);
    } else if (region === "crease") {
      add("jam attempt", 3.3);
      add("backhand", 1.8);
      add("wrist shot", 1.1);
      if (recentSave) add("tip", 0.7 + (shooter.handEye - 80) * 0.025);
    } else if (region === "goal line") {
      add("wraparound", 2.6);
      add("wrist shot", 1.35);
      add("backhand", 0.7);
    } else {
      add("wrist shot", 3.2 + (shooter.wristShotAccuracy - 80) * 0.03);
      add("snap shot", 2.8);
      add("slap shot", 1.05 + (shooter.slapShotPower - 80) * 0.02);
      add("backhand", 0.75);
      if (validContext === "one-timer" && recentSetupPass) add("one-timer", 4.6);
    }

    return this.random.weightedChoice(choices, (choice) => choice.weight).name;
  }

  shotAccuracyRating(shooter, technique) {
    if (technique.includes("slap")) return shooter.slapShotAccuracy;
    if (technique.includes("tip") || technique.includes("jam")) return shooter.handEye;
    if (technique.includes("deke")) return (shooter.deking + shooter.puckControl) / 2;
    return shooter.wristShotAccuracy;
  }

  shotPowerRating(shooter, technique) {
    if (technique.includes("slap") || technique.includes("one-timer")) return shooter.slapShotPower;
    if (technique.includes("tip") || technique.includes("jam")) return shooter.strength;
    return shooter.wristShotPower;
  }

  placePlayersForShot(state, teamId, shooter, origin) {
    // V5.1: never move players during zero clock time just to stage a shot.
    // The shot is taken from the factual live position already reached by the
    // simulation. This avoids same-timestamp spatial jumps in goal replays.
    const current = state.positions[shooter.id] ?? { x: origin.x, y: origin.y, vx: 0, vy: 0 };
    state.positions[shooter.id] = { ...current, x: origin.x, y: origin.y };
    state.puck = { ...origin };
    state.puckCarrierId = shooter.id;
  }

  chooseBlocker(state, defendingTeamId, shotOrigin, attackingGoal) {
    const defenders = state.onIce[defendingTeamId]
      .map((id) => this.teams[defendingTeamId].playerById[id])
      .filter(Boolean);
    const lineLength = Math.hypot(attackingGoal.x - shotOrigin.x, attackingGoal.y - shotOrigin.y) || 1;

    return this.random.weightedChoice(defenders, (player) => {
      const position = state.positions[player.id];
      if (!position) return 0.1;
      const cross = Math.abs(
        (attackingGoal.y - shotOrigin.y) * position.x -
        (attackingGoal.x - shotOrigin.x) * position.y +
        attackingGoal.x * shotOrigin.y -
        attackingGoal.y * shotOrigin.x
      ) / lineLength;
      const laneWeight = this.clamp(18 - cross, 0.1, 18);
      return laneWeight * (player.shotBlocking + player.defensiveAwareness) * 0.01;
    });
  }

  targetOpenness(state, shooter, goalie, origin) {
    const goaliePosition = state.positions[goalie.id] ?? {
      x: this.ownGoalX(goalie.teamId, state.period),
      y: 42.5,
      vx: 0,
      vy: 0
    };
    const lateral = this.clamp((goaliePosition.y - 42.5) / 10, -1, 1);
    const moving = this.clamp(goaliePosition.vy / 3, -1, 1);
    const shooterBelowCenter = origin.y > 42.5;
    const base = {
      "glove high": 0.45,
      "glove low": 0.45,
      "stick high": 0.45,
      "stick low": 0.45,
      "five-hole": 0.28
    };

    const gloveSideSign = shooterBelowCenter ? -1 : 1;
    base["glove high"] += (-lateral * gloveSideSign + -moving * gloveSideSign) * 0.16;
    base["glove low"] += (-lateral * gloveSideSign) * 0.12;
    base["stick high"] += (lateral * gloveSideSign + moving * gloveSideSign) * 0.16;
    base["stick low"] += (lateral * gloveSideSign) * 0.12;
    base["five-hole"] += Math.abs(moving) * 0.2 + Math.abs(lateral) * 0.08;

    const pressure = this.localPressure(state, shooter, goalie.teamId);
    const visionAdvantage = (shooter.offensiveAwareness - goalie.vision) * 0.003;
    for (const target of Object.keys(base)) {
      base[target] = this.clamp(base[target] + visionAdvantage - pressure * 0.04 + this.random.normal(0, 0.03), 0.08, 0.88);
    }
    return base;
  }

  chooseIntendedAndActualTarget(state, shooter, goalie, origin, technique, pressure) {
    const openness = this.targetOpenness(state, shooter, goalie, origin);
    const targets = Object.keys(openness);
    const region = this.regionFromCoordinate(shooter.teamId, state.period, origin);
    const hasTimeToAim = pressure < 0.58 && !["point", "behind net"].includes(region) && !technique.includes("tip");
    let intended = null;

    if (hasTimeToAim) {
      const intelligence = this.clamp(
        (shooter.offensiveAwareness * 0.58 + shooter.poise * 0.42 - 70) / 28,
        0.1,
        1
      );
      intended = this.random.weightedChoice(targets, (target) =>
        0.25 + openness[target] * (0.8 + intelligence * 2.2)
      );
    }

    const accuracy = this.shotAccuracyRating(shooter, technique);
    const execution = this.clamp(
      0.48 +
      (accuracy - 75) * 0.018 +
      (shooter.poise - 80) * 0.006 -
      pressure * 0.24 -
      shooter.fatigue * 0.12,
      0.22,
      0.92
    );

    let actual = intended ?? this.random.choice(targets);
    if (!this.random.chance(execution)) {
      const targetFamilies = {
        "glove high": ["glove low", "five-hole", "stick high"],
        "glove low": ["glove high", "five-hole", "stick low"],
        "stick high": ["stick low", "five-hole", "glove high"],
        "stick low": ["stick high", "five-hole", "glove low"],
        "five-hole": ["glove low", "stick low", "glove high", "stick high"]
      };
      actual = this.random.choice(targetFamilies[actual]);
    }

    return { intended, actual, openness, execution };
  }

  goalieAttributeForTarget(goalie, target) {
    const map = {
      "glove high": goalie.gloveHigh,
      "glove low": goalie.gloveLow,
      "stick high": goalie.stickHigh,
      "stick low": goalie.stickLow,
      "five-hole": goalie.fiveHole
    };
    return map[target] ?? goalie.overall;
  }

  baseGoalProbability(region, context, technique) {
    const regionBase = {
      crease: 0.18,
      "low slot": 0.137,
      "high slot": 0.08,
      "left circle": 0.061,
      "right circle": 0.061,
      point: 0.03,
      "goal line": 0.036,
      "behind net": 0.017,
      outside: 0.023
    };
    let probability = regionBase[region] ?? 0.05;
    if (context === "rebound") probability += 0.07;
    if (context === "breakaway") probability = Math.max(probability, 0.19);
    if (context === "rush") probability += 0.025;
    if (context === "forecheck-turnover") probability += 0.03;
    if (technique.includes("one-timer")) probability += 0.025;
    if (technique.includes("tip")) probability += 0.035;
    if (technique.includes("wraparound")) probability += 0.01;
    if (technique.includes("jam")) probability += 0.018;
    return probability;
  }

  calculateGoalProbability(state, shooter, goalie, shot) {
    const targetRating = this.goalieAttributeForTarget(goalie, shot.actualTarget);
    let shooterSkill =
      this.shotAccuracyRating(shooter, shot.technique) * 0.42 +
      this.shotPowerRating(shooter, shot.technique) * 0.17 +
      shooter.offensiveAwareness * 0.20 +
      shooter.poise * 0.16 +
      shooter.handEye * 0.05;

    if (shot.technique.includes("deke")) {
      shooterSkill = shooter.deking * 0.38 + shooter.puckControl * 0.27 + shooter.poise * 0.18 + shooter.wristShotAccuracy * 0.10 + shooter.handEye * 0.07;
    } else if (shot.technique.includes("tip") || shot.technique.includes("jam")) {
      shooterSkill = shooter.handEye * 0.38 + shooter.strength * 0.18 + shooter.puckControl * 0.14 + shooter.offensiveAwareness * 0.18 + shooter.poise * 0.12;
    } else if (shot.technique.includes("one-timer")) {
      shooterSkill += (shooter.handEye - 80) * 0.12;
    }

    let goalieSkill =
      targetRating * 0.38 +
      goalie.angles * 0.20 +
      goalie.vision * (shot.screened ? 0.19 : 0.08) +
      goalie.poise * 0.11 +
      goalie.agility * 0.08 +
      goalie.recover * (shot.context === "rebound" ? 0.17 : 0.04);

    if (shot.context === "breakaway" || shot.technique.includes("deke")) {
      const breakawayDefense =
        goalie.breakaway * 0.52 + goalie.pokeCheck * 0.23 + goalie.agility * 0.10 +
        goalie.speed * 0.07 + goalie.poise * 0.05 + goalie.aggressiveness * 0.03;
      goalieSkill = goalieSkill * 0.55 + breakawayDefense * 0.45;
    }

    const openness = shot.openness[shot.actualTarget] ?? 0.4;
    const specialTeams = this.teamSituation(state, shooter.teamId) === "PP" ? 0.014 : 0;
    const pressurePenalty = shot.pressure * 0.018;
    const screenBonus = shot.screened ? 0.022 : 0;
    const fatigueAdjustment = (goalie.fatigue - shooter.fatigue) * 0.016;
    const base = this.baseGoalProbability(shot.region, shot.context, shot.technique);
    return this.clamp(
      base +
      (shooterSkill - goalieSkill) * 0.0022 +
      (openness - 0.4) * 0.055 +
      specialTeams +
      screenBonus +
      fatigueAdjustment -
      pressurePenalty,
      0.01,
      0.34
    );
  }

  calculateReboundLocation(state, shot, goalie, saveType, outcome) {
    const goalX = this.ownGoalX(goalie.teamId, state.period);
    const directionAwayFromGoal = goalX < 100 ? 1 : -1;
    const incomingAngle = Math.atan2(shot.origin.y - 42.5, shot.origin.x - goalX);
    let angleCenter = incomingAngle + Math.PI;
    let angleSpread = 0.45;
    let distanceMin = 4;
    let distanceMax = 13;

    if (saveType === "pad") {
      angleCenter = shot.origin.y < 42.5 ? Math.PI / 2 : -Math.PI / 2;
      angleSpread = 0.72;
      distanceMin = outcome === "dangerous" ? 4 : 9;
      distanceMax = outcome === "dangerous" ? 15 : 24;
    } else if (saveType === "blocker") {
      angleCenter = shot.actualTarget.includes("stick") ? (shot.origin.y < 42.5 ? Math.PI / 2 : -Math.PI / 2) : angleCenter;
      angleSpread = 0.58;
      distanceMin = 7;
      distanceMax = 22;
    } else if (saveType === "body") {
      angleCenter = directionAwayFromGoal === 1 ? 0 : Math.PI;
      angleSpread = 0.75;
      distanceMin = 2;
      distanceMax = 9;
    } else if (saveType === "glove-drop") {
      angleCenter = directionAwayFromGoal === 1 ? 0 : Math.PI;
      angleSpread = 0.5;
      distanceMin = 1.5;
      distanceMax = 6;
    }

    const control = this.clamp((goalie.reboundControl - 70) / 26, 0, 1);
    if (outcome === "controlled") {
      angleSpread *= 0.45 + (1 - control) * 0.3;
      distanceMin += 4;
      distanceMax += 6;
    } else {
      angleSpread *= 1.05 + (1 - control) * 0.4;
      distanceMax += (1 - control) * 5;
    }

    const angle = angleCenter + this.random.normal(0, angleSpread / 2.5);
    const distance = this.random.range(distanceMin, distanceMax);
    const start = {
      x: goalX + directionAwayFromGoal * 3,
      y: this.clamp(42.5 + this.random.normal(0, 5), 31, 54)
    };
    return {
      x: this.clamp(start.x + Math.cos(angle) * distance, 3, 197),
      y: this.clamp(start.y + Math.sin(angle) * distance, 3, 82)
    };
  }

  decideReboundWinner(state, location, attackingTeamId) {
    const candidates = [];
    for (const teamId of [this.homeId, this.awayId]) {
      const team = this.teams[teamId];
      for (const id of state.onIce[teamId]) {
        const player = team.playerById[id];
        const position = state.positions[id];
        if (!player || !position) continue;
        const distance = Math.max(1, Math.hypot(position.x - location.x, position.y - location.y));
        const towardPuck = position.vx * (location.x - position.x) + position.vy * (location.y - position.y);
        const momentumBonus = this.clamp(towardPuck / 10, -4, 6);
        const awareness = teamId === attackingTeamId ? player.offensiveAwareness : player.defensiveAwareness;
        const score =
          (player.acceleration * 0.32 + player.speed * 0.23 + awareness * 0.26 + player.balance * 0.09) /
          Math.pow(distance, 0.72) +
          momentumBonus +
          this.random.normal(0, 2.5);
        candidates.push({ player, teamId, score, distance });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  resolveSaveOutcome(state, goalie, shot) {
    const target = shot.actualTarget;
    let saveType = "body";
    if (target.includes("glove")) saveType = this.random.chance(0.68) ? "glove" : "body";
    else if (target.includes("stick high")) saveType = "blocker";
    else if (target.includes("stick low") || target === "five-hole") saveType = "pad";

    const reboundControl = this.clamp((goalie.reboundControl - 70) / 26, 0, 1);
    const recovery = this.clamp((goalie.recover - 70) / 26, 0, 1);
    let coverProbability =
      0.33 + reboundControl * 0.17 +
      (goalie.poise - 80) * 0.0022 +
      (goalie.vision - 80) * (shot.screened ? 0.0018 : 0.0008);
    if (saveType === "glove") coverProbability += 0.18;
    if (shot.context === "rebound") coverProbability -= 0.13;
    if (shot.screened) coverProbability -= 0.07;
    coverProbability = this.clamp(coverProbability, 0.24, 0.68);

    let controlledProbability =
      0.19 + reboundControl * 0.14 + recovery * 0.05 +
      (goalie.poise - 80) * 0.0015 - goalie.fatigue * 0.025;
    if (saveType === "pad" || saveType === "blocker") controlledProbability += 0.03;
    controlledProbability = this.clamp(controlledProbability, 0.18, 0.36);

    // Elite goalies should suppress dangerous rebounds, not eliminate them.
    // The previous probabilities could add to >1.0 for a highly rated goalie,
    // making a dangerous rebound essentially impossible. Preserve at least a
    // modest live-puck tail, with screens/rebound scrambles raising it.
    const minimumDangerous = this.clamp(
      0.10 + (shot.screened ? 0.05 : 0) + (shot.context === "rebound" ? 0.06 : 0),
      0.10,
      0.22
    );
    controlledProbability = Math.min(controlledProbability, 1 - coverProbability - minimumDangerous);

    const roll = this.random.next();
    if (roll < coverProbability) return { outcome: "covered", saveType: saveType === "glove" ? "glove" : saveType };
    if (roll < coverProbability + controlledProbability) {
      return {
        outcome: "controlled",
        saveType: saveType === "glove" ? "glove-drop" : saveType
      };
    }
    return {
      outcome: "dangerous",
      saveType: saveType === "glove" ? "glove-drop" : saveType
    };
  }

  shotDescription(shot) {
    const contextText = shot.context === "rebound" && !shot.technique.startsWith("rebound")
      ? "rebound "
      : shot.context === "breakaway"
        ? "breakaway "
        : "";
    return `${contextText}${shot.technique} from the ${shot.region}`;
  }

  releaseMinorAfterPowerPlayGoal(state, scoringTeamId) {
    const defendingTeamId = this.opponent(scoringTeamId);
    const countsBefore = this.strengthCounts(state);
    if (countsBefore[scoringTeamId] <= countsBefore[defendingTeamId]) return;
    const releasable = state.activePenalties.find(
      (penalty) =>
        penalty.teamId === defendingTeamId &&
        penalty.affectsStrength &&
        penalty.releasableOnGoal &&
        penalty.remaining > 0
    );
    if (!releasable) return;

    if (releasable.originalDuration === 240 && releasable.remaining > 120) {
      releasable.remaining = 120;
    } else {
      releasable.remaining = 0;
      state.activePenalties = state.activePenalties.filter((penalty) => penalty !== releasable);
    }
    this.refreshUnits(state, false);
  }

  createGoalReplay(state, scoringTeamId, scorer, assists, shot) {
    const defendingTeamId = this.opponent(scoringTeamId);
    const attackingSkaters = [...state.onIce[scoringTeamId]];
    const defendingSkaters = [...state.onIce[defendingTeamId]];
    const attackingGoalieId = this.teams[scoringTeamId].goalie.id;
    const defendingGoalieId = this.teams[defendingTeamId].goalie.id;
    const participants = [
      ...attackingSkaters.map((id) => ({ id, teamId: scoringTeamId })),
      { id: attackingGoalieId, teamId: scoringTeamId },
      ...defendingSkaters.map((id) => ({ id, teamId: defendingTeamId })),
      { id: defendingGoalieId, teamId: defendingTeamId }
    ];

    const buildupSeconds = 6;
    const postGoalSeconds = 2;
    const durationSeconds = buildupSeconds + postGoalSeconds;
    const framesPerSecond = 30;
    const dt = 1 / framesPerSecond;
    const frameCount = Math.round(durationSeconds * framesPerSecond);
    const goalTime = buildupSeconds;
    const direction = this.attackDirection(scoringTeamId, state.period);
    const goalLineX = direction === 1 ? AVHL_RINK.goalLines.high : AVHL_RINK.goalLines.low;
    const shotPower = this.shotPowerRating(scorer, shot.technique);
    const isWraparound = shot.technique === "wraparound";
    const wrapSide = shot.origin.y < 42.5 ? -1 : 1;
    const targetYOffset = (() => {
      const targetMap = {
        "glove high": -4.2,
        "glove low": -2.2,
        "stick high": 4.2,
        "stick low": 2.2,
        "five-hole": 0
      };
      return targetMap[shot.actualTarget] ?? 0;
    })();
    const goalTarget = {
      // The replay's zero point is the instant the puck breaks the plane, not
      // the later instant when it reaches the back mesh.
      x: goalLineX + direction * 0.08,
      y: isWraparound
        ? 42.5 + wrapSide * 3.45
        : this.clamp(42.5 + targetYOffset + (shot.origin.y - 42.5) * 0.055, 35.3, 49.7)
    };
    const wrapPost = {
      x: goalLineX - direction * 0.75,
      y: 42.5 + wrapSide * 4.75
    };
    const shotDistance = isWraparound
      ? Math.hypot(wrapPost.x - shot.origin.x, wrapPost.y - shot.origin.y) + Math.hypot(goalTarget.x - wrapPost.x, goalTarget.y - wrapPost.y)
      : Math.hypot(goalTarget.x - shot.origin.x, goalTarget.y - shot.origin.y);
    const shotSpeedFps = isWraparound
      ? this.clamp(42 + (shotPower - 70) * 0.55, 38, 62)
      : this.clamp(
          96 + (shotPower - 70) * 1.45 + (shot.technique === "one-timer" ? 8 : 0),
          92,
          148
        );
    const shotFlightSeconds = isWraparound
      ? this.clamp(shotDistance / shotSpeedFps, 0.22, 0.5)
      : this.clamp(shotDistance / shotSpeedFps, 0.09, 0.44);
    const releaseTime = goalTime - shotFlightSeconds;
    const cutoffAbsolute = state.absoluteTime - releaseTime;
    const playerFor = (id) => this.getPlayerById(id);
    const deterministic = (key, min = 0, max = 1) => {
      const hash = AVHLGameSimulator.hashString(`${key}-${this.seed}-${state.absoluteTime.toFixed(3)}`) >>> 0;
      return min + (hash / 4294967295) * (max - min);
    };

    const goalType = shot.context === "breakaway" || shot.technique === "deke"
      ? "breakaway"
      : shot.technique === "one-timer"
        ? "one-timer"
        : shot.context === "rebound" || shot.technique?.includes("rebound")
          ? "rebound"
          : shot.technique === "jam attempt"
            ? "net-front-jam"
            : shot.technique === "wraparound"
              ? "wraparound"
              : shot.technique === "backhand"
                ? "backhand"
                : shot.technique === "tip"
                  ? "tip"
                  : shot.technique === "slap shot"
                    ? "slap-shot"
                    : shot.technique === "snap shot"
                      ? "snap-shot"
                      : "wrist-shot";

    const sameLineup = (snapshot) => {
      if (!snapshot?.onIce) return true;
      const same = (a = [], b = []) => {
        if (a.length !== b.length) return false;
        const left = [...a].sort();
        const right = [...b].sort();
        return left.every((id, index) => id === right[index]);
      };
      return same(snapshot.onIce[this.homeId], state.onIce[this.homeId]) && same(snapshot.onIce[this.awayId], state.onIce[this.awayId]);
    };

    const rawSnapshots = state.replayBuffer.filter(
      (snapshot) => snapshot.period === state.period && snapshot.time >= cutoffAbsolute - 0.15 && snapshot.time <= state.absoluteTime + 0.01
    );
    let lineupStartAbsolute = cutoffAbsolute;
    for (let index = rawSnapshots.length - 1; index >= 0; index -= 1) {
      if (!sameLineup(rawSnapshots[index])) {
        lineupStartAbsolute = rawSnapshots[index + 1]?.time ?? state.absoluteTime;
        break;
      }
      lineupStartAbsolute = rawSnapshots[index].time;
    }

    const rawRecentEvents = this.events.filter(
      (event) => event.period === state.period && event.absoluteTime >= cutoffAbsolute - 0.15 && event.absoluteTime <= state.absoluteTime + 0.01
    );
    const latestRestart = [...rawRecentEvents]
      .reverse()
      .find((event) => event.type === "faceoff" || event.type === "period-start");
    const activeStartAbsolute = Math.max(cutoffAbsolute, lineupStartAbsolute, latestRestart?.absoluteTime ?? cutoffAbsolute);

    const recentSnapshots = rawSnapshots
      .filter((snapshot) => snapshot.time >= activeStartAbsolute - 0.01)
      .map((snapshot) => ({
        t: this.clamp(snapshot.time - cutoffAbsolute, 0, releaseTime),
        positions: snapshot.positions,
        puck: snapshot.puck,
        puckCarrierId: snapshot.puckCarrierId,
        possessionTeam: snapshot.possessionTeam,
        onIce: snapshot.onIce
      }));

    const recentEvents = rawRecentEvents
      .filter((event) => event.absoluteTime >= activeStartAbsolute - 0.01)
      .map((event) => ({
        id: event.id,
        type: event.type,
        t: this.clamp(event.absoluteTime - cutoffAbsolute, 0, releaseTime),
        teamId: event.teamId,
        playerId: event.playerId,
        secondaryPlayerId: event.secondaryPlayerId,
        outcome: event.outcome,
        location: event.location ? { ...event.location } : null,
        spatial: event.spatial ? this.clone(event.spatial) : null,
        details: event.details ? this.clone(event.details) : null
      }));

    const sequence = recentEvents
      .filter((event) => [
        "faceoff", "breakout", "entry", "dump-in", "pass", "pass-miss", "recovery",
        "possession", "turnover", "hit", "shot", "shot-attempt", "clear"
      ].includes(event.type))
      .map((event) => ({
        type: event.type,
        t: event.t,
        teamId: event.teamId,
        playerId: event.playerId,
        secondaryPlayerId: event.secondaryPlayerId,
        outcome: event.outcome,
        location: event.location,
        purpose: event.details?.purpose ?? null
      }));
    sequence.push({
      type: "shot",
      t: releaseTime,
      teamId: scoringTeamId,
      playerId: scorer.id,
      secondaryPlayerId: null,
      outcome: "goal",
      location: { ...shot.origin },
      purpose: shot.technique,
      context: shot.context
    });

    const dedupePoints = (points) => {
      const sorted = points
        .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.x) && Number.isFinite(point.y))
        .sort((a, b) => a.t - b.t || (a.priority ?? 0) - (b.priority ?? 0));
      const out = [];
      for (const point of sorted) {
        const last = out.at(-1);
        if (last && Math.abs(last.t - point.t) < 0.018) {
          out[out.length - 1] = { ...last, ...point };
        } else {
          out.push({ ...point });
        }
      }
      return out;
    };

    const clampPlayerPoint = (point, player, previous = null) => ({
      ...point,
      ...this.constrainPlayerPoint(previous, point, player)
    });

    const sourceByPlayer = new Map();
    const sourceWarnings = [];
    for (const { id, teamId } of participants) {
      const player = playerFor(id);
      const goalie = player?.position === "G";
      const points = [];
      for (const snapshot of recentSnapshots) {
        const position = snapshot.positions?.[id];
        if (position) points.push({ t: snapshot.t, ...position, priority: 0 });
      }
      for (const event of recentEvents) {
        const position = event.spatial?.positions?.[id];
        if (position) points.push({ t: event.t, ...position, priority: 1 });
      }
      const current = state.positions[id] ?? this.defaultPositionForPlayer(state, teamId, id, 0);
      points.push({ t: releaseTime, ...current, priority: 3 });
      let previousCleaned = null;
      let cleaned = dedupePoints(points).map((point) => {
        const cleanedPoint = clampPlayerPoint(point, player, previousCleaned);
        previousCleaned = cleanedPoint;
        return cleanedPoint;
      });
      if (!cleaned.length) cleaned = [clampPlayerPoint({ t: 0, ...current }, player), clampPlayerPoint({ t: releaseTime, ...current }, player)];

      // The 10 Hz source buffer is not guaranteed to land exactly on the
      // replay-window boundary. Duplicating the first source point at t=0
      // creates an artificial dead stop followed by a 20+ ft/s launch one
      // frame later. If the first factual sample is only a fraction of a
      // second into the window, extrapolate its existing motion backward to
      // the boundary instead. For a genuine restart later in the six-second
      // window (faceoff/line change), keep the pre-restart hold instead.
      if (cleaned[0].t > 0.001) {
        const first = cleaned[0];
        const second = cleaned[1];
        if (second && first.t <= 0.25 && second.t > first.t + 0.015) {
          const span = second.t - first.t;
          let vx = (second.x - first.x) / span;
          let vy = (second.y - first.y) / span;
          const maxBackfillSpeed = goalie ? 12.5 : 26.5 + ((player?.speed ?? 82) - 82) * 0.075;
          const speed = Math.hypot(vx, vy);
          if (speed > maxBackfillSpeed && speed > 1e-6) {
            const scale = maxBackfillSpeed / speed;
            vx *= scale;
            vy *= scale;
          }
          cleaned.unshift(clampPlayerPoint({
            t: 0,
            x: first.x - vx * first.t,
            y: first.y - vy * first.t,
            vx,
            vy,
            priority: -1
          }, player));
        } else {
          cleaned.unshift({ ...first, t: 0 });
        }
      }

      const maxPhysicalSpeed = goalie ? 13.5 : 27.5 + ((player?.speed ?? 82) - 82) * 0.08;
      for (let i = 1; i < cleaned.length; i += 1) {
        const span = cleaned[i].t - cleaned[i - 1].t;
        if (span <= 0.02) continue;
        const speed = Math.hypot(cleaned[i].x - cleaned[i - 1].x, cleaned[i].y - cleaned[i - 1].y) / span;
        if (speed > maxPhysicalSpeed * 1.45) {
          sourceWarnings.push({ playerId: id, t: cleaned[i].t, speed });
        }
      }
      sourceByPlayer.set(id, cleaned);
    }

    // The shot begins at the scorer's actual spatial location. During puck
    // flight all players continue their existing momentum; the defending
    // goalie also makes a small, bounded reaction toward the real target.
    for (const { id, teamId } of participants) {
      const player = playerFor(id);
      const goalie = player?.position === "G";
      let points = sourceByPlayer.get(id) ?? [];
      const current = state.positions[id] ?? this.defaultPositionForPlayer(state, teamId, id, 0);
      if (id === scorer.id) {
        points.push({ t: releaseTime, x: shot.origin.x, y: shot.origin.y, vx: current.vx ?? 0, vy: current.vy ?? 0, priority: 5 });
      }
      const releasePoint = dedupePoints(points).at(-1) ?? { t: releaseTime, ...current };
      let endX = releasePoint.x + (releasePoint.vx ?? 0) * shotFlightSeconds * (goalie ? 0.35 : 0.72);
      let endY = releasePoint.y + (releasePoint.vy ?? 0) * shotFlightSeconds * (goalie ? 0.35 : 0.72);
      if (id === defendingGoalieId) {
        const ownGoal = this.ownGoalX(defendingTeamId, state.period);
        const goalieDirection = this.attackDirection(defendingTeamId, state.period);
        const desiredX = this.clamp(releasePoint.x + (ownGoal + goalieDirection * 3.0 - releasePoint.x) * 0.16, 4, 196);
        const desiredY = this.clamp(releasePoint.y + this.clamp((goalTarget.y - releasePoint.y) * 0.52, -2.75, 2.75), 31.5, 53.5);
        const agility = player?.agility ?? 82;
        const goalieMaxSpeed = this.clamp(10.5 + (agility - 82) * 0.07, 9.4, 12.2);
        const goalieMaxAccel = this.clamp(24 + (agility - 82) * 0.22, 20, 29);
        const startVx = Number.isFinite(releasePoint.vx) ? releasePoint.vx : 0;
        const startVy = Number.isFinite(releasePoint.vy) ? releasePoint.vy : 0;
        const toTargetX = desiredX - releasePoint.x;
        const toTargetY = desiredY - releasePoint.y;
        const targetDistance = Math.hypot(toTargetX, toTargetY);
        let desiredVx = targetDistance > 1e-6 ? (toTargetX / targetDistance) * goalieMaxSpeed : 0;
        let desiredVy = targetDistance > 1e-6 ? (toTargetY / targetDistance) * goalieMaxSpeed : 0;

        // The goalie cannot instantaneously reverse or jump laterally during
        // a 0.09–0.30 second shot flight. Change velocity only by what his
        // acceleration permits, then integrate that velocity through the
        // shot. This preserves a readable shuffle/push rather than a snap.
        let deltaVx = desiredVx - startVx;
        let deltaVy = desiredVy - startVy;
        const deltaV = Math.hypot(deltaVx, deltaVy);
        const maxDeltaV = goalieMaxAccel * shotFlightSeconds;
        if (deltaV > maxDeltaV && deltaV > 1e-6) {
          const scale = maxDeltaV / deltaV;
          deltaVx *= scale;
          deltaVy *= scale;
        }
        let endVx = startVx + deltaVx;
        let endVy = startVy + deltaVy;
        const endSpeed = Math.hypot(endVx, endVy);
        if (endSpeed > goalieMaxSpeed && endSpeed > 1e-6) {
          const scale = goalieMaxSpeed / endSpeed;
          endVx *= scale;
          endVy *= scale;
        }
        endX = this.clamp(releasePoint.x + (startVx + endVx) * 0.5 * shotFlightSeconds, 4, 196);
        endY = this.clamp(releasePoint.y + (startVy + endVy) * 0.5 * shotFlightSeconds, 31.5, 53.5);
        points.push(clampPlayerPoint({ t: goalTime, x: endX, y: endY, vx: endVx, vy: endVy, priority: 6 }, player, releasePoint));
        sourceByPlayer.set(id, dedupePoints(points));
        continue;
      }
      points.push(clampPlayerPoint({ t: goalTime, x: endX, y: endY, vx: releasePoint.vx ?? 0, vy: releasePoint.vy ?? 0, priority: 6 }, player, releasePoint));
      sourceByPlayer.set(id, dedupePoints(points));
    }

    const cappedTangent = (vx, vy, maxSpeed) => {
      const speed = Math.hypot(vx, vy);
      if (speed <= maxSpeed || speed <= 1e-6) return { vx, vy };
      return { vx: vx * maxSpeed / speed, vy: vy * maxSpeed / speed };
    };

    const tangentAt = (points, index, maxSpeed) => {
      const point = points[index];
      let vx;
      let vy;
      if (index === 0) {
        const next = points[Math.min(1, points.length - 1)];
        const span = Math.max(0.03, next.t - point.t);
        vx = (next.x - point.x) / span;
        vy = (next.y - point.y) / span;
      } else if (index === points.length - 1) {
        const prev = points[index - 1];
        const span = Math.max(0.03, point.t - prev.t);
        vx = (point.x - prev.x) / span;
        vy = (point.y - prev.y) / span;
      } else {
        const prev = points[index - 1];
        const next = points[index + 1];
        const span = Math.max(0.03, next.t - prev.t);
        vx = (next.x - prev.x) / span;
        vy = (next.y - prev.y) / span;
      }
      if (Number.isFinite(point.vx) && Number.isFinite(point.vy)) {
        vx = vx * 0.72 + point.vx * 0.28;
        vy = vy * 0.72 + point.vy * 0.28;
      }
      return cappedTangent(vx, vy, maxSpeed);
    };

    const boardAwareTangent = (point, tangent, goalie) => {
      const minX = goalie ? 4 : 2.5;
      const maxX = goalie ? 196 : 197.5;
      const minY = goalie ? 30.5 : 2.5;
      const maxY = goalie ? 54.5 : 82.5;
      const braking = goalie ? 23 : 19;
      let { vx, vy } = tangent;
      const capOutward = (velocity, distance, negative) => {
        const maxOutward = Math.sqrt(Math.max(0, 2 * braking * Math.max(0, distance)));
        return negative ? Math.max(velocity, -maxOutward) : Math.min(velocity, maxOutward);
      };
      if (vx < 0) vx = capOutward(vx, point.x - minX, true);
      if (vx > 0) vx = capOutward(vx, maxX - point.x, false);
      if (vy < 0) vy = capOutward(vy, point.y - minY, true);
      if (vy > 0) vy = capOutward(vy, maxY - point.y, false);
      return { vx, vy };
    };

    const samplePlayerSource = (points, t, player) => {
      if (!points?.length) return { x: 100, y: 42.5 };
      if (t <= points[0].t) return points[0];
      if (t >= points.at(-1).t) return points.at(-1);
      let index = 0;
      while (index < points.length - 2 && points[index + 1].t < t) index += 1;
      const a = points[index];
      const b = points[index + 1];
      const span = Math.max(0.001, b.t - a.t);
      const u = this.clamp((t - a.t) / span, 0, 1);
      if (span < 0.045) {
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
      const goalie = player?.position === "G";
      const maxSpeed = goalie ? 13.5 : 27.5 + ((player?.speed ?? 82) - 82) * 0.08;
      // Use one tangent per factual source point. V5.0 conditioned the
      // tangent separately for each segment, which meant the exact same
      // anchor could have one incoming velocity and a completely different
      // outgoing velocity. At 30 FPS that looked like a player snapping or
      // swinging instantly. A shared capped tangent keeps velocity continuous
      // through the anchor; the position guard below still prevents spline
      // overshoot from inventing routes that did not occur.
      const ta = boardAwareTangent(a, tangentAt(points, index, maxSpeed), goalie);
      const tb = boardAwareTangent(b, tangentAt(points, index + 1, maxSpeed), goalie);
      const u2 = u * u;
      const u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      const h11 = u3 - u2;
      let x = h00 * a.x + h10 * span * ta.vx + h01 * b.x + h11 * span * tb.vx;
      let y = h00 * a.y + h10 * span * ta.vy + h01 * b.y + h11 * span * tb.vy;
      // Prevent cubic overshoot from turning a factual transition into an arc
      // that never happened. A small margin still allows natural carving.
      const margin = 0.65;
      x = this.clamp(x, Math.min(a.x, b.x) - margin, Math.max(a.x, b.x) + margin);
      y = this.clamp(y, Math.min(a.y, b.y) - margin, Math.max(a.y, b.y) + margin);
      return { x, y };
    };

    const smoothStep = (u) => {
      const t = this.clamp(u, 0, 1);
      return t * t * (3 - 2 * t);
    };

    const applyReplayKinematicFilter = (desiredFrames, player, goalie, exactReleasePoint = null) => {
      if (!desiredFrames?.length || desiredFrames.length < 3) return desiredFrames ?? [];
      const maxSpeed = goalie
        ? 13
        : 27.5 + ((player?.speed ?? 82) - 82) * 0.08;
      const maxAcceleration = goalie
        ? 30
        : 50 + ((player?.agility ?? 82) - 82) * 0.22;
      const lookAheadFrames = 2;
      const filtered = [{ ...desiredFrames[0] }];
      let vx = (desiredFrames[1].x - desiredFrames[0].x) / dt;
      let vy = (desiredFrames[1].y - desiredFrames[0].y) / dt;
      ({ vx, vy } = cappedTangent(vx, vy, maxSpeed));

      for (let index = 1; index < desiredFrames.length; index += 1) {
        const current = filtered[index - 1];
        const lookAheadIndex = Math.min(desiredFrames.length - 1, index + lookAheadFrames);
        const horizon = Math.max(dt, (lookAheadIndex - index + 1) * dt);
        const target = desiredFrames[lookAheadIndex];
        let desiredVx = (target.x - current.x) / horizon;
        let desiredVy = (target.y - current.y) / horizon;
        ({ vx: desiredVx, vy: desiredVy } = cappedTangent(desiredVx, desiredVy, maxSpeed));

        let ax = (desiredVx - vx) / dt;
        let ay = (desiredVy - vy) / dt;
        const acceleration = Math.hypot(ax, ay);
        if (acceleration > maxAcceleration && acceleration > 1e-6) {
          const scale = maxAcceleration / acceleration;
          ax *= scale;
          ay *= scale;
        }
        vx += ax * dt;
        vy += ay * dt;
        ({ vx, vy } = cappedTangent(vx, vy, maxSpeed));
        ({ vx, vy } = boardAwareTangent(current, { vx, vy }, goalie));

        const constrained = this.constrainPlayerPoint(current, {
          x: current.x + vx * dt,
          y: current.y + vy * dt
        }, player);
        filtered.push({ ...desiredFrames[index], x: constrained.x, y: constrained.y });
      }

      // The scorer must still be exactly at the factual release location so
      // the stick/puck relationship does not drift apart. Spread that small
      // correction over the preceding 0.8 s rather than snapping the circle
      // onto the shot origin at release.
      if (exactReleasePoint) {
        const releaseIndex = Math.min(filtered.length - 1, Math.max(0, Math.round(releaseTime * framesPerSecond)));
        const releaseFrame = filtered[releaseIndex];
        const dx = exactReleasePoint.x - releaseFrame.x;
        const dy = exactReleasePoint.y - releaseFrame.y;
        const correctionStart = Math.max(0, releaseTime - 0.8);
        const minX = goalie ? 4 : 2.5;
        const maxX = goalie ? 196 : 197.5;
        const minY = goalie ? 30.5 : 2.5;
        const maxY = goalie ? 54.5 : 82.5;
        for (const frame of filtered) {
          if (frame.t < correctionStart) continue;
          const factor = frame.t <= releaseTime
            ? smoothStep((frame.t - correctionStart) / Math.max(0.001, releaseTime - correctionStart))
            : Math.max(0, 1 - smoothStep((frame.t - releaseTime) / 0.55));
          frame.x = this.clamp(frame.x + dx * factor, minX, maxX);
          frame.y = this.clamp(frame.y + dy * factor, minY, maxY);
        }
      }

      for (let index = 0; index < filtered.length; index += 1) {
        const constrained = this.constrainPlayerPoint(index > 0 ? filtered[index - 1] : null, filtered[index], player);
        filtered[index].x = constrained.x;
        filtered[index].y = constrained.y;
      }

      return filtered;
    };

    const denseTracks = new Map();
    for (const { id } of participants) {
      const player = playerFor(id);
      const goalie = player?.position === "G";
      const source = sourceByPlayer.get(id);
      const frames = [];
      for (let frame = 0; frame <= Math.round(goalTime * framesPerSecond); frame += 1) {
        const t = frame * dt;
        const point = samplePlayerSource(source, t, player);
        const constrained = this.constrainPlayerPoint(frames.at(-1) ?? null, point, player);
        frames.push({
          t,
          x: constrained.x,
          y: constrained.y
        });
      }

      // Post-goal motion is simply the momentum already present at the goal,
      // gradually bled off. No celebration template or arbitrary destination.
      let vx = frames.length > 1 ? (frames.at(-1).x - frames.at(-2).x) / dt : 0;
      let vy = frames.length > 1 ? (frames.at(-1).y - frames.at(-2).y) / dt : 0;
      let current = { ...frames.at(-1) };
      const decel = goalie ? 15 : id === scorer.id ? 8.5 : 10.5;
      for (let frame = Math.round(goalTime * framesPerSecond) + 1; frame <= frameCount; frame += 1) {
        const t = frame * dt;
        let speed = Math.hypot(vx, vy);
        const nextSpeed = Math.max(0, speed - decel * dt);
        if (speed > 0.001) {
          vx *= nextSpeed / speed;
          vy *= nextSpeed / speed;
        } else {
          vx = 0;
          vy = 0;
        }

        // Brake against the rink boundary using stopping distance rather than
        // letting a moving player hit a coordinate clamp in a single frame.
        // This is especially important in the +2 s post-goal continuation,
        // where a scorer can still have substantial momentum toward the wall.
        ({ vx, vy } = boardAwareTangent(current, { vx, vy }, goalie));
        const nextX = current.x + vx * dt;
        const nextY = current.y + vy * dt;
        const constrained = this.constrainPlayerPoint(current, { x: nextX, y: nextY }, player);
        if (Math.abs(constrained.x - nextX) > 0.001) vx = 0;
        if (Math.abs(constrained.y - nextY) > 0.001) vy = 0;
        current = {
          t,
          x: constrained.x,
          y: constrained.y
        };
        frames.push(current);
      }
      const filteredFrames = applyReplayKinematicFilter(
        frames,
        player,
        goalie,
        id === scorer.id ? shot.origin : null
      );
      denseTracks.set(id, filteredFrames);
    }

    // Rebuild the two-second continuation as one shared physical system. The
    // earlier per-player coast could send several independently filtered paths
    // through the same stationary screen after the goal.
    const goalFrameIndex = Math.round(goalTime * framesPerSecond);
    const postStates = new Map();
    for (const { id } of participants) {
      const frames = denseTracks.get(id);
      const current = frames[goalFrameIndex];
      const previous = frames[Math.max(0, goalFrameIndex - 1)];
      postStates.set(id, {
        x: current.x,
        y: current.y,
        vx: (current.x - previous.x) / dt,
        vy: (current.y - previous.y) / dt
      });
    }
    for (let frameIndex = goalFrameIndex + 1; frameIndex <= frameCount; frameIndex += 1) {
      const proposals = new Map();
      for (const { id } of participants) {
        const player = playerFor(id);
        const goalie = player?.position === "G";
        const stateAtFrame = postStates.get(id);
        let { vx, vy } = stateAtFrame;
        const speed = Math.hypot(vx, vy);
        const decel = goalie ? 15 : id === scorer.id ? 8.5 : 10.5;
        const nextSpeed = Math.max(0, speed - decel * dt);
        if (speed > 0.001) {
          vx *= nextSpeed / speed;
          vy *= nextSpeed / speed;
        } else {
          vx = 0;
          vy = 0;
        }
        ({ vx, vy } = boardAwareTangent(stateAtFrame, { vx, vy }, goalie));
        const point = this.constrainPlayerPoint(stateAtFrame, {
          x: stateAtFrame.x + vx * dt,
          y: stateAtFrame.y + vy * dt
        }, player);
        proposals.set(id, { ...point, vx, vy });
      }

      for (let iteration = 0; iteration < 2; iteration += 1) {
        for (let aIndex = 0; aIndex < participants.length; aIndex += 1) {
          for (let bIndex = aIndex + 1; bIndex < participants.length; bIndex += 1) {
            const aMeta = participants[aIndex];
            const bMeta = participants[bIndex];
            const a = proposals.get(aMeta.id);
            const b = proposals.get(bMeta.id);
            const currentA = postStates.get(aMeta.id);
            const currentB = postStates.get(bMeta.id);
            const aPlayer = playerFor(aMeta.id);
            const bPlayer = playerFor(bMeta.id);
            if (!a || !b || !currentA || !currentB) continue;
            const sameTeam = aMeta.teamId === bMeta.teamId;
            const goalieContact = aPlayer?.position === "G" || bPlayer?.position === "G";
            const minimum = sameTeam ? (goalieContact ? 3.6 : 3.0) : (goalieContact ? 3.2 : 2.55);
            let currentDx = currentB.x - currentA.x;
            let currentDy = currentB.y - currentA.y;
            let currentDistance = Math.hypot(currentDx, currentDy);
            if (currentDistance < 0.001) {
              const angle = (AVHLGameSimulator.hashString(`${aMeta.id}:${bMeta.id}`) % 6283) / 1000;
              currentDx = Math.cos(angle);
              currentDy = Math.sin(angle);
              currentDistance = 1;
            }
            const proposedDx = b.x - a.x;
            const proposedDy = b.y - a.y;
            const proposedDistance = Math.hypot(proposedDx, proposedDy);
            const relativeStepX = proposedDx - currentDx;
            const relativeStepY = proposedDy - currentDy;
            const relativeStepSq = relativeStepX * relativeStepX + relativeStepY * relativeStepY;
            const sweptU = relativeStepSq > 1e-6
              ? this.clamp(-(currentDx * relativeStepX + currentDy * relativeStepY) / relativeStepSq, 0, 1)
              : 0;
            const sweptDistance = Math.hypot(
              currentDx + relativeStepX * sweptU,
              currentDy + relativeStepY * sweptU
            );
            const targetDistance = Math.min(minimum, currentDistance);
            if (proposedDistance >= targetDistance && sweptDistance >= targetDistance) continue;

            const ux = currentDx / currentDistance;
            const uy = currentDy / currentDistance;
            const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const nextA = this.constrainPlayerPoint(currentA, {
              x: midpoint.x - ux * targetDistance / 2,
              y: midpoint.y - uy * targetDistance / 2
            }, aPlayer);
            const nextB = this.constrainPlayerPoint(currentB, {
              x: midpoint.x + ux * targetDistance / 2,
              y: midpoint.y + uy * targetDistance / 2
            }, bPlayer);
            Object.assign(a, nextA);
            Object.assign(b, nextB);
          }
        }
      }

      for (const { id } of participants) {
        const player = playerFor(id);
        const goalie = player?.position === "G";
        const current = postStates.get(id);
        const proposal = proposals.get(id);
        const maxSpeed = goalie ? 13 : 27.5 + ((player?.speed ?? 82) - 82) * 0.08;
        let dx = proposal.x - current.x;
        let dy = proposal.y - current.y;
        const distance = Math.hypot(dx, dy);
        const maxDistance = maxSpeed * dt;
        if (distance > maxDistance && distance > 1e-6) {
          dx *= maxDistance / distance;
          dy *= maxDistance / distance;
        }
        const next = {
          x: current.x + dx,
          y: current.y + dy,
          vx: dx / dt,
          vy: dy / dt
        };
        postStates.set(id, next);
        const frame = denseTracks.get(id)[frameIndex];
        frame.x = next.x;
        frame.y = next.y;
      }
    }

    const puckSource = [];
    for (const snapshot of recentSnapshots) {
      if (snapshot.puck) puckSource.push({ t: snapshot.t, ...snapshot.puck, priority: 0 });
    }
    for (const event of recentEvents) {
      if (event.spatial?.puck) puckSource.push({ t: event.t, ...event.spatial.puck, priority: 1 });
    }
    puckSource.push({ t: releaseTime, ...shot.origin, priority: 5 });
    let puckAnchors = dedupePoints(puckSource);
    if (!puckAnchors.length) puckAnchors = [{ t: 0, ...shot.origin }, { t: releaseTime, ...shot.origin }];
    if (puckAnchors[0].t > 0.001) puckAnchors.unshift({ ...puckAnchors[0], t: 0 });

    const linearSourceAt = (points, t) => {
      if (!points?.length) return { x: 100, y: 42.5 };
      if (t <= points[0].t) return points[0];
      if (t >= points.at(-1).t) return points.at(-1);
      let index = 0;
      while (index < points.length - 2 && points[index + 1].t < t) index += 1;
      const a = points[index];
      const b = points[index + 1];
      const span = Math.max(0.001, b.t - a.t);
      const u = this.clamp((t - a.t) / span, 0, 1);
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    };

    const puck = [];
    for (let frame = 0; frame <= Math.round(releaseTime * framesPerSecond); frame += 1) {
      const t = frame * dt;
      const point = linearSourceAt(puckAnchors, t);
      puck.push({ t, x: point.x, y: point.y });
    }
    while (puck.length && puck.at(-1).t >= releaseTime - 0.0001) puck.pop();
    puck.push({ t: releaseTime, ...shot.origin });
    const shotFrames = Math.max(1, Math.round(shotFlightSeconds * framesPerSecond));
    const shotPathAnchors = isWraparound
      ? [
          { t: releaseTime, ...shot.origin },
          { t: releaseTime + shotFlightSeconds * 0.68, ...wrapPost },
          { t: goalTime, ...goalTarget }
        ]
      : [
          { t: releaseTime, ...shot.origin },
          { t: goalTime, ...goalTarget }
        ];
    for (let index = 1; index <= shotFrames; index += 1) {
      const u = index / shotFrames;
      const t = releaseTime + shotFlightSeconds * u;
      const point = linearSourceAt(shotPathAnchors, t);
      puck.push({
        t,
        x: point.x,
        y: point.y
      });
    }
    puck[puck.length - 1] = { t: goalTime, ...goalTarget };

    const angleFactor = Math.min(1, Math.abs(shot.origin.y - 42.5) / 30);
    const bounceProbability = this.clamp(
      0.16 + (shotPower - 80) * 0.009 + angleFactor * 0.16 + (shot.technique === "one-timer" ? 0.07 : 0),
      0.08,
      0.5
    );
    const bounceOut = deterministic(`${scorer.id}-${shot.technique}-net-bounce`) < bounceProbability;
    const backNet = {
      x: this.clamp(goalTarget.x + direction * 3.0, 1, 199),
      y: this.clamp(goalTarget.y + deterministic(`${scorer.id}-net-side`, -2.4, 2.4), 34.5, 50.5)
    };
    const postGoalPuckAnchors = bounceOut
      ? [
          { t: goalTime, ...goalTarget },
          { t: goalTime + 0.13, ...backNet },
          { t: goalTime + 0.42, x: goalLineX - direction * 2.3, y: this.clamp(backNet.y + deterministic(`${scorer.id}-bounce-y1`, -3.5, 3.5), 31, 54) },
          { t: goalTime + 1.05, x: goalLineX - direction * 7.2, y: this.clamp(backNet.y + deterministic(`${scorer.id}-bounce-y2`, -6, 6), 28, 57) },
          { t: durationSeconds, x: goalLineX - direction * 9.3, y: this.clamp(backNet.y + deterministic(`${scorer.id}-bounce-y3`, -7, 7), 27, 58) }
        ]
      : [
          { t: goalTime, ...goalTarget },
          { t: goalTime + 0.14, ...backNet },
          { t: goalTime + 0.55, x: backNet.x - direction * 0.7, y: backNet.y + deterministic(`${scorer.id}-settle-y1`, -1.2, 1.2) },
          { t: goalTime + 1.1, x: backNet.x - direction * 0.35, y: backNet.y + deterministic(`${scorer.id}-settle-y2`, -0.7, 0.7) },
          { t: durationSeconds, x: backNet.x - direction * 0.2, y: backNet.y }
        ];
    for (let frame = Math.round(goalTime * framesPerSecond) + 1; frame <= frameCount; frame += 1) {
      const t = frame * dt;
      const point = linearSourceAt(postGoalPuckAnchors, t);
      puck.push({ t, x: point.x, y: point.y });
    }

    const validation = {
      goalType,
      sourceHz: 10,
      renderedFps: framesPerSecond,
      activeSequenceStartsAt: this.clamp(activeStartAbsolute - cutoffAbsolute, 0, releaseTime),
      sourceContinuityWarnings: sourceWarnings.length,
      sourceWarningExamples: sourceWarnings.slice(0, 8),
      maxSpeed: 0,
      maxAcceleration: 0,
      maxTurnRate: 0,
      offsideFrames: 0,
      netOccupancySamples: 0,
      closeContactFrames: 0,
      severeOverlapFrames: 0,
      prematurePuckInNetFrames: 0,
      maxPlayersInSixFootCluster: 1,
      stationaryCrowdFrames: 0,
      shotReleaseError: 0,
      goalLineCrossingError: 0
    };

    for (const { id } of participants) {
      const frames = denseTracks.get(id) ?? [];
      let previousVelocity = null;
      for (let i = 1; i < frames.length; i += 1) {
        const vx = (frames[i].x - frames[i - 1].x) / dt;
        const vy = (frames[i].y - frames[i - 1].y) / dt;
        const speed = Math.hypot(vx, vy);
        validation.maxSpeed = Math.max(validation.maxSpeed, speed);
        if (previousVelocity) {
          const ax = (vx - previousVelocity.vx) / dt;
          const ay = (vy - previousVelocity.vy) / dt;
          validation.maxAcceleration = Math.max(validation.maxAcceleration, Math.hypot(ax, ay));
          const prevSpeed = Math.hypot(previousVelocity.vx, previousVelocity.vy);
          if (speed > 0.35 && prevSpeed > 0.35) {
            const a0 = Math.atan2(previousVelocity.vy, previousVelocity.vx);
            const a1 = Math.atan2(vy, vx);
            const turn = Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))) / dt;
            validation.maxTurnRate = Math.max(validation.maxTurnRate, turn);
          }
        }
        previousVelocity = { vx, vy };
      }
    }

    const releasePuck = puck.reduce((closest, frame) =>
      Math.abs(frame.t - releaseTime) < Math.abs(closest.t - releaseTime) ? frame : closest
    , puck[0]);
    validation.shotReleaseError = releasePuck
      ? Math.hypot(releasePuck.x - shot.origin.x, releasePuck.y - shot.origin.y)
      : Number.POSITIVE_INFINITY;
    const goalPuck = puck.reduce((closest, frame) =>
      Math.abs(frame.t - goalTime) < Math.abs(closest.t - goalTime) ? frame : closest
    , puck[0]);
    validation.goalLineCrossingError = goalPuck && (goalPuck.x - goalLineX) * direction >= 0.04
      ? 0
      : goalPuck
        ? Math.max(0, 0.04 - (goalPuck.x - goalLineX) * direction)
        : Number.POSITIVE_INFINITY;

    const physicalCages = this.goalCageRects(0);
    for (let frameIndex = 0; frameIndex <= frameCount; frameIndex += 1) {
      const framePlayers = participants.map(({ id }) => ({
        id,
        point: denseTracks.get(id)?.[frameIndex]
      })).filter((entry) => entry.point);
      let closeContact = false;
      let severeOverlap = false;
      let stationaryCrowd = false;
      for (let aIndex = 0; aIndex < framePlayers.length; aIndex += 1) {
        const a = framePlayers[aIndex];
        if (physicalCages.some((rect) => this.pointInsideRect(a.point, rect))) validation.netOccupancySamples += 1;
        let withinSixFeet = 1;
        let withinTwoFeet = 1;
        for (let bIndex = 0; bIndex < framePlayers.length; bIndex += 1) {
          if (aIndex === bIndex) continue;
          const b = framePlayers[bIndex];
          const distance = Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y);
          if (distance < 1.2) closeContact = true;
          if (distance < 2) withinTwoFeet += 1;
          if (distance <= 6) withinSixFeet += 1;
        }
        if (withinTwoFeet >= 3) severeOverlap = true;
        validation.maxPlayersInSixFootCluster = Math.max(validation.maxPlayersInSixFootCluster, withinSixFeet);
        if (frameIndex > 0 && frameIndex <= Math.round(goalTime * framesPerSecond) && withinSixFeet >= 5) {
          const previous = denseTracks.get(a.id)?.[frameIndex - 1];
          const speed = previous ? Math.hypot(a.point.x - previous.x, a.point.y - previous.y) / dt : 0;
          if (speed < 0.45) stationaryCrowd = true;
        }
      }
      if (closeContact) validation.closeContactFrames += 1;
      if (severeOverlap) validation.severeOverlapFrames += 1;
      if (stationaryCrowd) validation.stationaryCrowdFrames += 1;

      const puckFrame = puck[frameIndex];
      if (
        puckFrame &&
        puckFrame.t < goalTime - 0.02 &&
        physicalCages.some((rect) => this.pointInsideRect(puckFrame, rect))
      ) {
        validation.prematurePuckInNetFrames += 1;
      }
    }

    // Audit visible offside rather than moving players after the fact. If this
    // counter is nonzero, the underlying simulation/reconstruction needs work.
    const lineX = this.attackingBlueLine(scoringTeamId, state.period);
    const attackDirection = this.attackDirection(scoringTeamId, state.period);
    const preGoalPuck = puck.filter((frame) => frame.t <= goalTime + 1e-6);
    for (let frameIndex = 1; frameIndex < preGoalPuck.length; frameIndex += 1) {
      const previousPuck = preGoalPuck[frameIndex - 1];
      const puckFrame = preGoalPuck[frameIndex];
      const crossedIntoZone = this.isBeforeLine(previousPuck.x, lineX, attackDirection, -0.05) &&
        this.isBeyondLine(puckFrame.x, lineX, attackDirection, -0.05);
      if (!crossedIntoZone) continue;
      const t = previousPuck.t;
      for (const id of attackingSkaters) {
        if (id === scorer.id && Math.abs(t - releaseTime) < 0.02) continue;
        const frames = denseTracks.get(id);
        if (!frames?.length) continue;
        const index = Math.min(frames.length - 1, Math.round(t * framesPerSecond));
        const playerFrame = frames[index];
        if (playerFrame && this.isBeyondLine(playerFrame.x, lineX, attackDirection, 0.35)) {
          validation.offsideFrames += 1;
          break;
        }
      }
    }

    const tracks = participants.map(({ id, teamId }) => {
      const player = playerFor(id);
      return {
        playerId: id,
        teamId,
        number: player?.number ?? 0,
        name: player?.name ?? "Unknown",
        isGoalie: id === attackingGoalieId || id === defendingGoalieId,
        role: id === scorer.id ? "scorer" : assists.includes(id) ? "assist" : "other",
        keyframes: denseTracks.get(id)
      };
    });

    return {
      id: `goal-${this.eventId + 1}`,
      durationSeconds,
      buildupSeconds,
      framesPerSecond,
      scoringTeamId,
      scorerId: scorer.id,
      goalType,
      template: "factual-spatial-history",
      sequence,
      tracks,
      puck,
      shot: this.clone({ ...shot, flightSeconds: shotFlightSeconds, shotSpeedFps }),
      postGoalPuck: {
        outcome: bounceOut ? "bounces-out" : "settles-in-net",
        bounceProbability,
        shotPower
      },
      goalLight: {
        end: direction === 1 ? "high" : "low",
        activatesAt: goalTime,
        deactivatesAt: durationSeconds
      },
      validation
    };
  }
  simulateShot(state, teamId, options = {}) {
    const team = this.teams[teamId];
    const defendingTeamId = this.opponent(teamId);
    const defendingTeam = this.teams[defendingTeamId];
    const requestedContext = options.context ?? state.lastContext ?? "cycle";
    const shooter = options.shooter ?? team.playerById[state.puckCarrierId] ?? this.chooseOnIcePlayer(
      state,
      teamId,
      (player) =>
        player.offensiveAwareness * 0.7 +
        player.wristShotAccuracy * 0.55 +
        player.slapShotAccuracy * 0.35 +
        (5 - player.usageTier) * 6
    );
    if (!shooter) return { goal: false, stopped: false };

    const context = this.validateShotContext(state, teamId, shooter, requestedContext);
    const currentPosition = state.positions[shooter.id] ?? state.puck;
    const requestedOrigin = options.origin ? { ...options.origin } : {
      x: this.clamp(currentPosition.x, 2, 198),
      y: this.clamp(currentPosition.y, 2, 83)
    };
    const origin = this.constrainPlayerPoint(currentPosition, requestedOrigin, shooter);
    if (this.zoneForTeam(origin.x, teamId, state.period) !== "OZ") {
      // V5.1 refuses to manufacture an offensive shot from the neutral or
      // defensive zone. Keep possession live and let the team re-enter.
      this.setPossession(state, teamId, shooter.id, false);
      state.puck = { ...origin };
      state.lastContext = "regroup";
      this.addEvent(
        state,
        "possession",
        `${shooter.name} pulls up outside the offensive zone and keeps possession.`,
        { teamId, playerId: shooter.id, location: { ...origin }, details: { shotAbortedOutsideOZ: true } }
      );
      return { goal: false, stopped: false };
    }
    let region = this.regionFromCoordinate(teamId, state.period, origin);
    if (region === "outside") {
      const direction = this.attackDirection(teamId, state.period);
      const attackX = direction === 1 ? origin.x : 200 - origin.x;
      const attackY = direction === 1 ? origin.y : 85 - origin.y;
      if (attackX >= 145 && attackY >= 27 && attackY <= 58) region = "high slot";
      else if (attackX >= 145 && attackY < 42.5) region = "left circle";
      else if (attackX >= 145) region = "right circle";
      else region = shooter.position.includes("D") ? "point" : "high slot";
    }
    if (context === "breakaway" && region === "point") region = "high slot";
    this.placePlayersForShot(state, teamId, shooter, origin);
    const technique = this.chooseShotTechnique(shooter, region, context, state);
    const pressure = this.localPressure(state, shooter, defendingTeamId);
    const attackingGoalX = this.attackingGoalX(teamId, state.period);
    const screenCandidate = this.chooseOnIcePlayer(
      state,
      teamId,
      (player) => {
        const pos = state.positions[player.id];
        if (!pos || player.id === shooter.id) return 0.1;
        const netDistance = Math.hypot(pos.x - attackingGoalX, pos.y - 42.5);
        const heightBonus = Number.isFinite(player.heightIn) ? (player.heightIn - 72) * 0.7 : 0;
        return Math.max(0.1, player.strength * 0.34 + player.handEye * 0.24 + player.offensiveAwareness * 0.22 + player.balance * 0.12 + heightBonus - netDistance * 0.55);
      },
      (player) => player.id !== shooter.id
    );
    const screenSkill = screenCandidate
      ? screenCandidate.strength * 0.34 + screenCandidate.handEye * 0.24 + screenCandidate.offensiveAwareness * 0.24 + screenCandidate.balance * 0.18
      : 80;
    const screened = this.random.chance(
      this.clamp(
        0.15 + (region === "point" ? 0.23 : 0) + (region.includes("circle") ? 0.055 : 0) + (screenSkill - 80) * 0.003,
        0.06,
        0.5
      )
    );
    const goalie = defendingTeam.goalie;
    const goalPoint = { x: this.attackingGoalX(teamId, state.period), y: 42.5 };
    const blocker = this.chooseBlocker(state, defendingTeamId, origin, goalPoint);
    const shotPower = this.shotPowerRating(shooter, technique);
    const blockerSkill = blocker.shotBlocking * 0.48 + blocker.defensiveAwareness * 0.30 + blocker.balance * 0.12 + blocker.poise * 0.10;
    const releaseSkill = shooter.offensiveAwareness * 0.45 + shotPower * 0.35 + shooter.poise * 0.20;
    const blockProbability = this.clamp(
      0.20 +
      (blockerSkill - releaseSkill) * 0.0052 +
      pressure * 0.09 -
      (context === "breakaway" ? 0.2 : 0) -
      (technique.includes("jam") ? 0.12 : 0),
      0.02,
      0.40
    );

    shooter.stats.attempts += 1;
    state.attempts[teamId] += 1;

    if (this.random.chance(blockProbability)) {
      blocker.stats.blocksAgainst += 1;
      const blockLocation = {
        x: this.clamp((origin.x + goalPoint.x) / 2 + this.random.normal(0, 4), 2, 198),
        y: this.clamp((origin.y + goalPoint.y) / 2 + this.random.normal(0, 4), 2, 83)
      };
      state.puck = blockLocation;
      state.possessionTeam = null;
      state.puckCarrierId = null;
      this.addEvent(
        state,
        "shot-attempt",
        `${blocker.name} blocks ${shooter.name}'s ${technique} from the ${region}.`,
        {
          teamId,
          playerId: shooter.id,
          secondaryPlayerId: blocker.id,
          location: origin,
          mapType: "attempt",
          outcome: "blocked",
          details: { region, technique, context, blockLocation, shotPower }
        }
      );
      const blockImpact = this.clamp(
        0.72 + (shotPower - 80) * 0.022 - (blocker.shotBlocking - 80) * 0.006 + pressure * 0.18,
        0.45,
        1.75
      );
      this.maybeCauseInjury(state, blocker, {
        cause: "block",
        baseProbability: 0.0028,
        impact: blockImpact,
        location: blockLocation,
        extra: { shooterId: shooter.id, shotPower: Math.round(shotPower * 10) / 10 }
      });
      this.resolveLoosePuck(state, blockLocation, teamId, "blocked shot");
      return { goal: false, stopped: false };
    }

    const target = this.chooseIntendedAndActualTarget(state, shooter, goalie, origin, technique, pressure);
    const accuracy = this.shotAccuracyRating(shooter, technique);
    const onNetProbability = this.clamp(
      0.72 +
      (accuracy - 80) * 0.008 +
      (shooter.poise - 80) * 0.003 -
      pressure * 0.11 -
      shooter.fatigue * 0.06,
      0.52,
      0.88
    );
    const postProbability = this.clamp(0.026 + (accuracy - 80) * 0.0007, 0.018, 0.045);

    if (!this.random.chance(onNetProbability)) {
      const hitPost = this.random.chance(postProbability / Math.max(0.01, 1 - onNetProbability));
      const outcome = hitPost ? "post" : "missed";
      shooter.stats.misses += 1;
      const missSide = this.random.chance(0.5) ? "wide" : "high";
      const missLocation = {
        x: goalPoint.x,
        y: this.clamp(42.5 + this.random.normal(missSide === "wide" ? 0 : -2, hitPost ? 7 : 15), 3, 82)
      };
      state.puck = hitPost
        ? {
            x: this.clamp(goalPoint.x - this.attackDirection(teamId, state.period) * this.random.range(3, 10), 2, 198),
            y: this.clamp(missLocation.y + this.random.normal(0, 7), 3, 82)
          }
        : {
            x: this.clamp(goalPoint.x - this.attackDirection(teamId, state.period) * this.random.range(-2, 8), 2, 198),
            y: this.clamp(missLocation.y, 3, 82)
          };
      const looseLocation = { ...state.puck };
      state.possessionTeam = null;
      state.puckCarrierId = null;
      state.lastContext = hitPost ? "post-rebound" : "miss-recovery";
      this.addEvent(
        state,
        "shot-attempt",
        hitPost
          ? `${shooter.name}'s ${technique} from the ${region} rings off the post.`
          : `${shooter.name} sends a ${technique} ${missSide} from the ${region}.`,
        {
          teamId,
          playerId: shooter.id,
          location: origin,
          mapType: "attempt",
          outcome,
          details: {
            region,
            technique,
            context,
            intendedTarget: target.intended,
            missLocation
          }
        }
      );
      this.resolveLoosePuck(state, looseLocation, teamId, hitPost ? "post rebound" : "missed shot");
      return { goal: false, stopped: false };
    }

    shooter.stats.shots += 1;
    state.shots[teamId] += 1;
    goalie.stats.shotsAgainst += 1;

    const shot = {
      origin,
      region,
      technique,
      context,
      pressure,
      screened,
      intendedTarget: target.intended,
      actualTarget: target.actual,
      openness: target.openness,
      execution: target.execution
    };
    const goalProbability = this.calculateGoalProbability(state, shooter, goalie, shot);

    if (this.random.chance(goalProbability)) {
      const scoringSituation = this.teamSituation(state, teamId);
      const defendingTeamId = this.opponent(teamId);

      if (scoringSituation === "PP") {
        shooter.stats.powerPlayGoals += 1;
        state.powerPlayGoals[teamId] += 1;
      } else if (scoringSituation === "PK") {
        shooter.stats.shorthandedGoals += 1;
        state.shorthandedGoals[teamId] += 1;
      }

      // NHL +/- excludes power-play goals but includes even-strength, OT and
      // shorthanded goals. Goalies are not part of the skater on-ice arrays.
      if (scoringSituation !== "PP") {
        for (const id of state.onIce[teamId]) {
          const player = this.teams[teamId].playerById[id];
          if (player) player.stats.plusMinus += 1;
        }
        for (const id of state.onIce[defendingTeamId]) {
          const player = this.teams[defendingTeamId].playerById[id];
          if (player) player.stats.plusMinus -= 1;
        }
      }

      state.score[teamId] += 1;
      shooter.stats.goals += 1;
      shooter.stats.points += 1;
      goalie.stats.goalsAgainst += 1;
      const assistIds = state.assistQueue
        .filter((id) => id !== shooter.id)
        .filter((id, index, array) => array.indexOf(id) === index)
        .slice(-2)
        .reverse();
      assistIds.forEach((id) => {
        const player = team.playerById[id];
        if (player) {
          player.stats.assists += 1;
          player.stats.points += 1;
        }
      });
      const replay = this.createGoalReplay(state, teamId, shooter, assistIds, shot);
      const assistText = assistIds.length
        ? ` Assists: ${assistIds.map((id) => this.shortName(team.playerById[id])).join(", ")}.`
        : " Unassisted.";
      this.addEvent(
        state,
        "goal",
        `GOAL — ${shooter.name} scores on a ${this.shotDescription(shot)}.${assistText}`,
        {
          teamId,
          playerId: shooter.id,
          location: origin,
          mapType: "shot",
          outcome: "goal",
          details: {
            ...shot,
            goalProbability,
            goalieAttributeUsed: shot.actualTarget,
            screeningPlayerId: screened ? screenCandidate?.id ?? null : null,
            assists: assistIds
          },
          replay
        }
      );
      this.maybeGoalieCollisionInjury(state, goalie, shot);
      this.releaseMinorAfterPowerPlayGoal(state, teamId);
      state.assistQueue = [];
      state.possessionTeam = null;
      state.puckCarrierId = null;
      state.puck = { x: 100, y: 42.5 };
      state.nextFaceoff = { x: 100, y: 42.5, reason: "goal" };
      state.lastContext = "goal";
      return { goal: true, stopped: true };
    }

    goalie.stats.saves += 1;
    const save = this.resolveSaveOutcome(state, goalie, shot);
    const reboundLocation = save.outcome === "covered"
      ? null
      : this.calculateReboundLocation(state, shot, goalie, save.saveType, save.outcome);
    const saveText = save.outcome === "covered"
      ? `${goalie.name} tracks ${shooter.name}'s ${technique} from the ${region} and covers it.`
      : save.outcome === "controlled"
        ? `${goalie.name} steers ${shooter.name}'s ${technique} safely away from the slot.`
        : `${goalie.name} stops ${shooter.name}, but leaves a dangerous rebound.`;

    this.addEvent(
      state,
      "shot",
      saveText,
      {
        teamId,
        playerId: shooter.id,
        secondaryPlayerId: goalie.id,
        location: origin,
        mapType: "shot",
        outcome: "save",
        details: {
          ...shot,
          goalProbability,
          saveOutcome: save.outcome,
          saveType: save.saveType,
          goalieAttributeUsed: shot.actualTarget,
          screeningPlayerId: screened ? screenCandidate?.id ?? null : null,
          reboundLocation
        }
      }
    );

    const goalieInjury = this.maybeGoalieCollisionInjury(state, goalie, shot);

    if (save.outcome === "covered") {
      state.possessionTeam = null;
      state.puckCarrierId = null;
      state.assistQueue = [];
      state.puck = { x: this.ownGoalX(defendingTeamId, state.period), y: 42.5 };
      state.nextFaceoff = {
        ...this.faceoffLocationForStoppage(state, defendingTeamId, origin.y),
        reason: "covered save"
      };
      state.lastContext = "stoppage";
      return { goal: false, stopped: true };
    }

    if (save.outcome === "controlled" && !goalieInjury && this.tryGoaliePuckPlay(state, goalie, reboundLocation, teamId)) {
      return { goal: false, stopped: false };
    }

    state.puck = reboundLocation;
    state.possessionTeam = null;
    state.puckCarrierId = null;
    const winner = this.resolveLoosePuck(state, reboundLocation, teamId, "rebound");
    if (!winner) return { goal: false, stopped: false };
    state.lastContext = winner.teamId === teamId ? "rebound" : "rebound-recovery";

    if (
      save.outcome === "dangerous" &&
      winner.teamId === teamId &&
      (options.reboundDepth ?? 0) < 2 &&
      state.clock > 1
    ) {
      this.addAssistCandidate(state, shooter.id);
      this.advanceClock(state, this.random.range(0.7, 1.8), "shot");
      return this.simulateShot(state, teamId, {
        context: "rebound",
        shooter: winner.player,
        reboundDepth: (options.reboundDepth ?? 0) + 1
      });
    }

    return { goal: false, stopped: false };
  }

  penaltyCatalog() {
    return {
      "Tripping": { group: "stick", weight: 1.4 },
      "Slashing": { group: "stick", weight: 1.05 },
      "Elbowing": { group: "hit", weight: 0.35 },
      "High Sticking": { group: "stick", weight: 0.8 },
      "Cross Checking": { group: "hit", weight: 0.75 },
      "Boarding": { group: "hit", weight: 0.4 },
      "Charging": { group: "hit", weight: 0.35 },
      "Delay of Game": { group: "rule", weight: 0.45 },
      "Holding": { group: "stick", weight: 0.9 },
      "Hooking": { group: "stick", weight: 1.2 },
      "Interference": { group: "hit", weight: 0.95 },
      "Too Many Men": { group: "bench", weight: 0.32 },
      "Goaltender Interference": { group: "net", weight: 0.28 },
      "Roughing": { group: "scrum", weight: 0.48 },
      "Unsportsmanlike Conduct": { group: "scrum", weight: 0.14 }
    };
  }

  choosePenaltyType(context) {
    const catalog = this.penaltyCatalog();
    const entries = Object.entries(catalog);
    return this.random.weightedChoice(entries, ([, info]) => {
      let multiplier = 1;
      if (context === "stick" && info.group === "stick") multiplier = 3.2;
      if (context === "hit" && info.group === "hit") multiplier = 3.4;
      if (context === "line-change" && info.group === "bench") multiplier = 8;
      if (context === "net" && info.group === "net") multiplier = 8;
      if (context === "scrum" && info.group === "scrum") multiplier = 6;
      return info.weight * multiplier;
    })[0];
  }

  callPenalty(state, offenderTeamId, context = "random", location = state.puck) {
    const team = this.teams[offenderTeamId];
    const type = this.choosePenaltyType(context);
    let offender = null;
    if (type !== "Too Many Men") {
      offender = this.chooseOnIcePlayer(
        state,
        offenderTeamId,
        (player) =>
          (101 - player.discipline) * 0.8 +
          player.aggressiveness * (context === "hit" ? 0.35 : 0.12) +
          this.random.range(0, 10)
      );
    }

    let duration = 120;
    let severity = "minor";
    let releasableOnGoal = true;
    let affectsStrength = true;

    if (type === "High Sticking" && this.random.chance(0.055)) {
      duration = 240;
      severity = "double minor";
    }
    if (["Boarding", "Charging", "Cross Checking"].includes(type) && this.random.chance(0.018)) {
      duration = 300;
      severity = "major";
      releasableOnGoal = false;
    }

    const penalty = {
      id: `penalty-${this.eventId + 1}`,
      teamId: offenderTeamId,
      playerId: offender?.id ?? null,
      type,
      severity,
      originalDuration: duration,
      remaining: duration,
      releasableOnGoal,
      affectsStrength
    };
    state.activePenalties.push(penalty);
    if (affectsStrength) {
      const beneficiaryId = this.opponent(offenderTeamId);
      // A double minor represents two consecutive minor opportunities; other
      // strength-changing penalties count as one opportunity in this prototype.
      state.powerPlayOpportunities[beneficiaryId] += severity === "double minor" ? 2 : 1;
    }
    state.pim[offenderTeamId] += duration / 60;
    if (offender) offender.stats.penaltyMinutes += duration / 60;
    this.refreshUnits(state, false);
    const offenderText = offender ? offender.name : team.name;
    this.addEvent(
      state,
      "penalty",
      `${offenderText} is called for ${type.toLowerCase()} — ${severity === "minor" ? "2:00" : severity === "double minor" ? "4:00" : "5:00"}.`,
      {
        teamId: offenderTeamId,
        playerId: offender?.id ?? null,
        location: { ...location },
        mapType: "penalty",
        outcome: type,
        details: { severity, duration, context }
      }
    );
    state.assistQueue = [];
    state.possessionTeam = null;
    state.puckCarrierId = null;
    state.nextFaceoff = {
      ...this.faceoffLocationForStoppage(state, offenderTeamId, location.y),
      reason: "penalty"
    };
  }

  simulateHit(state, hitterTeamId) {
    const victimTeamId = this.opponent(hitterTeamId);
    const victim = this.teams[victimTeamId].playerById[state.puckCarrierId] ?? null;
    if (!victim || !state.positions[victim.id]) return;

    const victimPos = state.positions[victim.id];
    const hitterTeam = this.teams[hitterTeamId];
    const candidates = state.onIce[hitterTeamId]
      .map((id) => {
        const player = hitterTeam.playerById[id];
        const pos = state.positions[id];
        if (!player || !pos) return null;
        const distance = Math.hypot(pos.x - victimPos.x, pos.y - victimPos.y);
        if (distance > 22.0) return null;
        const score =
          player.bodyChecking * 0.36 + player.strength * 0.22 + player.aggressiveness * 0.16 +
          player.speed * 0.10 + player.acceleration * 0.08 + player.balance * 0.08 - distance * 1.8;
        return { player, distance, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    const candidate = candidates[0];
    if (!candidate) return;
    const hitter = candidate.player;

    const closeSpeed = Math.max(12, 17 + (hitter.speed - 80) * 0.12 + (hitter.acceleration - 80) * 0.08);
    const closeTime = this.clamp(candidate.distance / closeSpeed, 0.16, 1.05);
    this.setMovementOverride(state, hitter.id, victimPos, closeTime + 0.12);
    this.advanceClock(state, closeTime, "hit");
    const currentVictim = state.positions[victim.id] ?? victimPos;
    const currentHitter = state.positions[hitter.id] ?? currentVictim;
    const contactDistance = Math.hypot(currentHitter.x - currentVictim.x, currentHitter.y - currentVictim.y);
    if (contactDistance > 9.5) return;

    const location = { x: currentVictim.x, y: currentVictim.y };
    const legalScore =
      hitter.bodyChecking * 0.34 + hitter.discipline * 0.32 + hitter.balance * 0.12 + hitter.poise * 0.08 + hitter.strength * 0.14 +
      this.random.normal(0, 10);
    const dangerousScore =
      hitter.aggressiveness * 0.39 + (101 - hitter.discipline) * 0.31 + hitter.bodyChecking * 0.12 + hitter.strength * 0.08 +
      this.random.normal(0, 10);

    const weightDifference = (Number(hitter.weight) || 200) - (Number(victim.weight) || 200);
    const impact = this.clamp(
      0.78 +
      (hitter.bodyChecking - 80) * 0.018 +
      (hitter.strength - 80) * 0.012 +
      (hitter.speed - 80) * 0.008 +
      (hitter.aggressiveness - 80) * 0.006 +
      weightDifference * 0.004 -
      (victim.balance - 80) * 0.012 -
      (victim.strength - 80) * 0.006,
      0.42,
      2.25
    );

    if (dangerousScore > legalScore + 13 && this.random.chance(0.36)) {
      this.callPenalty(state, hitterTeamId, "hit", location);
      this.maybeCauseInjury(state, victim, {
        cause: "hit",
        baseProbability: 0.0052,
        impact: impact * 1.18,
        location,
        extra: { hitterId: hitter.id, penalizedHit: true }
      });
      return;
    }

    hitter.stats.hits += 1;
    state.hits[hitterTeamId] += 1;
    const hitterForce = hitter.bodyChecking * 0.46 + hitter.strength * 0.27 + hitter.balance * 0.08 + hitter.speed * 0.08 + hitter.aggressiveness * 0.11;
    const victimResistance = victim.balance * 0.40 + victim.puckControl * 0.31 + victim.strength * 0.17 + victim.agility * 0.12;
    const turnoverProbability = this.clamp(
      0.31 + (hitterForce - victimResistance) * 0.0105 + victim.fatigue * 0.055,
      0.14,
      0.66
    );
    const turnover = this.random.chance(turnoverProbability);
    this.addEvent(
      state,
      "hit",
      turnover
        ? `${hitter.name} separates ${victim.name} from the puck.`
        : `${hitter.name} finishes a hit on ${victim.name}.`,
      {
        teamId: hitterTeamId,
        playerId: hitter.id,
        secondaryPlayerId: victim.id,
        location,
        mapType: "hit",
        outcome: turnover ? "loose-puck" : "hit",
        details: { spatialHit: true, closingDistance: candidate.distance, contactDistance, impact, turnoverProbability }
      }
    );

    const injury = this.maybeCauseInjury(state, victim, {
      cause: "hit",
      baseProbability: 0.0040,
      impact,
      location,
      extra: { hitterId: hitter.id, turnover }
    });

    if (turnover || injury) {
      victim.stats.giveaways += turnover ? 1 : 0;
      const loose = {
        x: this.clamp(location.x + this.random.normal(0, 3.2), 2.5, 197.5),
        y: this.clamp(location.y + this.random.normal(0, 3.2), 2.5, 82.5)
      };
      state.puck = loose;
      state.possessionTeam = null;
      state.puckCarrierId = null;
      this.resolveLoosePuck(state, loose, victimTeamId, injury ? "puck left loose after injury" : "puck knocked loose by hit");
    }

    if (this.random.chance(0.0012)) {
      this.simulateFight(state, hitterTeamId, victimTeamId, location);
    }
  }

  simulateFight(state, teamAId, teamBId, location) {
    const fighterA = this.chooseOnIcePlayer(
      state,
      teamAId,
      (player) => player.fightingSkill * 0.42 + player.aggressiveness * 0.25 + player.strength * 0.23 + player.balance * 0.06 + player.poise * 0.04
    );
    const fighterB = this.chooseOnIcePlayer(
      state,
      teamBId,
      (player) => player.fightingSkill * 0.42 + player.aggressiveness * 0.25 + player.strength * 0.23 + player.balance * 0.06 + player.poise * 0.04
    );
    for (const fighter of [fighterA, fighterB]) {
      fighter.stats.penaltyMinutes += 5;
      state.pim[fighter.teamId] += 5;
      state.activePenalties.push({
        id: `fight-${fighter.id}-${this.eventId + 1}`,
        teamId: fighter.teamId,
        playerId: fighter.id,
        type: "Fighting",
        severity: "major",
        originalDuration: 300,
        remaining: 300,
        releasableOnGoal: false,
        affectsStrength: false
      });
    }
    this.addEvent(
      state,
      "fight",
      `${fighterA.name} and ${fighterB.name} drop the gloves. Both receive five-minute fighting majors.`,
      {
        teamId: teamAId,
        playerId: fighterA.id,
        secondaryPlayerId: fighterB.id,
        location: { ...location },
        details: { duration: 300 }
      }
    );
    for (const [fighter, opponent] of [[fighterA, fighterB], [fighterB, fighterA]]) {
      const fightImpact = this.clamp(
        0.75 + (opponent.fightingSkill - 80) * 0.015 + (opponent.strength - 80) * 0.01 - (fighter.balance - 80) * 0.006,
        0.5,
        1.65
      );
      this.maybeCauseInjury(state, fighter, {
        cause: "fight",
        baseProbability: 0.014,
        impact: fightImpact,
        location,
        extra: { opponentId: opponent.id }
      });
    }
    state.possessionTeam = null;
    state.puckCarrierId = null;
    state.assistQueue = [];
    state.nextFaceoff = { x: 100, y: 42.5, reason: "fight" };
  }

  simulateClear(state, teamId) {
    const team = this.teams[teamId];
    const previousPossessionTeam = state.possessionTeam;
    const clearer = team.playerById[state.puckCarrierId] ?? this.chooseOnIcePlayer(
      state,
      teamId,
      (player) => player.defensiveAwareness + player.strength + player.passing
    );
    this.setPossession(state, teamId, clearer.id, previousPossessionTeam !== teamId);

    const direction = this.attackDirection(teamId, state.period);
    const origin = { ...(state.positions[clearer.id] ?? state.puck) };
    const goalLineX = direction === 1 ? AVHL_RINK.goalLines.high : AVHL_RINK.goalLines.low;
    const fromOwnSideOfCenter = direction === 1 ? origin.x < 100 : origin.x > 100;
    const pressure = this.localPressure(state, clearer, this.opponent(teamId));
    const clearReleasePower = clearer.position.includes("D")
      ? clearer.slapShotPower * 0.65 + clearer.wristShotPower * 0.35
      : clearer.wristShotPower * 0.65 + clearer.slapShotPower * 0.35;
    const clearPower =
      124 +
      (clearer.strength - 80) * 0.46 +
      (clearer.passing - 80) * 0.30 +
      (clearReleasePower - 80) * 0.32 +
      (clearer.poise - 80) * 0.16 -
      clearer.fatigue * 12 -
      pressure * 10 +
      this.random.normal(0, 15);
    const travel = this.clamp(clearPower, 64, 176);
    const rawDestinationX = origin.x + direction * travel;
    const crossedGoalLine = direction === 1 ? rawDestinationX >= goalLineX : rawDestinationX <= goalLineX;
    const touchedProbability = this.clamp(0.18 + pressure * 0.24 + (clearer.passing - 80) * 0.002, 0.08, 0.46);
    const touched = this.random.chance(touchedProbability);
    const shorthanded = this.teamSituation(state, teamId) === "PK";
    const icing = fromOwnSideOfCenter && crossedGoalLine && !touched && !shorthanded;

    state.puck = {
      x: this.clamp(rawDestinationX, 1, 199),
      y: this.clamp(origin.y + this.random.normal(0, 7.5), 5, 80)
    };

    if (icing) {
      this.addEvent(
        state,
        "icing",
        `${clearer.name}'s clearing attempt crosses the far goal line untouched for icing.`,
        {
          teamId,
          playerId: clearer.id,
          location: { ...state.puck },
          details: { origin, destination: { ...state.puck }, crossedGoalLine: true, touched: false, spatialRule: true }
        }
      );
      state.possessionTeam = null;
      state.puckCarrierId = null;
      state.assistQueue = [];
      state.nextFaceoff = {
        ...this.faceoffLocationForStoppage(state, teamId, state.puck.y),
        reason: "icing"
      };
      state.lastContext = "icing";
      return;
    }

    if (touched) {
      const opponentId = this.opponent(teamId);
      const receiver = this.chooseOnIcePlayer(
        state,
        opponentId,
        (player) => player.defensiveAwareness + player.speed + player.puckControl
      );
      this.setPossession(state, opponentId, receiver.id, true);
      if (state.positions[receiver.id]) state.puck = { x: state.positions[receiver.id].x, y: state.positions[receiver.id].y };
      state.lastContext = "clear-retrieval";
      this.addEvent(
        state,
        "clear",
        `${clearer.name} sends it down ice and ${receiver.name} takes over.`,
        { teamId, playerId: clearer.id, secondaryPlayerId: receiver.id, location: { ...state.puck }, details: { origin, touched: true } }
      );
      return;
    }

    const resultingZone = this.zoneForTeam(state.puck.x, teamId, state.period);
    state.lastContext = resultingZone === "OZ" ? "dump-in" : "clear";
    state.puckCarrierId = null;
    state.possessionTeam = null;
    this.addEvent(
      state,
      "clear",
      `${clearer.name} clears the puck ${resultingZone === "OZ" ? "deep into the offensive zone" : "through the neutral zone"}.`,
      { teamId, playerId: clearer.id, location: { ...state.puck }, details: { origin, destination: { ...state.puck }, spatialRule: true } }
    );
    // Continue from a loose puck with an actual retrieval race.
    this.resolveLoosePuck(state, { ...state.puck }, teamId, resultingZone === "OZ" ? "dump-in" : "clear");
  }

  simulatePossessionStep(state) {
    if (state.nextFaceoff) {
      this.simulateFaceoff(state, state.nextFaceoff, state.nextFaceoff.reason);
      return;
    }

    if (!state.possessionTeam || !state.puckCarrierId) {
      // A live loose puck stays live. Faceoffs now require an actual stoppage.
      this.resolveLoosePuck(state, { ...state.puck }, null, "loose puck");
      return;
    }

    const teamId = state.possessionTeam;
    const opponentId = this.opponent(teamId);
    let zone = this.zoneForTeam(state.puck.x, teamId, state.period);
    state.zone = zone;
    const dt = zone === "OZ"
      ? this.random.range(4.0, 8.6)
      : zone === "NZ"
        ? this.random.range(6, 12.5)
        : this.random.range(5, 11.5);
    this.advanceClock(state, dt, "play");
    if (state.clock <= 0 || state.nextFaceoff) return;

    // A possession step can last several seconds. The puck may legitimately
    // change zones during that interval, so never execute an OZ/NZ/DZ decision
    // from a stale zone classification sampled before the clock advanced.
    zone = this.zoneForTeam(state.puck.x, teamId, state.period);
    state.zone = zone;
    this.maybeChangeLines(state, zone !== "OZ" && this.random.chance(0.35));
    const roll = this.random.next();

    if (zone === "OZ") {
      const penaltyCutoff = state.activePenalties.length < 3 ? 0.835 : 0.828;
      if (roll < 0.34) {
        const setupPass = this.random.chance(0.80);
        let oneTimerSetup = false;
        if (setupPass) {
          const twoPassSetup = this.random.chance(0.52);
          let completedSetupPass = this.simulatePass(state, teamId, "cycle") === true;
          if (state.possessionTeam !== teamId || state.nextFaceoff) return;
          if (completedSetupPass && twoPassSetup && state.clock > 1.2) {
            this.advanceClock(state, this.random.range(0.6, 1.2), "play");
            completedSetupPass = this.simulatePass(state, teamId, "cycle") === true;
            if (state.possessionTeam !== teamId || state.nextFaceoff) return;
          }
          oneTimerSetup = completedSetupPass && this.random.chance(0.34);
          if (oneTimerSetup && state.clock > 0.8) {
            this.advanceClock(state, this.random.range(0.4, 0.9), "shot");
          }
        }
        this.simulateShot(state, teamId, { context: oneTimerSetup ? "one-timer" : state.lastContext });
      } else if (roll < 0.54) {
        this.simulatePass(state, teamId, "cycle");
      } else if (roll < 0.75) {
        this.simulateHit(state, opponentId);
      } else if (roll < 0.84) {
        const carrier = this.teams[teamId].playerById[state.puckCarrierId];
        const takeaway = carrier ? this.chooseTakeawayPlayer(state, opponentId, carrier.id, 9.5) : null;
        if (takeaway) {
          const carrierPos = state.positions[carrier.id] ?? state.puck;
          const closeTime = this.clamp(takeaway.distance / 18, 0.18, 0.55);
          this.setMovementOverride(state, takeaway.player.id, carrierPos, closeTime + 0.12);
          this.advanceClock(state, closeTime, "takeaway");
          takeaway.player.stats.takeaways += 1;
          carrier.stats.giveaways += 1;
          const position = state.positions[takeaway.player.id] ?? carrierPos;
          state.puck = { x: position.x, y: position.y };
          this.setPossession(state, opponentId, takeaway.player.id, true);
          state.lastContext = "turnover";
          this.addEvent(
            state,
            "turnover",
            `${takeaway.player.name} closes on ${carrier.name} and strips the puck in the defensive zone.`,
            {
              teamId: opponentId,
              playerId: takeaway.player.id,
              secondaryPlayerId: carrier.id,
              location: { ...state.puck },
              details: { spatialTakeaway: true, closingDistance: takeaway.distance }
            }
          );
        } else {
          this.addEvent(state, "possession", `${carrier.name} keeps possession under pressure.`, { teamId, playerId: carrier.id, location: { ...state.puck } });
        }
      } else if (roll < Math.max(penaltyCutoff, 0.855)) {
        this.callPenalty(state, this.random.chance(0.72) ? opponentId : teamId, this.random.chance(0.65) ? "stick" : "net", state.puck);
      } else if (roll < 0.960) {
        const carrier = this.teams[teamId].playerById[state.puckCarrierId];
        const current = state.positions[carrier.id] ?? state.puck;
        const direction = this.attackDirection(teamId, state.period);
        let targetX = current.x + direction * this.random.range(-3, 5);
        if (carrier.position.includes("D")) {
          const goalLineX = direction === 1 ? AVHL_RINK.goalLines.high : AVHL_RINK.goalLines.low;
          const deepestDefenseX = goalLineX - direction * 18;
          targetX = direction === 1 ? Math.min(targetX, deepestDefenseX) : Math.max(targetX, deepestDefenseX);
        }
        const target = {
          x: this.clamp(targetX, 3, 197),
          y: this.clamp(current.y + this.random.normal(0, 10), 4, 81)
        };
        const carryTime = this.clamp(Math.hypot(target.x - current.x, target.y - current.y) / 13, 0.35, 1.15);
        this.setMovementOverride(state, carrier.id, target, carryTime + 0.12);
        this.advanceClock(state, carryTime, "cycle");
        const position = state.positions[carrier.id] ?? target;
        state.puck = { x: position.x, y: position.y };
        state.lastContext = "cycle";
        this.addEvent(
          state,
          "possession",
          `${carrier.name} protects the puck and continues the offensive-zone cycle.`,
          { teamId, playerId: carrier.id, location: { ...state.puck }, details: { carryTarget: target } }
        );
      } else {
        this.simulateClear(state, opponentId);
      }
      return;
    }

    if (zone === "NZ") {
      if (roll < 0.36) {
        this.simulateZoneEntry(state, teamId, false);
      } else if (roll < 0.515) {
        this.simulateZoneEntry(state, teamId, true);
      } else if (roll < 0.7) {
        this.simulatePass(state, teamId, "entry");
      } else if (roll < 0.82) {
        this.simulateHit(state, this.random.chance(0.62) ? opponentId : teamId);
      } else if (roll < 0.925) {
        const carrier = this.teams[teamId].playerById[state.puckCarrierId];
        const takeaway = carrier ? this.chooseTakeawayPlayer(state, opponentId, carrier.id, 11.5) : null;
        if (takeaway) {
          const carrierPos = state.positions[carrier.id] ?? state.puck;
          const closeTime = this.clamp(takeaway.distance / 20, 0.18, 0.58);
          this.setMovementOverride(state, takeaway.player.id, carrierPos, closeTime + 0.12);
          this.advanceClock(state, closeTime, "takeaway");
          takeaway.player.stats.takeaways += 1;
          carrier.stats.giveaways += 1;
          const position = state.positions[takeaway.player.id] ?? carrierPos;
          state.puck = { x: position.x, y: position.y };
          this.setPossession(state, opponentId, takeaway.player.id, true);
          state.lastContext = "turnover";
          this.addEvent(
            state,
            "turnover",
            `${takeaway.player.name} closes the gap and forces a neutral-zone turnover.`,
            {
              teamId: opponentId,
              playerId: takeaway.player.id,
              secondaryPlayerId: carrier.id,
              location: { ...state.puck },
              details: { spatialTakeaway: true, closingDistance: takeaway.distance }
            }
          );
        } else {
          this.addEvent(state, "possession", `${carrier.name} escapes the pressure and keeps the puck moving.`, { teamId, playerId: carrier.id, location: { ...state.puck } });
        }
      } else {
        const carrier = this.teams[teamId].playerById[state.puckCarrierId];
        const direction = this.attackDirection(teamId, state.period);
        const blueLine = this.attackingBlueLine(teamId, state.period);
        const targetX = blueLine - direction * this.random.range(5, 11);
        const current = state.positions[carrier.id] ?? state.puck;
        const target = {
          x: this.clamp(targetX, 78, 122),
          y: this.clamp(current.y + this.random.normal(0, 5), 10, 75)
        };
        const regroupTime = this.clamp(Math.hypot(target.x - current.x, target.y - current.y) / 15, 0.4, 1.25);
        this.setMovementOverride(state, carrier.id, target, regroupTime + 0.12);
        this.advanceClock(state, regroupTime, "regroup");
        const position = state.positions[carrier.id] ?? target;
        state.puck = { x: position.x, y: position.y };
        state.lastContext = "regroup";
        this.addEvent(
          state,
          "possession",
          `${carrier.name} regroups in the neutral zone while teammates tag up.`,
          { teamId, playerId: carrier.id, location: { ...state.puck }, details: { carryTarget: target } }
        );
      }
      return;
    }

    if (roll < 0.4) {
      this.simulateBreakout(state, teamId);
    } else if (roll < 0.6) {
      this.simulatePass(state, teamId, "breakout");
    } else if (roll < 0.78) {
      this.simulateClear(state, teamId);
    } else if (roll < 0.86) {
      this.simulateHit(state, opponentId);
    } else if (roll < 0.96) {
      const carrier = this.teams[teamId].playerById[state.puckCarrierId];
      const takeaway = carrier ? this.chooseTakeawayPlayer(state, opponentId, carrier.id, 10) : null;
      if (takeaway) {
        const carrierPos = state.positions[carrier.id] ?? state.puck;
        const closeTime = this.clamp(takeaway.distance / 18, 0.2, 0.62);
        this.setMovementOverride(state, takeaway.player.id, carrierPos, closeTime + 0.15);
        this.advanceClock(state, closeTime, "forecheck");
        takeaway.player.stats.takeaways += 1;
        carrier.stats.giveaways += 1;
        const position = state.positions[takeaway.player.id] ?? carrierPos;
        state.puck = { x: position.x, y: position.y };
        this.setPossession(state, opponentId, takeaway.player.id, true);
        state.lastContext = "forecheck-turnover";
        this.addEvent(
          state,
          "turnover",
          `${takeaway.player.name} closes from the forecheck and creates a dangerous turnover.`,
          {
            teamId: opponentId,
            playerId: takeaway.player.id,
            secondaryPlayerId: carrier.id,
            location: { ...state.puck },
            details: { spatialTakeaway: true, closingDistance: takeaway.distance }
          }
        );
      } else {
        this.addEvent(state, "possession", `${carrier.name} absorbs the forecheck and keeps possession.`, { teamId, playerId: carrier.id, location: { ...state.puck } });
      }
    } else if (roll < 0.975) {
      this.callPenalty(state, teamId, this.random.chance(0.72) ? "stick" : "random", state.puck);
    } else {
      const carrier = this.teams[teamId].playerById[state.puckCarrierId];
      this.addEvent(
        state,
        "possession",
        `${carrier.name} circles back and waits for support.`,
        { teamId, playerId: carrier.id, location: { ...state.puck } }
      );
    }
  }

  simulatePeriod(state, period, lengthSeconds, overtime = false) {
    state.period = period;
    state.periodLength = lengthSeconds;
    state.clock = lengthSeconds;
    state.nextFaceoff = null;
    state.possessionTeam = null;
    state.puckCarrierId = null;
    state.assistQueue = [];
    state.puck = { x: 100, y: 42.5 };
    state.lastContext = "faceoff";
    state.activePenalties = state.activePenalties.filter((penalty) => penalty.remaining > 0);
    this.refreshUnits(state, true);
    this.initializePeriodPositions(state);
    this.addEvent(
      state,
      "period-start",
      `${this.periodLabel(period)} period begins.`,
      { location: { x: 100, y: 42.5 } }
    );
    this.simulateFaceoff(state, { x: 100, y: 42.5 }, "period start");

    let safetyCounter = 0;
    while (state.clock > 0 && safetyCounter < 1200) {
      safetyCounter += 1;
      const scoreBefore = { ...state.score };
      this.simulatePossessionStep(state);
      if (overtime && (state.score[this.homeId] !== scoreBefore[this.homeId] || state.score[this.awayId] !== scoreBefore[this.awayId])) {
        state.clock = 0;
        return true;
      }
    }

    if (state.clock > 0) this.advanceClock(state, state.clock, "play");
    state.clock = 0;
    this.addEvent(state, "period-end", `${this.periodLabel(period)} period ends.`);
    return false;
  }

  simulateShootoutAttempt(state, teamId, shooter, attemptNumber) {
    const opponentId = this.opponent(teamId);
    const goalie = this.teams[opponentId].goalie;
    goalie.stats.shootoutShotsAgainst += 1;
    const shooterScore =
      shooter.deking * 0.28 +
      shooter.puckControl * 0.18 +
      shooter.poise * 0.24 +
      shooter.wristShotAccuracy * 0.2 +
      shooter.handEye * 0.1;
    const goalieScore =
      goalie.breakaway * 0.34 +
      goalie.angles * 0.18 +
      goalie.pokeCheck * 0.16 +
      goalie.poise * 0.18 +
      goalie.agility * 0.14;
    const goalProbability = this.clamp(0.31 + (shooterScore - goalieScore) * 0.006, 0.16, 0.48);
    const scored = this.random.chance(goalProbability);
    if (scored) goalie.stats.shootoutGoalsAgainst += 1;
    else goalie.stats.shootoutSaves += 1;
    state.shootout.attempts[teamId] += 1;
    if (scored) state.shootout.goals[teamId] += 1;

    const direction = this.attackDirection(teamId, 3);
    const location = {
      x: direction === 1 ? this.random.range(171, 184) : this.random.range(16, 29),
      y: this.random.range(31, 54)
    };
    this.addEvent(
      state,
      "shootout-attempt",
      scored
        ? `${shooter.name} scores in the shootout.`
        : `${shooter.name} is stopped by ${goalie.name} in the shootout.`,
      {
        teamId,
        playerId: shooter.id,
        secondaryPlayerId: goalie.id,
        location,
        mapType: "shot",
        outcome: scored ? "goal" : "save",
        details: { attemptNumber, goalProbability, shootout: true }
      }
    );
    return scored;
  }

  shootoutClinched(state, completedRegulationAttempts) {
    const homeGoals = state.shootout.goals[this.homeId];
    const awayGoals = state.shootout.goals[this.awayId];
    const homeRemaining = Math.max(0, 3 - state.shootout.attempts[this.homeId]);
    const awayRemaining = Math.max(0, 3 - state.shootout.attempts[this.awayId]);
    if (!completedRegulationAttempts) {
      if (homeGoals > awayGoals + awayRemaining) return this.homeId;
      if (awayGoals > homeGoals + homeRemaining) return this.awayId;
      return null;
    }
    return homeGoals === awayGoals ? null : homeGoals > awayGoals ? this.homeId : this.awayId;
  }

  simulateShootout(state) {
    state.period = "SO";
    state.clock = 0;
    state.shootout = {
      goals: { [this.homeId]: 0, [this.awayId]: 0 },
      attempts: { [this.homeId]: 0, [this.awayId]: 0 }
    };
    this.addEvent(state, "shootout-start", "The game moves to a three-round shootout.");
    const firstTeamId = this.random.chance(0.5) ? this.homeId : this.awayId;
    const secondTeamId = this.opponent(firstTeamId);

    for (let round = 0; round < 3; round += 1) {
      for (const teamId of [firstTeamId, secondTeamId]) {
        const team = this.teams[teamId];
        const shooterId = team.shootoutOrder[round % team.shootoutOrder.length];
        const shooter = team.playerById[shooterId];
        this.simulateShootoutAttempt(state, teamId, shooter, round + 1);
        const winner = this.shootoutClinched(state, false);
        if (winner) {
          state.score[winner] += 1;
          this.addEvent(state, "shootout", `${this.teams[winner].name} clinch the shootout early.`, { teamId: winner });
          return winner;
        }
      }
    }

    let winner = this.shootoutClinched(state, true);
    let suddenDeathRound = 4;
    let safety = 0;
    while (!winner && safety < 30) {
      safety += 1;
      for (const teamId of [firstTeamId, secondTeamId]) {
        const team = this.teams[teamId];
        const orderIndex = (suddenDeathRound - 1) % team.shootoutOrder.length;
        const shooter = team.playerById[team.shootoutOrder[orderIndex]];
        this.simulateShootoutAttempt(state, teamId, shooter, suddenDeathRound);
      }
      const homeGoals = state.shootout.goals[this.homeId];
      const awayGoals = state.shootout.goals[this.awayId];
      if (homeGoals !== awayGoals) winner = homeGoals > awayGoals ? this.homeId : this.awayId;
      suddenDeathRound += 1;
    }

    if (!winner) winner = this.random.chance(0.5) ? this.homeId : this.awayId;
    state.score[winner] += 1;
    this.addEvent(state, "shootout", `${this.teams[winner].name} win the shootout.`, { teamId: winner });
    return winner;
  }

  buildFinalSummary(state) {
    const skaters = Object.values(this.teams).flatMap((team) => team.players);
    const leaders = skaters
      .filter((player) => player.stats.points > 0)
      .sort((a, b) => b.stats.points - a.stats.points || b.stats.goals - a.stats.goals)
      .slice(0, 8)
      .map((player) => ({
        id: player.id,
        teamId: player.teamId,
        name: player.name,
        number: player.number,
        goals: player.stats.goals,
        assists: player.stats.assists,
        points: player.stats.points
      }));

    const skaterRows = {};
    const goalieRows = {};
    const teamStats = {};
    const injuryByPlayerId = Object.fromEntries((state.injuries ?? []).map((injury) => [injury.playerId, injury]));

    for (const teamId of [this.awayId, this.homeId]) {
      const team = this.teams[teamId];
      skaterRows[teamId] = team.players.map((player) => ({
        id: player.id,
        avhlId: player.avhlId ?? null,
        name: player.name,
        number: player.number,
        position: player.position,
        listedPosition: player.listedPosition ?? player.position,
        overall: player.overall,
        positionFamiliarity: player.positionFamiliarity,
        injury: injuryByPlayerId[player.id] ? this.clone(injuryByPlayerId[player.id]) : null,
        ...this.clone(player.stats)
      }));

      goalieRows[teamId] = team.goalies.map((goalie) => ({
        id: goalie.id,
        avhlId: goalie.avhlId ?? null,
        name: goalie.name,
        number: goalie.number,
        starter: goalie.id === team.starterId,
        activeAtEnd: goalie.id === team.goalie.id,
        overall: goalie.overall,
        injury: injuryByPlayerId[goalie.id] ? this.clone(injuryByPlayerId[goalie.id]) : null,
        ...this.clone(goalie.stats)
      }));

      const teamInjuries = (state.injuries ?? []).filter((injury) => injury.teamId === teamId);
      teamStats[teamId] = {
        score: state.score[teamId],
        shots: state.shots[teamId],
        attempts: state.attempts[teamId],
        hits: state.hits[teamId],
        timeOnAttack: state.timeOnAttack[teamId],
        passAttempts: state.passAttempts[teamId],
        passCompletions: state.passCompletions[teamId],
        faceoffsWon: state.faceoffs[teamId],
        penaltyMinutes: state.pim[teamId],
        powerPlayGoals: state.powerPlayGoals[teamId],
        powerPlayOpportunities: state.powerPlayOpportunities[teamId],
        powerPlayTime: state.powerPlayTime[teamId],
        shorthandedGoals: state.shorthandedGoals[teamId],
        injuries: teamInjuries.length,
        manGamesLostProjected: teamInjuries.reduce((sum, injury) => sum + (Number(injury.gamesMissed) || 0), 0)
      };
    }

    const aggregateGoalieStats = (teamId) => {
      const rows = goalieRows[teamId];
      return rows.reduce((total, row) => {
        for (const key of ["shotsAgainst", "saves", "goalsAgainst", "toi", "shootoutShotsAgainst", "shootoutSaves", "shootoutGoalsAgainst", "emptyNetGoals", "penaltyMinutes", "goals", "assists", "points"]) {
          total[key] = (total[key] || 0) + (Number(row[key]) || 0);
        }
        return total;
      }, {});
    };

    return {
      score: { ...state.score },
      shots: { ...state.shots },
      attempts: { ...state.attempts },
      hits: { ...state.hits },
      faceoffs: { ...state.faceoffs },
      pim: { ...state.pim },
      passAttempts: { ...state.passAttempts },
      passCompletions: { ...state.passCompletions },
      timeOnAttack: { ...state.timeOnAttack },
      powerPlayOpportunities: { ...state.powerPlayOpportunities },
      powerPlayGoals: { ...state.powerPlayGoals },
      powerPlayTime: { ...state.powerPlayTime },
      shorthandedGoals: { ...state.shorthandedGoals },
      injuries: this.clone(state.injuries ?? []),
      teamStats,
      skaters: skaterRows,
      goalieRows,
      leaders,
      goalies: {
        [this.homeId]: aggregateGoalieStats(this.homeId),
        [this.awayId]: aggregateGoalieStats(this.awayId)
      },
      ratingModel: {
        version: "V6.0",
        syntheticRatings: false,
        skaterRatingsUsed: 26,
        goalieRatingsUsed: 20,
        rosterSource: {
          [this.homeId]: this.teams[this.homeId].rosterSource ?? "bundled",
          [this.awayId]: this.teams[this.awayId].rosterSource ?? "bundled"
        },
        csvRatedPlayers: Object.values(this.teams).reduce(
          (sum, team) => sum + team.players.filter((player) => player.ratingSource === "avhl-csv").length + team.goalies.filter((goalie) => goalie.ratingSource === "avhl-csv").length,
          0
        )
      }
    };
  }

  simulateGame() {
    this.resetStats();
    this.events = [];
    this.eventId = 0;
    const state = this.createInitialState();

    this.simulatePeriod(state, 1, 1200, false);
    this.simulatePeriod(state, 2, 1200, false);
    this.simulatePeriod(state, 3, 1200, false);

    if (state.score[this.homeId] === state.score[this.awayId]) {
      this.simulatePeriod(state, 4, 300, true);
    }

    if (state.score[this.homeId] === state.score[this.awayId]) {
      this.simulateShootout(state);
    }

    state.gameOver = true;
    state.clock = 0;
    const finalSummary = this.buildFinalSummary(state);
    this.addEvent(
      state,
      "final",
      `Final: ${this.teams[this.homeId].name} ${state.score[this.homeId]}, ${this.teams[this.awayId].name} ${state.score[this.awayId]}.`,
      { details: finalSummary }
    );

    return {
      seed: this.seed,
      homeId: this.homeId,
      awayId: this.awayId,
      teams: this.teams,
      events: this.events,
      finalSummary
    };
  }
}

window.SeededRandom = SeededRandom;
window.AVHLGameSimulator = AVHLGameSimulator;
