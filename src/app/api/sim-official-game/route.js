import { teams } from "../../../../data/teams";
import { verifySimExportPassword } from "@/lib/credentials";
import { buildOfficialSheetRows } from "@/lib/officialGame";
import { getSchedule } from "@/lib/schedule";
import { getTeamGameRows } from "@/lib/seasonStats";
import { writeOfficialGameRows } from "@/lib/googleSheetsWrite";
import { normalizePlayerId } from "@/lib/seasonSheets";
import { deleteInjuryRecords, injuryStorageStatus, saveInjuryRecords } from "@/lib/injuryStorage";
import { deleteOfficialReplay, replayStorageStatus, saveOfficialReplay, validateReplayArchive } from "@/lib/replayStorage";
import { getPlayers } from "@/lib/players";
import { rosterForTeam } from "@/lib/lineupService";
import { validateLineupRecord } from "@/lib/lineupRecords";
import { lineupStorageStatus, saveLineupIfRevision } from "@/lib/lineupStorage";

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


async function persistVerifiedSimulatorRepairs(number, packet, replaySnapshot) {
  const snapshotForSide = (side) => {
    const frozenTeam = replaySnapshot?.matchupData?.[side];
    if (frozenTeam?.lineupRecord) {
      return {
        abbreviation: frozenTeam.abbreviation,
        source: frozenTeam.lineupSource || "projected",
        revision: Number(frozenTeam.lineupRevision) || 0,
        record: frozenTeam.lineupRecord,
      };
    }
    return packet?.lineups?.[side] || null;
  };

  const snapshots = [
    { side: "away", expected: String(packet?.away?.abbreviation || "").toUpperCase(), snapshot: snapshotForSide("away") },
    { side: "home", expected: String(packet?.home?.abbreviation || "").toUpperCase(), snapshot: snapshotForSide("home") },
  ].filter(({ snapshot }) => snapshot?.source === "sim-repaired");

  if (!snapshots.length) return [];

  const storage = lineupStorageStatus();
  if (!storage.configured) {
    return snapshots.map(({ expected }) => ({
      abbreviation: expected,
      ok: false,
      changed: false,
      warning: "Persistent lineup storage is unavailable; the temporary simulator repair was not saved.",
    }));
  }

  let playersPayload;
  try {
    playersPayload = await getPlayers();
  } catch (error) {
    console.error(`Unable to load live rosters while saving verified Game ${number} lineup repairs`, error);
    return snapshots.map(({ expected }) => ({
      abbreviation: expected,
      ok: false,
      changed: false,
      warning: "Live roster verification was unavailable; the temporary simulator repair was not saved.",
    }));
  }

  if (playersPayload?.source !== "live") {
    return snapshots.map(({ expected }) => ({
      abbreviation: expected,
      ok: false,
      changed: false,
      warning: "The complete live roster was unavailable; the temporary simulator repair was not saved.",
    }));
  }

  const results = [];
  for (const { side, expected, snapshot } of snapshots) {
    const abbreviation = String(snapshot?.abbreviation || "").toUpperCase();
    const expectedRevision = Number.parseInt(String(snapshot?.revision ?? ""), 10);

    if (!expected || abbreviation !== expected) {
      results.push({
        abbreviation: expected || abbreviation || side.toUpperCase(),
        ok: false,
        changed: false,
        warning: "Simulator lineup snapshot did not match the verified matchup, so it was not saved.",
      });
      continue;
    }
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || Number(snapshot?.record?.revision || 0) !== expectedRevision) {
      results.push({
        abbreviation,
        ok: false,
        changed: false,
        warning: "Simulator lineup revision was invalid, so the temporary repair was not saved.",
      });
      continue;
    }

    const rosterPlayers = rosterForTeam(playersPayload.players, abbreviation);
    const validation = validateLineupRecord(snapshot.record, rosterPlayers, abbreviation);
    if (!validation.ok) {
      results.push({
        abbreviation,
        ok: false,
        changed: false,
        errors: validation.errors,
        warning: "The exact simulator repair no longer matches the live roster, so it was not saved.",
      });
      continue;
    }

    const replacement = {
      ...validation.record,
      schema: "avhl-lineup-v1",
      abbreviation,
      revision: expectedRevision + 1,
      updatedAt: new Date().toISOString(),
      autoAdjustedForOfficialGame: number,
    };

    try {
      const write = await saveLineupIfRevision(abbreviation, replacement, expectedRevision);
      if (!write.saved) {
        results.push({
          abbreviation,
          ok: true,
          changed: false,
          conflict: true,
          currentRevision: write.currentRevision,
          warning: "The owner changed this lineup after the sim started, so the newer owner revision was preserved.",
        });
        continue;
      }
      results.push({
        abbreviation,
        ok: true,
        changed: true,
        revision: replacement.revision,
        saved: replacement,
      });
    } catch (error) {
      console.error(`Unable to persist verified Game ${number} simulator lineup repair for ${abbreviation}`, error);
      results.push({
        abbreviation,
        ok: false,
        changed: false,
        warning: "The game was saved, but the temporary lineup repair could not be persisted.",
      });
    }
  }

  return results;
}

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
    if (!replayStorageStatus().configured) {
      return Response.json({
        ok: false,
        error: "Persistent official replay storage is not configured. The official game was not saved.",
      }, { status: 503 });
    }
    if (injuryRecords.length && !injuryStorageStatus().configured) {
      return Response.json({
        ok: false,
        error: "This game produced an injury, but persistent injury storage is not configured. The official game was not saved.",
      }, { status: 503 });
    }

    const replaySnapshot = validateReplayArchive({
      gameId: number,
      archive: body.replayArchive,
      packet: body.packet,
      scheduledAway: official.away.abbreviation,
      scheduledHome: official.home.abbreviation,
    });
    const replayMetadata = {
      date: official.game.date,
      awayAbbreviation: official.away.abbreviation,
      awayName: official.away.name,
      awayScore: Number(body.packet.away.score) || 0,
      homeAbbreviation: official.home.abbreviation,
      homeName: official.home.name,
      homeScore: Number(body.packet.home.score) || 0,
      finish,
      seed: Number(body.packet.seed),
      simulatorVersion: String(body.packet.simulatorVersion || replaySnapshot.simulatorVersion || ""),
      simGameId: String(body.packet.simGameId || replaySnapshot.simGameId || ""),
      eventCount: replaySnapshot.events.length,
      lockedAt: new Date().toISOString(),
    };

    // The locked replay is staged before stats are written. If any later official
    // save step fails, it is rolled back so a schedule result can never exist
    // without the exact historical game snapshot that produced it.
    await saveOfficialReplay({ gameId: number, archive: body.replayArchive, metadata: replayMetadata });

    let injuryKeys = [];
    try {
      injuryKeys = injuryRecords.length ? await saveInjuryRecords(injuryRecords) : [];
    } catch (error) {
      await deleteOfficialReplay(number).catch((rollbackError) => {
        console.error(`Unable to roll back replay for failed Game ${number}`, rollbackError);
      });
      throw error;
    }

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
      try {
        await deleteOfficialReplay(number);
      } catch (rollbackError) {
        console.error(`Unable to roll back replay for failed Game ${number}`, rollbackError);
      }
      throw error;
    }

    // Persist only the exact temporary repairs that were actually used when this
    // game was created. A new injury from this game does not trigger an
    // immediate lineup rewrite; it will simply appear as an open slot until the
    // next sim repairs it. Compare-and-save also protects any owner edit made
    // after puck drop from being overwritten here.
    const lineupRepairs = await persistVerifiedSimulatorRepairs(number, body.packet, replaySnapshot);

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
      replay: replayMetadata,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Official simulator game submission failed", error);
    const message = error instanceof Error ? error.message : "Unable to save the official game.";
    const status = /credentials are not configured|permission|PERMISSION_DENIED|storage is not configured/i.test(message) ? 503 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
