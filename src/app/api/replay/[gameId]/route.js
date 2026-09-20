import { getOfficialReplay } from "@/lib/replayStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const { gameId } = await params;
    const replay = await getOfficialReplay(gameId);
    if (!replay) return Response.json({ ok: false, error: "Official replay not found." }, { status: 404 });
    return Response.json({ ok: true, ...replay }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Unable to load official replay", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load official replay." }, { status: 500 });
  }
}
