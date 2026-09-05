import { getPlayers } from "../../../lib/players";

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
    ratings: player.ratings || {},
  };
}

export async function GET() {
  try {
    const { players, source } = await getPlayers();
    const rostered = players
      .filter((player) => player.currentTeam && player.currentTeam !== "UFA")
      .map(compactPlayer);

    return Response.json(
      {
        ok: true,
        source,
        playerCount: rostered.length,
        players: rostered,
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
