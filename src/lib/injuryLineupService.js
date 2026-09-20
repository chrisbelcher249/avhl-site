import { getPlayers } from "@/lib/players";
import { getCurrentInjuryState, healthyRosterForTeam } from "@/lib/injuries";
import { fallbackTeamByAbbreviation, rosterForTeam } from "@/lib/lineupService";
import { getSavedLineup, saveLineupIfRevision } from "@/lib/lineupStorage";
import { repairLineupRecord } from "@/lib/lineupRepair";
import { buildProjectedLineup } from "@/lib/lineups";
import { recordFromProjected, validateLineupRecord } from "@/lib/lineupRecords";

function recordReferencesAny(record, ids) {
  if (!record || !ids?.size) return false;
  const values = [
    ...(record.forwards || []).map((entry) => entry?.playerId),
    ...(record.defense || []).map((entry) => entry?.playerId),
    ...(record.goalies || []).map((entry) => entry?.playerId),
    ...(record.specialTeams?.pp1 || []),
    ...(record.specialTeams?.pp2 || []),
    ...(record.specialTeams?.pk1 || []),
    ...(record.specialTeams?.pk2 || []),
    ...((record.overtimeUnits || []).flat()),
    ...(record.shootoutOrder || []),
  ].map((value) => String(value || ""));
  return values.some((value) => ids.has(value));
}

export async function repairSavedLineupForTeam(abbreviation) {
  const code = String(abbreviation || "").toUpperCase();
  const team = fallbackTeamByAbbreviation(code);
  if (!team) return { ok: false, error: "Unknown team." };

  const [{ players, source }, saved] = await Promise.all([getPlayers(), getSavedLineup(code)]);
  if (source !== "live") return { ok: false, error: "Live roster unavailable; lineup repair was deferred." };

  const injuryState = await getCurrentInjuryState(players);
  const teamInjuries = injuryState.byTeam?.[code] || [];
  const readiness = injuryState.readiness?.[code] || null;
  const rosterPlayers = rosterForTeam(players, code);
  const healthyRoster = healthyRosterForTeam(rosterPlayers, teamInjuries);

  if (!saved) {
    if (!teamInjuries.length) return { ok: true, changed: false, reason: "no-active-injury", readiness };
    if (readiness && !readiness.canPlay) return { ok: true, changed: false, cannotPlay: true, readiness };
    const projected = recordFromProjected(code, buildProjectedLineup(healthyRoster));
    const validation = validateLineupRecord(projected, healthyRoster, code);
    if (!validation.ok) return { ok: true, changed: false, cannotPlay: true, errors: validation.errors, readiness };
    const replacement = {
      ...validation.record,
      schema: "avhl-lineup-v1",
      abbreviation: code,
      revision: 1,
      updatedAt: new Date().toISOString(),
      autoAdjustedForInjury: true,
    };
    const result = await saveLineupIfRevision(code, replacement, 0);
    if (!result.saved) return { ok: true, changed: false, conflict: true, currentRevision: result.currentRevision, readiness };
    return { ok: true, changed: true, createdFromProjection: true, saved: replacement, readiness };
  }

  const injuredIds = new Set(teamInjuries.map((injury) => String(injury.playerId || "")));
  if (!recordReferencesAny(saved, injuredIds)) {
    return { ok: true, changed: false, reason: "saved-lineup-unaffected", readiness };
  }

  const repaired = repairLineupRecord(saved, healthyRoster, rosterPlayers, code);
  if (!repaired.ok) {
    return {
      ok: true,
      changed: false,
      cannotPlay: true,
      errors: repaired.errors,
      readiness,
    };
  }

  const expectedRevision = Math.max(0, Number(saved.revision) || 0);
  const replacement = {
    ...repaired.record,
    schema: "avhl-lineup-v1",
    abbreviation: code,
    revision: expectedRevision + 1,
    updatedAt: new Date().toISOString(),
    autoAdjustedForInjury: true,
  };
  const result = await saveLineupIfRevision(code, replacement, expectedRevision);
  if (!result.saved) {
    return {
      ok: true,
      changed: false,
      conflict: true,
      reason: "owner-lineup-changed-during-repair",
      currentRevision: result.currentRevision,
      readiness,
    };
  }

  return {
    ok: true,
    changed: true,
    saved: replacement,
    readiness,
  };
}
