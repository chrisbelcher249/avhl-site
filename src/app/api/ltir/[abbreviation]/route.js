import { teams } from "../../../../../data/teams";
import { salaryCapRules, rosterRules, buildTeamRosterAndCap } from "../../../../../data/salaryCap";
import { verifyOwnerPassword } from "@/lib/credentials";
import { getPlayers } from "@/lib/players";
import { getCurrentInjuryState } from "@/lib/injuries";
import { getCapContext, teamCapOptions } from "@/lib/capContext";
import { ltirStorageStatus, saveLtirDesignation } from "@/lib/ltirStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const responseHeaders = { "Cache-Control": "no-store, max-age=0" };
const fail = (error, status = 400) => Response.json({ ok: false, error }, { status, headers: responseHeaders });

async function contextForTeam(abbreviation) {
  const team = teams.find((item) => item.abbreviation === abbreviation);
  if (!team) return null;
  const roster = await getPlayers();
  if (roster.source !== "live") throw new Error("Full live player database is temporarily unavailable.");
  const injuries = await getCurrentInjuryState(roster.players);
  if (injuries.scheduleError || injuries.storage?.configured === false) throw new Error("Injury schedule or storage unavailable; LTIR changes are paused.");
  const context = await getCapContext(roster.players, roster.waiverRecords, injuries, roster.waiverError);
  if (context.error) throw new Error(context.error);
  const teamRoster = buildTeamRosterAndCap(roster.players, team.name, teamCapOptions(abbreviation, context));
  const eligibleInjuries = injuries.active.filter((injury) => injury.teamAbbreviation === abbreviation && injury.gamesMissed >= 10);
  return { team, roster, injuries, context, teamRoster, eligibleInjuries };
}

export async function GET(_request, { params }) {
  const { abbreviation: input } = await params;
  const abbreviation = String(input || "").toUpperCase();
  if (!teams.some((team) => team.abbreviation === abbreviation)) return fail("Unknown team.", 404);
  try {
    const data = await contextForTeam(abbreviation);
    const designatedIds = new Set(data.context.designations.filter((record) => record.status === "designated" && record.team === abbreviation).map((record) => String(record.playerId)));
    return Response.json({
      ok: true,
      team: abbreviation,
      cap: data.teamRoster.payroll,
      floor: salaryCapRules.floor,
      ceiling: salaryCapRules.cap,
      ltirRelief: data.teamRoster.capBreakdown.ltirRelief,
      designated: [...designatedIds],
      eligible: data.eligibleInjuries.map(({ playerId, playerName, gamesMissed, gamesRemaining, expectedReturnDate, expectedReturnGameId }) => ({
        playerId, playerName, gamesMissed, gamesRemaining, expectedReturnDate, expectedReturnGameId,
      })),
      pendingActivation: data.context.ltirPendingByTeam[abbreviation] || [],
      warnings: data.context.warnings.filter((warning) => warning.includes("LTIR")),
    }, { headers: responseHeaders });
  } catch (error) {
    console.error("LTIR status unavailable", abbreviation, error);
    return fail("LTIR status is temporarily unavailable.", 503);
  }
}

export async function POST(request, { params }) {
  const { abbreviation: input } = await params;
  const abbreviation = String(input || "").toUpperCase();
  const team = teams.find((item) => item.abbreviation === abbreviation);
  if (!team) return fail("Unknown team.", 404);
  let body;
  try { body = await request.json(); } catch { return fail("Invalid LTIR request."); }
  if (!verifyOwnerPassword(abbreviation, String(body?.password || ""))) return fail("Incorrect team password.", 401);
  if (!ltirStorageStatus().configured) return fail("Persistent LTIR storage is not configured.", 503);
  const playerId = String(body?.playerId || "");
  const action = String(body?.action || "");
  if (!/^\d+$/.test(playerId) || !["designate", "reactivate"].includes(action)) return fail("Unknown player or action.");
  try {
    const data = await contextForTeam(abbreviation);
    const player = data.roster.players.find((item) => String(item.id) === playerId);
    if (!player || player.currentTeam !== team.name) return fail("The player is not on this team's roster.");
    const previous = data.context.designations.find((record) => record.playerId === playerId);
    const activeInjury = data.eligibleInjuries.find((injury) => String(injury.playerId) === playerId);

    if (action === "designate") {
      if (!activeInjury || !(activeInjury.gamesRemaining > 0)) return fail("LTIR requires an active injury of at least ten games missed.");
      if (previous?.status === "designated") return fail("Player is already designated LTIR.");
      const currentIds = data.context.ltirPlayerIdsByTeam[abbreviation] || [];
      const projected = buildTeamRosterAndCap(data.roster.players, team.name, {
        ...teamCapOptions(abbreviation, data.context),
        ltirPlayerIds: [...currentIds, playerId],
      });
      if (projected.payroll < salaryCapRules.floor) {
        return fail(`Designation blocked: effective payroll would be $${(projected.payroll / 1_000_000).toFixed(2)}M, below the $70M floor. Add salary first.`);
      }
      const record = {
        playerId, playerName: player.name, team: abbreviation, injuryKey: activeInjury.storageKey,
        status: "designated", designatedAt: new Date().toISOString(),
        expectedReturnGameId: activeInjury.expectedReturnGameId,
        expectedReturnDate: activeInjury.expectedReturnDate,
      };
      await saveLtirDesignation(record);
      return Response.json({ ok: true, action, playerId, payroll: projected.payroll, relief: projected.capBreakdown.ltirRelief }, { headers: responseHeaders });
    }

    if (!previous || previous.status !== "designated" || previous.team !== abbreviation) return fail("Player has no active LTIR designation.");
    if (data.injuries.active.some((injury) => String(injury.playerId) === playerId && injury.storageKey === previous.injuryKey)) {
      return fail("Player cannot be reactivated before the final missed game has ended.");
    }
    const currentIds = data.context.ltirPlayerIdsByTeam[abbreviation] || [];
    const projected = buildTeamRosterAndCap(data.roster.players, team.name, {
      ...teamCapOptions(abbreviation, data.context),
      ltirPlayerIds: currentIds.filter((id) => id !== playerId),
    });
    if (projected.payroll > salaryCapRules.cap) {
      return fail(`Activation blocked: payroll would be $${(projected.payroll / 1_000_000).toFixed(2)}M, above the $100M ceiling.`);
    }
    if (projected.count > rosterRules.maximumPlayers) {
      return fail(`Activation blocked: ${projected.count} active players would exceed the ${rosterRules.maximumPlayers}-player maximum.`);
    }
    await saveLtirDesignation({ ...previous, status: "reactivated", reactivatedAt: new Date().toISOString() });
    return Response.json({ ok: true, action, playerId, payroll: projected.payroll }, { headers: responseHeaders });
  } catch (error) {
    console.error("LTIR transaction failed", abbreviation, playerId, error);
    return fail("LTIR transaction could not be saved; no designation was changed.", 503);
  }
}
