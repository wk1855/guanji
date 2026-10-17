import { NextRequest } from "next/server";
import { getDefaultBaziChartId, setDefaultBaziChart } from "@/lib/db/bazi";
import { ErrorCode, fail, ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    return ok({ chartId: await getDefaultBaziChartId(auth.user.id) });
  } catch (err) {
    console.error("[user/default-chart GET] error:", err);
    return serverError();
  }
}

// body: { chartId: string | null }，null 表示取消本人命盘
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const body = (await req.json().catch(() => ({}))) as { chartId?: unknown };
    const chartId = typeof body.chartId === "string" && body.chartId ? body.chartId : null;
    if (body.chartId !== null && chartId === null) {
      return fail(ErrorCode.VALIDATION_FAILED, "chartId 参数无效", 400);
    }
    const okSet = await setDefaultBaziChart(auth.user.id, chartId);
    if (!okSet) return fail(ErrorCode.RESOURCE_NOT_FOUND, "命盘记录不存在", 404);
    return ok({ chartId });
  } catch (err) {
    console.error("[user/default-chart PUT] error:", err);
    return serverError();
  }
}
