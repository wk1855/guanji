import { NextRequest } from "next/server";
import { aiLogStats, listAiLogs, parseAiLogFilters } from "@/lib/db/ai-logs";
import { ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

// GET /api/ai-logs?type=&status=&rating=&from=&to=&limit=&offset=
export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const sp = req.nextUrl.searchParams;
    const filters = parseAiLogFilters(sp);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 30));
    const offset = Math.max(0, Number(sp.get("offset")) || 0);
    const [list, stats] = await Promise.all([
      listAiLogs(auth.user.id, filters, limit, offset),
      aiLogStats(auth.user.id, filters),
    ]);
    return ok({ ...list, stats, limit, offset });
  } catch (err) {
    console.error("[ai-logs GET] error:", err);
    return serverError();
  }
}
