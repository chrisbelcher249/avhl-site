import { getPlayers } from "../../../lib/players";
import { getEffectiveLineupsForSimulator } from "@/lib/lineupService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function compactPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    currentTeam: player.currentTeam,
    role: player.role,
    position: player.position,
    number: player.number,
    overall: player.overall,
    age: player.age,
    height: player.height,
    heightIn: player.heightIn,
    weight: player.weight,
    handedness: player.handedness,
    playerType: player.playerType,
    ratings: player.ratings || {},
  };
}

export async function GET() {
  try {
    const { players, source } = await getPlayers();
    // Once official owner lineups drive the simulator, a partial/bundled roster
    // is not safe enough to start a new game: a recent trade or roster move
    // could otherwise be missed. Require both live skaters and live goalies.
    if (source !== "live") {
      return Response.json(
        { ok: false, source, error: "The complete live player roster is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    const rostered = players
      .filter((player) => player.currentTeam && player.currentTeam !== "UFA")
      .map(compactPlayer);
    const lineupState = await getEffectiveLineupsForSimulator(players);

    return Response.json(
      {
        ok: true,
        source,
        playerCount: rostered.length,
        players: rostered,
        lineups: lineupState.records,
        lineupSources: lineupState.sources,
        invalidSavedLineups: lineupState.invalid,
        lineupStorage: lineupState.storage,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Unable to serve simulator rosters", error);
    return Response.json(
      { ok: false, error: "Unable to load simulator rosters." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
