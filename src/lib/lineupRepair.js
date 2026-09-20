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
  const used = new Set();

  const savedForwardBySlot = new Map(record.forwards.map((entry) => [`${entry.line}:${entry.position}`, entry]));
  const forwards = [];
  for (let line = 1; line <= 4; line += 1) {
    for (const position of FORWARD_POSITIONS) {
      const saved = savedForwardBySlot.get(`${line}:${position}`);
      let player = saved ? byId.get(String(saved.playerId)) : null;
      if (!player || !isForwardPlayer(player) || used.has(String(player.id))) {
        player = bestUnused(forwardPool, used, position);
      }
      if (player) used.add(String(player.id));
      forwards.push({ playerId: player ? String(player.id) : "", position, line });
    }
  }

  const savedDefenseBySlot = new Map(record.defense.map((entry) => [`${entry.pair}:${entry.position}`, entry]));
  const defense = [];
  for (let pair = 1; pair <= 3; pair += 1) {
    for (const position of DEFENSE_POSITIONS) {
      const saved = savedDefenseBySlot.get(`${pair}:${position}`);
      let player = saved ? byId.get(String(saved.playerId)) : null;
      if (!player || !isDefensePlayer(player) || isGoaliePlayer(player) || used.has(String(player.id))) {
        player = bestUnused(defensePool, used, position);
      }
      if (player) used.add(String(player.id));
      defense.push({ playerId: player ? String(player.id) : "", position, pair });
    }
  }

  const savedGoalies = record.goalies.slice().sort((a, b) => Number(b.starter) - Number(a.starter));
  const goalieUsed = new Set();
  const goalies = [0, 1].map((index) => {
    const saved = savedGoalies[index];
    let player = saved ? byId.get(String(saved.playerId)) : null;
    if (!player || !isGoaliePlayer(player) || goalieUsed.has(String(player.id))) {
      player = bestUnused(goaliePool, goalieUsed, "G");
    }
    if (player) goalieUsed.add(String(player.id));
    return { playerId: player ? String(player.id) : "", starter: index === 0 };
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
  const kept = [];
  const used = new Set();
  let forwards = 0;
  let defense = 0;

  for (const rawId of originalIds || []) {
    const id = String(rawId || "");
    if (!id || used.has(id) || !sets.dressedIds.has(id)) continue;
    if (sets.forwardIds.has(id) && forwards < forwardCount) {
      kept.push(id); used.add(id); forwards += 1;
    } else if (sets.defenseIds.has(id) && defense < defenseCount) {
      kept.push(id); used.add(id); defense += 1;
    }
  }

  for (const player of sets.forwardPlayers) {
    if (forwards >= forwardCount) break;
    const id = String(player.id);
    if (used.has(id)) continue;
    kept.push(id); used.add(id); forwards += 1;
  }
  for (const player of sets.defensePlayers) {
    if (defense >= defenseCount) break;
    const id = String(player.id);
    if (used.has(id)) continue;
    kept.push(id); used.add(id); defense += 1;
  }
  return kept;
}

function originalDefenseCount(ids, fullRosterById) {
  return (ids || []).reduce((count, id) => {
    const player = fullRosterById.get(String(id || ""));
    return count + (player && isDefensePlayer(player) && !isGoaliePlayer(player) ? 1 : 0);
  }, 0);
}

function fillShootout(originalIds, sets) {
  const output = [];
  const used = new Set();
  for (const rawId of originalIds || []) {
    const id = String(rawId || "");
    if (!id || used.has(id) || !sets.dressedIds.has(id)) continue;
    output.push(id); used.add(id);
    if (output.length === 5) return output;
  }
  for (const player of sets.dressedPlayers) {
    const id = String(player.id);
    if (used.has(id)) continue;
    output.push(id); used.add(id);
    if (output.length === 5) break;
  }
  return output;
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
