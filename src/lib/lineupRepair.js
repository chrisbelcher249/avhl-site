import {
  isDefensePlayer,
  isForwardPlayer,
  isGoaliePlayer,
  isNaturalPosition,
  normalizeLineupRecord,
  validateLineupRecord,
} from "./lineupRecords.js";

const FORWARD_POSITIONS = ["LW", "C", "RW"];
const DEFENSE_POSITIONS = ["LD", "RD"];

function overall(player) {
  const value = Number(player?.overall);
  return Number.isFinite(value) ? value : 0;
}

function sorted(pool) {
  return [...pool].sort((a, b) => overall(b) - overall(a) || String(a.name || "").localeCompare(String(b.name || "")));
}

function bestUnused(pool, used, assignedPosition = null) {
  const candidates = sorted(pool.filter((player) => !used.has(String(player.id))));
  if (!candidates.length) return null;
  const natural = assignedPosition ? candidates.find((player) => isNaturalPosition(player, assignedPosition)) : null;
  return natural || candidates[0];
}

function fillEvenStrength(record, healthyRoster) {
  const byId = new Map(healthyRoster.map((player) => [String(player.id), player]));
  const forwardPool = healthyRoster.filter(isForwardPlayer);
  const defensePool = healthyRoster.filter((player) => isDefensePlayer(player) && !isGoaliePlayer(player));
  const goaliePool = healthyRoster.filter(isGoaliePlayer);

  // Reserve every still-valid owner assignment before filling any hole. Without
  // this two-pass approach, filling an early open slot could steal a player from
  // a later saved line and cascade into an unnecessary full-line reshuffle.
  const savedForwardBySlot = new Map(record.forwards.map((entry) => [`${entry.line}:${entry.position}`, entry]));
  const reservedForwards = new Set();
  const forwardSlots = [];
  for (let line = 1; line <= 4; line += 1) {
    for (const position of FORWARD_POSITIONS) {
      const saved = savedForwardBySlot.get(`${line}:${position}`);
      const player = saved ? byId.get(String(saved.playerId)) : null;
      const id = String(player?.id || "");
      const keep = Boolean(player && isForwardPlayer(player) && !reservedForwards.has(id));
      if (keep) reservedForwards.add(id);
      forwardSlots.push({ line, position, player: keep ? player : null });
    }
  }
  const usedForwards = new Set(reservedForwards);
  const forwards = forwardSlots.map(({ line, position, player }) => {
    const selected = player || bestUnused(forwardPool, usedForwards, position);
    if (selected) usedForwards.add(String(selected.id));
    return { playerId: selected ? String(selected.id) : "", position, line };
  });

  const savedDefenseBySlot = new Map(record.defense.map((entry) => [`${entry.pair}:${entry.position}`, entry]));
  const reservedDefense = new Set();
  const defenseSlots = [];
  for (let pair = 1; pair <= 3; pair += 1) {
    for (const position of DEFENSE_POSITIONS) {
      const saved = savedDefenseBySlot.get(`${pair}:${position}`);
      const player = saved ? byId.get(String(saved.playerId)) : null;
      const id = String(player?.id || "");
      const keep = Boolean(player && isDefensePlayer(player) && !isGoaliePlayer(player) && !reservedDefense.has(id));
      if (keep) reservedDefense.add(id);
      defenseSlots.push({ pair, position, player: keep ? player : null });
    }
  }
  const usedDefense = new Set(reservedDefense);
  const defense = defenseSlots.map(({ pair, position, player }) => {
    const selected = player || bestUnused(defensePool, usedDefense, position);
    if (selected) usedDefense.add(String(selected.id));
    return { playerId: selected ? String(selected.id) : "", position, pair };
  });

  const savedGoalies = record.goalies.slice().sort((a, b) => Number(b.starter) - Number(a.starter));
  const reservedGoalies = new Set();
  const goalieSlots = [0, 1].map((index) => {
    const saved = savedGoalies[index];
    const player = saved ? byId.get(String(saved.playerId)) : null;
    const id = String(player?.id || "");
    const keep = Boolean(player && isGoaliePlayer(player) && !reservedGoalies.has(id));
    if (keep) reservedGoalies.add(id);
    return keep ? player : null;
  });
  const usedGoalies = new Set(reservedGoalies);
  const goalies = goalieSlots.map((player, index) => {
    const selected = player || bestUnused(goaliePool, usedGoalies, "G");
    if (selected) usedGoalies.add(String(selected.id));
    return { playerId: selected ? String(selected.id) : "", starter: index === 0 };
  });

  return { forwards, defense, goalies };
}

function groupSets(record, rosterById) {
  const forwardIds = new Set(record.forwards.map((entry) => String(entry.playerId || "")).filter(Boolean));
  const defenseIds = new Set(record.defense.map((entry) => String(entry.playerId || "")).filter(Boolean));
  const dressedIds = new Set([...forwardIds, ...defenseIds]);
  const forwardPlayers = sorted([...forwardIds].map((id) => rosterById.get(id)).filter(Boolean));
  const defensePlayers = sorted([...defenseIds].map((id) => rosterById.get(id)).filter(Boolean));
  const dressedPlayers = sorted([...dressedIds].map((id) => rosterById.get(id)).filter(Boolean));
  return { forwardIds, defenseIds, dressedIds, forwardPlayers, defensePlayers, dressedPlayers };
}

function fillComposedUnit(originalIds, { forwardCount, defenseCount, sets }) {
  const total = forwardCount + defenseCount;
  const slots = [];
  const reserved = new Set();

  // Special-team/OT arrays use F slots first and D slots last. Reserve every
  // still-valid saved player in the exact slot before filling holes so one
  // missing player does not shift the rest of the owner's unit order.
  for (let index = 0; index < total; index += 1) {
    const wantsForward = index < forwardCount;
    const id = String(originalIds?.[index] || "");
    const eligible = id && !reserved.has(id) && (wantsForward ? sets.forwardIds.has(id) : sets.defenseIds.has(id));
    if (eligible) reserved.add(id);
    slots.push({ wantsForward, id: eligible ? id : "" });
  }

  const used = new Set(reserved);
  return slots.map(({ wantsForward, id }) => {
    if (id) return id;
    const pool = wantsForward ? sets.forwardPlayers : sets.defensePlayers;
    const replacement = pool.find((player) => !used.has(String(player.id)));
    const replacementId = String(replacement?.id || "");
    if (replacementId) used.add(replacementId);
    return replacementId;
  });
}

function originalDefenseCount(ids, fullRosterById) {
  return (ids || []).reduce((count, id) => {
    const player = fullRosterById.get(String(id || ""));
    return count + (player && isDefensePlayer(player) && !isGoaliePlayer(player) ? 1 : 0);
  }, 0);
}

function fillShootout(originalIds, sets) {
  const slots = [];
  const reserved = new Set();
  for (let index = 0; index < 5; index += 1) {
    const id = String(originalIds?.[index] || "");
    const keep = Boolean(id && sets.dressedIds.has(id) && !reserved.has(id));
    if (keep) reserved.add(id);
    slots.push(keep ? id : "");
  }

  const used = new Set(reserved);
  return slots.map((id) => {
    if (id) return id;
    const replacement = sets.dressedPlayers.find((player) => !used.has(String(player.id)));
    const replacementId = String(replacement?.id || "");
    if (replacementId) used.add(replacementId);
    return replacementId;
  });
}

export function repairLineupRecord(raw, healthyRoster, fullRoster, abbreviation) {
  const original = normalizeLineupRecord(raw, abbreviation);
  const fullRosterById = new Map((fullRoster || []).map((player) => [String(player.id), player]));
  const healthyById = new Map((healthyRoster || []).map((player) => [String(player.id), player]));
  const even = fillEvenStrength(original, healthyRoster || []);
  const base = { ...original, ...even };
  const sets = groupSets(base, healthyById);

  const ppUnit = (key) => {
    const defenseTarget = originalDefenseCount(original.specialTeams?.[key], fullRosterById) >= 2 ? 2 : 1;
    return fillComposedUnit(original.specialTeams?.[key] || [], {
      forwardCount: 5 - defenseTarget,
      defenseCount: defenseTarget,
      sets,
    });
  };

  const repaired = {
    ...base,
    specialTeams: {
      pp1: ppUnit("pp1"),
      pp2: ppUnit("pp2"),
      pk1: fillComposedUnit(original.specialTeams?.pk1 || [], { forwardCount: 2, defenseCount: 2, sets }),
      pk2: fillComposedUnit(original.specialTeams?.pk2 || [], { forwardCount: 2, defenseCount: 2, sets }),
    },
    overtimeUnits: [0, 1].map((index) => fillComposedUnit(original.overtimeUnits?.[index] || [], { forwardCount: 2, defenseCount: 1, sets })),
    shootoutOrder: fillShootout(original.shootoutOrder || [], sets),
  };

  const validation = validateLineupRecord(repaired, healthyRoster, abbreviation);
  return { record: validation.record, ok: validation.ok, errors: validation.errors };
}

function shapedUnit(ids, required, allowedIds) {
  const output = [];
  const used = new Set();
  for (let index = 0; index < required; index += 1) {
    const id = String(ids?.[index] || "");
    if (id && allowedIds.has(id) && !used.has(id)) {
      output.push(id);
      used.add(id);
    } else {
      output.push("");
    }
  }
  return output;
}

export function blankUnavailableLineupRecord(raw, eligibleRoster, abbreviation, playerReferencePool = eligibleRoster) {
  const original = normalizeLineupRecord(raw, abbreviation);
  const eligibleById = new Map((eligibleRoster || []).map((player) => [String(player.id), player]));
  const referenceById = new Map((playerReferencePool || []).map((player) => [String(player.id), player]));
  const used = new Set();

  const originalForwardBySlot = new Map(original.forwards.map((entry) => [`${entry.line}:${entry.position}`, entry]));
  const forwards = [];
  for (let line = 1; line <= 4; line += 1) {
    for (const position of FORWARD_POSITIONS) {
      const saved = originalForwardBySlot.get(`${line}:${position}`);
      const id = String(saved?.playerId || "");
      const player = eligibleById.get(id);
      const available = Boolean(player && isForwardPlayer(player) && !used.has(id));
      forwards.push({ playerId: available ? id : "", position, line });
      if (available) used.add(id);
    }
  }

  const originalDefenseBySlot = new Map(original.defense.map((entry) => [`${entry.pair}:${entry.position}`, entry]));
  const defense = [];
  for (let pair = 1; pair <= 3; pair += 1) {
    for (const position of DEFENSE_POSITIONS) {
      const saved = originalDefenseBySlot.get(`${pair}:${position}`);
      const id = String(saved?.playerId || "");
      const player = eligibleById.get(id);
      const available = Boolean(player && isDefensePlayer(player) && !isGoaliePlayer(player) && !used.has(id));
      defense.push({ playerId: available ? id : "", position, pair });
      if (available) used.add(id);
    }
  }

  const sortedGoalies = original.goalies.slice().sort((a, b) => Number(b.starter) - Number(a.starter));
  const goalieUsed = new Set();
  const goalies = [true, false].map((starter, index) => {
    const saved = sortedGoalies[index];
    const id = String(saved?.playerId || "");
    const player = eligibleById.get(id);
    const available = Boolean(player && isGoaliePlayer(player) && !goalieUsed.has(id));
    if (available) goalieUsed.add(id);
    return { playerId: available ? id : "", starter };
  });

  const dressedSkaterIds = new Set([
    ...forwards.map((entry) => entry.playerId),
    ...defense.map((entry) => entry.playerId),
  ].filter(Boolean));

  return {
    ...original,
    forwards,
    defense,
    goalies,
    specialTeams: {
      pp1: shapedUnit(original.specialTeams?.pp1, 5, dressedSkaterIds),
      pp2: shapedUnit(original.specialTeams?.pp2, 5, dressedSkaterIds),
      pk1: shapedUnit(original.specialTeams?.pk1, 4, dressedSkaterIds),
      pk2: shapedUnit(original.specialTeams?.pk2, 4, dressedSkaterIds),
    },
    overtimeUnits: [0, 1].map((index) => shapedUnit(original.overtimeUnits?.[index], 3, dressedSkaterIds)),
    shootoutOrder: shapedUnit(original.shootoutOrder, 5, dressedSkaterIds),
    // UI-only hint so a missing/traded defenseman does not make a saved 3F/2D
    // power play look like 4F/1D while the slot is open. Validation/storage
    // normalization intentionally ignores this transient field.
    displayPpFormations: {
      pp1: originalDefenseCount(original.specialTeams?.pp1, referenceById) >= 2 ? "3F2D" : "4F1D",
      pp2: originalDefenseCount(original.specialTeams?.pp2, referenceById) >= 2 ? "3F2D" : "4F1D",
    },
  };
}
