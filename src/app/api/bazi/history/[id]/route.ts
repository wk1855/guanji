import { deleteBaziChart, getBaziChartById } from "@/lib/db/bazi";
import { ensureDaYun, type BaziRecordRow } from "@/lib/bazi/record";
import { notFound, ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const row = await getBaziChartById(params.id, auth.user.id);
    if (!row) return notFound("命盘记录不存在");
    return ok(ensureDaYun(row as BaziRecordRow));
  } catch (err) {
    console.error("[bazi/history/:id GET] error:", err);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const deleted = await deleteBaziChart(params.id, auth.user.id);
    if (!deleted) return notFound("命盘记录不存在或已删除");
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    console.error("[bazi/history/:id DELETE] error:", err);
    return serverError();
  }
}
