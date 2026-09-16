// Legacy plural endpoint retained for backward compatibility.
// The canonical lineup endpoint is /api/lineup/[abbreviation].
import {
  GET as canonicalGET,
  POST as canonicalPOST,
} from "../../lineup/[abbreviation]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, context) {
  return canonicalGET(request, context);
}

export async function POST(request, context) {
  return canonicalPOST(request, context);
}
