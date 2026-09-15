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
  return positionTokens(player).some((value) => value === "D" || value === "LD" || value === "RD");
}

function rating(player, ...labels) {
  for (const label of labels) {
    const value = Number(player?.ratings?.[label]);
    if (Number.isFinite(value)) return value;
  }
  return overall(player) || 80;
}

function takeBest(pool, predicate = () => true) {
  const candidates = pool.filter(predicate).sort((a, b) => overall(b) - overall(a));
  const selected = candidates[0] || pool.slice().sort((a, b) => overall(b) - overall(a))[0];
  if (!selected) return null;
  const index = pool.indexOf(selected);
  if (index >= 0) pool.splice(index, 1);
  return selected;
}

function slot(player, assignedPosition) {
  return player ? { player, assignedPosition } : null;
}

function buildForwards(players) {
  const remaining = players
    .filter((player) => player.role === "Skater" && !isDefense(player))
    .slice();
  const centers = [];

  for (let line = 0; line < 4; line += 1) {
    centers.push(takeBest(remaining, (player) => hasPosition(player, "C")));
  }

  const lines = [];
  for (let line = 0; line < 4; line += 1) {
    lines.push([
      slot(takeBest(remaining, (player) => hasPosition(player, "LW")), "LW"),
      slot(centers[line], "C"),
      slot(takeBest(remaining, (player) => hasPosition(player, "RW")), "RW"),
    ]);
  }

  // Keep temporary live-roster oddities from leaving visible holes when a team
  // has 12 forwards but an unusual position mix.
  for (let line = 0; line < lines.length; line += 1) {
    for (let position = 0; position < 3; position += 1) {
      if (lines[line][position] || !remaining.length) continue;
      lines[line][position] = slot(takeBest(remaining), ["LW", "C", "RW"][position]);
    }
  }

  return { lines, remaining };
}

function buildDefense(players) {
  const remaining = players
    .filter((player) => player.role === "Skater" && isDefense(player))
    .slice();
  const pairs = [];

  for (let pair = 0; pair < 3; pair += 1) {
    pairs.push([
      slot(takeBest(remaining, (player) => hasPosition(player, "LD")), "LD"),
      slot(takeBest(remaining, (player) => hasPosition(player, "RD")), "RD"),
    ]);
  }

  for (let pair = 0; pair < pairs.length; pair += 1) {
    for (let position = 0; position < 2; position += 1) {
      if (pairs[pair][position] || !remaining.length) continue;
      pairs[pair][position] = slot(takeBest(remaining), position === 0 ? "LD" : "RD");
    }
  }

  return { pairs, remaining };
}

function powerPlayScore(item) {
  const player = item.player;
  return (
    rating(player, "Off. Awareness", "Offensive Awareness") * 1.25 +
    rating(player, "Passing") * 1.1 +
    rating(player, "Puck Control") +
    rating(player, "Wrist Shot Accuracy", "Wrist Shot Acc.") +
    rating(player, "Slap Shot Accuracy", "Slap Shot Acc.") * 0.8 +
    rating(player, "Hand Eye", "Hand-Eye") * 0.75 +
    rating(player, "Poise") * 0.65 +
    rating(player, "Speed") * 0.35
  );
}

function penaltyKillScore(item) {
  const player = item.player;
  return (
    rating(player, "Def. Awareness", "Defensive Awareness") * 1.25 +
    rating(player, "Stick Checking") * 1.1 +
    rating(player, "Shot Blocking") +
    rating(player, "Endurance") * 0.7 +
    rating(player, "Speed") * 0.55 +
    rating(player, "Discipline") * 0.55 +
    rating(player, "Faceoffs") * 0.45
  );
}

function overtimeScore(item) {
  const player = item.player;
  return (
    rating(player, "Speed") +
    rating(player, "Acceleration") +
    rating(player, "Puck Control") +
    rating(player, "Passing") * 0.75 +
    rating(player, "Off. Awareness", "Offensive Awareness") +
    rating(player, "Def. Awareness", "Defensive Awareness") * 0.55 +
    rating(player, "Poise") * 0.6
  );
}

function shootoutScore(item) {
  const player = item.player;
  return (
    rating(player, "Deking") * 1.2 +
    rating(player, "Puck Control") +
    rating(player, "Poise") +
    rating(player, "Wrist Shot Accuracy", "Wrist Shot Acc.") +
    rating(player, "Hand Eye", "Hand-Eye") * 0.5
  );
}

function makePowerPlayUnit(pool) {
  const forwards = pool.filter((item) => !item.assignedPosition.includes("D"));
  const defense = pool.filter((item) => item.assignedPosition.includes("D"));
  const unit = [...forwards.slice(0, 4), ...defense.slice(0, 1)];

  if (unit.length < 5) {
    const remaining = pool.filter((item) => !unit.includes(item));
    unit.push(...remaining.slice(0, 5 - unit.length));
  }
  return unit;
}

export function buildProjectedLineup(rosterPlayers) {
  const { lines: forwardLines, remaining: extraForwards } = buildForwards(rosterPlayers);
  const { pairs: defensePairs, remaining: extraDefense } = buildDefense(rosterPlayers);

  const goalies = rosterPlayers
    .filter((player) => player.role === "Goalie")
    .slice()
    .sort((a, b) => overall(b) - overall(a));
  const dressedGoalies = goalies.slice(0, 2).map((player, index) => ({
    player,
    assignedPosition: "G",
    role: index === 0 ? "Starter" : "Backup",
  }));

  const skaterSlots = [
    ...forwardLines.flat().filter(Boolean),
    ...defensePairs.flat().filter(Boolean),
  ];
  const forwardSlots = skaterSlots.filter((item) => !item.assignedPosition.includes("D"));
  const defenseSlots = skaterSlots.filter((item) => item.assignedPosition.includes("D"));

  const powerPlayPool = skaterSlots.slice().sort((a, b) => powerPlayScore(b) - powerPlayScore(a));
  const pp1 = makePowerPlayUnit(powerPlayPool.slice(0, 8));
  const pp2 = makePowerPlayUnit(powerPlayPool.filter((item) => !pp1.includes(item)));

  const pkForwards = forwardSlots.slice().sort((a, b) => penaltyKillScore(b) - penaltyKillScore(a));
  const pkDefense = defenseSlots.slice().sort((a, b) => penaltyKillScore(b) - penaltyKillScore(a));
  const pk1 = [...pkForwards.slice(0, 2), ...pkDefense.slice(0, 2)];
  const pk2 = [...pkForwards.slice(2, 4), ...pkDefense.slice(2, 4)];

  const overtimeForwards = forwardSlots.slice().sort((a, b) => overtimeScore(b) - overtimeScore(a));
  const overtimeDefense = defenseSlots.slice().sort((a, b) => overtimeScore(b) - overtimeScore(a));
  const overtimeUnits = [0, 1, 2].map((index) => [
    overtimeForwards[index * 2],
    overtimeForwards[index * 2 + 1],
    overtimeDefense[index],
  ].filter(Boolean));

  const shootoutOrder = forwardSlots
    .slice()
    .sort((a, b) => shootoutScore(b) - shootoutScore(a))
    .slice(0, 5);

  const dressedIds = new Set([
    ...skaterSlots.map((item) => item.player.id),
    ...dressedGoalies.map((item) => item.player.id),
  ]);
  const scratches = rosterPlayers
    .filter((player) => !dressedIds.has(player.id))
    .sort((a, b) => overall(b) - overall(a));

  return {
    forwardLines,
    defensePairs,
    goalies: dressedGoalies,
    specialTeams: { pp1, pp2, pk1, pk2 },
    overtimeUnits,
    shootoutOrder,
    scratches,
    dressedCount: dressedIds.size,
    rosterCount: rosterPlayers.length,
    extras: [...extraForwards, ...extraDefense],
  };
}
