import { hasOwnerCredential, verifyOwnerPassword } from "@/lib/credentials";
import { fallbackTeamByAbbreviation } from "@/lib/lineupService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const abbreviation = String(body?.abbreviation || "").toUpperCase();
    const password = String(body?.password || "");
    const team = fallbackTeamByAbbreviation(abbreviation);
    if (!team || !hasOwnerCredential(abbreviation)) {
      return Response.json({ ok: false, error: "Unknown team." }, { status: 404 });
    }
    if (!verifyOwnerPassword(abbreviation, password)) {
      return Response.json({ ok: false, error: "Incorrect team password." }, { status: 401 });
    }
    return Response.json(
      { ok: true, abbreviation, team: team.name },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Owner lineup authentication failed", error);
    return Response.json({ ok: false, error: "Unable to verify owner password." }, { status: 500 });
  }
}
