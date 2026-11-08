import { getTrades } from "./trades";
import { computeCapObligations } from "./capObligations";
import { reconcileDeadCapLedger, reconcileRetainedCapLedger } from "./capLedgerStorage";
import { getLtirDesignations, ltirStorageStatus } from "./ltirStorage";
import { teams } from "../../data/teams";

const teamByName = new Map(teams.map((team) => [team.name, team]));

export async function getCapContext(players = [], waiverRecords = [], injuryState = null, waiverError = null) {
  const [tradeResult, designationsResult] = await Promise.all([
    getTrades(),
    getLtirDesignations().then((records) => ({ records, error: null })).catch((error) => {
      console.error("Unable to read LTIR state", error);
      return { records: [], error: "LTIR records temporarily unavailable." };
    }),
  ]);
  const obligations = computeCapObligations(players, tradeResult.trades, waiverRecords);
  const retainedResult = await reconcileRetainedCapLedger(obligations.ledger, tradeResult.trades).then((result) => ({
    ...result, error: null,
  })).catch((error) => {
    console.error("Unable to reconcile retained salary ledger", error);
    return { error: "Persistent retained-salary obligations are unavailable.", warnings: [], activeLedger: [] };
  });
  if (!retainedResult.error) {
    obligations.retainedByPlayer = retainedResult.retainedByPlayer;
    obligations.retainedByTeam = retainedResult.retainedByTeam;
    const byId = new Map(players.map((player) => [String(player.id), player]));
    for (const item of obligations.ledger) {
      if (item.type !== "release") continue;
      const player = byId.get(String(item.playerId));
      if (player && player.aav > 0) {
        const releaseSalary = player.signedContract?.previous?.team === "UFA"
          ? player.signedContract.previous.aav : player.aav;
        item.annualCharge = Math.round(Math.max(0, releaseSalary - (obligations.retainedByPlayer[player.id]?.total || 0)) * 0.25);
      }
    }
  } else {
    obligations.retainedByPlayer = {};
    obligations.retainedByTeam = {};
  }
  const ledgerResult = await reconcileDeadCapLedger(obligations.ledger, waiverRecords).then((result) => ({
    ...result, error: null,
  })).catch((error) => {
    console.error("Unable to reconcile dead-cap ledger", error);
    return { error: "Persistent dead-cap obligations are unavailable.", warnings: [], activeLedger: [] };
  });
  if (!ledgerResult.error) {
    obligations.deadCapByTeam = ledgerResult.deadCapByTeam;
    obligations.ledger = [...(!retainedResult.error ? retainedResult.activeLedger : obligations.ledger.filter((entry) => entry.type === "retained")), ...ledgerResult.activeLedger];
  } else obligations.deadCapByTeam = {};
  const warnings = [...obligations.warnings, ...(retainedResult.warnings || []), ...(ledgerResult.warnings || [])];
  const ltirPlayerIdsByTeam = {};
  const ltirPendingByTeam = {};
  const activeInjuries = new Map((injuryState?.active || []).map((injury) => [String(injury.playerId), injury]));
  const playerById = new Map(players.map((player) => [String(player.id), player]));
  const designations = designationsResult.records;

  for (const record of designations) {
    if (record.status !== "designated") continue;
    const player = playerById.get(String(record.playerId));
    if (!player) {
      warnings.push(`LTIR player ${record.playerId} no longer exists in roster database.`);
      continue;
    }
    const currentAbbreviation = teamByName.get(player.currentTeam)?.abbreviation;
    if (currentAbbreviation !== record.team) {
      warnings.push(`LTIR: ${player.name} is no longer on ${record.team}; designation must be reconciled.`);
      continue;
    }
    const injury = activeInjuries.get(String(player.id));
    const eligible = injury && injury.storageKey === record.injuryKey && injury.gamesRemaining > 0 && injury.gamesMissed >= 10;
    if (eligible) {
      (ltirPlayerIdsByTeam[record.team] ||= []).push(String(player.id));
    } else {
      (ltirPendingByTeam[record.team] ||= []).push({
        playerId: String(player.id),
        playerName: player.name,
        expectedReturnGameId: record.expectedReturnGameId,
        expectedReturnDate: record.expectedReturnDate,
      });
    }
  }

  const error = waiverError || tradeResult.error || designationsResult.error || retainedResult.error || ledgerResult.error ||
    (!ltirStorageStatus().configured ? "Persistent LTIR storage is not configured." : null);

  return {
    obligations,
    designations,
    ltirPlayerIdsByTeam,
    ltirPendingByTeam,
    warnings,
    error,
    storage: ltirStorageStatus(),
  };
}

export function teamCapOptions(teamAbbreviation, context) {
  return {
    obligations: context?.obligations || {},
    ltirPlayerIds: context?.ltirPlayerIdsByTeam?.[teamAbbreviation] || [],
    capDataError: Boolean(context?.error),
  };
}
