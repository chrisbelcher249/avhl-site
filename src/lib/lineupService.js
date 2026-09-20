import { teams as fallbackTeams } from "../../data/teams";
import { getPlayers } from "@/lib/players";
import { buildProjectedLineup } from "@/lib/lineups";
import { getSavedLineup, getSavedLineups, lineupStorageStatus } from "@/lib/lineupStorage";
import { hydrateLineupRecord, recordFromProjected, validateLineupRecord } from "@/lib/lineupRecords";
import { getCurrentInjuryState, healthyRosterForTeam } from "@/lib/injuries";

export function fallbackTeamByAbbreviation(abbreviation) {
  const code = String(abbreviation || "").toUpperCase();
  return fallbackTeams.find((team) => team.abbreviation === code) ?? null;
}

export function rosterForTeam(players, abbreviation) {
  const team = fallbackTeamByAbbreviation(abbreviation);
  if (!team) return [];
  return (players || []).filter((player) => player.currentTeam === team.name);
}

export async function getEffectiveLineup(abbreviation) {
  const code = String(abbreviation || "").toUpperCase();
  const team = fallbackTeamByAbbreviation(code);
  if (!team) return null;

  const storage = lineupStorageStatus();
  let storageError = null;
  const { players, source: rosterSource } = await getPlayers();
  const [saved, injuryState] = await Promise.all([
    getSavedLineup(code).catch((error) => {
      console.error(`Unable to load saved lineup for ${code}`, error);
      storageError = "Saved lineup storage is temporarily unavailable. The lineup shown may not be the latest owner-saved version.";
      return null;
    }),
    getCurrentInjuryState(players).catch((error) => {
      console.error(`Unable to load active injuries for ${code}`, error);
      storageError = storageError || "Active injury status is temporarily unavailable. Lineup editing is paused so an injured player cannot be dressed accidentally.";
      return null;
    }),
  ]);

  const rosterPlayers = rosterForTeam(players, code);
  const activeInjuries = injuryState?.byTeam?.[code] || [];
  const healthyRosterPlayers = healthyRosterForTeam(rosterPlayers, activeInjuries);
  const readiness = injuryState?.readiness?.[code] || null;
  const projection = buildProjectedLineup(healthyRosterPlayers);
  const projectedRecord = recordFromProjected(code, projection);
  let record = projectedRecord;
  let source = "projected";
  let savedErrors = [];

  if (saved) {
    const validation = validateLineupRecord(saved, healthyRosterPlayers, code);
    if (validation.ok) {
      record = validation.record;
      source = saved.autoAdjustedForInjury ? "auto-optimized" : "saved";
    } else {
      savedErrors = validation.errors;
      source = "auto-optimized";
      // A roster move immediately invalidates the owner lineup as the active
      // lineup. Use a fresh optimized projection right away while retaining the
      // old revision only for compare-and-save safety when the owner returns.
      record = {
        ...projectedRecord,
        revision: Math.max(0, Number(saved.revision) || 0),
        updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : null,
      };
    }
  }

  return {
    team,
    rosterPlayers,
    rosterSource,
    record,
    lineup: hydrateLineupRecord(record, rosterPlayers, code),
    activeInjuries,
    readiness,
    injuryStorage: injuryState?.storage || null,
    source,
    savedErrors,
    storage,
    storageError,
  };
}

export async function getEffectiveLineupsForSimulator(players) {
  const codes = fallbackTeams.map((team) => team.abbreviation);
  const storage = lineupStorageStatus();
  // In production, lineup persistence is part of the simulator's source of
  // truth. Do not run projected games just because the deployment forgot to
  // connect Redis/KV.
  if (!storage.configured) {
    throw new Error("Persistent owner-lineup storage is not configured.");
  }
  let savedByCode;
  let injuryState;
  try {
    [savedByCode, injuryState] = await Promise.all([
      getSavedLineups(codes),
      getCurrentInjuryState(players),
    ]);
  } catch (error) {
    console.error("Unable to load saved simulator lineups", error);
    // Once production persistence is configured, silently substituting projected
    // lines would violate the lineup lock/source-of-truth guarantee. Let the API
    // fail so the simulator can refuse to start until the latest lineup is read.
    if (storage.configured && storage.mode === "redis") {
      throw new Error("Latest owner lineups could not be loaded from persistent storage.");
    }
    savedByCode = {};
    injuryState = injuryState || { byTeam: {}, readiness: {} };
  }
  const records = {};
  const sources = {};
  const invalid = {};
  const cannotPlay = {};

  for (const team of fallbackTeams) {
    const rosterPlayers = rosterForTeam(players, team.abbreviation);
    const activeInjuries = injuryState?.byTeam?.[team.abbreviation] || [];
    const healthyRosterPlayers = healthyRosterForTeam(rosterPlayers, activeInjuries);
    const readiness = injuryState?.readiness?.[team.abbreviation] || null;
    const projected = recordFromProjected(team.abbreviation, buildProjectedLineup(healthyRosterPlayers));
    if (readiness && !readiness.canPlay) cannotPlay[team.abbreviation] = readiness;
    const saved = savedByCode[team.abbreviation];
    if (saved) {
      const validation = validateLineupRecord(saved, healthyRosterPlayers, team.abbreviation);
      if (validation.ok) {
        records[team.abbreviation] = validation.record;
        sources[team.abbreviation] = saved.autoAdjustedForInjury ? "auto-optimized" : "saved";
        continue;
      }
      // A roster transaction invalidates the owner lineup immediately. The
      // active lineup becomes a fresh server-generated optimized projection so
      // the commissioner can still simulate without manually repairing lines.
      // Keep the validation errors for UI/status messaging, but always provide
      // the valid projected record to the simulator.
      records[team.abbreviation] = projected;
      invalid[team.abbreviation] = validation.errors;
      sources[team.abbreviation] = "auto-optimized";
      continue;
    }
    records[team.abbreviation] = projected;
    sources[team.abbreviation] = "projected";
  }

  return { records, sources, invalid, storage, injuries: injuryState?.active || [], readiness: injuryState?.readiness || {}, cannotPlay };
}
