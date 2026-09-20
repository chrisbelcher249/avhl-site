import { getPlayers } from "@/lib/players";
import { verifyOwnerPassword } from "@/lib/credentials";
import { fallbackTeamByAbbreviation, rosterForTeam } from "@/lib/lineupService";
import { validateLineupRecord } from "@/lib/lineupRecords";
import { getSavedLineup, lineupStorageStatus, saveLineupIfRevision } from "@/lib/lineupStorage";
import { getCurrentInjuryState, healthyRosterForTeam } from "@/lib/injuries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request, { params }) {
  const { abbreviation: rawAbbreviation } = await params;
  const abbreviation = String(rawAbbreviation || "").toUpperCase();
  const team = fallbackTeamByAbbreviation(abbreviation);
  if (!team) return Response.json({ ok: false, error: "Unknown team." }, { status: 404 });
  try {
    const saved = await getSavedLineup(abbreviation);
    return Response.json(
      { ok: true, abbreviation, saved, storage: lineupStorageStatus() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error(`Unable to load lineup ${abbreviation}`, error);
    return Response.json({ ok: false, error: "Unable to load saved lineup." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { abbreviation: rawAbbreviation } = await params;
  const abbreviation = String(rawAbbreviation || "").toUpperCase();
  const team = fallbackTeamByAbbreviation(abbreviation);
  if (!team) return Response.json({ ok: false, error: "Unknown team." }, { status: 404 });

  try {
    const body = await request.json();
    const password = String(body?.password || "");
    if (!verifyOwnerPassword(abbreviation, password)) {
      return Response.json({ ok: false, error: "Incorrect team password." }, { status: 401 });
    }

    const storage = lineupStorageStatus();
    if (!storage.configured) {
      return Response.json(
        { ok: false, error: "Persistent lineup storage is not configured on the deployment." },
        { status: 503 },
      );
    }

    const { players, source: rosterSource } = await getPlayers();
    if (rosterSource !== "live") {
      return Response.json(
        { ok: false, error: "The complete live roster is temporarily unavailable. No lineup changes were saved." },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    const rosterPlayers = rosterForTeam(players, abbreviation);
    const injuryState = await getCurrentInjuryState(players);
    const activeInjuries = injuryState.byTeam?.[abbreviation] || [];
    const eligibleRosterPlayers = healthyRosterForTeam(rosterPlayers, activeInjuries);
    const validation = validateLineupRecord(body?.lineup, eligibleRosterPlayers, abbreviation);
    if (!validation.ok) {
      return Response.json({ ok: false, error: "Lineup does not meet AVHL constraints. Injured players cannot be dressed.", errors: validation.errors }, { status: 400 });
    }

    const expectedRevision = Number(body?.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return Response.json({ ok: false, error: "Lineup revision is missing or invalid. Refresh the page and try again." }, { status: 400 });
    }

    const saved = {
      ...validation.record,
      schema: "avhl-lineup-v1",
      abbreviation,
      revision: expectedRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const write = await saveLineupIfRevision(abbreviation, saved, expectedRevision);
    if (!write.saved) {
      return Response.json(
        {
          ok: false,
          conflict: true,
          currentRevision: write.currentRevision,
          error: `A newer lineup revision (${write.currentRevision}) is already saved. Refresh this page before saving again.`,
        },
        { status: 409, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return Response.json(
      { ok: true, saved, storage },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error(`Unable to save lineup ${abbreviation}`, error);
    return Response.json({ ok: false, error: "Unable to save lineup right now." }, { status: 500 });
  }
}
