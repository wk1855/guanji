import { getDefaultBaziChartId, getUserBaziCharts } from "@/lib/db/bazi";
import { ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const [charts, defaultId] = await Promise.all([
      getUserBaziCharts(auth.user.id, 50),
      getDefaultBaziChartId(auth.user.id),
    ]);
    return ok(charts.map((c) => ({ ...c, is_default: c.id === defaultId })));
  } catch (err) {
    console.error("[bazi/history GET] error:", err);
    return serverError();
  }
}
