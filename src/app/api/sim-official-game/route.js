import { teams } from "../../../../data/teams";
import { verifySimExportPassword } from "@/lib/credentials";
import { buildOfficialSheetRows } from "@/lib/officialGame";
import { getSchedule } from "@/lib/schedule";
import { getTeamGameRows } from "@/lib/seasonStats";
import { writeOfficialGameRows } from "@/lib/googleSheetsWrite";
import { normalizePlayerId } from "@/lib/seasonSheets";
import { deleteInjuryRecords, injuryStorageStatus, saveInjuryRecords } from "@/lib/injuryStorage";
import { repairSavedLineupForTeam } from "@/lib/injuryLineupService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const teamBySlug = Object.fromEntries(teams.map((team) => [team.slug, team]));

const gameNumber = (value) => {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(number) && number >= 1 && number <= 1640 ? number : null;
};

async function scheduledGame(number) {
  const { schedule } = await getSchedule();
  const game = schedule.find((fixture) => fixture.id === number);
  if (!game) throw new Error(`Game ${number} was not found in the official schedule.`);
  const away = teamBySlug[game.away];
  const home = teamBySlug[game.home];
  if (!away || !home) throw new Error(`Game ${number} contains an unknown team.`);
  return { game, away, home };
}

const sameMatchup = (official, away, home) =>
  official.away.abbreviation === String(away || "").toUpperCase() &&
  official.home.abbreviation === String(home || "").toUpperCase();

function officialInjuryRecords(number, gameDate, packet) {
  const injuries = Array.isArray(packet?.summary?.injuries) ? packet.summary.injuries : [];
  const teamBySimId = new Map([
    [String(packet?.away?.id || ""), { abbreviation: packet?.away?.abbreviation, name: packet?.away?.fullName }],
    [String(packet?.home?.id || ""), { abbreviation: packet?.home?.abbreviation, name: packet?.home?.fullName }],
  ]);

  return injuries.map((injury) => {
    const team = teamBySimId.get(String(injury?.teamId || ""));
    const playerId = normalizePlayerId(injury?.avhlId || injury?.playerId);
    const gamesMissed = Math.max(1, Number.parseInt(String(injury?.gamesMissed ?? "1"), 10) || 1);
    if (!team?.abbreviation || !playerId) return null;
    return {
      schema: "avhl-injury-v1",
      officialGameId: number,
      injuryDate: gameDate,
      teamAbbreviation: String(team.abbreviation).toUpperCase(),
      teamName: team.name || "",
      playerId,
      playerName: injury?.playerName || "",
      position: injury?.position || "",
      injuryType: injury?.bodyArea || "Injury",
      bodyArea: injury?.bodyArea || "Injury",
      severity: injury?.severity || "",
      cause: injury?.cause || "",
      gamesMissed,
      simInjuryId: injury?.id || null,
      period: Number(injury?.period) || null,
      clockText: injury?.clockText || null,
      createdAt: new Date().toISOString(),
    };
  }).filter(Boolean);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const password = String(body?.password || "");
    if (!verifySimExportPassword(password)) {
      return Response.json({ ok: false, error: "Incorrect administrator password." }, { status: 401 });
    }

    const number = gameNumber(body?.gameNumber);
    if (!number) {
      return Response.json({ ok: false, error: "Enter an official Game # from 1 to 1640." }, { status: 400 });
    }

    const official = await scheduledGame(number);
    const awayAbbreviation = body?.packet?.away?.abbreviation || body?.awayAbbreviation;
    const homeAbbreviation = body?.packet?.home?.abbreviation || body?.homeAbbreviation;
    if (!sameMatchup(official, awayAbbreviation, homeAbbreviation)) {
      return Response.json({
        ok: false,
        error: `Game ${number} is ${official.away.abbreviation} @ ${official.home.abbreviation}, not ${String(awayAbbreviation || "?").toUpperCase()} @ ${String(homeAbbreviation || "?").toUpperCase()}.`,
        game: {
          id: number,
          date: official.game.date,
          away: official.away.abbreviation,
          awayName: official.away.name,
          home: official.home.abbreviation,
          homeName: official.home.name,
        },
      }, { status: 409 });
    }

    const { rows: existingRows } = await getTeamGameRows();
    if (existingRows.some((row) => row.gameId === number)) {
      return Response.json({ ok: false, error: `Game ${number} has already been submitted.` }, { status: 409 });
    }

    if (body?.action === "check") {
      return Response.json({
        ok: true,
        game: {
          id: number,
          date: official.game.date,
          away: official.away.abbreviation,
          awayName: official.away.name,
          home: official.home.abbreviation,
          homeName: official.home.name,
        },
      }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (body?.action !== "save" || !body?.packet) {
      return Response.json({ ok: false, error: "Official game data was not supplied." }, { status: 400 });
    }

    const { teamRows, skaterRows, goalieRows, finish } = buildOfficialSheetRows(number, body.packet);
    const injuryRecords = officialInjuryRecords(number, official.game.date, body.packet);
    if (injuryRecords.length && !injuryStorageStatus().configured) {
      return Response.json({
        ok: false,
        error: "This game produced an injury, but persistent injury storage is not configured. The official game was not saved.",
      }, { status: 503 });
    }

    // Stage injuries first, then roll them back if the official stat write fails.
    // This prevents a successfully-saved official game from ever losing its
    // player-level injury state because a second backend write failed afterward.
    const injuryKeys = injuryRecords.length ? await saveInjuryRecords(injuryRecords) : [];
    let result;
    try {
      result = await writeOfficialGameRows({ gameId: number, teamRows, skaterRows, goalieRows });
    } catch (error) {
      if (injuryKeys.length) {
        try {
          await deleteInjuryRecords(injuryKeys);
        } catch (rollbackError) {
          console.error(`Unable to roll back injuries for failed Game ${number}`, rollbackError);
        }
      }
      throw error;
    }

    const affectedTeams = [...new Set(injuryRecords.map((injury) => injury.teamAbbreviation))];
    const lineupRepairs = [];
    for (const abbreviation of affectedTeams) {
      try {
        lineupRepairs.push({ abbreviation, ...(await repairSavedLineupForTeam(abbreviation)) });
      } catch (error) {
        console.error(`Unable to persist automatic injury lineup repair for ${abbreviation}`, error);
        // The simulator and public lineup still validate against the healthy
        // roster on every request, so this is a persistence warning rather than
        // a reason to invalidate an otherwise successful official game save.
        lineupRepairs.push({ abbreviation, ok: false, warning: "Automatic lineup repair will be regenerated on the next lineup/simulator load." });
      }
    }

    return Response.json({
      ok: true,
      game: {
        id: number,
        away: official.away.abbreviation,
        home: official.home.abbreviation,
        awayScore: Number(body.packet.away.score) || 0,
        homeScore: Number(body.packet.home.score) || 0,
        finish,
      },
      rows: {
        team: result.teamRows,
        skaters: result.skaterRows,
        goalies: result.goalieRows,
      },
      injuries: {
        saved: injuryRecords.length,
        records: injuryRecords,
        lineupRepairs,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Official simulator game submission failed", error);
    const message = error instanceof Error ? error.message : "Unable to save the official game.";
    const status = /credentials are not configured|permission|PERMISSION_DENIED|storage is not configured/i.test(message) ? 503 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
