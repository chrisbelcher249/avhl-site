// Legacy plural endpoint retained for backward compatibility.
// The canonical owner-auth endpoint is /api/lineup/auth.
import { POST as canonicalPOST } from "../../lineup/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  return canonicalPOST(request);
}
