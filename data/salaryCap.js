import { players as bundledPlayers } from "./players";
import { teams } from "./teams";

export const salaryCapRules = {
  cap: 100_000_000,
  floor: 70_000_000,
  maximumSalary: 20_000_000,
  minimumSalary: 900_000,
};

export const rosterRules = {
  minimumForwards: 13,
  minimumDefensemen: 7,
  minimumGoalies: 3,
  maximumPlayers: 26,
};

function positionTokens(player) {
  return String(player.position || "")
    .toUpperCase()
    .split(/[\s/,]+/)
    .filter(Boolean);
}

function isDefenseman(player) {
  const positions = positionTokens(player);
  return positions.includes("LD") || positions.includes("RD") || positions.includes("D");
}

function isForward(player) {
  if (player.role !== "Skater") return false;
  const positions = positionTokens(player);
  if (positions.some((position) => ["LW", "C", "RW", "F"].includes(position))) return true;
  return !isDefenseman(player);
}


function sumOverall(players) {
  return players
    .map((player) => Number(player.overall))
    .filter((overall) => Number.isFinite(overall))
    .reduce((total, overall) => total + overall, 0);
}

function averageOverall(players) {
  const ratings = players
    .map((player) => Number(player.overall))
    .filter((overall) => Number.isFinite(overall));
  if (!ratings.length) return null;
  return ratings.reduce((total, overall) => total + overall, 0) / ratings.length;
}

function topAverageOverall(players, limit) {
  const ratings = players
    .map((player) => Number(player.overall))
    .filter((overall) => Number.isFinite(overall))
    .sort((a, b) => b - a)
    .slice(0, limit);
  if (!ratings.length) return null;
  return ratings.reduce((total, overall) => total + overall, 0) / ratings.length;
}

export function buildTeamRosterAndCap(playerList, teamName) {
  const rosterPlayers = playerList.filter((player) => player.currentTeam === teamName);
  const skaters = rosterPlayers.filter((player) => player.role === "Skater");
  const goalies = rosterPlayers.filter((player) => player.role === "Goalie");
  const forwards = skaters.filter(isForward);
  const defensemen = skaters.filter(isDefenseman);
  const payroll = rosterPlayers.reduce((total, player) => total + (player.aav || 0), 0);
  const contractViolations = rosterPlayers.filter(
    (player) => player.aav === null
      || player.aav < salaryCapRules.minimumSalary
      || player.aav > salaryCapRules.maximumSalary
  );

  const overCap = payroll > salaryCapRules.cap;
  const belowFloor = payroll < salaryCapRules.floor;
  const contractsCompliant = contractViolations.length === 0;
  const salaryCompliant = !overCap && !belowFloor && contractsCompliant;

  const forwardsCompliant = forwards.length >= rosterRules.minimumForwards;
  const defensemenCompliant = defensemen.length >= rosterRules.minimumDefensemen;
  const goaliesCompliant = goalies.length >= rosterRules.minimumGoalies;
  const rosterSizeCompliant = rosterPlayers.length <= rosterRules.maximumPlayers;
  const rosterCompliant = forwardsCompliant && defensemenCompliant && goaliesCompliant && rosterSizeCompliant;
  const compliant = salaryCompliant && rosterCompliant;

  const issues = [];
  if (overCap) issues.push(`$${((payroll - salaryCapRules.cap) / 1_000_000).toFixed(2)}M over cap`);
  if (belowFloor) issues.push(`$${((salaryCapRules.floor - payroll) / 1_000_000).toFixed(2)}M below floor`);
  if (!contractsCompliant) issues.push("Contract salary violation");
  if (!forwardsCompliant) issues.push(`Need ${rosterRules.minimumForwards - forwards.length} F`);
  if (!defensemenCompliant) issues.push(`Need ${rosterRules.minimumDefensemen - defensemen.length} D`);
  if (!goaliesCompliant) issues.push(`Need ${rosterRules.minimumGoalies - goalies.length} G`);
  if (!rosterSizeCompliant) issues.push(`${rosterPlayers.length - rosterRules.maximumPlayers} over roster max`);

  return {
    teamName,
    count: rosterPlayers.length,
    skaters,
    goalies,
    forwards,
    defensemen,
    forwardsCount: forwards.length,
    defensemenCount: defensemen.length,
    averageOverall: topAverageOverall(rosterPlayers, 20),
    forwardAverageOverall: topAverageOverall(forwards, 12),
    defenseAverageOverall: topAverageOverall(defensemen, 6),
    goalieAverageOverall: topAverageOverall(goalies, 2),
    top20AverageOverall: topAverageOverall(rosterPlayers, 20),
    overallSum: sumOverall(rosterPlayers),
    forwardOverallSum: sumOverall(forwards),
    defenseOverallSum: sumOverall(defensemen),
    goalieOverallSum: sumOverall(goalies),
    payroll,
    capSpace: salaryCapRules.cap - payroll,
    floorPosition: payroll - salaryCapRules.floor,
    contractViolations,
    contractsCompliant,
    salaryCompliant,
    overCap,
    belowFloor,
    forwardsCompliant,
    defensemenCompliant,
    goaliesCompliant,
    rosterSizeCompliant,
    rosterCompliant,
    compliant,
    issues,
    status: compliant ? "Fully compliant" : "Needs attention",
  };
}

export function getTeamRosterAndCap(teamName) {
  return buildTeamRosterAndCap(bundledPlayers, teamName);
}

export const teamRosterAndCapBySlug = Object.fromEntries(
  teams.map((team) => [team.slug, getTeamRosterAndCap(team.name)])
);

export const leagueCapSummary = {
  compliant: Object.values(teamRosterAndCapBySlug).filter((team) => team.compliant).length,
  overCap: Object.values(teamRosterAndCapBySlug).filter((team) => team.overCap).length,
  belowFloor: Object.values(teamRosterAndCapBySlug).filter((team) => team.belowFloor).length,
  rosterIssues: Object.values(teamRosterAndCapBySlug).filter((team) => !team.rosterCompliant).length,
};
