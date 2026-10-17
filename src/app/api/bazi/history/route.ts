import { getUserBaziCharts } from "@/lib/db/bazi";
import { ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const charts = await getUserBaziCharts(auth.user.id, 20);
    return ok(charts);
  } catch (err) {
    console.error("[bazi/history GET] error:", err);
    return serverError();
  }
}
