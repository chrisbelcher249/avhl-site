import { verifySimExportPassword } from "@/lib/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const password = String(body?.password || "");
    if (!verifySimExportPassword(password)) {
      return Response.json({ ok: false, error: "Incorrect administrator password." }, { status: 401 });
    }
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Simulator export authentication failed", error);
    return Response.json({ ok: false, error: "Unable to verify administrator password." }, { status: 500 });
  }
}
