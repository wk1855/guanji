import { NextRequest, NextResponse } from "next/server";
import { exportAiLogs, parseAiLogFilters } from "@/lib/db/ai-logs";
import { serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

// GET /api/ai-logs/export?format=jsonl|json&（同列表筛选参数）—— 导出完整记录用于离线评估
export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const sp = req.nextUrl.searchParams;
    const rows = await exportAiLogs(auth.user.id, parseAiLogFilters(sp));
    const jsonl = sp.get("format") !== "json";
    const stamp = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const body = jsonl ? rows.map((r: unknown) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "") : JSON.stringify(rows, null, 2);
    return new NextResponse(body, {
      headers: {
        "Content-Type": jsonl ? "application/x-ndjson; charset=utf-8" : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="guanji-ai-logs-${stamp}.${jsonl ? "jsonl" : "json"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[ai-logs export] error:", err);
    return serverError();
  }
}
