import { teams } from "../../data/teams";
import { fetchSeasonSheet, integer, isoDate, normalizePlayerId, numberValue, percentageValue, SEASON_TABS, timeToSeconds } from "./seasonSheets.js";

const teamByAbbreviation = Object.fromEntries(teams.map((team) => [team.abbreviation, team]));
const teamByName = Object.fromEntries(teams.map((team) => [team.name.toLowerCase(), team]));
const text = (value) => String(value ?? "").trim();

function penaltyMinutes(value) {
  const raw = text(value);
  if (!raw) return 0;
  return raw.includes(":") ? timeToSeconds(raw) / 60 : numberValue(raw);
}

function parsePowerPlay(value) {
  const match = text(value).match(/(-?\d+)\s*\/\s*(-?\d+)/);
  return match ? { goals: integer(match[1]), opportunities: integer(match[2]) } : { goals: 0, opportunities: 0 };
}

export function parseTeamGameRows(rows) {
  return rows.map((row) => {
    const pp = parsePowerPlay(row.Powerplays);
    const score = integer(row.Score);
    const oppScore = integer(row["Opp Score"]);
    const finish = text(row.Finish).toUpperCase() || "REG";
    return {
      gameId: integer(row["Game ID"]), source: text(row.Source).toUpperCase(), team: text(row.Team).toUpperCase(), teamName: text(row["Team Name"]), opponent: text(row.Opponent).toUpperCase(), homeAway: text(row["H/A"]).toUpperCase(), score, oppScore,
      result: text(row.Result).toUpperCase() || (score > oppScore ? "W" : score < oppScore ? "L" : ""), finish,
      shots: integer(row["Total Shots"]), hits: integer(row.Hits), timeOnAttack: timeToSeconds(row["Time On Attack"]), passing: percentageValue(row.Passing), faceoffsWon: integer(row["Faceoffs Won"]), penaltyMinutes: penaltyMinutes(row["Penalty Minutes"]),
      powerPlayGoals: pp.goals, powerPlayOpportunities: pp.opportunities, powerPlayTime: timeToSeconds(row["Powerplay Minutes"]), shorthandedGoals: integer(row["Shorthanded Goals"]), injuries: integer(row.Injuries), manGamesLost: integer(row["Man-Games Lost"]),
    };
  }).filter((row) => row.gameId > 0 && row.team);
}

export function parseSkaterGameRows(rows) {
  return rows.map((row) => ({
    gameId: integer(row["Game ID"]), source: text(row.Source).toUpperCase(), team: text(row.Team).toUpperCase(), opponent: text(row.Opponent).toUpperCase(), homeAway: text(row["H/A"]).toUpperCase(), playerId: normalizePlayerId(row["Player ID"]), name: text(row.Name), position: text(row.Pos), toi: timeToSeconds(row.Min), goals: integer(row.G), assists: integer(row.A), points: integer(row.PTS), plusMinus: integer(row["+/-"]), shots: integer(row.S), shotPct: percentageValue(row["S%"]), ppToi: timeToSeconds(row.PPT), penaltyMinutes: penaltyMinutes(row.PIM), hits: integer(row.Hits), powerPlayGoals: integer(row.PPG), shorthandedGoals: integer(row.SHG), faceoffsTaken: integer(row.FOT), faceoffsWon: integer(row.FOW), faceoffPct: percentageValue(row["FO%"]),
  })).filter((row) => row.gameId > 0 && row.playerId);
}

export function parseGoalieGameRows(rows) {
  return rows.map((row) => ({
    gameId: integer(row["Game ID"]), source: text(row.Source).toUpperCase(), team: text(row.Team).toUpperCase(), opponent: text(row.Opponent).toUpperCase(), homeAway: text(row["H/A"]).toUpperCase(), playerId: normalizePlayerId(row["Player ID"]), name: text(row.Name), toi: timeToSeconds(row.Min), shotsAgainst: integer(row.SA), saves: integer(row.SV), savePct: numberValue(row["SV%"]), goalsAgainst: integer(row.GA), gaa: numberValue(row.GAA), emptyNetGoals: integer(row.ENG), penaltyMinutes: penaltyMinutes(row.PIM), goals: integer(row.G), assists: integer(row.A), points: integer(row.PTS),
  })).filter((row) => row.gameId > 0 && row.playerId);
}

export function parseScheduleRows(rows) {
  return rows.map((row) => {
    const awayName = text(row["Away Team"]), homeName = text(row["Home Team"]);
    const awayTeam = teamByName[awayName.toLowerCase()], homeTeam = teamByName[homeName.toLowerCase()];
    return { id: integer(row["Game ID"]), day: integer(row.Day), date: isoDate(row.Date), awayName, homeName, away: awayTeam?.slug || "", home: homeTeam?.slug || "", awayAbbreviation: awayTeam?.abbreviation || "", homeAbbreviation: homeTeam?.abbreviation || "" };
  }).filter((row) => row.id > 0 && row.away && row.home);
}

function aggregateSkaters(rows) {
  const byPlayer = new Map();
  for (const row of rows) {
    const current = byPlayer.get(row.playerId) || { playerId: row.playerId, name: row.name, position: row.position, team: row.team, gp: 0, toi: 0, goals: 0, assists: 0, points: 0, plusMinus: 0, shots: 0, ppToi: 0, penaltyMinutes: 0, hits: 0, powerPlayGoals: 0, shorthandedGoals: 0, faceoffsTaken: 0, faceoffsWon: 0, gameRows: [] };
    current.name = row.name || current.name; current.position = row.position || current.position; current.team = row.team || current.team; current.gp += 1; current.toi += row.toi; current.goals += row.goals; current.assists += row.assists; current.points += row.points; current.plusMinus += row.plusMinus; current.shots += row.shots; current.ppToi += row.ppToi; current.penaltyMinutes += row.penaltyMinutes; current.hits += row.hits; current.powerPlayGoals += row.powerPlayGoals; current.shorthandedGoals += row.shorthandedGoals; current.faceoffsTaken += row.faceoffsTaken; current.faceoffsWon += row.faceoffsWon; current.gameRows.push(row); byPlayer.set(row.playerId, current);
  }
  return [...byPlayer.values()].map((player) => ({ ...player, shotPct: player.shots ? player.goals / player.shots : 0, faceoffPct: player.faceoffsTaken ? player.faceoffsWon / player.faceoffsTaken : 0, toiPerGame: player.gp ? player.toi / player.gp : 0, ppToiPerGame: player.gp ? player.ppToi / player.gp : 0, teamInfo: teamByAbbreviation[player.team] || null, gameRows: player.gameRows.sort((a, b) => b.gameId - a.gameId) }));
}

function aggregateGoalies(rows) {
  const byPlayer = new Map();
  for (const row of rows) {
    const current = byPlayer.get(row.playerId) || { playerId: row.playerId, name: row.name, team: row.team, dressed: 0, gp: 0, toi: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0, emptyNetGoals: 0, penaltyMinutes: 0, goals: 0, assists: 0, points: 0, gameRows: [] };
    current.name = row.name || current.name; current.team = row.team || current.team; current.dressed += 1; if (row.toi > 0) current.gp += 1; current.toi += row.toi; current.shotsAgainst += row.shotsAgainst; current.saves += row.saves; current.goalsAgainst += row.goalsAgainst; current.emptyNetGoals += row.emptyNetGoals; current.penaltyMinutes += row.penaltyMinutes; current.goals += row.goals; current.assists += row.assists; current.points += row.points; current.gameRows.push(row); byPlayer.set(row.playerId, current);
  }
  return [...byPlayer.values()].map((goalie) => ({ ...goalie, savePct: goalie.shotsAgainst ? goalie.saves / goalie.shotsAgainst : 0, gaa: goalie.toi ? (goalie.goalsAgainst * 3600) / goalie.toi : 0, teamInfo: teamByAbbreviation[goalie.team] || null, gameRows: goalie.gameRows.sort((a, b) => b.gameId - a.gameId) }));
}

function emptyTeam(team) {
  return { abbreviation: team.abbreviation, gp: 0, wins: 0, losses: 0, otl: 0, points: 0, goalsFor: 0, goalsAgainst: 0, shots: 0, hits: 0, timeOnAttack: 0, passingTotal: 0, faceoffsWon: 0, penaltyMinutes: 0, powerPlayGoals: 0, powerPlayOpportunities: 0, powerPlayTime: 0, shorthandedGoals: 0, injuries: 0, manGamesLost: 0, gameRows: [] };
}

function aggregateTeams(rows) {
  const byTeam = new Map(teams.map((team) => [team.abbreviation, emptyTeam(team)]));
  for (const row of rows) {
    const current = byTeam.get(row.team) || emptyTeam({ abbreviation: row.team });
    current.gp += 1; if (row.result === "W") { current.wins += 1; current.points += 2; } else if (row.result === "L" && ["OT", "SO"].includes(row.finish)) { current.otl += 1; current.points += 1; } else if (row.result === "L") current.losses += 1;
    current.goalsFor += row.score; current.goalsAgainst += row.oppScore; current.shots += row.shots; current.hits += row.hits; current.timeOnAttack += row.timeOnAttack; current.passingTotal += row.passing; current.faceoffsWon += row.faceoffsWon; current.penaltyMinutes += row.penaltyMinutes; current.powerPlayGoals += row.powerPlayGoals; current.powerPlayOpportunities += row.powerPlayOpportunities; current.powerPlayTime += row.powerPlayTime; current.shorthandedGoals += row.shorthandedGoals; current.injuries += row.injuries; current.manGamesLost += row.manGamesLost; current.gameRows.push(row); byTeam.set(row.team, current);
  }
  return [...byTeam.values()].map((team) => ({ ...team, goalDifferential: team.goalsFor - team.goalsAgainst, pointsPct: team.gp ? team.points / (team.gp * 2) : 0, goalsForPerGame: team.gp ? team.goalsFor / team.gp : 0, goalsAgainstPerGame: team.gp ? team.goalsAgainst / team.gp : 0, shotsPerGame: team.gp ? team.shots / team.gp : 0, hitsPerGame: team.gp ? team.hits / team.gp : 0, timeOnAttackPerGame: team.gp ? team.timeOnAttack / team.gp : 0, passing: team.gp ? team.passingTotal / team.gp : 0, faceoffsWonPerGame: team.gp ? team.faceoffsWon / team.gp : 0, penaltyMinutesPerGame: team.gp ? team.penaltyMinutes / team.gp : 0, powerPlayPct: team.powerPlayOpportunities ? team.powerPlayGoals / team.powerPlayOpportunities : 0, teamInfo: teamByAbbreviation[team.abbreviation] || null, gameRows: team.gameRows.sort((a, b) => b.gameId - a.gameId) }));
}

export async function getTeamGameRows() {
  try { const { rows } = await fetchSeasonSheet(SEASON_TABS.teamStats); return { rows: parseTeamGameRows(rows), source: "live", error: null }; }
  catch (error) { console.error("Unable to load 2026-27 team game stats", error); return { rows: [], source: "unavailable", error: "Current team statistics are temporarily unavailable." }; }
}

export async function getSeasonStats() {
  const tabs = [SEASON_TABS.teamStats, SEASON_TABS.skaterStats, SEASON_TABS.goalieStats, SEASON_TABS.schedule];
  const requests = await Promise.allSettled(tabs.map((tab) => fetchSeasonSheet(tab)));
  const errors = [];
  const rows = requests.map((request, index) => { if (request.status === "fulfilled") return request.value.rows; errors.push(`${tabs[index]}: ${request.reason instanceof Error ? request.reason.message : String(request.reason)}`); return []; });
  const teamGameRows = parseTeamGameRows(rows[0]), skaterGameRows = parseSkaterGameRows(rows[1]), goalieGameRows = parseGoalieGameRows(rows[2]), scheduleRows = parseScheduleRows(rows[3]);
  const scheduleById = Object.fromEntries(scheduleRows.map((game) => [game.id, game]));
  const skaters = aggregateSkaters(skaterGameRows), goalies = aggregateGoalies(goalieGameRows), teamStats = aggregateTeams(teamGameRows);
  return { teamGameRows, skaterGameRows, goalieGameRows, scheduleRows, scheduleById, skaters, goalies, teams: teamStats, skaterById: Object.fromEntries(skaters.map((player) => [player.playerId, player])), goalieById: Object.fromEntries(goalies.map((player) => [player.playerId, player])), teamByAbbreviation: Object.fromEntries(teamStats.map((team) => [team.abbreviation, team])), source: errors.length ? (errors.length === 4 ? "unavailable" : "partial") : "live", error: errors.length ? "Some 2026–27 live statistics could not be loaded." : null };
}
