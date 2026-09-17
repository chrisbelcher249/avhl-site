import { verifySimExportPassword } from "@/lib/credentials";
import { getOfficialScheduleGame } from "@/lib/schedule";
import { buildOfficialSheetRows } from "@/lib/officialGame";
import { gameAlreadySaved, writeOfficialGameRows } from "@/lib/googleSheetsWrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gameNumber(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1640 ? parsed : null;
}

function matchupMatches(game, packet) {
  return game?.away?.abbreviation === String(packet?.away?.abbreviation || "").toUpperCase()
    && game?.home?.abbreviation === String(packet?.home?.abbreviation || "").toUpperCase();
}

export async function GET(request) {
  try {
    const id = gameNumber(new URL(request.url).searchParams.get("gameId"));
    if (!id) return Response.json({ ok: false, error: "Enter a game number from 1 to 1640." }, { status: 400 });
    const game = await getOfficialScheduleGame(id);
    if (!game) return Response.json({ ok: false, error: `Game ${id} was not found in the official schedule.` }, { status: 404 });
    return Response.json({ ok: true, game: { id: game.id, date: game.date, away: game.away.abbreviation, awayName: game.away.name, home: game.home.abbreviation, homeName: game.home.name } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Official game lookup failed", error);
    return Response.json({ ok: false, error: "Unable to check the official schedule right now." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const password = String(body?.password || "");
    if (!verifySimExportPassword(password)) {
      return Response.json({ ok: false, error: "Incorrect administrator password." }, { status: 401 });
    }
    const id = gameNumber(body?.gameId);
    if (!id) return Response.json({ ok: false, error: "Enter a game number from 1 to 1640." }, { status: 400 });
    const packet = body?.packet;
    if (!packet?.away || !packet?.home || !packet?.summary) return Response.json({ ok: false, error: "The completed simulator game could not be read." }, { status: 400 });

    const scheduled = await getOfficialScheduleGame(id);
    if (!scheduled) return Response.json({ ok: false, error: `Game ${id} was not found in the official schedule.` }, { status: 404 });
    if (!matchupMatches(scheduled, packet)) {
      return Response.json({
        ok: false,
        error: `Game ${id} is ${scheduled.away.abbreviation} at ${scheduled.home.abbreviation}, but this simulation is ${packet.away.abbreviation} at ${packet.home.abbreviation}.`,
      }, { status: 409 });
    }
    if (await gameAlreadySaved(id)) {
      return Response.json({ ok: false, error: `Game ${id} has already been submitted.` }, { status: 409 });
    }

    const rows = buildOfficialSheetRows(id, packet);
    await writeOfficialGameRows({ gameId: id, teamRows: rows.teamRows, skaterRows: rows.skaterRows, goalieRows: rows.goalieRows });
    return Response.json({
      ok: true,
      gameId: id,
      matchup: `${scheduled.away.abbreviation} at ${scheduled.home.abbreviation}`,
      score: `${packet.away.abbreviation} ${packet.away.score} – ${packet.home.abbreviation} ${packet.home.score}`,
      finish: rows.finish,
      written: { teams: rows.teamRows.length, skaters: rows.skaterRows.length, goalies: rows.goalieRows.length },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Official simulator game submission failed", error);
    const status = error?.code === "DUPLICATE_GAME" ? 409 : 500;
    return Response.json({ ok: false, error: error?.message || "Unable to save the official game." }, { status });
  }
}
