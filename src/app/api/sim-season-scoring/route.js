import { getSeasonStats } from "@/lib/seasonStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizePlayerId(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? digits.padStart(4, "0").slice(-4) : "";
}

function addRow(target, row) {
  const playerId = normalizePlayerId(row?.playerId);
  if (!playerId) return;
  const current = target[playerId] || { goals: 0, assists: 0 };
  current.goals += Number(row?.goals) || 0;
  current.assists += Number(row?.assists) || 0;
  target[playerId] = current;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const parsedBeforeGameId = Number.parseInt(url.searchParams.get("beforeGameId") || "", 10);
    const beforeGameId = Number.isInteger(parsedBeforeGameId) && parsedBeforeGameId > 0 ? parsedBeforeGameId : null;
    const stats = await getSeasonStats();
    const players = Object.create(null);

    for (const row of stats.skaterGameRows || []) {
      if (beforeGameId && Number(row.gameId) >= beforeGameId) continue;
      addRow(players, row);
    }
    for (const row of stats.goalieGameRows || []) {
      if (beforeGameId && Number(row.gameId) >= beforeGameId) continue;
      addRow(players, row);
    }

    return Response.json(
      { ok: true, source: stats.source, beforeGameId, players },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Unable to serve simulator season scoring totals", error);
    return Response.json(
      { ok: false, error: "Unable to load official season scoring totals." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
