const FORWARD_POSITIONS = ["LW", "C", "RW"];
const DEFENSE_POSITIONS = ["LD", "RD"];

function tokens(player) {
  return String(player?.position || "")
    .toUpperCase()
    .split(/[\\/,\s-]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isDefensePlayer(player) {
  return tokens(player).some((value) => value === "D" || value === "LD" || value === "RD");
}

export function isForwardPlayer(player) {
  return player?.role === "Skater" && !isDefensePlayer(player);
}

export function isGoaliePlayer(player) {
  return player?.role === "Goalie" || String(player?.position || "").toUpperCase() === "G";
}

export function isNaturalPosition(player, assignedPosition) {
  const listed = tokens(player);
  const assigned = String(assignedPosition || "").toUpperCase();
  if (!assigned || !listed.length) return true;
  // Broad F/D labels are used only for special-team editor slots. They do not
  // represent an off-position assignment and therefore should never display
  // the 3% even-strength familiarity warning.
  if (assigned === "F") return isForwardPlayer(player);
  if (assigned === "D") return isDefensePlayer(player) && !isGoaliePlayer(player);
  if (listed.includes(assigned)) return true;
  if (["LD", "RD"].includes(assigned) && listed.includes("D")) return true;
  return false;
}

function itemId(item) {
  return item?.player?.id ? String(item.player.id) : "";
}

export function recordFromProjected(abbreviation, projected) {
  return {
    schema: "avhl-lineup-v1",
    abbreviation: String(abbreviation || "").toUpperCase(),
    forwards: projected.forwardLines.flatMap((line, lineIndex) =>
      line.map((item, positionIndex) => ({
        playerId: itemId(item),
        position: FORWARD_POSITIONS[positionIndex],
        line: lineIndex + 1,
      })),
    ),
    defense: projected.defensePairs.flatMap((pair, pairIndex) =>
      pair.map((item, positionIndex) => ({
        playerId: itemId(item),
        position: DEFENSE_POSITIONS[positionIndex],
        pair: pairIndex + 1,
      })),
    ),
    goalies: projected.goalies.slice(0, 2).map((item, index) => ({
      playerId: itemId(item),
      starter: index === 0,
    })),
    specialTeams: {
      pp1: projected.specialTeams.pp1.map(itemId),
      pp2: projected.specialTeams.pp2.map(itemId),
      pk1: projected.specialTeams.pk1.map(itemId),
      pk2: projected.specialTeams.pk2.map(itemId),
    },
    overtimeUnits: projected.overtimeUnits.slice(0, 2).map((unit) => unit.map(itemId)),
    shootoutOrder: projected.shootoutOrder.map(itemId).slice(0, 5),
  };
}

function cleanIds(value) {
  return Array.isArray(value) ? value.map((id) => String(id || "").trim()).filter(Boolean) : [];
}

export function normalizeLineupRecord(raw, abbreviation) {
  const record = raw && typeof raw === "object" ? raw : {};
  return {
    schema: "avhl-lineup-v1",
    abbreviation: String(abbreviation || record.abbreviation || "").toUpperCase(),
    forwards: Array.isArray(record.forwards) ? record.forwards.map((entry) => ({
      playerId: String(entry?.playerId || "").trim(),
      position: String(entry?.position || "").toUpperCase(),
      line: Number(entry?.line),
    })) : [],
    defense: Array.isArray(record.defense) ? record.defense.map((entry) => ({
      playerId: String(entry?.playerId || "").trim(),
      position: String(entry?.position || "").toUpperCase(),
      pair: Number(entry?.pair),
    })) : [],
    goalies: Array.isArray(record.goalies) ? record.goalies.map((entry) => ({
      playerId: String(entry?.playerId || "").trim(),
      starter: Boolean(entry?.starter),
    })).sort((a, b) => Number(b.starter) - Number(a.starter)) : [],
    specialTeams: {
      pp1: cleanIds(record.specialTeams?.pp1),
      pp2: cleanIds(record.specialTeams?.pp2),
      pk1: cleanIds(record.specialTeams?.pk1),
      pk2: cleanIds(record.specialTeams?.pk2),
    },
    overtimeUnits: Array.isArray(record.overtimeUnits)
      ? record.overtimeUnits.slice(0, 2).map(cleanIds)
      : [],
    shootoutOrder: cleanIds(record.shootoutOrder).slice(0, 5),
    revision: Number.isFinite(Number(record.revision)) ? Number(record.revision) : 0,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  };
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateUnit({ ids, label, required, forwardIds, defenseIds, dressedSkaterIds, composition = null, errors }) {
  if (ids.length !== required) errors.push(`${label} must contain exactly ${required} players.`);
  const duplicates = duplicateValues(ids);
  if (duplicates.length) errors.push(`${label} cannot contain the same player more than once.`);
  for (const id of ids) {
    if (!dressedSkaterIds.has(id)) errors.push(`${label} can only use dressed skaters.`);
  }
  if (composition && ids.length === required) {
    const forwards = ids.filter((id) => forwardIds.has(id)).length;
    const defense = ids.filter((id) => defenseIds.has(id)).length;
    if (!composition.some(([f, d]) => forwards === f && defense === d)) {
      errors.push(`${label} must use ${composition.map(([f, d]) => `${f}F/${d}D`).join(" or ")}.`);
    }
  }
}

export function validateLineupRecord(raw, rosterPlayers, abbreviation) {
  const record = normalizeLineupRecord(raw, abbreviation);
  const errors = [];
  const rosterById = new Map((rosterPlayers || []).map((player) => [String(player.id), player]));

  if (!record.abbreviation || record.abbreviation !== String(abbreviation || "").toUpperCase()) {
    errors.push("Lineup team does not match this team.");
  }

  const forwardSlots = new Set();
  for (const entry of record.forwards) {
    const key = `${entry.line}:${entry.position}`;
    if (!Number.isInteger(entry.line) || entry.line < 1 || entry.line > 4 || !FORWARD_POSITIONS.includes(entry.position)) {
      errors.push("Forward lineup contains an invalid line or position slot.");
      continue;
    }
    if (forwardSlots.has(key)) errors.push(`Forward slot ${key} appears more than once.`);
    forwardSlots.add(key);
    const player = rosterById.get(entry.playerId);
    if (!player) errors.push("Every dressed forward must still be on the current roster.");
    else if (!isForwardPlayer(player)) errors.push(`${player.name} cannot be assigned to a forward slot.`);
  }
  for (let line = 1; line <= 4; line += 1) {
    for (const position of FORWARD_POSITIONS) {
      if (!forwardSlots.has(`${line}:${position}`)) errors.push(`Line ${line} is missing its ${position}.`);
    }
  }
  if (record.forwards.length !== 12) errors.push("The dressed lineup must contain exactly 12 forwards.");

  const defenseSlots = new Set();
  for (const entry of record.defense) {
    const key = `${entry.pair}:${entry.position}`;
    if (!Number.isInteger(entry.pair) || entry.pair < 1 || entry.pair > 3 || !DEFENSE_POSITIONS.includes(entry.position)) {
      errors.push("Defense lineup contains an invalid pair or position slot.");
      continue;
    }
    if (defenseSlots.has(key)) errors.push(`Defense slot ${key} appears more than once.`);
    defenseSlots.add(key);
    const player = rosterById.get(entry.playerId);
    if (!player) errors.push("Every dressed defenseman must still be on the current roster.");
    else if (!isDefensePlayer(player) || isGoaliePlayer(player)) errors.push(`${player.name} cannot be assigned to a defense slot.`);
  }
  for (let pair = 1; pair <= 3; pair += 1) {
    for (const position of DEFENSE_POSITIONS) {
      if (!defenseSlots.has(`${pair}:${position}`)) errors.push(`Pair ${pair} is missing its ${position}.`);
    }
  }
  if (record.defense.length !== 6) errors.push("The dressed lineup must contain exactly 6 defensemen.");

  if (record.goalies.length !== 2) errors.push("The dressed lineup must contain exactly 2 goalies.");
  if (record.goalies.filter((goalie) => goalie.starter).length !== 1) errors.push("Exactly one dressed goalie must be the starter.");
  for (const entry of record.goalies) {
    const player = rosterById.get(entry.playerId);
    if (!player) errors.push("Every dressed goalie must still be on the current roster.");
    else if (!isGoaliePlayer(player)) errors.push(`${player.name} cannot be assigned to goalie.`);
  }

  const forwardIds = new Set(record.forwards.map((entry) => entry.playerId));
  const defenseIds = new Set(record.defense.map((entry) => entry.playerId));
  const goalieIds = new Set(record.goalies.map((entry) => entry.playerId));
  if (forwardIds.size !== 12) errors.push("A forward cannot occupy more than one even-strength slot.");
  if (defenseIds.size !== 6) errors.push("A defenseman cannot occupy more than one even-strength slot.");
  if (goalieIds.size !== 2) errors.push("The same goalie cannot be both starter and backup.");

  const allDressed = [...forwardIds, ...defenseIds, ...goalieIds];
  if (new Set(allDressed).size !== 20) errors.push("The dressed lineup must contain 20 unique players.");

  const dressedSkaterIds = new Set([...forwardIds, ...defenseIds]);
  validateUnit({ ids: record.specialTeams.pp1, label: "PP1", required: 5, forwardIds, defenseIds, dressedSkaterIds, composition: [[4, 1], [3, 2]], errors });
  validateUnit({ ids: record.specialTeams.pp2, label: "PP2", required: 5, forwardIds, defenseIds, dressedSkaterIds, composition: [[4, 1], [3, 2]], errors });
  validateUnit({ ids: record.specialTeams.pk1, label: "PK1", required: 4, forwardIds, defenseIds, dressedSkaterIds, composition: [[2, 2]], errors });
  validateUnit({ ids: record.specialTeams.pk2, label: "PK2", required: 4, forwardIds, defenseIds, dressedSkaterIds, composition: [[2, 2]], errors });

  if (record.overtimeUnits.length !== 2) errors.push("Exactly two 3-on-3 overtime groups are required.");
  record.overtimeUnits.forEach((ids, index) => {
    validateUnit({ ids, label: `OT group ${index + 1}`, required: 3, forwardIds, defenseIds, dressedSkaterIds, composition: [[2, 1]], errors });
  });

  validateUnit({ ids: record.shootoutOrder, label: "Shootout order", required: 5, forwardIds, defenseIds, dressedSkaterIds, errors });

  return { ok: errors.length === 0, errors: [...new Set(errors)], record };
}

export function hydrateLineupRecord(raw, rosterPlayers, abbreviation) {
  const record = normalizeLineupRecord(raw, abbreviation);
  const playerById = new Map((rosterPlayers || []).map((player) => [String(player.id), player]));
  const forwardEntry = new Map(record.forwards.map((entry) => [`${entry.line}:${entry.position}`, entry]));
  const defenseEntry = new Map(record.defense.map((entry) => [`${entry.pair}:${entry.position}`, entry]));

  const makeItem = (playerId, assignedPosition = null) => {
    const player = playerById.get(String(playerId));
    return player ? { player, assignedPosition } : null;
  };

  const assignmentById = new Map();
  for (const entry of record.forwards) assignmentById.set(entry.playerId, entry.position);
  for (const entry of record.defense) assignmentById.set(entry.playerId, entry.position);
  const itemForSpecial = (id) => makeItem(id, assignmentById.get(String(id)) || null);

  const forwardLines = [1, 2, 3, 4].map((line) =>
    FORWARD_POSITIONS.map((position) => {
      const entry = forwardEntry.get(`${line}:${position}`);
      return entry ? makeItem(entry.playerId, position) : null;
    }),
  );
  const defensePairs = [1, 2, 3].map((pair) =>
    DEFENSE_POSITIONS.map((position) => {
      const entry = defenseEntry.get(`${pair}:${position}`);
      return entry ? makeItem(entry.playerId, position) : null;
    }),
  );
  const goalies = record.goalies
    .slice()
    .sort((a, b) => Number(b.starter) - Number(a.starter))
    .map((entry) => {
      const item = makeItem(entry.playerId, "G");
      return item ? { ...item, role: entry.starter ? "Starter" : "Backup" } : null;
    })
    .filter(Boolean);

  const dressedIds = new Set([
    ...record.forwards.map((entry) => entry.playerId),
    ...record.defense.map((entry) => entry.playerId),
    ...record.goalies.map((entry) => entry.playerId),
  ]);

  return {
    forwardLines,
    defensePairs,
    goalies,
    specialTeams: {
      pp1: record.specialTeams.pp1.map(itemForSpecial).filter(Boolean),
      pp2: record.specialTeams.pp2.map(itemForSpecial).filter(Boolean),
      pk1: record.specialTeams.pk1.map(itemForSpecial).filter(Boolean),
      pk2: record.specialTeams.pk2.map(itemForSpecial).filter(Boolean),
    },
    overtimeUnits: record.overtimeUnits.map((unit) => unit.map(itemForSpecial).filter(Boolean)),
    shootoutOrder: record.shootoutOrder.map(itemForSpecial).filter(Boolean),
    scratches: (rosterPlayers || []).filter((player) => !dressedIds.has(String(player.id))),
    dressedCount: dressedIds.size,
    rosterCount: (rosterPlayers || []).length,
    record,
  };
}
