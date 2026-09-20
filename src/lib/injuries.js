import { teams } from "../../data/teams";
import { getSchedule } from "@/lib/schedule";
import { getInjuryRecords, injuryStorageStatus } from "@/lib/injuryStorage";
import { isDefensePlayer, isForwardPlayer, isGoaliePlayer } from "@/lib/lineupRecords";

const teamByAbbreviation = Object.fromEntries(teams.map((team) => [team.abbreviation, team]));
const teamByName = Object.fromEntries(teams.map((team) => [team.name, team]));

function completed(game) {
  return game?.awayScore !== null && game?.awayScore !== undefined &&
    game?.homeScore !== null && game?.homeScore !== undefined &&
    Number.isFinite(Number(game.awayScore)) && Number.isFinite(Number(game.homeScore));
}

function teamGames(schedule, abbreviation) {
  const team = teamByAbbreviation[abbreviation];
  if (!team) return [];
  return (schedule || []).filter((game) => game.away === team.slug || game.home === team.slug).sort((a, b) => a.id - b.id);
}

function titleCase(value) {
  return String(value || "Injury")
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function rosterTeamForRecord(record, playerById) {
  const current = playerById.get(String(record.playerId || ""))?.currentTeam;
  return teamByName[current] || teamByAbbreviation[String(record.teamAbbreviation || "").toUpperCase()] || null;
}

export function teamReadinessForRoster(rosterPlayers, activeInjuries = []) {
  const injuredIds = new Set((activeInjuries || []).map((injury) => String(injury.playerId || "")));
  const healthy = (rosterPlayers || []).filter((player) => !injuredIds.has(String(player.id)));
  const forwards = healthy.filter(isForwardPlayer).length;
  const defense = healthy.filter((player) => isDefensePlayer(player) && !isGoaliePlayer(player)).length;
  const goalies = healthy.filter(isGoaliePlayer).length;
  const reasons = [];
  if (forwards < 12) reasons.push(`only ${forwards} healthy forward${forwards === 1 ? "" : "s"} (12 required)`);
  if (defense < 6) reasons.push(`only ${defense} healthy defensemen (6 required)`);
  if (goalies < 2) reasons.push(`only ${goalies} healthy goalie${goalies === 1 ? "" : "s"} (2 required)`);
  return {
    canPlay: reasons.length === 0,
    healthyCount: healthy.length,
    healthyForwards: forwards,
    healthyDefense: defense,
    healthyGoalies: goalies,
    reasons,
  };
}

export async function getCurrentInjuryState(players = []) {
  const storage = injuryStorageStatus();
  if (!storage.configured) {
    return {
      storage,
      records: [],
      active: [],
      recovered: [],
      byTeam: {},
      readiness: {},
      scheduleSource: null,
      scheduleError: "Persistent injury storage is not configured.",
    };
  }

  const [records, scheduleResult] = await Promise.all([
    getInjuryRecords(),
    getSchedule(),
  ]);
  const playerById = new Map((players || []).map((player) => [String(player.id), player]));
  const active = [];
  const recovered = [];

  for (const record of records) {
    const playerId = String(record.playerId || "");
    const team = rosterTeamForRecord(record, playerById);
    const abbreviation = team?.abbreviation || String(record.teamAbbreviation || "").toUpperCase();
    // Injury duration is anchored to the schedule of the team the player was
    // with when the injury occurred. If the player is later traded, the injury
    // still follows the player to the new roster without losing its countdown.
    const scheduleAbbreviation = String(record.teamAbbreviation || abbreviation).toUpperCase();
    const games = teamGames(scheduleResult.schedule, scheduleAbbreviation);
    const injuryGameId = Number(record.officialGameId);
    const injuryIndex = games.findIndex((game) => Number(game.id) === injuryGameId);
    const gamesMissed = Math.max(1, Number.parseInt(String(record.gamesMissed ?? "1"), 10) || 1);
    const missedGames = injuryIndex >= 0 ? games.slice(injuryIndex + 1, injuryIndex + 1 + gamesMissed) : [];
    const completedMissed = missedGames.filter(completed).length;
    const gamesRemaining = Math.max(0, gamesMissed - completedMissed);
    const returnGame = injuryIndex >= 0 ? games[injuryIndex + 1 + gamesMissed] || null : null;
    const player = playerById.get(playerId) || null;
    const resolved = {
      ...record,
      playerId,
      playerName: player?.name || record.playerName || "Unknown Player",
      position: player?.position || record.position || "",
      teamAbbreviation: abbreviation,
      teamName: team?.name || record.teamName || abbreviation,
      teamSlug: team?.slug || null,
      injuryType: titleCase(record.injuryType || record.bodyArea || "Injury"),
      gamesMissed,
      gamesRemaining,
      missedGameIds: missedGames.map((game) => game.id),
      completedMissed,
      expectedReturnDate: returnGame?.date || null,
      expectedReturnGameId: returnGame?.id || null,
      active: gamesRemaining > 0,
    };
    (resolved.active ? active : recovered).push(resolved);
  }

  active.sort((a, b) => a.teamAbbreviation.localeCompare(b.teamAbbreviation) || b.gamesRemaining - a.gamesRemaining || a.playerName.localeCompare(b.playerName));
  recovered.sort((a, b) => Number(b.officialGameId) - Number(a.officialGameId));

  const byTeam = {};
  for (const injury of active) (byTeam[injury.teamAbbreviation] ||= []).push(injury);

  const readiness = {};
  for (const team of teams) {
    const roster = (players || []).filter((player) => player.currentTeam === team.name);
    readiness[team.abbreviation] = {
      abbreviation: team.abbreviation,
      teamName: team.name,
      teamSlug: team.slug,
      ...teamReadinessForRoster(roster, byTeam[team.abbreviation] || []),
    };
  }

  return {
    storage,
    records,
    active,
    recovered,
    byTeam,
    readiness,
    scheduleSource: scheduleResult.source,
    scheduleError: scheduleResult.error,
  };
}

export function healthyRosterForTeam(rosterPlayers, activeInjuries) {
  const injuredIds = new Set((activeInjuries || []).map((injury) => String(injury.playerId || "")));
  return (rosterPlayers || []).filter((player) => !injuredIds.has(String(player.id)));
}
