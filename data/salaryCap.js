import { players } from "./players";
import { teams } from "./teams";

export const salaryCapRules = {
  cap: 100_000_000,
  floor: 70_000_000,
  maximumSalary: 20_000_000,
  minimumSalary: 900_000,
};

function isDefenseman(player) {
  return player.position.includes("LD") || player.position.includes("RD");
}

export function getTeamRosterAndCap(teamName) {
  const rosterPlayers = players.filter((player) => player.currentTeam === teamName);
  const skaters = rosterPlayers.filter((player) => player.role === "Skater");
  const goalies = rosterPlayers.filter((player) => player.role === "Goalie");
  const forwards = skaters.filter((player) => !isDefenseman(player));
  const defensemen = skaters.filter(isDefenseman);
  const payroll = rosterPlayers.reduce((total, player) => total + (player.aav || 0), 0);
  const contractViolations = rosterPlayers.filter(
    (player) => player.aav === null
      || player.aav < salaryCapRules.minimumSalary
      || player.aav > salaryCapRules.maximumSalary
  );
  const overCap = payroll > salaryCapRules.cap;
  const belowFloor = payroll < salaryCapRules.floor;
  const compliant = !overCap && !belowFloor && contractViolations.length === 0;

  return {
    teamName,
    count: rosterPlayers.length,
    skaters,
    goalies,
    forwardsCount: forwards.length,
    defensemenCount: defensemen.length,
    payroll,
    capSpace: salaryCapRules.cap - payroll,
    floorPosition: payroll - salaryCapRules.floor,
    contractViolations,
    overCap,
    belowFloor,
    compliant,
    status: compliant ? "Cap compliant" : overCap ? "Over salary cap" : belowFloor ? "Below cap floor" : "Contract violation",
  };
}

export const teamRosterAndCapBySlug = Object.fromEntries(
  teams.map((team) => [team.slug, getTeamRosterAndCap(team.name)])
);

export const leagueCapSummary = {
  compliant: Object.values(teamRosterAndCapBySlug).filter((team) => team.compliant).length,
  overCap: Object.values(teamRosterAndCapBySlug).filter((team) => team.overCap).length,
  belowFloor: Object.values(teamRosterAndCapBySlug).filter((team) => team.belowFloor).length,
};
